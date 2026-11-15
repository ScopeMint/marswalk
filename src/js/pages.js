/* pages.js — Splits the one busy screen into four simple pages, in the order a crew would use them:
     1 Plan route   : choose where to walk and set the limits  (mission panel + map + short route card)
     2 Map layers   : study the ground                         (map + layer switches only)
     3 Weather      : temperature, sunlight, radiation         (the two weather charts, big, + the numbers)
     4 Summary      : everything about this EVA                (full route card + map + hills chart)
   It adds NO features and calculates NOTHING. It only shows or hides parts other scripts already built
   (the hiding is done in css/pages.css from the page name on <body data-page="...">), and the Weather
   numbers are read from the same functions the route card uses (safety.js, marsclock.js).
   Depends on: every other script having built its part of the page. Call initPages() LAST in main.js. */

const PAGES = [
  { key: 'plan',    label: 'Plan route',  hint: 'Choose where to walk and set your limits. The route draws itself.' },
  { key: 'layers',  label: 'Map layers',  hint: 'Switch map layers on and off to study the ground.' },
  { key: 'weather', label: 'Weather',     hint: 'Temperature, sunlight and radiation for the time of your EVA.' },
  { key: 'summary', label: 'Summary',     hint: 'Everything about this EVA on one page.' }
];
let _pg = null;

/* Makes an element with a class and (optional) text. */
function pgEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

/* Builds the page bar under the top bar, the Weather numbers panel and the Summary header. Runs once. */
function initPages() {
  if (_pg || !document.getElementById('top-bar')) return;
  const nav = pgEl('nav'); nav.id = 'pg-nav'; nav.setAttribute('aria-label', 'Pages');
  const tabs = {};
  PAGES.forEach((page, i) => {
    const tab = pgEl('button', 'pg-tab'); tab.type = 'button';
    tab.appendChild(pgEl('b', '', String(i + 1))); tab.appendChild(pgEl('span', '', page.label));
    tab.addEventListener('click', () => pagesShow(page.key));
    nav.appendChild(tab); tabs[page.key] = tab;
  });
  const hint = pgEl('span', 'pg-hint'); hint.setAttribute('role', 'status');
  const back = pgEl('button', 'pg-step'), next = pgEl('button', 'pg-step pg-next');
  back.type = next.type = 'button';
  back.addEventListener('click', () => pagesStep(-1)); next.addEventListener('click', () => pagesStep(1));
  nav.appendChild(hint); nav.appendChild(back); nav.appendChild(next);
  document.body.appendChild(nav);

  _pg = { page: null, tabs, hint, back, next, weather: pagesBuildWeather() };
  pagesBuildSummaryHead();
  document.body.classList.add('paged');

  // The tour and the visor HUD draw on the map, and the Weather page has no map: go back to page 1 first
  document.addEventListener('click', e => {
    if (_pg.page === 'weather' && e.target.closest && e.target.closest('.hud-toggle, #btn-tour')) pagesShow('plan');
  }, true);

  pagesShow('plan');
  setInterval(pagesTick, 1000);
  console.log('[pages] four pages ready');
}

/* Shows one page. key = 'plan' | 'layers' | 'weather' | 'summary'. */
function pagesShow(key) {
  if (!_pg || !PAGES.some(p => p.key === key)) return;
  const before = _pg.page, index = PAGES.findIndex(p => p.key === key);
  _pg.page = key; document.body.dataset.page = key;
  PAGES.forEach(p => { if (p.key === key) _pg.tabs[p.key].setAttribute('aria-current', 'page'); else _pg.tabs[p.key].removeAttribute('aria-current'); });
  _pg.hint.textContent = PAGES[index].hint;
  _pg.back.hidden = index === 0; _pg.next.hidden = index === PAGES.length - 1;
  if (index > 0) _pg.back.textContent = '← ' + PAGES[index - 1].label;
  if (index < PAGES.length - 1) _pg.next.textContent = 'Next: ' + PAGES[index + 1].label + ' →';
  if ((key === 'summary') !== (before === 'summary')) pagesCardDetail(key === 'summary');
  pagesTick();
  // The map and the charts have just changed size: let them re-measure themselves
  setTimeout(() => {
    if (STATE.map && key !== 'weather') STATE.map.invalidateSize();
    window.dispatchEvent(new Event('resize'));
  }, 60);
}

