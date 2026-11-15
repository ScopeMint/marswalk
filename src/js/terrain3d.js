/* Standalone classic script: only initTerrain3D is public; Three loads on first open. */
const T3D_MODULE_URL = new URL('./vendor/three.module.js', document.baseURI).href; // three.js r160 (MIT), bundled locally for offline use
const T3D_VERTICES = 200; // 2x2 mean of the 400x400 input; approximately 20 m spacing.
const T3D_POLL_MS = 500; // Check live mission changes only while open.
const T3D_CLEARANCE_METERS = 2, T3D_FLIGHT_METERS = 25; // Display offsets, not terrain measurements.
const T3D_RAD = Math.PI / 180; // Degrees to radians.
const T3D_CYAN = '#3FD0C9', T3D_ORANGE = '#B07D4A'; // Mission overlay colors (--route, --accent).
let _t3d = null;

/* Creates the header entry and accessible, self-contained terrain dialog once. */
function initTerrain3D() {
  if (_t3d || !document.getElementById('top-bar')) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 't3d-toggle'; button.textContent = '3D terrain';
  button.setAttribute('aria-controls', 't3d-overlay'); button.setAttribute('aria-expanded', 'false');
  document.getElementById('top-bar').appendChild(button);
  const root = document.createElement('section');
  root.id = 't3d-overlay'; root.className = 't3d-overlay'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Gale Crater 3D terrain');
  root.innerHTML = `<header class="t3d-header"><div><span class="t3d-kicker">MARSWALK / SURFACE RECON</span>
    <h2>Gale Crater <span>in three dimensions</span></h2></div><button data-t3d="close">Close · Esc</button></header>
    <div class="t3d-stage" data-t3d="stage"><div class="t3d-labels" data-t3d="labels"></div></div>
    <div class="t3d-message" data-t3d="message" role="status"></div>
    <div class="t3d-plan-banner" data-t3d="planBanner" role="status" hidden></div>
    <aside class="t3d-controls"><div class="t3d-plan" data-t3d="plan"></div><div class="t3d-modes" aria-label="Camera modes">
      <button data-t3d="orbit" aria-pressed="true">Orbit</button><button data-t3d="fly" class="t3d-locked" aria-disabled="true" aria-pressed="false" title="Choose a destination first">Walk the route</button>
      <button data-t3d="top" aria-pressed="false">Top-down</button></div>
      <div class="t3d-flight" data-t3d="flight" hidden><button data-t3d="pause">Pause</button>
      <progress data-t3d="progress" max="1" value="0" aria-label="Route flight progress"></progress><span>25 m preview · not walking speed</span></div>
      <label class="t3d-slider">Vertical exaggeration <output data-t3d="exLabel">1.5×</output>
        <input data-t3d="ex" type="range" min="1" max="3" step="0.1" value="1.5"></label>
      <label class="t3d-slider">Local solar time <output data-t3d="sunLabel">09:00</output>
        <input data-t3d="sun" type="range" min="6" max="18" step="0.25" value="9"></label>
      <div class="t3d-sun-note"><span data-t3d="sunNote">Illustrative sun angle</span><button data-t3d="now" hidden>Now</button></div>
      <div class="t3d-sol" data-t3d="sol"></div>
      <p class="t3d-help">Drag: rotate · Scroll: zoom<br>Right / Shift-drag: pan · Pinch: zoom<br>Arrow keys: rotate · + / −: zoom</p>
    </aside>
    <div class="t3d-legend"><span class="t3d-base-key">● EVA base</span><span class="t3d-route-key">━ Planned route / targets</span><span>┄ Curiosity traverse</span></div>
    <div class="t3d-notice" data-t3d="notice" role="status"></div>
    <footer class="t3d-footer">3D: HiRISE DTM DTEEC_019698_1750_019988_1750_U01 (1 m, shown at 20 m mesh) + HiRISE orthoimage ESP_019988_1750. Vertical exaggeration as shown.</footer>`;
  document.body.appendChild(root);
  const el = {};
  root.querySelectorAll('[data-t3d]').forEach(node => { el[node.dataset.t3d] = node; });
  _t3d = { root, button, el, open: false, token: 0, ex: 1.5, labels: [], pointers: new Map(), notices: {}, mode: 'orbit' };
  button.addEventListener('click', t3dOpen); el.close.addEventListener('click', t3dClose);
  // 'fly' opens the first-person walk (walk3d.js) when it is loaded; otherwise the old 25 m fly-over
  // With no route yet, 'fly' does not stay silent: it points the user at step 1 (terrain3d-plan.js).
  ['orbit', 'fly', 'top'].forEach(mode => el[mode].addEventListener('click', () => {
    if (mode === 'fly' && !_t3d.curve) { if (typeof t3dPlanNudge === 'function') t3dPlanNudge(); return; }
    (mode === 'fly' && typeof walkOpen === 'function') ? walkOpen() : t3dMode(mode);
  }));
  if (typeof t3dPlanInit === 'function') t3dPlanInit();   // route planning inside this view
  el.pause.addEventListener('click', () => { _t3d.paused = !_t3d.paused; el.pause.textContent = _t3d.paused ? 'Resume' : 'Pause'; });
  el.ex.addEventListener('input', () => {
    _t3d.ex = Number(el.ex.value); el.exLabel.textContent = _t3d.ex.toFixed(1) + '×';
    if (_t3d.mesh) { t3dHeights(); t3dOverlays(); }
  });
  el.sun.addEventListener('input', () => { _t3d.realSun = false; t3dSun(); });
  el.now.addEventListener('click', () => { _t3d.realSun = true; t3dSun(); });
  document.addEventListener('keydown', t3dKey);
  document.addEventListener('visibilitychange', t3dVisibility);
  window.addEventListener('resize', t3dResize);
}

