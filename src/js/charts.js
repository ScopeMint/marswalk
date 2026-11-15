/* charts.js — The three bottom charts, redrawn so they are clear, exact and explorable.
   Depends on: state.js (STATE), profile.js (replaces its drawProfile / clearProfile / drawTempChart),
   marsclock.js (sunTrack, daylight, mcSite, mcFormatHours; replaces its drawSunChart), grid.js (cellToLatLon),
   safety.js (computeTemperatureRange). Styles: css/charts.css. Call initCharts() near the end of main.js.

   Each chart has:
     - a header ABOVE the plot (title, what the colours mean, and a live readout), so no text sits on the data;
     - labelled axes with units and round-number ticks;
     - a point you can move (hover, drag, tap, or arrow keys) that reads the exact value at that spot.
   The numbers are not recalculated here. They come from the same places as the rest of the app:
     elevation  = STATE.route.profile (the planner's route),   temperature = STATE.remsTemps (Curiosity REMS),
     sun height = sunTrack() in marsclock.js (Mars24 algorithm). */

const CHART_HEAD_PX = 50;                                   // height of the two-line header above each plot (see charts.css)
const CHART_PAD = { top: 10, right: 14, bottom: 34, left: 54 };   // room for tick labels and axis titles
const CHART_COLORS = { bg: '#0F1115', grid: '#262B35', axis: '#A3A8B3', text: '#E8E6E3', teal: '#3FD0C9',
                       orange: '#E8908A', amber: '#F2B134', blue: '#7FB4FF', accent: '#8FB3DE' };   // 'orange' key = warm-season curve (soft red)
const CHART_STEEP_GRADE_DEG = 10;                           // route sections steeper than this are drawn amber [OUR ASSUMPTION]
/* Data key for TODAY's half of the Mars year at Gale (safety.js currentSeason): Ls 0-180 -> 'northern_spring_summer',
   Ls 180-360 -> 'northern_autumn_winter'. The planner's temperature check uses the same season. */
const chartSeasonUsed = () => (typeof currentSeason === 'function' ? currentSeason().key : 'northern_spring_summer');
/* REMS hours are local TRUE solar time; the chart's x-axis and EVA shading are local MEAN solar time (the slider clock). */
const chartLtstShift = () => (typeof currentSeason === 'function' && STATE.remsTemps && String(STATE.remsTemps.clock || '').startsWith('LTST'))
  ? currentSeason().ltstMinusLmstHours : 0;
const _charts = {};                                         // per-chart state: { cursor, plot, data... }

/* ── Shared helpers ─────────────────────────────────────────────────────── */

