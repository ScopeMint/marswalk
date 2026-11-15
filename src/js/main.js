/* main.js — Application entry point.
   All other scripts are loaded before this file in index.html.
   Call order matters: synchronous inits first, then async data loads in parallel. */

async function initApp() {
  // 1. Synchronous inits — no data dependency
  initMap();           // creates Leaflet map, adds base tile layer
  initSearch();        // wires search bar to MARS_LOCATIONS
  initRouteWorker();   // creates the Web Worker (route-worker.js)
  initLayers();        // defines LAYER_CATALOG + SLOPE_LEGEND; adds imagery tiles to map
  if (typeof initCoordinateGrid === 'function') initCoordinateGrid(STATE.map);  // lat/lon grid, off by default
  if (typeof initLandingSites === 'function') initLandingSites(STATE.map);      // NASA landing sites (loads its own file)
  initUI();            // builds layer panel + EVA controls; wires top-bar buttons
  if (typeof initAppShell === 'function') initAppShell();       // install / offline / link status
  if (typeof initMarsClock === 'function') initMarsClock();     // live sol + LMST at the site
  if (typeof initConsumables === 'function') initConsumables(); // suit & crew section in route card
  if (typeof initHazards === 'function') initHazards();         // radio shadow / rocky / steep call-outs
  if (typeof initInteract === 'function') initInteract();       // move base, any-point target, no-go zones
  if (typeof initBrief === 'function') initBrief();             // EVA cue card button
  if (typeof initTour === 'function') initTour();               // guided tour with captions
  if (typeof initTerrain3D === 'function') initTerrain3D();     // 3D HiRISE terrain view
  if (typeof initRoverCheck === 'function') initRoverCheck();   // planner vs Curiosity's real drive (button goes in the Menu)

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

  if (typeof initTraverse === 'function') initTraverse();       // multi-stop traverse (needs targets)

  // 3. Send grid data to worker once so it doesn't need to re-receive ~1 MB on every interaction
  if (STATE.grids.loaded && typeof sendGridsToWorker === 'function') {
    sendGridsToWorker();
  }

  // 4. Terrain overlays — all need aoi.json bounds, so must run AFTER loadGrids()
  //    hillshade first (bottom), then slope, then LOS and radiation on top
  if (typeof addHillshadeOverlay === 'function' && STATE.map && STATE.grids.loaded) {
    addHillshadeOverlay(STATE.map);
  }
  // Real-site layers: HiRISE 25 cm tiles, THEMIS, rock & ridge relief, Curiosity's path
  if (typeof initSiteLayers === 'function' && STATE.map && STATE.grids.loaded) {
    await initSiteLayers(STATE.map);
  }
  if (typeof addSlopeOverlay === 'function' && STATE.map && STATE.grids.loaded) {
    addSlopeOverlay(STATE.map);
  }
  if (typeof addLosOverlay === 'function' && STATE.map && STATE.grids.loaded) {
    addLosOverlay(STATE.map);
  }

  // 5. Needs grids: place habitat and start the walk-back map
  initDefaultHabitat();

  // 6. Show initial radiation badge (before any route is computed)
  if (typeof computeRadiation === 'function' && STATE.radBaseline) {
    const initRad = computeRadiation(STATE.evaHours);
    if (initRad && typeof _updateRadBadge === 'function') _updateRadBadge(initRad);
  }

  // 7. Draw temperature chart now that REMS data is loaded
  if (typeof drawTempChart === 'function') {
    // Slight delay so the canvas has rendered to its full CSS size
    setTimeout(() => drawTempChart('temp-canvas'), 100);
  }

  // 8. Show placeholder text in profile canvas (no route yet)
  if (typeof clearProfile === 'function') {
    setTimeout(() => clearProfile('profile-canvas'), 100);
  }

  // 9. Visor HUD + walk simulation (adds its own button to the top bar)
  if (typeof initHud === 'function') initHud();

  if (typeof initSunChart === 'function') initSunChart();       // today's sun elevation chart

  // Stop wheel events from floating panels reaching Leaflet's zoom handler.
  // These elements sit inside #map-container, so their wheel events would otherwise
  // bubble up and zoom the map while the user is trying to scroll the panel.
  ['summary-card', 'pov-panel', 'hover-tooltip'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('wheel', e => e.stopPropagation(), { passive: false });
  });

  // Clear, explorable charts and the plain-language route card. Both wrap functions the scripts above set up.
  if (typeof initCharts === 'function') initCharts();
  if (typeof initRouteCard === 'function') initRouteCard();
  if (typeof initStraightLine === 'function') initStraightLine();   // straight line vs safe route (adds a route-card section; must run after initRouteCard)

  // LAST: tidy the layout (tabs, grouped locations, top-bar menu). Must run after every other init.
  if (typeof initTidy === 'function') initTidy();
  // Then split the screen into four pages (plan / layers / weather / summary). Only shows and hides what exists.
  if (typeof initPages === 'function') initPages();

  console.log('[main] MarsWalk ready');
}

window.addEventListener('load', initApp);
