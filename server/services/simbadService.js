/**
 * SIMBAD & Sesame Astronomical Target Resolution Service
 * Name-to-coordinate lookup, object identification, and multi-catalog metadata resolution.
 */

import { AUTHORITATIVE_TARGETS } from '../data/authoritativeTargets.js';
import { raSexagesimalToDeg, decSexagesimalToDeg, degToRaSexagesimal, degToDecSexagesimal } from '../utils/astronomy.js';

const SESAME_URL = 'https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNVA?';
const TIMEOUT_MS = 6000;

/**
 * Resolve astronomical object name or coordinates into standardized celestial metadata
 * @param {string} query - Target name or coordinate string
 */
export async function resolveAstronomicalTarget(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('A valid astronomical target name or coordinate string is required.');
  }

  const cleanQuery = query.trim();

  // 1. Direct match with authoritative targets
  const exactMatch = AUTHORITATIVE_TARGETS.find(t => 
    t.id.toLowerCase() === cleanQuery.toLowerCase() ||
    t.name.toLowerCase() === cleanQuery.toLowerCase() ||
    t.aliases.some(a => a.toLowerCase() === cleanQuery.toLowerCase())
  );

  if (exactMatch) {
    return {
      provenance: {
        source: 'NASA SPHEREx Authoritative Target Catalog',
        status: 'authoritative-target',
        timestamp: new Date().toISOString()
      },
      ...exactMatch
    };
  }

  // 2. Check if query is a coordinate pair (e.g. "269.452, 4.693" or "17h 57m 48.5s +04° 41' 36\"")
  const coordMatch = cleanQuery.match(/([0-9.+-]+(?:h|d|°|:|\s+[0-9.]+(?:m|')|\s+[0-9.]+(?:s|"))?)[,\s]+([0-9.+-]+.*)/i);
  if (coordMatch) {
    const rawRa = coordMatch[1].trim();
    const rawDec = coordMatch[2].trim();
    const parsedRa = raSexagesimalToDeg(rawRa);
    const parsedDec = decSexagesimalToDeg(rawDec);

    if (!isNaN(parsedRa) && !isNaN(parsedDec)) {
      return {
        provenance: {
          source: 'User Coordinate Specification',
          status: 'resolved-coordinates',
          timestamp: new Date().toISOString()
        },
        id: `coord_${parsedRa.toFixed(4)}_${parsedDec.toFixed(4)}`,
        name: `Target at RA ${degToRaSexagesimal(parsedRa)}, Dec ${degToDecSexagesimal(parsedDec)}`,
        aliases: [],
        type: 'Celestial Region',
        subType: 'User Defined Sky Field',
        spectralType: 'N/A',
        raDeg: parseFloat(parsedRa.toFixed(6)),
        decDeg: parseFloat(parsedDec.toFixed(6)),
        raSexagesimal: degToRaSexagesimal(parsedRa),
        decSexagesimal: degToDecSexagesimal(parsedDec),
        scienceDescription: `User-specified celestial sky coordinates for SPHEREx footprint analysis.`,
        spherexContext: {
          qrRelease: 'QR2',
          observedBandpasses: ['SPHEREx-D1', 'SPHEREx-D2', 'SPHEREx-D3', 'SPHEREx-D4', 'SPHEREx-D5', 'SPHEREx-D6'],
          surveyCadence: '6-month all-sky scan'
        }
      };
    }
  }

  // 3. Query SIMBAD Sesame resolver
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${SESAME_URL}${encodeURIComponent(cleanQuery)}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const xml = await res.text();
      // Extract RA and Dec from Sesame XML response
      const jradegMatch = xml.match(/<jradeg>([0-9.]+)<\/jradeg>/);
      const jdedegMatch = xml.match(/<jdedeg>([-+0-9.]+)<\/jdedeg>/);
      const onameMatch = xml.match(/<oname>([^<]+)<\/oname>/);
      const otypeMatch = xml.match(/<otype>([^<]+)<\/otype>/);
      const spTypeMatch = xml.match(/<spType>([^<]+)<\/spType>/);

      if (jradegMatch && jdedegMatch) {
        const raDeg = parseFloat(jradegMatch[1]);
        const decDeg = parseFloat(jdedegMatch[1]);
        const resolvedName = onameMatch ? onameMatch[1].trim() : cleanQuery;

        return {
          provenance: {
            source: 'SIMBAD / CDS Sesame Name Resolver (Strasbourg Astronomical Data Center)',
            endpoint: SESAME_URL,
            status: 'live-simbad-resolution',
            timestamp: new Date().toISOString()
          },
          id: cleanQuery.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          name: resolvedName,
          aliases: [cleanQuery],
          type: otypeMatch ? otypeMatch[1].trim() : 'Astronomical Source',
          subType: 'SIMBAD Cataloged Object',
          spectralType: spTypeMatch ? spTypeMatch[1].trim() : 'Unknown',
          raDeg,
          decDeg,
          raSexagesimal: degToRaSexagesimal(raDeg),
          decSexagesimal: degToDecSexagesimal(decDeg),
          scienceDescription: `Resolved celestial object retrieved from SIMBAD database at CDS Strasbourg.`,
          spherexContext: {
            qrRelease: 'QR2',
            observedBandpasses: ['SPHEREx-D1', 'SPHEREx-D2', 'SPHEREx-D3', 'SPHEREx-D4', 'SPHEREx-D5', 'SPHEREx-D6'],
            surveyCadence: '6-month all-sky scan'
          }
        };
      }
    }
  } catch (err) {
    console.warn(`[SIMBAD Service] Sesame lookup failed (${err.message}) for query: ${cleanQuery}`);
  }

  // 4. Fallback search against partial match in authoritative database
  const partialMatch = AUTHORITATIVE_TARGETS.find(t => 
    t.name.toLowerCase().includes(cleanQuery.toLowerCase()) ||
    cleanQuery.toLowerCase().includes(t.name.toLowerCase())
  );

  if (partialMatch) {
    return {
      provenance: {
        source: 'NASA SPHEREx Authoritative Target Catalog (Fuzzy Match)',
        status: 'authoritative-target-fuzzy',
        timestamp: new Date().toISOString()
      },
      ...partialMatch
    };
  }

  throw new Error(`Could not resolve astronomical object '${cleanQuery}'. Please verify spelling or provide RA and Dec coordinates.`);
}