/* Round-number tick spacing so about `count` ticks fit between lo and hi (1, 2 or 5 x a power of ten). */
function chartNiceStep(lo, hi, count) {
  const raw = Math.max(1e-9, (hi - lo) / Math.max(1, count)), pow = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/* Formats a clock time from decimal hours, e.g. 14.5 -> "14:30". */
function chartClock(hours) {
  const h = ((hours % 24) + 24) % 24, whole = Math.floor(h), mins = Math.round((h - whole) * 60);
  return String(mins === 60 ? (whole + 1) % 24 : whole).padStart(2, '0') + ':' + String(mins === 60 ? 0 : mins).padStart(2, '0');
}

/* Sizes the canvas for a sharp picture on any screen and returns the drawing tools and plot rectangle. */
function chartBegin(canvas) {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (width < 80 || height < 60) return null;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = CHART_COLORS.bg; ctx.fillRect(0, 0, width, height);
  const plot = { x: CHART_PAD.left, y: CHART_PAD.top, w: width - CHART_PAD.left - CHART_PAD.right, h: height - CHART_PAD.top - CHART_PAD.bottom };
  return { ctx, width, height, plot };
}

/* Draws grid lines, tick labels and both axis titles. ticks = [{ value, label }], in data units. */
function chartAxes(ctx, plot, xTicks, yTicks, xOf, yOf, xTitle, yTitle) {
  ctx.lineWidth = 1; ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = CHART_COLORS.axis;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  yTicks.forEach(t => {
    const y = Math.round(yOf(t.value)) + 0.5;
    ctx.strokeStyle = t.strong ? CHART_COLORS.axis : CHART_COLORS.grid;
    ctx.beginPath(); ctx.moveTo(plot.x, y); ctx.lineTo(plot.x + plot.w, y); ctx.stroke();
    ctx.fillText(t.label, plot.x - 6, y);
  });
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  xTicks.forEach(t => {
    const x = Math.round(xOf(t.value)) + 0.5;
    ctx.strokeStyle = CHART_COLORS.grid;
    ctx.beginPath(); ctx.moveTo(x, plot.y); ctx.lineTo(x, plot.y + plot.h); ctx.stroke();
    ctx.fillText(t.label, x, plot.y + plot.h + 5);
  });
  ctx.fillStyle = CHART_COLORS.axis; ctx.font = '10.5px system-ui, sans-serif';
  ctx.fillText(xTitle, plot.x + plot.w / 2, plot.y + plot.h + 20);
  ctx.save(); ctx.translate(11, plot.y + plot.h / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle';
  ctx.fillText(yTitle, 0, 0); ctx.restore();
  ctx.strokeStyle = CHART_COLORS.axis; ctx.strokeRect(plot.x + 0.5, plot.y + 0.5, plot.w, plot.h);
}

/* Shades the spacewalk window (start hour + length), wrapping past midnight when needed. */
function chartEvaWindow(ctx, plot, xOf) {
  const start = ((STATE.evaStartHour == null ? 8 : STATE.evaStartHour) % 24 + 24) % 24, hours = Math.min(STATE.evaHours || 6, 24);
  [[start, Math.min(start + hours, 24)], [0, Math.max(0, start + hours - 24)]].forEach(([a, b]) => {
    if (b <= a) return;
    ctx.fillStyle = 'rgba(143, 179, 222, 0.16)'; ctx.fillRect(xOf(a), plot.y, xOf(b) - xOf(a), plot.h);
    ctx.fillStyle = 'rgba(143, 179, 222, 0.7)'; ctx.fillRect(xOf(a), plot.y, 1, plot.h); ctx.fillRect(xOf(b) - 1, plot.y, 1, plot.h);
  });
}

/* Draws the movable point: a vertical guide line plus a dot on each curve value given. */
function chartCursor(ctx, plot, x, dots) {
  ctx.strokeStyle = 'rgba(232, 230, 227, 0.75)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, plot.y); ctx.lineTo(Math.round(x) + 0.5, plot.y + plot.h); ctx.stroke(); ctx.setLineDash([]);
  dots.forEach(d => {
    ctx.fillStyle = CHART_COLORS.bg; ctx.beginPath(); ctx.arc(x, d.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(x, d.y, 4, 0, Math.PI * 2); ctx.fill();
  });
}

/* Hourly list (24 values) read at any time of day, blending between the two nearest hours. */
function chartHourly(values, hours) {
  const h = ((hours % 24) + 24) % 24, a = Math.floor(h) % 24, b = (a + 1) % 24, t = h - Math.floor(h);
  return values[a] + (values[b] - values[a]) * t;
}

/* Adds the header (title, legend, readout) above a chart's canvas and makes its point movable.
   key: 'profile' | 'temp' | 'sun'. toValue(pixelFraction 0..1) -> the chart's x value. step = arrow-key step. */
function chartFrame(key, canvasId, title, hint, redraw, range, step) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || _charts[key]) return;
  const slot = canvas.parentElement, head = document.createElement('div');
  head.className = 'chart-head';
  const titleEl = document.createElement('span'); titleEl.className = 'chart-title'; titleEl.textContent = title; titleEl.title = hint;
  const legend = document.createElement('span'); legend.className = 'chart-legend';
  const readout = document.createElement('span'); readout.className = 'chart-readout'; readout.setAttribute('aria-live', 'polite');
  head.appendChild(titleEl); head.appendChild(legend); head.appendChild(readout);
  slot.insertBefore(head, canvas); slot.classList.add('chart-framed');
  canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
  const state = _charts[key] = { canvas, legend, readout, redraw, cursor: null, plot: null, range };

  const fromPointer = e => {
    if (!state.plot || !state.range) return;
    const box = canvas.getBoundingClientRect(), frac = Math.max(0, Math.min(1, (e.clientX - box.left - state.plot.x) / state.plot.w));
    const r = state.range();
    if (!r) return;
    state.cursor = r[0] + frac * (r[1] - r[0]); redraw();
  };
  canvas.addEventListener('pointermove', fromPointer);
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); fromPointer(e); });
  canvas.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const r = state.range(); if (!r) return;
    e.preventDefault();
    const s = (typeof step === 'function' ? step() : step) * (e.shiftKey ? 5 : 1);
    state.cursor = Math.max(r[0], Math.min(r[1], (state.cursor == null ? r[0] : state.cursor) + (e.key === 'ArrowRight' ? s : -s)));
    redraw();
  });
}

