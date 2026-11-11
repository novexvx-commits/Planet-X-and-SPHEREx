/**
 * Scientific Validation & API Test Suite for NASA SPHEREx Platform
 * Validates coordinate conversions, astrometric displacement calculations,
 * and test coverage for all 5 required astronomical targets.
 */

import { raSexagesimalToDeg, decSexagesimalToDeg, degToRaSexagesimal, degToDecSexagesimal, angularSeparationArcsec, surfaceBrightnessToFluxUJy, fluxUJyToAbMag } from '../utils/astronomy.js';
import { AUTHORITATIVE_TARGETS } from '../data/authoritativeTargets.js';
import { analyzeTargetMotion } from '../services/motionService.js';
import { getTargetLightCurve } from '../services/photometryService.js';
import { getTargetSpectra } from '../services/spectralService.js';
import { compareObservations } from '../services/imageComparisonService.js';
import { queryMovingObjectSearch } from '../services/mostMovingObjectService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== RUNNING SCIENTIFIC CALCULATIONS VALIDATION ===');

// 1. Coordinate conversions
const testRaDeg = raSexagesimalToDeg("17h 57m 48.50s");
assert(Math.abs(testRaDeg - 269.452083) < 0.0001, `RA Sexagesimal to Deg precision (expected ~269.452083, got ${testRaDeg})`);

const testDecDeg = decSexagesimalToDeg("+04° 41' 36.2\"");
assert(Math.abs(testDecDeg - 4.693389) < 0.0001, `Dec Sexagesimal to Deg precision (expected ~4.693389, got ${testDecDeg})`);

const roundtripRa = degToRaSexagesimal(testRaDeg);
assert(roundtripRa.includes('17h 57m 48.50s'), `RA roundtrip formatting: ${roundtripRa}`);

// 2. Angular separation
const sepSame = angularSeparationArcsec(100, 20, 100, 20);
assert(sepSame === 0, `Identical coordinates yield zero separation: ${sepSame}`);

const sepShift = angularSeparationArcsec(0, 0, 1 / 3600, 0);
assert(Math.abs(sepShift - 1.0) < 0.001, `1 arcsecond shift along equator measures 1.0 arcsec: ${sepShift.toFixed(4)}`);

// 3. Photometry conversion
const testFluxUJy = surfaceBrightnessToFluxUJy(1.0, 1);
assert(testFluxUJy > 0, `Surface brightness to flux density converts strictly positive: ${testFluxUJy}`);

const testMag = fluxUJyToAbMag(3.631e9); // 3631 Jy = 0 AB mag
assert(Math.abs(testMag - 0.0) < 0.0001, `AB Zero point matches 3631 Jy: ${testMag}`);

console.log('\n=== TESTING ALL 5 REQUIRED ASTRONOMICAL TARGETS ===');

const targetIds = ['barnards-star', 'epsilon-indi-b', 'wise-0855', 'rw-aurigae', 'r-draconis'];

for (const id of targetIds) {
  const target = AUTHORITATIVE_TARGETS.find(t => t.id === id);
  assert(!!target, `Target '${id}' exists in Authoritative Targets catalog`);

  // Test motion analysis
  const motion = analyzeTargetMotion(id);
  assert(motion && motion.centroidHistory.length > 0, `Target '${target.name}' has multi-epoch centroid tracking`);
  if (id === 'barnards-star') {
    assert(motion.overallAssessment.hasDetectedMotion === true, `Barnard's Star motion is scientifically detected (>5σ)`);
  }

  // Test light curve
  const lc = getTargetLightCurve(id, 'all');
  assert(lc && lc.measurements.length > 0, `Target '${target.name}' has calibrated light curve (${lc.measurements.length} points)`);

  // Test spectra
  const spec = getTargetSpectra(id);
  assert(spec && spec.sedPoints.length === 102, `Target '${target.name}' has all 102 SPHEREx spectral channels mapped`);

  // Test image comparison
  const comp = compareObservations({
    targetId: id,
    obs1: { obsId: 'OBS1', bandpass: 'SPHEREx-D2', mjd: 60920, centerRa: target.raDeg, centerDec: target.decDeg },
    obs2: { obsId: 'OBS2', bandpass: 'SPHEREx-D2', mjd: 61120, centerRa: target.raDeg, centerDec: target.decDeg }
  });
  assert(comp && comp.differenceAnalysis && comp.differenceAnalysis.diffPixels.length === 1024, `Target '${target.name}' generates 32x32 difference image`);
}

console.log('\n=== TESTING MOVING OBJECT SEARCH TOOL (MOST) ===');
const mostResult = await queryMovingObjectSearch('Ceres');
assert(mostResult && mostResult.ephemerides.length > 0, `MOST query for asteroid Ceres returns multi-epoch orbital ephemerides`);

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) process.exit(1);

