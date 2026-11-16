/* site-layers.js — Real-site layers for the Curiosity boxwork study area.
   Depends on: config.js (CONFIG), state.js (STATE), grid.js (STATE.grids, latLonToCell, getCellValue).

   Adds:
     - HiRISE 25 cm orthoimage tiles (walking-scale imagery, cut by scripts/08_build_real_site.py)
     - Rock & ridge relief overlay (1 m HiRISE relief; boulder fields, ridges, scarps)
     - THEMIS day / night thermal infrared overlays (cut by scripts/09_get_themis.py)
     - Curiosity's real traverse + end-of-drive waypoints with sol numbers (NASA/JPL MMGIS)
   Also computes a validation number: how well our terrain model matches the rover's own
   reported elevations along its real path (STATE.validation). */

/* Returns Leaflet bounds [[south, west], [north, east]] for the loaded study area, or null. */
function _aoiBounds() {
  const aoi = STATE.grids && STATE.grids.aoi;
  return aoi ? [[aoi.south, aoi.west], [aoi.north, aoi.east]] : null;
}

/* Adds the HiRISE orthoimage tile layer on top of the global basemap. Needs aoi.json loaded. */
function addHiriseTiles(map) {
  const aoi = STATE.grids && STATE.grids.aoi;
  if (!aoi || !aoi.hiriseTiles) return;
  const t = aoi.hiriseTiles;
  // One photo of the whole study area (2 m/px, the same HiRISE image the 3D view uses), drawn UNDER the
  // sharp tiles. It shows the area's detail from far out (the tiles only start at zoom 12), and fills in
  // while sharp tiles are still loading, so the area is never a blurry patch or a black square.
  if (map.getPane('areaPhoto')) {
    STATE.tileLayers.areaPhoto = L.imageOverlay('./data/hirise-texture.jpg', _aoiBounds(), {
      pane: 'areaPhoto', interactive: false, opacity: STATE.layers.hirise.opacity
    });
    if (STATE.layers.hirise.visible) STATE.tileLayers.areaPhoto.addTo(map);
  }
  const layer = L.tileLayer(t.urlTemplate, {
    pane:          map.getPane('hirise') ? 'hirise' : 'tilePane',
    keepBuffer:    4,
    minZoom:       CONFIG.hirise.minZoom,
    minNativeZoom: t.minZoom,
    maxNativeZoom: t.maxNativeZoom,
    maxZoom:       CONFIG.hirise.maxZoom,
    bounds:        _aoiBounds(),
    opacity:       STATE.layers.hirise.opacity,
    attribution:   CONFIG.hirise.attribution,
    errorTileUrl:  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  });
  if (STATE.layers.hirise.visible) layer.addTo(map);
  STATE.tileLayers.hirise = layer;
}

/* Adds a study-area image overlay (PNG from src/data/) under the given layer id. */
function addSiteImageLayer(map, layerId, fileName, extraClass) {
  const bounds = _aoiBounds();
  if (!bounds || !STATE.layers[layerId]) return;
  const overlay = L.imageOverlay('./data/' + fileName, bounds, {
    opacity:     STATE.layers[layerId].opacity,
    interactive: false,
    className:   extraClass || ''
  });
  if (STATE.layers[layerId].visible) overlay.addTo(map);
  STATE.tileLayers[layerId] = overlay;
}

/* Loads curiosity-traverse.geojson and draws the rover path + waypoint dots + latest position.
   Also runs the terrain-model validation against the rover's reported elevations. */
