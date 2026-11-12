/**
 * Scientific Validation & API Test Suite for NASA SPHEREx Platform
 * Validates coordinate conversions, MJD/elapsed-days consistency, astrometric displacement calculations,
 * dynamic asteroid ephemerides, and test coverage for all 5 required astronomical targets.
 */

import {
  raSexagesimalToDeg,
  decSexagesimalToDeg,
  degToRaSexagesimal,
  degToDecSexagesimal,
  angularSeparationArcsec,
  surfaceBrightnessToFluxUJy,
  fluxUJyToAbMag,
  roundMjd,
  formatMjd,
  calculateElapsedDays,
  formatElapsedDays
} from '../utils/astronomy.js';
import { AUTHORITATIVE_TARGETS } from '../data/authoritativeTargets.js';
import { analyzeTargetMotion } from '../services/motionService.js';
import { getTargetLightCurve } from '../services/photometryService.js';
import { getTargetSpectra } from '../services/spectralService.js';
import { compareObservations } from '../services/imageComparisonService.js';
import { queryMovingObjectSearch, computeLocalMovingObjectEphemeris } from '../services/mostMovingObjectService.js';

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

// 4. MJD and Elapsed Days Consistency (MJD 60902.9 to MJD 61164.9 = 262.0 days)
const rawMjd1 = 60902.864715;
const rawMjd2 = 61164.879119;
assert(roundMjd(rawMjd1, 1) === 60902.9, `roundMjd(60902.864715, 1) === 60902.9 (got ${roundMjd(rawMjd1, 1)})`);
assert(roundMjd(rawMjd2, 1) === 61164.9, `roundMjd(61164.879119, 1) === 61164.9 (got ${roundMjd(rawMjd2, 1)})`);
assert(formatMjd(rawMjd1, 1) === "60902.9", `formatMjd(60902.864715, 1) === "60902.9"`);
assert(formatMjd(rawMjd2, 1) === "61164.9", `formatMjd(61164.879119, 1) === "61164.9"`);
assert(calculateElapsedDays(rawMjd1, rawMjd2, 1) === 262.0, `calculateElapsedDays(60902.864715, 61164.879119, 1) === 262.0 (got ${calculateElapsedDays(rawMjd1, rawMjd2, 1)})`);
assert(formatElapsedDays(rawMjd1, rawMjd2, 1) === "262.0", `formatElapsedDays(60902.864715, 61164.879119, 1) === "262.0"`);

console.log('\n=== TESTING ALL 5 REQUIRED ASTRONOMICAL TARGETS ===');

const targetIds = ['barnards-star', 'epsilon-indi-b', 'wise-0855', 'rw-aurigae', 'r-draconis'];

for (const id of targetIds) {
  const target = AUTHORITATIVE_TARGETS.find(t => t.id === id);
  assert(!!target, `Target '${id}' exists in Authoritative Targets catalog`);

  // Test motion analysis
  const motion = analyzeTargetMotion(id);
  assert(motion && motion.centroidHistory.length > 0, `Target '${target.name}' has multi-epoch centroid tracking`);
  assert(motion.overallAssessment.netDisplacementArcsec > 0, `Target '${target.name}' has non-zero net displacement (${motion.overallAssessment.netDisplacementArcsec}")`);
  assert(motion.dataClassification.includes('DERIVED FROM REAL DATA'), `Target '${target.name}' motion service includes canonical 'DERIVED FROM REAL DATA' classification`);
  if (id === 'barnards-star') {
    assert(motion.overallAssessment.hasDetectedMotion === true, `Barnard's Star motion is scientifically detected (>5σ)`);
    assert(target.distancePc === 1.8282 && target.distanceLy === 5.963 && target.parallaxMas === 546.9759 && target.totalProperMotionArcsecYr === 10.393, `Barnard's Star distance (pc/ly), parallax (mas), and proper motion ("/yr) are separate and accurate`);
    assert(motion.overallAssessment.totalBaselineDays === 262.0, `Barnard's Star motion baseline is exactly 262.0 days`);
  }
  if (id === 'epsilon-indi-b') {
    assert(target.spectralType === 'T1.5V + T6V' && Array.isArray(target.components) && target.components.length === 2, `Epsilon Indi B is verified as T1.5V + T6V binary brown dwarf system (Ba + Bb), not M4.0V`);
  }

  // Test light curve
  const lc = getTargetLightCurve(id, 'all');
  assert(lc && lc.measurements.length > 0, `Target '${target.name}' has calibrated light curve (${lc.measurements.length} points)`);
  assert(lc.dataClassification.includes('MODEL / SIMULATION'), `Target '${target.name}' light curve service includes canonical 'MODEL / SIMULATION' classification`);

  // Test spectra
  const spec = getTargetSpectra(id);
  assert(spec && spec.sedPoints.length === 102, `Target '${target.name}' has all 102 SPHEREx spectral channels mapped`);
  assert(spec.dataClassification.includes('MODEL / SIMULATION'), `Target '${target.name}' spectral service includes canonical 'MODEL / SIMULATION' classification`);

  // Test image comparison
  const comp = compareObservations({
    targetId: id,
    obs1: { obsId: 'OBS1', bandpass: 'SPHEREx-D2', mjd: rawMjd1, centerRa: target.raDeg, centerDec: target.decDeg },
    obs2: { obsId: 'OBS2', bandpass: 'SPHEREx-D2', mjd: rawMjd2, centerRa: target.raDeg, centerDec: target.decDeg }
  });
  assert(comp && comp.differenceAnalysis && comp.differenceAnalysis.diffPixels.length === 1024, `Target '${target.name}' generates 32x32 difference image`);
  assert(comp.differenceAnalysis.baselineDays === 262.0 && comp.differenceAnalysis.baselineDaysFormatted === "262.0", `Target '${target.name}' image comparison baseline is 262.0 days (got ${comp.differenceAnalysis.baselineDaysFormatted})`);
  assert(comp.dataClassification.includes('MODEL / SIMULATION'), `Target '${target.name}' image comparison includes canonical 'MODEL / SIMULATION' classification`);
}

console.log('\n=== TESTING MOVING OBJECT SEARCH TOOL (MOST) & DYNAMIC 2026 EPHEMERIDES ===');
const mostSync = computeLocalMovingObjectEphemeris('1 Ceres', '2026-11-12');
assert(mostSync && !mostSync.unavailable && mostSync.ephemerides.length === 8 && mostSync.target.mpcNumber === 1, `Synchronous MOST initializer for '1 Ceres' returns 8 ephemeris epochs and MPC #1`);
assert(mostSync.ephemerides[0].utcDate === '2026-11-12', `Dynamic asteroid ephemeris window starts at requested date 2026-11-12 (got ${mostSync.ephemerides[0].utcDate})`);
assert(mostSync.provenance.orbitalElementsEpoch.includes('60800.0'), `MOST provenance explicitly distinguishes cached orbital elements epoch (MJD 60800.0) from computation window`);
const mostUnknown = computeLocalMovingObjectEphemeris('NonExistentObject99999');
assert(mostUnknown && mostUnknown.unavailable === true && mostUnknown.dataClassificationBadge === 'UNAVAILABLE' && mostUnknown.ephemerides.length === 0, `Uncataloged object returns explicit UNAVAILABLE state without fabricating orbital elements`);
const mostResult = await queryMovingObjectSearch('Ceres', '2026-11-12');
assert(mostResult && mostResult.ephemerides.length > 0 && mostResult.ephemerides[0].utcDate.startsWith('2026-11-12'), `MOST query for asteroid Ceres returns multi-epoch orbital ephemerides for current 2026 window`);

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
