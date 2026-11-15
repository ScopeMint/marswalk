/* Visor replay; reads app state without modifying it. */
const HUD_SPEEDS = [30, 60, 120, 300]; // Requested simulated-time multipliers.
const HUD_DEFAULT_SPEED = 60; // [OUR ASSUMPTION] Initial replay speed.
const HUD_CAUTION_FRACTION = 0.10; // Requested last 10% of total route before PONR.
const HUD_MARKER_SIZE_PX = 32; // [OUR ASSUMPTION] Astronaut symbol size.
const HUD_MARKER_Z = 1500; // [OUR ASSUMPTION] Keep astronaut above route markers.
const HUD_PROFILE_WIDTH_PX = 640; // [OUR ASSUMPTION] Canvas logical resolution.
const HUD_PROFILE_HEIGHT_PX = 72; // [OUR ASSUMPTION] Canvas logical resolution.
const HUD_PROFILE_PAD_PX = 8; // [OUR ASSUMPTION] Plot inset.
const HUD_PROFILE_LINE_PX = 2; // [OUR ASSUMPTION] Profile stroke width.
const HUD_DECIMALS = 1; // [OUR ASSUMPTION] Telemetry display precision.
const HUD_KM_DECIMALS = 2; // [OUR ASSUMPTION] Distance display precision.
const HUD_SECONDS_PER_MINUTE = 60, HUD_SECONDS_PER_HOUR = 3600;
const HUD_MS_PER_SECOND = 1000, HUD_METERS_PER_KM = 1000;
const HUD_DEGREES_PER_TURN = 360, HUD_DEGREES_PER_HALF_TURN = 180;
const HUD_PERCENT = 100;
let _hud = null;

/* Creates the header toggle and self-contained overlay; takes nothing, returns nothing. */
function initHud() {
  if (_hud || !document.getElementById('top-bar')) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'hud-toggle'; button.textContent = 'Visor HUD';
  button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'hud-overlay');
  document.getElementById('top-bar').appendChild(button);
  const root = document.createElement('section');
  root.id = 'hud-overlay'; root.className = 'hud-overlay'; root.hidden = true;
  root.setAttribute('aria-label', 'Visor HUD walk simulation');
  root.innerHTML = `<button type="button" class="hud-close" data-hud="close">Close visor · Esc</button>
    <p class="hud-message" data-hud="message" role="status"></p>
    <div class="hud-instruments" data-hud="instruments">
      <div class="hud-heading"><span class="hud-label">HEADING TO NEXT POINT</span>
        <strong data-hud="heading">--</strong><span class="hud-target" data-hud="target"></span></div>
      <div class="hud-left hud-panel"><span class="hud-label">EVA CLOCK · SIMULATED</span>
        <strong class="hud-clock" data-hud="elapsed"></strong><span class="hud-label">EVA TIME REMAINING</span>
        <strong class="hud-clock" data-hud="remaining"></strong>
        <div class="hud-consumables"><div class="hud-bar" role="meter" aria-label="EVA time left"
          aria-valuemin="0" aria-valuemax="100" data-hud="meter"><div data-hud="fill"></div></div>
          <div><span class="hud-label">EVA time left</span><strong data-hud="percent"></strong>
          <span class="hud-note">Time budget proxy<br>for suit consumables</span></div></div></div>
      <dl class="hud-right hud-panel">
        <dt>Distance walked / total</dt><dd data-hud="distance"></dd>
        <dt>Distance to target</dt><dd data-hud="toTarget"></dd>
        <dt>ETA to target</dt><dd data-hud="eta"></dd>
        <dt>Current elevation / slope</dt><dd data-hud="terrain"></dd>
        <dt>Walk-back to habitat</dt><dd data-hud="walkback"></dd>
        <dt>est. dose (rover baseline)</dt><dd data-hud="dose"></dd>
        <dt>O2 left (suit model)</dt><dd data-hud="o2"></dd>
        <dt>Radio link to base</dt><dd data-hud="comm"></dd>
      </dl>
      <div class="hud-bottom"><div class="hud-phase" data-hud="phase" role="status"></div>
        <div class="hud-status" data-hud="status" role="status"></div>
        <div class="hud-countdown" data-hud="countdown"></div>
        <div class="hud-profile-label">ROUTE ELEVATION <span data-hud="profileLabel"></span></div>
        <canvas class="hud-profile" data-hud="profile" role="img" aria-label="Route elevation with replay position"></canvas>
        <div class="hud-controls"><button type="button" data-hud="play">Play</button>
          <button type="button" data-hud="pause">Pause</button><button type="button" data-hud="restart">Restart</button>
          <label>Speed <select data-hud="speed" aria-label="Simulation speed"></select></label>
          <label><input type="checkbox" data-hud="follow" checked> Follow</label></div>
      </div>
    </div>`;
  document.body.appendChild(root);
  const el = {};
  root.querySelectorAll('[data-hud]').forEach(node => { el[node.dataset.hud] = node; });
  HUD_SPEEDS.forEach(speed => { el.speed.add(new Option(`${speed}x`, speed)); });
  el.speed.value = String(HUD_DEFAULT_SPEED);
  el.profile.width = HUD_PROFILE_WIDTH_PX; el.profile.height = HUD_PROFILE_HEIGHT_PX;
  _hud = { root, button, el, open: false, playing: false, elapsedSeconds: 0,
    frame: null, lastMs: null, route: null, signature: '', cumulative: [], marker: null };
  button.addEventListener('click', hudToggle);
  el.close.addEventListener('click', hudClose);
  el.play.addEventListener('click', hudPlay);
  el.pause.addEventListener('click', hudPause);
  el.restart.addEventListener('click', hudRestart);
  el.speed.addEventListener('change', hudResetTimestamp);
  document.addEventListener('keydown', hudEscape);
  document.addEventListener('visibilitychange', hudResetTimestamp);
}