async function addCuriosityTraverse(map) {
  let gj;
  try {
    const resp = await fetch('./data/curiosity-traverse.geojson');
    if (!resp.ok) throw new Error(resp.status);
    gj = await resp.json();
  } catch (err) {
    console.warn('[site] traverse not loaded:', err);
    return;
  }

  const group = L.layerGroup();
  const waypoints = gj.features.filter(f => f.properties.kind === 'waypoint');
  const latest = waypoints.reduce((a, b) => (b.properties.sol > (a ? a.properties.sol : -1) ? b : a), null);

  gj.features.forEach(f => {
    if (f.properties.kind !== 'traverse') return;
    const latlngs = f.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    L.polyline(latlngs, { color: '#FFFFFF', weight: 2, opacity: 0.85, dashArray: '2 5', interactive: false }).addTo(group);
  });

  waypoints.forEach(f => {
    const [lon, lat] = f.geometry.coordinates;
    const p = f.properties;
    L.circleMarker([lat, lon], { radius: 2.5, color: '#FFFFFF', weight: 1, fillColor: '#3FD0C9', fillOpacity: 0.9 })
      .bindTooltip(`Curiosity, sol ${p.sol}<br>${p.distTotalKm.toFixed(2)} km driven since landing`, { direction: 'top', className: 'target-tooltip' })
      .addTo(group);
  });

  if (latest) {
    const [lon, lat] = latest.geometry.coordinates;
    L.marker([lat, lon], {
      icon: L.divIcon({ className: 'rover-icon', html: '<div class="rover-pin" title="Curiosity">MSL</div>', iconSize: [34, 18], iconAnchor: [17, 9] }),
      zIndexOffset: 400
    }).bindTooltip(`Curiosity's latest reported position: sol ${latest.properties.sol}`, { direction: 'right', className: 'target-tooltip' })
      .addTo(group);
  }

  if (STATE.layers.traverse.visible) group.addTo(map);
  STATE.tileLayers.traverse = group;
  STATE.curiosity = { waypoints: waypoints.length, latestSol: latest ? latest.properties.sol : null };
  _validateTerrain(waypoints);
  _validateRoverSlopes(gj.features.filter(f => f.properties.kind === 'traverse'));
}

/* Walks along Curiosity's real drive path (sampled every ~5 m) and reads our slope grid underneath.
   Stores { sampleCount, fractionUnderLimit, maxSlopeDeg, limitDeg } in STATE.roverSlopeCheck.
   This is an honest check of the slope model: a rover is not an astronaut, but if our grid called the
   rover's own path "too steep" in many places, the grid (or the limit) would be suspect. */
function _validateRoverSlopes(traverses) {
  if (!STATE.grids.loaded || !traverses.length) return;
  const limit = CONFIG.slope.defaultLimitDeg, stepM = 5, mPerDeg = CONFIG.mars.radiusMeters * Math.PI / 180;
  let n = 0, under = 0, maxDeg = 0;
  traverses.forEach(f => {
    const c = f.geometry.coordinates;
    for (let i = 1; i < c.length; i++) {
      const [lon0, lat0] = c[i - 1], [lon1, lat1] = c[i];
      const dx = (lon1 - lon0) * mPerDeg * Math.cos(lat0 * Math.PI / 180), dy = (lat1 - lat0) * mPerDeg;
      const k = Math.max(1, Math.ceil(Math.hypot(dx, dy) / stepM));
      for (let j = 0; j < k; j++) {
        const t = j / k, cell = latLonToCell(lat0 + (lat1 - lat0) * t, lon0 + (lon1 - lon0) * t);
        if (!cell) continue;
        const sl = getCellValue(STATE.grids.slope, cell.row, cell.col);
        if (!isFinite(sl)) continue;
        n++; if (sl <= limit) under++; if (sl > maxDeg) maxDeg = sl;
      }
    }
  });
  if (n < 50) return;
  STATE.roverSlopeCheck = { sampleCount: n, fractionUnderLimit: under / n, maxSlopeDeg: maxDeg, limitDeg: limit };
  console.log(`[site] rover path slope check: ${(100 * under / n).toFixed(1)}% under ${limit} deg, max ${maxDeg.toFixed(1)} deg (${n} samples)`);
}

/* Compares our HiRISE elevation grid with the elevation Curiosity reported at each waypoint.
   Stores { n, meanOffsetM, rmsAfterOffsetM } in STATE.validation. A constant offset is expected
   (different vertical datums); the scatter after removing it shows how good the terrain model is. */
