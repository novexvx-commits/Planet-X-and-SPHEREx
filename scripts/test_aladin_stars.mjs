import puppeteer from 'puppeteer-core';
import { startServer } from '../server/server.js';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 5097;

async function testAladinRendersStars() {
  console.log('Testing Aladin Lite with ESA Skies HiPS...');
  const server = startServer(PORT, '127.0.0.1', false);
  await new Promise((r) => setTimeout(r, 600));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  const tileEvents = [];
  page.on('response', res => {
    const url = res.url();
    if (url.includes('.jpg') || url.includes('.png') || url.includes('properties')) {
      tileEvents.push({ status: res.status(), url });
      console.log(`[NET ${res.status()}] ${url.slice(0, 100)}`);
    }
  });

  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
  });

  // Navigate to experience page
  await page.goto(`http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  // Change survey to ESA Skies DSSColor via React state or direct Aladin call
  const changeResult = await page.evaluate(async () => {
    const A = window.A;
    if (!A) return { error: 'No A' };
    
    // Find canvas
    const canvas = document.querySelector('canvas.aladin-imageCanvas');
    if (!canvas) return { error: 'No canvas.aladin-imageCanvas' };

    // Let's create an aladin instance or use the existing one
    // Let's check if window.__marsadAladin or similar exists, or call setImageSurvey
    return {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    };
  });
  console.log('DOM check:', changeResult);

  await browser.close();
  server.close();
}

testAladinRendersStars().catch(console.error);
