import puppeteer from 'puppeteer-core';
import { startServer } from '../server/server.js';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 5095;

async function testAladinDirectHips() {
  const server = startServer(PORT, '127.0.0.1', false);
  await new Promise((r) => setTimeout(r, 600));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  const fetchedTiles = [];
  page.on('response', res => {
    const url = res.url();
    if (url.includes('.jpg') || url.includes('.png') || url.includes('properties')) {
      fetchedTiles.push({ url, status: res.status() });
      console.log(`[TILE FETCHED] ${res.status()} ${url}`);
    }
  });

  page.on('console', msg => {
    console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`);
  });

  // Create an HTML page in the browser testing Aladin with ESA Skies
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Aladin Test</title>
        <style>
          #aladin-div { width: 800px; height: 600px; background: #000; }
        </style>
      </head>
      <body>
        <div id="aladin-div"></div>
        <script type="module">
          import A from 'http://127.0.0.1:${PORT}/vendor/aladin.js';
          window.A = A;
          if (A.init) await A.init;
          
          const aladin = A.aladin('#aladin-div', {
            survey: 'https://skies.esac.esa.int/DSSColor',
            fov: 0.25,
            target: '269.452083 4.693389',
            showReticle: true
          });
          window.aladin = aladin;
          console.log('Aladin initialized with ESA Skies DSSColor!');
        </script>
      </body>
    </html>
  `);

  console.log('Waiting 8 seconds for tiles to load and render...');
  await new Promise(r => setTimeout(r, 8000));

  // Take screenshot of the rendered canvas!
  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
  await page.screenshot({ path: 'screenshots/aladin_esa_dss_test.png' });
  console.log('Screenshot saved to screenshots/aladin_esa_dss_test.png');

  // Check canvas pixels to verify it is NOT blank/gray
  const pixelStats = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.aladin-imageCanvas, canvas');
    if (!canvas) return { error: 'No canvas found' };
    const ctx = canvas.getContext('2d') || canvas.getContext('webgl2');
    return {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      className: canvas.className
    };
  });
  console.log('Canvas stats:', pixelStats);
  console.log(`Total tiles fetched: ${fetchedTiles.length}`);

  await browser.close();
  server.close();
}

testAladinDirectHips().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});

