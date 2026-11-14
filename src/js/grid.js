/* grid.js — Load binary grid files and convert between map coordinates and grid cells.
   Depends on: config.js (CONFIG), state.js (STATE).

   Three grids are loaded: elevation (meters), slope (degrees), roughness (meters).
   All are Float32 binary files, row-major, top-left origin, same dimensions as aoi.json. */

/* Fetches a Float32 binary file and returns a Float32Array. */
async function fetchFloat32Grid(filePath) {
  const resp = await fetch(filePath);
  if (!resp.ok) throw new Error(`${resp.status} for ${filePath}`);
  const buffer = await resp.arrayBuffer();
  return new Float32Array(buffer);
}

/* Loads aoi.json + three .bin files. Stores everything in STATE.grids.
   Shows a loading message while working. */
async function loadGrids() {
  showLoadingBanner('Loading Mars terrain data...');
  try {
    const aoiResp = await fetch('./data/aoi.json');
    if (!aoiResp.ok) throw new Error(`aoi.json: ${aoiResp.status}`);
    const aoi = await aoiResp.json();

    const [elevation, slope, roughness] = await Promise.all([
      fetchFloat32Grid('./data/elevation.bin'),
      fetchFloat32Grid('./data/slope.bin'),
      fetchFloat32Grid('./data/roughness.bin')
    ]);

    const expected = aoi.width * aoi.height;
    if (elevation.length !== expected) throw new Error(`elevation.bin size mismatch`);
    if (slope.length !== expected)     throw new Error(`slope.bin size mismatch`);
    if (roughness.length !== expected) throw new Error(`roughness.bin size mismatch`);

    STATE.grids = { loaded: true, elevation, slope, roughness, aoi };

    hideLoadingBanner();
    console.log(`[grid] loaded: ${aoi.width}x${aoi.height} cells at ${aoi.cellSizeMeters}m/cell`);
    return true;

  } catch (err) {
    hideLoadingBanner();
    showErrorBanner(`Could not load terrain data: ${err.message}. Refresh the page.`);
    console.error('[grid] load error:', err);
    return false;
  }
}

/* Converts a map lat/lon to a grid { row, col }.
   Returns null if the point is outside the study area.
   row 0 = north edge, col 0 = west edge (top-left origin). */
function latLonToCell(lat, lon) {
  const aoi = STATE.grids.aoi;
  if (!aoi) return null;
  if (lat < aoi.south || lat > aoi.north || lon < aoi.west || lon > aoi.east) return null;

  const latDegPerCell = (aoi.north - aoi.south) / aoi.height;
  const lonDegPerCell = (aoi.east  - aoi.west)  / aoi.width;

  const row = Math.floor((aoi.north - lat) / latDegPerCell);
  const col = Math.floor((lon - aoi.west)  / lonDegPerCell);

  return {
    row: Math.max(0, Math.min(aoi.height - 1, row)),
    col: Math.max(0, Math.min(aoi.width  - 1, col))
  };
}

/* Converts a grid { row, col } to the center lat/lon of that cell. */
function cellToLatLon(row, col) {
  const aoi = STATE.grids.aoi;
  if (!aoi) return null;
  const latDegPerCell = (aoi.north - aoi.south) / aoi.height;
  const lonDegPerCell = (aoi.east  - aoi.west)  / aoi.width;
  return {
    lat: aoi.north - (row + 0.5) * latDegPerCell,
    lon: aoi.west  + (col + 0.5) * lonDegPerCell
  };
}

/* Returns the Float32 value from a grid array at (row, col). */
function getCellValue(floatArray, row, col) {
  const aoi = STATE.grids.aoi;
  if (!aoi || !floatArray) return NaN;
  return floatArray[row * aoi.width + col];
}

/* Returns true if (row, col) is inside bounds and walkable at the given slope limit. */
function isCellWalkable(row, col, slopeLimitDeg) {
  const aoi = STATE.grids.aoi;
  if (!aoi) return false;
  if (row < 0 || row >= aoi.height || col < 0 || col >= aoi.width) return false;

  const slope = getCellValue(STATE.grids.slope, row, col);
  if (!isFinite(slope) || slope > slopeLimitDeg) return false;

  const elev = getCellValue(STATE.grids.elevation, row, col);
  if (!isFinite(elev)) return false;

  return true;
}

/* ── Loading/error banner helpers ─────────────────────────────────────────── */

function showLoadingBanner(message) {
  let el = document.getElementById('loading-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-banner';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.display = 'block';
}

function hideLoadingBanner() {
  const el = document.getElementById('loading-banner');
  if (el) el.style.display = 'none';
}

function showErrorBanner(message) {
  let el = document.getElementById('error-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'error-banner';
    document.body.appendChild(el);
  }
  el.textContent = '⚠ ' + message;
  el.style.display = 'block';
}