/* Opens without blocking on grid downloads and guards against late asynchronous results. */
async function t3dOpen() {
  const s = _t3d;
  if (s.open) return;
  s.open = true; s.root.hidden = false; s.button.setAttribute('aria-expanded', 'true'); s.el.close.focus();
  s.notices = {}; s.el.notice.textContent = ''; s.el.message.textContent = 'Loading terrain...';
  const token = ++s.token;
  try {
    s.THREE = await import(T3D_MODULE_URL);
    if (!s.open || token !== s.token) return;
    s.timer = setInterval(t3dPoll, T3D_POLL_MS); t3dPoll();
  } catch (error) {
    if (s.open && token === s.token) s.el.message.textContent = 'The 3D library could not load. Connect to the internet, then close and reopen this view. Your 2D planner is still available.';
  }
}

/* Frees every scene resource and stops requests, timers and animation on close. */
function t3dClose() {
  const s = _t3d;
  if (typeof walkClose === 'function') walkClose();   // the first-person walk sits on top of this view
  if (!s.open) return;
  s.open = false; ++s.token; clearInterval(s.timer); cancelAnimationFrame(s.frame);
  if (s.abort) s.abort.abort();
  t3dDisposeScene(); s.root.hidden = true; s.button.setAttribute('aria-expanded', 'false'); s.button.focus();
}

/* Disposes GPU resources, including pending texture objects, without touching app-owned data. */
function t3dDisposeScene() {
  const s = _t3d;
  if (s.scene) t3dDispose(s.scene);
  if (s.texture) s.texture.dispose();
  if (s.renderer) { s.renderer.dispose(); s.renderer.forceContextLoss(); s.renderer.domElement.remove(); }
  s.renderer = s.scene = s.mesh = s.texture = s.group = s.curve = null;
  s.labels = []; s.el.labels.textContent = ''; s.pointers.clear(); s.signature = ''; s.lastMs = null;
  t3dFlyReady(false); s.el.flight.hidden = true;
  if (typeof t3dPlanCancelPick === 'function') t3dPlanCancelPick();
}

/* Locks or unlocks "Walk the route". Locked still accepts a click, so it can explain what is missing. */
function t3dFlyReady(ready) {
  const button = _t3d.el.fly;
  button.setAttribute('aria-disabled', String(!ready));
  button.classList.toggle('t3d-locked', !ready); button.classList.toggle('t3d-ready', ready);
  button.title = ready ? 'First-person view along the planned route' : 'Choose a destination first';
}

