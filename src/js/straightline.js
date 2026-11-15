/* straightline.js — "Why not walk straight?" Compares the straight line from base to target with
   the safe route the planner found, and shows which ground forced the detour.
   Depends on: state.js (STATE), grid.js (latLonToCell, cellToLatLon, getCellValue), ui.js (updateSummaryCard),
               routecard.js (rcSection, optional). Call initStraightLine() in main.js AFTER initRouteCard().

   After every new route it:
     1. Steps along the straight line one terrain cell at a time and reads the slope at each step.
     2. Adds a fold-out section to the route card: straight distance, how much longer the safe route is,
        and how much of the straight line is steeper than the crew's slope limit.
     3. Draws the straight line dashed on the map, with the too-steep stretches in red (can be switched off).
   All numbers come from the terrain grid. The slope limit is the crew's own slider value. */

const SL_COLORS = { line: '#E7EAEE', steep: '#E5484D' };   // same hues as --text / --danger
let _sl = { layer: null, showOnMap: true };

/* Measures the straight line between two lat/lon points over the terrain grid.
   Returns { distanceM, steepestDeg, overLimitPct, overLimitM, steepRuns } or null.
   steepRuns = stretches steeper than the limit, each as [startLatLon, endLatLon]. */
function slMeasure(from, to, slopeLimit) {
  const a = latLonToCell(from.lat, from.lon), b = latLonToCell(to.lat, to.lon);
  if (!a || !b) return null;
  const cellM = STATE.grids.aoi.cellSizeMeters;
  const dRow = b.row - a.row, dCol = b.col - a.col;
  const steps = Math.max(Math.abs(dRow), Math.abs(dCol));   // one step per cell crossed
  if (steps === 0) return null;
  const distanceM = Math.sqrt(dRow * dRow + dCol * dCol) * cellM;
  let steepest = 0, over = 0, counted = 0, runStart = null, lastSteep = null;
  const steepRuns = [];
  for (let i = 0; i <= steps; i++) {
    const row = Math.round(a.row + dRow * i / steps);
    const col = Math.round(a.col + dCol * i / steps);
    const s = getCellValue(STATE.grids.slope, row, col);
    const isSteep = isFinite(s) && s > slopeLimit;
    if (isFinite(s)) { counted++; if (s > steepest) steepest = s; if (isSteep) over++; }
    const here = cellToLatLon(row, col);
    if (isSteep) { if (!runStart) runStart = here; lastSteep = here; }
    else if (runStart) { steepRuns.push([runStart, lastSteep]); runStart = null; }
  }
  if (runStart) steepRuns.push([runStart, lastSteep]);
  if (!counted) return null;
  return { distanceM, steepestDeg: steepest, overLimitPct: 100 * over / counted, overLimitM: distanceM * over / counted, steepRuns };
}

/* Removes the straight line from the map. */
function slClearMap() {
  if (_sl.layer && STATE.map) STATE.map.removeLayer(_sl.layer);
  _sl.layer = null;
}

/* Draws the dashed straight line, with the too-steep stretches in red. */
function slDrawMap(m) {
  slClearMap();
  if (!_sl.showOnMap || !STATE.map || !m) return;
  const group = L.layerGroup();
  L.polyline([[STATE.habitat.lat, STATE.habitat.lon], [STATE.target.lat, STATE.target.lon]],
    { color: SL_COLORS.line, weight: 2, opacity: 0.85, dashArray: '6 8', interactive: false,
      pane: 'routePane', renderer: STATE.routeRenderer }).addTo(group);
  m.steepRuns.forEach(([p, q]) => {
    L.polyline([[p.lat, p.lon], [q.lat, q.lon]],
      { color: SL_COLORS.steep, weight: 5, opacity: 0.9, interactive: false,
        pane: 'routePane', renderer: STATE.routeRenderer }).addTo(group);
  });
  group.addTo(STATE.map);
  _sl.layer = group;
}

/* Adds the comparison section to the route card and draws the line. Runs after every card rebuild. */
function slRender() {
  slClearMap();
  const card = document.getElementById('summary-card');
  if (!card) return;
  const old = card.querySelector('.sl-block');
  if (old) old.remove();

  const r = STATE.route;
  const isMultiStop = STATE.selectedTarget && STATE.selectedTarget.id === 'traverse';
  if (!r || r.status !== 'ok' || !STATE.habitat || !STATE.target || isMultiStop) { STATE.straightLine = null; return; }
  const limit = STATE.slopeLimitDeg;
  const m = slMeasure(STATE.habitat, STATE.target, limit);
  if (!m) { STATE.straightLine = null; return; }
  const detourPct = 100 * (r.distanceMeters - m.distanceM) / m.distanceM;
  STATE.straightLine = Object.assign({ detourPct }, m);

  const badge = { text: (detourPct >= 0 ? '+' : '') + detourPct.toFixed(0) + '% longer', kind: '' };
  const block = (typeof rcSection === 'function') ? rcSection('straight', 'Why not walk straight?', badge) : document.createElement('div');
  block.classList.add('sl-block');
  const line = (cls, text) => { const el = document.createElement('div'); el.className = cls; el.textContent = text; block.appendChild(el); return el; };
  line('sl-row', `Straight line: ${(m.distanceM / 1000).toFixed(2)} km, steepest ${m.steepestDeg.toFixed(1)}°`);
  line('sl-row', `Safe route: ${(r.distanceMeters / 1000).toFixed(2)} km, steepest ${r.steepestDeg.toFixed(1)}°`);
  line(m.overLimitPct > 0 ? 'sl-row sl-warn' : 'sl-row sl-ok', m.overLimitPct > 0
    ? `${(m.overLimitM / 1000).toFixed(2)} km of the straight line (${m.overLimitPct.toFixed(0)}%) is steeper than your ${limit}° limit, shown red on the map. The planner goes around it.`
    : `The straight line stays under your ${limit}° limit. The planner's route differs because it avoids slow uphill and rough ground.`);

  const label = document.createElement('label'); label.className = 'sl-toggle';
  const box = document.createElement('input'); box.type = 'checkbox'; box.checked = _sl.showOnMap;
  box.addEventListener('change', () => { _sl.showOnMap = box.checked; slDrawMap(STATE.straightLine); });
  label.appendChild(box); label.appendChild(document.createTextNode(' Show the straight line on the map'));
  block.appendChild(label);

  const body = card.querySelector('.rc-body') || card;
  body.insertBefore(block, body.querySelector('.sum-pov-btn') || null);
  slDrawMap(m);
}

/* Hooks into the route card so the comparison refreshes with every new route. Call once, after initRouteCard(). */
function initStraightLine() {
  if (typeof updateSummaryCard !== 'function' || window._slHooked) return;
  window._slHooked = true;
  const original = window.updateSummaryCard;
  window.updateSummaryCard = function () {
    const result = original.apply(this, arguments);
    try { slRender(); } catch (e) { console.warn('[straightline]', e); }
    return result;
  };
  if (typeof clearRouteLine === 'function') {
    const origClear = window.clearRouteLine;
    window.clearRouteLine = function () { origClear.apply(this, arguments); slClearMap(); };
  }
}
