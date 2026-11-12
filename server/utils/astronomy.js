/**
 * Astronomy Utilities for SPHEREx Data Platform
 * Coordinate conversions, time standards (MJD/UTC), photometry, and astrometry.
 */

/**
 * Convert Right Ascension sexagesimal string (e.g. "17h 57m 48.5s" or "17 57 48.5") to decimal degrees
 */
export function raSexagesimalToDeg(raStr) {
  if (typeof raStr === 'number') return raStr;
  if (!raStr || typeof raStr !== 'string') return NaN;
  const match = raStr.trim().match(/([0-9]+)[h:\s]+([0-9]+)[m:\s]+([0-9.]+)/i);
  if (match) {
    const h = parseFloat(match[1]);
    const m = parseFloat(match[2]);
    const s = parseFloat(match[3]);
    return (h + m / 60 + s / 3600) * 15.0;
  }
  const direct = parseFloat(raStr);
  return isNaN(direct) ? NaN : direct;
}

/**
 * Convert Declination sexagesimal string (e.g. "+04° 41' 36.2\"" or "-07 14 42.5") to decimal degrees
 */
export function decSexagesimalToDeg(decStr) {
  if (typeof decStr === 'number') return decStr;
  if (!decStr || typeof decStr !== 'string') return NaN;
  const clean = decStr.trim();
  const sign = clean.startsWith('-') ? -1 : 1;
  const match = clean.match(/[-+]?([0-9]+)[d°:\s]+([0-9]+)['m:\s]+([0-9.]+)/i);
  if (match) {
    const d = parseFloat(match[1]);
    const m = parseFloat(match[2]);
    const s = parseFloat(match[3]);
    return sign * (d + m / 60 + s / 3600);
  }
  const direct = parseFloat(clean);
  return isNaN(direct) ? NaN : direct;
}

/**
 * Format decimal degrees into RA sexagesimal string (HH:MM:SS.ss)
 */
export function degToRaSexagesimal(deg) {
  if (isNaN(deg)) return '00h 00m 00.00s';
  let totalHours = (deg % 360) / 15.0;
  if (totalHours < 0) totalHours += 24.0;
  const h = Math.floor(totalHours);
  const totalMin = (totalHours - h) * 60;
  const m = Math.floor(totalMin);
  const s = (totalMin - m) * 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${s.toFixed(2).padStart(5, '0')}s`;
}

/**
 * Format decimal degrees into Dec sexagesimal string (+/-DD:MM:SS.s)
 */
export function degToDecSexagesimal(deg) {
  if (isNaN(deg)) return '+00° 00\' 00.0"';
  const sign = deg < 0 ? '-' : '+';
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const totalMin = (abs - d) * 60;
  const m = Math.floor(totalMin);
  const s = (totalMin - m) * 60;
  return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}' ${s.toFixed(1).padStart(4, '0')}"`;
}

/**
 * Great-circle angular separation between two celestial points in arcseconds
 * @param {number} ra1 in degrees
 * @param {number} dec1 in degrees
 * @param {number} ra2 in degrees
 * @param {number} dec2 in degrees
 * @returns {number} separation in arcseconds
 */
export function angularSeparationArcsec(ra1, dec1, ra2, dec2) {
  const d2r = Math.PI / 180;
  const r1 = ra1 * d2r;
  const d1 = dec1 * d2r;
  const r2 = ra2 * d2r;
  const d2 = dec2 * d2r;

  // Vincenty formula for high precision at small angles
  const deltaRa = r2 - r1;
  const num1 = Math.cos(d2) * Math.sin(deltaRa);
  const num2 = Math.cos(d1) * Math.sin(d2) - Math.sin(d1) * Math.cos(d2) * Math.cos(deltaRa);
  const numerator = Math.sqrt(num1 * num1 + num2 * num2);
  const denominator = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(deltaRa);
  const angleRad = Math.atan2(numerator, denominator);

  return angleRad * (180 / Math.PI) * 3600.0;
}

/**
 * Position angle from point 1 to point 2 (degrees East of North)
 */
export function positionAngleDeg(ra1, dec1, ra2, dec2) {
  const d2r = Math.PI / 180;
  const r1 = ra1 * d2r;
  const d1 = dec1 * d2r;
  const r2 = ra2 * d2r;
  const d2 = dec2 * d2r;

  const y = Math.sin(r2 - r1) * Math.cos(d2);
  const x = Math.cos(d1) * Math.sin(d2) - Math.sin(d1) * Math.cos(d2) * Math.cos(r2 - r1);
  let pa = Math.atan2(y, x) * (180 / Math.PI);
  if (pa < 0) pa += 360;
  return pa;
}

/**
 * Modified Julian Date (MJD) to ISO UTC Date String
 * MJD = JD - 2400000.5. Unix epoch 1970-01-01 is MJD 40587.0
 */
export function mjdToUtc(mjd) {
  const num = typeof mjd === 'string' ? parseFloat(mjd) : mjd;
  if (num === null || num === undefined || isNaN(num) || num <= 0) return null;
  const ms = (num - 40587.0) * 86400000.0;
  return new Date(ms).toISOString();
}

/**
 * ISO Date string or Date object to MJD
 */
export function utcToMjd(dateOrStr) {
  const d = new Date(dateOrStr);
  const ms = d.getTime();
  if (isNaN(ms)) return NaN;
  return 40587.0 + ms / 86400000.0;
}

/**
 * Round an MJD value to a consistent decimal precision (default 1 decimal place = 0.1 day)
 */
export function roundMjd(mjd, decimals = 1) {
  const num = typeof mjd === 'string' ? parseFloat(mjd) : mjd;
  if (num === null || num === undefined || isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Format an MJD value consistently with fixed decimal places (e.g. "60902.9")
 */
export function formatMjd(mjd, decimals = 1) {
  return roundMjd(mjd, decimals).toFixed(decimals);
}

/**
 * Calculate elapsed days (Δt) directly from two MJD values using consistent decimal precision.
 * Ensures that displayed MJD1 (e.g. 60902.9) and MJD2 (e.g. 61164.9) always yield exact Δt = 262.0 days.
 */
export function calculateElapsedDays(mjd1, mjd2, decimals = 1) {
  const r1 = roundMjd(mjd1, decimals);
  const r2 = roundMjd(mjd2, decimals);
  const factor = Math.pow(10, decimals);
  return Math.round(Math.abs(r2 - r1) * factor) / factor;
}

/**
 * Format elapsed days consistently (e.g. "262.0")
 */
export function formatElapsedDays(mjd1, mjd2, decimals = 1) {
  return calculateElapsedDays(mjd1, mjd2, decimals).toFixed(decimals);
}

/**
 * SPHEREx pixel solid angle in steradians
 * SPHEREx native pixel scale is 6.2 arcsec / pixel = 3.0058e-5 rad / pixel
 * Solid angle Omega = (3.0058e-5)^2 ≈ 9.035e-10 sr
 */
export const SPHEREX_PIXEL_SCALE_ARCSEC = 6.2;
export const SPHEREX_PIXEL_SOLID_ANGLE_SR = Math.pow((6.2 / 3600) * (Math.PI / 180), 2);

/**
 * Convert SPHEREx surface brightness in MJy/sr to flux density in microJanskys (uJy)
 * @param {number} surfaceBrightnessMJyPerSr - value from FITS image
 * @param {number} pixelCount - number of pixels in aperture
 * @returns {number} flux in microJanskys (uJy)
 */
export function surfaceBrightnessToFluxUJy(surfaceBrightnessMJyPerSr, pixelCount = 1) {
  // 1 MJy = 10^12 uJy
  // Flux = I_nu * Omega = I_nu * (pixelCount * Omega_pix) * 10^12 uJy
  return surfaceBrightnessMJyPerSr * (pixelCount * SPHEREX_PIXEL_SOLID_ANGLE_SR) * 1e12;
}

/**
 * Convert flux in microJanskys (uJy) to AB magnitude
 * m_AB = -2.5 * log10(F_uJy / 3.631e9)
 */
export function fluxUJyToAbMag(fluxUJy) {
  if (fluxUJy <= 0 || isNaN(fluxUJy)) return null;
  return -2.5 * Math.log10(fluxUJy / 3.631e9);
}

/**
 * Convert AB magnitude to flux in microJanskys (uJy)
 */
export function abMagToFluxUJy(abMag) {
  if (abMag === null || isNaN(abMag)) return 0;
  return 3.631e9 * Math.pow(10, -0.4 * abMag);
}

