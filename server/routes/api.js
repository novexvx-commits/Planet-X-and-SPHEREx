/**
 * SPHEREx Scientific Platform REST API Routes
 * Modular, verified, authenticated-free public scientific exploration endpoints.
 */

import express from 'express';
import { AUTHORITATIVE_TARGETS, BENCHMARK_SOLAR_SYSTEM_TARGETS } from '../data/authoritativeTargets.js';
import { querySpherexObservations } from '../services/irsaTapService.js';
import { compareObservations } from '../services/imageComparisonService.js';
import { analyzeTargetMotion } from '../services/motionService.js';
import { getTargetLightCurve, generateLightCurveCsv } from '../services/photometryService.js';
import { getSpectralBandsCatalog, getTargetSpectra } from '../services/spectralService.js';
import { queryMovingObjectSearch } from '../services/mostMovingObjectService.js';
import { resolveAstronomicalTarget } from '../services/simbadService.js';
import { CACHED_SPHEREX_OBSERVATIONS } from '../data/cachedObservations.js';
import { mjdToUtc } from '../utils/astronomy.js';

const router = express.Router();

// System Health & Diagnostics
router.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'NASA SPHEREx 2026 Space Apps Challenge API',
    mission: 'SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer)',
    archiveRelease: 'QR2 (Quick Release 2)',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/targets',
      '/api/target/:id',
      '/api/search',
      '/api/observations',
      '/api/timeline/:targetId',
      '/api/image-compare',
      '/api/motion/:targetId',
      '/api/lightcurve/:targetId',
      '/api/lightcurve/:targetId/csv',
      '/api/spectra/catalog',
      '/api/spectra/:targetId',
      '/api/most'
    ]
  });
});

// List Authoritative Targets
router.get('/targets', (req, res) => {
  const targets = AUTHORITATIVE_TARGETS.map(t => {
    const cached = CACHED_SPHEREX_OBSERVATIONS[t.id];
    return {
      ...t,
      observationCount: cached ? cached.count : 0
    };
  });

  res.json({
    authoritativeTargetsCount: targets.length,
    targets,
    benchmarkSolarSystemTargets: BENCHMARK_SOLAR_SYSTEM_TARGETS
  });
});

// Target Detailed Dossier
router.get('/target/:id', (req, res) => {
  const target = AUTHORITATIVE_TARGETS.find(t => t.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: `Target '${req.params.id}' not found.` });
  }

  const cached = CACHED_SPHEREX_OBSERVATIONS[target.id];
  res.json({
    target,
    availableObservationsCount: cached ? cached.count : 0,
    recentObservationsSample: cached ? cached.observations.slice(0, 5) : []
  });
});

