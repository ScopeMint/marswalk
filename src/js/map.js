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
    keepBuffer:  4,     // keep more tiles around the view, so panning back does not reload them
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

/* The whole planet in the map's projection (Web Mercator stops at latitude 85.0511°). */
const MAP_WORLD_BOUNDS = [[-85.0511, -180], [85.0511, 180]];
const MAP_FAR_ZOOM = 11;      // below this zoom the 4 km study area is too small on screen to plan in

/* Sets the furthest zoom-out so the planet always fills the map area: no empty border around Mars.
   At zoom z the planet is 256 x 2^z pixels wide and tall, so it fills the area when that is at least
   the area's longer side. Runs again whenever the map area changes size. */
function mapFillWorld(map) {
  const size = map.getSize();
  if (!size.x || !size.y) return;                       // map hidden (Weather / Science page): nothing to fit
  const fill = Math.ceil(Math.log2(Math.max(size.x, size.y) / 256) * 100) / 100;
  map.setMinZoom(fill);
  if (map.getZoom() < fill) map.setView(map.getCenter(), fill, { animate: false });
}

/* Marks the map as "far out" so the base, target and rover markers (which would pile into one blob over a
   study area only a few pixels wide) are hidden, and the study-area pin is shown instead. See styles.css. */
function mapFarClass(map) {
  map.getContainer().classList.toggle('map-far', map.getZoom() < MAP_FAR_ZOOM);
}

/* Flies from wherever the map is to the Gale Crater study area. */
function goToGale() {
  if (!STATE.map) return;
  STATE.map.flyToBounds(studyAreaBounds(), { padding: [30, 30], duration: 2.2 });
}

/* Keeps the two stored pictures in step with their layer switches: the whole-Mars picture follows
   "Global basemap", the study-area photo follows "HiRISE imagery" (on/off and opacity). */
function mapSyncUnderlays() {
  const map = STATE.map;
  if (!map) return;
  [['global', 'opm'], ['areaPhoto', 'hirise']].forEach(([pictureId, switchId]) => {
    const picture = STATE.tileLayers[pictureId], layer = STATE.tileLayers[switchId];
    if (!picture || !layer) return;
    const on = map.hasLayer(layer);
    if (on && !map.hasLayer(picture)) picture.addTo(map);
    if (!on && map.hasLayer(picture)) map.removeLayer(picture);
    if (on && layer.options && picture.options.opacity !== layer.options.opacity) picture.setOpacity(layer.options.opacity);
  });
}

