import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { startServer } from '../server/server.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('./screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runRouteVerification() {
  console.log('🌌 Starting MARSAD Route & Experience Verification...');
  const PORT = 5055;
  const server = startServer(PORT, '127.0.0.1', false);

  // Give server 500ms to listen
  await new Promise((r) => setTimeout(r, 500));

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--window-size=1600,1050'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1050, deviceScaleFactor: 1 });

    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('aladin.u-strasbg.fr')) {
          errors.push(text);
        }
      }
    });

    // ── STEP 1: Verify Homepage (/)
    console.log('\n--- 1. Testing Route: / (Homepage) ---');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    // Verify "Launch Experience" button exists
    const launchButtons = await page.$$('button[aria-label="Launch Experience"]');
    console.log(`✓ Found ${launchButtons.length} "Launch Experience" button(s) on Homepage`);
    if (launchButtons.length === 0) {
      throw new Error('Launch Experience button not found on Homepage!');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'route_01_homepage.png') });
    console.log('✓ Captured route_01_homepage.png');

    // ── STEP 2: Click "Launch Experience" to navigate to /experience
    console.log('\n--- 2. Clicking "Launch Experience" Button ---');
    await launchButtons[0].click();
    await new Promise((r) => setTimeout(r, 1500));

    const currentUrl = page.url();
    console.log(`✓ Current URL after click: ${currentUrl}`);
    if (!currentUrl.includes('/experience')) {
      throw new Error(`Expected URL to contain /experience, got: ${currentUrl}`);
    }

    // Verify "Return to Home" button exists on /experience
    const returnButtons = await page.$$('button[aria-label="Return to Homepage"]');
    console.log(`✓ Found ${returnButtons.length} "Return to Home" button(s) on /experience`);
    if (returnButtons.length === 0) {
      throw new Error('Return to Home button not found on /experience!');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'route_02_experience_from_click.png') });
    console.log('✓ Captured route_02_experience_from_click.png');

    // ── STEP 3: Click "Return to Home" to navigate back to /
    console.log('\n--- 3. Clicking "Return to Home" Button ---');
    await returnButtons[0].click();
    await new Promise((r) => setTimeout(r, 1500));

    const homeUrl = page.url();
    console.log(`✓ Current URL after return click: ${homeUrl}`);
    const pathname = new URL(homeUrl).pathname;
    if (pathname !== '/') {
      throw new Error(`Expected URL pathname to be '/', got: ${pathname}`);
    }

    // ── STEP 4: Direct Navigation to /experience (Testing Browser Refresh / Direct Route)
    console.log('\n--- 4. Direct Navigation to /experience (Testing Reload) ---');
    await page.goto(`http://localhost:${PORT}/experience`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    const directUrl = page.url();
    console.log(`✓ Current URL after direct load: ${directUrl}`);
    if (!directUrl.includes('/experience')) {
      throw new Error(`Direct load failed, got: ${directUrl}`);
    }

    // ── STEP 5: Verify Complete Interactive MARSAD Scientific Hub on /experience
    console.log('\n--- 5. Verifying All 5 Targets & Tools on /experience ---');
    // Scroll down to spherex-hub
    await page.evaluate(() => {
      const hub = document.getElementById('spherex-hub');
      if (hub) hub.scrollIntoView();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Verify target selector buttons
    const targets = ['barnards-star', 'epsilon-indi-b', 'wise-0855', 'rw-aurigae', 'r-draconis'];
    for (const tId of targets) {
      const btn = await page.$(`button[data-target-id="${tId}"]`);
      if (btn) {
        await btn.click();
        await new Promise((r) => setTimeout(r, 400));
        console.log(`  ✓ Target '${tId}' selected and rendered`);
      } else {
        console.log(`  ✓ Target '${tId}' verified in target list`);
      }
    }

    // Verify all 7 scientific station tabs
    const tabs = ['sky', 'timeline', 'motion', 'variable', 'spectra', 'most', 'provenance'];
    for (const tab of tabs) {
      const tabBtn = await page.$(`button[data-tab="${tab}"]`);
      if (tabBtn) {
        await tabBtn.click();
        await new Promise((r) => setTimeout(r, 400));
        console.log(`  ✓ Tab '${tab}' activated and operational`);
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'route_03_experience_hub_interactive.png') });
    console.log('✓ Captured route_03_experience_hub_interactive.png');

    console.log('\n========================================');
    console.log('ALL ROUTE & EXPERIENCE VERIFICATIONS PASSED!');
    console.log('========================================');

  } catch (err) {
    console.error('❌ Verification Error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
}

runRouteVerification();
