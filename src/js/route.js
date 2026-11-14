/* route.js — Main-thread route controller: sends jobs to route-worker.js, receives results,
   draws the route line on the Leaflet map, triggers summary card updates.
   Depends on: config.js (CONFIG), state.js (STATE), map.js (STATE.map), grid.js (STATE.grids).

   The Web Worker runs route-worker.js. It is loaded here (not a <script> tag in index.html).
   Worker receives transferable ArrayBuffers (no copy). */

let _routeWorker = null;
let _routeLine   = null;    // Leaflet polyline currently on the map
let _habitatMarker = null;  // Leaflet marker for the habitat

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

  // Clone grid buffers for transfer (Worker takes ownership, so we need copies)
  const elevBuf  = STATE.grids.elevation.buffer.slice(0);
  const slopeBuf = STATE.grids.slope.buffer.slice(0);
  const roughBuf = STATE.grids.roughness.buffer.slice(0);

  _routeWorker.postMessage({
    type:         'compute_walkback',
    elevBuf, slopeBuf, roughBuf,
    aoi:          STATE.grids.aoi,
    habitatRow:   cell.row,
    habitatCol:   cell.col,
    slopeLimit:   STATE.slopeLimitDeg,
    speedKmh:     STATE.speedKmh
  }, [elevBuf, slopeBuf, roughBuf]);
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
    const elevBuf  = STATE.grids.elevation.buffer.slice(0);
    const slopeBuf = STATE.grids.slope.buffer.slice(0);
    const roughBuf = STATE.grids.roughness.buffer.slice(0);

    _routeWorker.postMessage({
      type:         'compute_route',
      elevBuf, slopeBuf, roughBuf,
      aoi:          STATE.grids.aoi,
      habitatRow:   habitatCell.row,
      habitatCol:   habitatCell.col,
      targetRow:    targetCell.row,
      targetCol:    targetCell.col,
      slopeLimit:   STATE.slopeLimitDeg,
      speedKmh:     STATE.speedKmh
    }, [elevBuf, slopeBuf, roughBuf]);
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

  _routeLine = L.polyline(latlngs, {
    color:       '#3FD0C9',  // var(--route)
    weight:      4,
    opacity:     0.9,
    smoothFactor: 1.5,
    interactive: false
  }).addTo(STATE.map);
}

function clearRouteLine() {
  if (_routeLine && STATE.map) {
    STATE.map.removeLayer(_routeLine);
    _routeLine = null;
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

/* Sets the default habitat from aoi.json and triggers the walkback map. */
function initDefaultHabitat() {
  if (!STATE.grids.loaded || !STATE.grids.aoi) return;
  const aoi = STATE.grids.aoi;
  const lat = aoi.defaultHabitatLat;
  const lon = aoi.defaultHabitatLon;
  setHabitatMarker(lat, lon);
  triggerWalkback({ lat, lon });
}