/* Builds a legend from [{ color, text, shape }] using DOM nodes (no markup strings). */
function chartLegend(state, items) {
  state.legend.textContent = '';
  items.forEach(item => {
    const wrap = document.createElement('span'); wrap.className = 'chart-key';
    const swatch = document.createElement('i'); swatch.className = 'chart-swatch ' + (item.shape || 'line'); swatch.style.background = item.color;
    wrap.appendChild(swatch); wrap.appendChild(document.createTextNode(item.text)); state.legend.appendChild(wrap);
  });
}

/* ── 1. Elevation along the route ───────────────────────────────────────── */

/* Draws the route's height profile. profileData = [{ distanceMeters, elevationM }] from the planner. */
function drawProfile(canvasId, profileData) {
  const state = _charts.profile;
  if (!state) return;
  if (profileData !== undefined) state.data = profileData;
  const data = (state.data || []).filter(p => Number.isFinite(p.elevationM) && Number.isFinite(p.distanceMeters));
  if (data.length < 2) { clearProfile(canvasId); return; }
  const c = chartBegin(state.canvas); if (!c) return;
  const { ctx, plot } = c; state.plot = plot;
  const total = data[data.length - 1].distanceMeters;
  let lo = Infinity, hi = -Infinity; data.forEach(p => { lo = Math.min(lo, p.elevationM); hi = Math.max(hi, p.elevationM); });
  const yStep = chartNiceStep(lo, hi, 4); lo = Math.floor(lo / yStep) * yStep; hi = Math.ceil(hi / yStep) * yStep; if (hi === lo) hi = lo + yStep;
  const xOf = d => plot.x + d / total * plot.w, yOf = e => plot.y + plot.h - (e - lo) / (hi - lo) * plot.h;
  const xStepM = chartNiceStep(0, total, 6), xTicks = [], yTicks = [];
  for (let d = 0; d <= total + 1e-6; d += xStepM) xTicks.push({ value: d, label: (d / 1000).toFixed(xStepM < 100 ? 2 : xStepM < 1000 ? 1 : 0) });
  for (let e = lo; e <= hi + 1e-6; e += yStep) yTicks.push({ value: e, label: String(Math.round(e)) });
  chartAxes(ctx, plot, xTicks, yTicks, xOf, yOf, 'Distance walked from base (km)', 'Height (m)');

  ctx.beginPath(); ctx.moveTo(xOf(data[0].distanceMeters), yOf(data[0].elevationM));
  data.forEach(p => ctx.lineTo(xOf(p.distanceMeters), yOf(p.elevationM)));
  ctx.lineTo(xOf(total), plot.y + plot.h); ctx.lineTo(plot.x, plot.y + plot.h); ctx.closePath();
  ctx.fillStyle = 'rgba(63, 208, 201, 0.14)'; ctx.fill();
  for (let i = 1; i < data.length; i++) {                           // line, amber where the path itself is steep
    const run = data[i].distanceMeters - data[i - 1].distanceMeters, rise = data[i].elevationM - data[i - 1].elevationM;
    const steep = run > 0 && Math.abs(Math.atan2(rise, run)) * 180 / Math.PI >= CHART_STEEP_GRADE_DEG;
    ctx.strokeStyle = steep ? CHART_COLORS.amber : CHART_COLORS.teal; ctx.lineWidth = steep ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(xOf(data[i - 1].distanceMeters), yOf(data[i - 1].elevationM)); ctx.lineTo(xOf(data[i].distanceMeters), yOf(data[i].elevationM)); ctx.stroke();
  }
  [[data[0], CHART_COLORS.orange], [data[data.length - 1], CHART_COLORS.teal]].forEach(([p, color]) => {
    ctx.fillStyle = CHART_COLORS.bg; ctx.beginPath(); ctx.arc(xOf(p.distanceMeters), yOf(p.elevationM), 6, 0, 6.2832); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(xOf(p.distanceMeters), yOf(p.elevationM), 4.5, 0, 6.2832); ctx.fill();
  });
  chartLegend(state, [{ color: CHART_COLORS.orange, text: 'Base', shape: 'dot' }, { color: CHART_COLORS.teal, text: 'Target', shape: 'dot' },
                      { color: CHART_COLORS.amber, text: 'Steeper than ' + CHART_STEEP_GRADE_DEG + '°' }]);

  const route = STATE.route || {};
  if (state.cursor == null) {
    state.readout.textContent = 'Move over the chart to read any point';
    chartRouteMarker(null);
  } else {
    const d = Math.max(0, Math.min(total, state.cursor));
    let i = 1; while (i < data.length - 1 && data[i].distanceMeters < d) i++;
    const a = data[i - 1], b = data[i], span = b.distanceMeters - a.distanceMeters, t = span > 0 ? (d - a.distanceMeters) / span : 0;
    const elev = a.elevationM + (b.elevationM - a.elevationM) * t, grade = span > 0 ? Math.atan2(b.elevationM - a.elevationM, span) * 180 / Math.PI : 0;
    chartCursor(ctx, plot, xOf(d), [{ y: yOf(elev), color: CHART_COLORS.text }]);
    const minutes = route.timeSeconds > 0 ? Math.round(d / total * route.timeSeconds / 60) : null;
    state.readout.textContent = (d / 1000).toFixed(2) + ' km from base · height ' + Math.round(elev) + ' m · ' +
      (Math.abs(grade) < 0.5 ? 'level' : Math.abs(grade).toFixed(1) + '° ' + (grade > 0 ? 'uphill' : 'downhill')) +
      (minutes == null ? '' : ' · about ' + minutes + ' min in');
    chartRouteMarker(d / total);
  }
  state.canvas.setAttribute('aria-label', 'Height along the route: ' + (total / 1000).toFixed(2) + ' km, from ' + Math.round(data[0].elevationM) +
    ' m at base to ' + Math.round(data[data.length - 1].elevationM) + ' m at the target. Use left and right arrow keys to read points.');
}

