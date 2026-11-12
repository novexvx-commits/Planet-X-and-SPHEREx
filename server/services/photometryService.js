/**
 * Photometry & Variable Star Light Curve Service
 * Combines real archival broadband photometry (2MASS, AllWISE, Spitzer IRAC, AAVSO/GCVS)
 * with clearly labeled spectrophotometric time-series models sampled at real SPHEREx QR2
 * observation epochs (MJD t_min).
 */

import { AUTHORITATIVE_TARGETS } from '../data/authoritativeTargets.js';
import { CACHED_SPHEREX_OBSERVATIONS } from '../data/cachedObservations.js';
import { mjdToUtc, fluxUJyToAbMag, calculateElapsedDays } from '../utils/astronomy.js';

const DETECTOR_WAVELENGTH_UM = {
  D1: 0.93,
  D2: 1.38,
  D3: 2.03,
  D4: 3.12,
  D5: 4.12,
  D6: 4.71
};

/**
 * Interpolate baseline target flux density (in mJy) at a given wavelength (um)
 * directly from the target's real archival photometry (2MASS / AllWISE / Spitzer).
 */
function interpolateArchivalFluxMjy(target, wavelengthUm) {
  const phot = target.archivalPhotometry || [];
  if (phot.length === 0) return 15.0;

  const sorted = [...phot].sort((a, b) => a.wavelengthUm - b.wavelengthUm);
  if (wavelengthUm <= sorted[0].wavelengthUm) {
    // Rayleigh-Jeans / Wien extrapolation for D1 (0.93 um) from J band (1.235 um)
    if (target.id === 'wise-0855') return 0.0001;
    const ratio = wavelengthUm / sorted[0].wavelengthUm;
    return sorted[0].fluxDensityMjy * Math.pow(ratio, 0.8);
  }
  if (wavelengthUm >= sorted[sorted.length - 1].wavelengthUm) {
    return sorted[sorted.length - 1].fluxDensityMjy;
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (wavelengthUm >= p1.wavelengthUm && wavelengthUm <= p2.wavelengthUm) {
      const t = (wavelengthUm - p1.wavelengthUm) / (p2.wavelengthUm - p1.wavelengthUm);
      // Log-linear interpolation for positive fluxes
      const f1 = Math.max(1e-5, p1.fluxDensityMjy);
      const f2 = Math.max(1e-5, p2.fluxDensityMjy);
      return Math.exp(Math.log(f1) * (1 - t) + Math.log(f2) * t);
    }
  }
  return sorted[0].fluxDensityMjy;
}

/**
 * Generate photometric time-series across SPHEREx QR2 observation epochs
 * @param {string} targetId
 * @param {string} [bandFilter='all']
 */
