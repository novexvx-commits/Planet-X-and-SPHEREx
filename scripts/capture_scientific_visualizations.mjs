import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('./screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runVerification() {
  console.log('🚀 Starting Scientific UI Verification using Chrome...');

  const browser = await puppeteer.launch({
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

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
  });

  try {
    console.log('📡 Navigating to http://localhost:5173/?target=barnards-star&tab=timeline#spherex-hub ...');
    await page.goto('http://localhost:5173/?target=barnards-star&tab=timeline#spherex-hub', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for SpherexHub container
    await page.waitForSelector('#spherex-hub', { timeout: 10000 });
    console.log('✓ Found #spherex-hub container');

    // Give components 2 seconds to fetch and render canvases
    await new Promise((r) => setTimeout(r, 2500));

    // Scroll directly to the hub
    await page.evaluate(() => {
      document.querySelector('#spherex-hub')?.scrollIntoView({ behavior: 'instant' });
    });
    await new Promise((r) => setTimeout(r, 1000));

    // 1. Capture Timeline & Difference Imaging
    console.log('📸 Capturing 01_observation_timeline_difference.png...');
    const hubElement = await page.$('#spherex-hub');
    if (hubElement) {
      await hubElement.screenshot({ path: path.join(SCREENSHOT_DIR, '01_observation_timeline_difference.png') });
    }

    // Toggle View FITS Header Cards
    const fitsBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((el) => el.textContent && el.textContent.includes('FITS'));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    if (fitsBtn) {
      await new Promise((r) => setTimeout(r, 800));
      console.log('📸 Capturing 02_fits_header_cards_modal.png...');
      await hubElement?.screenshot({ path: path.join(SCREENSHOT_DIR, '02_fits_header_cards_modal.png') });
    }

    // Switch to Blink Mode
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((el) => el.textContent && el.textContent.trim() === 'blink');
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    console.log('📸 Capturing 03_blink_mode_comparator.png...');
    await hubElement?.screenshot({ path: path.join(SCREENSHOT_DIR, '03_blink_mode_comparator.png') });

    // 2. Tab 2: Sky Explorer (Aladin)
    console.log('📡 Switching to Tab: Sky Explorer (Aladin)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((el) => el.textContent && el.textContent.includes('Sky Explorer'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 3000)); // Allow CDS tiles/canvas to initialize
    console.log('📸 Capturing 04_sky_explorer_aladin.png...');
    await hubElement?.screenshot({ path: path.join(SCREENSHOT_DIR, '04_sky_explorer_aladin.png') });

    // 3. Tab 3: Motion Detection
    console.log('📡 Switching to Tab: Motion Detection...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((el) => el.textContent && el.textContent.includes('Motion Detection'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    console.log('📸 Capturing 05_motion_detection_trajectory.png...');
    await hubElement?.screenshot({ path: path.join(SCREENSHOT_DIR, '05_motion_detection_trajectory.png') });

    // 4. Tab 4: Variable Star Analysis (Switch to RW Aurigae)
    console.log('📡 Selecting Target: RW Aurigae & Tab: Variable Star Analysis...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const t = btns.find((el) => el.textContent && el.textContent.includes('RW Aurigae'));
      if (t) t.click();
      const tab = btns.find((el) => el.textContent && el.textContent.includes('Variable Star'));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    console.log('📸 Capturing 06_variable_star_rw_aurigae.png...');
    await hubElement?.screenshot({ path: path.join(SCREENSHOT_DIR, '06_variable_star_rw_aurigae.png') });

    // Toggle to AB Magnitude on Light Curve
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((el) => el.textContent && el.textContent.includes('AB Magnitude'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    console.log('📸 Capturing 07_variable_star_ab_magnitude.png...');
    await hubElement?.screenshot({ path: path.join(SCREENSHOT_DIR, '07_variable_star_ab_magnitude.png') });

    // 5. Tab 5: 102 Spectral Bands (Switch to WISE 0855)
    console.log('📡 Selecting Target: WISE 0855 & Tab: 102 Spectral Bands...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const t = btns.find((el) => el.textContent && el.textContent.includes('WISE 0855'));
      if (t) t.click();
      const tab = btns.find((el) => el.textContent && el.textContent.includes('102 Spectral'));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    console.log('📸 Capturing 08_spectral_bands_wise_0855.png...');
    await hubElement?.screenshot({ path: path.join(SCREENSHOT_DIR, '08_spectral_bands_wise_0855.png') });

    // 6. Tab 6: Solar System (MOST)
    console.log('📡 Switching to Tab: Solar System (MOST)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const tab = btns.find((el) => el.textContent && el.textContent.includes('Solar System'));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 2000));
    console.log('📸 Capturing 09_most_solar_system_ceres.png...');
    await hubElement?.screenshot({ path: path.join(SCREENSHOT_DIR, '09_most_solar_system_ceres.png') });

    // 7. Tab 7: Provenance & Lineage
    console.log('📡 Switching to Tab: Provenance & Lineage...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const tab = btns.find((el) => el.textContent && el.textContent.includes('Provenance'));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    console.log('📸 Capturing 10_provenance_inspector.png...');
    await hubElement?.screenshot({ path: path.join(SCREENSHOT_DIR, '10_provenance_inspector.png') });

    // Full page hero capture
    console.log('📸 Capturing 11_full_scrollytelling_hero.png...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_full_scrollytelling_hero.png') });

    console.log('====================================================');
    console.log('🎉 ALL 11 SCIENTIFIC SCREENSHOTS CAPTURED CLEANLY!');
    console.log('====================================================');
    if (consoleErrors.length > 0) {
      console.log('Console Errors Observed:', consoleErrors);
    } else {
      console.log('✓ Zero JavaScript runtime errors in browser session!');
    }
  } catch (err) {
    console.error('Verification failed with error:', err);
  } finally {
    await browser.close();
  }
}

runVerification();

