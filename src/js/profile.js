/* profile.js — Elevation profile and temperature charts drawn on canvas elements.
   No chart library — uses the Canvas 2D API directly.
   Depends on: config.js (CONFIG), state.js (STATE).

   profileData: array of { distanceMeters, elevationM } from route result. */

/* Syncs the canvas's internal resolution to its CSS display size. */
function _syncCanvasSize(canvas) {
  const w = canvas.clientWidth  || canvas.offsetWidth;
  const h = canvas.clientHeight || canvas.offsetHeight;
  if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
    canvas.width  = w;
    canvas.height = h;
  }
}

/* Draws the elevation profile on the canvas with id `canvasId`.
   Shows the route's elevation over distance, with steep sections highlighted. */
function drawProfile(canvasId, profileData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  _syncCanvasSize(canvas);
  if (!profileData || profileData.length < 2) {
    clearProfile(canvasId);
    return;
  }

  const ctx   = canvas.getContext('2d');
  const W     = canvas.width;
  const H     = canvas.height;
  const pad   = { top: 20, right: 16, bottom: 32, left: 48 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;

  // Data ranges
  const maxDist = profileData[profileData.length - 1].distanceMeters;
  const elevs   = profileData.map(p => p.elevationM).filter(isFinite);
  if (!elevs.length) return;
  const minElev = Math.min(...elevs);
  const maxElev = Math.max(...elevs);
  const elevRange = maxElev - minElev || 1;

  // Scale functions
  const xScale = d => pad.left + (d / maxDist) * chartW;
  const yScale = e => pad.top + chartH - ((e - minElev) / elevRange) * chartH;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#0F1115';
  ctx.fillRect(0, 0, W, H);

  // Grid lines (y-axis ticks every ~100 m)
  ctx.strokeStyle = 'rgba(42,47,58,0.8)';
  ctx.lineWidth   = 1;
  const elevStep = elevRange > 500 ? 200 : elevRange > 200 ? 100 : 50;
  const elevStart = Math.ceil(minElev / elevStep) * elevStep;
  for (let e = elevStart; e <= maxElev; e += elevStep) {
    const y = yScale(e);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
  }

  // Profile fill (area under curve)
  ctx.beginPath();
  ctx.moveTo(xScale(profileData[0].distanceMeters), yScale(profileData[0].elevationM));
  for (const pt of profileData) {
    if (!isFinite(pt.elevationM)) continue;
    ctx.lineTo(xScale(pt.distanceMeters), yScale(pt.elevationM));
  }
  ctx.lineTo(xScale(maxDist), pad.top + chartH);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0,   'rgba(63,208,201,0.25)');
  grad.addColorStop(1,   'rgba(63,208,201,0.03)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Profile line
  ctx.beginPath();
  ctx.strokeStyle = '#3FD0C9';
  ctx.lineWidth   = 2;
  let first = true;
  for (const pt of profileData) {
    if (!isFinite(pt.elevationM)) continue;
    if (first) { ctx.moveTo(xScale(pt.distanceMeters), yScale(pt.elevationM)); first = false; }
    else         ctx.lineTo(xScale(pt.distanceMeters), yScale(pt.elevationM));
  }
  ctx.stroke();

  // X-axis: distance labels every ~0.5 km
  ctx.fillStyle   = '#A3A8B3';
  ctx.font        = '10px system-ui';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'top';
  const kmStep = maxDist > 3000 ? 1000 : 500;
  for (let d = 0; d <= maxDist; d += kmStep) {
    const x = xScale(d);
    ctx.fillText((d / 1000).toFixed(1) + ' km', x, pad.top + chartH + 4);
  }

  // Y-axis: elevation labels
  ctx.textAlign   = 'right';
  ctx.textBaseline = 'middle';
  for (let e = elevStart; e <= maxElev; e += elevStep) {
    ctx.fillText(e.toFixed(0), pad.left - 4, yScale(e));
  }

  // Base (habitat) marker at start, target marker at end
  _drawProfileMarker(ctx, xScale(0), yScale(profileData[0].elevationM), 'Base', '#D9622B');
  const lastPt = profileData[profileData.length - 1];
  if (isFinite(lastPt.elevationM)) {
    _drawProfileMarker(ctx, xScale(maxDist), yScale(lastPt.elevationM), '★', '#3FD0C9');
  }

  // Title
  ctx.fillStyle   = '#A3A8B3';
  ctx.font        = '10px system-ui';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Elevation Profile', pad.left, 4);
}

function _drawProfileMarker(ctx, x, y, label, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle   = color;
  ctx.font        = 'bold 10px system-ui';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x, y - 6);
}

