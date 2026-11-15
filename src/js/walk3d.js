/* walk3d.js — First-person Marswalk: what the astronaut would see walking the planned route.
   Depends on: state.js (STATE), config.js (CONFIG), grid.js (grids loaded), route.js (STATE.route),
   pov.js (STATE.povImages), three.js r160 (./vendor/three.module.js, loaded on first open).
   Styles: css/walk3d.css. Opened by the "Walk the route" button in the 3D terrain view (terrain3d.js).

   WHAT IS REAL DATA
     - Ground shape    : HiRISE terrain model, our 10 m elevation grid, NO vertical exaggeration.
     - Ground pattern  : HiRISE orbital image (2 m/px everywhere; 0.6 m/px tiles along the route).
     - Ground colour   : the average colour of Curiosity's Mastcam photo taken at the boxwork (sol 4711).
     - Near-ground look: that same real Mastcam photo, repeated under your feet (rover's-eye texture).
     - Rockiness       : bump height comes from the measured 1 m relief in each cell (roughness grid).
     - Route, targets, base, walking speed: the planner's own numbers.
     - Photos at targets: real Curiosity images, shown when you arrive.
   WHAT IS ILLUSTRATIVE (labelled on screen)
     - Exact rock positions below 0.6 m (orbit cannot see them), sky colour, sun path, haze distance,
       eye height, and the time-lapse speed. */

const WALK_THREE_URL = new URL('./vendor/three.module.js', document.baseURI).href;
const WALK_EYE_METERS = 1.7;            // [OUR ASSUMPTION] eye height of a suited astronaut
const WALK_FOV_DEG = 70;                // field of view through the visor [OUR ASSUMPTION]
const WALK_SPEEDS = [1, 5, 15, 40];     // time-lapse choices (1 = real walking speed)
const WALK_DEFAULT_SPEED = 15;
const WALK_FREE_SPEED_MPS = 8;          // free look-around movement, NOT walking speed
const WALK_PATCH_VERTS = 161;           // detailed ground patch around you: 161 x 161 points
const WALK_PATCH_STEP_M = 0.75;         // 0.75 m apart = 120 m wide patch
const WALK_PHOTO_REPEAT_M = 2.6;        // [OUR ASSUMPTION] ground width the Mastcam photo covers
const WALK_HAZE_NEAR_M = 250, WALK_HAZE_FAR_M = 2300;   // haze hides the edge of the 4 km model
const WALK_ARRIVE_M = 35;               // show a target's rover photo within this distance
const WALK_CORRIDOR_MARGIN_M = 140, WALK_CORRIDOR_MAX_PX = 4096;
const WALK_SKY_HORIZON = '#d9b48c', WALK_SKY_ZENITH = '#9a7b5e';  // dusty tan sky [OUR ASSUMPTION]
const WALK_DETAIL_PHOTO = './data/pov/pov-3-nevado-sajama.jpg';   // Curiosity Mastcam, sol 4711
const WALK_DEG = Math.PI / 180;
let _walk = null;

/* ── Small math helpers ─────────────────────────────────────────────────── */

function walkClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function walkSmooth(a, b, x) { const t = walkClamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

/* Repeatable pseudo-random number 0..1 for a grid corner (same input = same output). */
function walkHash(ix, iz) { const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453; return s - Math.floor(s); }

/* Smooth noise 0..1: blends the random values at the four surrounding grid corners. */
function walkNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (1 - v) * ((1 - u) * walkHash(ix, iz) + u * walkHash(ix + 1, iz)) +
         v * ((1 - u) * walkHash(ix, iz + 1) + u * walkHash(ix + 1, iz + 1));
}

/* Reads a grid (elevation or roughness) at any point in meters, blending the 4 nearest cells.
   x = meters east of the area centre, z = meters south of it. */
function walkGrid(grid, x, z) {
  const w = _walk, a = w.aoi;
  const fc = walkClamp((x / w.widthM + 0.5) * a.width - 0.5, 0, a.width - 1.001);
  const fr = walkClamp((z / w.depthM + 0.5) * a.height - 0.5, 0, a.height - 1.001);
  const c = Math.floor(fc), r = Math.floor(fr), u = fc - c, v = fr - r, i = r * a.width + c;
  const g = k => (Number.isFinite(grid[k]) ? grid[k] : w.fallback[grid === STATE.grids.elevation ? 0 : 1]);
  return (1 - v) * ((1 - u) * g(i) + u * g(i + 1)) + v * ((1 - u) * g(i + a.width) + u * g(i + a.width + 1));
}

/* Smooth ground height (meters above the scene's zero level) from the HiRISE terrain model. */
function walkBase(x, z) { return walkGrid(STATE.grids.elevation, x, z) - _walk.datumM; }

/* Extra rock/ridge bump height. Size comes from the MEASURED roughness of that cell;
   the exact bump positions are illustrative (orbit cannot see single rocks). */
function walkBump(x, z) {
  const rough = walkGrid(STATE.grids.roughness, x, z);
  const amp = walkClamp(rough * 2.5, 0.03, 1.1);
  const n = 0.65 * walkNoise(x / 3.2, z / 3.2) + 0.35 * walkNoise(x / 1.1 + 17, z / 1.1 - 9);
  return amp * walkSmooth(0.35, 1, n);
}