/* Toggles the visor and reads the current route; takes nothing, returns nothing. */
function hudToggle() {
  if (_hud.open) return hudClose();
  _hud.open = true; _hud.root.hidden = false;
  hudSetFullscreenMap(true);
  _hud.button.setAttribute('aria-expanded', 'true');
  hudRestart(); _hud.el.close.focus(); _hud.frame = requestAnimationFrame(hudFrame);
}

/* Closes the visor and removes its marker/frame; takes nothing, returns nothing. */
function hudClose() {
  if (!_hud || !_hud.open) return;
  _hud.open = false; _hud.playing = false; _hud.root.hidden = true;
  hudSetFullscreenMap(false);
  cancelAnimationFrame(_hud.frame); hudRemoveMarker();
  _hud.button.setAttribute('aria-expanded', 'false'); _hud.button.focus();
}

/* Handles a keyboard event; closes on Escape and returns nothing. */
function hudEscape(event) { if (event.key === 'Escape' && _hud.open) hudClose(); }

/* Clears the frame timestamp after speed/visibility changes; returns nothing. */
function hudResetTimestamp() { if (_hud) _hud.lastMs = null; }

/* Starts a valid replay, restarting a completed replay; returns nothing. */
function hudPlay() {
  if (!_hud.valid) return;
  if (_hud.elapsedSeconds >= hudEndSeconds()) hudRestart();
  _hud.playing = true; hudResetTimestamp();
}

/* Pauses simulated time; takes nothing, returns nothing. */
function hudPause() { _hud.playing = false; hudResetTimestamp(); }

/* Returns the route content signature to detect replacement and in-place edits. */
function hudRouteSignature() { return JSON.stringify(STATE.route || null); }

