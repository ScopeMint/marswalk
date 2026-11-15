/* interact.js — Mission tools: move the EVA base, route to any point, and draw no-go zones.
   (Feature list F19 "move habitat" and F20 "no-go zones" in CLAUDE.md, plus free target picking.)
   No-go zones are rectangles the crew draws over ground they will not enter (loose sand, fresh scarp,
   hazard spotted on site). Cells inside a zone are made impassable for the route engine by setting their
   slope to NOGO_SLOPE_DEG in a working copy of the slope grid, which is then re-sent to the Web Worker.
   Depends on: CONFIG, STATE, latLonToCell, setHabitatMarker, triggerWalkback, selectTarget,
               sendGridsToWorker, showMapMessage, clearMapMessage. */

const NOGO_SLOPE_DEG = 90;      // impassable marker value (above any slope limit)
let _mode = null;               // 'base' | 'target' | 'nogo' | null
let _nogoFirst = null;          // first corner while drawing a zone
let _nogoLayer = null;          // Leaflet group with all zone rectangles
let _customMarker = null;
let _nogoId = 0;

/* Starts an interaction mode and shows a hint. Esc or the same button cancels. */
function setToolMode(mode) {
  _mode = _mode === mode ? null : mode;
  _nogoFirst = null;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === _mode));
  if (STATE.map) STATE.map.getContainer().style.cursor = _mode ? 'crosshair' : '';
  const hints = {
    base: 'Click the map to move the EVA base.',
    target: 'Click any point to plan a route there.',
    nogo: 'Click two opposite corners to draw a no-go zone.'
  };
  if (_mode) showMapMessage(hints[_mode] + ' (Esc to cancel)');
  else clearMapMessage();
}

/* Re-plans after a change: recompute walk-back field and the current route. */
function replan() {
  if (STATE.habitat) triggerWalkback(STATE.habitat);
  if (STATE.selectedTarget) {
    const [lon, lat] = STATE.selectedTarget.geometry.coordinates;
    triggerRoute({ lat, lon });
  }
}

/* Handles a map click according to the current mode. */
function onToolClick(e) {
  if (!_mode) return;
  const { lat, lng } = e.latlng;
  if (!latLonToCell(lat, lng)) { showMapMessage('Pick a point inside the study area.'); return; }

  if (_mode === 'base') {
    const cell = latLonToCell(lat, lng);
    const slope = getCellValue(STATE.grids.slope, cell.row, cell.col);
    if (!(slope <= STATE.slopeLimitDeg)) { showMapMessage(`Too steep for a base here (${slope.toFixed(0)}°). Pick flatter ground.`); return; }
    setHabitatMarker(lat, lng);
    STATE.habitat = { lat, lon: lng };
    setToolMode(null);
    replan();
  } else if (_mode === 'target') {
    setToolMode(null);
    planRouteToPoint(lat, lng);
  } else if (_mode === 'nogo') {
    if (!_nogoFirst) { _nogoFirst = [lat, lng]; showMapMessage('Now click the opposite corner. (Esc to cancel)'); return; }
    addNoGoZone([_nogoFirst, [lat, lng]]);
    setToolMode(null);
  }
}

/* Plans a route to any point inside the study area: puts a ★ marker on the 2D map and asks for the route.
   Used by the "Any point" map tool above and by the 3D terrain view (terrain3d-plan.js). */
function planRouteToPoint(lat, lng) {
  const feature = {
    type: 'Feature', id: 'custom',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { index: '★', targetId: 'custom', name: `Custom point ${Math.abs(lat).toFixed(4)}°S ${lng.toFixed(4)}°E`,
      findings: 'Survey the site; photo-document; collect samples if safe.' }
  };
  if (_customMarker) STATE.map.removeLayer(_customMarker);
  _customMarker = L.marker([lat, lng], {
    icon: L.divIcon({ className: 'target-icon', html: '<div class="target-pin custom-pin">★</div>', iconSize: [26, 26], iconAnchor: [13, 13] }),
    zIndexOffset: 500
  }).addTo(STATE.map);
  selectTarget(feature);
}

