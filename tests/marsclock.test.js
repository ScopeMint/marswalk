'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { marsTime, sunTrack, daylight, lmstToUtc, drawSunChart } = require('../src/js/marsclock.js');
const LON = 137.372, LAT = -4.808; // User-supplied boxwork site, degrees east/planetocentric.
const TOL = 1e-3; // Required agreement with published rounded values.
let checks = 0;

// Assert finite numeric agreement and count the successful check.
function near(actual, expected, tolerance = TOL) {
  assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`);
  checks++;
}
// Assert equality and count the successful check.
function equal(actual, expected) { assert.strictEqual(actual, expected); checks++; }

// NASA GISS Mars24 worked example, https://www.giss.nasa.gov/tools/mars24/help/algorithm.html.
// The published example uses 64.184 s in 2000, whereas this module is required to use 69.184 s.
// First verify the unmodified 2000-01-06 UTC input with the requested modern fixed offset.
const exampleUtc = new Date('2000-01-06T00:00:00Z');
const modern = marsTime(exampleUtc, 0, 0);
near(modern.jdUt, 2451549.5);
near(modern.jdTt, 2451549.5 + 69.184 / 86400, 1e-9);
near(modern.msd, 44795.9998);
near(modern.lsDeg, 277.18758);
near(modern.equationOfTimeDeg, -5.18774);
// Five extra TT seconds advance mean Mars time and shift subsolar longitude.
const extraMarsHours = 5 / (3600 * 1.0274912517);
near(modern.mtcHours, 23.99425 + extraMarsHours);
near(modern.subsolarLonEastDeg, 360 - 174.72600 - 15 * extraMarsHours);

// Align TT instants explicitly, without altering production code or claiming UTC values match.
const historical = marsTime(new Date(exampleUtc.getTime() - 5000), 0, 0);
const reference = { jdTt: 2451549.50074, msd: 44795.9998, meanAnomalyDeg: 21.74558,
  fmsDeg: 272.74566, pbsDeg: 0.00142, equationOfCenterDeg: 4.44193,
  lsDeg: 277.18758, equationOfTimeDeg: -5.18774, mtcHours: 23.99425,
  lmstHours: 23.99425, ltstHours: 23.64840, subsolarLonEastDeg: 360 - 174.72600,
  solarDeclinationDeg: -25.22825, sunElevationDeg: 90 - 154.26182, sunAzimuthDeg: 191.03905 };
Object.keys(reference).forEach(key => near(historical[key], reference[key]));

// User-provided real-image UTC ranges; every endpoint must be on its labelled daytime sol.
const images = [
  [4548, '2025-05-23T03:49:56Z', '2025-05-23T07:31:51Z'],
  [4571, '2025-06-15T11:44:21Z', '2025-06-16T00:19:28Z'],
  [4711, '2025-11-06T09:55:42Z', '2025-11-06T20:21:09Z'],
  [5073, '2026-11-13T12:15:37Z', '2026-11-13T16:01:24Z']
];
images.forEach(([sol, ...timestamps]) => timestamps.forEach(timestamp => {
  const time = marsTime(new Date(timestamp), LON, LAT);
  equal(time.mslSol, sol);
  assert(time.lmstHours >= 5 && time.lmstHours <= 19, `${timestamp}: LMST ${time.lmstHours}`);
  checks++;
}));
equal(marsTime(new Date('2012-08-06T05:17:57Z'), LON, LAT).mslSol, 0);
// Clancy MY1 began on April 11, at the vernal equinox (not necessarily UTC midnight).
equal(marsTime(new Date('1955-04-11T12:00:00Z'), LON, LAT).marsYear, 1);
equal(marsTime(exampleUtc, LON, LAT).marsYear, 24);
equal(marsTime(new Date('2026-11-13T12:15:37Z'), LON, LAT).marsYear, 39);

const todayUtc = new Date('2026-11-13T12:15:37Z');
const light = daylight(todayUtc, LON, LAT);
const noon = marsTime(lmstToUtc(todayUtc, LON, light.noonLmst), LON, LAT);
near(noon.ltstHours, 12);
near(noon.sunElevationDeg, 90 - Math.abs(LAT - noon.solarDeclinationDeg), 0.5);
near(light.maxElevationDeg, noon.sunElevationDeg, 0.01);
[light.sunriseLmst, light.sunsetLmst].forEach(hour => {
  assert(hour !== null); checks++;
  near(marsTime(lmstToUtc(todayUtc, LON, hour), LON, LAT).sunElevationDeg, 0, 0.01);
});
const morning = marsTime(lmstToUtc(todayUtc, LON, 8), LON, LAT);
const afternoon = marsTime(lmstToUtc(todayUtc, LON, 16), LON, LAT);
assert(morning.sunAzimuthDeg > 0 && morning.sunAzimuthDeg < 180); checks++;
assert(afternoon.sunAzimuthDeg > 180 && afternoon.sunAzimuthDeg < 360); checks++;
[1, 6, 12, 23.999].forEach(hour => near(marsTime(lmstToUtc(todayUtc, LON, hour), LON, LAT).lmstHours, hour));
const startUtc = lmstToUtc(todayUtc, LON, 0), endUtc = lmstToUtc(todayUtc, LON, 24);
near(endUtc - startUtc, 86400000 * 1.0274912517, 1);
const track = sunTrack(todayUtc, LON, LAT, 7);
equal(track[0].lmstHours, 0);
equal(track[track.length - 1].lmstHours, 24);
near(track[0].sunElevationDeg, marsTime(startUtc, LON, LAT).sunElevationDeg);
near(track[track.length - 1].sunElevationDeg, marsTime(endUtc, LON, LAT).sunElevationDeg);
// Mission sols roll at the landing longitude, even if the caller asks about another site.
const landingMidnight = lmstToUtc(todayUtc, 137.4417, 0);
equal(marsTime(new Date(+landingMidnight - 1000), 0, 0).mslSol, 5072);
equal(marsTime(new Date(+landingMidnight + 1000), 0, 0).mslSol, 5073);
near(marsTime(todayUtc, LON - 360, LAT).lmstHours, marsTime(todayUtc, LON, LAT).lmstHours);
[90, -90].forEach(latDeg => {
  const polar = daylight(todayUtc, LON, latDeg);
  equal(polar.sunriseLmst, null); equal(polar.sunsetLmst, null);
});
assert.throws(() => sunTrack(todayUtc, LON, LAT, 0), RangeError); checks++;
assert.throws(() => marsTime(new Date('invalid'), LON, LAT), RangeError); checks++;
drawSunChart('missing', 8, 6); checks++;

// Smoke-test browser globals and CONFIG's lexical binding with a minimal header/canvas stub.
const parts = {}, attributes = {}, timers = [], operations = [];
let inserted = null;
const button = { closest: () => button };
const header = { querySelector: selector => selector === 'button' ? button : inserted,
  insertBefore: (element, before) => { equal(before, button); inserted = element; } };
const ctx = new Proxy({}, { get: (target, key) => target[key] || ((...args) => operations.push([key, ...args])) });
const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: 400, height: 160 }),
  setAttribute: (key, value) => { attributes[key] = value; } };
const sandbox = { window: { devicePixelRatio: 2, setInterval: (fn, delay) => timers.push({ fn, delay }) },
  document: { getElementById: id => id === 'top-bar' ? header : id === 'sun' ? canvas : null,
    createElement: () => ({ setAttribute: () => {}, classList: { toggle: () => {} },
      querySelector: selector => parts[selector] || (parts[selector] = {}) }) } };
vm.createContext(sandbox);
vm.runInContext('const CONFIG = {studyArea: {centerLon: 0, centerLat: 0}};', sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/js/marsclock.js'), 'utf8'), sandbox);
sandbox.initMarsClock(); sandbox.initMarsClock();
equal(timers.length, 1); equal(timers[0].delay, 10000);
const configured = sandbox.window.MARS_CLOCK.now();
near(configured.lmstHours, configured.mtcHours);
assert(/^SOL /.test(parts['.mc-sol'].textContent)); checks++;
sandbox.drawSunChart('missing', 8, 6); checks++;
sandbox.drawSunChart('sun', 22, 4);
equal(canvas.width, 800); equal(canvas.height, 320);
assert(operations.some(op => op[0] === 'lineTo')); checks++;
assert(attributes['aria-label'].includes('Rise')); checks++;
console.log(`PASS: ${checks} checks — Mars24 reference (historical TT adjustment explicit), 8 image timestamps,`);
console.log('landing/sol boundaries, true noon, daylight, polar events, UTC round trips and widget/chart smoke tests.');
console.log('MSL: floor(MSD + 137.4417 / 360) - 49269 = floor(MSD - 49268.6182175).');
