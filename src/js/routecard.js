/* routecard.js — Makes the route card (top-right of the map) short and plain-spoken, and adds
   "Hide" and "Stop route". Depends on: ui.js (updateSummaryCard), consumables.js + hazards.js (their card
   sections), route.js (clearRouteLine, clearPonrMarker), state.js. Styles: css/charts.css.
   Call initRouteCard() in main.js AFTER initConsumables() and initHazards(), so it runs last.

   It does not calculate anything. ui.js still builds the card with the planner's numbers; this file only
   re-arranges those same rows:
     - one plain sentence on top ("1.65 km walk. 43 min there, 41 min back."),
     - a verdict in words (fits / tight / too long), from the same "EVA used" percent,
     - four big numbers, and everything else folded into sections you open when you want them. */

const RC_LABELS = {                                   // card label from ui.js -> plain wording
  'Climb / Descent': 'Uphill / downhill',
  '↩ Turn-back point': 'Latest point to turn back',
  'Radiation est.': 'Radiation dose (estimate)',
  'Temp range': 'Outside temperature'
};
const _rc = { minimized: false, open: { conditions: false, checks: false, suit: false, hazards: false } };

/* Makes a fold-out section whose open/closed state survives the card being rebuilt. */
function rcSection(key, title, badge) {
  const box = document.createElement('details');
  box.className = 'rc-section'; box.open = !!_rc.open[key];
  box.addEventListener('toggle', () => { _rc.open[key] = box.open; });
  const summary = document.createElement('summary');
  const name = document.createElement('span'); name.textContent = title; summary.appendChild(name);
  if (badge) { const b = document.createElement('span'); b.className = 'rc-badge ' + (badge.kind || ''); b.textContent = badge.text; summary.appendChild(b); }
  box.appendChild(summary);
  return box;
}

/* Re-arranges the freshly built card. Reads every value from the rows ui.js just made. */
function rcArrange() {
  const card = document.getElementById('summary-card'), route = STATE.route;
  if (!card || card.style.display === 'none' || !route || card.querySelector('.rc-head')) return;

  const head = document.createElement('div'); head.className = 'rc-head';
  const title = document.createElement('span'); title.className = 'rc-title';
  const t = STATE.selectedTarget && STATE.selectedTarget.properties;
  title.textContent = route.status === 'ok' ? 'Route to ' + (t && (t.shortName || t.name) ? (t.shortName || t.name) : 'your point') : 'Route';
  const hide = document.createElement('button'); hide.className = 'rc-btn'; hide.textContent = _rc.minimized ? 'Show' : 'Hide';
  hide.title = 'Hide or show the route details. The route stays on the map.';
  hide.addEventListener('click', () => { _rc.minimized = !_rc.minimized; updateSummaryCard(); });
  const stop = document.createElement('button'); stop.className = 'rc-btn rc-stop'; stop.textContent = 'Stop route';
  stop.title = 'Remove this route from the map and start over';
  stop.addEventListener('click', stopRoute);
  head.appendChild(title); head.appendChild(hide); head.appendChild(stop);

  if (route.status !== 'ok') { card.insertBefore(head, card.firstChild); return; }   // error message card: just add the buttons

  // Read the rows ui.js made: label -> { row, value text }
  const rows = {};
  card.querySelectorAll(':scope > .sum-row').forEach(row => {
    const label = row.querySelector('.sum-label'), val = row.querySelector('.sum-val');
    if (label) rows[label.textContent.trim()] = { row, value: val ? val.textContent.trim() : '' };
  });
  const value = k => (rows[k] ? rows[k].value : '—');
  const usedPct = parseInt(value('EVA used'), 10);

  const body = document.createElement('div'); body.className = 'rc-body';
  const line = document.createElement('p'); line.className = 'rc-line';
  line.textContent = value('Distance') + ' walk. ' + value('One-way time') + ' there, ' + value('Walk-back time') + ' back.';
  body.appendChild(line);

  // Verdict in words: same thresholds as the bar in ui.js (over 90% = too long, over 75% = tight)
  const verdict = document.createElement('div');
  const kind = usedPct > 90 ? 'fail' : usedPct > 75 ? 'caution' : 'pass';
  verdict.className = 'rc-verdict ' + kind;
  verdict.textContent = (kind === 'pass' ? '✓ Fits your ' : kind === 'caution' ? '⚠ Tight for your ' : '✕ Too long for your ') + STATE.evaHours + ' h spacewalk';
  const sub = document.createElement('small');
  sub.textContent = 'Walking plus ' + CONFIG.eva.workMinutes + ' min of work at the target uses ' + (Number.isFinite(usedPct) ? usedPct : '—') + '% of your time.';
  verdict.appendChild(sub);
  if (rows['EVA used']) { const bar = rows['EVA used'].row.querySelector('.eva-bar-wrap'); if (bar) verdict.appendChild(bar); }
  body.appendChild(verdict);

  const tiles = document.createElement('div'); tiles.className = 'rc-tiles';
  const slopeTag = rows['Steepest slope'] && rows['Steepest slope'].row.querySelector('.sum-tag');
  [['Distance', value('Distance')], ['Time there', value('One-way time')], ['Time back', value('Walk-back time')],
   ['Steepest slope', value('Steepest slope'), slopeTag ? slopeTag.textContent : '']].forEach(([label, val, note]) => {
    const tile = document.createElement('div'); tile.className = 'rc-tile';
    const big = document.createElement('b'); big.textContent = val;
    const small = document.createElement('span'); small.textContent = label + (note ? ' (' + note + ')' : '');
    tile.appendChild(big); tile.appendChild(small); tiles.appendChild(tile);
  });
  body.appendChild(tiles);

  // Everything else: same rows, plainer labels, folded away until asked for
  const conditions = rcSection('conditions', 'Conditions on the way');
  Object.keys(RC_LABELS).forEach(k => {
    if (!rows[k]) return;
    rows[k].row.querySelector('.sum-label').textContent = RC_LABELS[k];
    conditions.appendChild(rows[k].row);
  });
  if (conditions.childElementCount > 1) body.appendChild(conditions);

  const items = [...card.querySelectorAll(':scope > .check-item')];
  if (items.length) {
    const bad = items.filter(i => i.classList.contains('fail')).length, warn = items.filter(i => i.classList.contains('caution')).length;
    const checks = rcSection('checks', 'Safety checks', bad ? { text: bad + ' failed', kind: 'fail' } : warn ? { text: warn + ' to watch', kind: 'caution' } : { text: 'all clear', kind: 'pass' });
    items.forEach(i => checks.appendChild(i)); body.appendChild(checks);
  }
  const cons = card.querySelector(':scope > .cons-block');
  if (cons) { const suit = rcSection('suit', 'Suit and crew supplies'); suit.appendChild(cons); body.appendChild(suit); }
  const haz = card.querySelector(':scope > .haz-block');
  if (haz) {
    const count = haz.querySelectorAll('.haz-row').length;
    const hazards = rcSection('hazards', 'Hazards on this route', count ? { text: String(count), kind: 'caution' } : { text: 'none', kind: 'pass' });
    hazards.appendChild(haz); body.appendChild(hazards);
  }
  const photo = card.querySelector(':scope > .sum-pov-btn');
  if (photo) { photo.textContent = 'See what Curiosity saw there →'; body.appendChild(photo); }

  // Anything this file did not place (rows it has already used, the divider) is dropped; unknown extras are kept
  [...card.children].forEach(child => {
    if (child.classList.contains('sum-row') || child.classList.contains('sum-divider')) child.remove();
    else body.appendChild(child);
  });
  card.appendChild(head); card.appendChild(body);
  card.classList.toggle('rc-min', _rc.minimized);
  if (_rc.minimized) title.textContent += ' · ' + value('Distance') + ' · ' + value('One-way time');
}

