/* safety.js — Radiation estimate, temperature range, EVA budget, safety checklist.
   All sourced numbers come from data files (rad-baseline.json, rems-temps.json).
   Never hard-code these numbers here — they live in the data files with their citations.
   Depends on: config.js (CONFIG), state.js (STATE). */

/* Loads radiation baseline from data/rad-baseline.json. Stores in STATE.radBaseline. */
async function loadRadBaseline() {
  try {
    const resp = await fetch('./data/rad-baseline.json');
    if (!resp.ok) throw new Error(`rad-baseline.json: ${resp.status}`);
    STATE.radBaseline = await resp.json();
    console.log(`[safety] rad baseline: ${STATE.radBaseline.doseRateMuGyPerDay} μGy/day (${STATE.radBaseline.citation})`);
  } catch (err) {
    console.error('[safety] could not load rad-baseline.json:', err);
    STATE.radBaseline = null;
  }
}

/* Loads REMS temperature data from data/rems-temps.json. Stores in STATE.remsTemps. */
async function loadRemsTemps() {
  try {
    const resp = await fetch('./data/rems-temps.json');
    if (!resp.ok) throw new Error(`rems-temps.json: ${resp.status}`);
    STATE.remsTemps = await resp.json();
    console.log('[safety] REMS temps loaded');
  } catch (err) {
    console.error('[safety] could not load rems-temps.json:', err);
    STATE.remsTemps = null;
  }
}

/* Computes the radiation dose estimate for a given EVA duration.
   Returns { doseEstimateMuGy, source, doi, note } or null if data not loaded. */
function computeRadiation(evaHoursUsed) {
  if (!STATE.radBaseline) return null;
  const dose = STATE.radBaseline.doseRateMuGyPerDay * (evaHoursUsed / 24);
  const range = STATE.radBaseline.rangeMuGyPerDay;
  return {
    // Whole μGy: the baseline itself is ±19%, so decimals would be false precision.
    doseEstimateMuGy: Math.round(dose),
    doseLowMuGy:  range ? Math.round(range[0] * evaHoursUsed / 24) : null,
    doseHighMuGy: range ? Math.round(range[1] * evaHoursUsed / 24) : null,
    source: STATE.radBaseline.citation,
    doi:    STATE.radBaseline.doi,
    note:   STATE.radBaseline.screenNote +
            (STATE.radBaseline.largestSurfaceEvent
              ? ' Space weather: ' + STATE.radBaseline.largestSurfaceEvent.note + ' (' + STATE.radBaseline.largestSurfaceEvent.source + ')'
              : '')
  };
}

/* Today's Mars season at the study site, from the Mars clock (marsclock.js).
   Returns { key, lsDeg, label, ltstMinusLmstHours }. key matches a season in rems-temps.json:
   Ls 0-180 -> 'northern_spring_summer' (COOLER half at Gale, 4.8° S),
   Ls 180-360 -> 'northern_autumn_winter' (WARMER half at Gale: perihelion, southern spring/summer).
   ltstMinusLmstHours converts the EVA start time (LMST, mean clock) to LTST (sun clock, used by REMS). */
function currentSeason(dateUtc = new Date()) {
  try {
    const site = mcSite();
    const t = marsTime(dateUtc, site.lon, site.lat);
    const key = t.lsDeg < 180 ? 'northern_spring_summer' : 'northern_autumn_winter';
    let eot = t.ltstHours - t.lmstHours;
    if (eot > 12) eot -= 24; else if (eot < -12) eot += 24;
    return { key, lsDeg: t.lsDeg, ltstMinusLmstHours: eot,
             label: (t.lsDeg < 180 ? 'cooler half of the Mars year at Gale' : 'warmer half of the Mars year at Gale') };
  } catch (e) {
    return { key: 'northern_spring_summer', lsDeg: NaN, ltstMinusLmstHours: 0, label: 'season unknown' };
  }
}

/* Linear interpolation of a 24-value hourly array at a fractional hour (wraps at midnight). */
function _hourlyAt(values, hour) {
  const h = ((hour % 24) + 24) % 24, i = Math.floor(h), f = h - i;
  return values[i] * (1 - f) + values[(i + 1) % 24] * f;
}

/* Computes min/max air temperature over the EVA window.
   evaStartHour: EVA start in LMST hours (the clock on the start-time slider). evaHours: duration.
   season: a key in rems-temps.json; defaults to today's season at Gale (currentSeason()).
   Samples every 10 minutes and converts LMST -> LTST, because REMS hours are LTST.
   Returns { minC, maxC, source, note, seasonKey } or null if data not loaded. */
function computeTemperatureRange(evaStartHour, evaHours, season) {
  if (!STATE.remsTemps) return null;
  const now = currentSeason();
  const key = season || now.key;
  const seasonData = STATE.remsTemps.seasons[key];
  if (!seasonData) return null;

  const temps = seasonData.airTempC;
  const shift = (STATE.remsTemps.clock || '').startsWith('LTST') ? now.ltstMinusLmstHours : 0;
  const stepH = 1 / 6;
  const evaTemps = [];
  for (let t = 0; t <= Math.min(evaHours, 24) + 1e-9; t += stepH) {
    evaTemps.push(_hourlyAt(temps, evaStartHour + t + shift));
  }

  return {
    minC:   Math.round(Math.min(...evaTemps)),
    maxC:   Math.round(Math.max(...evaTemps)),
    seasonKey: key,
    source: STATE.remsTemps.source,
    note:   `${STATE.remsTemps.note} Season: ${seasonData.lsSeason} (${now.key === key ? now.label : key}).`
  };
}

