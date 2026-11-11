/**
 * End-to-End Integration Test for NASA SPHEREx Exploration Platform
 * Starts Express server, queries all endpoints, validates status codes and payloads.
 */

import { app } from '../server.js';

const PORT = 5099;

async function runE2ETests() {
  console.log('=== STARTING END-TO-END SERVER INTEGRATION TESTS ===');
  
  const server = app.listen(PORT, async () => {
    console.log(`Test server running at http://localhost:${PORT}`);
    let passed = 0;
    let failed = 0;

    const assert = (cond, msg) => {
      if (cond) {
        console.log(`  ✓ ${msg}`);
        passed++;
      } else {
        console.error(`  ✗ FAIL: ${msg}`);
        failed++;
      }
    };

    try {
      // 1. Health
      const resHealth = await fetch(`http://localhost:${PORT}/api/health`);
      assert(resHealth.status === 200, `GET /api/health returned 200`);
      const jsonHealth = await resHealth.json();
      assert(jsonHealth.status === 'operational', `Health status is operational`);

      // 2. Targets list
      const resTargets = await fetch(`http://localhost:${PORT}/api/targets`);
      assert(resTargets.status === 200, `GET /api/targets returned 200`);
      const jsonTargets = await resTargets.json();
      assert(jsonTargets.authoritativeTargetsCount === 5, `Returns all 5 authoritative targets`);

      // 3. Target dossier for all 5 targets
      const targetIds = ['barnards-star', 'epsilon-indi-b', 'wise-0855', 'rw-aurigae', 'r-draconis'];
      for (const id of targetIds) {
        const res = await fetch(`http://localhost:${PORT}/api/target/${id}`);
        assert(res.status === 200, `GET /api/target/${id} returned 200`);
        const json = await res.json();
        assert(json.target && json.target.id === id, `Target ${id} metadata verified`);
      }

      // 4. Search endpoint (Name & Coordinates)
      const resSearchName = await fetch(`http://localhost:${PORT}/api/search?q=Barnard`);
      assert(resSearchName.status === 200, `GET /api/search?q=Barnard returned 200`);
      const resSearchCoord = await fetch(`http://localhost:${PORT}/api/search?ra=269.452&dec=4.693`);
      assert(resSearchCoord.status === 200, `GET /api/search with RA/Dec returned 200`);

      // 5. Observations query
      const resObs = await fetch(`http://localhost:${PORT}/api/observations?targetId=barnards-star`);
      assert(resObs.status === 200, `GET /api/observations returned 200`);
      const jsonObs = await resObs.json();
      assert(jsonObs.observations && jsonObs.observations.length > 0, `Returned ${jsonObs.observations.length} observations`);

      // 6. Timeline
      const resTl = await fetch(`http://localhost:${PORT}/api/timeline/barnards-star`);
      assert(resTl.status === 200, `GET /api/timeline/barnards-star returned 200`);
      const jsonTl = await resTl.json();
      assert(jsonTl.timelineEntries && jsonTl.timelineEntries.length > 0, `Timeline has entries`);

      // 7. Image comparison (Side-by-side / Difference imaging)
      const resComp = await fetch(`http://localhost:${PORT}/api/image-compare?targetId=barnards-star`);
      assert(resComp.status === 200, `GET /api/image-compare returned 200`);
      const jsonComp = await resComp.json();
      assert(jsonComp.differenceAnalysis && jsonComp.differenceAnalysis.rmsResidualMJyPerSr !== undefined, `Difference imaging analysis computed`);

      // 8. Motion detection
      const resMotion = await fetch(`http://localhost:${PORT}/api/motion/barnards-star`);
      assert(resMotion.status === 200, `GET /api/motion/barnards-star returned 200`);
      const jsonMotion = await resMotion.json();
      assert(jsonMotion.motionVectors && jsonMotion.motionVectors.length > 0, `Motion vectors calculated`);

      // 9. Light curves & CSV download
      const resLc = await fetch(`http://localhost:${PORT}/api/lightcurve/rw-aurigae`);
      assert(resLc.status === 200, `GET /api/lightcurve/rw-aurigae returned 200`);
      const resLcCsv = await fetch(`http://localhost:${PORT}/api/lightcurve/r-draconis/csv`);
      assert(resLcCsv.status === 200, `GET /api/lightcurve/r-draconis/csv returned 200`);
      const csvText = await resLcCsv.text();
      assert(csvText.includes('target_name') && csvText.includes('flux_density_mjy'), `CSV text format verified`);

      // 10. Spectral bands & target SED
      const resBands = await fetch(`http://localhost:${PORT}/api/spectra/catalog`);
      assert(resBands.status === 200, `GET /api/spectra/catalog returned 200`);
      const jsonBands = await resBands.json();
      assert(jsonBands.totalBandsCount === 102, `Spectral bands catalog has 102 bands`);

      const resSed = await fetch(`http://localhost:${PORT}/api/spectra/wise-0855`);
      assert(resSed.status === 200, `GET /api/spectra/wise-0855 returned 200`);
      const jsonSed = await resSed.json();
      assert(jsonSed.sedPoints && jsonSed.sedPoints.length === 102, `WISE 0855 SED has 102 spectral points`);

      // 11. MOST Moving Object Search
      const resMost = await fetch(`http://localhost:${PORT}/api/most?target=Ceres`);
      assert(resMost.status === 200, `GET /api/most?target=Ceres returned 200`);
      const jsonMost = await resMost.json();
      assert(jsonMost.ephemerides && jsonMost.ephemerides.length > 0, `MOST returns orbital ephemerides`);

      // 12. Static Frontend Single-Page Application Serving
      const resFrontend = await fetch(`http://localhost:${PORT}/`);
      assert(resFrontend.status === 200, `GET / (frontend bundle) returned 200`);
      const frontendHtml = await resFrontend.text();
      assert(frontendHtml.includes('SPHEREx') || frontendHtml.includes('html'), `Frontend HTML delivered successfully`);

      console.log(`\n========================================`);
      console.log(`E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
      console.log(`========================================`);

      server.close(() => {
        process.exit(failed > 0 ? 1 : 0);
      });
    } catch(err) {
      console.error('E2E Test Execution Error:', err);
      server.close(() => process.exit(1));
    }
  });
}

runE2ETests();