/* Moves one page forward (+1) or back (-1). */
function pagesStep(direction) {
  const index = PAGES.findIndex(p => p.key === _pg.page) + direction;
  if (index >= 0 && index < PAGES.length) pagesShow(PAGES[index].key);
}

/* Summary page shows the whole route card with every section open; the other pages keep it short.
   Uses routecard.js's own "which sections are open" memory, then asks ui.js to rebuild the card. */
function pagesCardDetail(open) {
  if (typeof _rc !== 'undefined' && _rc.open) {
    Object.keys(_rc.open).forEach(k => { _rc.open[k] = open; });
    if (open) _rc.minimized = false;
  }
  if (typeof updateSummaryCard === 'function' && STATE.route && STATE.route.status === 'ok') updateSummaryCard();
}

/* Once a second: tick page 1 when a route exists, and keep the Weather numbers fresh while that page is open. */
function pagesTick() {
  if (!_pg) return;
  const hasRoute = !!(STATE.route && STATE.route.status === 'ok');
  document.body.classList.toggle('pg-noroute', !hasRoute);
  _pg.tabs.plan.classList.toggle('pg-done', hasRoute);
  if (_pg.page === 'weather') pagesWeatherRefresh();
}

/* ── Summary page header ────────────────────────────────────────────────── */

/* Title, the "no route yet" note, and shortcuts to the three things to do with a finished plan.
   The shortcuts press the existing top-bar buttons, so they do exactly what those do. */
function pagesBuildSummaryHead() {
  const head = pgEl('div'); head.id = 'pg-summary-head';
  head.appendChild(pgEl('div', 'pg-kicker', 'MISSION SUMMARY'));
  const row = pgEl('div', 'pg-actions');
  [['EVA cue card', '#btn-brief'], ['Walk it in 3D', '#top-bar .t3d-toggle'], ['Visor HUD', '#top-bar .hud-toggle']].forEach(([label, selector]) => {
    const button = pgEl('button', '', label); button.type = 'button';
    button.addEventListener('click', () => { const real = document.querySelector(selector); if (real) real.click(); });
    row.appendChild(button);
  });
  head.appendChild(row);
  const empty = pgEl('div', 'pg-empty');
  empty.appendChild(pgEl('p', '', 'No route yet. The summary fills in once you choose where to walk.'));
  const go = pgEl('button', '', '← Go to 1 · Plan route'); go.type = 'button';
  go.addEventListener('click', () => pagesShow('plan'));
  empty.appendChild(go); head.appendChild(empty);
  document.body.appendChild(head);
}

/* ── Weather page ───────────────────────────────────────────────────────── */

/* One labelled number card. Returns { box, value, note }. */
function pgCard(parent, label) {
  const box = pgEl('div', 'pg-card');
  box.appendChild(pgEl('div', 'pg-card-label', label));
  const value = pgEl('div', 'pg-card-value', '—'), note = pgEl('div', 'pg-card-note');
  box.appendChild(value); box.appendChild(note); parent.appendChild(box);
  return { box, value, note };
}

/* A slider that drives one of the real EVA sliders on page 1 (so there is still only one copy of the value). */
function pgMirrorSlider(parent, realId, labelOf) {
  const real = document.getElementById(realId);
  const wrap = pgEl('label', 'pg-slider'), text = pgEl('span'), input = pgEl('input');
  input.type = 'range';
  if (real) { input.min = real.min; input.max = real.max; input.step = real.step; input.value = real.value; }
  input.addEventListener('input', () => {
    if (!real) return;
    real.value = input.value; real.dispatchEvent(new Event('input', { bubbles: true }));
    pagesWeatherRefresh();
  });
  wrap.appendChild(text); wrap.appendChild(input); parent.appendChild(wrap);
  return { real, input, text, labelOf };
}

