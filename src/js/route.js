/* route.js — Main-thread route controller: sends jobs to route-worker.js, receives results,
   draws the route line on the Leaflet map, triggers summary card updates.
   Depends on: config.js (CONFIG), state.js (STATE), map.js (STATE.map), grid.js (STATE.grids).

   The Web Worker runs route-worker.js. It is loaded here (not a <script> tag in index.html).
   Worker receives transferable ArrayBuffers (no copy). */

let _routeWorker = null;
let _routeLine     = null;  // Leaflet polyline currently on the map
let _habitatMarker = null;  // Leaflet marker for the habitat
let _ponrMarker    = null;  // Leaflet marker for the point of no return

/* Initializes the Web Worker and sets up the message handler. */
function initRouteWorker() {
  try {
    _routeWorker = new Worker('./js/route-worker.js');
    _routeWorker.onmessage  = onWorkerMessage;
    _routeWorker.onerror    = onWorkerError;
    console.log('[route] worker initialized');
  } catch (err) {
    console.warn('[route] Worker failed to start:', err, '— route will run slower on main thread');
    _routeWorker = null;
  }
}

/* Sends grid buffers to the worker once so it can cache them.
   Call this once after grids load — subsequent walkback/route messages don't need to resend
   the ~1 MB of binary data on every slider change. */
function sendGridsToWorker() {
  if (!_routeWorker || !STATE.grids.loaded) return;
  const elevBuf  = STATE.grids.elevation.buffer.slice(0);
  const slopeBuf = STATE.grids.slope.buffer.slice(0);
  const roughBuf = STATE.grids.roughness.buffer.slice(0);
  _routeWorker.postMessage({
    type: 'init_grids',
    elevBuf, slopeBuf, roughBuf,
    aoi: STATE.grids.aoi
  }, [elevBuf, slopeBuf, roughBuf]);
  console.log('[route] grid buffers sent to worker');
}

/* Sends a compute_walkback message to the worker.
   Called when: habitat moves, slope limit changes, speed changes, grids first loaded. */
function triggerWalkback(habitatLatLon) {
  if (!STATE.grids.loaded) return;
  const cell = latLonToCell(habitatLatLon.lat, habitatLatLon.lon);
  if (!cell) {
    showMapMessage('Pick a point inside the study area.');
    return;
  }

  STATE.habitat = { lat: habitatLatLon.lat, lon: habitatLatLon.lon };
  STATE.habitatCell = cell;

  if (!_routeWorker) return;  // Worker not available, skip background walkback

  _routeWorker.postMessage({
    type:       'compute_walkback',
    aoi:        STATE.grids.aoi,
    habitatRow: cell.row,
    habitatCol: cell.col,
    slopeLimit: STATE.slopeLimitDeg,
    speedKmh:   STATE.speedKmh
  });
}

/* Sends a compute_route message to the worker.
   Called when a science target card is clicked. */
function triggerRoute(targetLatLon) {
  if (!STATE.grids.loaded) {
    showMapMessage('Loading Mars data...');
    return;
  }
  if (!STATE.habitat) {
    showMapMessage('Place the habitat first.');
    return;
  }

  const habitatCell = latLonToCell(STATE.habitat.lat, STATE.habitat.lon);
  const targetCell  = latLonToCell(targetLatLon.lat, targetLatLon.lon);

  if (!habitatCell) { showMapMessage('Habitat is outside the study area.'); return; }
  if (!targetCell)  { showMapMessage('Pick a point inside the study area.'); return; }

  if (habitatCell.row === targetCell.row && habitatCell.col === targetCell.col) {
    showMapMessage('Target is the same cell as the habitat. Pick a different target.');
    return;
  }

  STATE.target = targetLatLon;
  STATE.targetCell = targetCell;

  if (_routeWorker) {
    showMapMessage('Computing route...');
    _routeWorker.postMessage({
      type:       'compute_route',
      aoi:        STATE.grids.aoi,
      habitatRow: habitatCell.row,
      habitatCol: habitatCell.col,
      targetRow:  targetCell.row,
      targetCol:  targetCell.col,
      slopeLimit: STATE.slopeLimitDeg,
      speedKmh:   STATE.speedKmh
    });
  } else {
    showMapMessage('Route worker not available. Refresh the page.');
  }
}