/* Resets replay from current STATE, paused at the habitat; returns nothing. */
function hudRestart() {
  hudPause(); hudRemoveMarker();
  _hud.elapsedSeconds = 0; _hud.route = STATE.route; _hud.signature = hudRouteSignature();
  const route = _hud.route;
  _hud.valid = !!(route && route.status === 'ok' && Array.isArray(route.cells) && route.cells.length &&
    route.cells.every(cell => Number.isFinite(cell.row) && Number.isFinite(cell.col)) &&
    Number.isFinite(route.timeSeconds) && route.timeSeconds >= 0 &&
    Number.isFinite(route.distanceMeters) && route.distanceMeters >= 0);
  _hud.el.instruments.hidden = !_hud.valid; _hud.el.message.hidden = _hud.valid;
  _hud.el.message.textContent = route && route.status === 'ok'
    ? 'Route data unavailable. Replan the route.' : 'Plan a route first: pick a science target.';
  _hud.cumulative = [0];
  if (!_hud.valid) return;
  // Preferred: the worker's real slope-aware outbound time at each display cell, so the walker slows on
  // hills exactly as the plan does and the turn-back countdown matches the summary card.
  if (Array.isArray(route.cellTimeSeconds) && route.cellTimeSeconds.length === route.cells.length) {
    _hud.cumulative = route.cellTimeSeconds.slice();
    _hud.timeAxis = true;
    hudRender();
    return;
  }
  _hud.timeAxis = false;
  // Fallback: uniform speed along the display path, scaled to worker time/distance.
  for (let i = 1; i < route.cells.length; i++) {
    const prev = route.cells[i - 1], cell = route.cells[i];
    _hud.cumulative.push(_hud.cumulative[i - 1] + Math.hypot(cell.row - prev.row, cell.col - prev.col));
  }
  hudRender();
}

/* Returns end time in seconds, using configured science work duration. */
function hudEndSeconds() { return _hud.route.timeSeconds + CONFIG.eva.workMinutes * HUD_SECONDS_PER_MINUTE; }

/* Advances replay from an animation timestamp in milliseconds; returns nothing. */
function hudFrame(timestampMs) {
  if (!_hud.open) return;
  if (_hud.route !== STATE.route || _hud.signature !== hudRouteSignature()) hudRestart();
  if (_hud.valid) {
    if (_hud.playing && _hud.lastMs !== null && !document.hidden) {
      _hud.elapsedSeconds = Math.min(hudEndSeconds(), _hud.elapsedSeconds +
        (timestampMs - _hud.lastMs) / HUD_MS_PER_SECOND * Number(_hud.el.speed.value));
      if (_hud.elapsedSeconds >= hudEndSeconds()) _hud.playing = false;
    }
    hudRender();
  }
  _hud.lastMs = timestampMs; _hud.frame = requestAnimationFrame(hudFrame);
}

/* Formats seconds as a signed hh:mm:ss clock; missing values return '--'. */
function hudClock(timeSeconds) {
  if (!Number.isFinite(timeSeconds)) return '--';
  const seconds = Math.floor(Math.abs(timeSeconds));
  const parts = [Math.floor(seconds / HUD_SECONDS_PER_HOUR),
    Math.floor(seconds / HUD_SECONDS_PER_MINUTE) % HUD_SECONDS_PER_MINUTE, seconds % HUD_SECONDS_PER_MINUTE];
  return (timeSeconds < 0 ? '-' : '') + parts.map(value => String(value).padStart(2, '0')).join(':');
}

/* Formats a numeric telemetry value with optional precision; missing values return '--'. */
function hudNumber(value, decimals = HUD_DECIMALS) { return Number.isFinite(value) ? value.toFixed(decimals) : '--'; }

/* Reads a grid value at a cell safely; returns a number or NaN. */
function hudGridValue(array, cell) {
  const aoi = STATE.grids && STATE.grids.aoi;
  if (!aoi || !array || cell.row < 0 || cell.col < 0 || cell.row >= aoi.height || cell.col >= aoi.width) return NaN;
  return getCellValue(array, cell.row, cell.col);
}

