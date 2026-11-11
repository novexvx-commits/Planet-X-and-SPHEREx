/**
 * Comprehensive Live Connectivity & Proxy Verification Script
 * Boots Express on 127.0.0.1:5000, boots Vite dev server,
 * and validates direct backend endpoints AND proxied frontend endpoints.
 */

import { startServer } from '../server.js';
import { createServer as createViteServer } from 'vite';

async function runLiveVerification() {
  console.log('================================================================');
  console.log('🛰️ STARTING LIVE CONNECTIVITY AND PROXY VERIFICATION');
  console.log('================================================================\n');

  // 1. Start Express Backend Server on 127.0.0.1:5000
  const backendServer = startServer(5000, '127.0.0.1');
  await new Promise((r) => setTimeout(r, 600));

  let passed = 0;
  let failed = 0;

  const testEndpoint = async (url, description) => {
    try {
      const res = await fetch(url);
      const isOk = res.status === 200;
      let bodySnippet = '';
      try {
        const json = await res.json();
        bodySnippet = JSON.stringify(json).slice(0, 100) + '...';
      } catch {
        const text = await res.text();
        bodySnippet = text.slice(0, 100);
      }

      if (isOk) {
        console.log(`  ✓ [200 OK] ${description}`);
        console.log(`    ↳ URL: ${url}`);
        console.log(`    ↳ Data: ${bodySnippet}`);
        passed++;
      } else {
        console.error(`  ✗ [FAIL ${res.status}] ${description}`);
        console.error(`    ↳ URL: ${url}`);
        failed++;
      }
    } catch (err) {
      console.error(`  ✗ [CONN ERROR] ${description}`);
      console.error(`    ↳ URL: ${url}`);
      console.error(`    ↳ Error: ${err.message}`);
      failed++;
    }
  };

  console.log('\n--- PART 1: DIRECT BACKEND ENDPOINTS (http://127.0.0.1:5000) ---');
  await testEndpoint('http://127.0.0.1:5000/api/health', 'Backend Health Check');
  await testEndpoint('http://127.0.0.1:5000/api/targets', 'Authoritative Targets List');
  await testEndpoint('http://127.0.0.1:5000/api/target/barnards-star', "Target 1: Barnard's Star Dossier");
  await testEndpoint('http://127.0.0.1:5000/api/target/epsilon-indi-b', 'Target 2: Epsilon Indi B Dossier');
  await testEndpoint('http://127.0.0.1:5000/api/target/wise-0855', 'Target 3: WISE 0855 Dossier');
  await testEndpoint('http://127.0.0.1:5000/api/target/rw-aurigae', 'Target 4: RW Aurigae Dossier');
  await testEndpoint('http://127.0.0.1:5000/api/target/r-draconis', 'Target 5: R Draconis Dossier');
  await testEndpoint('http://127.0.0.1:5000/api/observations?targetId=barnards-star', "Barnard's Star Observations Query");
  await testEndpoint('http://127.0.0.1:5000/api/motion/barnards-star', "Barnard's Star Motion Detection & Vectors");
  await testEndpoint('http://127.0.0.1:5000/api/lightcurve/rw-aurigae', 'RW Aurigae Multi-Band Light Curve');
  await testEndpoint('http://127.0.0.1:5000/api/lightcurve/r-draconis', 'R Draconis Mira Pulsation Light Curve');
  await testEndpoint('http://127.0.0.1:5000/api/spectra/catalog', '102 Spectral Bands & Array Catalog');
  await testEndpoint('http://127.0.0.1:5000/api/spectra/wise-0855', 'WISE 0855 102-Band SED Profile');
  await testEndpoint('http://127.0.0.1:5000/api/most?target=Ceres', 'MOST Solar System Asteroid Ceres Query');

  // 2. Start Vite Dev Server with Proxy
  console.log('\n--- PART 2: VITE FRONTEND PROXY VERIFICATION ---');
  let viteServer;
  try {
    viteServer = await createViteServer({
      server: {
        host: '127.0.0.1',
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:5000',
            changeOrigin: true,
            secure: false
          }
        }
      }
    });
    await viteServer.listen();
    const actualPort = viteServer.httpServer?.address()?.port;
    console.log(`Vite Dev Server actively listening on port ${actualPort}`);

    // Test Proxied Endpoints
    await testEndpoint(`http://127.0.0.1:${actualPort}/api/health`, 'Proxied /api/health');
    await testEndpoint(`http://127.0.0.1:${actualPort}/api/targets`, 'Proxied /api/targets');
    await testEndpoint(`http://127.0.0.1:${actualPort}/api/target/barnards-star`, 'Proxied /api/target/barnards-star');
    await testEndpoint(`http://127.0.0.1:${actualPort}/api/observations?targetId=barnards-star`, 'Proxied /api/observations');
    await testEndpoint(`http://127.0.0.1:${actualPort}/api/motion/barnards-star`, 'Proxied /api/motion/barnards-star');
    await testEndpoint(`http://127.0.0.1:${actualPort}/api/spectra/catalog`, 'Proxied /api/spectra/catalog');
    await testEndpoint(`http://127.0.0.1:${actualPort}/api/lightcurve/rw-aurigae`, 'Proxied /api/lightcurve/rw-aurigae');
  } catch (err) {
    console.error('Vite startup/proxy failure:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  // Clean shutdown
  if (viteServer) await viteServer.close();
  backendServer.close(() => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

runLiveVerification();
