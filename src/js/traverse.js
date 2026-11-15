/* traverse.js — Multi-stop EVA traverse planner (like an Apollo EVA with several science stations).
   The crew ticks several targets; MarsWalk computes the slope-aware walking time for EVERY leg between the
   base and the stops (its own Web Worker, same route engine), then tries every visiting order and keeps the
   fastest one: walk out through all stops, then walk back to base along the walk-back field.
   The combined route is loaded into STATE.route, so the route card, suit model, hazards, HUD, cue card and
   3D view all work on the full traverse. Science time = TRAVERSE_WORK_PER_STOP_MIN x number of stops.
   Depends on: CONFIG, STATE, latLonToCell, drawRouteLine, updateSummaryCard, drawProfile,
               computePointOfNoReturn, updatePonrMarker, showMapMessage, clearMapMessage. */

const TRAVERSE_WORK_PER_STOP_MIN = 30;   // science time at each stop [OUR ASSUMPTION]
const TRAVERSE_MAX_STOPS = 5;            // 5! = 120 orders: brute force is exact and instant
const BASE_WORK_MINUTES = CONFIG.eva.workMinutes;   // single-target work time, restored after a traverse

let _tw = null;          // traverse worker
let _twQueue = [];       // pending {resolve} in request order

/* Creates the traverse worker and loads the current grids (including no-go zones) into it. */
function traverseWorker() {
  if (!_tw) {
    _tw = new Worker('./js/route-worker.js');
    _tw.onmessage = e => { const job = _twQueue.shift(); if (job) job.resolve(e.data); };
  }
  const g = STATE.grids;
  const elevBuf = g.elevation.buffer.slice(0), slopeBuf = g.slope.buffer.slice(0), roughBuf = g.roughness.buffer.slice(0);
  _tw.postMessage({ type: 'init_grids', elevBuf, slopeBuf, roughBuf, aoi: g.aoi }, [elevBuf, slopeBuf, roughBuf]);
  return _tw;
}

/* Asks the traverse worker for one leg from cell a to cell b. Resolves to the worker's reply. */
function traverseLeg(worker, a, b) {
  return new Promise(resolve => {
    _twQueue.push({ resolve });
    worker.postMessage({ type: 'compute_route', aoi: STATE.grids.aoi, habitatRow: a.row, habitatCol: a.col,
      targetRow: b.row, targetCol: b.col, slopeLimit: STATE.slopeLimitDeg, speedKmh: STATE.speedKmh });
  });
}

/* Returns all orderings of an array (k <= 5). */
function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  arr.forEach((x, i) => permutations(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(p => out.push([x].concat(p))));
  return out;
}

