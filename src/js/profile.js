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

  const T = (typeof getThemeTokens === 'function') ? getThemeTokens() : {};
  const C = {
    bg: T.bg || '#100E0D', muted: T.muted || '#9E9890', route: T.route || '#3FD0C9',
    accent: T.accent || '#B07D4A', caution: T.caution || '#F2B134', danger: T.danger || '#E5484D',
    border: T.border || '#2D2A28',
  };

  const ctx   = canvas.getContext('2d');
  const W     = canvas.width;
  const H     = canvas.height;
  const pad   = { top: 20, right: 16, bottom: 32, left: 52 };
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

  // Clear and background
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Grid lines (y-axis ticks every ~100 m)
  ctx.strokeStyle = C.border + 'cc';
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

  // Steep-segment shading (caution where slope is within 2° of limit, danger at or above limit)
  const slopeLimit = (STATE && STATE.slopeLimitDeg) || 15;
  if (profileData.length > 1 && profileData[0].slopeDeg !== undefined) {
    for (let i = 1; i < profileData.length; i++) {
      const s = profileData[i].slopeDeg;
      if (!isFinite(s)) continue;
      const x0 = xScale(profileData[i - 1].distanceMeters);
      const x1 = xScale(profileData[i].distanceMeters);
      if (s >= slopeLimit) {
        ctx.fillStyle = 'rgba(229,72,77,0.22)';
        ctx.fillRect(x0, pad.top, x1 - x0, chartH);
      } else if (s >= slopeLimit - 2) {
        ctx.fillStyle = 'rgba(242,177,52,0.18)';
        ctx.fillRect(x0, pad.top, x1 - x0, chartH);
      }
    }
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
  grad.addColorStop(0, C.route + '40');
  grad.addColorStop(1, C.route + '08');
  ctx.fillStyle = grad;
  ctx.fill();

  // Profile line
  ctx.beginPath();
  ctx.strokeStyle = C.route;
  ctx.lineWidth   = 2;
  let first = true;
  for (const pt of profileData) {
    if (!isFinite(pt.elevationM)) continue;
    if (first) { ctx.moveTo(xScale(pt.distanceMeters), yScale(pt.elevationM)); first = false; }
    else         ctx.lineTo(xScale(pt.distanceMeters), yScale(pt.elevationM));
  }
  ctx.stroke();

  // Turn-back marker (PONR)
  if (STATE && STATE.route && STATE.route.ponrDistM && isFinite(STATE.route.ponrDistM) &&
      STATE.route.ponrDistM < maxDist * 0.98) {
    const px = xScale(STATE.route.ponrDistM);
    ctx.save();
    ctx.strokeStyle = C.caution;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(px, pad.top); ctx.lineTo(px, pad.top + chartH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.caution;
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('↩', px, pad.top + 2);
    ctx.restore();
  }

  // X-axis: distance labels every ~0.5 km
  ctx.fillStyle    = C.muted;
  ctx.font         = '10px system-ui';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  const kmStep = maxDist > 3000 ? 1000 : 500;
  for (let d = 0; d <= maxDist; d += kmStep) {
    const x = xScale(d);
    ctx.fillText((d / 1000).toFixed(1), x, pad.top + chartH + 4);
  }
  // "km" label at right end of x-axis
  ctx.textAlign = 'right';
  ctx.fillText('km', pad.left + chartW, pad.top + chartH + 4);

  // Y-axis: elevation labels with "m" unit on topmost label
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  let firstYLabel = true;
  for (let e = elevStart; e <= maxElev; e += elevStep) {
    ctx.fillText(e.toFixed(0) + (firstYLabel ? ' m' : ''), pad.left - 4, yScale(e));
    firstYLabel = false;
  }

  // Base (habitat) marker at start, target marker at end
  _drawProfileMarker(ctx, xScale(0), yScale(profileData[0].elevationM), 'Base', C.accent);
  const lastPt = profileData[profileData.length - 1];
  if (isFinite(lastPt.elevationM)) {
    _drawProfileMarker(ctx, xScale(maxDist), yScale(lastPt.elevationM), '★', C.route);
  }

  // Title
  ctx.fillStyle    = C.muted;
  ctx.font         = '10px system-ui';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Elevation profile · Mars datum (MOLA areoid)', pad.left, 4);
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
  const _Tc = (typeof getThemeTokens === 'function') ? getThemeTokens() : {};
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = _Tc.bg || '#100E0D';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle    = _Tc.muted || '#9E9890';
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

  const _T = (typeof getThemeTokens === 'function') ? getThemeTokens() : {};
  const TC = {
    bg: _T.bg || '#100E0D', muted: _T.muted || '#9E9890',
    route: _T.route || '#3FD0C9', accent: _T.accent || '#B07D4A', border: _T.border || '#2D2A28',
  };

  const ctx   = canvas.getContext('2d');
  const W     = canvas.width;
  const H     = canvas.height;
  const pad   = { top: 20, right: 16, bottom: 32, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = TC.bg;
  ctx.fillRect(0, 0, W, H);

  if (!STATE.remsTemps) {
    ctx.fillStyle    = TC.muted;
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
  ctx.strokeStyle = TC.border + '99';
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
    ctx.fillStyle = TC.accent + '20';
    ctx.fillRect(xScale(evaStart), pad.top, xScale(evaEnd) - xScale(evaStart), chartH);
    ctx.fillStyle = TC.accent + '66';
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

  drawCurve(ss, TC.accent + 'cc');  // spring/summer — Martian ochre
  drawCurve(aw, TC.route + '80');   // autumn/winter — teal

  // X-axis: hours with "LMST" on last label
  ctx.fillStyle    = TC.muted;
  ctx.font         = '9px system-ui';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  [0, 6, 12, 18].forEach(h => ctx.fillText(h + 'h', xScale(h), pad.top + chartH + 4));
  ctx.fillText('23 h LMST', xScale(23), pad.top + chartH + 4);

  // Y-axis: temperatures with °C label
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  let firstTLabel = true;
  [-80, -60, -40, -20, 0].forEach(t => {
    if (t < minT - 5 || t > maxT + 5) return;
    ctx.fillText(t + (firstTLabel ? ' °C' : '°'), pad.left - 4, yScale(t));
    firstTLabel = false;
  });

  // Title
  ctx.fillStyle    = TC.muted;
  ctx.font         = '11px system-ui';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Air temperature · REMS (Martínez et al. 2017)', pad.left, 4);

  // Season swatches in title area
  const swatchY = 5;
  const labelsX = W - 110;
  if (labelsX > pad.left + 150) {
    ctx.font = '9px system-ui';
    ctx.fillStyle = TC.accent + 'cc'; ctx.fillRect(labelsX, swatchY + 2, 14, 3);
    ctx.fillStyle = TC.muted; ctx.textAlign = 'left'; ctx.fillText('N. spring/summer', labelsX + 18, swatchY);
    ctx.fillStyle = TC.route + '80'; ctx.fillRect(labelsX, swatchY + 12, 14, 3);
    ctx.fillStyle = TC.muted; ctx.fillText('N. autumn/winter', labelsX + 18, swatchY + 10);
  }

  if (evaEnd > evaStart) {
    ctx.fillStyle = TC.accent + 'cc';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('EVA', xScale((evaStart + evaEnd) / 2), pad.top + 4);
  }
}
