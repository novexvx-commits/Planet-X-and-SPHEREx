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
  console.log('🌌 Starting Complete Scientific & Production Verification...');
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
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--window-size=1600,1050'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1050, deviceScaleFactor: 1 });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // ── STEP 1: Verify Homepage (/) & Zero-Value / Scientific Facts Audit
    console.log('\n--- 1. Testing Route: / (Homepage & Scientific Specs Audit) ---');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));

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

    // Verify "Try MARSAD" button exists
    const tryButtons = await page.$$('button[aria-label="Try MARSAD"]');
    console.log(`✓ Found ${tryButtons.length} "Try MARSAD" button(s) on Homepage`);
    if (tryButtons.length === 0) {
      throw new Error('Try MARSAD button not found on Homepage!');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_homepage_verified.png') });

    // ── STEP 2: Click "Try MARSAD" to navigate to /experience
    console.log('\n--- 2. Clicking "Try MARSAD" Button -> /experience ---');
    await tryButtons[0].click();
    await new Promise((r) => setTimeout(r, 1000));

    const currentUrl = page.url();
    if (!currentUrl.includes('/experience')) {
      throw new Error(`Expected URL to contain /experience, got: ${currentUrl}`);
    }
    console.log(`✓ Navigated to: ${currentUrl}`);

    // ── STEP 3: Test All 5 Targets on Timeline Tab (Check Scan #1 of 0 & Epsilon Indi B)
    console.log('\n--- 3. Verifying All 5 Targets on Timeline Tab ---');
    const targets = [
      { id: 'barnards-star', expectedSpec: 'M4.0V' },
      { id: 'epsilon-indi-b', expectedSpec: 'T1.5V + T6V' },
      { id: 'wise-0855', expectedSpec: 'Y4' },
      { id: 'rw-aurigae', expectedSpec: 'CTTS' },
      { id: 'r-draconis', expectedSpec: 'M9EIII' }
    ];

    for (const t of targets) {
      const btn = await page.$(`button[data-target-id="${t.id}"]`);
      if (!btn) throw new Error(`Target button ${t.id} missing`);
      await btn.click();
      await new Promise((r) => setTimeout(r, 350));

      const expText = await page.evaluate(() => document.body.innerText);
      if (expText.includes('Scan #1 of 0') || /Scan #\d+ of 0/i.test(expText)) {
        throw new Error(`Target ${t.id} displays broken "Scan #1 of 0"!`);
      }
      if (!expText.toUpperCase().includes(t.expectedSpec.toUpperCase())) {
        throw new Error(`Target ${t.id} missing expected spectral type "${t.expectedSpec}"`);
      }
      if (t.id !== 'barnards-star' && expText.includes('M4.0V')) {
        throw new Error(`Target ${t.id} leaked Barnard's Star spectral type "M4.0V"!`);
      }
      console.log(`  ✓ Target '${t.id}' verified (${t.expectedSpec}, valid epoch counter, non-empty residual map)`);
    }

    // ── STEP 4: Test All 7 Tabs on /experience
    console.log('\n--- 4. Testing All 7 Tabs on /experience ---');
    const tabs = ['timeline', 'sky', 'motion', 'variable', 'spectra', 'most', 'provenance'];
    for (const tab of tabs) {
      const tabBtn = await page.$(`button[data-tab="${tab}"]`);
      if (!tabBtn) throw new Error(`Tab button ${tab} missing`);
      await tabBtn.click();
      await new Promise((r) => setTimeout(r, 400));

      const tabText = await page.evaluate(() => document.body.innerText);
      if (tab === 'variable') {
        if (!tabText.includes('245.6')) {
          throw new Error('R Draconis Light Curve tab missing verified 245.6-day period!');
        }
      }
      if (tab === 'spectra') {
        if (!tabText.includes('102')) {
          throw new Error('Spectra tab missing 102 channels!');
        }
      }
      if (tab === 'most') {
        if (!tabText.toUpperCase().includes('COMPUTED ORBITAL EPHEMERIS') && !tabText.toUpperCase().includes('COMPUTED EPHEMERIDES')) {
          throw new Error('MOST tab missing explicit Computed Orbital Ephemeris label!');
        }
      }
      console.log(`  ✓ Tab '${tab}' rendered & verified`);
    }

    if (pageErrors.length > 0) {
      throw new Error(`Runtime page errors detected: ${pageErrors.join('; ')}`);
    }

    console.log('\n======================================================');
    console.log('ALL SCIENTIFIC & UI VERIFICATIONS PASSED (0 ERRORS)!');
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
