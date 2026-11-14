/* main.js — Application entry point.
   All other scripts are loaded before this file in index.html.
   Call order matters: synchronous inits first, then async data loads in parallel. */

async function initApp() {
  // 1. Synchronous inits — no data dependency
  initMap();           // creates Leaflet map, adds base tile layer
  initSearch();        // wires search bar to MARS_LOCATIONS
  initRouteWorker();   // creates the Web Worker (route-worker.js)
  initLayers();        // defines LAYER_CATALOG + SLOPE_LEGEND; adds imagery tiles to map
  initUI();            // builds layer panel + EVA controls; wires top-bar buttons

  // 2. Parallel async data loads — each handles its own errors
  await Promise.all([
    loadGrids(),    // elevation.bin, slope.bin, roughness.bin, aoi.json → STATE.grids
    initSafety(),   // rad-baseline.json + rems-temps.json → STATE.radBaseline, STATE.remsTemps
    initTargets(),  // targets.geojson → markers + cards in left panel
    initPov()       // pov-images.json → STATE.povImages
  ]);

  // 3. Slope overlay uses aoi.json bounds — must run AFTER loadGrids()
  if (typeof addSlopeOverlay === 'function' && STATE.map && STATE.grids.loaded) {
    addSlopeOverlay(STATE.map);
  }

  // 4. Needs grids: place habitat and start the walk-back map
  initDefaultHabitat();

  // 4. Draw temperature chart now that REMS data is loaded
  if (typeof drawTempChart === 'function') {
    drawTempChart('temp-canvas');
  }

  console.log('[main] MarsWalk ready');
}

window.addEventListener('load', initApp);
