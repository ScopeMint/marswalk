/* hazards.js — Hazard call-outs along the planned route.
   For every point of the route it checks:
     - RADIO SHADOW: is there a straight line of sight from the habitat radio mast to the astronaut's suit
       antenna over the HiRISE terrain? (same geometry as scripts/generate_los_overlay.py)
     - ROCKY GROUND: 1 m rock & ridge relief above the route model's rough-ground threshold
     - NEAR SLOPE LIMIT: cell slope within 2 degrees of the crew's slope limit
   Consecutive points are merged into distance ranges ("0.80-1.30 km"), listed in the route card,
   drawn on the map as coloured segments, and exposed as STATE.hazards for the HUD and cue card.
   Depends on: CONFIG, STATE, cellToLatLon, latLonToCell, getCellValue, ui.js updateSummaryCard. */

const HAZ_MAST_HEIGHT_M = 10;      // habitat radio mast [OUR ASSUMPTION] — same as generate_los_overlay.py
const HAZ_SUIT_ANTENNA_M = 2;      // suit antenna height [OUR ASSUMPTION]
const HAZ_NEAR_LIMIT_DEG = 2;      // "near the slope limit" margin (docs/ROUTE_AND_SAFETY_MODEL.md section 8)
const HAZ_MIN_RANGE_M = 30;        // ignore hazard stretches shorter than this

const HAZ_STYLE = {
  radio: { color: '#B07CFF', label: 'Radio shadow (no direct line to base: relay via rover/orbiter)', icon: '📡' },
  rocky: { color: '#E8742E', label: 'Rocky / ridged ground (slower, watch footing)', icon: '🪨' },
  steep: { color: '#E5484D', label: 'Near slope limit', icon: '⛰' }
};

let _hazLayer = null;

/* True if the terrain blocks the straight line from the habitat mast to an antenna at (row, col). */
function hazBlocked(hab, row, col) {
  const W = STATE.grids.aoi.width, elev = STATE.grids.elevation;
  const h0 = elev[hab.row * W + hab.col] + HAZ_MAST_HEIGHT_M;
  const h1 = elev[row * W + col] + HAZ_SUIT_ANTENNA_M;
  const steps = Math.max(Math.abs(row - hab.row), Math.abs(col - hab.col));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const r = Math.round(hab.row + (row - hab.row) * t);
    const c = Math.round(hab.col + (col - hab.col) * t);
    const ground = elev[r * W + c];
    if (isFinite(ground) && ground > h0 + (h1 - h0) * t) return true;
  }
  return false;
}

/* Turns a list of per-point flags into [{fromM, toM, i0, i1}] ranges along the route. */
function hazRanges(flags, distM) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= flags.length; i++) {
    if (i < flags.length && flags[i]) { if (start < 0) start = i; }
    else if (start >= 0) {
      const a = distM[start], b = distM[i - 1];
      if (b - a >= HAZ_MIN_RANGE_M) out.push({ fromM: a, toM: b, i0: start, i1: i - 1 });
      start = -1;
    }
  }
  return out;
}

/* Computes hazards for STATE.route. Returns { radio, rocky, steep, radioFrac } or null. */
function computeHazards() {
  const route = STATE.route;
  if (!route || route.status !== 'ok' || !route.cells || !STATE.grids.loaded) return null;
  const aoi = STATE.grids.aoi;
  const habLat = STATE.habitat ? STATE.habitat.lat : (aoi.defaultHabitatLat || CONFIG.studyArea.defaultHabitatLat);
  const habLon = STATE.habitat ? STATE.habitat.lon : (aoi.defaultHabitatLon || CONFIG.studyArea.defaultHabitatLon);
  const hab = latLonToCell(habLat, habLon);
  if (!hab) return null;
  const cells = route.cells;
  const n = cells.length;
  const distM = cells.map((_, i) => i / Math.max(1, n - 1) * route.distanceMeters);
  const radio = [], rocky = [], steep = [];
  cells.forEach(({ row, col }) => {
    radio.push(hazBlocked(hab, row, col));
    rocky.push(getCellValue(STATE.grids.roughness, row, col) > CONFIG.roughness.thresholdMeters);
    steep.push(getCellValue(STATE.grids.slope, row, col) >= STATE.slopeLimitDeg - HAZ_NEAR_LIMIT_DEG);
  });
  return {
    radio: hazRanges(radio, distM), rocky: hazRanges(rocky, distM), steep: hazRanges(steep, distM),
    radioFrac: radio.filter(Boolean).length / n,
    targetInShadow: radio[n - 1]
  };
}

