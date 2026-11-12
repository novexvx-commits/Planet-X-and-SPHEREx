import puppeteer from 'puppeteer-core';
import { startServer } from '../server/server.js';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 5099;

async function verifyAllSurveys() {
  console.log('--- STARTING ALL-SURVEYS ALADIN REAL HIPS AUDIT ---');
  const server = startServer(PORT, '127.0.0.1', false);
  await new Promise((r) => setTimeout(r, 600));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  const allRequests = [];
  page.on('request', req => {
    allRequests.push(req.url());
  });

  page.on('response', res => {
    const url = res.url();
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${url.slice(0, 100)}`);
    }
  });

  console.log(`Navigating to http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star...`);
  await page.goto(`http://127.0.0.1:${PORT}/experience?tab=sky&target=barnards-star`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 5000));

  // Screenshot initial DSS2 survey
  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
  await page.screenshot({ path: 'screenshots/aladin_survey_1_dss2.png' });
  console.log('Saved screenshots/aladin_survey_1_dss2.png');

  // Switch to 2MASS
  console.log('Switching to 2MASS Near-IR survey...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn2mass = buttons.find(b => b.innerText.trim() === '2MASS');
    if (btn2mass) btn2mass.click();
  });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'screenshots/aladin_survey_2_2mass.png' });
  console.log('Saved screenshots/aladin_survey_2_2mass.png');

  // Switch to AllWISE
  console.log('Switching to AllWISE Mid-IR survey...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btnWise = buttons.find(b => b.innerText.trim() === 'AllWISE');
    if (btnWise) btnWise.click();
  });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'screenshots/aladin_survey_3_allwise.png' });
  console.log('Saved screenshots/aladin_survey_3_allwise.png');

  // Switch to Pan-STARRS / SDSS
  console.log('Switching to Pan-STARRS survey...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btnPan = buttons.find(b => b.innerText.trim() === 'Pan-STARRS');
    if (btnPan) btnPan.click();
  });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'screenshots/aladin_survey_4_panstarrs.png' });
  console.log('Saved screenshots/aladin_survey_4_panstarrs.png');

  // Filter requests
  const skiesRequests = allRequests.filter(u => u.includes('skies.esac.esa.int'));
  console.log(`\nTotal requests to ESA Skies HiPS server: ${skiesRequests.length}`);
  skiesRequests.slice(0, 15).forEach(u => console.log(' ->', u));

  await browser.close();
  server.close();
}

verifyAllSurveys().catch(console.error);
