/* route-worker.js — Web Worker: Dijkstra walk-back map + gradient-descent route.
   NOT in index.html <script> tags. Loaded via: new Worker('./js/route-worker.js')

   Messages IN:
     { type: 'compute_walkback', elevBuf, slopeBuf, roughBuf, aoi, habitatRow, habitatCol, slopeLimit, speedKmh }
     { type: 'compute_route',    ...same... + targetRow, targetCol }

   Messages OUT:
     { type: 'walkback_result', dataBuf }     — Float32Array as transferable ArrayBuffer (seconds per cell)
     { type: 'route_result', cells, distanceMeters, timeSeconds, steepestDeg, climbMeters, descentMeters, profile }
     { type: 'route_error', message }

   All numbers come from the aoi and CONFIG-equivalent constants passed in with the message.
   No magic numbers in this file. */

/* ── Speed model constants (passed in via aoi or hardcoded from CONFIG equivalents) ───── */
/* These match CONFIG in config.js — keep in sync if config.js values change */
const WALK_SPEED_KMH    = 3;      // normal speed, overridden by message.speedKmh
const UPHILL_MIN_FRAC   = 0.40;   // at slope limit, speed = 40% of flat speed [OUR ASSUMPTION]
const DOWNHILL_PENALTY  = 0.5;    // downhill slowdown is half as much as uphill [OUR ASSUMPTION]
const ROUGHNESS_THRESH  = 0.5;    // meters — above this = rough ground [OUR ASSUMPTION]
const ROUGHNESS_PENALTY = 0.25;   // 25% slower on rough ground [OUR ASSUMPTION]

/* 8-neighbor directions: [drow, dcol, isdiagonal] */
const NEIGHBORS = [
  [-1,  0, false], [ 1,  0, false], [ 0, -1, false], [ 0,  1, false],  // cardinal
  [-1, -1, true],  [-1,  1, true],  [ 1, -1, true],  [ 1,  1, true]    // diagonal
];