/* Shows/hides the "Go to Gale Crater" bar: shown whenever the study area is not what the map is looking at. */
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
  if (nearBounds.contains(center) && STATE.map.getZoom() >= MAP_FAR_ZOOM) {
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
    center:  [0, 85],    // centered on Mars — equatorial, ~90°E shows most of the planet
    zoom:    3,          // shows most of Mars with landing sites readable
    minZoom: 1,
    maxZoom: 18,
    zoomSnap:            0.25,   // quarter zoom steps, so "planet fills the area" can be exact
    worldCopyJump:       false,
    maxBounds:           MAP_WORLD_BOUNDS,
    maxBoundsViscosity:  1.0,
    zoomControl:         true,
    attributionControl:  true,
    fadeAnimation:       false,  // prevents tile-fade mist
  });

  // Drawing order under the markers: whole-Mars picture < basemap tiles < study-area photo < sharp HiRISE tiles
  [['underlay', 150], ['areaPhoto', 210], ['hirise', 220]].forEach(([name, z]) => {
    const pane = map.createPane(name); pane.style.zIndex = z; pane.style.pointerEvents = 'none';
  });
  // One whole-Mars picture stored in the app (scripts/13_build_global_basemap.py). It sits under the
  // basemap tiles, so a tile that has not arrived yet shows blurry Mars instead of a black square.
  STATE.tileLayers.global = L.imageOverlay('./data/mars-global.jpg', MAP_WORLD_BOUNDS, { pane: 'underlay', interactive: false }).addTo(map);

  // Add OPM base layer (always on)
  const opmLayer = makeTileLayer(CONFIG.tileLayers.opm, STATE.layers.opm ? STATE.layers.opm.opacity : 1.0);
  opmLayer.addTo(map);
  STATE.tileLayers.opm = opmLayer;
  mapFillWorld(map);
  map.on('resize', () => mapFillWorld(map));
  map.on('zoomend', () => mapFarClass(map));
  mapFarClass(map);

  // Study area outline + darkened exterior
  addStudyAreaOutline(map);

  // Coordinate readout
  addCoordinateReadout(map);

  // Check study area bounds whenever the map finishes moving
  map.on('moveend', checkStudyAreaBounds);

  // The page opens on the whole planet. This button (top of the map) takes the user to the study area.
  // ── Zoom lock while route is active ─────────────────────────────────────────
  // Three layers so nothing slips through:
  // 1. Override map.zoomIn / map.zoomOut (zoom control buttons call these directly)
  // 2. zoomend snap-back (catches scroll wheel, touch, keyboard, anything else)
  // 3. scrollWheelZoom/touch/keyboard.disable() in lockMapZoom() as first-pass block

  const _showZoomBlockMsg = () => {
    if (typeof showMapMessage === 'function')
      showMapMessage('Stop the current route first to change the zoom level.');
  };

  const _origZoomIn  = map.zoomIn.bind(map);
  const _origZoomOut = map.zoomOut.bind(map);
  map.zoomIn  = (...a) => { if (_routeZoomLock !== null) { _showZoomBlockMsg(); return map; } return _origZoomIn(...a);  };
  map.zoomOut = (...a) => { if (_routeZoomLock !== null) { _showZoomBlockMsg(); return map; } return _origZoomOut(...a); };

  let _snapBusy = false;
  map.on('zoomend', () => {
    if (_snapBusy) { _snapBusy = false; return; }
    if (_routeZoomLock !== null && Math.round(map.getZoom()) !== _routeZoomLock) {
      _snapBusy = true;
      map.setZoom(_routeZoomLock, { animate: false });
      _showZoomBlockMsg();
    }
  });

  // Wire the "Return to study area" button
  const galeBtn = document.getElementById('btn-goto-gale');
  if (galeBtn) galeBtn.addEventListener('click', goToGale);

  // A pin for our study area that only shows on the far-out view (the base and target markers are hidden there)
  L.marker([centerLat, centerLon], {
    icon: L.divIcon({ className: 'area-pin', html: '<span>MarsWalk study area · Gale Crater</span>', iconSize: [0, 0] }),
    keyboard: false, zIndexOffset: 900
  }).on('click', goToGale).addTo(map);

  // "Go to Study Spot" button — triggers the slow fly-in and reveals overlays on landing
  const beginBtn = document.getElementById('btn-begin-mission');
  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      beginBtn.style.opacity = '0';
      beginBtn.style.pointerEvents = 'none';
      STATE.introFlying = true;
      map.flyTo([centerLat, centerLon], defaultZoom, { duration: 3 });   // 3 s: a judge should not wait (was 16)
      map.once('moveend', () => {
        STATE.introFlying = false;
        document.body.classList.remove('intro-flying');
        document.dispatchEvent(new Event('marsIntroLanded'));
      });
    });
  }

  // routePane: the main teal route line. hazardPane sits one level above it so hazard
  // colour segments always render on top of the route — both are above ALL image overlays
  // (overlayPane = 400) and tile layers (tilePane = 200), and below markers (600) so
  // the habitat / target icons always stay on top of the route.
  map.createPane('routePane');
  map.getPane('routePane').style.zIndex = 580;
  STATE.routeRenderer = L.svg({ pane: 'routePane' });

  map.createPane('hazardPane');
  map.getPane('hazardPane').style.zIndex = 590;
  STATE.hazardRenderer = L.svg({ pane: 'hazardPane' });

  STATE.map = map;
  addRouteLegend(map);
  checkStudyAreaBounds();
  setInterval(mapSyncUnderlays, 500);
  initRouteAnimation();
  console.log('[map] initialized at', centerLat, centerLon, 'zoom', defaultZoom, '| OPM tiles');
}

