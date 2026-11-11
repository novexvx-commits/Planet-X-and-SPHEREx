const endpoints = [
  '/api/health',
  '/api/targets',
  '/api/target/barnards-star',
  '/api/target/epsilon-indi-b',
  '/api/target/wise-0855',
  '/api/target/rw-aurigae',
  '/api/target/r-draconis',
  '/api/observations?targetId=barnards-star',
  '/api/motion/barnards-star',
  '/api/lightcurve/rw-aurigae',
  '/api/lightcurve/r-draconis',
  '/api/spectra/catalog',
  '/api/spectra/wise-0855',
  '/api/most?target=Ceres'
];

async function verify() {
  console.log('===================================================');
  console.log('TESTING DIRECT BACKEND (http://127.0.0.1:5000)');
  console.log('===================================================');
  for (const ep of endpoints) {
    try {
      const res = await fetch('http://127.0.0.1:5000' + ep);
      if (res.ok) {
        console.log(`  ✓ [${res.status} OK] Direct: ${ep}`);
      } else {
        console.error(`  ✗ [${res.status}] Direct: ${ep}`);
      }
    } catch (e) {
      console.error(`  ✗ [FAIL] Direct: ${ep} -> ${e.message}`);
    }
  }

  console.log('\n===================================================');
  console.log('TESTING PROXIED FRONTEND (http://127.0.0.1:5173)');
  console.log('===================================================');
  for (const ep of endpoints) {
    try {
      const res = await fetch('http://127.0.0.1:5173' + ep);
      if (res.ok) {
        console.log(`  ✓ [${res.status} OK] Proxied: ${ep}`);
      } else {
        console.error(`  ✗ [${res.status}] Proxied: ${ep}`);
      }
    } catch (e) {
      console.error(`  ✗ [FAIL] Proxied: ${ep} -> ${e.message}`);
    }
  }
}

verify();

