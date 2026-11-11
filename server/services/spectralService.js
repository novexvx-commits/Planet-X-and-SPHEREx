/**
 * SPHEREx 102 Near-Infrared Spectral Band Explorer Service
 * Provides wavelength coverage, detector array characteristics (D1-D6),
 * and target Spectral Energy Distribution (SED) modeling across 0.75 - 5.00 microns.
 */

import { DETECTOR_ARRAYS, SPHEREX_102_BANDS } from '../data/spectralBands102.js';
import { AUTHORITATIVE_TARGETS } from '../data/authoritativeTargets.js';

/**
 * Retrieve full spectral band specification and available detector arrays
 */
export function getSpectralBandsCatalog() {
  return {
    totalBandsCount: SPHEREX_102_BANDS.length,
    wavelengthRangeUm: { min: 0.75, max: 5.00 },
    detectorArrays: DETECTOR_ARRAYS,
    bands: SPHEREX_102_BANDS
  };
}

/**
 * Compute the Spectral Energy Distribution (SED) for a target across all 102 SPHEREx channels
 * @param {string} targetId
 */
export function getTargetSpectra(targetId) {
  const target = AUTHORITATIVE_TARGETS.find(t => t.id === targetId);
  if (!target) {
    throw new Error(`Target ${targetId} not found in authoritative database.`);
  }

  // Synthesize SED based on authentic astrophysics
  const sedPoints = SPHEREX_102_BANDS.map(b => {
    const lambda = b.centerWavelengthUm;
    let fluxDensityMjy = 0;
    let continuumMjy = 0;
    let snr = 30;

    if (target.id === 'barnards-star') {
      // M4.0V red dwarf, T_eff = 3134 K
      // Near-IR continuum peaks around 1.1 - 1.3 um
      continuumMjy = 45.0 * Math.pow(1.2 / lambda, 2.5) * Math.exp(-0.8 * (lambda - 1.2));
      // Absorption features: 0.94 um H2O, 1.4 um H2O, 1.9 um H2O, 2.3 um CO
      let absorption = 1.0;
      if (Math.abs(lambda - 0.94) < 0.04) absorption -= 0.18;
      if (Math.abs(lambda - 1.40) < 0.08) absorption -= 0.28;
      if (Math.abs(lambda - 1.90) < 0.10) absorption -= 0.32;
      if (Math.abs(lambda - 2.30) < 0.06) absorption -= 0.15;
      fluxDensityMjy = Math.max(0.5, continuumMjy * absorption);
      snr = 75.0;
    } else if (target.id === 'epsilon-indi-b') {
      // T-dwarf binary, T_eff = 1280 K / 850 K
      // Extreme methane (CH4) and water vapor (H2O) absorption bands
      continuumMjy = 18.0 * Math.pow(lambda / 1.5, 1.2) * Math.exp(-0.7 * lambda);
      let transmission = 1.0;
      if (Math.abs(lambda - 1.40) < 0.15) transmission *= 0.15; // J-band water
      if (Math.abs(lambda - 1.66) < 0.05) transmission *= 0.35; // Methane overtone
      if (Math.abs(lambda - 1.90) < 0.18) transmission *= 0.10; // H-band water
      if (Math.abs(lambda - 2.20) < 0.12) transmission *= 0.22; // K-band methane
      if (Math.abs(lambda - 3.30) < 0.25) transmission *= 0.05; // 3.3 um fundamental methane band
      if (lambda > 3.8 && lambda < 4.3) transmission *= 1.8; // 4 um opacity hole
      fluxDensityMjy = Math.max(0.08, continuumMjy * transmission);
      snr = 35.0;
    } else if (target.id === 'wise-0855') {
      // Ultra-cold Y dwarf (T_eff = 250 K)
      // Extreme water ice clouds and molecular opacity
      // Flux is virtually 0 below 4 um; rises sharply into 4.5 - 5.0 um window
      if (lambda < 3.8) {
        fluxDensityMjy = 0.002 + 0.005 * Math.random();
        snr = 1.5;
      } else if (lambda < 4.4) {
        fluxDensityMjy = 0.12 + 0.05 * (lambda - 3.8);
        snr = 4.8;
      } else {
        // High transmission window in Array 6
        const peak = Math.exp(-Math.pow((lambda - 4.75) / 0.18, 2));
        fluxDensityMjy = 0.35 + 2.85 * peak;
        snr = 18.0;
      }
    } else if (target.id === 'rw-aurigae') {
      // Classical T Tauri young star with warm circumstellar dust emission
      continuumMjy = 22.0 * Math.pow(1.6 / lambda, 1.8);
      const dustExcess = 14.0 * Math.pow(lambda / 2.5, 1.5);
      fluxDensityMjy = continuumMjy + dustExcess;
      snr = 65.0;
    } else if (target.id === 'r-draconis') {
      // Mira pulsating AGB variable (cool giant + circumstellar dust shell)
      continuumMjy = 38.0 * Math.pow(1.8 / lambda, 2.2);
      const silicateEmission = lambda > 4.2 ? 15.0 * Math.pow((lambda - 4.0), 1.2) : 0;
      fluxDensityMjy = continuumMjy + silicateEmission;
      snr = 85.0;
    }

    return {
      bandIndex: b.index,
      detector: b.detector,
      bandName: b.bandName,
      centerWavelengthUm: b.centerWavelengthUm,
      bandwidthUm: b.bandwidthUm,
      resolvingPower: b.resolvingPower,
      fluxDensityMjy: parseFloat(fluxDensityMjy.toFixed(4)),
      fluxDensityUJy: parseFloat((fluxDensityMjy * 1000).toFixed(1)),
      snr: parseFloat(snr.toFixed(1)),
      diagnosticFeature: b.primaryFeatures
    };
  });

  return {
    target: {
      id: target.id,
      name: target.name,
      spectralType: target.spectralType,
      temperatureK: target.effectiveTempK || null,
      scienceDescription: target.scienceDescription
    },
    spectrumPointsCount: sedPoints.length,
    wavelengthRangeUm: { min: 0.75, max: 5.00 },
    sedPoints
  };
}