/* ── Open / close ───────────────────────────────────────────────────────── */

/* Builds the overlay once: canvas, visor frame, readouts, controls. */
function initWalk3D() {
  if (_walk) return;
  const root = document.createElement('section');
  root.id = 'walk-overlay'; root.className = 'walk-overlay'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'First-person walk along the planned route');
  root.innerHTML = `
    <div class="walk-stage" data-w="stage"><div class="walk-labels" data-w="labels"></div></div>
    <div class="walk-visor" data-w="visor" aria-hidden="true"><i></i></div>
    <header class="walk-top">
      <div><span class="walk-kicker">MARSWALK / FIRST-PERSON EVA</span><h2 data-w="title">Walking the route</h2></div>
      <div class="walk-top-right"><span class="walk-pill" data-w="lapse"></span><button data-w="close">Close · Esc</button></div>
    </header>
    <div class="walk-compass" aria-hidden="true"><div class="walk-compass-strip" data-w="compass"></div><b>▼</b></div>
    <div class="walk-readouts">
      <div><label>Walked</label><output data-w="walked">0 m</output></div>
      <div><label>To target</label><output data-w="togo">—</output></div>
      <div><label>EVA clock</label><output data-w="clock">0:00</output></div>
      <div><label>Slope here</label><output data-w="slope">—</output></div>
      <div><label>Elevation</label><output data-w="elev">—</output></div>
      <div><label>Heading</label><output data-w="heading">—</output></div>
    </div>
    <figure class="walk-photo" data-w="photo" hidden>
      <img data-w="photoImg" alt=""><figcaption data-w="photoCap"></figcaption>
    </figure>
    <div class="walk-message" data-w="message" role="status"></div>
    <footer class="walk-bar">
      <button data-w="play">Pause</button>
      <label class="walk-speed">Time-lapse <select data-w="speed" aria-label="Time-lapse speed"></select></label>
      <input data-w="scrub" type="range" min="0" max="1" step="0.001" value="0" aria-label="Position along the route">
      <button data-w="route" hidden>↩ Back to route</button>
      <button data-w="visorBtn" aria-pressed="true">Visor</button>
      <span class="walk-help">Drag: look around · W A S D / arrows: explore freely · Space: pause</span>
    </footer>
    <p class="walk-note">Real: HiRISE terrain shape (no exaggeration), HiRISE image, colours and near-ground texture from
      Curiosity Mastcam (sol 4711), rockiness from measured 1 m relief. Illustrative: exact rock positions, sky colour,
      sun path, haze distance.</p>`;
  document.body.appendChild(root);
  const el = {};
  root.querySelectorAll('[data-w]').forEach(n => { el[n.dataset.w] = n; });
  WALK_SPEEDS.forEach(s => {
    const o = document.createElement('option');
    o.value = String(s); o.textContent = s === 1 ? '×1 (real speed)' : '×' + s;
    if (s === WALK_DEFAULT_SPEED) o.selected = true;
    el.speed.appendChild(o);
  });
  for (let deg = -360; deg <= 720; deg += 15) {            // compass tape, repeated so it can scroll
    const tick = document.createElement('span');
    const d = ((deg % 360) + 360) % 360;
    tick.textContent = d % 90 === 0 ? ['N', 'E', 'S', 'W'][d / 90] : (d % 45 === 0 ? String(d) : '·');
    if (d % 90 === 0) tick.className = 'card';
    el.compass.appendChild(tick);
  }
  _walk = { root, el, open: false, token: 0, keys: new Set(), labels: [] };

  el.close.addEventListener('click', walkClose);
  el.play.addEventListener('click', walkTogglePlay);
  el.speed.addEventListener('change', () => { _walk.lapse = Number(el.speed.value); walkHud(); });
  el.scrub.addEventListener('input', () => { walkBackToRoute(); _walk.distM = Number(el.scrub.value) * _walk.lengthM; _walk.lookYaw = _walk.lookPitch = 0; });
  el.route.addEventListener('click', walkBackToRoute);
  el.visorBtn.addEventListener('click', () => {
    const on = el.visor.hidden; el.visor.hidden = !on; el.visorBtn.setAttribute('aria-pressed', String(on));
  });
  document.addEventListener('keydown', walkKey, true);     // capture: Esc closes this view before the 3D map
  document.addEventListener('keyup', e => _walk.keys.delete(e.key.toLowerCase()));
  window.addEventListener('resize', walkResize);
  document.addEventListener('visibilitychange', () => { if (_walk.open) walkLoop(); });
}

/* Opens the first-person view for the current route. Shows a plain message if there is no route. */
async function walkOpen() {
  initWalk3D();
  const w = _walk;
  if (w.open) return;
  w.open = true; w.root.hidden = false; w.el.message.textContent = 'Loading the surface…';
  if (typeof _t3d !== 'undefined' && _t3d && _t3d.frame) cancelAnimationFrame(_t3d.frame);   // rest the 3D map underneath
  const token = ++w.token;
  try {
    if (!STATE.grids.loaded || !STATE.route || STATE.route.status !== 'ok' || !STATE.route.cells || STATE.route.cells.length < 2) {
      w.el.message.textContent = 'Plan a route first: pick a science target, then open this view again.';
      return;
    }
    w.T = await import(WALK_THREE_URL);
    if (!w.open || token !== w.token) return;
    walkBuild();
    w.el.message.textContent = '';
    w.el.close.focus();
    walkLoop();
  } catch (err) {
    console.warn('[walk3d]', err);
    if (w.open && token === w.token) w.el.message.textContent = 'The first-person view could not start on this device. The 2D planner and 3D map still work.';
  }
}

