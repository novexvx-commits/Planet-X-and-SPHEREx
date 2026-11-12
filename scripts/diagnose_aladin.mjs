import puppeteer from 'puppeteer-core';
import { startServer } from '../server/server.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function diagnoseAladin() {
  const PORT = 5070;
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
  const failedRequests = [];
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), error: req.failure()?.errorText });
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  });

  await page.goto(`http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 3500));

  console.log('=== FAILED / 404 REQUESTS ===');
  console.log(JSON.stringify(failedRequests, null, 2));

  await browser.close();
  server.close();
  process.exit(0);
}

diagnoseAladin();
