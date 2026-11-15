/* terrain3d-plan.js — Plan a route without leaving the 3D terrain view.
   Step 1: pick a science target from the list, or click any point on the 3D ground.
   Step 2: "Walk the route" unlocks once the route is drawn.
   This file does NO route math. It asks the same planner the 2D map uses (selectTarget / planRouteToPoint),
   so the route, distance and time are identical on both pages.
   Depends on: terrain3d.js (_t3d), state.js (STATE), targets.js (selectTarget), interact.js (planRouteToPoint). */

const T3D_PLAN_WAIT_MS = 8000;   // if the planner has not answered after this long, say so instead of waiting forever
let _t3dPlan = null;

/* Builds the planning block at the top of the 3D controls panel. Called once by initTerrain3D. */
function t3dPlanInit() {
  const s = _t3d;
  if (!s || _t3dPlan || !s.el.plan) return;
  s.el.plan.innerHTML = `
    <div class="t3d-step"><b>1</b> Choose where to walk</div>
    <div class="t3d-plan-targets" data-p="targets"></div>
    <button class="t3d-plan-pick" data-p="pick" aria-pressed="false">★ Or click any point on the terrain</button>
    <p class="t3d-plan-status" data-p="status" role="status"></p>
    <div class="t3d-step"><b>2</b> Walk it, or change the view</div>`;
  const el = {};
  s.el.plan.querySelectorAll('[data-p]').forEach(node => { el[node.dataset.p] = node; });
  _t3dPlan = { el, picking: false, waitingFor: null, waitingSince: 0, failed: '', listed: -1 };
  el.pick.addEventListener('click', () => t3dPlanPick(!_t3dPlan.picking));
}

/* Turns "click the terrain to choose a point" on or off. */
function t3dPlanPick(on) {
  const p = _t3dPlan;
  if (!p) return;
  p.picking = on;
  p.el.pick.setAttribute('aria-pressed', String(on));
  _t3d.root.classList.toggle('t3d-picking', on);
  t3dPlanUpdate();
}

/* Leaves point-picking. Returns true if it was on (so Esc does not also close the 3D view). */
function t3dPlanCancelPick() {
  if (!_t3dPlan || !_t3dPlan.picking) return false;
  t3dPlanPick(false);
  return true;
}

/* Remembers the current route so we can tell when the planner has answered with a new one. */
function t3dPlanWait() {
  const p = _t3dPlan;
  p.waitingFor = p.lastRoute = STATE.route; p.waitingSince = Date.now(); p.failed = '';
}

/* After asking for a route: if the planner refused straight away (for example the point is the base itself),
   it shows a message on the 2D map instead of "Computing route...". Show that same message here. */
function t3dPlanCheckRefused() {
  const p = _t3dPlan, box = document.getElementById('map-message');
  const text = box && box.style.display !== 'none' ? box.textContent.trim() : '';
  if (text && text.indexOf('Computing') !== 0) { p.waitingFor = null; p.failed = text; }
}

/* A science target button was pressed: ask the planner for the route to it. */
function t3dPlanChoose(feature) {
  if (typeof selectTarget !== 'function') return;
  t3dPlanPick(false); t3dPlanWait();
  selectTarget(feature);
  t3dPlanCheckRefused(); t3dPlanUpdate();
}

/* A click on the 3D canvas while picking: find the ground under the cursor, turn it into latitude/longitude,
   and ask the planner for a route there. */
function t3dPlanClick(event, canvas) {
  const s = _t3d, p = _t3dPlan;
  if (!p || !p.picking || !s.mesh || typeof planRouteToPoint !== 'function') return;
  const rect = canvas.getBoundingClientRect();
  s.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  s.ray.setFromCamera(s.pointer, s.camera);
  const hit = s.ray.intersectObject(s.mesh)[0];
  if (!hit) { p.failed = 'That click missed the terrain. Click on the ground itself.'; t3dPlanUpdate(); return; }
  const a = s.aoi;                                           // scene meters back to degrees (the reverse of t3dGeo)
  const lon = a.west + (hit.point.x / s.widthMeters + 0.5) * (a.east - a.west);
  const lat = a.north - (hit.point.z / s.depthMeters + 0.5) * (a.north - a.south);
  t3dPlanPick(false); t3dPlanWait();
  planRouteToPoint(lat, lon);
  t3dPlanCheckRefused(); t3dPlanUpdate();
}