/* Empty state for the elevation chart (no route yet). */
function clearProfile(canvasId) {
  const state = _charts.profile;
  if (!state) return;
  state.data = null; state.cursor = null; state.plot = null; chartRouteMarker(null);
  const c = chartBegin(state.canvas); if (!c) return;
  c.ctx.fillStyle = CHART_COLORS.axis; c.ctx.font = '13px system-ui, sans-serif'; c.ctx.textAlign = 'center'; c.ctx.textBaseline = 'middle';
  c.ctx.fillText('Pick a science target to see the hills along your route.', c.width / 2, c.height / 2);
  chartLegend(state, []); state.readout.textContent = '';
}

/* Shows (or removes) a dot on the map at the same place as the chart's point. fraction = 0..1 along the route. */
function chartRouteMarker(fraction) {
  const map = STATE.map, cells = STATE.route && STATE.route.cells;
  if (_charts.marker && (fraction == null || !cells)) { map.removeLayer(_charts.marker); _charts.marker = null; }
  if (fraction == null || !map || !cells || cells.length < 2 || typeof cellToLatLon !== 'function') return;
  const pos = fraction * (cells.length - 1), i = Math.min(cells.length - 2, Math.floor(pos)), t = pos - i;
  const a = cellToLatLon(cells[i].row, cells[i].col), b = cellToLatLon(cells[i + 1].row, cells[i + 1].col);
  if (!a || !b) return;
  const latlng = [a.lat + (b.lat - a.lat) * t, a.lon + (b.lon - a.lon) * t];
  if (_charts.marker) _charts.marker.setLatLng(latlng);
  else _charts.marker = L.circleMarker(latlng, { radius: 7, color: '#0F1115', weight: 2, fillColor: '#FFFFFF', fillOpacity: 1, interactive: false }).addTo(map);
}

