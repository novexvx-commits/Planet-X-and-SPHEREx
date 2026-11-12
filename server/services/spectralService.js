/**
 * SPHEREx 102 Near-Infrared Spectral Band Explorer Service
 * Provides verified instrument channel specifications across D1–D6 (0.75–5.00 µm, R = 35–130),
 * real archival broadband photometry (2MASS, AllWISE, Spitzer IRAC), and clearly labeled
 * 102-channel SPHEREx LVF spectral energy distribution (SED) models anchored to catalog fluxes.
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
    resolvingPowerSummary: 'R ~ 41 (D1–D3: 0.75–2.42 µm), R ~ 35 (D4: 2.42–3.82 µm), R ~ 110 (D5: 3.82–4.42 µm), R ~ 130 (D6: 4.42–5.00 µm)',
    detectorArrays: DETECTOR_ARRAYS,
    bands: SPHEREX_102_BANDS
  };
}

/**
 * Interpolate baseline continuum from real archival photometry (2MASS / AllWISE / Spitzer)
 */
function interpolateCatalogContinuumMjy(target, lambda) {
  const phot = target.archivalPhotometry || [];
  if (phot.length === 0) return 10.0;
  const sorted = [...phot].sort((a, b) => a.wavelengthUm - b.wavelengthUm);

  if (lambda <= sorted[0].wavelengthUm) {
    if (target.id === 'wise-0855') return 0.00016;
    return sorted[0].fluxDensityMjy * Math.pow(lambda / sorted[0].wavelengthUm, 1.2);
  }
  if (lambda >= sorted[sorted.length - 1].wavelengthUm) {
    const last = sorted[sorted.length - 1];
    return last.fluxDensityMjy * Math.pow(last.wavelengthUm / lambda, 1.5);
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (lambda >= p1.wavelengthUm && lambda <= p2.wavelengthUm) {
      const t = (lambda - p1.wavelengthUm) / (p2.wavelengthUm - p1.wavelengthUm);
      const f1 = Math.max(1e-5, p1.fluxDensityMjy);
      const f2 = Math.max(1e-5, p2.fluxDensityMjy);
      return Math.exp(Math.log(f1) * (1 - t) + Math.log(f2) * t);
    }
  }
  return sorted[0].fluxDensityMjy;
}

/**
 * Compute the 102-channel SPHEREx LVF Spectral Energy Distribution (SED) anchored to real archival photometry
 * @param {string} targetId
 */
