/* Mars24 / Allison & McEwen (2000), NASA GISS algorithm A-1 through D-6:
   https://www.giss.nasa.gov/tools/mars24/help/algorithm.html
   Fixed TT-UTC as requested; geometric sun, no terrain/refraction corrections.
   Latitude is used on a spherical Mars (planetocentric site coordinates). */
'use strict';

// Unit definitions and Mars24 A-2, A-5, A-6, C-2 constants.
const MC = Object.freeze({
  turnDeg: 360, halfTurnDeg: 180, quarterTurnDeg: 90, hoursPerSol: 24,
  noonHours: 12, minutesPerHour: 60, secondsPerDay: 86400, msPerDay: 86400000,
  ttMinusUtcSeconds: 69.184, unixJd: 2440587.5, j2000Jd: 2451545,
  msdEpochJd: 2451549.5, earthDaysPerSol: 1.0274912517,
  msdEpoch: 44796, msdCorrection: 0.0009626,
  // User's site and MSL landing longitude; landing local-sol index is 49269.
  siteLatDeg: -4.808, siteLonEastDeg: 137.372,
  landingLonEastDeg: 137.4417, mslLocalSolEpoch: 49269,
  // Clancy MY1 = 1955-04-11; the Ls revolution containing J2000 is MY24.
  j2000MarsYear: 24,
  // Mars24 B-1/B-2/B-3/B-4/C-1/D-1, coefficients in degrees and days.
  anomalyEpochDeg: 19.3871, anomalyRateDeg: 0.52402073,
  fmsEpochDeg: 270.3871, fmsRateDeg: 0.524038496, perturberRateDeg: 0.985626,
  centerDeg: 10.691, centerRateDeg: 3e-7,
  centerHarmonicsDeg: [0.623, 0.050, 0.005, 0.0005],
  eotHarmonicsDeg: [2.861, -0.071, 0.002],
  declinationSine: 0.42565, declinationCorrectionDeg: 0.25,
  perturbers: [[0.0071, 2.2353, 49.409], [0.0057, 2.7543, 168.173],
    [0.0039, 1.1177, 191.837], [0.0037, 15.7866, 21.736],
    [0.0021, 2.1354, 15.704], [0.0020, 2.4694, 95.528], [0.0018, 32.8493, 49.095]],
  // Numerical choices: five-Mars-minute curve; one-minute event scan; noon iteration.
  trackStepMinutes: 5, eventStepMinutes: 1, noonIterations: 5,
  // UI design choices (CSS pixels) and requested refresh interval.
  refreshMs: 10000, padLeft: 36, padRight: 12, padTop: 30, padBottom: 26,
  tickHours: 6, lineWidth: 1.5, evaOpacity: 0.18, labelGap: 4, fontPx: 10,
  labelDigits: 2
});
const MC_RAD = Math.PI / MC.halfTurnDeg;
const MC_DEG_PER_HOUR = MC.turnDeg / MC.hoursPerSol;
const MC_SEASONS = ['spring', 'summer', 'autumn', 'winter'];

// Wrap a numeric value to [0, period); returns a nonnegative number.
function mcMod(value, period) { return ((value % period) + period) % period; }
// Take an angle in degrees and return its sine.
function mcSin(angleDeg) { return Math.sin(angleDeg * MC_RAD); }
// Take an angle in degrees and return its cosine.
function mcCos(angleDeg) { return Math.cos(angleDeg * MC_RAD); }