/* Stops the current route: clears it from the map, the chart and the card, and unselects the target. */
function stopRoute() {
  if (typeof clearRouteLine === 'function') clearRouteLine();
  if (typeof clearPonrMarker === 'function') clearPonrMarker();
  if (typeof _hazLayer !== 'undefined' && _hazLayer && STATE.map) { STATE.map.removeLayer(_hazLayer); }      // hazard colours on the route
  if (typeof _customMarker !== 'undefined' && _customMarker && STATE.map) { STATE.map.removeLayer(_customMarker); }   // "any point" marker
  STATE.route = { status: 'none' };
  STATE.selectedTarget = null; STATE.target = null; STATE.targetCell = null;
  document.querySelectorAll('.target-card.active').forEach(c => c.classList.remove('active'));
  if (typeof clearMapMessage === 'function') clearMapMessage();
  if (typeof clearProfile === 'function') clearProfile('profile-canvas');
  _rc.minimized = false;
  if (typeof updateSummaryCard === 'function') updateSummaryCard();
  const pov = document.getElementById('pov-panel'); if (pov) pov.style.display = 'none';
  rcStopButton();
}

/* Shows a small "Stop" button on the Mission tab's target line while a route exists. */
function rcStopButton() {
  const line = document.querySelector('.tidy-target-line');
  if (!line) return;
  let btn = document.getElementById('rc-stop-mini');
  if (!btn) {
    btn = document.createElement('button'); btn.id = 'rc-stop-mini'; btn.className = 'tidy-choose-btn rc-stop-mini'; btn.textContent = 'Stop';
    btn.title = 'Remove the current route and start over'; btn.addEventListener('click', stopRoute); line.appendChild(btn);
  }
  btn.hidden = !(STATE.route && (STATE.route.status === 'ok' || STATE.route.status === 'error'));
}

/* Wraps updateSummaryCard so the card is re-arranged every time ui.js rebuilds it. Call once, last. */
function initRouteCard() {
  if (typeof updateSummaryCard !== 'function' || window._rcHooked) return;
  window._rcHooked = true;
  const original = window.updateSummaryCard;
  window.updateSummaryCard = function() {
    const result = original.apply(this, arguments);
    try { rcArrange(); rcStopButton(); } catch (err) { console.warn('[routecard]', err); }
    return result;
  };
  setInterval(rcStopButton, 1000);     // the Mission tab is built a moment later; keep the small button in step
}