/* Releases geometries and materials in an owned object hierarchy. */
function t3dDispose(object) {
  object.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => material.dispose());
  });
}

/* Waits for grids, detects route edits including in-place changes, and refreshes clock data. */
function t3dPoll() {
  const s = _t3d;
  if (!s.open || document.hidden) return;
  try {
    if (!s.mesh) {
      if (typeof STATE === 'undefined' || !STATE.grids.loaded || !STATE.grids.aoi) return;
      t3dBuild();
    }
    const signature = JSON.stringify([STATE.route, STATE.habitat, STATE.targets, STATE.selectedTarget && STATE.selectedTarget.geometry]);
    if (signature !== s.signature) { s.signature = signature; t3dOverlays(); }
    if (typeof t3dPlanUpdate === 'function') t3dPlanUpdate(true);
    t3dSun();
  } catch (error) {
    ++s.token; if (s.abort) s.abort.abort();
    clearInterval(s.timer); cancelAnimationFrame(s.frame); t3dDisposeScene();
    s.el.message.textContent = '3D terrain is unavailable on this device or with these data. Close and reopen to retry; the 2D planner remains available.';
    console.warn('[terrain3d]', error);
  }
}

/* Averages source cells and fills missing vertices outward using successive neighbor means. */
function t3dDownsample() {
  const s = _t3d, a = s.aoi, n = T3D_VERTICES, values = new Float32Array(n * n);
  let valid = 0, sumMeters = 0;
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    let sum = 0, count = 0;
    for (let r = Math.floor(row * a.height / n); r < Math.floor((row + 1) * a.height / n); r++) {
      for (let c = Math.floor(col * a.width / n); c < Math.floor((col + 1) * a.width / n); c++) {
        const value = STATE.grids.elevation[r * a.width + c];
        if (Number.isFinite(value)) { sum += value; count++; }
      }
    }
    values[row * n + col] = count ? sum / count : NaN;
    if (count) { valid++; sumMeters += sum / count; }
  }
  if (!valid) throw new Error('No finite terrain elevations');
  s.datumMeters = sumMeters / valid;
  if (valid < values.length) t3dNotice('holes', 'Missing terrain vertices filled with neighbor means; hover reports source-data gaps.');
  while (valid < values.length) {
    const updates = [];
    for (let i = 0; i < values.length; i++) if (!Number.isFinite(values[i])) {
      let sum = 0, count = 0;
      const row = Math.floor(i / n), col = i % n;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (row + dr < 0 || row + dr >= n || col + dc < 0 || col + dc >= n) continue;
        const value = values[(row + dr) * n + col + dc];
        if (Number.isFinite(value)) { sum += value; count++; }
      }
      if (count) updates.push([i, sum / count]);
    }
    updates.forEach(pair => { values[pair[0]] = pair[1]; }); valid += updates.length;
  }
  s.heights = values;
}

