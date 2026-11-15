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
    id: 'sites',
    name: 'Explored Sites (NASA landers and rovers)',
    description: 'The 9 places where a NASA lander or rover has worked on the surface. Each has a blue border around a 4 km patch of sharp orbital imagery, so it is clear which parts of the map are explored and charted in detail. Zoom out to see all pins; click a pin for facts and sources.',
    mission: 'Mars Reconnaissance Orbiter (imagery); Viking 1 and 2, Mars Pathfinder, Spirit, Opportunity, Phoenix, Curiosity, InSight, Perseverance (sites)',
    instrument: 'HiRISE camera mosaics',
    resolution: 'About 2 m/px as shown (0.25 m/px source)',
    source: 'Imagery: NASA Mars Trek. Positions: NASA/JPL Horizons, NASA GISS Mars24, NASA/JPL MMGIS (see docs/SOURCES.md)'
  },
  {
    id: 'grid',
    name: 'Coordinate Grid (lat/lon)',
    description: 'Latitude and longitude lines with labels, in the same coordinates as the map readout. Use it to check where targets and the study box really are. Spacing changes with zoom; the note at the bottom-left gives it in degrees and meters.',
    mission: 'Not mission data (a map reference)',
    instrument: 'Planetocentric latitude, east longitude, as used by NASA/JPL rover localization',
    resolution: 'Adapts to zoom (0.0001 to 30 degrees)',
    source: 'Our drawing. Meters per degree = pi x Mars radius / 180'
  },
  {
    id: 'hirise',
    name: 'HiRISE Imagery (25 cm)',
    description: 'Walking-scale orbital photo of the study area. Individual ridges, sand ripples and large rocks are visible.',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'HiRISE camera, orthoimage ESP_019988_1750_RED_A_01_ORTHO',
    resolution: '0.25 m/px source; tiles to ~0.6 m/px',
    source: 'NASA/JPL/University of Arizona; USGS Astrogeology analysis-ready data (CC0)'
  },
  {
    id: 'opm',
    name: 'Global Mars Basemap (OPM)',
    description: 'Context map outside the study area: NASA Viking MDIM 2.1 imagery with MOLA colorized elevation.',
    mission: 'Viking Orbiter + MGS MOLA',
    instrument: 'MDIM 2.1 camera mosaic + MOLA altimeter',
    resolution: '~232 m/px global',
    source: 'OpenPlanetaryMap (openplanetary.org/opm) — NASA Viking / USGS / CARTO'
  },
  {
    id: 'hillshade',
    name: 'Terrain Shading',
    description: 'Elevation colour + hillshade shadows from the HiRISE terrain model. Darker = lower; lighter = higher.',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'HiRISE DTM DTEEC_019698_1750_019988_1750_U01',
    resolution: '4 m/px (from 1 m DTM)',
    source: 'HiRISE team, University of Arizona; USGS Astrogeology (CC0)'
  },
  {
    id: 'slope',
    name: 'Slope Classes',
    description: 'Terrain steepness in 5 classes. Orange/red = too steep for EVA at the default 15° limit.',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'Computed from HiRISE DTM (1 m), averaged to 10 m cells',
    resolution: '10 m/cell [our assumption]',
    source: 'HiRISE DTM DTEEC_019698_1750_019988_1750_U01 (CC0)'
  },
  {
    id: 'relief',
    name: 'Rock & Ridge Relief (boulders)',
    description: 'How bumpy the ground is at 1 m scale inside each 10 m cell, after removing the hill shape. Amber = some rocks or small ridges; orange = rocky/ridged (route slows 25%); red = very rocky, blocks or scarps. Single rocks under ~2 m are not resolved.',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'HiRISE DTM (1 m/px): std. dev. of de-trended elevation',
    resolution: '1 m relief, shown per 10 m cell',
    source: 'Our calculation from HiRISE DTM DTEEC_019698_1750_019988_1750_U01; class limits are OUR ASSUMPTION'
  },
  {
    id: 'traverse',
    name: "Curiosity's Real Path",
    description: 'The rover’s actual drive path and end-of-drive positions (hover a dot for the sol). The MSL marker is its latest reported position.',
    mission: 'Mars Science Laboratory (Curiosity)',
    instrument: 'Rover localization (MMGIS traverse + waypoint layers)',
    resolution: 'Per drive',
    source: 'NASA/JPL-Caltech MMGIS: mars.nasa.gov/mmgis-maps/MSL/Layers/json/'
  },
  {
    id: 'los',
    name: 'Communication Zones (Line-of-Sight)',
    description: 'Amber/red = terrain blocks a direct radio line from the habitat mast (10 m) to a suit antenna (2 m). Transparent = clear. Beyond line-of-sight a relay (rover or orbiter) is needed.',
    mission: 'Computed from HiRISE DTM',
    instrument: 'Elevation grid + line-of-sight algorithm',
    resolution: '10 m/cell',
    source: 'Our calculation. Mast and antenna heights are OUR ASSUMPTION.'
  },
  {
    id: 'walkback',
    name: 'Walk-back Time',
    description: 'Minutes to walk back to the habitat from any point (slope-aware speed model). Green 0-15, cyan 15-30, amber 30-60, orange 60-90, red over 90 min; clear = unreachable at this slope limit.',
    mission: 'Computed from elevation + slope grids',
    instrument: 'Route model [our assumption]',
    resolution: '10 m/cell',
    source: 'Our calculation — see Assumptions panel'
  },
  {
    id: 'themisDay',
    name: 'THEMIS Day IR (Thermal)',
    description: 'Daytime infrared brightness (relative). Brighter = warmer surface in the afternoon. Shown without temperature units (relative brightness only).',
    mission: 'Mars Odyssey',
    instrument: 'THEMIS (Thermal Emission Imaging System), controlled mosaic v2',
    resolution: '~100 m/px',
    source: 'NASA/JPL-Caltech/ASU via NASA Mars Trek; Edwards et al. (2011), JGR 116, E10008'
  },
  {
    id: 'themisNight',
    name: 'THEMIS Night IR (Thermal)',
    description: 'Night-time infrared brightness (relative). Ground that stays warm at night has high thermal inertia: likely bedrock or rocks rather than loose sand, so probably firmer footing (an interpretation, not a measurement).',
    mission: 'Mars Odyssey',
    instrument: 'THEMIS, controlled mosaic v2',
    resolution: '~100 m/px',
    source: 'NASA/JPL-Caltech/ASU via NASA Mars Trek; Edwards et al. (2011), JGR 116, E10008'
  }
];

