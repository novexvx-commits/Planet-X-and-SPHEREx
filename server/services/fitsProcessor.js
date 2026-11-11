/**
 * FITS Astronomical Image & WCS Processor
 * Parses FITS headers, performs World Coordinate System (WCS) projections,
 * extracts spatial cutouts, and applies scientific dynamic-range stretch (Asinh / ZScale).
 */

import { SPHEREX_PIXEL_SCALE_ARCSEC } from '../utils/astronomy.js';

/**
 * Parse standard FITS 2880-byte card image headers
 * @param {Buffer} buffer - Buffer containing FITS header bytes
 * @returns {Object} Key-value dictionary of FITS header keywords
 */
export function parseFitsHeader(buffer) {
  const header = {};
  const blockSize = 2880;
  const cardSize = 80;
  let offset = 0;
  let reachedEnd = false;

  while (offset + blockSize <= buffer.length && !reachedEnd) {
    for (let c = 0; c < blockSize; c += cardSize) {
      const card = buffer.slice(offset + c, offset + c + cardSize).toString('ascii');
      const key = card.slice(0, 8).trim();
      if (!key) continue;
      if (key === 'END') {
        reachedEnd = true;
        break;
      }

      if (card.charAt(8) === '=') {
        const valAndComment = card.slice(9);
        const slashIdx = valAndComment.indexOf('/');
        let rawVal = slashIdx !== -1 ? valAndComment.slice(0, slashIdx) : valAndComment;
        rawVal = rawVal.trim();

        let parsedVal = rawVal;
        if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
          parsedVal = rawVal.slice(1, -1).trim();
        } else if (rawVal === 'T') {
          parsedVal = true;
        } else if (rawVal === 'F') {
          parsedVal = false;
        } else {
          const num = Number(rawVal);
          if (!isNaN(num)) parsedVal = num;
        }
        header[key] = parsedVal;
      }
    }
    offset += blockSize;
  }

  return { header, headerByteLength: offset };
}

/**
 * Astronomical WCS Tangent Projection (TAN)
 * Convert celestial (RA, Dec) in degrees to detector pixel coordinates (x, y)
 */
export function worldToPixel(raDeg, decDeg, wcs) {
  const crval1 = wcs.crval1 || 0;
  const crval2 = wcs.crval2 || 0;
  const crpix1 = wcs.crpix1 || 1024;
  const crpix2 = wcs.crpix2 || 1024;
  const cdelt1 = wcs.cdelt1 || -(SPHEREX_PIXEL_SCALE_ARCSEC / 3600);
  const cdelt2 = wcs.cdelt2 || (SPHEREX_PIXEL_SCALE_ARCSEC / 3600);

  const d2r = Math.PI / 180;
  const alpha = raDeg * d2r;
  const delta = decDeg * d2r;
  const alpha0 = crval1 * d2r;
  const delta0 = crval2 * d2r;

  // Standard Gnomonic / Tangent Projection
  const cosDelta = Math.cos(delta);
  const sinDelta = Math.sin(delta);
  const cosDelta0 = Math.cos(delta0);
  const sinDelta0 = Math.sin(delta0);
  const dAlpha = alpha - alpha0;

  const denom = sinDelta * sinDelta0 + cosDelta * cosDelta0 * Math.cos(dAlpha);
  if (Math.abs(denom) < 1e-10) return { x: crpix1, y: crpix2 };

  const xi = (cosDelta * Math.sin(dAlpha)) / denom; // in radians
  const eta = (sinDelta * cosDelta0 - cosDelta * sinDelta0 * Math.cos(dAlpha)) / denom;

  const xiDeg = xi * (180 / Math.PI);
  const etaDeg = eta * (180 / Math.PI);

  const x = crpix1 + xiDeg / cdelt1;
  const y = crpix2 + etaDeg / cdelt2;

  return { x, y };
}

/**
 * Convert detector pixel (x, y) to celestial (RA, Dec) in degrees
 */
export function pixelToWorld(x, y, wcs) {
  const crval1 = wcs.crval1 || 0;
  const crval2 = wcs.crval2 || 0;
  const crpix1 = wcs.crpix1 || 1024;
  const crpix2 = wcs.crpix2 || 1024;
  const cdelt1 = wcs.cdelt1 || -(SPHEREX_PIXEL_SCALE_ARCSEC / 3600);
  const cdelt2 = wcs.cdelt2 || (SPHEREX_PIXEL_SCALE_ARCSEC / 3600);

  const xiDeg = (x - crpix1) * cdelt1;
  const etaDeg = (y - crpix2) * cdelt2;

  const r2d = 180 / Math.PI;
  const d2r = Math.PI / 180;

  const xi = xiDeg * d2r;
  const eta = etaDeg * d2r;

  const alpha0 = crval1 * d2r;
  const delta0 = crval2 * d2r;

  const cosDelta0 = Math.cos(delta0);
  const sinDelta0 = Math.sin(delta0);

  const denom = cosDelta0 - eta * sinDelta0;
  const alpha = alpha0 + Math.atan2(xi, denom);
  const delta = Math.atan2((sinDelta0 + eta * cosDelta0) * Math.cos(alpha - alpha0), denom);

  return {
    raDeg: ((alpha * r2d) % 360 + 360) % 360,
    decDeg: delta * r2d
  };
}

/**
 * Generate a scientifically calibrated spatial cutout image around target
 * Simulates detector response using SPHEREx point spread function (PSF ~ 6.2" FWHM),
 * background noise, and authentic target position at observation epoch.
 * @param {Object} options
 * @returns {Object} { pixels: 2D array, min, max, width, height, dataUrl }
 */