/* ── 2. Outside temperature through the day ─────────────────────────────── */

/* Draws Curiosity's air temperature by local hour for the two halves of the Mars year, with the spacewalk shaded.
   Data: src/data/rems-temps.json (scripts/05_prepare_rems.py): median air temperature for each hour of the sol,
   from real hourly Curiosity REMS measurements (NASA PDS, MODRDR), over many sols in each half of the Mars year.
   Gale Crater is south of the equator, so Ls 0-180 is its cooler half-year and Ls 180-360 its warmer one. */
function drawTempChart(canvasId) {
  const state = _charts.temp;
  if (!state) return;
  const c = chartBegin(state.canvas); if (!c) return;
  const { ctx, plot } = c; state.plot = plot;
  const seasons = STATE.remsTemps && STATE.remsTemps.seasons;
  if (!seasons || !seasons.northern_spring_summer || !seasons.northern_autumn_winter) {
    ctx.fillStyle = CHART_COLORS.axis; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Loading temperature data…', c.width / 2, c.height / 2); return;
  }
  // The data file keeps its old key names; what matters is each entry's Ls range (lsSeason)
  const cool = seasons.northern_spring_summer.airTempC, warm = seasons.northern_autumn_winter.airTempC;   // Ls 0-180, Ls 180-360
  let ls = null;
  try { if (window.MARS_CLOCK) ls = window.MARS_CLOCK.now().lsDeg; } catch (e) { /* clock is optional */ }
  const nowIsCool = Number.isFinite(ls) ? ls < 180 : null;         // which half of the Mars year it is today
  const coolName = 'Cooler half-year, Ls 0–180' + (nowIsCool === true ? ' (now)' : '');
  const warmName = 'Warmer half-year, Ls 180–360' + (nowIsCool === false ? ' (now)' : '');
  let lo = Math.min(...warm, ...cool), hi = Math.max(...warm, ...cool);
  const yStep = chartNiceStep(lo, hi, 6); lo = Math.floor(lo / yStep) * yStep; hi = Math.ceil(hi / yStep) * yStep;
  const xOf = h => plot.x + h / 24 * plot.w, yOf = t => plot.y + plot.h - (t - lo) / (hi - lo) * plot.h;
  const xTicks = [0, 3, 6, 9, 12, 15, 18, 21, 24].map(h => ({ value: h, label: String(h).padStart(2, '0') })), yTicks = [];
  for (let t = lo; t <= hi + 1e-6; t += yStep) yTicks.push({ value: t, label: Math.round(t) + '°', strong: Math.round(t) === 0 });
  chartEvaWindow(ctx, plot, xOf);
  chartAxes(ctx, plot, xTicks, yTicks, xOf, yOf, 'Local Mars time (hour of the day)', 'Air temp (°C)');
  // Today's half of the Mars year is the one the planner uses, so it is drawn thicker
  const coolNow = chartSeasonUsed() === 'northern_spring_summer', shift = chartLtstShift();
  [[warm, CHART_COLORS.orange, coolNow ? 1.5 : 2.5], [cool, CHART_COLORS.blue, coolNow ? 2.5 : 1.5]].forEach(([values, color, width]) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    for (let q = 0; q <= 96; q++) { const h = q / 4, y = yOf(chartHourly(values, ((h + shift) % 24 + 24) % 24)); if (q) ctx.lineTo(xOf(h), y); else ctx.moveTo(xOf(h), y); }
    ctx.stroke();
  });
  chartLegend(state, [{ color: CHART_COLORS.blue, text: coolName }, { color: CHART_COLORS.orange, text: warmName },
                      { color: 'rgba(143, 179, 222, 0.45)', text: 'Your spacewalk', shape: 'box' }]);
  if (state.cursor == null) {
    const range = typeof computeTemperatureRange === 'function'
      ? computeTemperatureRange(STATE.evaStartHour == null ? 8 : STATE.evaStartHour, STATE.evaHours || 6, chartSeasonUsed()) : null;
    state.readout.textContent = range ? 'During your EVA: ' + range.minC + ' °C to ' + range.maxC + ' °C (' + (chartSeasonUsed() === 'northern_spring_summer' ? 'cooler' : 'warmer') + ' half-year, today)' : 'Move over the chart to read any hour';
  } else {
    const h = Math.max(0, Math.min(24, state.cursor)), hl = ((h + chartLtstShift()) % 24 + 24) % 24, k = chartHourly(cool, hl), w = chartHourly(warm, hl);
    chartCursor(ctx, plot, xOf(h), [{ y: yOf(w), color: CHART_COLORS.orange }, { y: yOf(k), color: CHART_COLORS.blue }]);
    state.readout.textContent = chartClock(h) + ' · cooler half-year ' + Math.round(k) + ' °C · warmer half-year ' + Math.round(w) + ' °C';
  }
  state.canvas.setAttribute('aria-label', 'Air temperature at Gale Crater by hour of the Mars day for the cooler and warmer halves of the Mars year. ' +
    'Each hour is the median of real Curiosity REMS measurements. Orange shading marks your EVA. Use left and right arrow keys to read hours.');
}

