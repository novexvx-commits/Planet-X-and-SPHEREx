/**
 * Pan-STARRS1 (PS1) DR1 Image Cutout & Sky Coverage Service
 * Integrates with NASA STScI Mikulski Archive for Space Telescopes (MAST) Pan-STARRS API.
 * 
 * Scientific Boundary:
 * Pan-STARRS1 was located at Haleakala Observatory, Hawaii (+20° 42' N).
 * The 3pi Steradian Survey covers the sky north of declination -30° (Dec >= -30°).
 * Southern hemisphere targets (such as Epsilon Indi B at Dec -56.8°) are outside the survey footprint.
 */

import { AUTHORITATIVE_TARGETS } from '../data/authoritativeTargets.js';

// In-memory cache for resolved Pan-STARRS cutout URLs and skycells
const PANSTARRS_CACHE = new Map();

const VERIFIED_PANSTARRS_MAP = {
  'barnards-star': {
    skycell: '1479.018',
    imageUrl: 'https://ps1images.stsci.edu/cgi-bin/fitscut.cgi?ra=269.452083&dec=4.693389&size=480&format=jpeg&red=%2Frings.v3.skycell%2F1479%2F018%2Frings.v3.skycell.1479.018.stk.y.unconv.fits&green=%2Frings.v3.skycell%2F1479%2F018%2Frings.v3.skycell.1479.018.stk.r.unconv.fits&blue=%2Frings.v3.skycell%2F1479%2F018%2Frings.v3.skycell.1479.018.stk.g.unconv.fits',
    directFitsUrl: 'https://ps1images.stsci.edu/rings.v3.skycell/1479/018/rings.v3.skycell.1479.018.stk.r.unconv.fits'
  },
  'wise-0855': {
    skycell: '1176.014',
    imageUrl: 'https://ps1images.stsci.edu/cgi-bin/fitscut.cgi?ra=133.795125&dec=-7.245222&size=480&format=jpeg&red=%2Frings.v3.skycell%2F1176%2F014%2Frings.v3.skycell.1176.014.stk.y.unconv.fits&green=%2Frings.v3.skycell%2F1176%2F014%2Frings.v3.skycell.1176.014.stk.r.unconv.fits&blue=%2Frings.v3.skycell%2F1176%2F014%2Frings.v3.skycell.1176.014.stk.g.unconv.fits',
    directFitsUrl: 'https://ps1images.stsci.edu/rings.v3.skycell/1176/014/rings.v3.skycell.1176.014.stk.r.unconv.fits'
  },
  'rw-aurigae': {
    skycell: '1947.066',
    imageUrl: 'https://ps1images.stsci.edu/cgi-bin/fitscut.cgi?ra=76.95653&dec=30.40167&size=480&format=jpeg&red=%2Frings.v3.skycell%2F1947%2F066%2Frings.v3.skycell.1947.066.stk.y.unconv.fits&green=%2Frings.v3.skycell%2F1947%2F066%2Frings.v3.skycell.1947.066.stk.r.unconv.fits&blue=%2Frings.v3.skycell%2F1947%2F066%2Frings.v3.skycell.1947.066.stk.g.unconv.fits',
    directFitsUrl: 'https://ps1images.stsci.edu/rings.v3.skycell/1947/066/rings.v3.skycell.1947.066.stk.r.unconv.fits'
  },
  'r-draconis': {
    skycell: '2526.066',
    imageUrl: 'https://ps1images.stsci.edu/cgi-bin/fitscut.cgi?ra=248.16762&dec=66.75548&size=480&format=jpeg&red=%2Frings.v3.skycell%2F2526%2F066%2Frings.v3.skycell.2526.066.stk.y.unconv.fits&green=%2Frings.v3.skycell%2F2526%2F066%2Frings.v3.skycell.2526.066.stk.r.unconv.fits&blue=%2Frings.v3.skycell%2F2526%2F066%2Frings.v3.skycell.2526.066.stk.g.unconv.fits',
    directFitsUrl: 'https://ps1images.stsci.edu/rings.v3.skycell/2526/066/rings.v3.skycell.2526.066.stk.r.unconv.fits'
  }
};

/**
 * Check Pan-STARRS sky coverage and retrieve MAST cutout metadata for a target or coordinates
 * @param {string} targetId 
 * @param {number} customRa 
 * @param {number} customDec 
 */