// Convert a UTC Date and east longitude/latitude in degrees to Mars clock and sun data.
function marsTime(dateUtc, lonEastDeg, latDeg) {
  if (!dateUtc || !Number.isFinite(dateUtc.getTime()) || !Number.isFinite(lonEastDeg) ||
      !Number.isFinite(latDeg) || Math.abs(latDeg) > MC.quarterTurnDeg) {
    throw new RangeError('Expected a valid UTC Date, finite longitude and latitude within ±90°.');
  }
  const jdUt = MC.unixJd + dateUtc.getTime() / MC.msPerDay;
  const jdTt = jdUt + MC.ttMinusUtcSeconds / MC.secondsPerDay;
  const daysJ2000 = jdTt - MC.j2000Jd;
  const meanAnomalyDeg = MC.anomalyEpochDeg + MC.anomalyRateDeg * daysJ2000;
  const fmsDeg = MC.fmsEpochDeg + MC.fmsRateDeg * daysJ2000;
  const pbsDeg = MC.perturbers.reduce((sum, term) => sum +
    term[0] * mcCos(MC.perturberRateDeg * daysJ2000 / term[1] + term[2]), 0);
  const equationOfCenterDeg = (MC.centerDeg + MC.centerRateDeg * daysJ2000) *
    mcSin(meanAnomalyDeg) + MC.centerHarmonicsDeg.reduce((sum, amplitude, i) =>
    sum + amplitude * mcSin((i + 2) * meanAnomalyDeg), pbsDeg);
  const unwrappedLsDeg = fmsDeg + equationOfCenterDeg;
  const lsDeg = mcMod(unwrappedLsDeg, MC.turnDeg);
  const equationOfTimeDeg = MC.eotHarmonicsDeg.reduce((sum, amplitude, i) =>
    sum + amplitude * mcSin(2 * (i + 1) * lsDeg), -equationOfCenterDeg);
  const msd = (jdTt - MC.msdEpochJd) / MC.earthDaysPerSol + MC.msdEpoch - MC.msdCorrection;
  const mtcHours = mcMod(MC.hoursPerSol * msd, MC.hoursPerSol);
  const lonWestDeg = MC.turnDeg - mcMod(lonEastDeg, MC.turnDeg);
  const lmstHours = mcMod(mtcHours - lonWestDeg / MC_DEG_PER_HOUR, MC.hoursPerSol);
  const ltstHours = mcMod(lmstHours + equationOfTimeDeg / MC_DEG_PER_HOUR, MC.hoursPerSol);
  const subsolarLonEastDeg = mcMod(-(mtcHours * MC_DEG_PER_HOUR + equationOfTimeDeg +
    MC.halfTurnDeg), MC.turnDeg);
  const solarDeclinationDeg = Math.asin(MC.declinationSine * mcSin(lsDeg)) / MC_RAD +
    MC.declinationCorrectionDeg * mcSin(lsDeg);
  const hourAngleDeg = (ltstHours - MC.noonHours) * MC_DEG_PER_HOUR;
  const sinElevation = mcSin(latDeg) * mcSin(solarDeclinationDeg) +
    mcCos(latDeg) * mcCos(solarDeclinationDeg) * mcCos(hourAngleDeg);
  const sunElevationDeg = Math.asin(Math.max(-1, Math.min(1, sinElevation))) / MC_RAD;
  // East-positive hour angle has the opposite sign to Mars24's west-longitude H.
  const sunAzimuthDeg = mcMod(Math.atan2(-mcSin(hourAngleDeg),
    mcCos(latDeg) * Math.tan(solarDeclinationDeg * MC_RAD) -
    mcSin(latDeg) * mcCos(hourAngleDeg)) / MC_RAD, MC.turnDeg);
  const mslSol = Math.floor(msd + MC.landingLonEastDeg / MC.turnDeg) - MC.mslLocalSolEpoch;
  const marsYear = Math.floor(unwrappedLsDeg / MC.turnDeg) + MC.j2000MarsYear;
  return { jdUt, jdTt, msd, mtcHours, lmstHours, ltstHours, lsDeg,
    subsolarLonEastDeg, solarDeclinationDeg, sunElevationDeg, sunAzimuthDeg,
    mslSol, seasonName: MC_SEASONS[Math.floor(lsDeg / MC.quarterTurnDeg)], marsYear,
    equationOfTimeDeg, equationOfCenterDeg, pbsDeg, meanAnomalyDeg, fmsDeg };
}

// Return the UTC Date at an LMST hour in this longitude's current local sol; 24 is its end.
function lmstToUtc(dateUtcOfThisSol, lonEastDeg, lmstHours) {
  if (!Number.isFinite(lmstHours) || lmstHours < 0 || lmstHours > MC.hoursPerSol) {
    throw new RangeError('LMST hours must be between 0 and 24.');
  }
  const current = marsTime(dateUtcOfThisSol, lonEastDeg, 0);
  return new Date(Math.round(dateUtcOfThisSol.getTime() + (lmstHours - current.lmstHours) *
    MC.earthDaysPerSol * MC.msPerDay / MC.hoursPerSol));
}

// Sample geometric sun elevation across the current local sol, including both endpoints.
function sunTrack(dateUtc, lonEastDeg, latDeg, stepMinutes = MC.trackStepMinutes) {
  if (!Number.isFinite(stepMinutes) || stepMinutes <= 0) throw new RangeError('Step must be positive.');
  const count = Math.ceil(MC.hoursPerSol * MC.minutesPerHour / stepMinutes);
  const startUtc = lmstToUtc(dateUtc, lonEastDeg, 0);
  const track = [];
  for (let i = 0; i <= count; i++) {
    const lmstHours = Math.min(MC.hoursPerSol, i * stepMinutes / MC.minutesPerHour);
    const utc = new Date(startUtc.getTime() + lmstHours / MC.hoursPerSol * MC.earthDaysPerSol * MC.msPerDay);
    track.push({ lmstHours, sunElevationDeg: marsTime(utc, lonEastDeg, latDeg).sunElevationDeg });
  }
  return track;
}