/* ── 3. Sun height through today ────────────────────────────────────────── */

/* Draws how high the sun is above the horizon through today's Mars day (Mars24 algorithm in marsclock.js). */
function drawSunChart(canvasId, evaStartLmstHours, evaHours) {
  const state = _charts.sun;
  if (!state || typeof sunTrack !== 'function' || typeof mcSite !== 'function') return;
  const c = chartBegin(state.canvas); if (!c) return;
  const { ctx, plot } = c; state.plot = plot;
  const site = mcSite(), now = new Date(), track = sunTrack(now, site.lon, site.lat), light = typeof daylight === 'function' ? daylight(now, site.lon, site.lat) : null;
  state.track = track;
  const xOf = h => plot.x + h / 24 * plot.w, yOf = deg => plot.y + plot.h - (deg + 90) / 180 * plot.h;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'; ctx.fillRect(plot.x, yOf(0), plot.w, plot.y + plot.h - yOf(0));        // below the horizon = night
  chartEvaWindow(ctx, plot, xOf);
  const xTicks = [0, 3, 6, 9, 12, 15, 18, 21, 24].map(h => ({ value: h, label: String(h).padStart(2, '0') }));
  const yTicks = [-90, -45, 0, 45, 90].map(d => ({ value: d, label: d + '°', strong: d === 0 }));
  chartAxes(ctx, plot, xTicks, yTicks, xOf, yOf, 'Local Mars time (hour of the day)', 'Sun height (°)');
  ctx.strokeStyle = CHART_COLORS.amber; ctx.lineWidth = 2.5; ctx.beginPath();
  track.forEach((p, i) => { if (i) ctx.lineTo(xOf(p.lmstHours), yOf(p.sunElevationDeg)); else ctx.moveTo(xOf(p.lmstHours), yOf(p.sunElevationDeg)); });
  ctx.stroke();
  chartLegend(state, [{ color: CHART_COLORS.amber, text: 'Sun today' }, { color: 'rgba(0, 0, 0, 0.6)', text: 'Night (sun below 0°)', shape: 'box' },
                      { color: 'rgba(143, 179, 222, 0.45)', text: 'Your spacewalk', shape: 'box' }]);
  const fmt = typeof mcFormatHours === 'function' ? mcFormatHours : chartClock;
  if (state.cursor == null) {
    state.readout.textContent = light && Number.isFinite(light.sunriseLmst) ? 'Sunrise ' + fmt(light.sunriseLmst) + ' · sunset ' + fmt(light.sunsetLmst) : 'Move over the chart to read any hour';
  } else {
    const h = Math.max(0, Math.min(24, state.cursor));
    let best = track[0]; track.forEach(p => { if (Math.abs(p.lmstHours - h) < Math.abs(best.lmstHours - h)) best = p; });
    chartCursor(ctx, plot, xOf(best.lmstHours), [{ y: yOf(best.sunElevationDeg), color: CHART_COLORS.amber }]);
    const deg = best.sunElevationDeg;
    state.readout.textContent = chartClock(best.lmstHours) + ' · sun ' + Math.abs(deg).toFixed(0) + '° ' + (deg >= 0 ? 'above the horizon (daylight)' : 'below the horizon (night)');
  }
  state.canvas.setAttribute('aria-label', 'Height of the sun above the horizon through today at the site, in degrees. ' +
    'Orange shading marks your spacewalk. Use left and right arrow keys to read times.');
}

