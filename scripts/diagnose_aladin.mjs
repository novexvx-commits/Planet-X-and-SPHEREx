import puppeteer from 'puppeteer-core';
import { startServer } from '../server/server.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function diagnoseAladin() {
  const PORT = 5066;
  const server = startServer(PORT, '127.0.0.1', false);
  await new Promise((r) => setTimeout(r, 600));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--window-size=1600,1050'
    ]
  });

  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.message}`));

  await page.goto(`http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 3000));

  const inspection = await page.evaluate(() => {
    const container = document.querySelector('#aladin-lite-div');
    const canvas = container ? container.querySelector('canvas') : null;
    const gl = canvas ? (canvas.getContext('webgl2') || canvas.getContext('webgl')) : null;
    return {
      hasWindowA: typeof window.A !== 'undefined',
      containerHtml: container ? container.innerHTML.slice(0, 500) : null,
      canvasExists: !!canvas,
      canvasWidth: canvas ? canvas.width : 0,
      canvasHeight: canvas ? canvas.height : 0,
      canvasClientWidth: canvas ? canvas.clientWidth : 0,
      canvasClientHeight: canvas ? canvas.clientHeight : 0,
      hasGL: !!gl,
      glVendor: gl ? gl.getParameter(gl.VENDOR) : null,
      glRenderer: gl ? gl.getParameter(gl.RENDERER) : null,
      bodyTextSnippet: document.body.innerText.slice(0, 600)
    };
  });

  console.log('=== ALADIN INSPECTION ===');
  console.log(JSON.stringify(inspection, null, 2));
  console.log('=== BROWSER LOGS (last 20) ===');
  console.log(logs.slice(-20).join('\n'));

  await browser.close();
  server.close();
  process.exit(0);
}

diagnoseAladin();

