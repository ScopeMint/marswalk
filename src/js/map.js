/* map.js — Leaflet map initialization, tile layers, study-area outline, coordinate readout.
   Depends on: config.js (CONFIG), state.js (STATE). Both must be loaded first. */

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
    errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    // ^ transparent 1px GIF so missing tiles show blank instead of broken-image icon
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
   - Tiles black/blank: try changing urlTemplate to the HiRISE layer in config.js
   - Tiles offset (map image shifted from real location):
       Trek uses {z}/{y}/{x} order. The URL template already has {y}/{x}.
       If tiles are still misaligned, swap {y} and {x} in the URL template in config.js.
   - Tiles flipped north/south: change tms:false to tms:true in the layer config in config.js
   - 404 errors: zoom level may be out of range; Trek serves roughly z=1 to z=18
   - CORS error in Console: Mars Trek tiles should be CORS-open; if not, see DATA_PLAN.md
   - Emergency backup: OpenPlanetaryMap tiles — see docs/DATA_PLAN.md Layer B emergency */
function initMap() {
  const { centerLat, centerLon, defaultZoom } = CONFIG.studyArea;

  const map = L.map('map-container', {
    crs:            L.CRS.EPSG4326,  // equirectangular — matches Mars Trek tile projection
    center:         [centerLat, centerLon],
    zoom:           defaultZoom,
    zoomControl:    true,
    attributionControl: true
  });

  // Add CTX base layer (always on)
  const ctxLayer = makeTileLayer(CONFIG.tileLayers.ctx, STATE.layers.ctx.opacity);
  ctxLayer.addTo(map);
  STATE.tileLayers.ctx = ctxLayer;

  // Study area outline + darkened exterior
  addStudyAreaOutline(map);

  // Coordinate readout
  addCoordinateReadout(map);

  // Store in state
  STATE.map = map;

  console.log('[map] Leaflet map initialized at', centerLat, centerLon, 'zoom', defaultZoom);
}