/* Closes the view and frees the graphics memory. */
function walkClose() {
  const w = _walk;
  if (!w || !w.open) return;
  w.open = false; ++w.token; cancelAnimationFrame(w.frame); w.keys.clear();
  if (w.scene) w.scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
  [w.texHirise, w.texDetail, w.texCorridor].forEach(t => { if (t) t.dispose(); });
  if (w.renderer) { w.renderer.dispose(); w.renderer.forceContextLoss(); w.renderer.domElement.remove(); }
  w.renderer = w.scene = w.far = w.patch = w.texHirise = w.texDetail = w.texCorridor = null;
  w.labels = []; w.el.labels.textContent = ''; w.el.photo.hidden = true; w.root.hidden = true;
  if (typeof t3dVisibility === 'function') t3dVisibility();   // wake the 3D map again if it is open
}

/* ── Scene building ─────────────────────────────────────────────────────── */

/* Builds everything: terrain, sky, lights, route ribbon, beacons, camera path. */
function walkBuild() {
  const w = _walk, T = w.T, a = STATE.grids.aoi;
  w.aoi = a; w.widthM = a.width * a.cellSizeMeters; w.depthM = a.height * a.cellSizeMeters;

  // Average elevation = the scene's zero level; also used where a cell has no data
  let sum = 0, n = 0;
  for (let i = 0; i < STATE.grids.elevation.length; i += 7) { const v = STATE.grids.elevation[i]; if (Number.isFinite(v)) { sum += v; n++; } }
  w.datumM = n ? sum / n : 0; w.fallback = [w.datumM, 0.1];

  w.scene = new T.Scene();
  w.scene.fog = new T.Fog(WALK_SKY_HORIZON, WALK_HAZE_NEAR_M, WALK_HAZE_FAR_M);
  w.renderer = new T.WebGLRenderer({ antialias: true });
  w.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  w.renderer.outputColorSpace = T.SRGBColorSpace;
  w.renderer.toneMapping = T.ACESFilmicToneMapping; w.renderer.toneMappingExposure = 1.05;
  const canvas = w.renderer.domElement; canvas.className = 'walk-canvas'; canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'First-person view. Drag to look around; W A S D to explore.');
  w.el.stage.prepend(canvas);
  w.camera = new T.PerspectiveCamera(WALK_FOV_DEG, 1, 0.15, 20000);
  w.camera.rotation.order = 'YXZ';

  walkMaterial(); walkFarTerrain(); walkPatchInit(); walkSky();
  w.scene.add(new T.HemisphereLight('#f0d9bd', '#7a5a3c', 1.25));
  w.sun = new T.DirectionalLight('#fff0d8', 2.4); w.scene.add(w.sun);

  walkPath(); walkMarkers(); walkCorridor(); walkLook(canvas);

  // Start state
  w.mode = 'route'; w.distM = 0; w.elapsedS = 0; w.lookYaw = 0; w.lookPitch = 0; w.yaw = null; w.eyeY = null;
  w.lapse = Number(w.el.speed.value); w.lastMs = null; w.bobT = 0; w.lastDragMs = 0;
  w.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  w.paused = w.reduced; w.el.play.textContent = w.paused ? 'Play' : 'Pause';
  w.el.route.hidden = true; w.el.scrub.value = 0;
  const t = STATE.selectedTarget && STATE.selectedTarget.properties;
  w.el.title.textContent = 'Walking to ' + (t && t.name ? t.name : 'the target');
  walkResize();
}