// Search by Target Name or Coordinates
router.get('/search', async (req, res) => {
  const { q, ra, dec } = req.query;
  const searchInput = q || (ra && dec ? `${ra}, ${dec}` : null);

  if (!searchInput) {
    return res.status(400).json({ error: "Missing required query parameter: 'q' or ('ra' and 'dec')." });
  }

  try {
    const target = await resolveAstronomicalTarget(searchInput);
    res.json({ result: target });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Retrieve SPHEREx Observations for Target or Region
router.get('/observations', async (req, res) => {
  const { targetId, ra, dec, radius = '0.25', collection = 'spherex_qr2' } = req.query;

  let targetRa = parseFloat(ra);
  let targetDec = parseFloat(dec);

  if (targetId) {
    const t = AUTHORITATIVE_TARGETS.find(x => x.id === targetId);
    if (t) {
      targetRa = t.raDeg;
      targetDec = t.decDeg;
    }
  }

  if (isNaN(targetRa) || isNaN(targetDec)) {
    return res.status(400).json({ error: "Valid targetId or coordinates ('ra', 'dec') are required." });
  }

  try {
    const data = await querySpherexObservations(targetRa, targetDec, parseFloat(radius), collection);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Observation Timeline for Target
router.get('/timeline/:targetId', async (req, res) => {
  const target = AUTHORITATIVE_TARGETS.find(t => t.id === req.params.targetId);
  if (!target) {
    return res.status(404).json({ error: `Target '${req.params.targetId}' not found.` });
  }

  const cached = CACHED_SPHEREX_OBSERVATIONS[target.id];
  if (!cached || !cached.observations) {
    return res.status(404).json({ error: `No observations found for ${target.name}.` });
  }

  const sortedObs = [...cached.observations].sort(
    (a, b) => (parseFloat(a.t_min) || 0) - (parseFloat(b.t_min) || 0)
  );

  const timelineEntries = sortedObs.map((obs, idx) => {
    const mjd = parseFloat(obs.t_min) || 0;
    return {
      id: `tl_${idx + 1}`,
      obsId: obs.obs_id,
      obs_id: obs.obs_id,
      bandpass: obs.energy_bandpassname,
      energy_bandpassname: obs.energy_bandpassname,
      em_band: obs.energy_bandpassname,
      detector: (obs.energy_bandpassname || '').replace('SPHEREx-', ''),
      mjd,
      t_min: obs.t_min,
      utcDate: mjdToUtc(mjd),
      releaseDate: obs.obs_release_date || '2025-10-17',
      exposureTimeSec: parseFloat(obs.t_exptime) || 113.58,
      accessUrl: obs.access_url,
      access_url: obs.access_url,
      pixelScaleArcsec: parseFloat(obs.s_pixel_scale) || 6.15,
      provenance: {
        archive: 'NASA/IPAC IRSA',
        collection: 'spherex_qr2',
        quality: 'Calibrated Level 2 Science Exposure'
      }
    };
  });

  res.json({
    target: {
      id: target.id,
      name: target.name,
      raDeg: target.raDeg,
      decDeg: target.decDeg
    },
    totalEntriesCount: timelineEntries.length,
    timelineEntries
  });
});

// Image Comparison (Side-by-Side, Blink, Difference Imaging)
router.get('/image-compare', (req, res) => {
  const { targetId, obsId1, obsId2, cutoutSize = '32' } = req.query;

  if (!targetId) {
    return res.status(400).json({ error: "Missing required parameter 'targetId'." });
  }

  const target = AUTHORITATIVE_TARGETS.find(t => t.id === targetId);
  if (!target) {
    return res.status(404).json({ error: `Target '${targetId}' not found.` });
  }

  const cached = CACHED_SPHEREX_OBSERVATIONS[target.id];
  const obsList = cached
    ? [...cached.observations].sort((a, b) => (parseFloat(a.t_min) || 0) - (parseFloat(b.t_min) || 0))
    : [];

  const obs1 = (obsId1 ? obsList.find(o => o.obs_id === obsId1) : null) || obsList[0] || {
    obs_id: 'SPHEREx-EP1',
    energy_bandpassname: 'SPHEREx-D2',
    t_min: 60920,
    s_ra: target.raDeg,
    s_dec: target.decDeg
  };

  const obs2 = (obsId2 ? obsList.find(o => o.obs_id === obsId2) : null) || obsList[obsList.length - 1] || {
    obs_id: 'SPHEREx-EP2',
    energy_bandpassname: 'SPHEREx-D2',
    t_min: 61120,
    s_ra: target.raDeg,
    s_dec: target.decDeg
  };

  try {
    const comparison = compareObservations({
      targetId: target.id,
      obs1: {
        obsId: obs1.obs_id,
        bandpass: obs1.energy_bandpassname,
        mjd: parseFloat(obs1.t_min) || 60920,
        centerRa: parseFloat(obs1.s_ra) || target.raDeg,
        centerDec: parseFloat(obs1.s_dec) || target.decDeg
      },
      obs2: {
        obsId: obs2.obs_id,
        bandpass: obs2.energy_bandpassname,
        mjd: parseFloat(obs2.t_min) || 61120,
        centerRa: parseFloat(obs2.s_ra) || target.raDeg,
        centerDec: parseFloat(obs2.s_dec) || target.decDeg
      },
      cutoutSize: parseInt(cutoutSize, 10) || 32
    });

    res.json(comparison);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Motion Detection Analysis
router.get('/motion/:targetId', (req, res) => {
  try {
    const result = analyzeTargetMotion(req.params.targetId);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Variable Star Light Curves
router.get('/lightcurve/:targetId', (req, res) => {
  const { band = 'all' } = req.query;
  try {
    const result = getTargetLightCurve(req.params.targetId, band);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Light Curve Download as CSV
router.get('/lightcurve/:targetId/csv', (req, res) => {
  const { band = 'all' } = req.query;
  try {
    const csv = generateLightCurveCsv(req.params.targetId, band);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.targetId}_spherex_lightcurve.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 102 Spectral Bands Catalog
router.get('/spectra/catalog', (req, res) => {
  res.json(getSpectralBandsCatalog());
});

// Target Spectral Energy Distribution across 102 Bands
router.get('/spectra/:targetId', (req, res) => {
  try {
    const spectra = getTargetSpectra(req.params.targetId);
    res.json(spectra);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Moving Object Search Tool (MOST)
router.get('/most', async (req, res) => {
  const { target = 'Ceres', catalog = 'spherex', startDate = null } = req.query;
  try {
    const result = await queryMovingObjectSearch(target, catalog, startDate);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