function _validateTerrain(waypoints) {
  if (!STATE.grids.loaded) return;
  const diffs = [];
  waypoints.forEach(f => {
    const [lon, lat] = f.geometry.coordinates;
    const cell = latLonToCell(lat, lon);
    if (!cell) return;
    const ours = getCellValue(STATE.grids.elevation, cell.row, cell.col);
    if (isFinite(ours) && isFinite(f.properties.elevGeoidM)) diffs.push(ours - f.properties.elevGeoidM);
  });
  if (diffs.length < 5) return;
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const rms = Math.sqrt(diffs.reduce((a, d) => a + (d - mean) * (d - mean), 0) / diffs.length);
  STATE.validation = { n: diffs.length, meanOffsetM: mean, rmsAfterOffsetM: rms };
  console.log(`[site] terrain check vs ${diffs.length} rover waypoints: offset ${mean.toFixed(1)} m, scatter ${rms.toFixed(2)} m`);
}

/* Lets layer opacity sliders work on vector layer groups (traverse) as well as tiles/images. */
function setSiteLayerOpacity(layer, opacity) {
  if (typeof layer.setOpacity === 'function') { layer.setOpacity(opacity); return true; }
  if (typeof layer.eachLayer === 'function') {
    layer.eachLayer(l => { if (l.setStyle) l.setStyle({ opacity, fillOpacity: opacity }); if (l.setOpacity) l.setOpacity(opacity); });
    return true;
  }
  return false;
}

/* Walk-back time bands in minutes [OUR ASSUMPTION]. */
const WALKBACK_BANDS = [
  { maxMin: 15,       rgba: [70, 195, 123, 150] },   // 0-15 min: green
  { maxMin: 30,       rgba: [63, 208, 201, 140] },   // 15-30: cyan
  { maxMin: 60,       rgba: [242, 177, 52, 150] },   // 30-60: amber
  { maxMin: 90,       rgba: [232, 116, 46, 165] },   // 60-90: orange
  { maxMin: Infinity, rgba: [229, 72, 77, 175] }     // 90+: red
];

/* Draws STATE.walkback.data into a canvas image overlay. Unreachable cells stay transparent. */
function _buildWalkbackOverlay(map) {
  const aoi = STATE.grids.aoi;
  const data = STATE.walkback && STATE.walkback.data;
  if (!aoi || !data) return;
  const cv = document.createElement('canvas');
  cv.width = aoi.width; cv.height = aoi.height;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(aoi.width, aoi.height);
  for (let i = 0; i < data.length; i++) {
    const min = data[i] / 60;
    if (!isFinite(min) || min < 0) continue;
    const band = WALKBACK_BANDS.find(b => min <= b.maxMin);
    img.data.set(band.rgba, i * 4);
  }
  ctx.putImageData(img, 0, 0);
  const old = STATE.tileLayers.walkback;
  const wasOn = old ? map.hasLayer(old) : STATE.layers.walkback.visible;
  if (old) map.removeLayer(old);
  const overlay = L.imageOverlay(cv.toDataURL(), _aoiBounds(), { opacity: STATE.layers.walkback.opacity, interactive: false, className: 'walkback-overlay' });
  if (wasOn) overlay.addTo(map);
  STATE.tileLayers.walkback = overlay;
}

/* Watches for a new walk-back field (habitat, speed or slope limit changed) and redraws the overlay. */
function _watchWalkback(map) {
  let last = null;
  setInterval(() => {
    const d = STATE.walkback && STATE.walkback.data;
    if (d && d !== last) { last = d; _buildWalkbackOverlay(map); }
  }, 400);
}

/* Adds every real-site layer. Call once after loadGrids(). Order = drawing order (bottom to top). */
async function initSiteLayers(map) {
  if (!map || !STATE.grids.loaded) return;
  addHiriseTiles(map);
  addSiteImageLayer(map, 'themisDay',   'themis-day.png',   'themis-overlay');
  addSiteImageLayer(map, 'themisNight', 'themis-night.png', 'themis-overlay');
  addSiteImageLayer(map, 'relief',      'relief-overlay.png');
  _watchWalkback(map);
  await addCuriosityTraverse(map);
}