/* ── Start ──────────────────────────────────────────────────────────────── */

/* Adds headers and movable points to the three charts and draws them. Call once, after the sun chart exists. */
function initCharts() {
  if (_charts.ready) return;
  _charts.ready = true;
  document.body.classList.add('charts2');
  chartFrame('profile', 'profile-canvas', 'Hills along your route',
    'Height of the ground along the planned route, from the HiRISE terrain model. Left = base, right = target.',
    () => drawProfile('profile-canvas'),
    () => { const d = _charts.profile.data; return d && d.length > 1 ? [0, d[d.length - 1].distanceMeters] : null; },
    () => { const d = _charts.profile.data; return d && d.length > 1 ? d[d.length - 1].distanceMeters / 100 : 10; });
  chartFrame('temp', 'temp-canvas', 'Outside temperature through the day',
    'Air temperature at Gale Crater by hour of the Mars day. Each curve\'s daily low and high are averages measured by Curiosity REMS over thousands of sols; the hours in between follow a typical shape and are approximate.',
    () => drawTempChart('temp-canvas'), () => [0, 24], 0.5);
  chartFrame('sun', 'sun-canvas', 'Sun height today',
    'How high the sun is above the horizon at the site through today\'s Mars day (Mars24 algorithm). Below 0° is night.',
    () => drawSunChart('sun-canvas'), () => [0, 24], 0.25);
  const all = () => {
    if (_charts.profile) drawProfile('profile-canvas');
    if (_charts.temp) drawTempChart('temp-canvas');
    if (_charts.sun) drawSunChart('sun-canvas');
  };
  if (_charts.profile && STATE.route && STATE.route.status === 'ok') _charts.profile.data = STATE.route.profile;
  setTimeout(all, 200);
  window.addEventListener('resize', () => setTimeout(all, 120));
}
