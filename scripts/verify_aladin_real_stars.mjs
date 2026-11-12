import puppeteer from 'puppeteer-core';
import { startServer } from '../server/server.js';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 5098;

async function verifyAladinRealStars() {
  console.log('--- STARTING REAL ALADIN HIPS TILES VERIFICATION ---');
  const server = startServer(PORT, '127.0.0.1', false);
  await new Promise((r) => setTimeout(r, 600));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  const fetchedTiles = [];
  page.on('response', res => {
    const url = res.url();
    if (url.includes('.jpg') || url.includes('.png') || url.includes('properties')) {
      fetchedTiles.push({ status: res.status(), url });
      console.log(`[NET ${res.status()}] ${url.slice(0, 110)}`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('tile') || msg.text().includes('HiPS')) {
      console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
    }
  });

  console.log(`Navigating to http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star...`);
  await page.goto(`http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star`, { waitUntil: 'domcontentloaded' });

  // Wait 8 seconds for Aladin WebGL2 engine to fetch HiPS tiles and render
  console.log('Waiting 8 seconds for HiPS tiles to load and WebGL2 canvas to render...');
  await new Promise(r => setTimeout(r, 8000));

  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
  const screenshotPath = 'screenshots/04_sky_map_aladin_v3.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);

  // Inspect canvas element & rendering details
  const canvasDetails = await page.evaluate(() => {
    const imgCanvas = document.querySelector('canvas.aladin-imageCanvas');
    const catCanvas = document.querySelector('canvas.aladin-catalogCanvas');
    const container = document.querySelector('#aladin-lite-div');
    const loadingPill = document.querySelector('[class*="Loading"]');
    const notice = document.querySelector('[class*="INFO:"]');

    let isNonBlank = false;
    let nonZeroPixelCount = 0;
    if (imgCanvas) {
      try {
        // Read 2D context or WebGL pixels if readable
        const gl = imgCanvas.getContext('webgl2') || imgCanvas.getContext('webgl');
        if (gl) {
          const pixels = new Uint8Array(4 * 100);
          gl.readPixels(imgCanvas.width / 2 - 5, imgCanvas.height / 2 - 5, 10, 10, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          nonZeroPixelCount = pixels.filter(p => p > 0).length;
          isNonBlank = nonZeroPixelCount > 0;
        }
      } catch (e) {
        // WebGL readPixels may be cross-origin protected
      }
    }

    return {
      hasContainer: !!container,
      hasImgCanvas: !!imgCanvas,
      canvasDimensions: imgCanvas ? `${imgCanvas.width}x${imgCanvas.height}` : 'none',
      nonZeroPixelCount,
      loadingVisible: !!loadingPill,
      noticeText: notice?.innerText || null
    };
  });

  console.log('\n--- CANVAS DETAILS ---');
  console.log(JSON.stringify(canvasDetails, null, 2));
  console.log(`\nTotal HiPS tile/properties responses: ${fetchedTiles.length}`);
  fetchedTiles.slice(0, 10).forEach(t => console.log(' ->', t.status, t.url));

  await browser.close();
  server.close();
  console.log('Verification finished.');
}

verifyAladinRealStars().catch(console.error);

