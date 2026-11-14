/* layers.js — Map overlay layers: slope, thermal, walk-back time.
   Depends on: config.js (CONFIG), state.js (STATE), map.js (STATE.map), grid.js (STATE.grids).

   Slope overlay: Leaflet imageOverlay placed exactly over the study area.
   Thermal: tile layers from CONFIG.tileLayers.
   Walk-back time: canvas overlay colored by time bands (built after route worker is ready). */

/* Slope class colors — matches styles.css --slope-X and config.js comments */
const SLOPE_LEGEND = [
  { minDeg: 0,  maxDeg: 5,  color: '#2E7D5B', label: '0–5°  Very gentle' },
  { minDeg: 5,  maxDeg: 10, color: '#8FBF4D', label: '5–10°  Gentle' },
  { minDeg: 10, maxDeg: 15, color: '#F2B134', label: '10–15°  Moderate' },
  { minDeg: 15, maxDeg: 20, color: '#E8742E', label: '15–20°  Steep' },
  { minDeg: 20, maxDeg: 999,color: '#E5484D', label: '>20°  Very steep' },
];

/* Layer catalog — used by the right panel "i" info buttons */
const LAYER_CATALOG = [
  {
    id: 'opm',
    name: 'Mars Imagery (OPM)',
    description: 'Global Mars basemap combining NASA Viking MDIM 2.1 optical imagery with MOLA colorized elevation.',
    mission: 'Viking Orbiter + MGS MOLA',
    instrument: 'MDIM 2.1 camera mosaic + MOLA altimeter',
    resolution: '~232 m/px global',
    source: 'OpenPlanetaryMap (openplanetary.org/opm) — NASA Viking / USGS / CARTO'
  },
  {
    id: 'slope',
    name: 'Slope Classes',
    description: 'Terrain steepness in 5 classes. Red = too steep for EVA at the default 15° limit. Computed from elevation data.',
    mission: 'Computed from elevation source (HiRISE DTM / CTX DTM / MOLA)',
    instrument: 'DTM + slope computation',
    resolution: '20 m/cell [our assumption]',
    source: 'See docs/SOURCES.md for elevation data source'
  },
  {
    id: 'walkback',
    name: 'Walk-back Time',
    description: 'Minutes to walk back to the habitat from any point, using the slope-aware speed model.',
    mission: 'Computed from elevation + slope grids',
    instrument: 'Route model [our assumption]',
    resolution: '20 m/cell',
    source: 'Our calculation — see Assumptions panel'
  },
  {
    id: 'themisDay',
    name: 'THEMIS Day IR (Thermal)',
    description: 'Daytime infrared brightness. Brighter = higher thermal inertia (rock/sand mix). Darker = loose dust.',
    mission: 'Mars Odyssey',
    instrument: 'THEMIS (Thermal Emission Imaging System)',
    resolution: '~100 m/px',
    source: 'NASA/JPL-Caltech/ASU via Mars Trek'
  },
  {
    id: 'themisNight',
    name: 'THEMIS Night IR (Thermal)',
    description: 'Nighttime infrared. Areas that stay warm overnight have higher thermal inertia (bedrock or large rocks).',
    mission: 'Mars Odyssey',
    instrument: 'THEMIS',
    resolution: '~100 m/px',
    source: 'NASA/JPL-Caltech/ASU via Mars Trek'
  }
];

/* Adds the slope overlay PNG to the map as a Leaflet imageOverlay.
   Positioned exactly over the study area using aoi.json bounds. */
function addSlopeOverlay(map) {
  if (!STATE.grids || !STATE.grids.aoi) {
    console.warn('[layers] addSlopeOverlay: grids not loaded yet');
    return;
  }
  const aoi = STATE.grids.aoi;
  const bounds = [[aoi.south, aoi.west], [aoi.north, aoi.east]];

  const overlay = L.imageOverlay('./data/slope-overlay.png', bounds, {
    opacity:     STATE.layers.slope.opacity,
    interactive: false,
    // Fallback if PNG fails to load:
    errorEvent: () => console.warn('[layers] slope-overlay.png failed to load')
  });

  if (STATE.layers.slope.visible) {
    overlay.addTo(map);
  }
  STATE.tileLayers.slope = overlay;
  console.log('[layers] slope overlay added');
}

/* Adds or removes the THEMIS day tile layer. */
function addThermisDay(map) {
  if (STATE.tileLayers.themisDay) return;  // already added
  const layer = L.tileLayer(CONFIG.tileLayers.themisDay.urlTemplate, {
    attribution: CONFIG.tileLayers.themisDay.attribution,
    minZoom:     CONFIG.tileLayers.themisDay.minZoom,
    maxZoom:     CONFIG.tileLayers.themisDay.maxZoom,
    tms:         CONFIG.tileLayers.themisDay.tms,
    opacity:     STATE.layers.themisDay ? STATE.layers.themisDay.opacity : 0.7,
    noWrap:      true,
    bounds:      [[-90, -180], [90, 180]],
    errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  });
  STATE.tileLayers.themisDay = layer;
  if (STATE.layers.themisDay && STATE.layers.themisDay.visible) layer.addTo(map);
}

/* Adds the THEMIS night tile layer. */
function addThermisNight(map) {
  if (STATE.tileLayers.themisNight) return;
  const layer = L.tileLayer(CONFIG.tileLayers.themisNight.urlTemplate, {
    attribution: CONFIG.tileLayers.themisNight.attribution,
    minZoom:     CONFIG.tileLayers.themisNight.minZoom,
    maxZoom:     CONFIG.tileLayers.themisNight.maxZoom,
    tms:         CONFIG.tileLayers.themisNight.tms,
    opacity:     STATE.layers.themisNight ? STATE.layers.themisNight.opacity : 0.7,
    noWrap:      true,
    bounds:      [[-90, -180], [90, 180]],
    errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  });
  STATE.tileLayers.themisNight = layer;
  if (STATE.layers.themisNight && STATE.layers.themisNight.visible) layer.addTo(map);
}

/* Sets the opacity of a named layer. layerId matches STATE.tileLayers keys. */
function updateLayerOpacity(layerId, opacity) {
  const layer = STATE.tileLayers[layerId];
  if (!layer) return;
  layer.setOpacity(opacity);
  if (STATE.layers[layerId]) STATE.layers[layerId].opacity = opacity;
}

/* Toggles a layer visible/hidden. Returns the new visibility state. */
function toggleLayer(layerId, visible) {
  const map = STATE.map;
  if (!map) return;
  const layer = STATE.tileLayers[layerId];
  if (!layer) return;

  if (visible) {
    if (!map.hasLayer(layer)) layer.addTo(map);
  } else {
    if (map.hasLayer(layer)) map.removeLayer(layer);
  }
  if (STATE.layers[layerId]) STATE.layers[layerId].visible = visible;
}

/* Initializes base layers. Slope overlay is added after grids load in main.js. */
function initLayers() {
  const map = STATE.map;
  if (!map) { console.warn('[layers] initLayers: map not ready'); return; }
  // THEMIS layers lazy-loaded on first toggle (Mars Trek server may be down)
  // addSlopeOverlay() is called from main.js AFTER loadGrids() so aoi bounds are available
  console.log('[layers] initialized (slope overlay deferred until grids load)');
}