export function getTargetSpectra(targetId) {
  const target = AUTHORITATIVE_TARGETS.find(t => t.id === targetId);
  if (!target) {
    throw new Error(`Target ${targetId} not found in authoritative database.`);
  }

  const sedPoints = SPHEREX_102_BANDS.map(b => {
    const lambda = b.centerWavelengthUm;
    const baseContinuumMjy = interpolateCatalogContinuumMjy(target, lambda);
    let fluxDensityMjy = baseContinuumMjy;
    let snr = 45.0;
    let qualityFlag = 'GOOD';

    if (target.id === 'barnards-star') {
      // M4.0V red dwarf (T_eff = 3134 K) anchored to 2MASS J/H/Ks & AllWISE W1/W2 (3785 - 12720 mJy)
      let absorption = 1.0;
      if (Math.abs(lambda - 0.94) < 0.04) absorption -= 0.14; // TiO / H2O
      if (Math.abs(lambda - 1.40) < 0.08) absorption -= 0.22; // H2O band
      if (Math.abs(lambda - 1.90) < 0.10) absorption -= 0.25; // H2O band
      if (Math.abs(lambda - 2.35) < 0.08) absorption -= 0.16; // CO 2-0 overtone
      fluxDensityMjy = Math.max(100.0, baseContinuumMjy * absorption);
      snr = 85.0;
    } else if (target.id === 'epsilon-indi-b') {
      // Binary T1.5V + T6V brown dwarf anchored to 2MASS & AllWISE (16 - 31 mJy)
      let transmission = 1.0;
      if (Math.abs(lambda - 1.15) < 0.06) transmission *= 0.28; // 1.15 um H2O/CH4
      if (Math.abs(lambda - 1.40) < 0.12) transmission *= 0.18; // 1.4 um H2O
      if (Math.abs(lambda - 1.66) < 0.05) transmission *= 0.42; // 1.66 um CH4
      if (Math.abs(lambda - 1.90) < 0.14) transmission *= 0.15; // 1.9 um H2O
      if (Math.abs(lambda - 2.25) < 0.12) transmission *= 0.25; // K-band CH4/H2 CIA
      if (Math.abs(lambda - 3.32) < 0.22) transmission *= 0.08; // 3.3 um CH4 fundamental
      if (Math.abs(lambda - 4.65) < 0.15) transmission *= 0.55; // 4.6 um CO/PH3
      fluxDensityMjy = Math.max(0.5, baseContinuumMjy * transmission);
      snr = 38.0;
    } else if (target.id === 'wise-0855') {
      // Ultra-cold Y4 brown dwarf (T_eff = 250 K) anchored to Gemini J, Spitzer IRAC ch1/ch2 & AllWISE W1/W2
      if (lambda < 3.2) {
        fluxDensityMjy = 0.0002 + 0.0003 * Math.pow(lambda / 3.2, 3);
        snr = 1.2;
        qualityFlag = 'LOW_SNR_UPPER_LIMIT';
      } else if (lambda < 4.1) {
        // CH4 fundamental absorption trough around 3.3-3.8 um
        fluxDensityMjy = baseContinuumMjy * (0.45 + 0.55 * ((lambda - 3.2) / 0.9));
        snr = 5.5;
      } else {
        // Strong 4.5-5.0 um thermal atmospheric window in Array D6 (peaks ~0.50 mJy at 4.65 um)
        const windowProfile = Math.exp(-Math.pow((lambda - 4.65) / 0.26, 2));
        const h2oIceDip = Math.abs(lambda - 4.52) < 0.05 ? 0.82 : 1.0;
        fluxDensityMjy = (0.12 + 0.42 * windowProfile) * h2oIceDip;
        snr = 22.0;
      }
    } else if (target.id === 'rw-aurigae') {
      // Classical T Tauri variable with warm circumstellar disk dust excess (710 - 1518 mJy)
      let feature = 1.0;
      if (Math.abs(lambda - 1.083) < 0.02) feature += 0.12; // He I / Pa-gamma accretion
      if (Math.abs(lambda - 1.282) < 0.02) feature += 0.14; // Pa-beta emission
      if (Math.abs(lambda - 2.166) < 0.02) feature += 0.10; // Br-gamma emission
      if (Math.abs(lambda - 3.05) < 0.12) feature -= 0.08;  // Circumstellar H2O ice wing
      fluxDensityMjy = baseContinuumMjy * feature;
      snr = 65.0;
    } else if (target.id === 'r-draconis') {
      // Mira AGB variable (M5e-M9eIII) anchored to 2MASS/WISE (151,700 - 325,400 mJy)
      let bandTransmission = 1.0;
      if (Math.abs(lambda - 1.42) < 0.10) bandTransmission *= 0.62; // Deep H2O steam band
      if (Math.abs(lambda - 1.92) < 0.12) bandTransmission *= 0.58; // 1.9 um H2O steam band
      if (Math.abs(lambda - 2.35) < 0.08) bandTransmission *= 0.72; // CO first overtone
      if (Math.abs(lambda - 2.75) < 0.15) bandTransmission *= 0.65; // OH / H2O fundamental
      if (Math.abs(lambda - 4.65) < 0.12) bandTransmission *= 0.74; // CO fundamental band
      fluxDensityMjy = baseContinuumMjy * bandTransmission;
      snr = 90.0;
    }

    const fluxErrorMjy = fluxDensityMjy / snr;

    return {
      bandIndex: b.index,
      detector: b.detector,
      detectorName: b.detectorName,
      bandName: b.bandName,
      centerWavelengthUm: b.centerWavelengthUm,
      minWavelengthUm: b.minWavelengthUm,
      maxWavelengthUm: b.maxWavelengthUm,
      bandwidthUm: b.bandwidthUm,
      resolvingPower: b.resolvingPower,
      fluxDensityMjy: parseFloat(fluxDensityMjy.toFixed(4)),
      fluxErrorMjy: parseFloat(fluxErrorMjy.toFixed(4)),
      fluxDensityUJy: parseFloat((fluxDensityMjy * 1000).toFixed(1)),
      snr: parseFloat(snr.toFixed(1)),
      qualityFlag,
      diagnosticFeature: b.primaryFeatures
    };
  });

  return {
    dataClassification: 'VERIFIED ARCHIVAL PHOTOMETRY (2MASS / AllWISE / Spitzer) + CLEARLY LABELED 102-CHANNEL SPHEREx LVF SPECTRAL MODEL',
    target: {
      id: target.id,
      name: target.name,
      type: target.type,
      spectralType: target.spectralType,
      temperatureK: target.effectiveTempK || null,
      scienceDescription: target.scienceDescription
    },
    archivalPhotometry: target.archivalPhotometry || [],
    spectrumPointsCount: sedPoints.length,
    wavelengthRangeUm: { min: 0.75, max: 5.00 },
    sedPoints
  };
}