/* Converts a fractional grid position to lat/lon; missing geometry returns null. */
function hudCoordinates(row, col) {
  if (!STATE.grids || !STATE.grids.aoi || typeof cellToLatLon !== 'function') return null;
  const point = cellToLatLon(row, col);
  return point && Number.isFinite(point.lat) && Number.isFinite(point.lon) ? point : null;
}

/* Computes initial compass bearing between lat/lon points; returns degrees or NaN. */
function hudBearing(from, to) {
  if (!from || !to || (from.lat === to.lat && from.lon === to.lon)) return NaN;
  const radians = Math.PI / HUD_DEGREES_PER_HALF_TURN;
  const lat1 = from.lat * radians, lat2 = to.lat * radians, delta = (to.lon - from.lon) * radians;
  return (Math.atan2(Math.sin(delta) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta)) / radians + HUD_DEGREES_PER_TURN) % HUD_DEGREES_PER_TURN;
}

/* Updates all readouts and marker from elapsed seconds; takes nothing, returns nothing. */
function hudRender() {
  const h = _hud, el = h.el, route = h.route, elapsedSeconds = h.elapsedSeconds;
  const fraction = route.timeSeconds > 0 ? Math.min(1, elapsedSeconds / route.timeSeconds) : 1;
  const pathLength = h.cumulative[h.cumulative.length - 1], position = fraction * pathLength;
  let index = 0;
  while (index < route.cells.length - 1 && h.cumulative[index + 1] <= position) index++;
  const cell = route.cells[index], next = route.cells[Math.min(index + 1, route.cells.length - 1)];
  const segmentLength = h.cumulative[index + 1] - h.cumulative[index];
  const blend = segmentLength > 0 ? (position - h.cumulative[index]) / segmentLength : 0;
  const row = cell.row + (next.row - cell.row) * blend, col = cell.col + (next.col - cell.col) * blend;
  const currentCell = { row: Math.round(row), col: Math.round(col) };
  const point = hudCoordinates(row, col), nextPoint = hudCoordinates(next.row, next.col);
  // Distance walked so far: from the worker's per-cell distances when available, else by time fraction.
  const cd = route.cellDistanceMeters;
  const walkedM = Array.isArray(cd) && cd.length === route.cells.length
    ? cd[index] + (cd[Math.min(index + 1, cd.length - 1)] - cd[index]) * blend
    : fraction * route.distanceMeters;
  h.walkedM = walkedM;
  const grids = STATE.grids || {}, walkback = STATE.walkback;
  const backSeconds = walkback && walkback.status === 'ready' ? hudGridValue(walkback.data, currentCell) : NaN;
  const totalSeconds = STATE.evaHours * HUD_SECONDS_PER_HOUR, remainingSeconds = totalSeconds - elapsedSeconds;
  const remainingFraction = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0;
  const dose = typeof computeRadiation === 'function' ? computeRadiation(elapsedSeconds / HUD_SECONDS_PER_HOUR) : null;
  el.heading.textContent = fraction >= 1 ? 'AT TARGET' : `${hudNumber(hudBearing(point, nextPoint), 0)}°`;
  el.target.textContent = STATE.selectedTarget && STATE.selectedTarget.properties ? STATE.selectedTarget.properties.name || '--' : '--';
  el.elapsed.textContent = hudClock(elapsedSeconds); el.remaining.textContent = hudClock(remainingSeconds);
  el.fill.style.height = `${remainingFraction * HUD_PERCENT}%`;
  el.meter.setAttribute('aria-valuenow', String(Math.round(remainingFraction * HUD_PERCENT)));
  el.percent.textContent = `${hudNumber(remainingFraction * HUD_PERCENT, 0)}%`;
  el.distance.textContent = `${hudNumber(walkedM / HUD_METERS_PER_KM, HUD_KM_DECIMALS)} / ${hudNumber(route.distanceMeters / HUD_METERS_PER_KM, HUD_KM_DECIMALS)} km`;
  el.toTarget.textContent = `${hudNumber(Math.max(0, route.distanceMeters - walkedM) / HUD_METERS_PER_KM, HUD_KM_DECIMALS)} km`;
  el.eta.textContent = `${hudNumber(Math.max(0, route.timeSeconds - elapsedSeconds) / HUD_SECONDS_PER_MINUTE)} min`;
  el.terrain.textContent = `${hudNumber(hudGridValue(grids.elevation, currentCell))} m / ${hudNumber(hudGridValue(grids.slope, currentCell))}°`;
  el.walkback.textContent = `${hudNumber(backSeconds / HUD_SECONDS_PER_MINUTE)} min`;
  el.dose.textContent = `${hudNumber(dose ? dose.doseEstimateMuGy : NaN, 0)} μGy`;
  hudSuitAndComm(el, fraction, elapsedSeconds, position, pathLength);
  const done = elapsedSeconds >= hudEndSeconds();
  el.phase.textContent = done ? `Return leg: walk-back ${hudNumber(backSeconds / HUD_SECONDS_PER_MINUTE)} min`
    : fraction >= 1 ? `SCIENCE WORK · ${hudClock(hudEndSeconds() - elapsedSeconds)} left` : 'OUTBOUND WALK';
  el.play.disabled = h.playing; el.pause.disabled = !h.playing;
  hudStatus(position, pathLength, elapsedSeconds);
  hudDrawProfile(fraction); hudMoveMarker(point);
}