export async function getPanstarrsCutout(targetId, customRa = null, customDec = null) {
  let target = null;
  let ra = customRa;
  let dec = customDec;
  let targetName = 'Target';

  if (targetId) {
    target = AUTHORITATIVE_TARGETS.find(t => t.id === targetId);
    if (target) {
      ra = target.raDeg;
      dec = target.decDeg;
      targetName = target.name;
    }
  }

  if (ra === null || dec === null || isNaN(ra) || isNaN(dec)) {
    throw new Error('Valid celestial coordinates (ra, dec) or targetId required.');
  }

  // Check cache
  const cacheKey = targetId || `${ra.toFixed(4)},${dec.toFixed(4)}`;
  if (PANSTARRS_CACHE.has(cacheKey)) {
    return PANSTARRS_CACHE.get(cacheKey);
  }

  // SCIENTIFIC COVERAGE CHECK:
  // Pan-STARRS1 3pi survey has a strict southern horizon cutoff at Dec = -30.0 degrees
  if (dec < -30.0) {
    const unavailableResult = {
      targetId: targetId || null,
      targetName,
      coordinates: {
        raDeg: parseFloat(ra.toFixed(6)),
        decDeg: parseFloat(dec.toFixed(6))
      },
      available: false,
      coverageStatus: 'UNAVAILABLE',
      reason: `Declination δ = ${dec.toFixed(2)}° is outside the Pan-STARRS1 3π survey footprint (southern limit δ ≥ -30°).`,
      scientificContext: 'Pan-STARRS1 at Haleakala Observatory (Hawaii, +20° 42′ N) surveyed declinations δ ≥ -30°. Deep southern celestial targets were below the observatory horizon.',
      observatory: 'Haleakala Observatory, Hawaii (+20° 42′ N)',
      surveyLimitDecDeg: -30.0,
      alternativeSurveys: [
        { name: 'DSS2 Optical Color', id: 'https://skies.esac.esa.int/DSSColor', coverage: 'All-Sky (Palomar + UK Schmidt)' },
        { name: '2MASS Near-IR', id: 'https://skies.esac.esa.int/2MASSColor', coverage: 'All-Sky (Mt. Hopkins + CTIO Chile)' },
        { name: 'AllWISE Mid-IR', id: 'https://skies.esac.esa.int/AllWISEColor', coverage: 'All-Sky Space-Based' }
      ]
    };
    PANSTARRS_CACHE.set(cacheKey, unavailableResult);
    return unavailableResult;
  }

  // Target is inside Pan-STARRS footprint (Dec >= -30°).
  // Query MAST STScI Pan-STARRS filenames service:
  try {
    const listUrl = `https://ps1images.stsci.edu/cgi-bin/ps1filenames.py?ra=${ra}&dec=${dec}&filters=grizy`;
    const res = await fetch(listUrl, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      throw new Error(`MAST API returned HTTP ${res.status}`);
    }
    const text = await res.text();
    const rows = text.trim().split('\n').slice(1).map(l => l.split(' ')).filter(r => r.length > 7);

    if (rows.length === 0) {
      const missingResult = {
        targetId: targetId || null,
        targetName,
        coordinates: { raDeg: ra, decDeg: dec },
        available: false,
        coverageStatus: 'UNAVAILABLE',
        reason: 'No Pan-STARRS1 skycell images returned by MAST for this position (unobserved chip gap or mask).',
        alternativeSurveys: [
          { name: 'DSS2 Optical Color', id: 'https://skies.esac.esa.int/DSSColor' },
          { name: '2MASS Near-IR', id: 'https://skies.esac.esa.int/2MASSColor' }
        ]
      };
      PANSTARRS_CACHE.set(cacheKey, missingResult);
      return missingResult;
    }

    const fileMap = {};
    let projcell = '';
    let subcell = '';
    rows.forEach(r => {
      projcell = r[0];
      subcell = r[1];
      const filter = r[4];
      const filename = r[7];
      fileMap[filter] = filename;
    });

    const redFile = fileMap['y'] || fileMap['z'] || fileMap['i'];
    const greenFile = fileMap['r'] || fileMap['i'];
    const blueFile = fileMap['g'];

    if (!redFile || !greenFile || !blueFile) {
      throw new Error('Insufficient color filter planes available for composite image.');
    }

    // High-resolution 480x480 pixel color cutout (covering ~2 arcminutes at 0.25"/px)
    const colorUrl = `https://ps1images.stsci.edu/cgi-bin/fitscut.cgi?ra=${ra}&dec=${dec}&size=480&format=jpeg&red=${encodeURIComponent(redFile)}&green=${encodeURIComponent(greenFile)}&blue=${encodeURIComponent(blueFile)}`;

    const availableResult = {
      targetId: targetId || null,
      targetName,
      coordinates: {
        raDeg: parseFloat(ra.toFixed(6)),
        decDeg: parseFloat(dec.toFixed(6))
      },
      available: true,
      coverageStatus: 'AVAILABLE',
      survey: 'Pan-STARRS1 (PS1) DR1 3π Survey Color Composite',
      skycell: `${projcell}.${subcell}`,
      imageUrl: colorUrl,
      directFitsUrl: `https://ps1images.stsci.edu${greenFile}`,
      fovArcmin: 2.0,
      pixelScaleArcsec: 0.25,
      filtersUsed: ['y (red)', 'r (green)', 'g (blue)'],
      archiveSource: 'NASA STScI Mikulski Archive for Space Telescopes (MAST)',
      retrievalTimestamp: new Date().toISOString()
    };

    PANSTARRS_CACHE.set(cacheKey, availableResult);
    return availableResult;
  } catch (err) {
    // If live MAST STScI network request fails or times out, provide deterministic verified fallback metadata
    const verified = targetId ? VERIFIED_PANSTARRS_MAP[targetId] : null;
    const fallbackResult = {
      targetId: targetId || null,
      targetName,
      coordinates: { raDeg: ra, decDeg: dec },
      available: dec >= -30.0,
      coverageStatus: dec >= -30.0 ? 'AVAILABLE' : 'UNAVAILABLE',
      survey: 'Pan-STARRS1 (PS1) DR1 Color',
      skycell: verified?.skycell || (dec >= -30.0 ? 'PS1-3PI' : null),
      imageUrl: verified?.imageUrl || null,
      directFitsUrl: verified?.directFitsUrl || null,
      reason: dec < -30.0 
        ? 'Outside Pan-STARRS1 3π survey footprint (Dec < -30°)' 
        : `MAST Pan-STARRS service temporarily unreachable (${err.message})`,
      alternativeSurveys: [
        { name: 'DSS2 Optical Color', id: 'https://skies.esac.esa.int/DSSColor' },
        { name: '2MASS Near-IR', id: 'https://skies.esac.esa.int/2MASSColor' }
      ]
    };
    return fallbackResult;
  }
}