/* Builds a north-up metric scene; scene x is east, z is south, and y is up. */
function t3dBuild() {
  const s = _t3d, T = s.THREE; s.aoi = STATE.grids.aoi;
  s.widthMeters = s.aoi.width * s.aoi.cellSizeMeters; s.depthMeters = s.aoi.height * s.aoi.cellSizeMeters;
  t3dDownsample();
  s.scene = new T.Scene(); s.scene.fog = new T.Fog('#1a1012', 7000, 18000);
  s.renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  s.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); s.renderer.outputColorSpace = T.SRGBColorSpace;
  s.renderer.toneMapping = T.ACESFilmicToneMapping; s.renderer.toneMappingExposure = 1.15;
  const canvas = s.renderer.domElement; canvas.className = 't3d-canvas'; canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Interactive terrain. Drag or use arrow keys to orbit; plus and minus zoom.'); s.el.stage.prepend(canvas);
  s.camera = new T.PerspectiveCamera(48, 1, 0.5, 30000); s.target = new T.Vector3();
  const geometry = new T.PlaneGeometry(s.widthMeters, s.depthMeters, T3D_VERTICES - 1, T3D_VERTICES - 1);
  geometry.rotateX(-Math.PI / 2);
  s.mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color: '#ac8971', roughness: 1, metalness: 0 }));
  s.scene.add(s.mesh); t3dHeights();
  s.scene.add(new T.AmbientLight('#e4c7b8', 0.4), new T.HemisphereLight('#bac7de', '#563526', 1.1));
  s.sunLight = new T.DirectionalLight('#ffe3c2', 2.6); s.scene.add(s.sunLight);
  s.ray = new T.Raycaster(); s.pointer = new T.Vector2(); s.hover = false;
  t3dControls(canvas); t3dResize(); t3dMode('orbit'); t3dSun();
  s.el.message.textContent = ''; s.traverse = null;
  if (s.aoi.syntheticTerrain) t3dNotice('synthetic', 'WARNING: loaded terrain is synthetic, not the HiRISE DTM cited below.');
  const token = s.token;
  s.texture = new T.TextureLoader().load('./data/hirise-texture.jpg', texture => {
    if (!s.open || token !== s.token) { texture.dispose(); return; }
    texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = Math.min(8, s.renderer.capabilities.getMaxAnisotropy());
    s.mesh.material.map = texture; s.mesh.material.color.set('#ffffff'); s.mesh.material.needsUpdate = true;
  }, undefined, () => { if (s.open && token === s.token) t3dNotice('texture', 'HiRISE image unavailable — showing untextured terrain.'); });
  s.abort = new AbortController();
  fetch('./data/curiosity-traverse.geojson', { signal: s.abort.signal }).then(response => {
    if (!response.ok) throw new Error('Traverse unavailable'); return response.json();
  }).then(data => {
    if (s.open && token === s.token) { s.traverse = data.features || []; t3dOverlays(); }
  }).catch(error => { if (s.open && token === s.token && error.name !== 'AbortError') t3dNotice('traverse', 'Curiosity traverse unavailable.'); });
  t3dVisibility();
}

/* Updates only the mesh heights and normals when exaggeration changes. */
function t3dHeights() {
  const s = _t3d, positions = s.mesh.geometry.attributes.position;
  for (let i = 0; i < s.heights.length; i++) positions.setY(i, (s.heights[i] - s.datumMeters) * s.ex);
  positions.needsUpdate = true; s.mesh.geometry.computeVertexNormals(); s.mesh.geometry.computeBoundingSphere();
}

/* Samples the displayed mean terrain bilinearly in real meters before exaggeration. */
function t3dElevation(xMeters, zMeters) {
  const s = _t3d, n = T3D_VERTICES;
  const col = t3dClamp((xMeters / s.widthMeters + 0.5) * (n - 1), 0, n - 1);
  const row = t3dClamp((zMeters / s.depthMeters + 0.5) * (n - 1), 0, n - 1);
  const c = Math.min(n - 2, Math.floor(col)), r = Math.min(n - 2, Math.floor(row)), u = col - c, v = row - r;
  return (1 - v) * ((1 - u) * s.heights[r * n + c] + u * s.heights[r * n + c + 1]) +
    v * ((1 - u) * s.heights[(r + 1) * n + c] + u * s.heights[(r + 1) * n + c + 1]);
}

/* Returns a draped point with a real-meter clearance scaled with the terrain. */
function t3dPoint(xMeters, zMeters, clearanceMeters = T3D_CLEARANCE_METERS) {
  const s = _t3d;
  return new s.THREE.Vector3(xMeters, (t3dElevation(xMeters, zMeters) - s.datumMeters + clearanceMeters) * s.ex, zMeters);
}

/* Converts an in-bounds geographic coordinate to exact metric position without cell snapping. */
function t3dGeo(lon, lat) {
  const s = _t3d, a = s.aoi;
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < a.west || lon > a.east || lat < a.south || lat > a.north) return null;
  return t3dPoint(((lon - a.west) / (a.east - a.west) - 0.5) * s.widthMeters,
    ((a.north - lat) / (a.north - a.south) - 0.5) * s.depthMeters);
}