/* Builds the Weather page's left column: when the EVA is, and the three numbers for that time. */
function pagesBuildWeather() {
  const panel = pgEl('aside'); panel.id = 'pg-weather'; panel.setAttribute('aria-label', 'Weather for your EVA');
  panel.appendChild(pgEl('div', 'pg-kicker', 'WEATHER FOR YOUR EVA'));
  panel.appendChild(pgEl('p', 'pg-lead', 'Pick when you go outside. The numbers and both charts follow.'));
  const hh = h => String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.round(h % 1 * 60)).padStart(2, '0');
  const start = pgMirrorSlider(panel, 'eva-start-slider', v => 'Start time: ' + hh(Number(v)) + ' (local Mars time)');
  const hours = pgMirrorSlider(panel, 'eva-hours-slider', v => 'Time outside: ' + Number(v) + ' h');
  const w = { panel, sliders: [start, hours] };
  w.temp = pgCard(panel, 'Outside air temperature during your EVA');
  w.sun = pgCard(panel, 'Daylight today');
  w.rad = pgCard(panel, 'Radiation dose (estimate)');
  w.now = pgCard(panel, 'Mars right now, at the site');
  panel.appendChild(pgEl('p', 'pg-foot', 'Temperature: Curiosity REMS. Radiation: Curiosity RAD. Sun and clock: Mars24 algorithm. Suit limits are not modelled. Full sources: Menu → About & Sources.'));
  document.body.appendChild(panel);
  return w;
}

/* Fills the Weather cards. Every number comes from the functions the route card and the charts already use. */
function pagesWeatherRefresh() {
  const w = _pg.weather;
  w.sliders.forEach(s => { if (s.real) { if (document.activeElement !== s.input) s.input.value = s.real.value; s.text.textContent = s.labelOf(s.real.value); } });
  const startHour = STATE.evaStartHour == null ? 8 : STATE.evaStartHour, evaHours = STATE.evaHours || 6;

  const temp = typeof computeTemperatureRange === 'function' ? computeTemperatureRange(startHour, evaHours) : null;
  w.temp.value.textContent = temp ? temp.minC + ' °C to ' + temp.maxC + ' °C' + (typeof tempSpreadText === 'function' ? tempSpreadText(temp) : '') : 'no data';
  w.temp.note.textContent = temp ? temp.note : 'The temperature file did not load.';

  let light = null, clock = null;
  try { const site = mcSite(); light = daylight(new Date(), site.lon, site.lat); clock = window.MARS_CLOCK.now(); } catch (e) { /* clock is optional */ }
  w.sun.value.textContent = light ? 'Sunrise ' + mcFormatHours(light.sunriseLmst) + ' · sunset ' + mcFormatHours(light.sunsetLmst) : 'no data';
  w.sun.note.textContent = light ? 'Local Mars time. The sun climbs to ' + Math.round(light.maxElevationDeg) + '° at midday. The shaded band on each chart is your EVA.' : '';

  const rad = typeof computeRadiation === 'function' ? computeRadiation(evaHours) : null;
  if (rad) {
    const dose = rad.doseEstimateMuGy;                       // same rounding as the route card
    w.rad.value.textContent = '~' + (dose >= 100 ? Math.round(dose / 10) * 10 : Math.round(dose)) + ' μGy' +
      (typeof doseRangeText === 'function' ? doseRangeText(rad) : '');
    w.rad.note.textContent = 'For ' + evaHours + ' h outside. ' + rad.note + ' Source: ' + rad.source;
  } else { w.rad.value.textContent = 'no data'; w.rad.note.textContent = 'The radiation file did not load.'; }

  const season = typeof currentSeason === 'function' ? currentSeason() : null;
  w.now.value.textContent = clock ? 'Sol ' + clock.mslSol + ' · ' + mcFormatHours(clock.lmstHours) : 'no data';
  w.now.note.textContent = clock ? 'Curiosity mission sol and local mean solar time.' + (season && Number.isFinite(season.lsDeg) ? ' Ls ' + Math.floor(season.lsDeg) + '°: ' + season.label + '.' : '') : '';
}