/* Ground material: HiRISE brightness pattern, coloured and textured from the real Mastcam photo. */
function walkMaterial() {
  const w = _walk, T = w.T, token = w.token;
  w.uniforms = {
    uDetail: { value: null }, uDetailMean: { value: new T.Vector3(0.53, 0.42, 0.28) }, uDetailOn: { value: 0 },
    uTint: { value: new T.Color(136 / 255, 108 / 255, 72 / 255) },   // replaced by the photo's real average below
    uLumMean: { value: 0.15 },
    uCorr: { value: null }, uCorrBox: { value: new T.Vector4(0, 0, 1, 1) }, uCorrOn: { value: 0 },
    uRepeat: { value: WALK_PHOTO_REPEAT_M }
  };
  w.material = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
  w.material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, w.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWalkPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWalkPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWalkPos;
        uniform sampler2D uDetail; uniform vec3 uDetailMean; uniform float uDetailOn;
        uniform vec3 uTint; uniform float uLumMean; uniform float uRepeat;
        uniform sampler2D uCorr; uniform vec4 uCorrBox; uniform float uCorrOn;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 orbit = diffuseColor.rgb;                                   // HiRISE image, 2 m/px
        if (uCorrOn > 0.5) {                                             // sharper HiRISE tiles along the route
          vec2 cuv = (vWalkPos.xz - uCorrBox.xy) / uCorrBox.zw;
          if (cuv.x > 0.0 && cuv.x < 1.0 && cuv.y > 0.0 && cuv.y < 1.0) {
            vec4 c = texture2D(uCorr, vec2(cuv.x, 1.0 - cuv.y));
            float edge = smoothstep(0.0, 0.03, min(min(cuv.x, 1.0 - cuv.x), min(cuv.y, 1.0 - cuv.y)));
            orbit = mix(orbit, c.rgb, c.a * edge);
          }
        }
        float lum = dot(orbit, vec3(0.3333)) / uLumMean;                 // brightness pattern seen from orbit
        vec3 ground = uTint * clamp(lum, 0.25, 2.2);                     // coloured like the rover photo
        if (uDetailOn > 0.5) {                                           // rover-photo texture near your feet
          float d = distance(vWalkPos, cameraPosition);
          vec3 near1 = texture2D(uDetail, vWalkPos.xz / uRepeat).rgb / uDetailMean;
          vec3 near2 = texture2D(uDetail, vWalkPos.zx / (uRepeat * 5.3) + 0.37).rgb / uDetailMean;
          float f1 = 1.0 - smoothstep(8.0, 45.0, d), f2 = 1.0 - smoothstep(40.0, 320.0, d);
          ground *= mix(vec3(1.0), near1, f1) * mix(vec3(1.0), near2, f2 * 0.55);
        }
        diffuseColor.rgb = ground;`);
  };

  w.texHirise = new T.TextureLoader().load('./data/hirise-texture.jpg', tex => {
    if (token !== w.token) { tex.dispose(); return; }
    tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = Math.min(8, w.renderer.capabilities.getMaxAnisotropy());
    w.material.map = tex; w.material.needsUpdate = true;
  });

  // The real Mastcam photo: measure its average colour, then use it as the near-ground texture
  const img = new Image();
  img.onload = () => {
    if (token !== w.token || !w.open) return;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 64);
    const px = g.getImageData(0, 0, 64, 64).data; let r = 0, gr = 0, b = 0;
    for (let i = 0; i < px.length; i += 4) { r += px[i]; gr += px[i + 1]; b += px[i + 2]; }
    const count = px.length / 4; r /= count * 255; gr /= count * 255; b /= count * 255;
    w.uniforms.uDetailMean.value.set(r, gr, b);
    w.uniforms.uTint.value.setRGB(r, gr, b, T.SRGBColorSpace);          // real average colour of the bedrock
    const tex = new T.Texture(img);
    tex.wrapS = tex.wrapT = T.MirroredRepeatWrapping; tex.colorSpace = T.NoColorSpace;
    tex.anisotropy = Math.min(8, w.renderer.capabilities.getMaxAnisotropy()); tex.needsUpdate = true;
    w.texDetail = tex; w.uniforms.uDetail.value = tex; w.uniforms.uDetailOn.value = 1;
  };
  img.src = WALK_DETAIL_PHOTO;
}

/* The whole 4 km area at 10 m spacing: one point per elevation cell, real heights. */
function walkFarTerrain() {
  const w = _walk, T = w.T, a = w.aoi, n = a.width * a.height;
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let r = 0; r < a.height; r++) for (let c = 0; c < a.width; c++) {
    const i = r * a.width + c, x = ((c + 0.5) / a.width - 0.5) * w.widthM, z = ((r + 0.5) / a.height - 0.5) * w.depthM;
    const e = STATE.grids.elevation[i];
    pos[i * 3] = x; pos[i * 3 + 1] = (Number.isFinite(e) ? e : w.datumM) - w.datumM - 0.05; pos[i * 3 + 2] = z;
    uv[i * 2] = (c + 0.5) / a.width; uv[i * 2 + 1] = 1 - (r + 0.5) / a.height;
  }
  const idx = new Uint32Array((a.width - 1) * (a.height - 1) * 6); let k = 0;
  for (let r = 0; r < a.height - 1; r++) for (let c = 0; c < a.width - 1; c++) {
    const i = r * a.width + c;
    idx[k++] = i; idx[k++] = i + a.width; idx[k++] = i + 1; idx[k++] = i + 1; idx[k++] = i + a.width; idx[k++] = i + a.width + 1;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
  geo.setIndex(new T.BufferAttribute(idx, 1)); geo.computeVertexNormals();
  w.far = new T.Mesh(geo, w.material); w.scene.add(w.far);
}

/* The detailed patch that follows you: fine grid whose bumps come from the measured roughness. */
function walkPatchInit() {
  const w = _walk, T = w.T, n = WALK_PATCH_VERTS;
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * n * 3), 3));
  geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(n * n * 2), 2));
  const idx = new Uint32Array((n - 1) * (n - 1) * 6); let k = 0;
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const i = r * n + c;
    idx[k++] = i; idx[k++] = i + n; idx[k++] = i + 1; idx[k++] = i + 1; idx[k++] = i + n; idx[k++] = i + n + 1;
  }
  geo.setIndex(new T.BufferAttribute(idx, 1));
  w.patch = new T.Mesh(geo, w.material); w.patch.frustumCulled = false; w.scene.add(w.patch);
  w.patchKey = '';
}

/* Re-centres the detailed patch on you when you have moved one grid step. Bumps fade out at its rim
   so it blends into the smooth 10 m terrain. */
function walkPatchUpdate(camX, camZ) {
  const w = _walk, n = WALK_PATCH_VERTS, step = WALK_PATCH_STEP_M, half = (n - 1) / 2;
  const cx = Math.round(camX / step) * step, cz = Math.round(camZ / step) * step, key = cx + ',' + cz;
  if (key === w.patchKey) return;
  w.patchKey = key;
  const pos = w.patch.geometry.attributes.position, uv = w.patch.geometry.attributes.uv, rim = half * step;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const i = r * n + c, x = cx + (c - half) * step, z = cz + (r - half) * step;
    const fade = 1 - walkSmooth(rim * 0.62, rim * 0.97, Math.max(Math.abs(x - cx), Math.abs(z - cz)));
    pos.setXYZ(i, x, walkBase(x, z) + walkBump(x, z) * fade, z);
    uv.setXY(i, x / w.widthM + 0.5, 0.5 - z / w.depthM);
  }
  pos.needsUpdate = true; uv.needsUpdate = true; w.patch.geometry.computeVertexNormals();
}

/* Sky dome: pale dusty horizon to darker tan overhead, with a small bright sun. */
function walkSky() {
  const w = _walk, T = w.T;
  w.skyUniforms = { uHorizon: { value: new T.Color(WALK_SKY_HORIZON) }, uZenith: { value: new T.Color(WALK_SKY_ZENITH) },
                    uSunDir: { value: new T.Vector3(0, 1, 0) } };
  const sky = new T.Mesh(new T.SphereGeometry(15000, 32, 16), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false, uniforms: w.skyUniforms,
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uSunDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
        float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
        col += vec3(1.0, 0.95, 0.85) * (pow(s, 2200.0) * 3.0 + pow(s, 60.0) * 0.22 + pow(s, 8.0) * 0.07);  // small sun + glow
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  sky.renderOrder = -1; w.sky = sky; w.scene.add(sky);
}

/* Turns the planner's route cells into a smooth walking line measured in real meters. */
function walkPath() {
  const w = _walk, T = w.T, a = w.aoi, pts = [];
  STATE.route.cells.forEach((cell, i) => {
    if (i % 2 && i !== STATE.route.cells.length - 1) return;           // every 2nd cell: removes grid zig-zag
    pts.push(new T.Vector3(((cell.col + 0.5) / a.width - 0.5) * w.widthM, 0, ((cell.row + 0.5) / a.height - 0.5) * w.depthM));
  });
  w.curve = new T.CatmullRomCurve3(pts, false, 'centripetal');
  w.curve.arcLengthDivisions = Math.max(400, pts.length * 12); w.curve.updateArcLengths();
  w.lengthM = w.curve.getLength();
  // Real average walking speed on this route, straight from the planner's time model
  const r = STATE.route;
  w.walkMps = (r.timeSeconds > 0 && r.distanceMeters > 0) ? r.distanceMeters / r.timeSeconds : (STATE.speedKmh || 3) / 3.6;
  w.endPoint = w.curve.getPointAt(1);
}

/* Route ribbon on the ground, plus tall thin beacons and name labels for base and targets. */
function walkMarkers() {
  const w = _walk, T = w.T, verts = [], steps = Math.max(2, Math.ceil(w.lengthM / 1.5)), p = new T.Vector3(), q = new T.Vector3();
  for (let i = 0; i <= steps; i++) {
    w.curve.getPointAt(i / steps, p); w.curve.getPointAt(Math.min(1, (i + 0.5) / steps), q);
    let dx = q.x - p.x, dz = q.z - p.z; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    const y = walkBase(p.x, p.z) + walkBump(p.x, p.z) + 0.07;
    verts.push(p.x - dz * 0.09, y, p.z + dx * 0.09, p.x + dz * 0.09, y, p.z - dx * 0.09);   // 18 cm wide guide line
  }
  const idx = [];
  for (let i = 0; i < steps; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3)); geo.setIndex(idx);
  w.scene.add(new T.Mesh(geo, new T.MeshBasicMaterial({ color: '#3FD0C9', transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false })));

  w.stops = [];
  const add = (lon, lat, text, color, props) => {
    if (!Number.isFinite(lon) || lon < w.aoi.west || lon > w.aoi.east || lat < w.aoi.south || lat > w.aoi.north) return;
    const x = ((lon - w.aoi.west) / (w.aoi.east - w.aoi.west) - 0.5) * w.widthM;
    const z = ((w.aoi.north - lat) / (w.aoi.north - w.aoi.south) - 0.5) * w.depthM, y = walkBase(x, z);
    const beam = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 40, 6), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }));
    beam.position.set(x, y + 20, z); w.scene.add(beam);
    const label = document.createElement('span'); label.className = 'walk-label'; label.textContent = text; label.style.color = color;
    w.el.labels.appendChild(label); w.labels.push({ point: new T.Vector3(x, y + 41, z), el: label });
    w.stops.push({ x, z, props });
  };
  const hab = STATE.habitat || { lat: CONFIG.studyArea.defaultHabitatLat, lon: CONFIG.studyArea.defaultHabitatLon };
  add(hab.lon, hab.lat, 'EVA BASE', '#D9622B', null);
  (STATE.targets || []).forEach((f, i) => {
    if (!f.geometry || f.geometry.type !== 'Point') return;
    const p = f.properties || {};
    add(f.geometry.coordinates[0], f.geometry.coordinates[1], (p.index == null ? i + 1 : p.index) + ' · ' + (p.shortName || p.name || 'Target'), '#3FD0C9', p);
  });
}

/* Sharper ground along the route: stitches the app's own HiRISE map tiles (0.6 m/px) into one texture. */
function walkCorridor() {
  const w = _walk, T = w.T, a = w.aoi, token = w.token, tiles = a.hiriseTiles;
  if (!tiles || !tiles.urlTemplate) return;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  w.curve.getSpacedPoints(200).forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); });
  minX = Math.max(minX - WALK_CORRIDOR_MARGIN_M, -w.widthM / 2); maxX = Math.min(maxX + WALK_CORRIDOR_MARGIN_M, w.widthM / 2);
  minZ = Math.max(minZ - WALK_CORRIDOR_MARGIN_M, -w.depthM / 2); maxZ = Math.min(maxZ + WALK_CORRIDOR_MARGIN_M, w.depthM / 2);
  const lonOf = x => a.west + (x / w.widthM + 0.5) * (a.east - a.west), latOf = z => a.north - (z / w.depthM + 0.5) * (a.north - a.south);
  const west = lonOf(minX), east = lonOf(maxX), north = latOf(minZ), south = latOf(maxZ);
  const metersPerDeg = w.depthM / (a.north - a.south);

  // Pick the sharpest tile zoom whose stitched image still fits in one texture
  let zoom = tiles.maxNativeZoom || 17, pxPerDeg;
  for (; zoom >= (tiles.minZoom || 13); zoom--) {
    pxPerDeg = 256 * Math.pow(2, zoom) / 360;
    if (Math.max((east - west), (north - south)) * pxPerDeg <= WALK_CORRIDOR_MAX_PX) break;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round((east - west) * pxPerDeg)); canvas.height = Math.max(2, Math.round((north - south) * pxPerDeg));
  const ctx = canvas.getContext('2d');
  const tex = new T.CanvasTexture(canvas); tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = Math.min(8, w.renderer.capabilities.getMaxAnisotropy());
  w.texCorridor = tex; w.uniforms.uCorr.value = tex; w.uniforms.uCorrBox.value.set(minX, minZ, maxX - minX, maxZ - minZ);

  // Standard web-map tile numbering (Web Mercator), the same scheme Leaflet uses for these tiles
  const count = Math.pow(2, zoom);
  const tileX = lon => Math.floor((lon + 180) / 360 * count);
  const tileY = lat => Math.floor((1 - Math.asinh(Math.tan(lat * WALK_DEG)) / Math.PI) / 2 * count);
  const tileLat = y => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / count))) / WALK_DEG;
  let pending = 0, drawn = 0;
  for (let ty = tileY(north); ty <= tileY(south); ty++) for (let tx = tileX(west); tx <= tileX(east); tx++) {
    const img = new Image(); pending++;
    img.onload = () => {
      if (token !== w.token || !w.open) return;
      const lonW = tx / count * 360 - 180, lonE = (tx + 1) / count * 360 - 180, latN = tileLat(ty), latS = tileLat(ty + 1);
      const px = (lonW - west) / (east - west) * canvas.width, py = (north - latN) / (north - south) * canvas.height;
      const pw = (lonE - lonW) / (east - west) * canvas.width, ph = (latN - latS) / (north - south) * canvas.height;
      // whole-pixel edges with 1 px overlap: no see-through gaps (dark seams) between neighbouring tiles
      ctx.drawImage(img, Math.floor(px), Math.floor(py), Math.ceil(px + pw) - Math.floor(px) + 1, Math.ceil(py + ph) - Math.floor(py) + 1);
      drawn++; tex.needsUpdate = true; w.uniforms.uCorrOn.value = 1;
    };
    img.onerror = () => {};                                             // no tile there: keep the 2 m image
    img.src = tiles.urlTemplate.replace('{z}', zoom).replace('{x}', tx).replace('{y}', ty);
  }
  w.corridorInfo = { zoom, metersPerPixel: metersPerDeg / pxPerDeg, tiles: pending, width: canvas.width, height: canvas.height };
}

/* ── Input ──────────────────────────────────────────────────────────────── */

/* Drag on the view to look around. */
function walkLook(canvas) {
  const w = _walk; let last = null;
  canvas.addEventListener('pointerdown', e => { canvas.focus(); canvas.setPointerCapture(e.pointerId); last = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', e => {
    if (!last) return;
    w.lookYaw += (e.clientX - last.x) * 0.0045; w.lookPitch = walkClamp(w.lookPitch - (e.clientY - last.y) * 0.0045, -1.1, 1.1);
    last = { x: e.clientX, y: e.clientY }; w.lastDragMs = performance.now();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => canvas.addEventListener(t, () => { last = null; }));
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

/* Keyboard: Esc closes, Space pauses, W A S D / arrows switch to free exploring. */
function walkKey(e) {
  const w = _walk;
  if (!w || !w.open) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); walkClose(); return; }
  if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); e.stopImmediatePropagation(); walkTogglePlay(); return; }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
    e.preventDefault(); e.stopImmediatePropagation(); w.keys.add(k);
    if (k !== 'shift' && w.mode === 'route' && w.camera) walkFreeRoam();
  }
}

function walkTogglePlay() {
  const w = _walk;
  if (w.mode === 'free') { walkBackToRoute(); w.paused = false; }
  else if (w.distM >= w.lengthM) { w.distM = 0; w.elapsedS = 0; w.paused = false; }
  else w.paused = !w.paused;
  w.el.play.textContent = w.paused ? 'Play' : 'Pause';
}

/* Leaves the route so you can wander. Your position on the route is remembered. */
function walkFreeRoam() {
  const w = _walk;
  w.mode = 'free'; w.freeX = w.camera.position.x; w.freeZ = w.camera.position.z;
  w.freeYaw = (w.yaw || 0) + w.lookYaw; w.lookYaw = 0;
  w.el.route.hidden = false; w.el.play.textContent = 'Resume route';
}

function walkBackToRoute() {
  const w = _walk;
  if (w.mode !== 'free') return;
  w.mode = 'route'; w.lookYaw = 0; w.lookPitch = 0; w.el.route.hidden = true;
  w.el.play.textContent = w.paused ? 'Play' : 'Pause';
}

/* ── Per-frame update ───────────────────────────────────────────────────── */

function walkLoop() {
  const w = _walk;
  cancelAnimationFrame(w.frame); w.lastMs = null;
  if (w.open && w.renderer && !document.hidden) w.frame = requestAnimationFrame(walkFrame);
}

/* Moves you, aims the camera, updates sun, patch, labels and readouts, then draws one frame. */
function walkFrame(nowMs) {
  const w = _walk;
  if (!w.open || !w.renderer) return;
  const dt = w.lastMs == null ? 0 : Math.min((nowMs - w.lastMs) / 1000, 0.1); w.lastMs = nowMs;
  let x, z, pathYaw, moving = false;

  if (w.mode === 'route') {
    if (!w.paused && w.distM < w.lengthM) {
      w.distM = Math.min(w.lengthM, w.distM + w.walkMps * w.lapse * dt); moving = true;
      if (w.distM >= w.lengthM) { w.paused = true; w.el.play.textContent = 'Replay'; }
    }
    w.elapsedS = w.distM / w.walkMps;
    const p = w.curve.getPointAt(w.distM / w.lengthM), ahead = w.curve.getPointAt(Math.min(1, (w.distM + 9) / w.lengthM));
    if (w.distM + 9 >= w.lengthM) { const back = w.curve.getPointAt(Math.max(0, (w.distM - 9) / w.lengthM)); ahead.set(2 * p.x - back.x, 0, 2 * p.z - back.z); }
    x = p.x; z = p.z; pathYaw = Math.atan2(ahead.x - p.x, -(ahead.z - p.z));
    if (w.yaw == null) w.yaw = pathYaw;
    let diff = pathYaw - w.yaw; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
    w.yaw += diff * Math.min(1, dt * 2.2);                              // turn smoothly, like a person
    if (moving && nowMs - w.lastDragMs > 4000) { w.lookYaw *= 1 - Math.min(1, dt * 1.2); w.lookPitch *= 1 - Math.min(1, dt * 1.2); }
    w.el.scrub.value = String(w.distM / w.lengthM);
  } else {
    const k = w.keys, fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const side = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0), turn = (k.has('arrowright') ? 1 : 0) - (k.has('arrowleft') ? 1 : 0);
    w.freeYaw += turn * dt * 1.6;
    const yaw = w.freeYaw + w.lookYaw, speed = WALK_FREE_SPEED_MPS * (k.has('shift') ? 3 : 1) * dt;
    w.freeX = walkClamp(w.freeX + (Math.sin(yaw) * fwd + Math.cos(yaw) * side) * speed, -w.widthM / 2 + 6, w.widthM / 2 - 6);
    w.freeZ = walkClamp(w.freeZ + (-Math.cos(yaw) * fwd + Math.sin(yaw) * side) * speed, -w.depthM / 2 + 6, w.depthM / 2 - 6);
    x = w.freeX; z = w.freeZ; w.yaw = w.freeYaw; moving = !!(fwd || side);
  }

  // Eye height above the real ground (smoothed so bumps do not shake the view)
  const groundY = walkBase(x, z) + walkBump(x, z), targetY = groundY + WALK_EYE_METERS;
  w.eyeY = w.eyeY == null ? targetY : w.eyeY + (targetY - w.eyeY) * Math.min(1, dt * 6);
  if (moving && !w.reduced) w.bobT += dt * 9.5;
  const bob = w.reduced ? 0 : Math.sin(w.bobT) * 0.022;
  w.camera.position.set(x, Math.max(w.eyeY, groundY + 0.9) + bob, z);
  const aheadY = walkBase(x + Math.sin(w.yaw) * 12, z - Math.cos(w.yaw) * 12);
  const slopePitch = Math.atan2(aheadY - walkBase(x, z), 12) * 0.6;
  w.camera.rotation.set(walkClamp(slopePitch - 0.06 + w.lookPitch, -1.3, 1.3), -(w.yaw + w.lookYaw), 0);

  // Sun moves with the EVA clock (illustrative east-to-west arc, same model as the 3D map)
  const hour = walkClamp((STATE.evaStartHour == null ? 8 : STATE.evaStartHour) + w.elapsedS / 3600, 0, 24);
  const elev = Math.asin(walkClamp(Math.sin((hour - 6) / 12 * Math.PI), -1, 1)), az = hour <= 12 ? Math.PI / 2 : -Math.PI / 2;
  const sunY = Math.max(Math.sin(elev), 0.06), sx = Math.sin(az) * Math.cos(elev) + 0.25, sz = 0.35;   // slightly south of overhead
  w.sun.position.set(sx, sunY, sz).normalize().multiplyScalar(5000).add(w.camera.position);
  w.sun.target.position.copy(w.camera.position); w.sun.target.updateMatrixWorld();
  w.sun.intensity = elev > 0 ? 0.9 + 1.7 * Math.sin(elev) : 0.15;
  w.skyUniforms.uSunDir.value.set(sx, sunY, sz).normalize();
  w.sky.position.copy(w.camera.position);

  walkPatchUpdate(x, z);
  w.renderer.render(w.scene, w.camera);

  w.labels.forEach(l => {
    const p = l.point.clone().project(w.camera), dist = l.point.distanceTo(w.camera.position);
    l.el.hidden = p.z < -1 || p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05 || dist > WALK_HAZE_FAR_M;
    l.el.style.left = (p.x + 1) * w.widthPx / 2 + 'px'; l.el.style.top = (1 - p.y) * w.heightPx / 2 + 'px';
  });
  if (!w.hudMs || nowMs - w.hudMs > 120) { w.hudMs = nowMs; w.pos = { x, z }; walkHud(); }
  w.frame = requestAnimationFrame(walkFrame);
}

/* Readouts: every number comes from the planner's grids and route, never from the picture. */
function walkHud() {
  const w = _walk;
  if (!w.pos || !w.camera) return;
  const { x, z } = w.pos, a = w.aoi, el = w.el;
  const col = walkClamp(Math.floor((x / w.widthM + 0.5) * a.width), 0, a.width - 1), row = walkClamp(Math.floor((z / w.depthM + 0.5) * a.height), 0, a.height - 1);
  const slope = STATE.grids.slope[row * a.width + col], elevation = STATE.grids.elevation[row * a.width + col];
  const meters = m => (m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m');
  el.walked.textContent = w.mode === 'route' ? meters(w.distM) + ' of ' + meters(w.lengthM) : 'off route';
  el.togo.textContent = meters(Math.hypot(x - w.endPoint.x, z - w.endPoint.z)) + (w.mode === 'route' ? '' : ' (straight)');
  const mins = Math.floor(w.elapsedS / 60);
  el.clock.textContent = Math.floor(mins / 60) + ':' + String(mins % 60).padStart(2, '0') + ' h';
  el.slope.textContent = Number.isFinite(slope) ? slope.toFixed(1) + '°' : 'no data';
  el.slope.classList.toggle('warn', Number.isFinite(slope) && slope > (STATE.slopeLimitDeg || 15));
  el.elev.textContent = Number.isFinite(elevation) ? Math.round(elevation) + ' m' : 'no data';
  const heading = (((w.yaw + w.lookYaw) / WALK_DEG) % 360 + 360) % 360;
  el.heading.textContent = String(Math.round(heading)).padStart(3, '0') + '° ' + ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(heading / 45) % 8];
  el.compass.style.transform = 'translateX(' + (-(heading + 360) / 15 * 44) + 'px)';
  el.lapse.textContent = w.mode === 'free' ? 'FREE LOOK-AROUND · not walking speed'
    : (w.lapse === 1 ? 'REAL WALKING SPEED' : 'TIME-LAPSE ×' + w.lapse) + ' · ' + (w.walkMps * 3.6).toFixed(1) + ' km/h average on this route';

  // Real rover photo when you reach a science target that has one
  let near = null;
  (w.stops || []).forEach(s => { if (s.props && Math.hypot(x - s.x, z - s.z) < WALK_ARRIVE_M) near = s.props; });
  const photo = near && (STATE.povImages || []).find(p => p.id === near.povPhotoId || p.targetId === near.targetId);
  if (photo && photo.filename) {
    if (el.photo.dataset.id !== photo.id) {
      el.photo.dataset.id = photo.id; el.photoImg.src = './data/pov/' + photo.filename;
      el.photoImg.alt = photo.description || 'Curiosity photo at this target';
      el.photoCap.textContent = 'What Curiosity really saw here: ' + (photo.camera || 'rover camera') + ', sol ' + photo.sol + '. Credit: ' + (photo.credit || 'NASA/JPL-Caltech');
    }
    el.photo.hidden = false;
  } else el.photo.hidden = true;
}

function walkResize() {
  const w = _walk;
  if (!w || !w.renderer) return;
  w.widthPx = w.el.stage.clientWidth; w.heightPx = w.el.stage.clientHeight;
  w.renderer.setSize(w.widthPx, w.heightPx); w.camera.aspect = w.widthPx / Math.max(1, w.heightPx); w.camera.updateProjectionMatrix();
}