/* Computes PONR banner/countdown from distance position and elapsed seconds; returns nothing. */
function hudStatus(position, pathLength, elapsedSeconds) {
  let ponrIndex = null;
  if (STATE.grids && STATE.grids.aoi && typeof computePointOfNoReturn === 'function') ponrIndex = computePointOfNoReturn();
  const known = Number.isInteger(ponrIndex) && ponrIndex >= 0 && ponrIndex < _hud.cumulative.length;
  const limitPosition = known ? _hud.cumulative[ponrIndex] : NaN;
  const wholeRouteSafe = known && ponrIndex >= _hud.cumulative.length - 1;
  const limitSeconds = pathLength > 0 ? limitPosition / pathLength * _hud.route.timeSeconds : NaN;
  let status = !known ? 'CAUTION' : wholeRouteSafe ? 'GO' : position > limitPosition ? 'TURN BACK'
    : position >= limitPosition - pathLength * HUD_CAUTION_FRACTION ? 'CAUTION' : 'GO';
  if (elapsedSeconds >= STATE.evaHours * HUD_SECONDS_PER_HOUR) status = 'TURN BACK';
  _hud.el.status.textContent = status;
  _hud.el.status.className = `hud-status hud-${status === 'GO' ? 'go' : status === 'CAUTION' ? 'caution' : 'danger'}`;
  _hud.el.countdown.textContent = wholeRouteSafe ? 'Whole route is inside the turn-back limit' : known ? `Point of no return in ${hudNumber(Math.max(0, limitSeconds - elapsedSeconds) / HUD_SECONDS_PER_MINUTE)} min`
    : 'Point of no return unavailable · turn-back safety unknown';
}