/* Handles messages from the route worker. */
function onWorkerMessage(e) {
  const msg = e.data;

  if (msg.type === 'walkback_result') {
    STATE.walkback = { status: 'ready', data: new Float32Array(msg.dataBuf) };
    console.log('[route] walkback map ready');
  }

  else if (msg.type === 'route_result') {
    clearMapMessage();
    STATE.route = {
      status:         'ok',
      cells:          msg.cells,
      cellTimeSeconds:    msg.cellTimeSeconds,     // outbound time to each display cell (slope-aware)
      cellDistanceMeters: msg.cellDistanceMeters,  // outbound distance to each display cell
      distanceMeters: msg.distanceMeters,
      timeSeconds:    msg.timeSeconds,
      steepestDeg:    msg.steepestDeg,
      climbMeters:    msg.climbMeters,
      descentMeters:  msg.descentMeters,
      profile:        msg.profile
    };
    drawRouteLine(msg.cells);
    if (typeof updateSummaryCard === 'function') updateSummaryCard();
    if (typeof drawProfile       === 'function') drawProfile('profile-canvas', msg.profile);
    if (typeof computePointOfNoReturn === 'function') {
      const ponrIdx = computePointOfNoReturn();
      updatePonrMarker(ponrIdx);
    }
    console.log(`[route] route: ${(msg.distanceMeters/1000).toFixed(2)} km in ${(msg.timeSeconds/60).toFixed(0)} min`);
  }

  else if (msg.type === 'route_error') {
    clearRouteLine();
    STATE.route = { status: 'error', message: msg.message };
    showMapMessage(msg.message);
    if (typeof updateSummaryCard === 'function') updateSummaryCard();
  }
}

function onWorkerError(e) {
  console.error('[route] worker error:', e);
  showMapMessage('Route calculation failed. Refresh the page.');
}

/* ── Map drawing ─────────────────────────────────────────────────────────── */

/* Draws the route line on the map as a Leaflet polyline. */
function drawRouteLine(cells) {
  clearRouteLine();
  if (!cells || cells.length < 2 || !STATE.map) return;

  const latlngs = cells.map(({ row, col }) => {
    const pt = cellToLatLon(row, col);
    return [pt.lat, pt.lon];
  });

  fitRouteInView(latlngs);

  _routeLine = L.polyline(latlngs, {
    color:       '#3FD0C9',  // var(--route)
    weight:      4,
    opacity:     0.9,
    smoothFactor: 1.5,
    interactive: false,
    pane:        'routePane',
    renderer:    STATE.routeRenderer  // SVG renderer in routePane (z-index 580, above all imagery)
  }).addTo(STATE.map);
}

/* Zooms/pans so the whole route is visible beside the route card (right) and below any caption (top).
   Skipped while the visor HUD is open (it follows the walker itself). */
function fitRouteInView(_latlngs) {
  // Zoom is locked while a route is active — no auto-pan so the global view is preserved.
}

function clearRouteLine() {
  if (_routeLine && STATE.map) {
    STATE.map.removeLayer(_routeLine);
    _routeLine = null;
  }
  clearPonrMarker();
}

/* Computes the last index along STATE.route.cells where the astronaut can still turn back
   within EVA time (including work time at target and reserve). Returns the index or null. */
