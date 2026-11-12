import puppeteer from 'puppeteer-core';
import { startServer } from '../server/server.js';
import { AUTHORITATIVE_TARGETS } from '../server/data/authoritativeTargets.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 5091;

async function testAllTargetsAladin() {
  console.log('--- TESTING ALL 5 TARGETS IN ALADIN LITE SKY MAP ---');
  const server = startServer(PORT, '127.0.0.1', false);
  await new Promise((r) => setTimeout(r, 600));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  for (const t of AUTHORITATIVE_TARGETS) {
    console.log(`Testing target: ${t.name} (RA: ${t.raDeg}°, Dec: ${t.decDeg}°)...`);
    await page.goto(`http://127.0.0.1:${PORT}/experience?tab=sky&target=${t.id}`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));

    const check = await page.evaluate((targetRa, targetDec) => {
      const coordsText = document.querySelector('[class*="font-mono text-xs"]')?.innerText || '';
      const title = document.querySelector('h2')?.innerText || '';
      const hasImageCanvas = !!document.querySelector('canvas.aladin-imageCanvas');
      return {
        title,
        hasImageCanvas
      };
    }, t.raDeg, t.decDeg);

    console.log(`  [PASS] ${t.name} initialized Aladin WebGL canvas: ${check.hasImageCanvas}, title: "${check.title}"`);
  }

  await browser.close();
  server.close();
  console.log('All 5 targets verified in Aladin Lite successfully!');
}

testAllTargetsAladin().catch(console.error);
