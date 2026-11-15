/* rovercheck.js — "Rover check": tests our route planner against Curiosity's REAL drive.
   Depends on: config.js (CONFIG.roverCheck, CONFIG.mars), state.js (STATE), grid.js (latLonToCell,
               cellToLatLon), route-worker.js (run here as a SECOND worker, so the crew's own route is untouched).
   Data: src/data/curiosity-traverse.geojson (NASA/JPL MMGIS rover path and end-of-drive stops).

   What it does, in order:
     1. Cuts the rover's drive inside the study area into legs (each at least CONFIG.roverCheck.legMinKm
        of rover odometer).
     2. For every leg and every slope limit in CONFIG.roverCheck.limitsDeg, asks OUR planner for a route
        from the leg's first stop to its last stop.
     3. Reports, per slope limit: how many legs our planner can connect, our path length against the
        rover's driven length on those legs, and the average gap between the two paths.
     4. Draws it: rover path white, legs we can connect green, legs we cannot connect red dashed.

   Every number comes from NASA rover data or our terrain grid. The leg length and the three slope
   limits are settings of this test (config.js), not part of the route model. */

const ROVER_COLORS = { rover: '#FFFFFF', ok: '#46C37B', blocked: '#E5484D' };   // same hues as --pass / --danger

let _rv = { button: null, card: null, layer: null, worker: null, track: null, results: null, shownLimit: null, running: false };

/* Adds the "Rover check" button to the top bar (tidy.js then moves it into the Menu). Call once at startup. */
function initRoverCheck() {
  const bar = document.getElementById('top-bar');
  if (!bar || _rv.button) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'btn-rover-check';
  b.textContent = 'Rover check';
  b.title = "Test our route planner against Curiosity's real drive";
  b.addEventListener('click', () => (_rv.card ? closeRoverCheck() : runRoverCheck()));
  bar.appendChild(b);
  _rv.button = b;
}

/* Loads the rover data once. Returns { stops, points }:
     stops  = end-of-drive positions sorted by the rover's own odometer, as { lat, lon, sol, odoKm }
     points = every recorded point of the drive path, as { lat, lon } */
async function roverLoadTrack() {
  if (_rv.track) return _rv.track;
  const resp = await fetch('./data/curiosity-traverse.geojson');
  if (!resp.ok) throw new Error('curiosity-traverse.geojson: ' + resp.status);
  const gj = await resp.json();
  const stops = gj.features
    .filter(f => f.properties.kind === 'waypoint')
    .map(f => ({ lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], sol: f.properties.sol, odoKm: f.properties.distTotalKm }))
    .sort((a, b) => a.odoKm - b.odoKm);
  const points = [];
  gj.features.forEach(f => {
    if (f.properties.kind !== 'traverse') return;
    f.geometry.coordinates.forEach(([lon, lat]) => points.push({ lat, lon }));
  });
  _rv.track = { stops, points };
  return _rv.track;
}

/* Cuts the drive into legs. A new leg starts each time the odometer has advanced by at least minKm.
   Returns [{ from, to, roverKm }] where from/to are stops. */
function roverMakeLegs(stops, minKm) {
  const legs = [];
  let from = stops[0];
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].odoKm - from.odoKm >= minKm) {
      legs.push({ from, to: stops[i], roverKm: stops[i].odoKm - from.odoKm });
      from = stops[i];
    }
  }
  return legs;
}