/* Adds a rectangular no-go zone from two corner [lat, lon] points, then re-plans. */
function addNoGoZone(corners) {
  const south = Math.min(corners[0][0], corners[1][0]), north = Math.max(corners[0][0], corners[1][0]);
  const west = Math.min(corners[0][1], corners[1][1]), east = Math.max(corners[0][1], corners[1][1]);
  STATE.noGoZones.push({ id: ++_nogoId, south, north, west, east });
  applyNoGoZones();
}

/* Removes a zone by id and re-plans. */
function removeNoGoZone(id) {
  STATE.noGoZones = STATE.noGoZones.filter(z => z.id !== id);
  applyNoGoZones();
}

/* Rebuilds the working slope grid with all zones blocked, redraws zones, re-sends grids, re-plans. */
function applyNoGoZones() {
  const g = STATE.grids;
  if (!g.slopeBase) g.slopeBase = g.slope.slice();
  const slope = g.slopeBase.slice();
  const aoi = g.aoi;
  let blocked = 0;
  STATE.noGoZones.forEach(z => {
    const a = latLonToCell(Math.max(z.south, aoi.south), Math.max(z.west, aoi.west));
    const b = latLonToCell(Math.min(z.north, aoi.north), Math.min(z.east, aoi.east));
    if (!a || !b) return;
    for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) { slope[r * aoi.width + c] = NOGO_SLOPE_DEG; blocked++; }
    }
  });
  g.slope = slope;
  if (typeof sendGridsToWorker === 'function') sendGridsToWorker();

  if (_nogoLayer) STATE.map.removeLayer(_nogoLayer);
  _nogoLayer = L.layerGroup().addTo(STATE.map);
  STATE.noGoZones.forEach(z => {
    L.rectangle([[z.south, z.west], [z.north, z.east]], {
      color: '#F2B134', weight: 2, dashArray: '6 4', fillColor: '#F2B134', fillOpacity: 0.18, className: 'nogo-rect'
    }).bindTooltip(`No-go zone ${z.id}`, { className: 'target-tooltip' }).addTo(_nogoLayer);
  });
  renderNoGoList();
  replan();
  console.log(`[tools] no-go zones: ${STATE.noGoZones.length}, ${blocked} cells blocked`);
}

/* Shows the list of zones with delete buttons in the tools panel. */
function renderNoGoList() {
  const list = document.getElementById('nogo-list');
  if (!list) return;
  list.innerHTML = '';
  STATE.noGoZones.forEach(z => {
    const row = document.createElement('div');
    row.className = 'nogo-item';
    const t = document.createElement('span');
    const wM = (z.east - z.west) * Math.PI / 180 * CONFIG.mars.radiusMeters * Math.cos(z.south * Math.PI / 180);
    const hM = (z.north - z.south) * Math.PI / 180 * CONFIG.mars.radiusMeters;
    t.textContent = `Zone ${z.id} · ${Math.round(wM)} × ${Math.round(hM)} m`;
    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = 'Delete this no-go zone';
    del.addEventListener('click', () => removeNoGoZone(z.id));
    row.append(t, del);
    list.appendChild(row);
  });
}

/* Builds the Mission tools panel in the left sidebar and wires map clicks. Call once after the map exists. */
function initInteract() {
  const controls = document.getElementById('eva-controls');
  if (!controls || document.getElementById('mission-tools')) return;
  const wrap = document.createElement('div');
  wrap.id = 'mission-tools';
  wrap.innerHTML = `
    <div class="panel-heading" style="margin-top:12px;">Mission tools</div>
    <div class="tool-row">
      <button class="tool-btn" data-mode="base" title="Click the map to move the EVA base">⌂ Move base</button>
      <button class="tool-btn" data-mode="target" title="Click any point to plan a route there">★ Any point</button>
      <button class="tool-btn" data-mode="nogo" title="Draw a rectangle the route must avoid">⛔ No-go zone</button>
    </div>
    <div id="nogo-list"></div>
    <div class="ctrl-hint">No-go zones mark ground the crew will not enter (soft sand, hazards seen on site). The route re-plans around them.</div>`;
  controls.after(wrap);
  wrap.querySelectorAll('.tool-btn').forEach(b => b.addEventListener('click', () => setToolMode(b.dataset.mode)));
  if (STATE.map) STATE.map.on('click', onToolClick);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && _mode) setToolMode(null); });
}