/* Plans the fastest traverse through the ticked targets and loads it as the current route. */
async function planTraverse() {
  const ticked = [...document.querySelectorAll('.trav-check:checked')].map(c => STATE.targets.find(t => t.id === c.value)).filter(Boolean);
  const out = document.getElementById('trav-result');
  if (ticked.length < 2) { out.textContent = 'Tick at least 2 targets.'; return; }
  if (ticked.length > TRAVERSE_MAX_STOPS) { out.textContent = `At most ${TRAVERSE_MAX_STOPS} stops.`; return; }
  if (!STATE.habitat || !STATE.walkback || !STATE.walkback.data) { out.textContent = 'Base not ready yet.'; return; }
  out.textContent = 'Computing every leg…';

  const base = latLonToCell(STATE.habitat.lat, STATE.habitat.lon);
  const nodes = [base].concat(ticked.map(t => latLonToCell(t.geometry.coordinates[1], t.geometry.coordinates[0])));
  const worker = traverseWorker();
  const legs = {};
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 1; j < nodes.length; j++) {
      if (i === j) continue;
      legs[i + '-' + j] = await traverseLeg(worker, nodes[i], nodes[j]);
    }
  }
  const W = STATE.grids.aoi.width;
  const backS = j => STATE.walkback.data[nodes[j].row * W + nodes[j].col];

  let best = null;
  permutations(ticked.map((_, i) => i + 1)).forEach(order => {
    let t = 0, ok = true, prev = 0;
    order.forEach(j => { const leg = legs[prev + '-' + j]; if (!leg || leg.type !== 'route_result') ok = false; else t += leg.timeSeconds; prev = j; });
    const back = backS(prev);
    if (!ok || !isFinite(back)) return;
    t += back;
    if (!best || t < best.totalS) best = { order, totalS: t, backS: back };
  });
  if (!best) { out.textContent = 'No walkable traverse at this slope limit. Raise the limit or untick a stop.'; return; }

  // Stitch legs into one route
  let cells = [], profile = [], dist = 0, time = 0, steep = 0, climb = 0, descent = 0, prev = 0;
  best.order.forEach(j => {
    const leg = legs[prev + '-' + j];
    cells = cells.concat(cells.length ? leg.cells.slice(1) : leg.cells);
    leg.profile.forEach((p, k) => { if (profile.length && k === 0) return; profile.push(Object.assign({}, p, { distanceMeters: p.distanceMeters + dist })); });
    dist += leg.distanceMeters; time += leg.timeSeconds;
    steep = Math.max(steep, leg.steepestDeg); climb += leg.climbMeters; descent += leg.descentMeters;
    prev = j;
  });

  const stops = best.order.map(j => ticked[j - 1]);
  const last = stops[stops.length - 1];
  const label = 'Traverse: ' + stops.map(s => s.properties.index).join(' → ');
  CONFIG.eva.workMinutes = TRAVERSE_WORK_PER_STOP_MIN * stops.length;
  STATE.traverse = { stops: stops.map(s => s.id), totalS: best.totalS };
  STATE.selectedTarget = {
    type: 'Feature', id: 'traverse', geometry: last.geometry,
    properties: Object.assign({}, last.properties, { name: label, targetId: last.properties.targetId,
      findings: stops.map(s => `[${s.properties.index}] ${s.properties.shortName || s.properties.name}`).join(' · ') + ` — ${TRAVERSE_WORK_PER_STOP_MIN} min science at each stop.` })
  };
  STATE.target = { lat: last.geometry.coordinates[1], lon: last.geometry.coordinates[0] };
  STATE.route = { status: 'ok', cells, distanceMeters: dist, timeSeconds: time, steepestDeg: steep,
    climbMeters: climb, descentMeters: descent, profile };
  clearMapMessage();
  drawRouteLine(cells);
  updateSummaryCard();
  if (typeof drawProfile === 'function') drawProfile('profile-canvas', profile);
  if (typeof computePointOfNoReturn === 'function') updatePonrMarker(computePointOfNoReturn());
  const mc = document.querySelector('.mission-title');
  if (mc) mc.textContent = label;

  out.textContent = `Fastest order: Base → ${stops.map(s => s.properties.index).join(' → ')} → Base. ` +
    `${(dist / 1000).toFixed(2)} km out, ${Math.round(time / 60)} min walking out + ${Math.round(best.backS / 60)} min back, ` +
    `+ ${CONFIG.eva.workMinutes} min science. (${permutations(best.order).length} orders compared.)`;
}

/* Restores single-target work time whenever a normal target is picked. */
function hookSelectTarget() {
  if (typeof selectTarget !== 'function' || window._travHooked) return;
  const original = selectTarget;
  window.selectTarget = function (feature) {
    CONFIG.eva.workMinutes = BASE_WORK_MINUTES;
    STATE.traverse = null;
    return original.apply(this, arguments);
  };
  window._travHooked = true;
}

/* Adds the Multi-stop traverse block to the Mission tools panel. Call once after targets load. */
function initTraverse() {
  hookSelectTarget();
  const anchor = document.getElementById('mission-tools');
  if (!anchor || document.getElementById('traverse-tools')) return;
  const box = document.createElement('div');
  box.id = 'traverse-tools';
  box.innerHTML = `<div class="panel-heading" style="margin-top:12px;">Multi-stop traverse</div>
    <div class="trav-list"></div>
    <button class="tool-btn trav-go" type="button">Plan fastest order</button>
    <div id="trav-result" class="ctrl-hint">Tick 2-5 targets. Every visiting order is compared; ${TRAVERSE_WORK_PER_STOP_MIN} min science per stop (our assumption).</div>`;
  anchor.after(box);
  const list = box.querySelector('.trav-list');
  const fill = () => {
    list.innerHTML = '';
    (STATE.targets || []).forEach(t => {
      const lab = document.createElement('label');
      lab.className = 'trav-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.className = 'trav-check'; cb.value = t.id;
      const span = document.createElement('span');
      span.textContent = `${t.properties.index} · ${t.properties.shortName || t.properties.name}`;
      lab.append(cb, span);
      list.appendChild(lab);
    });
  };
  fill();
  if (!list.children.length) setTimeout(fill, 1500);
  box.querySelector('.trav-go').addEventListener('click', planTraverse);
}