/* Distance in meters between two lat/lon points on Mars (flat-map formula, fine for a 4 km area). */
function roverMeters(a, b) {
  const mPerDeg = Math.PI * CONFIG.mars.radiusMeters / 180;
  const dy = (a.lat - b.lat) * mPerDeg;
  const dx = (a.lon - b.lon) * mPerDeg * Math.cos(a.lat * Math.PI / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

/* Asks the second planner for one route. Resolves with the worker's answer (route_result or route_error). */
function roverAskRoute(fromCell, toCell, slopeLimit) {
  return new Promise(resolve => {
    _rv.worker.onmessage = e => resolve(e.data);
    _rv.worker.postMessage({
      type: 'compute_route', aoi: STATE.grids.aoi,
      habitatRow: fromCell.row, habitatCol: fromCell.col,
      targetRow:  toCell.row,   targetCol:  toCell.col,
      slopeLimit, speedKmh: STATE.speedKmh
    });
  });
}

/* Average distance from the points of our routes to the nearest point of the rover's path, in meters. */
function roverMeanGap(routes, trackPoints) {
  let sum = 0, n = 0;
  routes.forEach(cells => cells.forEach(({ row, col }) => {
    const here = cellToLatLon(row, col);
    let best = Infinity;
    for (let i = 0; i < trackPoints.length; i++) {
      const d = roverMeters(here, trackPoints[i]);
      if (d < best) best = d;
    }
    sum += best; n++;
  }));
  return n ? sum / n : NaN;
}

/* Runs the whole check: every leg at every slope limit. Updates the card as it goes. */
async function runRoverCheck() {
  if (_rv.running) return;
  if (typeof pagesShow === 'function' && document.body.dataset.page === 'weather') pagesShow('plan');   // needs the map
  if (!STATE.grids.loaded) { roverShowCard('Mars data is still loading. Try again in a moment.'); return; }
  let track;
  try { track = await roverLoadTrack(); }
  catch (err) { console.warn('[rovercheck]', err); roverShowCard('Could not load the rover path file.'); return; }

  const cfg = CONFIG.roverCheck;
  const legs = roverMakeLegs(track.stops, cfg.legMinKm)
    .map(leg => Object.assign(leg, { fromCell: latLonToCell(leg.from.lat, leg.from.lon), toCell: latLonToCell(leg.to.lat, leg.to.lon) }))
    .filter(leg => leg.fromCell && leg.toCell);
  if (!legs.length) { roverShowCard('Not enough rover stops inside the study area.'); return; }

  _rv.running = true;
  _rv.worker = new Worker('./js/route-worker.js');
  const elevBuf = STATE.grids.elevation.buffer.slice(0), slopeBuf = STATE.grids.slope.buffer.slice(0), roughBuf = STATE.grids.roughness.buffer.slice(0);
  _rv.worker.postMessage({ type: 'init_grids', elevBuf, slopeBuf, roughBuf, aoi: STATE.grids.aoi }, [elevBuf, slopeBuf, roughBuf]);

  const results = [];
  const total = legs.length * cfg.limitsDeg.length;
  let done = 0;
  for (const limit of cfg.limitsDeg) {
    const row = { limit, legs: [], connected: 0, oursKm: 0, roverKm: 0, routes: [] };
    for (const leg of legs) {
      roverShowCard(`Checking leg ${++done} of ${total}…`);
      const msg = await roverAskRoute(leg.fromCell, leg.toCell, limit);
      if (!_rv.running) return;                                  // closed while running
      const ok = msg.type === 'route_result';
      row.legs.push({ leg, ok, cells: ok ? msg.cells : null });
      if (ok) { row.connected++; row.oursKm += msg.distanceMeters / 1000; row.roverKm += leg.roverKm; row.routes.push(msg.cells); }
    }
    row.gapM = roverMeanGap(row.routes, track.points);
    results.push(row);
  }
  _rv.worker.terminate(); _rv.worker = null; _rv.running = false;

  _rv.results = { rows: results, legCount: legs.length, firstSol: legs[0].from.sol, lastSol: legs[legs.length - 1].to.sol,
                  roverKmAll: legs.reduce((a, l) => a + l.roverKm, 0) };
  STATE.roverCheck = _rv.results;
  // Show the crew's own slope limit if it is one of the tested ones, otherwise the first.
  const start = results.find(r => r.limit === STATE.slopeLimitDeg) || results[0];
  roverShowLimit(start.limit);
  console.log('[rovercheck]', results.map(r => `${r.limit}°: ${r.connected}/${legs.length} legs, ours ${r.oursKm.toFixed(2)} km vs rover ${r.roverKm.toFixed(2)} km, gap ${r.gapM.toFixed(0)} m`).join(' | '));
}

/* Draws one slope limit's result on the map and refreshes the card. */
function roverShowLimit(limit) {
  const res = _rv.results, row = res && res.rows.find(r => r.limit === limit);
  if (!row || !STATE.map) return;
  _rv.shownLimit = limit;
  roverClearLayer();
  const group = L.layerGroup();
  L.polyline(_rv.track.stops.map(s => [s.lat, s.lon]), { color: ROVER_COLORS.rover, weight: 2.5, opacity: 0.9, interactive: false }).addTo(group);
  const all = [];
  row.legs.forEach(({ leg, ok, cells }) => {
    if (ok) {
      const line = cells.map(({ row: r, col: c }) => { const p = cellToLatLon(r, c); return [p.lat, p.lon]; });
      L.polyline(line, { color: ROVER_COLORS.ok, weight: 4, opacity: 0.95, interactive: false }).addTo(group);
    } else {
      L.polyline([[leg.from.lat, leg.from.lon], [leg.to.lat, leg.to.lon]],
        { color: ROVER_COLORS.blocked, weight: 4, opacity: 0.95, dashArray: '6 8' })
        .bindTooltip(`Sols ${leg.from.sol}–${leg.to.sol}: Curiosity drove ${leg.roverKm.toFixed(2)} km here. Our planner finds no route at ${limit}°.`, { sticky: true, className: 'target-tooltip' })
        .addTo(group);
    }
    all.push([leg.from.lat, leg.from.lon], [leg.to.lat, leg.to.lon]);
    L.circleMarker([leg.from.lat, leg.from.lon], { radius: 3, color: '#0B0E12', weight: 1, fillColor: ROVER_COLORS.rover, fillOpacity: 1, interactive: false }).addTo(group);
  });
  group.addTo(STATE.map);
  _rv.layer = group;
  STATE.map.fitBounds(L.latLngBounds(all), { paddingTopLeft: [390, 40], paddingBottomRight: [40, 40] });   // card sits on the left
  roverShowCard(null);
}

/* Builds the card inside the map area: a progress/error message, or the result table. */
function roverShowCard(message) {
  if (_rv.card) _rv.card.remove();
  const card = document.createElement('div');
  card.id = 'rover-check-card';
  card.setAttribute('role', 'status');
  const add = (tag, cls, text) => { const el = document.createElement(tag); el.className = cls; if (text != null) el.textContent = text; card.appendChild(el); return el; };

  const close = add('button', 'rv-close', '×');
  close.type = 'button'; close.setAttribute('aria-label', 'Close rover check');
  close.addEventListener('click', closeRoverCheck);
  add('div', 'rv-title', "ROVER CHECK · our planner vs Curiosity's real drive");

  const res = _rv.results;
  if (message || !res) {
    add('div', 'rv-note', message || '');
  } else {
    add('div', 'rv-sub', `Curiosity's drive from sol ${res.firstSol} to sol ${res.lastSol}, cut into ${res.legCount} legs of at least ${Math.round(CONFIG.roverCheck.legMinKm * 1000)} m (${res.roverKmAll.toFixed(2)} km on the rover's odometer). For each leg our planner must get from the rover's start to the rover's end.`);

    const table = add('table', 'rv-table');
    const head = table.insertRow();
    ['Slope limit', 'Legs we connect', 'Our path', 'Rover drove', 'Avg gap'].forEach(t => { const th = document.createElement('th'); th.textContent = t; head.appendChild(th); });
    res.rows.forEach(r => {
      const tr = table.insertRow();
      if (r.limit === _rv.shownLimit) tr.className = 'rv-shown';
      tr.tabIndex = 0; tr.setAttribute('role', 'button'); tr.title = `Show the ${r.limit}° result on the map`;
      const show = () => roverShowLimit(r.limit);
      tr.addEventListener('click', show);
      tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
      [`${r.limit}°`, `${r.connected} of ${res.legCount} (${Math.round(100 * r.connected / res.legCount)}%)`,
       r.connected ? r.oursKm.toFixed(2) + ' km' : '—', r.connected ? r.roverKm.toFixed(2) + ' km' : '—',
       r.connected ? r.gapM.toFixed(0) + ' m' : '—'].forEach(text => { tr.insertCell().textContent = text; });
    });

    const legend = add('div', 'rv-legend');
    [[ROVER_COLORS.rover, "Curiosity's real path"], [ROVER_COLORS.ok, `Our route (${_rv.shownLimit}°)`], [ROVER_COLORS.blocked, 'Rover drove it, our planner cannot']]
      .forEach(([color, text]) => { const item = document.createElement('span'); const sw = document.createElement('i'); sw.style.background = color; item.appendChild(sw); item.appendChild(document.createTextNode(text)); legend.appendChild(item); });

    add('div', 'rv-note', '"Our path" and "Rover drove" count only the legs our planner connects at that limit. The rover\'s distance includes science stops and side trips, so it is longer by design. A rover and a walking astronaut have different limits: this is a sanity check of the planner, not proof. Click a row to show it on the map. Rover data: NASA/JPL-Caltech (MMGIS).');
  }
  (document.getElementById('map-container') || document.body).appendChild(card);
  card.addEventListener('wheel', e => e.stopPropagation(), { passive: false });
  _rv.card = card;
}

/* Removes the check's lines from the map. */
function roverClearLayer() {
  if (_rv.layer && STATE.map) STATE.map.removeLayer(_rv.layer);
  _rv.layer = null;
}

/* Closes the check: removes lines, card and the second planner. Results stay cached for a quick reopen. */
function closeRoverCheck() {
  _rv.running = false;
  roverClearLayer();
  if (_rv.card) { _rv.card.remove(); _rv.card = null; }
  if (_rv.worker) { _rv.worker.terminate(); _rv.worker = null; }
}