function computePointOfNoReturn() {
  if (!STATE.route || STATE.route.status !== 'ok') return null;
  if (!STATE.walkback || STATE.walkback.status !== 'ready' || !STATE.walkback.data) return null;
  // Outbound time to each display cell comes from the route worker (cellTimeSeconds): the same
  // slope-aware model as the route total. The display path keeps only every 3rd cell, so stepping
  // cell-to-cell here at flat speed (the old method) under-counted time ~3x.
  const cells   = STATE.route.cells;
  const times   = STATE.route.cellTimeSeconds;
  if (!cells || cells.length < 2 || !times || times.length !== cells.length) return null;
  const W       = STATE.grids.aoi ? STATE.grids.aoi.width : STATE.grids.width;
  const evaLimit = STATE.evaHours * 3600 * (1 - CONFIG.eva.reserveFraction);
  const workSec  = CONFIG.eva.workMinutes * 60;
  const airlockSec = (CONFIG.eva.egressMinutes + CONFIG.eva.ingressMinutes) * 60;  // same as the EVA cue card

  let ponrIndex = 0;
  for (let i = 1; i < cells.length; i++) {
    const cur = cells[i];
    const cumTimeSec = times[i];

    const idx = cur.row * W + cur.col;
    const walkbackSec = STATE.walkback.data[idx];
    if (!isFinite(walkbackSec) || walkbackSec <= 0) continue;

    if (airlockSec + cumTimeSec + workSec + walkbackSec <= evaLimit) {
      ponrIndex = i;
    } else {
      break;
    }
  }
  return ponrIndex;
}

/* Places an amber "↩ Turn back" marker at the PONR index on the route. */
function updatePonrMarker(ponrIndex) {
  clearPonrMarker();
  if (ponrIndex === null || !STATE.route.cells) return;
  // Whole route is within the turn-back limit: no flag needed
  if (ponrIndex >= STATE.route.cells.length - 1) return;
  const cell = STATE.route.cells[ponrIndex];
  if (!cell) return;
  const pt = cellToLatLon(cell.row, cell.col);
  _ponrMarker = L.marker([pt.lat, pt.lon], {
    icon: L.divIcon({
      className: 'ponr-icon',
      html: '<div class="ponr-pin">↩ Turn back</div>',
      iconSize: [80, 24],
      iconAnchor: [40, 12]
    }),
    zIndexOffset: 600,
    interactive: false
  }).addTo(STATE.map);
}

function clearPonrMarker() {
  if (_ponrMarker && STATE.map) {
    STATE.map.removeLayer(_ponrMarker);
    _ponrMarker = null;
  }
}

/* Places the habitat marker on the map. */
function setHabitatMarker(lat, lon) {
  if (!STATE.map) return;
  if (_habitatMarker) STATE.map.removeLayer(_habitatMarker);

  const icon = L.divIcon({
    className: 'habitat-icon',
    html: '<div class="habitat-pin"><span class="habitat-pin-h">EVA</span><div class="habitat-pin-label">Base</div></div>',
    iconSize:   [44, 44],
    iconAnchor: [22, 22]
  });
  _habitatMarker = L.marker([lat, lon], { icon, zIndexOffset: 1000 })
    .bindTooltip('EVA Habitat — Your starting point for all Marswalks', {
      permanent: false, direction: 'top', className: 'habitat-tooltip'
    })
    .addTo(STATE.map);
}

/* ── Map message overlay ───────────────────────────────────────────────────── */

function showMapMessage(text) {
  let el = document.getElementById('map-message');
  if (!el) {
    el = document.createElement('div');
    el.id = 'map-message';
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) mapContainer.appendChild(el);
    else document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.display = 'block';
}

function clearMapMessage() {
  const el = document.getElementById('map-message');
  if (el) el.style.display = 'none';
}

/* Places the default habitat and starts the walk-back map.
   Falls back to CONFIG if aoi.json hasn't loaded yet (e.g. slow network).
   The marker always appears; walkback only runs when grids are ready. */
function initDefaultHabitat() {
  // Position: prefer aoi.json (matches actual terrain data); fallback to CONFIG constant
  const lat = (STATE.grids.aoi ? STATE.grids.aoi.defaultHabitatLat : CONFIG.studyArea.defaultHabitatLat);
  const lon = (STATE.grids.aoi ? STATE.grids.aoi.defaultHabitatLon : CONFIG.studyArea.defaultHabitatLon);

  setHabitatMarker(lat, lon);
  STATE.habitat = { lat, lon };

  if (STATE.grids.loaded) {
    triggerWalkback({ lat, lon });
  }
}
