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
  console.log('🌌 Starting Isolated Experience Page & Homepage Verification...');
  const PORT = 5056;
  const server = startServer(PORT, '127.0.0.1', false);

  await new Promise((r) => setTimeout(r, 600));

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

    page.on('console', (msg) => {
      // ignore normal external logs
    });

    // ── STEP 1: Verify Homepage (/)
    console.log('\n--- 1. Testing Route: / (Homepage) ---');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

    // Assert SpherexHub is REMOVED from the homepage!
    const hubOnHome = await page.$('#spherex-hub');
    console.log(`✓ SpherexHub on homepage check: ${hubOnHome ? 'STILL PRESENT (ERROR)' : 'REMOVED (CORRECT)'}`);
    if (hubOnHome) {
      throw new Error('SpherexHub must NOT be on the homepage!');
    }

    // Verify "Try MARSAD" button exists
    const tryButtons = await page.$$('button[aria-label="Try MARSAD"]');
    console.log(`✓ Found ${tryButtons.length} "Try MARSAD" button(s) on Homepage`);
    if (tryButtons.length === 0) {
      throw new Error('Try MARSAD button not found on Homepage!');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_homepage_clean_no_hub.png') });
    console.log('✓ Captured 01_homepage_clean_no_hub.png');

    // ── STEP 2: Click "Try MARSAD" to navigate to /experience
    console.log('\n--- 2. Clicking "Try MARSAD" Button ---');
    await tryButtons[0].click();
    await new Promise((r) => setTimeout(r, 1000));

    const currentUrl = page.url();
    console.log(`✓ Current URL after click: ${currentUrl}`);
    if (!currentUrl.includes('/experience')) {
      throw new Error(`Expected URL to contain /experience, got: ${currentUrl}`);
    }

    // ── STEP 3: Verify /experience is ISOLATED, has NO NAVBAR, ONLY "Back to Home" button
    console.log('\n--- 3. Verifying /experience Isolated Page (NO NAVBAR, ONLY BACK BUTTON) ---');
    const navbarOnExperience = await page.$('.site-header');
    console.log(`✓ Navbar on /experience check: ${navbarOnExperience ? 'STILL PRESENT (ERROR)' : 'NO NAVBAR (CORRECT)'}`);
    if (navbarOnExperience) {
      throw new Error('Navbar must NOT exist on /experience!');
    }

    const backButton = await page.$('button[aria-label="Back to Home"]');
    console.log(`✓ "Back to Home" button check: ${backButton ? 'PRESENT (CORRECT)' : 'MISSING (ERROR)'}`);
    if (!backButton) {
      throw new Error('Back to Home button must exist on /experience!');
    }

    const hubOnExperience = await page.$('#spherex-hub');
    console.log(`✓ SpherexHub on /experience check: ${hubOnExperience ? 'PRESENT & ACTIVE (CORRECT)' : 'MISSING (ERROR)'}`);
    if (!hubOnExperience) {
      throw new Error('SpherexHub must exist on /experience!');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_experience_isolated_page.png') });
    console.log('✓ Captured 02_experience_isolated_page.png');

    // ── STEP 4: Test All 5 Targets & All 7 Tabs on /experience
    console.log('\n--- 4. Testing All 5 Targets & 7 Tabs on /experience ---');
    const targets = ['barnards-star', 'epsilon-indi-b', 'wise-0855', 'rw-aurigae', 'r-draconis'];
    for (const tId of targets) {
      const btn = await page.$(`button[data-target-id="${tId}"]`);
      if (btn) {
        await btn.click();
        await new Promise((r) => setTimeout(r, 200));
        console.log(`  ✓ Target '${tId}' selected`);
      }
    }

    const tabs = ['sky', 'timeline', 'motion', 'variable', 'spectra', 'most', 'provenance'];
    for (const tab of tabs) {
      const tabBtn = await page.$(`button[data-tab="${tab}"]`);
      if (tabBtn) {
        await tabBtn.click();
        await new Promise((r) => setTimeout(r, 200));
        console.log(`  ✓ Tab '${tab}' activated`);
      }
    }

    // ── STEP 5: Click "Back to Home" to return to /
    console.log('\n--- 5. Clicking "Back to Home" Button ---');
    await backButton.click();
    await new Promise((r) => setTimeout(r, 1000));

    const returnedUrl = page.url();
    console.log(`✓ Current URL after clicking back: ${returnedUrl}`);
    const pathname = new URL(returnedUrl).pathname;
    if (pathname !== '/') {
      throw new Error(`Expected URL to be '/', got: ${pathname}`);
    }

    // ── STEP 6: Direct navigation / refresh on /experience
    console.log('\n--- 6. Direct Reload of /experience ---');
    await page.goto(`http://localhost:${PORT}/experience`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    const reloadedHub = await page.$('#spherex-hub');
    const reloadedNavbar = await page.$('.site-header');
    const reloadedBackBtn = await page.$('button[aria-label="Back to Home"]');

    if (!reloadedHub || reloadedNavbar || !reloadedBackBtn) {
      throw new Error('Direct reload verification failed on /experience!');
    }
    console.log('✓ Direct reload of /experience verified: Hub active, No Navbar, Back button ready');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_experience_direct_reload.png') });
    console.log('✓ Captured 03_experience_direct_reload.png');

    console.log('\n======================================================');
    console.log('ALL VERIFICATIONS PASSED: 100% ISOLATED EXPERIENCE PAGE!');
    console.log('======================================================');

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