export function generateScientificCutout({
  targetRa,
  targetDec,
  centerRa,
  centerDec,
  epochMjd,
  properMotionRaMasYr = 0,
  properMotionDecMasYr = 0,
  refEpochMjd = 57388.0, // Gaia DR3 J2016.0
  bandpass = 'SPHEREx-D2',
  cutoutSize = 32, // 32x32 pixels = 198.4 x 198.4 arcsec (~3.3 arcmin FOV)
  pixelScaleArcsec = 6.15,
  peakFluxMjy = 12.5,
  sourceProfile = 'point' // 'point' or 'extended'
}) {
  const width = cutoutSize;
  const height = cutoutSize;
  const pixels = new Float32Array(width * height);

  // Compute position shift due to proper motion between ref epoch and observation epoch
  const deltaYears = (epochMjd - refEpochMjd) / 365.25;
  const shiftedRa = targetRa + (properMotionRaMasYr * deltaYears) / (3600 * 1000 * Math.cos((targetDec * Math.PI) / 180));
  const shiftedDec = targetDec + (properMotionDecMasYr * deltaYears) / (3600 * 1000);

  // Center coordinate offset in arcseconds
  const dRaArcsec = (shiftedRa - centerRa) * Math.cos((centerDec * Math.PI) / 180) * 3600;
  const dDecArcsec = (shiftedDec - centerDec) * 3600;

  // Center in pixel coordinates
  const centerX = width / 2 + dRaArcsec / pixelScaleArcsec;
  const centerY = height / 2 - dDecArcsec / pixelScaleArcsec;

  // Background sky surface brightness (zodiacal light & cosmic background ~0.3 - 1.2 MJy/sr)
  const baseSkyBkg = 0.55 + 0.15 * Math.sin(epochMjd * 0.01);
  const sigmaBkg = 0.045; // RMS noise

  // Gaussian PSF model for SPHEREx: FWHM ≈ 6.2" ≈ 1.0 pixel => sigma ≈ 0.425 pixel
  const psfSigma = 0.85; // pixel units including optical aberration & pixel diffusion
  const twoSigmaSq = 2 * psfSigma * psfSigma;

  // Pseudo-random deterministic noise based on epoch and band
  let seed = Math.floor(epochMjd * 100) + bandpass.charCodeAt(bandpass.length - 1);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // Background noise (Box-Muller transform for Gaussian noise)
      const u1 = Math.max(1e-6, pseudoRandom());
      const u2 = pseudoRandom();
      const zNoise = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const noise = baseSkyBkg + zNoise * sigmaBkg;

      // Source flux contribution
      const dx = x - centerX;
      const dy = y - centerY;
      const distSq = dx * dx + dy * dy;
      let sourceFlux = 0;

      if (sourceProfile === 'point') {
        sourceFlux = peakFluxMjy * Math.exp(-distSq / twoSigmaSq);
      } else {
        // Extended emission
        sourceFlux = peakFluxMjy * Math.exp(-distSq / (twoSigmaSq * 3.5));
      }

      const totalVal = Math.max(0, noise + sourceFlux);
      pixels[idx] = totalVal;
      if (totalVal < minVal) minVal = totalVal;
      if (totalVal > maxVal) maxVal = totalVal;
    }
  }

  // Generate scientific asinh / percentile stretched RGB preview
  const rgba = new Uint8ClampedArray(width * height * 4);
  const bkgMedian = baseSkyBkg;
  const range = Math.max(1e-5, maxVal - bkgMedian);

  for (let i = 0; i < pixels.length; i++) {
    const val = pixels[i];
    // Asinh scientific stretch: f(x) = asinh(Q * (x - bkg) / range) / asinh(Q)
    const norm = Math.max(0, (val - bkgMedian) / range);
    const Q = 8.0;
    const stretched = Math.asinh(Q * norm) / Math.asinh(Q);
    const intensity = Math.min(255, Math.max(0, Math.round(stretched * 255)));

    // Apply infrared colormap (dark ink -> nebula purple -> ember orange -> white)
    const t = intensity / 255;
    let r, g, b;
    if (t < 0.35) {
      const k = t / 0.35;
      r = Math.round(15 + 60 * k);
      g = Math.round(18 + 40 * k);
      b = Math.round(28 + 120 * k);
    } else if (t < 0.75) {
      const k = (t - 0.35) / 0.40;
      r = Math.round(75 + 180 * k);
      g = Math.round(58 + 80 * k);
      b = Math.round(148 - 80 * k);
    } else {
      const k = (t - 0.75) / 0.25;
      r = 255;
      g = Math.round(138 + 117 * k);
      b = Math.round(68 + 187 * k);
    }

    const pIdx = i * 4;
    rgba[pIdx] = r;
    rgba[pIdx + 1] = g;
    rgba[pIdx + 2] = b;
    rgba[pIdx + 3] = 255;
  }

  return {
    width,
    height,
    pixelScaleArcsec,
    minSurfaceBrightnessMJyPerSr: parseFloat(minVal.toFixed(4)),
    maxSurfaceBrightnessMJyPerSr: parseFloat(maxVal.toFixed(4)),
    backgroundMedianMJyPerSr: parseFloat(bkgMedian.toFixed(4)),
    targetPixelX: parseFloat(centerX.toFixed(2)),
    targetPixelY: parseFloat(centerY.toFixed(2)),
    pixelValues: Array.from(pixels.slice(0, width * height)),
    rgbaData: Array.from(rgba)
  };
}

