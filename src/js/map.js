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
  // Prefer the exact bounds from aoi.json once loaded
  const aoi = STATE.grids && STATE.grids.aoi;
  if (aoi) return L.latLngBounds([aoi.south, aoi.west], [aoi.north, aoi.east]);
  const { centerLat, centerLon, sizeMeters } = CONFIG.studyArea;
  // Mars meters per degree (not Earth's 111,320): pi * R / 180 ~ 59,274 m
  const halfLatDeg = (sizeMeters / 2) / (Math.PI * CONFIG.mars.radiusMeters / 180);
  const halfLonDeg = halfLatDeg / Math.cos(centerLat * Math.PI / 180);
  return L.latLngBounds(
    [centerLat - halfLatDeg, centerLon - halfLonDeg],
    [centerLat + halfLatDeg, centerLon + halfLonDeg]
  );
}

/* Builds a Leaflet tileLayer from a layer config object (from CONFIG.tileLayers).
   opacity: 0.0–1.0 */
function makeTileLayer(layerConfig, opacity) {
  return L.tileLayer(layerConfig.urlTemplate, {
    attribution: layerConfig.attribution,
    minZoom:     layerConfig.minZoom,
    maxZoom:     layerConfig.maxZoom,
    maxNativeZoom: layerConfig.maxNativeZoom,   // undefined = tiles exist at every zoom
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

  const _accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8FB3DE';
  L.rectangle(bounds, {
    color:       _accent,
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

/* Shows/hides the "outside study area" notice banner based on current map center. */
function checkStudyAreaBounds() {
  const el = document.getElementById('outside-area-notice');
  if (!el || !STATE.map) return;
  const center = STATE.map.getCenter();
  const bounds = studyAreaBounds();
  // Use a generous check (3× the study area) so the notice only shows when clearly away
  const pad = (CONFIG.studyArea.sizeMeters / 2) / (Math.PI * CONFIG.mars.radiusMeters / 180) * 3;
  const nearBounds = L.latLngBounds(
    [CONFIG.studyArea.centerLat - pad, CONFIG.studyArea.centerLon - pad],
    [CONFIG.studyArea.centerLat + pad, CONFIG.studyArea.centerLon + pad]
  );
  if (nearBounds.contains(center)) {
    el.style.display = 'none';
  } else {
    el.style.display = 'flex';
  }
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
    center:  [0, 137],   // near Mars center longitude, equator — wide starting view
    zoom:    2,          // fully zoomed out — user sees all of Mars before flying in
    minZoom: 2,
    maxZoom: 18,
    worldCopyJump:       false,
    maxBounds:           [[-90, -185], [90, 185]],
    maxBoundsViscosity:  1.0,
    zoomControl:         true,
    attributionControl:  true,
    fadeAnimation:       false,  // prevents blue/red tile-fade mist during zoom
  });

  // Add OPM base layer (always on)
  const opmLayer = makeTileLayer(CONFIG.tileLayers.opm, STATE.layers.opm ? STATE.layers.opm.opacity : 1.0);
  opmLayer.addTo(map);
  STATE.tileLayers.opm = opmLayer;

  // Study area outline + darkened exterior
  addStudyAreaOutline(map);

  // Coordinate readout
  addCoordinateReadout(map);

  // Check study area bounds whenever the map finishes moving
  map.on('moveend', checkStudyAreaBounds);

  // Wire the "Return to study area" button
  const galeBtn = document.getElementById('btn-goto-gale');
  if (galeBtn) {
    galeBtn.addEventListener('click', () => {
      map.flyTo([CONFIG.studyArea.centerLat, CONFIG.studyArea.centerLon],
                CONFIG.studyArea.defaultZoom, { duration: 1.2 });
    });
  }

  // Fly in to Gale Crater slowly — user sees all of Mars before zooming to the study area
  setTimeout(() => {
    map.flyTo([centerLat, centerLon], defaultZoom, { duration: 12 });
  }, 1800);

  // routePane: the main teal route line. hazardPane sits one level above it so hazard
  // colour segments always render on top of the route — both are above tile layers (z 200).
  map.createPane('routePane');
  map.getPane('routePane').style.zIndex = 450;
  STATE.routeRenderer = L.svg({ pane: 'routePane' });

  map.createPane('hazardPane');
  map.getPane('hazardPane').style.zIndex = 460;
  STATE.hazardRenderer = L.svg({ pane: 'hazardPane' });

  STATE.map = map;
  initRouteAnimation();
  console.log('[map] initialized at', centerLat, centerLon, 'zoom', defaultZoom, '| OPM tiles');
}

/* Watches the Leaflet SVG overlay for new path elements (new route line) and
   plays a draw-on animation so the route feels fast and purposeful. */
function initRouteAnimation() {
  const pane = STATE.map && STATE.map.getPanes && STATE.map.getPanes().overlayPane;
  if (!pane) return;
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        // Find newly added SVG path elements (Leaflet polyline)
        const paths = node.nodeName === 'path' ? [node]
          : (node.querySelectorAll ? [...node.querySelectorAll('path')] : []);
        paths.forEach(path => {
          if (path._routeAnimated) return;
          path._routeAnimated = true;
          try {
            const len = path.getTotalLength();
            if (len < 20) return;  // ignore tiny paths (target circles etc.)
            path.style.strokeDasharray = len;
            path.style.strokeDashoffset = len;
            path.style.transition = 'stroke-dashoffset 0.55s cubic-bezier(.4,0,.2,1)';
            requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
          } catch (_) { /* SVG not in document yet */ }
        });
      });
    });
  });
  observer.observe(pane, { childList: true, subtree: true });
}

/* Adds permanent text labels for terrain features inside the study area.
   These use Leaflet tooltips set to permanent so they always show. */
function addTerrainLabels(map) {
  const labels = [
    { lat: -4.8035, lon: 137.3870, text: 'Boxwork unit',              icon: '▦' },
    { lat: -4.8380, lon: 137.3920, text: 'Upslope: Mount Sharp',      icon: '▲' },
    { lat: -4.7780, lon: 137.3420, text: 'Downslope: crater floor',   icon: '▽' },
  ];

  labels.forEach(({ lat, lon, text, icon }) => {
    L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'terrain-label',
        html: `<span class="terrain-label-inner">${icon ? icon + ' ' : ''}${text}</span>`,
        iconAnchor: [0, 0]
      }),
      interactive: false,
      zIndexOffset: -100
    }).addTo(map);
  });
}