/* Shared lock state — read by initMap()'s zoomend listener and by lock/unlock below. */
let _routeZoomLock = null;   // null = unlocked; integer = locked zoom level

/* Brings the study area on screen when a target is picked while the map is still far out (whole-planet view).
   Uses the "Go to Study Spot" button while the intro is showing, so the intro ends the normal way. */
function showStudyAreaForRoute() {
  const map = STATE.map;
  if (!map) return;
  const begin = document.getElementById('btn-begin-mission');
  if (document.body.classList.contains('intro-flying') && begin && !STATE.introFlying) { begin.click(); return; }
  if (!STATE.introFlying && map.getZoom() < MAP_FAR_ZOOM) goToGale();
}

/* Locks the map zoom at the current level. NOT CALLED any more (it could trap the user on the whole-planet
   view with a route they could not see); kept with unlockMapZoom so older calls stay harmless. */
function lockMapZoom() {
  const m = STATE.map;
  if (!m) return;
  _routeZoomLock = Math.round(m.getZoom());
  if (m.scrollWheelZoom)  m.scrollWheelZoom.disable();
  if (m.touchZoom)        m.touchZoom.disable();
  if (m.doubleClickZoom)  m.doubleClickZoom.disable();
  if (m.keyboard)         m.keyboard.disable();
  if (m.boxZoom)          m.boxZoom.disable();
}

/* Unlocks zoom. Called by routecard.js when route is stopped. */
function unlockMapZoom() {
  const m = STATE.map;
  if (!m) return;
  _routeZoomLock = null;
  if (m.scrollWheelZoom)  m.scrollWheelZoom.enable();
  if (m.touchZoom)        m.touchZoom.enable();
  if (m.doubleClickZoom)  m.doubleClickZoom.enable();
  if (m.keyboard)         m.keyboard.enable();
  if (m.boxZoom)          m.boxZoom.enable();
}

/* Watches the routePane SVG for new path elements (new route line) and
   plays a draw-on animation so the route feels fast and purposeful. */
function initRouteAnimation() {
  const pane = STATE.map && STATE.map.getPane && STATE.map.getPane('routePane');
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

/* ── Route legend (shown only while a route is active) ───────────────────── */

let _routeLegendControl = null;

/* Builds and attaches a small floating route-colour legend at the bottom-left of the map.
   Hidden by default; shown by showRouteLegend(), hidden by hideRouteLegend(). */
function addRouteLegend(map) {
  const RouteLegend = L.Control.extend({
    onAdd: function() {
      const el = L.DomUtil.create('div', 'route-legend');
      el.id = 'route-legend';
      el.style.display = 'none';
      el.innerHTML =
        '<div class="rl-title">Route key</div>' +
        '<div class="rl-row"><svg class="rl-line" viewBox="0 0 36 10"><line x1="0" y1="5" x2="36" y2="5" stroke="#3FD0C9" stroke-width="3"/></svg><span>Route</span></div>' +
        '<div class="rl-row"><svg class="rl-line" viewBox="0 0 36 10"><line x1="0" y1="5" x2="36" y2="5" stroke="#8C7FAD" stroke-width="3" stroke-dasharray="5 3"/></svg><span>Radio shadow</span></div>' +
        '<div class="rl-row"><svg class="rl-line" viewBox="0 0 36 10"><line x1="0" y1="5" x2="36" y2="5" stroke="#E8742E" stroke-width="3"/></svg><span>Rocky ground</span></div>' +
        '<div class="rl-row"><svg class="rl-line" viewBox="0 0 36 10"><line x1="0" y1="5" x2="36" y2="5" stroke="#E5484D" stroke-width="3"/></svg><span>Near slope limit</span></div>';
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
      return el;
    }
  });
  _routeLegendControl = new RouteLegend({ position: 'bottomleft' });   // left side: the route card sits on the right
  _routeLegendControl.addTo(map);
}

function showRouteLegend() {
  const el = document.getElementById('route-legend');
  if (el) el.style.display = 'block';
}

function hideRouteLegend() {
  const el = document.getElementById('route-legend');
  if (el) el.style.display = 'none';
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
