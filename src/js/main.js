/* main.js — application entry point. Calls each module's init function in the right order.
   Depends on: config.js, state.js, map.js (all loaded before this in index.html). */

function initApp() {
  initMap();
  initSearch();
  // future: initLayers(); initGrid(); initTargets(); initRoute(); initSafety(); initUI(); initProfile(); initPov();
}

window.addEventListener('load', initApp);