export function getTargetLightCurve(targetId, bandFilter = 'all') {
  const target = AUTHORITATIVE_TARGETS.find(t => t.id === targetId);
  if (!target) {
    throw new Error(`Target ${targetId} not found in authoritative database.`);
  }

  const cachedObs = CACHED_SPHEREX_OBSERVATIONS[targetId];
  const observations = cachedObs ? cachedObs.observations : [];

  let filtered = observations;
  if (bandFilter && bandFilter !== 'all') {
    filtered = observations.filter(o => (o.energy_bandpassname || '').includes(bandFilter));
  }

  const measurements = filtered.map((obs, idx) => {
    const mjd = parseFloat(obs.t_min) || 60900 + idx * 5;
    const band = obs.energy_bandpassname || 'SPHEREx-D1';
    const detector = band.replace('SPHEREx-', '');
    const effLambdaUm = DETECTOR_WAVELENGTH_UM[detector] || 2.0;

    // Anchor baseline flux in mJy directly to real 2MASS / AllWISE / Spitzer archival photometry
    const baseCatalogFluxMjy = interpolateArchivalFluxMjy(target, effLambdaUm);

    let variabilityModulation = 1.0;
    let snr = 45.0;
    let phase = null;

    if (target.id === 'r-draconis') {
      // Mira pulsating variable: Verified GCVS/AAVSO Period = 245.6 days
      const pulsationPeriod = 245.6;
      phase = parseFloat((((mjd - 60800.0) % pulsationPeriod + pulsationPeriod) % pulsationPeriod / pulsationPeriod).toFixed(4));
      // Near-IR Mira pulsation amplitude (~0.8–1.2 mag peak-to-trough, Whitelock et al. 2000)
      const ampFactor = detector === 'D1' ? 0.48 : detector === 'D2' ? 0.42 : 0.35;
      const pulsationWave = Math.sin(phase * 2 * Math.PI) - 0.15 * Math.cos(phase * 4 * Math.PI);
      variabilityModulation = Math.max(0.25, 1.0 + ampFactor * pulsationWave);
      snr = 65.0;
    } else if (target.id === 'rw-aurigae') {
      // Irregular (aperiodic) Classical T Tauri variable: circumstellar dust occultation + accretion
      // Non-periodic dust extinction event centered around MJD 61010 with wavelength-dependent reddening (A_lambda ~ lambda^-1.1)
      const dtEvent = (mjd - 61010.0) / 48.0;
      const dustDepth = 0.62 * Math.exp(-(dtEvent * dtEvent)) + 0.18 * Math.sin((mjd - 60920.0) * 0.09);
      const extinctionWeight = Math.pow(1.25 / effLambdaUm, 0.85);
      variabilityModulation = Math.max(0.20, 1.0 - Math.min(0.75, dustDepth * extinctionWeight));
      snr = 50.0;
    } else if (target.id === 'wise-0855') {
      // Ultra-cold Y4 brown dwarf: detectable in D5/D6 (4–5 um), upper-limit noise floor in D1–D3
      const isD6 = detector === 'D6';
      const isD5 = detector === 'D5';
      variabilityModulation = 1.0 + 0.04 * Math.sin((mjd - 60800.0) * 0.25);
      snr = isD6 ? 18.5 : isD5 ? 5.2 : 1.5;
    } else {
      // Non-variable proper-motion benchmarks (Barnard's Star, Epsilon Indi B): flat baseline within +/-1.5% calibration stability
      variabilityModulation = 1.0 + 0.008 * Math.sin(mjd * 0.17 + idx);
      snr = target.id === 'barnards-star' ? 80.0 : 38.0;
    }

    const fluxDensityMjy = Math.max(0.0002, baseCatalogFluxMjy * variabilityModulation);
    const fluxDensityUJy = fluxDensityMjy * 1000.0;
    const fluxErrorMjy = fluxDensityMjy / snr;
    const fluxErrorUJy = fluxDensityUJy / snr;

    const abMag = fluxUJyToAbMag(fluxDensityUJy);
    const magError = abMag !== null ? parseFloat((1.0857 / snr).toFixed(3)) : null;

    // Equivalent surface brightness in a 3-pixel radius SPHEREx aperture (Omega = 2.554e-8 sr)
    const surfaceBrightnessMJyPerSr = fluxDensityMjy / 25.54;

    return {
      index: idx + 1,
      obsId: obs.obs_id || `SPHEREx-${idx + 1}`,
      bandpass: band,
      detector,
      effectiveWavelengthUm: effLambdaUm,
      mjd: parseFloat(mjd.toFixed(4)),
      utcDate: mjdToUtc(mjd),
      phase,
      wavelengthMinUm: obs.em_min ? parseFloat((parseFloat(obs.em_min) * 1e6).toFixed(4)) : null,
      wavelengthMaxUm: obs.em_max ? parseFloat((parseFloat(obs.em_max) * 1e6).toFixed(4)) : null,
      surfaceBrightnessMJyPerSr: parseFloat(surfaceBrightnessMJyPerSr.toFixed(4)),
      fluxDensityMjy: parseFloat(fluxDensityMjy.toFixed(4)),
      fluxErrorMjy: parseFloat(fluxErrorMjy.toFixed(4)),
      fluxDensityUJy: parseFloat(fluxDensityUJy.toFixed(1)),
      fluxErrorUJy: parseFloat(fluxErrorUJy.toFixed(1)),
      abMagnitude: abMag !== null ? parseFloat(abMag.toFixed(2)) : null,
      magError,
      snr: parseFloat(snr.toFixed(1)),
      qualityFlag: snr >= 5.0 ? 'GOOD' : 'LOW_SNR',
      apertureRadiusArcsec: 18.5,
      calibrationLevel: 'Archival-Anchored Spectrophotometric Model at Real IRSA QR2 Epochs',
      provenance: {
        archive: 'NASA/IPAC IRSA SPHEREx QR2 (Epochs) + 2MASS/AllWISE/AAVSO (Flux Calibration)',
        detectorArray: detector,
        dataRelease: 'QR2 (Oct 2025)'
      }
    };
  });

  measurements.sort((a, b) => a.mjd - b.mjd);

  const bandsAvailable = Array.from(new Set(measurements.map(m => m.detector))).sort();
  const fluxes = measurements.map(m => m.fluxDensityMjy).filter(f => f > 0);
  const minFlux = fluxes.length ? Math.min(...fluxes) : 0;
  const maxFlux = fluxes.length ? Math.max(...fluxes) : 0;
  const meanFlux = fluxes.length ? fluxes.reduce((a, b) => a + b, 0) / fluxes.length : 0;

  return {
    dataClassification: 'MODEL / SIMULATION',
    dataClassificationDetail: 'MODEL / SIMULATION (Synthetic Spectrophotometric Time-Series Model Evaluated at REAL OBSERVATION IRSA SPHEREx QR2 Timestamps, Anchored to REAL OBSERVATION 2MASS/AllWISE/Spitzer/AAVSO Catalog Photometry — Not Extracted SPHEREx FITS Pixel Photometry)',
    targetType: target.type,
    variabilityMetadata: {
      isVariable: target.id === 'rw-aurigae' || target.id === 'r-draconis',
      periodDays: target.periodDays || null,
      variabilityType: target.variabilityType || 'Non-variable baseline',
      referenceSource: target.id === 'r-draconis' ? 'General Catalogue of Variable Stars (GCVS) / AAVSO VSX OID 13745' : '2MASS All-Sky PSC / AllWISE Source Catalog'
    },
    target: {
      id: target.id,
      name: target.name,
      type: target.type,
      spectralType: target.spectralType,
      periodDays: target.periodDays || null,
      variabilityType: target.variabilityType || 'Non-variable baseline',
      isPeriodicVariable: target.periodDays !== null && target.periodDays !== undefined,
      periodSource: target.id === 'r-draconis' ? 'General Catalogue of Variable Stars (GCVS) / AAVSO VSX OID 13745' : null,
      coordinates: {
        raDeg: target.raDeg,
        decDeg: target.decDeg,
        raSexagesimal: target.raSexagesimal,
        decSexagesimal: target.decSexagesimal
      }
    },
    archivalPhotometry: target.archivalPhotometry || [],
    filterApplied: bandFilter,
    bandsAvailable,
    totalMeasurementsCount: measurements.length,
    statistics: {
      timeSpanMjd: measurements.length > 1 ? calculateElapsedDays(measurements[0].mjd, measurements[measurements.length - 1].mjd, 1) : 0,
      minFluxDensityMjy: parseFloat(minFlux.toFixed(4)),
      maxFluxDensityMjy: parseFloat(maxFlux.toFixed(4)),
      meanFluxDensityMjy: parseFloat(meanFlux.toFixed(4)),
      variabilityRatio: minFlux > 0 ? parseFloat((maxFlux / minFlux).toFixed(2)) : null
    },
    measurements
  };
}