/* "Walk the route" was pressed with no route: flash step 1 and say what to do. */
function t3dPlanNudge() {
  const p = _t3dPlan;
  if (!p) return;
  p.failed = 'Choose a destination first. Walk the route needs a route to follow.';
  const block = _t3d.el.plan;
  block.classList.remove('t3d-nudge'); void block.offsetWidth; block.classList.add('t3d-nudge');   // restart the flash
  block.scrollIntoView({ block: 'nearest' });
  t3dPlanUpdate();
}

/* Sets text only when it changed, so screen readers are not told the same thing twice a second. */
function t3dPlanText(node, text) { if (node.textContent !== text) node.textContent = text; }

/* Turns the camera to the new route so the user sees it appear: aims at its middle, zooms to fit it. */
function t3dPlanFrameRoute() {
  const s = _t3d;
  if (!s.curve || s.mode === 'fly') return;
  const points = s.curve.getSpacedPoints(40);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, sumY = 0;
  points.forEach(q => { minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minZ = Math.min(minZ, q.z); maxZ = Math.max(maxZ, q.z); sumY += q.y; });
  s.target.set((minX + maxX) / 2, sumY / points.length, (minZ + maxZ) / 2);
  s.radiusMeters = t3dClamp(Math.max(maxX - minX, maxZ - minZ) * 2.2, 700, 14000);
  t3dCamera();
}

/* Keeps the list, the status line and the top banner in step with the planner. Runs twice a second while open
   (fromPoll = true: the 3D route line has just been refreshed, so it is safe to react to a new route). */
function t3dPlanUpdate(fromPoll) {
  const p = _t3dPlan, s = _t3d;
  if (!p) return;
  const targets = STATE.targets || [], chosen = STATE.selectedTarget, route = STATE.route || {};

  // (Re)build the target buttons when the target list arrives
  if (p.listed !== targets.length) {
    p.listed = targets.length; p.el.targets.textContent = '';
    targets.forEach((feature, i) => {
      const props = feature.properties || {}, button = document.createElement('button');
      button.dataset.id = feature.id;
      button.textContent = (props.index == null ? i + 1 : props.index) + ' · ' + (props.shortName || props.name || 'Target');
      button.title = 'Plan a route to ' + (props.name || 'this target');
      button.addEventListener('click', () => t3dPlanChoose(feature));
      p.el.targets.appendChild(button);
    });
  }
  p.el.targets.querySelectorAll('button').forEach(button =>
    button.setAttribute('aria-pressed', String(!!chosen && chosen.id === button.dataset.id)));

  // A new answer from the planner replaces any older warning
  if (STATE.route !== p.lastRoute) { p.lastRoute = STATE.route; p.failed = ''; }

  // Has the planner answered?
  if (p.waitingFor && fromPoll) {
    if (STATE.route !== p.waitingFor) { p.waitingFor = null; t3dPlanFrameRoute(); }
    else if (Date.now() - p.waitingSince > T3D_PLAN_WAIT_MS) {
      p.waitingFor = null; p.failed = 'The planner did not answer. Try that destination again, or pick another.';
    }
  }

  let status, kind = 'todo', banner = '';
  if (p.picking) {
    status = p.failed || 'Click the ground where you want to go. Dragging still turns the view. Esc cancels.';
    banner = 'Click the ground where you want to walk to';
  } else if (p.waitingFor) {
    status = 'Planning the route…'; banner = 'Planning the route…';
  } else if (p.failed) {
    status = p.failed; kind = 'warn';
  } else if (route.status === 'ok' && route.cells && route.cells.length > 1) {
    // Same numbers and rounding as the route card on the main page
    const name = chosen && chosen.properties && chosen.properties.name ? ' to ' + chosen.properties.name : '';
    status = 'Route ready' + name + ': ' + (route.distanceMeters / 1000).toFixed(2) + ' km, ' +
      Math.round(route.timeSeconds / 60) + ' min one way, steepest ' + route.steepestDeg.toFixed(1) + '°. Now press Walk the route.';
    kind = 'ok';
  } else if (route.status === 'error') {
    status = (route.message || 'No walkable route there.') + ' Pick another destination.'; kind = 'warn';
  } else {
    status = 'No route yet. Pick a target above. Walk the route unlocks when the route is drawn.';
    banner = 'Step 1: choose a destination in the panel on the left.  Step 2: press Walk the route.';
  }
  if (kind === 'warn' && !banner) banner = status;
  t3dPlanText(p.el.status, status); p.el.status.dataset.kind = kind;
  t3dPlanText(s.el.planBanner, banner); s.el.planBanner.hidden = !banner; s.el.planBanner.dataset.kind = kind;
}
