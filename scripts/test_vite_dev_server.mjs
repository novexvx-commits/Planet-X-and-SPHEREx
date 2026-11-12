import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEV_PORT = 5188;

async function testViteDev() {
  console.log('Starting Vite dev server on port', DEV_PORT);
  const viteProcess = spawn('npx.cmd', ['vite', '--port', String(DEV_PORT), '--strictPort'], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverStarted = false;
  viteProcess.stdout.on('data', d => {
    const s = d.toString();
    console.log('[Vite Stdout]', s.trim());
    if (s.includes('Local:') || s.includes(String(DEV_PORT))) {
      serverStarted = true;
    }
  });

  viteProcess.stderr.on('data', d => {
    console.error('[Vite Stderr]', d.toString().trim());
  });

  // Wait for server to start
  for (let i = 0; i < 30; i++) {
    if (serverStarted) break;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('Launching browser to probe Vite dev server on /experience?tab=sky&target=barnards-star...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle']
  });

  const page = await browser.newPage();
  const viteErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[Dev Browser Error]:', msg.text());
      if (msg.text().includes('Internal server error') || msg.text().includes('Failed to load url')) {
        viteErrors.push(msg.text());
      }
    }
  });

  page.on('response', res => {
    if (res.status() === 500) {
      console.error(`[HTTP 500 from Vite]: ${res.url()}`);
      viteErrors.push(`HTTP 500: ${res.url()}`);
    }
  });

  await page.goto(`http://localhost:${DEV_PORT}/experience?tab=sky&target=barnards-star`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Vite 500 / transform errors count:', viteErrors.length);
  if (viteErrors.length === 0) {
    console.log('SUCCESS: Vite dev server transformed all modules with 0 internal server errors!');
  } else {
    console.error('FAIL: Found Vite errors:', viteErrors);
  }

  await browser.close();
  viteProcess.kill();
  process.exit(viteErrors.length > 0 ? 1 : 0);
}

testViteDev().catch(err => {
  console.error('Vite dev probe error:', err);
  process.exit(1);
});
