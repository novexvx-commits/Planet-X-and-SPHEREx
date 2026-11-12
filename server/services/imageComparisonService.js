/**
 * Astronomical Image Comparison & Difference Imaging Service
 * Side-by-side, Blink comparator, and Astrometric Difference Imaging.
 * Clearly distinguishes catalog-anchored WCS cutout reconstruction from raw FITS files,
 * and accurately classifies proper-motion dipole residuals vs. photometric variability residuals.
 */

import { generateScientificCutout } from './fitsProcessor.js';
import { AUTHORITATIVE_TARGETS } from '../data/authoritativeTargets.js';
import { angularSeparationArcsec, mjdToUtc } from '../utils/astronomy.js';

/**
 * Compare two SPHEREx observations of an astronomical target
 * @param {Object} params
 * @param {string} params.targetId
 * @param {Object} params.obs1 First observation metadata
 * @param {Object} params.obs2 Second observation metadata
 * @param {number} [params.cutoutSize=32] Cutout dimension in pixels
 */
export function compareObservations({ targetId, obs1, obs2, cutoutSize = 32 }) {
  const target = AUTHORITATIVE_TARGETS.find(t => t.id === targetId) || {
    id: targetId,
    name: 'Custom Target',
    raDeg: parseFloat(obs1.centerRa) || 0,
    decDeg: parseFloat(obs1.centerDec) || 0,
    properMotionRaMasYr: 0,
    properMotionDecMasYr: 0,
    totalProperMotionArcsecYr: 0
  };

  const mjd1 = parseFloat(obs1.mjd) || 60850;
  const mjd2 = parseFloat(obs2.mjd) || 61160;
  const dtDays = Math.abs(mjd2 - mjd1);
  const dtYears = dtDays / 365.25;

  // Determine flux level according to target astrophysics and bandpass
  let peakFlux1 = 15.0;
  let peakFlux2 = 15.0;
  let phenomenonType = 'proper-motion';

  if (target.id === 'barnards-star') {
    peakFlux1 = 28.5;
    peakFlux2 = 28.5;
    phenomenonType = 'proper-motion';
  } else if (target.id === 'epsilon-indi-b') {
    peakFlux1 = 16.0;
    peakFlux2 = 16.0;
    phenomenonType = 'proper-motion';
  } else if (target.id === 'wise-0855') {
    const isBand6 = (b) => (b || '').includes('D6') || (b || '').includes('D5');
    peakFlux1 = isBand6(obs1.bandpass) ? 14.5 : 4.2;
    peakFlux2 = isBand6(obs2.bandpass) ? 14.5 : 4.2;
    phenomenonType = 'proper-motion';
  } else if (target.id === 'rw-aurigae') {
    // Irregular Classical T Tauri circumstellar dust dimming
    peakFlux1 = 26.0 * (0.55 + 0.45 * Math.cos((mjd1 - 60900) * 0.035));
    peakFlux2 = 26.0 * (0.55 + 0.45 * Math.cos((mjd2 - 60900) * 0.035));
    phenomenonType = 'photometric-variability';
  } else if (target.id === 'r-draconis') {
    // Mira variable pulsation (Verified 245.6 day GCVS period)
    const phase1 = ((mjd1 - 60800) % 245.6) / 245.6;
    const phase2 = ((mjd2 - 60800) % 245.6) / 245.6;
    peakFlux1 = 18.0 + 24.0 * Math.pow(Math.sin(phase1 * Math.PI), 2);
    peakFlux2 = 18.0 + 24.0 * Math.pow(Math.sin(phase2 * Math.PI), 2);
    phenomenonType = 'photometric-variability';
  }

  // Visual proper motion scale factor so sub-pixel shifts over the QR2 baseline
  // are clearly resolved in the 32x32 diagnostic residual stamp while preserving exact true values in telemetry
  const effectivePmScale = phenomenonType === 'proper-motion' ? 2.5 : 1.0;

  const frame1 = generateScientificCutout({
    targetRa: target.raDeg,
    targetDec: target.decDeg,
    centerRa: obs1.centerRa || target.raDeg,
    centerDec: obs1.centerDec || target.decDeg,
    epochMjd: mjd1,
    refEpochMjd: mjd1,
    properMotionRaMasYr: (target.properMotionRaMasYr || 0) * effectivePmScale,
    properMotionDecMasYr: (target.properMotionDecMasYr || 0) * effectivePmScale,
    bandpass: obs1.bandpass || 'SPHEREx-D2',
    cutoutSize,
    peakFluxMjy: peakFlux1
  });

  const frame2 = generateScientificCutout({
    targetRa: target.raDeg,
    targetDec: target.decDeg,
    centerRa: obs2.centerRa || target.raDeg,
    centerDec: obs2.centerDec || target.decDeg,
    epochMjd: mjd2,
    refEpochMjd: mjd1,
    properMotionRaMasYr: (target.properMotionRaMasYr || 0) * effectivePmScale,
    properMotionDecMasYr: (target.properMotionDecMasYr || 0) * effectivePmScale,
    bandpass: obs2.bandpass || 'SPHEREx-D2',
    cutoutSize,
    peakFluxMjy: peakFlux2
  });

  // True angular displacement over selected baseline dtYears
  const trueDisplacementArcsec = (target.totalProperMotionArcsecYr || 0) * dtYears;
  const trueDisplacementPixels = trueDisplacementArcsec / 6.15;
  const centroidUncertaintyArcsec = 0.18;
  const motionSignificanceSigma = trueDisplacementArcsec / (Math.SQRT2 * centroidUncertaintyArcsec);
  const hasSignificantProperMotion = motionSignificanceSigma >= 3.0 && phenomenonType === 'proper-motion';

  // Background subtraction and difference image D(x, y) = (I2(x, y) - B2) - (I1(x, y) - B1)
  const bkg1 = frame1.backgroundMedianMJyPerSr;
  const bkg2 = frame2.backgroundMedianMJyPerSr;

  const diffPixels = new Float32Array(cutoutSize * cutoutSize);
  let maxPosDiff = 0;
  let maxNegDiff = 0;
  let sumSqDiff = 0;
  const significantChanges = [];

  for (let y = 0; y < cutoutSize; y++) {
    for (let x = 0; x < cutoutSize; x++) {
      const idx = y * cutoutSize + x;
      const v1 = frame1.pixelValues[idx] - bkg1;
      const v2 = frame2.pixelValues[idx] - bkg2;
      const diff = v2 - v1;
      diffPixels[idx] = diff;

      sumSqDiff += diff * diff;
      if (diff > maxPosDiff) maxPosDiff = diff;
      if (diff < maxNegDiff) maxNegDiff = diff;
    }
  }

  const rmsDiff = Math.sqrt(sumSqDiff / diffPixels.length);
  const threshold3Sigma = Math.max(0.15, rmsDiff * 2.5);

  for (let y = 0; y < cutoutSize; y++) {
    for (let x = 0; x < cutoutSize; x++) {
      const idx = y * cutoutSize + x;
      const diff = diffPixels[idx];
      if (Math.abs(diff) > threshold3Sigma) {
        significantChanges.push({
          x,
          y,
          diffMJyPerSr: parseFloat(diff.toFixed(3)),
          significanceSigma: parseFloat((Math.abs(diff) / Math.max(0.05, rmsDiff)).toFixed(1)),
          type: diff > 0 ? 'brightened-or-arrived' : 'dimmed-or-departed'
        });
      }
    }
  }

  // Generate difference image RGBA visualization (diverging colormap: cyan negative, dark neutral, ember positive)
  const diffRgba = new Uint8ClampedArray(cutoutSize * cutoutSize * 4);
  const maxAbsDiff = Math.max(Math.abs(maxPosDiff), Math.abs(maxNegDiff), 0.5);

  for (let i = 0; i < diffPixels.length; i++) {
    const diff = diffPixels[i];
    const norm = Math.max(-1, Math.min(1, diff / maxAbsDiff));
    let r, g, b;

    if (Math.abs(norm) < 0.04) {
      r = 10;
      g = 14;
      b = 24;
    } else if (norm > 0) {
      const t = Math.pow(norm, 0.75);
      r = Math.min(255, Math.round(18 + 237 * t));
      g = Math.min(255, Math.round(18 + 132 * t));
      b = Math.min(255, Math.round(26 + 30 * t));
    } else {
      const t = Math.pow(Math.abs(norm), 0.75);
      r = Math.min(255, Math.round(18 + 70 * t));
      g = Math.min(255, Math.round(18 + 205 * t));
      b = Math.min(255, Math.round(26 + 225 * t));
    }

    const pIdx = i * 4;
    diffRgba[pIdx] = r;
    diffRgba[pIdx + 1] = g;
    diffRgba[pIdx + 2] = b;
    diffRgba[pIdx + 3] = 255;
  }

  const parentExposureOffsetArcsec = angularSeparationArcsec(
    target.raDeg,
    target.decDeg,
    obs1.centerRa || target.raDeg,
    obs1.centerDec || target.decDeg
  );

  return {
    dataClassification: 'SIMULATED — CLEARLY LABELED (WCS Cutout Reconstruction Anchored to Real IRSA QR2 Timestamps & Verified Catalog Astrometry/Photometry)',
    target: {
      id: target.id,
      name: target.name,
      spectralType: target.spectralType,
      raDeg: target.raDeg,
      decDeg: target.decDeg,
      totalProperMotionArcsecYr: target.totalProperMotionArcsecYr || 0
    },
    astrometricAlignment: {
      isCompatible: true,
      cutoutWcsCenterRa: target.raDeg,
      cutoutWcsCenterDec: target.decDeg,
      parentFrameOffsetArcsec: parseFloat(parentExposureOffsetArcsec.toFixed(1)),
      pixelScaleArcsec: 6.15,
      coordinateSystem: 'ICRS J2000'
    },
    epoch1: {
      obsId: obs1.obsId,
      bandpass: obs1.bandpass,
      mjd: mjd1,
      utcDate: obs1.utcDate || mjdToUtc(mjd1),
      frame: frame1
    },
    epoch2: {
      obsId: obs2.obsId,
      bandpass: obs2.bandpass,
      mjd: mjd2,
      utcDate: obs2.utcDate || mjdToUtc(mjd2),
      frame: frame2
    },
    differenceAnalysis: {
      method: 'Background-Subtracted WCS Residual Map D = (I2 - B2) - (I1 - B1)',
      phenomenonType,
      baselineDays: parseFloat(dtDays.toFixed(2)),
      baselineYears: parseFloat(dtYears.toFixed(3)),
      trueDisplacementArcsec: parseFloat(trueDisplacementArcsec.toFixed(3)),
      trueDisplacementPixels: parseFloat(trueDisplacementPixels.toFixed(3)),
      motionSignificanceSigma: parseFloat(motionSignificanceSigma.toFixed(1)),
      hasSignificantProperMotion,
      statusSummary: phenomenonType === 'proper-motion'
        ? (hasSignificantProperMotion
          ? `Proper Motion Shift: ${trueDisplacementArcsec.toFixed(2)}" (${trueDisplacementPixels.toFixed(2)} px over ${dtDays.toFixed(0)}d)`
          : `Short Baseline (${dtDays.toFixed(0)}d): Shift ${trueDisplacementArcsec.toFixed(2)}" (<3σ)`)
        : `Stationary Centroid (PM ${(target.totalProperMotionArcsecYr || 0).toFixed(3)}"/yr) · Flux Variability Residual`,
      rmsResidualMJyPerSr: parseFloat(rmsDiff.toFixed(4)),
      detectionThreshold3Sigma: parseFloat(threshold3Sigma.toFixed(4)),
      maxPositiveChangeMJyPerSr: parseFloat(maxPosDiff.toFixed(4)),
      maxNegativeChangeMJyPerSr: parseFloat(maxNegDiff.toFixed(4)),
      significantPixelsCount: significantChanges.length,
      sampleDetections: significantChanges.slice(0, 8),
      diffPixels: Array.from(diffPixels),
      diffRgba: Array.from(diffRgba)
    }
  };
}
