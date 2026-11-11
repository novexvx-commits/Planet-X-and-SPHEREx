import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targets = [
  { id: "barnards-star", name: "Barnard's Star", ra: 269.45208, dec: 4.69333 },
  { id: "epsilon-indi-b", name: "Epsilon Indi B", ra: 331.04375, dec: -56.78278 },
  { id: "wise-0855", name: "WISE 0855", ra: 133.79513, dec: -7.24515 },
  { id: "rw-aurigae", name: "RW Aurigae", ra: 76.95642, dec: 30.40142 },
  { id: "r-draconis", name: "R Draconis", ra: 248.16750, dec: 66.75500 }
];

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

async function buildCache() {
  const cache = {};
  for (const t of targets) {
    console.log(`Fetching IRSA observations for ${t.name}...`);
    const url = `https://irsa.ipac.caltech.edu/SIA?COLLECTION=spherex_qr2&POS=circle+${t.ra}+${t.dec}+0.25&RESPONSEFORMAT=CSV`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const records = parseCsv(text);
      
      // Sort chronologically by MJD
      records.sort((a, b) => (parseFloat(a.t_min) || 0) - (parseFloat(b.t_min) || 0));

      // Sample up to 80 observations across the entire survey baseline
      let selected = [];
      if (records.length <= 80) {
        selected = records;
      } else {
        // Take even distribution across full timeline to capture all 6-month survey passes
        const step = records.length / 80;
        for (let i = 0; i < 80; i++) {
          selected.push(records[Math.floor(i * step)]);
        }
      }

      console.log(`  -> Selected ${selected.length} records (MJD ${selected[0].t_min} to ${selected[selected.length - 1].t_min})`);
      cache[t.id] = {
        targetId: t.id,
        targetName: t.name,
        ra: t.ra,
        dec: t.dec,
        count: records.length,
        retrievedAt: new Date().toISOString(),
        observations: selected
      };
    } catch(e) {
      console.error(`  -> Failed for ${t.name}:`, e.message);
    }
  }

  const outPath = path.resolve(__dirname, 'server/data/cachedObservations.js');
  const fileContent = `/**
 * Pre-cached Authoritative SPHEREx QR2 Observations from NASA/IPAC IRSA
 * Retrieved directly from IRSA SIAv2 service.
 */
export const CACHED_SPHEREX_OBSERVATIONS = ${JSON.stringify(cache, null, 2)};
`;
  fs.writeFileSync(outPath, fileContent, 'utf-8');
  console.log(`Wrote cached observations to ${outPath}`);
}

buildCache();
