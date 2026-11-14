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

/* Adds a rectangle showing the study-area boundary on the map.
   Outside the box is slightly darkened by a GeoJSON polygon with a hole. */
function addStudyAreaOutline(map) {
  const bounds = studyAreaBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  // Outer ring covers the whole world; inner ring (hole) is the study area.
  // This darkens everything outside the box.
  const outerRing = [[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]];
  const innerRing = [
    [sw.lat, sw.lng], [sw.lat, ne.lng],
    [ne.lat, ne.lng], [ne.lat, sw.lng],
    [sw.lat, sw.lng]
  ];

  L.geoJSON({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [outerRing, innerRing]
    }
  }, {
    style: { fillColor: '#000', fillOpacity: 0.35, stroke: false }
  }).addTo(map);

  // Bright border around the study area itself
  L.rectangle(bounds, {
    color:       '#D9622B',
    weight:      1.5,
    opacity:     0.7,
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
    const lat = e.latlng.lat.toFixed(4);
    const lon = e.latlng.lng.toFixed(4);
    const el = document.getElementById('coord-readout');
    if (el) el.textContent = lat + '°N  ' + lon + '°E';
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
    center: [centerLat, centerLon],
    zoom:   defaultZoom,
    minZoom: 2,     // prevent zooming out past a readable global Mars view
    maxZoom: 18,
    worldCopyJump:  false,   // stop map snapping to repeated copies
    // Hard bounds: clamp panning to Mars extent so the map cannot scroll past [-180,180]
    maxBounds:           [[-90, -180], [90, 180]],
    maxBoundsViscosity:  1.0,  // 1.0 = hard stop (no bounce)
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

  // Store in state
  STATE.map = map;

  console.log('[map] Leaflet map initialized at', centerLat, centerLon, 'zoom', defaultZoom, '| base layer: OPM');
}