/* ── Binary min-heap priority queue ──────────────────────────────────────── */
/* Stores [priority, index] pairs. Used by Dijkstra. */
function MinHeap() {
  this.data = [];
}
MinHeap.prototype.push = function(priority, value) {
  this.data.push([priority, value]);
  this._bubbleUp(this.data.length - 1);
};
MinHeap.prototype.pop = function() {
  const top = this.data[0];
  const last = this.data.pop();
  if (this.data.length > 0) {
    this.data[0] = last;
    this._sinkDown(0);
  }
  return top;
};
MinHeap.prototype.size = function() { return this.data.length; };
MinHeap.prototype._bubbleUp = function(i) {
  while (i > 0) {
    const parent = Math.floor((i - 1) / 2);
    if (this.data[parent][0] <= this.data[i][0]) break;
    [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
    i = parent;
  }
};
MinHeap.prototype._sinkDown = function(i) {
  const n = this.data.length;
  while (true) {
    let smallest = i;
    const l = 2*i+1, r = 2*i+2;
    if (l < n && this.data[l][0] < this.data[smallest][0]) smallest = l;
    if (r < n && this.data[r][0] < this.data[smallest][0]) smallest = r;
    if (smallest === i) break;
    [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
    i = smallest;
  }
};

/* ── Step time calculation ────────────────────────────────────────────────── */
/* Returns time in seconds to traverse one step.
   stepLengthM: meters. elevDeltaM: elevation change (positive = uphill).
   slopeDeg: slope of the destination cell. roughnessM: roughness of destination.
   slopeLimit: max walkable slope (for speed scaling). speedKmh: flat speed. */
function stepTimeSeconds(stepLengthM, elevDeltaM, slopeDeg, roughnessM, slopeLimit, speedKmh) {
  let speedFraction = 1.0;

  if (elevDeltaM > 0 && slopeLimit > 0) {
    // Uphill: speed falls linearly from 100% at 0° to UPHILL_MIN_FRAC at the slope limit
    speedFraction = 1.0 - (1.0 - UPHILL_MIN_FRAC) * Math.min(slopeDeg / slopeLimit, 1.0);
    speedFraction = Math.max(UPHILL_MIN_FRAC, speedFraction);
  } else if (elevDeltaM < 0 && slopeLimit > 0) {
    // Downhill: half as much slowdown as uphill
    const uphillDrop = (1.0 - UPHILL_MIN_FRAC) * Math.min(slopeDeg / slopeLimit, 1.0);
    speedFraction = 1.0 - uphillDrop * DOWNHILL_PENALTY;
    speedFraction = Math.max(UPHILL_MIN_FRAC, speedFraction);
  }

  if (roughnessM > ROUGHNESS_THRESH) {
    speedFraction = speedFraction / (1.0 + ROUGHNESS_PENALTY);
  }

  const speedMs = (speedKmh * 1000.0 / 3600.0) * speedFraction;
  return stepLengthM / speedMs;
}

/* ── Dijkstra walk-back-time map ─────────────────────────────────────────── */
/* Computes the fastest walk-back time (seconds) from every cell to the habitat.
   For walk-back, uphill/downhill are reversed: a cell that is uphill from the habitat
   on the way out is DOWNHILL on the way back.

   elevArr, slopeArr, roughArr: Float32Array grids.
   aoi: { width, height, cellSizeMeters }
   habitat: { row, col }
   Returns Float32Array of walk-back seconds (Infinity for unreachable cells). */
function dijkstraWalkback(elevArr, slopeArr, roughArr, aoi, habitat, slopeLimit, speedKmh) {
  const W = aoi.width, H = aoi.height;
  const cellM = aoi.cellSizeMeters;
  const diagM = cellM * Math.SQRT2;

  const dist = new Float32Array(W * H);
  dist.fill(Infinity);
  dist[habitat.row * W + habitat.col] = 0;

  const heap = new MinHeap();
  heap.push(0, habitat.row * W + habitat.col);

  while (heap.size() > 0) {
    const [curDist, curIdx] = heap.pop();
    if (curDist > dist[curIdx]) continue;  // stale entry

    const curRow = Math.floor(curIdx / W);
    const curCol = curIdx % W;
    const curElev = elevArr[curIdx];

    for (const [dr, dc, isDiag] of NEIGHBORS) {
      const nr = curRow + dr, nc = curCol + dc;
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue;

      const nIdx = nr * W + nc;
      const nSlope = slopeArr[nIdx];
      const nElev  = elevArr[nIdx];
      const nRough = roughArr[nIdx];

      if (!isFinite(nSlope) || !isFinite(nElev)) continue;  // no data
      if (nSlope > slopeLimit) continue;  // blocked

      const stepM = isDiag ? diagM : cellM;
      // Walk-back: reverse elevation direction (uphill on way out = downhill on way back)
      const elevDelta = curElev - nElev;  // reversed: habitat is the destination
      const t = stepTimeSeconds(stepM, elevDelta, nSlope, nRough, slopeLimit, speedKmh);

      const newDist = dist[curIdx] + t;
      if (newDist < dist[nIdx]) {
        dist[nIdx] = newDist;
        heap.push(newDist, nIdx);
      }
    }
  }

  return dist;
}

/* ── Gradient-descent route extraction ───────────────────────────────────── */
/* Extracts the route from target to habitat using the walkback distance map.
   Follows the neighbor with the lowest walkback time at each step.
   Returns the path as an array of { row, col } objects (habitat-first). */
function extractRoute(walkbackDist, aoi, habitat, target) {
  const W = aoi.width, H = aoi.height;
  const habitatIdx = habitat.row * W + habitat.col;
  const targetIdx  = target.row  * W + target.col;

  if (!isFinite(walkbackDist[targetIdx])) return null;  // unreachable

  const path = [];
  let curIdx = targetIdx;
  let safety = W * H + 10;  // prevent infinite loop

  while (curIdx !== habitatIdx && safety-- > 0) {
    const curRow = Math.floor(curIdx / W);
    const curCol = curIdx % W;
    path.push({ row: curRow, col: curCol });

    let bestDist = walkbackDist[curIdx];
    let bestIdx  = curIdx;

    for (const [dr, dc] of NEIGHBORS) {
      const nr = curRow + dr, nc = curCol + dc;
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue;
      const nIdx = nr * W + nc;
      if (walkbackDist[nIdx] < bestDist) {
        bestDist = walkbackDist[nIdx];
        bestIdx  = nIdx;
      }
    }

    if (bestIdx === curIdx) break;  // stuck — no better neighbor (should not happen)
    curIdx = bestIdx;
  }

  path.push({ row: habitat.row, col: habitat.col });
  path.reverse();  // habitat first
  return path;
}

/* ── Route statistics ──────────────────────────────────────────────────────── */
/* Computes distance, time, steepest slope, climb, descent, and elevation profile
   along a path (array of {row, col}). */
function computeRouteStats(path, elevArr, slopeArr, roughArr, aoi, slopeLimit, speedKmh) {
  const W = aoi.width;
  const cellM = aoi.cellSizeMeters;
  const diagM = cellM * Math.SQRT2;

  let distanceMeters = 0;
  let timeSeconds    = 0;
  let steepestDeg    = 0;
  let climbMeters    = 0;
  let descentMeters  = 0;
  const profile = [];

  for (let i = 0; i < path.length; i++) {
    const { row, col } = path[i];
    const idx = row * W + col;
    const elev = elevArr[idx];
    profile.push({ distanceMeters, elevationM: isFinite(elev) ? elev : 0 });

    if (i === 0) continue;

    const prev = path[i - 1];
    const isDiag = (prev.row !== row) && (prev.col !== col);
    const stepM = isDiag ? diagM : cellM;

    const prevElev = elevArr[prev.row * W + prev.col];
    const elevDelta = isFinite(elev) && isFinite(prevElev) ? elev - prevElev : 0;
    const slope    = slopeArr[idx];
    const roughness = roughArr[idx];

    distanceMeters += stepM;
    timeSeconds    += stepTimeSeconds(stepM, elevDelta, isFinite(slope) ? slope : 0,
                                       isFinite(roughness) ? roughness : 0, slopeLimit, speedKmh);

    if (isFinite(slope) && slope > steepestDeg) steepestDeg = slope;
    if (elevDelta > 0) climbMeters   += elevDelta;
    if (elevDelta < 0) descentMeters += Math.abs(elevDelta);
  }

  // Update profile distances
  profile.forEach((p, i) => {
    if (i > 0) {
      const prev = path[i - 1];
      const { row, col } = path[i];
      const isDiag = (prev.row !== row) && (prev.col !== col);
      p.distanceMeters = profile[i - 1].distanceMeters + (isDiag ? diagM : cellM);
    }
  });

  return { distanceMeters, timeSeconds, steepestDeg, climbMeters, descentMeters, profile };
}

/* ── Smooth path for display ──────────────────────────────────────────────── */
/* Keeps every Nth cell (plus first and last) for a smoother polyline.
   Numbers stay from the raw path — only the display cells are reduced. */
function smoothPathForDisplay(path, keepEveryN) {
  if (path.length <= 2) return path;
  const smoothed = [path[0]];
  for (let i = keepEveryN; i < path.length - 1; i += keepEveryN) {
    smoothed.push(path[i]);
  }
  smoothed.push(path[path.length - 1]);
  return smoothed;
}

/* ── Message handler ──────────────────────────────────────────────────────── */

let _walkbackDist = null;  // cached walkback result, reused for route extraction
let _lastAoi = null, _lastHabitat = null, _lastSlopeLimit = null, _lastSpeed = null;

self.onmessage = function(e) {
  const msg = e.data;

  if (msg.type === 'compute_walkback') {
    const elevArr   = new Float32Array(msg.elevBuf);
    const slopeArr  = new Float32Array(msg.slopeBuf);
    const roughArr  = new Float32Array(msg.roughBuf);
    const aoi       = msg.aoi;
    const habitat   = { row: msg.habitatRow, col: msg.habitatCol };
    const slimLimit = msg.slopeLimit;
    const speedKmh  = msg.speedKmh;

    _walkbackDist  = dijkstraWalkback(elevArr, slopeArr, roughArr, aoi, habitat, slimLimit, speedKmh);
    _lastAoi       = aoi;
    _lastHabitat   = habitat;
    _lastSlopeLimit = slimLimit;
    _lastSpeed     = speedKmh;

    // Transfer the ArrayBuffer — no copy, fast
    const outBuf = _walkbackDist.buffer.slice(0);  // slice to get a transferable copy
    self.postMessage({ type: 'walkback_result', dataBuf: outBuf }, [outBuf]);
  }

  else if (msg.type === 'compute_route') {
    const elevArr  = new Float32Array(msg.elevBuf);
    const slopeArr = new Float32Array(msg.slopeBuf);
    const roughArr = new Float32Array(msg.roughBuf);
    const aoi      = msg.aoi;
    const habitat  = { row: msg.habitatRow, col: msg.habitatCol };
    const target   = { row: msg.targetRow,  col: msg.targetCol  };
    const slopeLimit = msg.slopeLimit;
    const speedKmh   = msg.speedKmh;

    // Recompute walkback if parameters changed
    const paramsChanged = !_walkbackDist ||
      !_lastAoi ||
      _lastHabitat.row !== habitat.row || _lastHabitat.col !== habitat.col ||
      _lastSlopeLimit !== slopeLimit    || _lastSpeed !== speedKmh;

    if (paramsChanged) {
      _walkbackDist = dijkstraWalkback(elevArr, slopeArr, roughArr, aoi, habitat, slopeLimit, speedKmh);
      _lastAoi = aoi; _lastHabitat = habitat; _lastSlopeLimit = slopeLimit; _lastSpeed = speedKmh;
    }

    // Check if target is reachable
    const targetIdx = target.row * aoi.width + target.col;
    const targetSlope = slopeArr[targetIdx];
    if (!isFinite(_walkbackDist[targetIdx]) || !isFinite(targetSlope) || targetSlope > slopeLimit) {
      self.postMessage({ type: 'route_error', message: 'No walkable route at this slope limit. Try raising the limit or choosing a closer target.' });
      return;
    }

    // Extract route by gradient descent
    const rawPath = extractRoute(_walkbackDist, aoi, habitat, target);
    if (!rawPath || rawPath.length < 2) {
      self.postMessage({ type: 'route_error', message: 'No walkable route at this slope limit. Try raising the limit or choosing a closer target.' });
      return;
    }

    // Compute stats on the raw path
    const stats = computeRouteStats(rawPath, elevArr, slopeArr, roughArr, aoi, slopeLimit, speedKmh);

    // Smooth path for display (every 3rd cell, cosmetic only)
    const displayPath = smoothPathForDisplay(rawPath, 3);

    self.postMessage({
      type: 'route_result',
      cells: displayPath,
      distanceMeters: stats.distanceMeters,
      timeSeconds:    stats.timeSeconds,
      steepestDeg:    stats.steepestDeg,
      climbMeters:    stats.climbMeters,
      descentMeters:  stats.descentMeters,
      profile:        stats.profile
    });
  }
};