/* Rebuilds owned overlays and resets flight whenever route, base, targets or relief changes. */
function t3dOverlays() {
  const s = _t3d, T = s.THREE;
  if (s.group) { s.scene.remove(s.group); t3dDispose(s.group); }
  s.group = new T.Group(); s.scene.add(s.group); s.labels = []; s.el.labels.textContent = ''; s.curve = null;
  const habitat = STATE.habitat || { lat: CONFIG.studyArea.defaultHabitatLat, lon: CONFIG.studyArea.defaultHabitatLon };
  s.base = t3dGeo(habitat.lon, habitat.lat);
  if (s.base) t3dPin(s.base, 'EVA BASE', T3D_ORANGE, 95);
  (STATE.targets || []).forEach((feature, index) => {
    if (!feature.geometry || feature.geometry.type !== 'Point') return;
    const point = t3dGeo(...feature.geometry.coordinates), props = feature.properties || {};
    if (point) t3dPin(point, `${props.index == null ? index + 1 : props.index} · ${props.name || 'Science target'}`, T3D_CYAN, 55);
  });
  const chosen = STATE.selectedTarget;                       // a point the user picked that is not one of the listed targets
  if (chosen && chosen.id === 'custom' && chosen.geometry) {
    const point = t3dGeo(...chosen.geometry.coordinates);
    if (point) t3dPin(point, '★ Your chosen point', T3D_CYAN, 55);
  }
  const route = STATE.route || {}, points = [];
  if (route.status === 'ok' && route.cells) route.cells.forEach(cell => {
    if (!Number.isFinite(cell.row) || !Number.isFinite(cell.col) || cell.row < 0 || cell.col < 0 || cell.row >= s.aoi.height || cell.col >= s.aoi.width) return;
    const point = t3dPoint(((cell.col + 0.5) / s.aoi.width - 0.5) * s.widthMeters,
      ((cell.row + 0.5) / s.aoi.height - 0.5) * s.depthMeters);
    if (!points.length || point.distanceToSquared(points[points.length - 1]) > 0.01) points.push(point);
  });
  if (points.length > 1) {
    const curve = new T.CatmullRomCurve3(points, false, 'centripetal');
    const original = curve.getPoint.bind(curve);
    // Redrape every spline sample so smoothing never cuts underneath a ridge.
    curve.getPoint = function(t, target = new T.Vector3()) {
      original(t, target); target.x = t3dClamp(target.x, -s.widthMeters / 2, s.widthMeters / 2);
      target.z = t3dClamp(target.z, -s.depthMeters / 2, s.depthMeters / 2);
      target.y = t3dPoint(target.x, target.z).y; return target;
    };
    curve.arcLengthDivisions = Math.min(12000, Math.max(1000, points.length * 4)); curve.updateArcLengths(); s.curve = curve;
    const lengthMeters = curve.getLength();
    s.durationSeconds = t3dClamp((route.distanceMeters || lengthMeters) / 100, 20, 30);
    s.group.add(new T.Mesh(new T.TubeGeometry(curve, Math.min(16000, Math.max(200, Math.ceil(lengthMeters / 3))), 3, 5, false),   // 3 m wide line: drawn thick so it can be seen from far away, not a real width
      new T.MeshBasicMaterial({ color: T3D_CYAN })));
  }
  t3dTraverse(); t3dFlyReady(!!s.curve);
  if (s.mode === 'fly') t3dMode('orbit');
}

/* Adds a vertical beacon and a safely escaped DOM label anchored to its tip. */
function t3dPin(point, text, color, heightMeters) {
  const s = _t3d, T = s.THREE, tip = point.clone(); tip.y += heightMeters;
  const pin = new T.Mesh(new T.CylinderGeometry(2, 3, heightMeters, 6), new T.MeshBasicMaterial({ color }));
  pin.position.copy(point); pin.position.y += heightMeters / 2; s.group.add(pin);
  const label = document.createElement('span'); label.className = 't3d-pin-label'; label.textContent = text; label.style.color = color;
  s.el.labels.appendChild(label); s.labels.push({ point: tip, el: label });
}