// Return interpolated horizon crossings (null for absent events), true noon and peak elevation.
function daylight(dateUtc, lonEastDeg, latDeg) {
  const track = sunTrack(dateUtc, lonEastDeg, latDeg, MC.eventStepMinutes);
  let sunriseLmst = null, sunsetLmst = null, noonLmst = MC.noonHours;
  let maxElevationDeg = -MC.quarterTurnDeg;
  track.forEach((point, i) => {
    maxElevationDeg = Math.max(maxElevationDeg, point.sunElevationDeg);
    if (!i) return;
    const previous = track[i - 1];
    const a = previous.sunElevationDeg, b = point.sunElevationDeg;
    if ((a < 0 && b >= 0) || (a >= 0 && b < 0)) {
      const crossing = previous.lmstHours + (point.lmstHours - previous.lmstHours) * -a / (b - a);
      if (b > a) sunriseLmst = crossing; else sunsetLmst = crossing;
    }
  });
  for (let i = 0; i < MC.noonIterations; i++) {
    const sun = marsTime(lmstToUtc(dateUtc, lonEastDeg, noonLmst), lonEastDeg, latDeg);
    noonLmst = MC.noonHours - sun.equationOfTimeDeg / MC_DEG_PER_HOUR;
  }
  maxElevationDeg = Math.max(maxElevationDeg,
    marsTime(lmstToUtc(dateUtc, lonEastDeg, noonLmst), lonEastDeg, latDeg).sunElevationDeg);
  return { sunriseLmst, sunsetLmst, noonLmst, maxElevationDeg };
}

// Read the configured study site, or return the supplied Gale Crater fallback coordinates.
function mcSite() {
  const site = typeof CONFIG !== 'undefined' && CONFIG.studyArea;
  return { lon: site && Number.isFinite(site.centerLon) ? site.centerLon : MC.siteLonEastDeg,
    lat: site && Number.isFinite(site.centerLat) ? site.centerLat : MC.siteLatDeg };
}

// Format fractional Mars hours as HH:MM; a missing sunrise/sunset is shown as an em dash.
function mcFormatHours(hours) {
  if (hours === null) return '—';
  const minutes = Math.floor(mcMod(hours, MC.hoursPerSol) * MC.minutesPerHour);
  return String(Math.floor(minutes / MC.minutesPerHour)).padStart(MC.labelDigits, '0') + ':' +
    String(minutes % MC.minutesPerHour).padStart(MC.labelDigits, '0');
}

// Insert the live header clock once and expose the current site clock through window.MARS_CLOCK.
function initMarsClock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  // Read the site each call so changes to CONFIG are reflected in the exposed clock.
  window.MARS_CLOCK = { now: () => { const site = mcSite(); return marsTime(new Date(), site.lon, site.lat); } };
  const header = document.getElementById('top-bar');
  if (!header || header.querySelector('.mc-clock')) return;
  const clock = document.createElement('div');
  clock.className = 'mc-clock';
  clock.setAttribute('role', 'timer');
  clock.innerHTML = '<span class="mc-sun" aria-hidden="true">☼</span>' +
    '<strong class="mc-sol"></strong><span class="mc-time"></span><span class="mc-season"></span>';
  const button = header.querySelector('button');
  header.insertBefore(clock, button ? button.closest('#top-bar > *') : null);
  // Refresh the existing nodes with current Mars values; no animation or focus changes.
  function updateClock() {
    const now = window.MARS_CLOCK.now();
    clock.querySelector('.mc-sol').textContent = 'SOL ' + now.mslSol;
    clock.querySelector('.mc-time').textContent = 'LMST ' + mcFormatHours(now.lmstHours);
    const _nIdx = MC_SEASONS.indexOf(now.seasonName);
    const _sName = MC_SEASONS[(_nIdx + 2) % 4];
    clock.querySelector('.mc-season').textContent = 'Ls ' + Math.floor(now.lsDeg) + '° · N. ' + now.seasonName + ' / S. ' + _sName;
    clock.querySelector('.mc-sun').textContent = now.sunElevationDeg > 0 ? '☀' : '☼';
    clock.classList.toggle('mc-day', now.sunElevationDeg > 0);
    clock.title = 'SOL: Curiosity mission sol, counted at landing-site mean midnight. ' +
      'LMST: local mean solar time at the study site. Ls: areocentric solar longitude; N.: northern season; S.: southern season (Gale Crater ~4.6°S). ' +
      'Sun: ' + (now.sunElevationDeg > 0 ? 'above' : 'below') + ' the geometric horizon. ' +
      'Mars24 (Allison & McEwen 2000); fixed TT−UTC 69.184 s. ' +
      'https://www.giss.nasa.gov/tools/mars24/help/algorithm.html';
    clock.setAttribute('aria-label', clock.textContent + '. ' + (now.sunElevationDeg > 0 ? 'Sun up.' : 'Night.'));
  }
  updateClock();
  window.setInterval(updateClock, MC.refreshMs);
}

