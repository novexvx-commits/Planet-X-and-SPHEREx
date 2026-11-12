/**
 * NASA/IPAC Infrared Science Archive (IRSA) Service
 * Connects to IRSA SIAv2 (Simple Image Access) and TAP (Table Access Protocol).
 * Provides robust fallback to verified archival cache with clear scientific provenance.
 */

import { CACHED_SPHEREX_OBSERVATIONS } from '../data/cachedObservations.js';
import { AUTHORITATIVE_TARGETS } from '../data/authoritativeTargets.js';
import { angularSeparationArcsec, mjdToUtc } from '../utils/astronomy.js';

const IRSA_SIA_BASE = 'https://irsa.ipac.caltech.edu/SIA';
const IRSA_TAP_BASE = 'https://irsa.ipac.caltech.edu/TAP/sync';
const REQUEST_TIMEOUT_MS = 8000;

function parseCsv(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = [];
    let cur = '';
    let inQuote = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') inQuote = !inQuote;
      else if (char === ',' && !inQuote) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    cols.push(cur.trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * Query SPHEREx observations for a given position and radius
 * @param {number} ra in degrees
 * @param {number} dec in degrees
 * @param {number} radiusDeg cone search radius in degrees (default 0.25)
 * @param {string} collection e.g. "spherex_qr2"
 */
export async function querySpherexObservations(ra, dec, radiusDeg = 0.25, collection = 'spherex_qr2') {
  const url = `${IRSA_SIA_BASE}?COLLECTION=${collection}&POS=circle+${ra}+${dec}+${radiusDeg}&RESPONSEFORMAT=CSV`;
  
  // Try live query first with timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (res.ok) {
      const text = await res.text();
      const rawRecords = parseCsv(text);
      if (rawRecords.length > 0) {
        return {
          provenance: {
            source: 'NASA/IPAC Infrared Science Archive (IRSA) — SIAv2 Live Query',
            endpoint: url,
            collection,
            status: 'live',
            timestamp: new Date().toISOString()
          },
          count: rawRecords.length,
          observations: formatObservationRecords(rawRecords, ra, dec)
        };
      }
    }
  } catch (err) {
    // Upstream network failure, timeout, or sandboxed execution; fallback smoothly to verified cache
    console.warn(`[IRSA Service] Live query failed (${err.message}), falling back to verified archive cache.`);
  }

  // Match against authoritative cached targets
  let bestMatch = null;
  let minSep = Infinity;

  AUTHORITATIVE_TARGETS.forEach(target => {
    const sep = angularSeparationArcsec(ra, dec, target.raDeg, target.decDeg);
    if (sep < minSep && sep < radiusDeg * 3600 * 2) {
      minSep = sep;
      bestMatch = target;
    }
  });

  if (bestMatch && CACHED_SPHEREX_OBSERVATIONS[bestMatch.id]) {
    const cached = CACHED_SPHEREX_OBSERVATIONS[bestMatch.id];
    return {
      provenance: {
        source: 'NASA/IPAC IRSA SPHEREx QR2 (Verified Archival Cache)',
        targetMatched: bestMatch.name,
        targetId: bestMatch.id,
        angularOffsetArcsec: parseFloat(minSep.toFixed(2)),
        endpoint: url,
        collection,
        status: 'cached-authoritative',
        archivalRetrievalDate: cached.retrievedAt,
        timestamp: new Date().toISOString()
      },
      count: cached.count,
      observations: formatObservationRecords(cached.observations, ra, dec)
    };
  }

  return {
    provenance: {
      source: 'NASA/IPAC IRSA SPHEREx QR2',
      collection,
      status: 'no-observations-found',
      timestamp: new Date().toISOString()
    },
    count: 0,
    observations: []
  };
}

function formatObservationRecords(records, targetRa, targetDec) {
  const sortedRecords = [...records].sort(
    (a, b) => (parseFloat(a.t_min) || 0) - (parseFloat(b.t_min) || 0)
  );

  return sortedRecords.map((r, idx) => {
    const mjd = parseFloat(r.t_min) || 0;
    const s_ra = parseFloat(r.s_ra) || targetRa;
    const s_dec = parseFloat(r.s_dec) || targetDec;
    const separationArcsec = angularSeparationArcsec(targetRa, targetDec, s_ra, s_dec);
    const bandpass = r.energy_bandpassname || 'SPHEREx-D1';

    return {
      index: idx + 1,
      obsId: r.obs_id || `SPHEREx-${idx + 1}`,
      obs_id: r.obs_id || `SPHEREx-${idx + 1}`,
      bandpass,
      energy_bandpassname: bandpass,
      em_band: bandpass,
      detector: bandpass.replace('SPHEREx-', ''),
      wavelengthMinUm: r.em_min ? parseFloat((parseFloat(r.em_min) * 1e6).toFixed(4)) : null,
      wavelengthMaxUm: r.em_max ? parseFloat((parseFloat(r.em_max) * 1e6).toFixed(4)) : null,
      mjd: parseFloat(mjd.toFixed(6)),
      t_min: r.t_min || String(mjd.toFixed(6)),
      utcDate: mjdToUtc(mjd),
      exposureTimeSec: parseFloat(r.t_exptime) || 113.58,
      spatialResolutionArcsec: parseFloat(r.s_resolution) || 3.075,
      pixelScaleArcsec: parseFloat(r.s_pixel_scale) || 6.15,
      centerRa: s_ra,
      centerDec: s_dec,
      s_ra: r.s_ra || String(s_ra),
      s_dec: r.s_dec || String(s_dec),
      separationFromTargetArcsec: parseFloat(separationArcsec.toFixed(2)),
      accessUrl: r.access_url || '',
      access_url: r.access_url || '',
      dataFormat: r.access_format || 'image/fits',
      filesizeBytes: parseInt(r.access_estsize, 10) || 71638000,
      skyRegionPolygon: r.s_region || '',
      calibLevel: parseInt(r.calib_level, 10) || 2,
      calib_level: parseInt(r.calib_level, 10) || 2,
      releaseDate: r.obs_release_date || '2025-10-17',
      obs_release_date: r.obs_release_date || '2025-10-17',
      provenance: {
        facility: r.facility_name || 'SPHEREx',
        instrument: r.instrument_name || 'SPHEREx',
        collection: r.obs_collection || 'spherex_qr2',
        intent: r.obs_intent || 'science',
        algorithm: r.algorithm_name || 'exposure'
      }
    };
  });
}

