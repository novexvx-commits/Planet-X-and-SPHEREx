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
  console.log('🌌 Starting Complete Scientific, UI/UX & Aladin WebGL2 Verification...');
  const PORT = 5058;
  const server = startServer(PORT, '127.0.0.1', false);

  await new Promise((r) => setTimeout(r, 600));

  let browser;
  const pageErrors = [];
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--use-gl=angle',
        '--disable-dev-shm-usage',
        '--window-size=1600,1050'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1050, deviceScaleFactor: 1 });

    page.on('pageerror', (err) => {
      const msg = (err?.message || '').trim();
      if (msg && msg !== 'Failed to fetch') {
        pageErrors.push(msg);
      }
    });

    // ── STEP 1: Verify Homepage (/) & Zero-Value / Scientific Specs Audit
    console.log('\n--- 1. Testing Route: / (Homepage & Scientific Specs Audit) ---');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1500));

    const homeText = await page.evaluate(() => document.body.innerText);

    const forbiddenPatterns = [
      { label: '0 Near-IR', re: /\b0\s+Near-IR/i },
      { label: '0.0 µm', re: /\b0\.0\s*µm/i },
      { label: '0 mo', re: /\b0\s+mo\b/i },
      { label: '0.0″', re: /\b0\.0″/ },
      { label: '0 Bands', re: /\b0\s+Bands\b/i },
      { label: '0 K', re: /\b0\s+K\b/ },
      { label: '80 K', re: /\b80\s+K\b/ },
      { label: '55 K', re: /\b55\s+K\b/ },
      { label: '0 cm', re: /\b0\s+cm\b/i },
      { label: '0M+', re: /\b0M\+/i },
      { label: '450M+', re: /\b450M\+/i },
      { label: '9.60 ly', re: /9\.60\s*ly/i },
      { label: '0.210c', re: /0\.210c/i },
      { label: 'T+ 71Y', re: /T\+\s*71Y/i }
    ];

    for (const pat of forbiddenPatterns) {
      if (pat.re.test(homeText)) {
        throw new Error(`Homepage still contains forbidden/unverified value: "${pat.label}"`);
      }
    }
    console.log('✓ Zero-value & fictional string audit passed on / (0 forbidden values found)');

    const requiredHomeStrings = [
      '102',
      '20',
      '3.5° × 11.3°',
      'October 2025',
      'September 2026',
      'November 2026'
    ];
    for (const reqStr of requiredHomeStrings) {
      if (!homeText.includes(reqStr)) {
        throw new Error(`Homepage missing required verified specification: "${reqStr}"`);
      }
    }
    console.log('✓ Verified NASA SPHEREx specifications & QR2/QR3/DR1 timeline milestones present on /');

    const tryButtons = await page.$$('button[aria-label="Try MARSAD"]');
    if (tryButtons.length === 0) {
      throw new Error('Try MARSAD button not found on Homepage!');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_homepage_verified.png') });

    // ── STEP 2: Click "Try MARSAD" to navigate to /experience
    console.log('\n--- 2. Clicking "Try MARSAD" Button -> /experience ---');
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Try MARSAD"]');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const currentUrl = page.url();
    if (!currentUrl.includes('/experience')) {
      throw new Error(`Expected URL to contain /experience, got: ${currentUrl}`);
    }
    console.log(`✓ Navigated to: ${currentUrl}`);

    // ── STEP 3: Test All 5 Targets Across All 7 Tabs (35 Combinations)
    console.log('\n--- 3. Verifying All 5 Targets × All 7 Tabs on /experience ---');
    const targets = [
      { id: 'barnards-star', name: "Barnard's Star", expectedSpec: 'M4.0V', distPc: '1.8282 pc', mjd1: '60902.9', mjd2: '61164.9', deltaDays: '262.0' },
      { id: 'epsilon-indi-b', name: 'Epsilon Indi B', expectedSpec: 'T1.5V + T6V', distPc: '3.6385 pc', mjd1: '60789.9', mjd2: '61164.1', deltaDays: '374.2' },
      { id: 'wise-0855', name: 'WISE 0855', expectedSpec: 'Y4', distPc: '2.278 pc', mjd1: '60800.7', mjd2: '61173.7', deltaDays: '373.0' },
      { id: 'rw-aurigae', name: 'RW Aurigae', expectedSpec: 'CTTS', distPc: '166.8 pc', mjd1: '60919.4', mjd2: '61109.4', deltaDays: '190.0' },
      { id: 'r-draconis', name: 'R Draconis', expectedSpec: 'M9EIII', distPc: '440.5 pc', mjd1: '60812.0', mjd2: '61236.2', deltaDays: '424.2' }
    ];

    for (const t of targets) {
      const btn = await page.$(`button[data-target-id="${t.id}"]`);
      if (!btn) throw new Error(`Target button ${t.id} missing`);
      await btn.click();
      await new Promise((r) => setTimeout(r, 250));

      // 3a. Timeline tab checks
      const tlBtn = await page.$('button[data-tab="timeline"]');
      await tlBtn.click();
      await new Promise((r) => setTimeout(r, 250));

      const expText = await page.evaluate(() => document.body.innerText);
      if (expText.includes('Scan #1 of 0') || /Scan #\d+ of 0/i.test(expText)) {
        throw new Error(`Target ${t.id} displays broken "Scan #1 of 0"!`);
      }
      if (!expText.toUpperCase().includes(t.expectedSpec.toUpperCase())) {
        throw new Error(`Target ${t.id} missing expected spectral type "${t.expectedSpec}"`);
      }
      if (!expText.includes(t.distPc)) {
        throw new Error(`Target ${t.id} Timeline dossier missing verified distance "${t.distPc}"`);
      }
      // Verify MJD1 -> MJD2 -> Δt = deltaDays (never 262.81 or 262.01)
      if (!expText.includes(t.mjd1) || !expText.includes(t.mjd2) || !expText.includes(t.deltaDays)) {
        throw new Error(`Target ${t.id} Timeline missing consistent MJD ${t.mjd1} -> ${t.mjd2} (Δt = ${t.deltaDays} days)!`);
      }
      if (expText.includes('262.81') || expText.includes('262.01')) {
        throw new Error(`Target ${t.id} Timeline still displays mismatched elapsed days (262.81 or 262.01)!`);
      }
      if (!expText.includes('MODEL / SIMULATION') || !expText.includes('REAL OBSERVATION') || !expText.includes('DERIVED FROM REAL DATA')) {
        throw new Error(`Target ${t.id} Timeline missing canonical scientific data classification badges!`);
      }
      if (t.id !== 'barnards-star' && expText.includes('M4.0V')) {
        throw new Error(`Target ${t.id} leaked Barnard's Star spectral type "M4.0V"!`);
      }
      if (t.id === 'epsilon-indi-b') {
        if (!expText.includes('Epsilon Indi Ba') || !expText.includes('Epsilon Indi Bb')) {
          throw new Error('Epsilon Indi B Timeline dossier missing resolved Ba (T1.5V) + Bb (T6V) components!');
        }
      }
      if (t.id === 'barnards-star') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_timeline_barnards_star.png') });
      }

      // 3b. Motion tab checks (Net Shift must be non-zero & canonical badges present)
      const motionBtn = await page.$('button[data-tab="motion"]');
      await motionBtn.click();
      await new Promise((r) => setTimeout(r, 250));
      const motionText = await page.evaluate(() => document.body.innerText);
      if (/Net Shift:\s*0″/.test(motionText)) {
        throw new Error(`Target ${t.id} Motion tab shows zero Net Shift!`);
      }
      if (!motionText.includes(t.distPc)) {
        throw new Error(`Target ${t.id} Motion tab missing distance "${t.distPc}"`);
      }
      if (!motionText.includes('DERIVED FROM REAL DATA') || !motionText.includes('REAL OBSERVATION')) {
        throw new Error(`Target ${t.id} Motion tab missing canonical badges!`);
      }
      if (t.id === 'barnards-star') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_motion_barnards_star.png') });
      }

      // 3c. Sky Map tab checks (Verify Real Aladin Lite v3 WebGL2 Initialization)
      const skyBtn = await page.$('button[data-tab="sky"]');
      await skyBtn.click();
      await new Promise((r) => setTimeout(r, t.id === 'barnards-star' ? 2200 : 500));
      const skyState = await page.evaluate(() => {
        const text = document.body.innerText;
        const canvas = document.querySelector('#aladin-lite-div canvas');
        return {
          text,
          hasAladinGlobal: typeof window.A === 'object' && typeof window.A.aladin === 'function',
          hasCanvas: !!canvas,
          canvasWidth: canvas ? canvas.clientWidth : 0,
          canvasHeight: canvas ? canvas.clientHeight : 0,
          isStuckLoading: text.includes('Loading Aladin Lite v3 WebGL2 HiPS Survey Imagery...')
        };
      });
      if (!skyState.text.includes(t.name) || !skyState.text.includes('SPHEREx Reticle') || !skyState.text.includes('Catalog Markers')) {
        throw new Error(`Target ${t.id} Sky Map missing controls or target header!`);
      }
      if (!skyState.hasAladinGlobal || !skyState.hasCanvas || skyState.canvasWidth === 0 || skyState.isStuckLoading) {
        throw new Error(
          `Target ${t.id} Aladin Lite v3 failed to initialize WebGL2 canvas (hasAladinGlobal=${skyState.hasAladinGlobal}, hasCanvas=${skyState.hasCanvas}, width=${skyState.canvasWidth}, stuckLoading=${skyState.isStuckLoading})`
        );
      }
      if (!skyState.text.includes('REAL OBSERVATION')) {
        throw new Error(`Target ${t.id} Sky Map did not reach REAL OBSERVATION state!`);
      }
      if (t.id === 'barnards-star') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_sky_map_aladin_v3.png') });
      }

      // 3d. Light Curve tab checks
      const lcBtn = await page.$('button[data-tab="variable"]');
      await lcBtn.click();
      await new Promise((r) => setTimeout(r, 250));
      const lcText = await page.evaluate(() => document.body.innerText);
      if (!lcText.includes('MODEL / SIMULATION') || !lcText.includes('REAL OBSERVATION') || !lcText.includes(`${t.deltaDays} days`)) {
        throw new Error(`Target ${t.id} Light Curve missing canonical badges or ${t.deltaDays} days baseline!`);
      }
      if (t.id === 'r-draconis') {
        if (!lcText.includes('245.6')) {
          throw new Error('R Draconis Light Curve missing verified 245.6-day period!');
        }
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_light_curve_r_draconis.png') });
      }

      // 3e. Spectra tab checks
      const specBtn = await page.$('button[data-tab="spectra"]');
      await specBtn.click();
      await new Promise((r) => setTimeout(r, 250));
      const specText = await page.evaluate(() => document.body.innerText);
      if (!specText.includes('102') || !specText.includes('µm') || !specText.includes('MODEL / SIMULATION') || !specText.includes('REAL OBSERVATION')) {
        throw new Error(`Target ${t.id} Spectra tab missing 102 channels, µm units, or canonical badges!`);
      }
      if (t.id === 'wise-0855') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_spectra_wise_0855.png') });
      }

      // 3f. Data Lineage (Provenance) tab checks (Must NOT contain "undefined" and must include all 4 canonical badges)
      const provBtn = await page.$('button[data-tab="provenance"]');
      await provBtn.click();
      await new Promise((r) => setTimeout(r, 250));
      const provText = await page.evaluate(() => document.body.innerText);
      if (provText.includes('undefined')) {
        throw new Error(`Target ${t.id} Data Lineage tab contains literal "undefined"!`);
      }
      for (const badge of ['REAL OBSERVATION', 'DERIVED FROM REAL DATA', 'MODEL / SIMULATION', 'UNAVAILABLE']) {
        if (!provText.includes(badge)) {
          throw new Error(`Target ${t.id} Data Lineage tab missing canonical badge "${badge}"!`);
        }
      }
      if (t.id === 'barnards-star') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_provenance_lineage.png') });
      }

      console.log(`  ✓ Target '${t.id}' verified across Timeline (262.0 d), Aladin v3 WebGL2 Sky Map, Motion, Light Curve, Spectra (µm), and Data Lineage`);
    }

    // ── STEP 4: Verify Asteroids (MOST) Tab Dynamic 2026 Ephemerides & Timestamp Separation
    console.log('\n--- 4. Testing Asteroids (MOST) Tab Dynamic 2026 Ephemerides & Provenance ---');
    const mostBtn = await page.$('button[data-tab="most"]');
    await mostBtn.click();
    await new Promise((r) => setTimeout(r, 400));
    const mostText = await page.evaluate(() => document.body.innerText);
    if (!mostText.includes('1 Ceres') || !mostText.includes('MPC #1') || mostText.includes('undefined')) {
      throw new Error('Asteroids tab failed initial synchronous render for 1 Ceres!');
    }
    if (!mostText.toUpperCase().includes('EPHEMERIS COMPUTATION WINDOW:') || !mostText.toUpperCase().includes('CACHED ELEMENTS REFERENCE EPOCH:') || !mostText.includes('MJD 60800.0')) {
      throw new Error('Asteroids tab missing explicit separation of Ephemeris Computation Window and Cached Elements Reference Epoch (MJD 60800.0)!');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_asteroids_ceres_2026.png') });
    console.log('  ✓ Asteroids tab rendered 1 Ceres with dynamic 2026 observation window and separated timestamp provenance');

    // ── STEP 5: Verify Direct Link & Browser Back/Forward Navigation
    console.log('\n--- 5. Testing Direct Link, Browser Back/Forward, and Return to Home ---');
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 1600, height: 1050, deviceScaleFactor: 1 });
    page2.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
    await page2.goto(`http://localhost:${PORT}/experience?target=wise-0855&tab=spectra`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 800));
    const directText = await page2.evaluate(() => document.body.innerText);
    if (!directText.includes('Y4') || !directText.includes('102')) {
      throw new Error('Direct link /experience?target=wise-0855&tab=spectra did not restore target and tab!');
    }
    const motionTabBtn = await page2.$('button[data-tab="motion"]');
    await motionTabBtn.click();
    await new Promise((r) => setTimeout(r, 250));
    await page2.goBack();
    await new Promise((r) => setTimeout(r, 250));
    if (!page2.url().includes('tab=spectra')) {
      throw new Error(`Browser Back failed to restore tab=spectra, URL is: ${page2.url()}`);
    }
    await page2.goForward();
    await new Promise((r) => setTimeout(r, 250));
    if (!page2.url().includes('tab=motion')) {
      throw new Error(`Browser Forward failed to restore tab=motion, URL is: ${page2.url()}`);
    }
    console.log('  ✓ Direct URL query params (?target=wise-0855&tab=spectra) and Browser Back/Forward verified');

    const backHomeBtn = await page2.$('button[aria-label="Back to Home"]');
    await backHomeBtn.click();
    await new Promise((r) => setTimeout(r, 400));
    if (new URL(page2.url()).pathname !== '/') {
      throw new Error(`Back to Home button did not return to /, got: ${page2.url()}`);
    }
    console.log('  ✓ Back to Home navigation verified');

    if (pageErrors.length > 0) {
      throw new Error(`Runtime page errors detected: ${pageErrors.join('; ')}`);
    }

    console.log('\n======================================================');
    console.log('ALL SCIENTIFIC, UI/UX & ALADIN v3 VERIFICATIONS PASSED!');
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
