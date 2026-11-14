/* map.js — Leaflet map initialization, tile layers, study-area outline, coordinate readout.
   Depends on: config.js (CONFIG), state.js (STATE). Both must be loaded first.

   CRS note: We use Leaflet's default L.CRS.EPSG3857 (Web Mercator). Gale Crater is at lat -4.59°
   (near the equator), so Mercator distortion is <0.3% — negligible for a 6 km planning tool.
   The route grid math uses lat/lon cell coordinates, not map pixels, so CRS only affects display. */

/* Returns the bounds of the study area as a Leaflet LatLngBounds object.
   Uses CONFIG.studyArea.sizeMeters / 111320 to convert meters to degrees (Mars ~59 km/deg,
   but we use 111320 from Earth for Leaflet which treats coords as Earth-like — close enough
   for a 6 km box; label this as a display approximation on the Assumptions panel). */
function studyAreaBounds() {
  const { centerLat, centerLon, sizeMeters } = CONFIG.studyArea;
  const halfDeg = (sizeMeters / 2) / 111320;
  return L.latLngBounds(
    [centerLat - halfDeg, centerLon - halfDeg],
    [centerLat + halfDeg, centerLon + halfDeg]
  );
}

/* Builds a Leaflet tileLayer from a layer config object (from CONFIG.tileLayers).
   opacity: 0.0–1.0 */
function makeTileLayer(layerConfig, opacity) {
  return L.tileLayer(layerConfig.urlTemplate, {
    attribution: layerConfig.attribution,
    minZoom:     layerConfig.minZoom,
    maxZoom:     layerConfig.maxZoom,
    tms:         layerConfig.tms,
    opacity:     opacity,
    noWrap:      true,  // prevent tiles repeating east/west beyond [-180, 180]
    bounds:      [[-90, -180], [90, 180]],  // clamp tile requests to Mars extent
    errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  });
}

/* Adds a thin orange border showing the study-area boundary on the map.
   No outside darkening — that covered most of Mars and was too distracting at global zoom. */
function addStudyAreaOutline(map) {
  const bounds = studyAreaBounds();

  L.rectangle(bounds, {
    color:       '#D9622B',  // var(--accent)
    weight:      2,
    opacity:     0.9,
    dashArray:   '6 4',      // dashed so it reads as "planning boundary" not solid territory
    fill:        false,
    interactive: false
  }).addTo(map);
}

/* Adds a coordinate readout in the bottom-left of the map.
   Updates on every mousemove event. */
function addCoordinateReadout(map) {
  const CoordControl = L.Control.extend({
    onAdd: function() {
      const el = L.DomUtil.create('div', '');
      el.id = 'coord-readout';
      el.textContent = 'Hover map for coordinates';
      return el;
    }
  });

  const control = new CoordControl({ position: 'bottomleft' });
  control.addTo(map);

  map.on('mousemove', function(e) {
    const rawLat = e.latlng.lat;
    const rawLon = e.latlng.lng;
    const latStr = (rawLat >= 0 ? rawLat.toFixed(4) + '°N' : Math.abs(rawLat).toFixed(4) + '°S');
    const lonStr = (rawLon >= 0 ? rawLon.toFixed(4) + '°E' : Math.abs(rawLon).toFixed(4) + '°W');
    const el = document.getElementById('coord-readout');
    if (el) el.textContent = latStr + '  ' + lonStr;
  });

  map.on('mouseout', function() {
    const el = document.getElementById('coord-readout');
    if (el) el.textContent = 'Hover map for coordinates';
  });
}

/* Creates the Leaflet map, adds the base CTX tile layer, and sets up helpers.
   Stores the map instance in STATE.map so other modules can use it.

   TILE TROUBLESHOOTING (read this if tiles don't load):
   - Tiles blank: OPM URL might have changed — check https://www.openplanetary.org/opm
   - Tiles offset: check {x}/{y} vs {y}/{x} order in the urlTemplate in config.js
   - Tiles flipped N/S: change tms:false to tms:true in the layer config in config.js
   - 404 errors: zoom level out of range, or tile server issue
   - CORS error: OPM tiles are CORS-open; if not, check Network tab for the blocked domain
   - Mars Trek note: Trek WMTS was returning 404 on Nov 14 2026 — URL kept in config for reference */
function initMap() {
  const { centerLat, centerLon, defaultZoom } = CONFIG.studyArea;

  const map = L.map('map-container', {
    center:  [centerLat, centerLon],
    zoom:    defaultZoom,
    minZoom: 3,     // zoom 3 ≈ full Mars fits the viewport without white edges
    maxZoom: 18,
    worldCopyJump:       false,
    maxBounds:           [[-90, -185], [90, 185]], // 5° of padding prevents hard-edge artifacts
    maxBoundsViscosity:  1.0,
    zoomControl:         true,
    attributionControl:  true
  });

  // Add OPM base layer (always on)
  const opmLayer = makeTileLayer(CONFIG.tileLayers.opm, STATE.layers.opm ? STATE.layers.opm.opacity : 1.0);
  opmLayer.addTo(map);
  STATE.tileLayers.opm = opmLayer;

  // Study area outline + darkened exterior
  addStudyAreaOutline(map);

  // Coordinate readout
  addCoordinateReadout(map);

  STATE.map = map;
  console.log('[map] initialized at', centerLat, centerLon, 'zoom', defaultZoom, '| OPM tiles');
}