/* Clears the profile canvas and shows a placeholder message. */
function clearProfile(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  _syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0F1115';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle    = '#A3A8B3';
  ctx.font         = '12px system-ui';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Pick a target to see the elevation profile.', canvas.width / 2, canvas.height / 2);
}

/* ── Temperature chart ─────────────────────────────────────────────────────── */

/* Draws the REMS temperature chart on the canvas with id `canvasId`.
   Shows two seasonal curves (spring/summer and autumn/winter) with the EVA window shaded.
   Reads from STATE.remsTemps, STATE.evaStartHour, STATE.evaHours. */
function drawTempChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  _syncCanvasSize(canvas);

  const ctx   = canvas.getContext('2d');
  const W     = canvas.width;
  const H     = canvas.height;
  const pad   = { top: 20, right: 16, bottom: 32, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0F1115';
  ctx.fillRect(0, 0, W, H);

  if (!STATE.remsTemps) {
    ctx.fillStyle    = '#A3A8B3';
    ctx.font         = '12px system-ui';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EVA Temperature Window (REMS data loading…)', W / 2, H / 2);
    return;
  }

  const ss  = STATE.remsTemps.seasons['northern_spring_summer'].airTempC;
  const aw  = STATE.remsTemps.seasons['northern_autumn_winter'].airTempC;
  const hrs = Array.from({ length: 24 }, (_, i) => i);

  const allTemps = [...ss, ...aw];
  const minT = Math.min(...allTemps);
  const maxT = Math.max(...allTemps);
  const tRange = maxT - minT || 1;

  const xScale = h => pad.left + (h / 23) * chartW;
  const yScale = t => pad.top  + chartH - ((t - minT) / tRange) * chartH;

  // Grid lines
  ctx.strokeStyle = 'rgba(42,47,58,0.6)';
  ctx.lineWidth   = 1;
  [-80, -60, -40, -20, 0].forEach(t => {
    if (t < minT - 5 || t > maxT + 5) return;
    const y = yScale(t);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
  });

  // EVA window shading
  const evaStart = STATE.evaStartHour || 8;
  const evaEnd   = Math.min(23, evaStart + (STATE.evaHours || 6));
  if (evaEnd > evaStart) {
    ctx.fillStyle = 'rgba(217,98,43,0.12)';
    ctx.fillRect(xScale(evaStart), pad.top, xScale(evaEnd) - xScale(evaStart), chartH);
    ctx.fillStyle = 'rgba(217,98,43,0.4)';
    ctx.fillRect(xScale(evaStart), pad.top, 1, chartH);
    ctx.fillRect(xScale(evaEnd),   pad.top, 1, chartH);
  }

  // Draw both seasonal curves
  const drawCurve = (temps, color) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    temps.forEach((t, i) => {
      if (i === 0) ctx.moveTo(xScale(i), yScale(t));
      else         ctx.lineTo(xScale(i), yScale(t));
    });
    ctx.stroke();
  };

  drawCurve(ss, 'rgba(217,98,43,0.8)');  // spring/summer — orange
  drawCurve(aw, 'rgba(63,208,201,0.5)');  // autumn/winter — teal

  // X-axis: hours
  ctx.fillStyle    = '#A3A8B3';
  ctx.font         = '9px system-ui';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  [0, 6, 12, 18, 23].forEach(h => {
    ctx.fillText(h + 'h', xScale(h), pad.top + chartH + 4);
  });

  // Y-axis: temperatures
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  [-80, -60, -40, -20, 0].forEach(t => {
    if (t < minT - 5 || t > maxT + 5) return;
    ctx.fillText(t + '°', pad.left - 4, yScale(t));
  });

  // Title and EVA label
  ctx.fillStyle    = '#A3A8B3';
  ctx.font         = '9px system-ui';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('EVA Temp Window · REMS (Martínez et al. 2017)', pad.left, 4);

  if (evaEnd > evaStart) {
    ctx.fillStyle = 'rgba(217,98,43,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('EVA', xScale((evaStart + evaEnd) / 2), pad.top + 4);
  }
}
