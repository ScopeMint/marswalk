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

  // Place habitat marker immediately using CONFIG fallback — grids may not be loaded yet.
  // This ensures the EVA Base is always visible on first load, even on slow connections.
  initDefaultHabitat();

  // 2. Parallel async data loads — each handles its own errors
  await Promise.all([
    loadGrids(),    // elevation.bin, slope.bin, roughness.bin, aoi.json → STATE.grids
    initSafety(),   // rad-baseline.json + rems-temps.json → STATE.radBaseline, STATE.remsTemps
    initTargets(),  // targets.geojson → markers + cards in left panel
    initPov()       // pov-images.json → STATE.povImages
  ]);

  // 3. Terrain overlays — both need aoi.json bounds, so must run AFTER loadGrids()
  //    hillshade first (bottom), then slope overlay on top
  if (typeof addHillshadeOverlay === 'function' && STATE.map && STATE.grids.loaded) {
    addHillshadeOverlay(STATE.map);
  }
  if (typeof addSlopeOverlay === 'function' && STATE.map && STATE.grids.loaded) {
    addSlopeOverlay(STATE.map);
  }

  // 4. Needs grids: place habitat and start the walk-back map
  initDefaultHabitat();

  // 5. Draw temperature chart now that REMS data is loaded
  if (typeof drawTempChart === 'function') {
    // Slight delay so the canvas has rendered to its full CSS size
    setTimeout(() => drawTempChart('temp-canvas'), 100);
  }

  // 6. Show placeholder text in profile canvas (no route yet)
  if (typeof clearProfile === 'function') {
    setTimeout(() => clearProfile('profile-canvas'), 100);
  }

  console.log('[main] MarsWalk ready');
}

window.addEventListener('load', initApp);
