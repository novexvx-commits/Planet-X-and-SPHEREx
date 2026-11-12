import puppeteer from 'puppeteer-core';
import { startServer } from '../server/server.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 5092;

async function debugAladin() {
  console.log('--- STARTING ALADIN LITE NETWORK & CONSOLE AUDIT ---');
  const server = startServer(PORT, '127.0.0.1', false);
  await new Promise((r) => setTimeout(r, 600));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle']
  });

  const page = await browser.newPage();
  const consoleMessages = [];
  const networkRequests = [];
  const failedRequests = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    console.log(`[Browser ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[Browser PageError]`, err.message);
  });

  page.on('request', req => {
    const url = req.url();
    networkRequests.push({ url, method: req.method() });
  });

  page.on('requestfailed', req => {
    failedRequests.push({
      url: req.url(),
      failure: req.failure()?.errorText
    });
    console.log(`[Request FAILED] ${req.url()} - ${req.failure()?.errorText}`);
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('cds') || url.includes('unistra') || url.includes('2MASS') || url.includes('properties') || url.includes('Allsky') || url.includes('Norder') || url.includes('hips')) {
      console.log(`[HiPS Response] ${res.status()} ${url}`);
      try {
        if (url.endsWith('properties')) {
          const text = await res.text();
          console.log(`[HiPS Properties Content]:\n${text.slice(0, 200)}...`);
        }
      } catch (e) {
        console.log(`[HiPS Error reading text]: ${e.message}`);
      }
    } else if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${url}`);
    }
  });

  console.log(`Navigating to http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star...`);
  await page.goto(`http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star`, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait 7 seconds for HiPS tiles to load or fail
  console.log('Waiting 7 seconds to observe HiPS tiles...');
  await new Promise(r => setTimeout(r, 7000));

  await page.screenshot({ path: 'screenshots/debug_sky_map.png' });

  // Inspect Aladin state in page
  const aladinState = await page.evaluate(() => {
    const container = document.querySelector('.aladin-container, #aladin-lite-div, [class*="aladin"]');
    const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
      width: c.width,
      height: c.height,
      className: c.className
    }));
    const webglSupport = !!window.WebGL2RenderingContext;
    let webglCtx = null;
    try {
      const testCanvas = document.createElement('canvas');
      webglCtx = !!testCanvas.getContext('webgl2');
    } catch (e) {
      webglCtx = false;
    }

    return {
      hasA: typeof window.A !== 'undefined',
      containerFound: !!container,
      canvases,
      webglSupport,
      webglCtx,
      bodyTextSnippet: document.body.innerText.slice(0, 500)
    };
  });

  console.log('\n--- ALADIN BROWSER STATE ---');
  console.log(JSON.stringify(aladinState, null, 2));

  console.log('\n--- NETWORK REQUEST SUMMARY ---');
  console.log(`Total requests: ${networkRequests.length}`);
  const hipsRequests = networkRequests.filter(r => r.url.includes('cds') || r.url.includes('hips') || r.url.includes('alasky') || r.url.includes('2MASS') || r.url.includes('DSS'));
  console.log(`HiPS / CDS requests: ${hipsRequests.length}`);
  hipsRequests.forEach(r => console.log(' ->', r.method, r.url));

  console.log('\n--- FAILED REQUESTS ---');
  console.log(`Total failed: ${failedRequests.length}`);
  failedRequests.forEach(r => console.log(' -> FAILED:', r.url, r.failure));

  await browser.close();
  server.close();
  console.log('\nAudit complete.');
}

debugAladin().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