/* Draws hazard ranges as coloured segments on top of the route line.
   Each segment is drawn twice: a dark casing first (wider, semi-transparent) so the
   colour reads clearly against the teal route line underneath. */
function drawHazardSegments(hz) {
  if (_hazLayer && STATE.map) STATE.map.removeLayer(_hazLayer);
  _hazLayer = null;
  if (!hz || !STATE.map) return;
  const renderer = STATE.hazardRenderer || STATE.routeRenderer;
  _hazLayer = L.layerGroup();
  const cells = STATE.route.cells;
  // weight: how thick the coloured line is; casing adds 4 px on each side
  [['radio', 7, '6 5'], ['rocky', 8, null], ['steep', 8, null]].forEach(([kind, weight, dash]) => {
    hz[kind].forEach(r => {
      const pts = cells.slice(r.i0, r.i1 + 1).map(c => { const p = cellToLatLon(c.row, c.col); return [p.lat, p.lon]; });
      if (pts.length < 2) return;
      // Dark casing — makes the colour pop against both the blue route and the map background
      L.polyline(pts, { color: '#000000', weight: weight + 4, opacity: 0.35, dashArray: dash, interactive: false, renderer })
        .addTo(_hazLayer);
      // Coloured line on top of casing
      L.polyline(pts, { color: HAZ_STYLE[kind].color, weight, opacity: 1, dashArray: dash, interactive: true, renderer })
        .bindTooltip(`${HAZ_STYLE[kind].label}<br>${(r.fromM / 1000).toFixed(2)}–${(r.toM / 1000).toFixed(2)} km`, { className: 'target-tooltip', sticky: true })
        .addTo(_hazLayer);
    });
  });
  _hazLayer.addTo(STATE.map);
}

/* Adds the "Hazards on this route" block to the summary card. */
function renderHazardSection() {
  const card = document.getElementById('summary-card');
  if (!card) return;
  const old = card.querySelector('.haz-block');
  if (old) old.remove();
  const hz = computeHazards();
  STATE.hazards = hz;
  drawHazardSegments(hz);
  if (!hz) return;

  const block = document.createElement('div');
  block.className = 'haz-block';
  const h = document.createElement('div');
  h.className = 'cons-heading';
  h.textContent = 'HAZARDS ON THIS ROUTE';
  block.appendChild(h);
  let any = false;
  ['radio', 'rocky', 'steep'].forEach(kind => {
    hz[kind].forEach(r => {
      any = true;
      const row = document.createElement('div');
      row.className = 'haz-row';
      const sw = document.createElement('span');
      sw.className = 'haz-swatch';
      sw.style.background = HAZ_STYLE[kind].color;
      const txt = document.createElement('span');
      txt.textContent = `${(r.fromM / 1000).toFixed(2)}–${(r.toM / 1000).toFixed(2)} km · ${HAZ_STYLE[kind].label}`;
      row.append(sw, txt);
      block.appendChild(row);
    });
  });
  if (!any) {
    const ok = document.createElement('div');
    ok.className = 'haz-row haz-clear';
    ok.textContent = '✓ Clear: direct radio to base the whole way, no rocky or near-limit stretches.';
    block.appendChild(ok);
  } else if (hz.targetInShadow) {
    const warn = document.createElement('div');
    warn.className = 'haz-note';
    warn.textContent = 'Target is out of direct radio contact with base: park a relay (rover) on high ground or use the orbiter pass schedule.';
    block.appendChild(warn);
  }
  const cons = card.querySelector('.cons-block');
  card.insertBefore(block, cons || card.querySelector('.sum-pov-btn') || null);
}

/* Wraps updateSummaryCard (after consumables.js) so hazards refresh with every new route. Call once. */
function initHazards() {
  if (typeof updateSummaryCard !== 'function' || window._hazHooked) return;
  const original = window.updateSummaryCard;
  window.updateSummaryCard = function () {
    original.apply(this, arguments);
    try { renderHazardSection(); } catch (e) { console.warn('[hazards]', e); }
  };
  window._hazHooked = true;
  // Remove hazard segments when the route is cleared
  if (typeof clearRouteLine === 'function') {
    const origClear = clearRouteLine;
    window.clearRouteLine = function () { origClear.apply(this, arguments); drawHazardSegments(null); };
  }
}
