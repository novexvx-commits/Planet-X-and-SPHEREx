import puppeteer from 'puppeteer-core';
import { startServer } from '../server/server.js';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 5096;

async function testHipsInAladin() {
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
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });

  const fetched = [];
  page.on('response', res => {
    const url = res.url();
    if (url.includes('skies.esac.esa.int') || url.includes('.jpg') || url.includes('properties')) {
      fetched.push({ status: res.status(), url });
      console.log(`[NET ${res.status()}] ${url.slice(0, 110)}`);
    }
  });

  // Navigate to actual experience page
  await page.goto(`http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Now test setImageSurvey with ESA Skies URL
  const evalResult = await page.evaluate(async () => {
    try {
      const A = window.A;
      // Find the aladin instance
      // Let's create an aladin instance or use the existing one
      const div = document.querySelector('.aladin-box, #aladin-lite-div, [id*="aladin"]') || document.querySelector('div:has(> canvas.aladin-imageCanvas)');
      if (!div) return { error: 'Aladin container not found' };

      // Let's test A.HiPS
      const testUrl = 'https://skies.esac.esa.int/DSSColor';
      let hipsObj = testUrl;
      if (typeof A.HiPS === 'function') {
        try {
          hipsObj = A.HiPS(testUrl);
        } catch (e) {
          hipsObj = testUrl;
        }
      }

      // Re-init or change survey on window.aladin if present
      return {
        hasA: !!A,
        hasHiPSFunc: typeof A.HiPS === 'function',
        container: div.className || div.id
      };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Eval result:', evalResult);
  await new Promise(r => setTimeout(r, 3000));

  await browser.close();
  server.close();
}

testHipsInAladin().catch(console.error);