/**
 * Generate CSV export text for target light curve measurements with full provenance metadata headers
 */
export function generateLightCurveCsv(targetId, bandFilter = 'all') {
  const data = getTargetLightCurve(targetId, bandFilter);
  const metaComments = [
    `# MARSAD — NASA SPHEREx Scientific Photometric Time-Series Export`,
    `# Target: ${data.target.name} (${data.target.id}) | Spectral Type: ${data.target.spectralType}`,
    `# Coordinates (ICRS J2000): RA ${data.target.coordinates.raSexagesimal} (${data.target.coordinates.raDeg} deg), Dec ${data.target.coordinates.decSexagesimal} (${data.target.coordinates.decDeg} deg)`,
    `# Variability Classification: ${data.target.variabilityType}`,
    `# Verified Period: ${data.target.periodDays ? `${data.target.periodDays} days (${data.target.periodSource})` : 'None (Aperiodic or Non-Variable)'}`,
    `# Data Classification: ${data.dataClassification}`,
    `# Detector Filter: ${bandFilter} | Total Rows: ${data.totalMeasurementsCount}`,
    `# Retrieved Timestamp: ${new Date().toISOString()}`
  ];

  const headers = [
    'target_name',
    'obs_id',
    'detector',
    'bandpass',
    'effective_wavelength_um',
    'mjd',
    'utc_date',
    'pulsation_phase',
    'wavelength_min_um',
    'wavelength_max_um',
    'surface_brightness_mjy_sr',
    'flux_density_mjy',
    'flux_error_mjy',
    'flux_density_ujy',
    'flux_error_ujy',
    'ab_magnitude',
    'magnitude_error',
    'snr',
    'quality_flag',
    'archive_source'
  ];

  const rows = data.measurements.map(m => [
    `"${data.target.name}"`,
    `"${m.obsId}"`,
    `"${m.detector}"`,
    `"${m.bandpass}"`,
    m.effectiveWavelengthUm,
    m.mjd,
    `"${m.utcDate}"`,
    m.phase !== null && m.phase !== undefined ? m.phase : '',
    m.wavelengthMinUm || '',
    m.wavelengthMaxUm || '',
    m.surfaceBrightnessMJyPerSr,
    m.fluxDensityMjy,
    m.fluxErrorMjy,
    m.fluxDensityUJy,
    m.fluxErrorUJy,
    m.abMagnitude !== null ? m.abMagnitude : '',
    m.magError !== null ? m.magError : '',
    m.snr,
    `"${m.qualityFlag}"`,
    `"${m.provenance.archive}"`
  ]);

  return [...metaComments, headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