/* Drapes densely sampled traverse segments without bridging gaps outside the study area. */
function t3dTraverse() {
  const s = _t3d, T = s.THREE, vertices = []; let latest = null;
  (s.traverse || []).forEach(feature => {
    const props = feature.properties || {}, geometry = feature.geometry || {};
    if (props.kind === 'waypoint' && geometry.type === 'Point' && Number.isFinite(Number(props.sol))) {
      const point = t3dGeo(...geometry.coordinates);
      if (point && (!latest || Number(props.sol) > latest.sol)) latest = { point, sol: Number(props.sol) };
    }
    if (props.kind !== 'traverse' || geometry.type !== 'LineString') return;
    let previous = null;
    geometry.coordinates.forEach(coordinate => {
      const point = t3dGeo(...coordinate);
      if (point && previous) {
        const steps = Math.max(1, Math.ceil(point.distanceTo(previous) / 5));
        for (let i = 0; i < steps; i++) {
          const a = previous.clone().lerp(point, i / steps), b = previous.clone().lerp(point, (i + 1) / steps);
          vertices.push(t3dPoint(a.x, a.z), t3dPoint(b.x, b.z));
        }
      }
      previous = point;
    });
  });
  if (vertices.length) {
    const line = new T.LineSegments(new T.BufferGeometry().setFromPoints(vertices), new T.LineDashedMaterial({ color: '#ffffff', dashSize: 12, gapSize: 8, transparent: true, opacity: 0.8 }));
    line.computeLineDistances(); s.group.add(line);
  }
  if (latest) t3dPin(latest.point, `Curiosity · sol ${latest.sol}`, '#ffffff', 65);
}

/* Selects a camera preset; reduced-motion users explicitly resume the initially paused flight. */
function t3dMode(mode) {
  const s = _t3d;
  if (!s.mesh || (mode === 'fly' && !s.curve)) return;
  s.mode = mode; s.elapsedSeconds = 0; s.lastMs = null; s.el.progress.value = 0;
  s.paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  s.el.pause.textContent = s.paused ? 'Resume' : 'Pause'; s.el.flight.hidden = mode !== 'fly';
  ['orbit', 'fly', 'top'].forEach(name => s.el[name].setAttribute('aria-pressed', String(mode === name)));
  s.target.set(0, 0, 0); s.radiusMeters = Math.max(s.widthMeters, s.depthMeters) * 1.55;
  s.azimuthRad = mode === 'top' ? 0 : -Math.PI / 4; s.polarRad = mode === 'top' ? 0.001 : 55 * T3D_RAD;
  if (mode === 'fly') t3dFly(0); else t3dCamera();
}

/* Positions the overview camera from spherical orbit coordinates. */
function t3dCamera() {
  const s = _t3d;
  s.camera.position.set(s.radiusMeters * Math.sin(s.polarRad) * Math.sin(s.azimuthRad),
    s.radiusMeters * Math.cos(s.polarRad), s.radiusMeters * Math.sin(s.polarRad) * Math.cos(s.azimuthRad)).add(s.target);
  s.camera.lookAt(s.target);
}

/* Advances a distance-parameterized flight at 25 real meters above the exaggerated surface. */
function t3dFly(deltaSeconds) {
  const s = _t3d;
  if (!s.curve) return;
  if (!s.paused) s.elapsedSeconds = Math.min(s.durationSeconds, s.elapsedSeconds + deltaSeconds);
  const fraction = s.elapsedSeconds / s.durationSeconds, point = s.curve.getPointAt(fraction);
  const ahead = s.curve.getPointAt(Math.min(1, fraction + 0.015));
  if (fraction >= 0.985) ahead.copy(point).add(point.clone().sub(s.curve.getPointAt(Math.max(0, fraction - 0.015))));
  s.camera.position.copy(t3dPoint(point.x, point.z, T3D_FLIGHT_METERS));
  ahead.y = t3dPoint(ahead.x, ahead.z, T3D_FLIGHT_METERS - 3).y; s.camera.lookAt(ahead);
  s.el.progress.value = fraction;
  if (fraction >= 1) { s.paused = true; s.el.pause.textContent = 'Replay'; }
}