/* Runs the full safety checklist given a route result and EVA parameters.
   Returns an array of checklist items: { label, status, detail, source? }.
   status: 'pass' | 'caution' | 'fail' | 'info' */
function runSafetyChecklist(route, evaParams) {
  const items = [];

  if (!route || route.status !== 'ok') {
    return [{ label: 'Route', status: 'fail', detail: route ? route.message : 'No route computed.' }];
  }

  const { distanceMeters, timeSeconds, steepestDeg, climbMeters, descentMeters } = route;
  const { slopeLimitDeg, evaHours, speedKmh, evaStartHour, season } = evaParams;
  const workMinutes = CONFIG.eva.workMinutes;
  const reserveFrac = CONFIG.eva.reserveFraction;

  const outMinutes    = timeSeconds / 60;
  const workMinutesUsed = workMinutes;
  // Use real Dijkstra walkback time if passed in; fallback to symmetric (outbound = walkback)
  const backMinutes  = (evaParams.walkbackMinutes && evaParams.walkbackMinutes > 0)
    ? evaParams.walkbackMinutes : outMinutes;
  const totalUsedMinutes = outMinutes + workMinutesUsed + backMinutes;
  const totalEvaMinutes  = evaHours * 60;
  const budgetFraction   = totalUsedMinutes / totalEvaMinutes;

  // 1. Slope within limit
  items.push({
    label:  'Slope within limit',
    status: steepestDeg <= slopeLimitDeg ? 'pass' : 'fail',
    detail: `Steepest: ${steepestDeg.toFixed(1)}° / limit: ${slopeLimitDeg}°`
  });

  // 2. Round trip fits EVA + reserve
  let evaStatus = 'pass';
  if (budgetFraction > 0.90) evaStatus = 'fail';
  else if (budgetFraction > 0.75) evaStatus = 'caution';
  items.push({
    label:  'Round trip fits EVA',
    status: evaStatus,
    detail: `Used: ${(budgetFraction * 100).toFixed(0)}% of ${evaHours} h (≤75% = safe, ≤90% = caution)`
  });

  // 3. Reserve kept
  const reserveOk = (1 - budgetFraction) >= reserveFrac;
  items.push({
    label:  `Reserve ≥${reserveFrac * 100}%`,
    status: reserveOk ? 'pass' : 'fail',
    detail: `Reserve: ${((1 - budgetFraction) * 100).toFixed(0)}%  [our assumption: ${reserveFrac * 100}% required]`
  });

  // 4. Radiation estimate (always info — no pass/fail without a cited EVA dose limit)
  const rad = computeRadiation(evaHours);
  if (rad) {
    items.push({
      label:  'Radiation (baseline estimate)',
      status: 'info',
      detail: `~${rad.doseEstimateMuGy} μGy for ${evaHours} h EVA`,
      source: rad.source,
      note:   rad.note
    });
  } else {
    items.push({ label: 'Radiation', status: 'info', detail: 'Data not loaded — refresh.' });
  }

  // 5. Temperature (always info — suit limits not modeled)
  const temp = computeTemperatureRange(evaStartHour || 8, evaHours, season);
  if (temp) {
    items.push({
      label:  'Temperature range',
      status: 'info',
      detail: `${temp.minC}°C to ${temp.maxC}°C during EVA window`,
      source: temp.source,
      note:   temp.note
    });
  } else {
    items.push({ label: 'Temperature', status: 'info', detail: 'REMS data not loaded.' });
  }

  // 6. Amber warnings (caution-class)
  const straightLineM = Math.sqrt(
    Math.pow((route.cells[route.cells.length-1].row - route.cells[0].row) * (STATE.grids.aoi ? STATE.grids.aoi.cellSizeMeters : CONFIG.grid.cellSizeMeters), 2) +
    Math.pow((route.cells[route.cells.length-1].col - route.cells[0].col) * (STATE.grids.aoi ? STATE.grids.aoi.cellSizeMeters : CONFIG.grid.cellSizeMeters), 2)
  );
  if (straightLineM > 0 && distanceMeters > 1.5 * straightLineM) {
    items.push({
      label:  'Route is a large detour',
      status: 'caution',
      detail: `Route is ${(distanceMeters / straightLineM).toFixed(1)}× the straight-line distance. Consider adjusting slope limit.`
    });
  }

  if (steepestDeg >= slopeLimitDeg - 2) {
    items.push({
      label:  'Near slope limit',
      status: 'caution',
      detail: `Steepest slope (${steepestDeg.toFixed(1)}°) is within 2° of the limit (${slopeLimitDeg}°).`
    });
  }

  return items;
}

/* Loads both safety data files. Called from main.js after initApp starts. */
async function initSafety() {
  await Promise.all([loadRadBaseline(), loadRemsTemps()]);
  console.log('[safety] ready');
}
