/* graticule.js — Coordinate grid (latitude / longitude lines) you can switch on and off.
   Depends on: config.js (CONFIG.mars.radiusMeters), state.js (STATE), map.js (STATE.map).

   What it is for: checking WHERE things really are. The lines use the same coordinate system as
   the map and the coordinate readout (planetocentric latitude, east longitude, in degrees), so any
   target, waypoint or box corner can be read straight off the grid and compared with NASA's numbers.

   The line spacing changes with zoom so lines stay a comfortable distance apart on screen.
   A small note on the map says the spacing in degrees and in meters on Mars. */

/* Allowed line spacings in degrees, largest first. The grid uses the smallest one that still
   keeps lines at least GRID_MIN_SPACING_PX apart on screen. */
const GRID_STEPS_DEG = [30, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01,
                        0.005, 0.002, 0.001, 0.0005, 0.0002, 0.0001];
const GRID_MIN_SPACING_PX = 90;     // lines never closer together than this on screen
const GRID_LINE_COLOR     = '#FFFFFF';
const GRID_LINE_WEIGHT_PX = 1;

/* Picks the line spacing (degrees) for the current view.
   Takes: the Leaflet map. Gives: one value from GRID_STEPS_DEG. */
function _gridStepDeg(map) {
  const b = map.getBounds();
  const degPerPx = (b.getEast() - b.getWest()) / map.getSize().x;
  const minStepDeg = degPerPx * GRID_MIN_SPACING_PX;
  let step = GRID_STEPS_DEG[0];
  GRID_STEPS_DEG.forEach(s => { if (s >= minStepDeg) step = s; });
  return step;
}

/* Formats one coordinate for a grid label, e.g. -4.805 -> "4.805°S".
   Takes: value in degrees, the step (sets how many decimals), and the two hemisphere letters. */
function _gridLabelText(valueDeg, stepDeg, positiveLetter, negativeLetter) {
  const decimals = Math.max(0, Math.ceil(-Math.log10(stepDeg) - 1e-9));
  const text = Math.abs(valueDeg).toFixed(decimals) + '°';
  if (Math.abs(valueDeg) < stepDeg / 2) return text;   // exactly 0: no hemisphere letter
  return text + (valueDeg > 0 ? positiveLetter : negativeLetter);
}

/* Formats a ground distance in meters for the spacing note, e.g. 296 -> "296 m", 5927 -> "5.9 km". */
function _gridDistanceText(distanceMeters) {
  if (distanceMeters >= 10000) return Math.round(distanceMeters / 1000) + ' km';
  if (distanceMeters >= 1000)  return (distanceMeters / 1000).toFixed(1) + ' km';
  return Math.round(distanceMeters) + ' m';
}

/* Makes one text label pinned to a map position. anchorClass decides which map edge it hugs. */
function _gridLabel(lat, lon, text, anchorClass) {
  return L.marker([lat, lon], {
    icon: L.divIcon({ className: 'grid-label ' + anchorClass, html: '', iconSize: [0, 0] }),
    interactive: false,
    keyboard:    false,
    opacity:     STATE.layers.grid.opacity
  }).on('add', function() {
    // textContent (not innerHTML) so label text can never be treated as markup
    const el = this.getElement();
    if (el) el.textContent = text;
  });
}

/* Clears and redraws every grid line and label for the current view.
   Called when the grid is switched on and after every pan or zoom while it is on. */
function redrawCoordinateGrid() {
  const map   = STATE.map;
  const group = STATE.tileLayers.grid;
  if (!map || !group || !map.hasLayer(group)) return;
  group.clearLayers();

  const b = map.getBounds();
  // Mars only exists between these limits; never draw lines outside them
  const south = Math.max(b.getSouth(), -90),  north = Math.min(b.getNorth(), 90);
  const west  = Math.max(b.getWest(), -180),  east  = Math.min(b.getEast(), 180);
  if (south >= north || west >= east) return;

  const stepDeg = _gridStepDeg(map);
  const style = { color: GRID_LINE_COLOR, weight: GRID_LINE_WEIGHT_PX,
                  opacity: STATE.layers.grid.opacity, interactive: false };

  // Whole-number line indexes (line value = index x step) avoid drift like 137.38000000001
  for (let i = Math.ceil(west / stepDeg); i <= Math.floor(east / stepDeg); i++) {
    const lon = i * stepDeg;
    L.polyline([[south, lon], [north, lon]], style).addTo(group);
    _gridLabel(north, lon, _gridLabelText(lon, stepDeg, 'E', 'W'), 'grid-label-lon').addTo(group);
  }
  for (let j = Math.ceil(south / stepDeg); j <= Math.floor(north / stepDeg); j++) {
    const lat = j * stepDeg;
    L.polyline([[lat, west], [lat, east]], style).addTo(group);
    _gridLabel(lat, west, _gridLabelText(lat, stepDeg, 'N', 'S'), 'grid-label-lat').addTo(group);
  }

  _updateGridNote(stepDeg, map.getCenter().lat);
}

/* Updates the on-map note: grid spacing in degrees and in meters on Mars at this latitude.
   Meters per degree = pi x Mars radius / 180 (about 59.3 km); east-west shrinks by cos(latitude). */
function _updateGridNote(stepDeg, centerLatDeg) {
  const el = document.getElementById('grid-note');
  if (!el) return;
  const metersPerDegLat = Math.PI * CONFIG.mars.radiusMeters / 180;
  const northSouthMeters = stepDeg * metersPerDegLat;
  const eastWestMeters   = northSouthMeters * Math.cos(centerLatDeg * Math.PI / 180);
  el.textContent = 'Grid: ' + stepDeg + '° = ' + _gridDistanceText(northSouthMeters) + ' N-S, '
                 + _gridDistanceText(eastWestMeters) + ' E-W on Mars';
}

/* Creates the coordinate grid layer and its spacing note. Call once after initMap().
   The layer starts hidden; the layer panel switch turns it on (toggleLayer('grid', true)). */
function initCoordinateGrid(map) {
  if (!map || STATE.tileLayers.grid) return;

  const NoteControl = L.Control.extend({
    onAdd: function() {
      const el = L.DomUtil.create('div', 'grid-note');
      el.id = 'grid-note';
      el.style.display = 'none';
      return el;
    }
  });
  new NoteControl({ position: 'bottomleft' }).addTo(map);

  const group = L.layerGroup();
  STATE.tileLayers.grid = group;

  const setNoteVisible = (visible) => {
    const el = document.getElementById('grid-note');
    if (el) el.style.display = visible ? '' : 'none';
  };
  group.on('add',    () => { setNoteVisible(true);  redrawCoordinateGrid(); });
  group.on('remove', () => { setNoteVisible(false); });
  map.on('moveend zoomend resize', redrawCoordinateGrid);

  if (STATE.layers.grid.visible) group.addTo(map);
}