/* Adds the hillshade PNG overlay.
   Shows elevation colour + shadow shading to communicate terrain depth/height.
   Must run AFTER loadGrids() so aoi.json bounds are available. */
function addHillshadeOverlay(map) {
  if (!STATE.grids || !STATE.grids.aoi) {
    console.warn('[layers] addHillshadeOverlay: grids not loaded yet');
    return;
  }
  const aoi    = STATE.grids.aoi;
  const bounds = [[aoi.south, aoi.west], [aoi.north, aoi.east]];
  const introFlying   = STATE.introFlying;
  const targetOpacity = STATE.layers.hillshade.opacity;

  const overlay = L.imageOverlay('./data/hillshade.png', bounds, {
    opacity:     introFlying ? 0 : targetOpacity,
    interactive: false
  });

  if (STATE.layers.hillshade.visible) overlay.addTo(map);
  STATE.tileLayers.hillshade = overlay;

  if (introFlying && STATE.layers.hillshade.visible) {
    document.addEventListener('marsIntroLanded', () => overlay.setOpacity(targetOpacity), { once: true });
  }
  console.log('[layers] hillshade overlay added');
}

/* Adds the slope overlay PNG to the map as a Leaflet imageOverlay.
   Positioned exactly over the study area using aoi.json bounds. */
function addSlopeOverlay(map) {
  if (!STATE.grids || !STATE.grids.aoi) {
    console.warn('[layers] addSlopeOverlay: grids not loaded yet');
    return;
  }
  const aoi = STATE.grids.aoi;
  const bounds = [[aoi.south, aoi.west], [aoi.north, aoi.east]];
  const introFlying   = STATE.introFlying;
  const targetOpacity = STATE.layers.slope.opacity;

  const overlay = L.imageOverlay('./data/slope-overlay.png', bounds, {
    opacity:     introFlying ? 0 : targetOpacity,
    interactive: false,
    errorEvent: () => console.warn('[layers] slope-overlay.png failed to load')
  });

  if (STATE.layers.slope.visible) overlay.addTo(map);
  STATE.tileLayers.slope = overlay;

  if (introFlying && STATE.layers.slope.visible) {
    document.addEventListener('marsIntroLanded', () => overlay.setOpacity(targetOpacity), { once: true });
  }
  console.log('[layers] slope overlay added');
}

/* Adds the LOS (line-of-sight / communication shadow) PNG overlay.
   Amber/red cells = terrain blocks radio signal to habitat; transparent = clear signal.
   Must run AFTER loadGrids() so aoi.json bounds are available. */
function addLosOverlay(map) {
  if (!STATE.grids || !STATE.grids.aoi) {
    console.warn('[layers] addLosOverlay: grids not loaded yet');
    return;
  }
  const aoi    = STATE.grids.aoi;
  const bounds = [[aoi.south, aoi.west], [aoi.north, aoi.east]];
  const introFlying   = STATE.introFlying;
  const targetOpacity = STATE.layers.los.opacity;

  const overlay = L.imageOverlay('./data/los-overlay.png', bounds, {
    opacity:     introFlying ? 0 : targetOpacity,
    interactive: false
  });

  if (STATE.layers.los.visible) overlay.addTo(map);
  STATE.tileLayers.los = overlay;

  if (introFlying && STATE.layers.los.visible) {
    document.addEventListener('marsIntroLanded', () => overlay.setOpacity(targetOpacity), { once: true });
  }
  console.log('[layers] LOS overlay added');
}


/* Sets the opacity of a named layer. layerId matches STATE.tileLayers keys. */
function updateLayerOpacity(layerId, opacity) {
  const layer = STATE.tileLayers[layerId];
  if (!layer) return;
  if (typeof setSiteLayerOpacity === 'function') setSiteLayerOpacity(layer, opacity);
  else if (layer.setOpacity) layer.setOpacity(opacity);
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