// Draw today's sun curve and a possibly midnight-wrapping EVA window (in LMST hours) on a canvas.
function drawSunChart(canvasId, evaStartLmstHours, evaHours) {
  if (typeof document === 'undefined') return;
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const box = canvas.getBoundingClientRect(), width = box.width, height = box.height;
  if (width <= MC.padLeft + MC.padRight || height <= MC.padTop + MC.padBottom) return;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const site = mcSite(), dateUtc = new Date();
  const track = sunTrack(dateUtc, site.lon, site.lat), light = daylight(dateUtc, site.lon, site.lat);
  // Convert LMST and elevation to CSS-pixel positions in the plot rectangle.
  const x = hours => MC.padLeft + hours / MC.hoursPerSol * (width - MC.padLeft - MC.padRight);
  const y = elevationDeg => MC.padTop + (MC.quarterTurnDeg - elevationDeg) / MC.halfTurnDeg *
    (height - MC.padTop - MC.padBottom);
  // Palette: read CSS tokens at draw time so they stay in sync with the UI theme.
  const _t = (typeof getThemeTokens === 'function') ? getThemeTokens() : {};
  const MC_BG = _t.bg || '#100E0D', MC_MUTED = _t.muted || '#9E9890', MC_TEXT = _t.text || '#EAE7E2';
  const MC_ROUTE = _t.route || '#3FD0C9', MC_ACCENT = _t.accent || '#B07D4A', MC_BORDER = _t.border || '#2D2A28';
  ctx.fillStyle = MC_BG; ctx.fillRect(0, 0, width, height);
  if (Number.isFinite(evaStartLmstHours) && Number.isFinite(evaHours) && evaHours > 0) {
    const start = mcMod(evaStartLmstHours, MC.hoursPerSol), duration = Math.min(evaHours, MC.hoursPerSol);
    ctx.fillStyle = MC_ACCENT; ctx.globalAlpha = MC.evaOpacity;
    [[start, Math.min(start + duration, MC.hoursPerSol)], [0, Math.max(0, start + duration - MC.hoursPerSol)]]
      .forEach(range => ctx.fillRect(x(range[0]), MC.padTop, x(range[1]) - x(range[0]), y(-MC.quarterTurnDeg) - MC.padTop));
    ctx.globalAlpha = 1;
  }
  ctx.font = MC.fontPx + 'px ui-monospace, monospace'; ctx.lineWidth = MC.lineWidth;
  [-MC.quarterTurnDeg, 0, MC.quarterTurnDeg].forEach(elevationDeg => {
    ctx.strokeStyle = elevationDeg === 0 ? MC_MUTED : MC_BORDER;
    ctx.beginPath(); ctx.moveTo(x(0), y(elevationDeg)); ctx.lineTo(x(MC.hoursPerSol), y(elevationDeg)); ctx.stroke();
    ctx.fillStyle = MC_MUTED; ctx.textAlign = 'right';
    ctx.fillText(elevationDeg + '°', MC.padLeft - MC.labelGap, y(elevationDeg));
  });
  ctx.strokeStyle = MC_ROUTE; ctx.beginPath();
  track.forEach((point, i) => { if (i) ctx.lineTo(x(point.lmstHours), y(point.sunElevationDeg));
    else ctx.moveTo(x(point.lmstHours), y(point.sunElevationDeg)); });
  ctx.stroke(); ctx.fillStyle = MC_MUTED;
  for (let hour = 0; hour <= MC.hoursPerSol; hour += MC.tickHours) {
    ctx.textAlign = hour === MC.hoursPerSol ? 'right' : 'center';
    ctx.fillText(hour < MC.hoursPerSol ? String(hour) : String(hour) + ' h LMST', x(hour), height - MC.labelGap);
  }
  ctx.textAlign = 'left'; ctx.fillStyle = MC_TEXT;
  const caption = 'Sun · LMST | Rise ' + mcFormatHours(light.sunriseLmst) + ' / Set ' + mcFormatHours(light.sunsetLmst);
  ctx.fillText(caption, MC.labelGap, MC.padTop - MC.fontPx, width - MC.labelGap);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', caption + '. Elevation in degrees. Shading marks the EVA window.');
}

if (typeof module !== 'undefined') module.exports = { marsTime, sunTrack, daylight, lmstToUtc, initMarsClock, drawSunChart };