/* Implements pointer orbit, shift/right pan and pinch zoom with pointer capture. */
function t3dControls(canvas) {
  const s = _t3d;
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('pointerdown', event => {
    canvas.focus(); canvas.setPointerCapture(event.pointerId); s.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    s.downAt = { x: event.clientX, y: event.clientY };
  });
  // A press and release in the same spot is a click (not a drag): the planner may use it to pick a point.
  canvas.addEventListener('pointerup', event => {
    const down = s.downAt; s.downAt = null;
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 6 && typeof t3dPlanClick === 'function') t3dPlanClick(event, canvas);
  });
  canvas.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    s.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); s.hover = true;
    const old = s.pointers.get(event.pointerId);
    if (!old || s.mode === 'fly') return;
    const before = Array.from(s.pointers.values()), dx = event.clientX - old.x, dy = event.clientY - old.y;
    s.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (before.length === 2) {
      const after = Array.from(s.pointers.values());
      const distanceBefore = Math.hypot(before[0].x - before[1].x, before[0].y - before[1].y);
      const distanceAfter = Math.hypot(after[0].x - after[1].x, after[0].y - after[1].y);
      if (distanceAfter > 0) s.radiusMeters *= distanceBefore / distanceAfter;
    } else if (event.shiftKey || event.buttons === 2) {
      const right = new s.THREE.Vector3().setFromMatrixColumn(s.camera.matrix, 0);
      const up = new s.THREE.Vector3().setFromMatrixColumn(s.camera.matrix, 1);
      s.target.addScaledVector(right, -dx * s.radiusMeters / rect.height).addScaledVector(up, dy * s.radiusMeters / rect.height);
    } else { s.azimuthRad -= dx * 0.006; s.polarRad = t3dClamp(s.polarRad + dy * 0.006, 0.001, 85 * T3D_RAD); }
    s.radiusMeters = t3dClamp(s.radiusMeters, 40, 14000); t3dCamera();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, event => s.pointers.delete(event.pointerId)));
  canvas.addEventListener('pointerleave', () => { s.hover = false; });
  canvas.addEventListener('wheel', event => {
    event.preventDefault(); if (s.mode === 'fly') return;
    s.radiusMeters = t3dClamp(s.radiusMeters * Math.exp(t3dClamp(event.deltaY, -100, 100) * 0.002), 40, 14000); t3dCamera();
  }, { passive: false });
}

/* Traps dialog focus, closes on Escape, and supplies keyboard camera controls. */
function t3dKey(event) {
  const s = _t3d; if (!s || !s.open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (typeof t3dPlanCancelPick === 'function' && t3dPlanCancelPick()) return;   // first Esc only leaves point-picking
    t3dClose(); return;
  }
  if (event.key === 'Tab') {
    const nodes = Array.from(s.root.querySelectorAll('button:not(:disabled), input, canvas')).filter(node => node.getClientRects().length);
    const index = nodes.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
    else if (!event.shiftKey && (index < 0 || index === nodes.length - 1)) { event.preventDefault(); nodes[0].focus(); }
  }
  if (!s.renderer || event.target !== s.renderer.domElement || s.mode === 'fly') return;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'ArrowLeft') s.azimuthRad -= 0.08;
  if (event.key === 'ArrowRight') s.azimuthRad += 0.08;
  if (event.key === 'ArrowUp') s.polarRad -= 0.08;
  if (event.key === 'ArrowDown') s.polarRad += 0.08;
  if (event.key === '+' || event.key === '=') s.radiusMeters *= 0.9;
  if (event.key === '-') s.radiusMeters *= 1.1;
  s.polarRad = t3dClamp(s.polarRad, 0.001, 85 * T3D_RAD); s.radiusMeters = t3dClamp(s.radiusMeters, 40, 14000); t3dCamera();
}