/* Draws actual profile distances and a fraction-based cursor; takes route fraction, returns nothing. */
function hudDrawProfile(fraction) {
  const canvas = _hud.el.profile, ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.width, height = canvas.height, pad = HUD_PROFILE_PAD_PX;
  ctx.clearRect(0, 0, width, height);
  const profile = (_hud.route.profile || []).map(p => ({ distanceMeters: p.distanceMeters, elevationMeters: Number.isFinite(p.elevationMeters) ? p.elevationMeters : p.elevationM }))
    .filter(p => Number.isFinite(p.distanceMeters) && Number.isFinite(p.elevationMeters));
  if (!profile.length) { _hud.el.profileLabel.textContent = '— unavailable'; return; }
  let min = Infinity, max = -Infinity;
  profile.forEach(p => { min = Math.min(min, p.elevationMeters); max = Math.max(max, p.elevationMeters); });
  _hud.el.profileLabel.textContent = `${hudNumber(min)}–${hudNumber(max)} m`;
  const totalMeters = profile[profile.length - 1].distanceMeters;
  ctx.strokeStyle = '#3FD0C9'; ctx.lineWidth = HUD_PROFILE_LINE_PX; ctx.beginPath();
  profile.forEach((p, i) => {
    const x = pad + (totalMeters > 0 ? p.distanceMeters / totalMeters : 0) * (width - pad * 2);
    const y = height - pad - (max > min ? (p.elevationMeters - min) / (max - min) : 0.5) * (height - pad * 2);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke(); ctx.strokeStyle = '#D9622B'; ctx.beginPath();
  const x = pad + fraction * (width - pad * 2);
  ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
}

/* Moves/creates the astronaut at lat/lon and follows without map easing; returns nothing. */
function hudMoveMarker(point) {
  if (!point || !STATE.map || typeof L === 'undefined') { hudRemoveMarker(); return; }
  if (_hud.marker && _hud.markerMap !== STATE.map) hudRemoveMarker();
  const latlng = [point.lat, point.lon];
  if (!_hud.marker) {
    _hud.marker = L.marker(latlng, { interactive: false, keyboard: false, zIndexOffset: HUD_MARKER_Z,
      icon: L.divIcon({ className: 'hud-astronaut', html: '<span class="hud-astronaut-body" aria-hidden="true"></span>',
        iconSize: [HUD_MARKER_SIZE_PX, HUD_MARKER_SIZE_PX], iconAnchor: [HUD_MARKER_SIZE_PX / 2, HUD_MARKER_SIZE_PX / 2] }) }).addTo(STATE.map);
    _hud.markerMap = STATE.map;
  } else _hud.marker.setLatLng(latlng);
  if (_hud.el.follow.checked) STATE.map.panTo(latlng, { animate: false });
}

/* Removes the HUD-owned marker from its original map; takes nothing, returns nothing. */
function hudRemoveMarker() {
  if (_hud.marker) _hud.marker.remove();
  _hud.marker = null; _hud.markerMap = null;
}

/* Makes the map fill the whole screen behind the visor (true) or restores the normal layout (false). */
function hudSetFullscreenMap(on) {
  document.body.classList.toggle('hud-active', on);
  if (STATE.map) setTimeout(() => STATE.map.invalidateSize(), 50);
}

/* Shows suit O2 left (from consumables.js) and the radio link state (from hazards.js) at the current position. */
function hudSuitAndComm(el, fraction, elapsedSeconds, position, pathLength) {
  const c = STATE.consumables;
  if (el.o2) {
    if (c && c.outCumJ && c.outCumJ.length > 1) {
      const n = c.outCumJ.length - 1;
      const k = Math.min(n, Math.floor(fraction * n));
      let usedJ = c.outCumJ[k];
      if (fraction >= 1) {
        const sciS = Math.min(CONFIG.eva.workMinutes * 60, Math.max(0, elapsedSeconds - _hud.route.timeSeconds));
        usedJ = c.outJ + c.workJ * sciS / (CONFIG.eva.workMinutes * 60);
      }
      const left = 1 - usedJ * c.o2KgPerJ / CONFIG.suit.o2CapacityKg;
      el.o2.textContent = `${hudNumber(left * 100, 0)}%`;
    } else el.o2.textContent = '--';
  }
  if (el.comm) {
    const hz = STATE.hazards;
    if (!hz) { el.comm.textContent = '--'; return; }
    const m = Number.isFinite(_hud.walkedM) ? _hud.walkedM : fraction * (_hud.route.distanceMeters || 0);
    const shadow = hz.radio.some(r => m >= r.fromM && m <= r.toM);
    el.comm.textContent = shadow ? 'RELAY (no direct line)' : 'DIRECT';
    el.comm.style.color = shadow ? '#B07CFF' : '#46C37B';
  }
}
