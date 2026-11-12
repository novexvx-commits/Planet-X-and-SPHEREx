import puppeteer from 'puppeteer-core';
import { startServer } from '../server/server.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 5093;

async function testAladinWithEsaSkies() {
  const server = startServer(PORT, '127.0.0.1', false);
  await new Promise((r) => setTimeout(r, 600));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('HiPS') || msg.text().includes('Aladin')) {
      console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    }
  });

  const tileRequests = [];
  page.on('response', res => {
    const url = res.url();
    if (url.includes('skies.esac.esa.int') || url.includes('.jpg') || url.includes('.png')) {
      tileRequests.push({ url, status: res.status() });
      console.log(`[TILE RESPONSE ${res.status()}] ${url.slice(0, 100)}`);
    }
  });

  await page.goto(`http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // Change survey to ESA skies directly via page evaluate
  const result = await page.evaluate(async () => {
    try {
      const A = window.A;
      if (!A) return { error: 'window.A not found' };

      // Find aladin instance or create survey
      const hipsUrl = 'https://skies.esac.esa.int/DSSColor/';
      const dssHips = A.HiPS ? A.HiPS(hipsUrl) : hipsUrl;
      
      // Look for the aladin instance
      // In AladinSkyExplorer, aladinInstanceRef is in React, but let's check window or element
      const aladinDiv = document.querySelector('.aladin-container, #aladin-lite-div, [class*="aladin-box"]');
      return {
        hasA: !!A,
        hasHiPS: typeof A.HiPS === 'function',
        aladinDiv: !!aladinDiv
      };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Page eval result:', result);

  await browser.close();
  server.close();
}

testAladinWithEsaSkies();