/* Moves the illustrative sun east-to-west, or reads actual clock azimuth and elevation. */
function t3dSun() {
  const s = _t3d; if (!s.sunLight || !s.scene) return;
  const hour = Number(s.el.sun.value), arcRad = (hour - 6) / 12 * Math.PI;
  let elevationRad = Math.asin(Math.sin(arcRad)), azimuthRad = hour <= 12 ? Math.PI / 2 : -Math.PI / 2;
  let clock = null;
  try { if (window.MARS_CLOCK && typeof window.MARS_CLOCK.now === 'function') clock = window.MARS_CLOCK.now(); } catch (error) { /* Clock is optional. */ }
  s.el.now.hidden = !clock;
  s.el.sol.textContent = clock && Number.isFinite(clock.mslSol) ? `CURIOSITY SOL ${clock.mslSol}` : '';
  s.el.sunLabel.textContent = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round(hour % 1 * 60)).padStart(2, '0')}`;
  const real = s.realSun && clock && Number.isFinite(clock.sunElevationDeg) && Number.isFinite(clock.sunAzimuthDeg);
  if (real) { elevationRad = clock.sunElevationDeg * T3D_RAD; azimuthRad = clock.sunAzimuthDeg * T3D_RAD; }
  s.el.sunNote.textContent = real ? `Now · sun ${clock.sunElevationDeg.toFixed(1)}° (clock)` : 'Illustrative sun angle';
  s.sunLight.position.set(Math.sin(azimuthRad) * Math.cos(elevationRad), Math.sin(elevationRad), -Math.cos(azimuthRad) * Math.cos(elevationRad)).multiplyScalar(6000);
  s.sunLight.intensity = elevationRad > 0 ? 2.6 : 0;
}

/* Resizes the canvas to its own stage, including mobile layouts. */
function t3dResize() {
  const s = _t3d; if (!s || !s.renderer) return;
  s.widthPx = s.el.stage.clientWidth; s.heightPx = s.el.stage.clientHeight;
  s.renderer.setSize(s.widthPx, s.heightPx); s.camera.aspect = s.widthPx / Math.max(1, s.heightPx); s.camera.updateProjectionMatrix();
}

/* Suspends rendering when the document is hidden and resumes without a flight time jump. */
function t3dVisibility() {
  const s = _t3d; if (!s) return;
  cancelAnimationFrame(s.frame); s.lastMs = null;
  if (s.open && s.renderer && !document.hidden) s.frame = requestAnimationFrame(t3dFrame);
}

/* Renders one frame and projects labels; throttles terrain hover raycasts to ten per second. */
function t3dFrame(nowMs) {
  const s = _t3d; if (!s.open || !s.renderer || document.hidden) return;
  const deltaSeconds = s.lastMs == null ? 0 : Math.min((nowMs - s.lastMs) / 1000, 0.1); s.lastMs = nowMs;
  if (s.mode === 'fly') {
    if (!s.paused && s.elapsedSeconds >= s.durationSeconds) s.elapsedSeconds = 0;
    t3dFly(deltaSeconds);
  }
  s.renderer.render(s.scene, s.camera);
  s.labels.forEach(label => {
    const point = label.point.clone().project(s.camera);
    label.el.hidden = point.z < -1 || point.z > 1 || Math.abs(point.x) > 1 || Math.abs(point.y) > 1;
    label.el.style.left = `${(point.x + 1) * s.widthPx / 2}px`; label.el.style.top = `${(1 - point.y) * s.heightPx / 2}px`;
  });
  if (s.hover && (!s.hoverMs || nowMs - s.hoverMs > 100)) { s.hoverMs = nowMs; t3dHover(); }
  s.frame = requestAnimationFrame(t3dFrame);
}

/* Reports source-grid elevation and slope, plus planar metric distance, never exaggerated values. */
function t3dHover() {
  const s = _t3d; s.ray.setFromCamera(s.pointer, s.camera);
  const hit = s.ray.intersectObject(s.mesh)[0];
  if (!hit) return;
}

/* Displays independent data warnings without replacing other notices. */
function t3dNotice(key, text) { _t3d.notices[key] = text; _t3d.el.notice.textContent = Object.values(_t3d.notices).join(' '); }

/* Restricts a numeric value to a closed interval. */
function t3dClamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
