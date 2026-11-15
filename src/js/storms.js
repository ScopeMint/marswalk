/* storms.js — The "Solar storms" page: real storms NASA's Curiosity rover measured on Mars, what a storm
   would do to the planned walk, what it does to a person, and what to do when the alert sounds.
   Shown by pages.js (page key 'storm'). Styles: css/pages.css.

   WHERE THE NUMBERS COME FROM
     - Storm facts, health effects, NASA limits and precautions: src/data/space-weather.json. Every entry there
       was read from the linked NASA page or paper; this file only displays them.
     - Time to reach the habitat: the planner's own walk-back map (STATE.walkback, made by route-worker.js) read
       along the planned route (STATE.route). No new route math.
     - Airlock times and work time at the target: CONFIG.eva (labelled OUR ASSUMPTION, as everywhere in the app).
     - Normal radiation rate: src/data/rad-baseline.json (Curiosity RAD, Hassler et al. 2014).
   THE ONE THING WE CALCULATE (labelled "our calculation" on screen)
     - Dose on the walk home in a 2017-type storm = normal rate x (2 to 3) x walk-home time.
       The "2 to 3" is the measured peak of the September 2017 storm (Zeitlin et al. 2018).
   Depends on: state.js, config.js, safety.js (STATE.radBaseline), route.js (STATE.route, STATE.walkback). */

let _storm = null;

function stormEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

/* A small "Source: ..." line with a link that opens in a new tab (https links only). */
function stormSource(text, url) {
  const line = stormEl('div', 'storm-src', 'Source: ');
  if (typeof url === 'string' && url.startsWith('https://')) {
    const a = stormEl('a', '', text); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; line.appendChild(a);
  } else line.appendChild(document.createTextNode(text));
  return line;
}

/* Minutes as "47 min" or "1 h 05 min". */
function stormMinutes(min) {
  const m = Math.round(min);
  return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min';
}

/* Builds the empty page once and loads the facts file. Called by initPages. */
function stormsBuild() {
  if (_storm) return;
  const root = stormEl('section'); root.id = 'pg-storm'; root.setAttribute('aria-label', 'Solar storms');
  const intro = stormEl('header', 'storm-intro');
  intro.appendChild(stormEl('div', 'pg-kicker', 'SPACE WEATHER'));
  intro.appendChild(stormEl('h2', '', 'A solar storm hits the whole planet at once'));
  intro.appendChild(stormEl('p', '', 'Mars has no magnetic field and only thin air to stop it, so there is no route around a storm. ' +
    'The only thing a crew controls is how quickly they get under shielding. This page uses what NASA\'s Curiosity rover has really measured on the ground at Gale Crater with its radiation detector, RAD.'));
  root.appendChild(intro);
  const cols = stormEl('div', 'storm-cols');
  const events = stormEl('div', 'storm-col'), drill = stormEl('div', 'storm-col'), person = stormEl('div', 'storm-col');
  cols.appendChild(events); cols.appendChild(drill); cols.appendChild(person); root.appendChild(cols);
  document.body.appendChild(root);
  _storm = { root, events, drill, person, data: null, drawn: '', warnMin: null };
  stormsCardHook();

  fetch('./data/space-weather.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => { _storm.data = data; stormsStatic(); stormsRefresh(); })
    .catch(err => { console.warn('[storms]', err); events.appendChild(stormEl('p', 'storm-note', 'Could not load the storm data file. Refresh the page.')); });
}

/* Draws the parts that never change: the measured storms (left) and the person + precautions column (right). */
function stormsStatic() {
  const s = _storm, d = s.data;
  s.events.appendChild(stormEl('h3', 'storm-h', 'Storms Curiosity measured on the ground'));
  d.events.forEach(ev => {
    const card = stormEl('div', 'pg-card storm-event');
    card.appendChild(stormEl('div', 'pg-card-label', ev.date));
    card.appendChild(stormEl('div', 'storm-title', ev.title));
    card.appendChild(stormEl('p', '', ev.measured));
    card.appendChild(stormEl('p', 'storm-meaning', ev.meaning));
    card.appendChild(stormSource(ev.source, ev.url));
    s.events.appendChild(card);
  });
  const ctx = stormEl('div', 'pg-card');
  ctx.appendChild(stormEl('div', 'pg-card-label', 'How often'));
  ctx.appendChild(stormEl('p', '', d.context.stormCount));
  ctx.appendChild(stormSource(d.context.stormCountSource, d.context.stormCountUrl));
  s.events.appendChild(ctx);

  s.person.appendChild(stormEl('h3', 'storm-h', 'What a storm can do to a person'));
  const health = stormEl('div', 'pg-card');
  [['During the mission', d.health.duringMission], ['Years later', d.health.afterMission], ['How likely', d.health.howLikely],
   ['NASA\'s limits', d.health.limits], ['About the units', d.health.unitNote]].forEach(([label, text]) => {
    health.appendChild(stormEl('div', 'pg-card-label', label)); health.appendChild(stormEl('p', '', text));
  });
  health.appendChild(stormSource(d.health.source, d.health.url));
  s.person.appendChild(health);

  s.person.appendChild(stormEl('h3', 'storm-h', 'When the storm alert sounds'));
  const steps = stormEl('ol', 'storm-steps');
  d.precautions.forEach(p => {
    const li = stormEl('li');
    li.appendChild(stormEl('strong', '', p.step)); li.appendChild(stormEl('p', '', p.why)); li.appendChild(stormEl('small', '', p.source));
    steps.appendChild(li);
  });
  s.person.appendChild(steps);
  const cliff = stormEl('div', 'pg-card');
  cliff.appendChild(stormEl('div', 'pg-card-label', 'How much does a cliff help? (measured)'));
  cliff.appendChild(stormEl('p', '', d.context.cliffShielding));
  cliff.appendChild(stormSource(d.context.cliffSource, d.context.cliffUrl));
  s.person.appendChild(cliff);

  // Middle column: the drill. The frame is built once; stormsRefresh fills in the numbers.
  s.drill.appendChild(stormEl('h3', 'storm-h', 'Storm drill for your planned walk'));
  const box = stormEl('div', 'pg-card storm-drill');
  s.empty = stormEl('p', 'storm-note');
  const go = stormEl('button', 'storm-go', '← Go to 1 · Plan route'); go.type = 'button';
  go.addEventListener('click', () => { if (typeof pagesShow === 'function') pagesShow('plan'); });
  s.emptyBox = stormEl('div'); s.emptyBox.appendChild(s.empty); s.emptyBox.appendChild(go);
  s.live = stormEl('div');
  const label = stormEl('label', 'pg-slider'); s.sliderText = stormEl('span'); s.slider = stormEl('input');
  s.slider.type = 'range'; s.slider.min = '0'; s.slider.step = '1';
  s.slider.addEventListener('input', () => { s.warnMin = Number(s.slider.value); stormsRefresh(true); });
  label.appendChild(s.sliderText); label.appendChild(s.slider); s.live.appendChild(label);
  s.where = stormEl('div', 'storm-where'); s.big = stormEl('div', 'pg-card-value'); s.sum = stormEl('p', 'storm-sum');
  s.live.appendChild(s.where); s.live.appendChild(s.big); s.live.appendChild(s.sum);
  s.rule = stormEl('div', 'storm-rule'); s.live.appendChild(s.rule);
  s.far = stormEl('p', 'storm-sum'); s.live.appendChild(s.far);
  box.appendChild(s.emptyBox); box.appendChild(s.live); s.drill.appendChild(box);

  const after = stormEl('div', 'pg-card');
  after.appendChild(stormEl('div', 'pg-card-label', 'What it does to the trip'));
  s.trip = stormEl('div'); after.appendChild(s.trip); s.drill.appendChild(after);
  const dose = stormEl('div', 'pg-card');
  dose.appendChild(stormEl('div', 'pg-card-label', 'Radiation on the walk home'));
  s.dose = stormEl('div'); dose.appendChild(s.dose); s.drill.appendChild(dose);
}

/* Works out where the crew is, minute by minute, for the planned EVA.
   Returns null without a route. Otherwise { totalMin, peak: {min, km}, at(minute) }.
   at() gives { phase, km (walked from base, or null), shelterMin (walk to the habitat from there) }. */
function stormTimeline() {
  const route = STATE.route, wb = STATE.walkback && STATE.walkback.data, aoi = STATE.grids && STATE.grids.aoi;
  if (!route || route.status !== 'ok' || !wb || !aoi) return null;
  const cells = route.cells, times = route.cellTimeSeconds, dists = route.cellDistanceMeters;
  if (!cells || !times || !dists || times.length !== cells.length || dists.length !== cells.length) return null;
  // Walk-back time from each point of the route: read from the planner's walk-back map
  const back = cells.map(c => { const v = wb[c.row * aoi.width + c.col]; return Number.isFinite(v) && v >= 0 ? v : 0; });
  const egress = CONFIG.eva.egressMinutes * 60, ingress = CONFIG.eva.ingressMinutes * 60, work = CONFIG.eva.workMinutes * 60;
  const out = route.timeSeconds, home = back[back.length - 1];
  const arrive = egress + out, leave = arrive + work, atDoor = leave + home, total = atDoor + ingress;
  let peak = 0; back.forEach((v, i) => { if (v > back[peak]) peak = i; });
  return {
    totalMin: total / 60,
    arriveMin: arrive / 60,
    peak: { min: back[peak] / 60, km: dists[peak] / 1000 },
    at(minute) {
      const t = minute * 60;
      if (t < egress) return { phase: 'in the airlock, about to leave', km: null, shelterMin: 0, inside: true };
      if (t < arrive) {
        let i = 0; while (i < times.length - 1 && times[i + 1] <= t - egress) i++;
        return { phase: 'walking out', km: dists[i] / 1000, shelterMin: back[i] / 60 };
      }
      if (t < leave) return { phase: 'working at the target', km: route.distanceMeters / 1000, shelterMin: home / 60 };
      if (t < atDoor) return { phase: 'already walking back', km: null, shelterMin: (atDoor - t) / 60 };
      return { phase: 'back in the airlock', km: null, shelterMin: 0, inside: true };
    }
  };
}

/* Called when the page opens. */
function stormsOpen() { if (_storm) { _storm.drawn = ''; stormsRefresh(); } }

/* Fills the drill with the planner's numbers. Runs once a second while the page is open, and on slider moves. */
function stormsRefresh(force) {
  const s = _storm;
  if (!s || !s.data || !s.live) return;
  const line = stormTimeline(), route = STATE.route || {};
  const signature = [route.status, route.distanceMeters, route.timeSeconds, STATE.walkback && STATE.walkback.status, s.warnMin, !!line].join('|');
  if (!force && signature === s.drawn) return;
  s.drawn = signature;
  s.emptyBox.hidden = !!line; s.live.hidden = !line;
  s.trip.textContent = ''; s.dose.textContent = '';
  const d = s.data, e2017 = d.events.find(e => e.id === '2017-09'), e2024 = d.events.find(e => e.id === '2024-05');
  const airlock = CONFIG.eva.ingressMinutes;

  if (!line) {
    s.empty.textContent = route.status === 'ok'
      ? 'This kind of route (several stops) has no minute-by-minute timeline yet. Plan a walk to one target to run the drill.'
      : 'Plan a walk first. The drill then shows how far you are from shelter at every minute of it.';
    s.trip.appendChild(stormEl('p', '', 'The EVA ends at once and the crew stays inside. In September 2017 the high readings lasted more than two days, so the next walks wait too.'));
    s.trip.appendChild(stormSource(e2017.source, e2017.url));
    return;
  }

  const total = Math.floor(line.totalMin);
  if (s.warnMin == null || s.warnMin > total) s.warnMin = Math.round(line.arriveMin);     // start the drill at arrival: usually the far point
  s.slider.max = String(total); s.slider.value = String(s.warnMin);
  const now = line.at(s.warnMin);
  s.sliderText.textContent = 'The alert comes ' + stormMinutes(s.warnMin) + ' into the EVA';
  s.where.textContent = 'You are ' + now.phase + (now.km != null ? ', ' + now.km.toFixed(2) + ' km along the route' : '') + '.';
  if (now.inside) {
    s.big.textContent = 'Already at the habitat';
    s.sum.textContent = 'Stay in and go to the storm shelter.';
  } else {
    s.big.textContent = stormMinutes(now.shelterMin + airlock) + ' to be inside';
    s.sum.textContent = stormMinutes(now.shelterMin) + ' walk to the habitat + ' + airlock + ' min airlock (our assumption). The habitat is the storm shelter (our assumption).';
  }

  // NASA's 2-hour figure against the worst moment of this route
  const worst = line.peak.min + airlock, limitMin = d.health.evaTerminateHours * 60, ok = worst <= limitMin;
  s.rule.className = 'storm-rule ' + (ok ? 'pass' : 'fail');
  s.rule.textContent = (ok ? '✓ ' : '✕ ') + 'Worst moment of this walk: ' + stormMinutes(worst) + ' to be inside. NASA: ' + d.health.evaRule;
  s.far.textContent = 'That worst moment is ' + line.peak.km.toFixed(2) + ' km along the route (' + stormMinutes(line.peak.min) + ' walk back). ' +
    'We compare it with NASA\'s 2 hours as a planning check; reading "ended" as "back inside" is our interpretation.';

  // What it does to the trip
  const used = Math.min(s.warnMin, total), lost = Math.max(0, line.arriveMin + CONFIG.eva.workMinutes - used);
  s.trip.appendChild(stormEl('p', '', now.inside ? 'The walk does not start, or is already over.'
    : 'The walk ends here. ' + (lost >= CONFIG.eva.workMinutes ? 'All ' + CONFIG.eva.workMinutes + ' min of science at the target are lost.'
      : lost > 0 ? 'About ' + stormMinutes(lost) + ' of the ' + CONFIG.eva.workMinutes + ' min of science at the target are lost.' : 'The science at the target was already done.')));
  s.trip.appendChild(stormEl('p', '', 'Then the crew stays inside. In September 2017 the radiation stayed at its peak for about ' + e2017.peakHours +
    ' hours and took ' + e2017.declineHours + ' more to fall back: about two days with no EVAs.'));
  s.trip.appendChild(stormSource(e2017.source, e2017.url2 || e2017.url));

  // Dose on the walk home: normal, and at the measured 2017 peak (our calculation from two sourced numbers)
  const base = STATE.radBaseline && STATE.radBaseline.doseRateMuGyPerDay;
  if (base && !now.inside) {
    const days = (now.shelterMin + airlock) / 1440, normal = base * days;
    const fmt = v => v < 10 ? v.toFixed(1) : String(Math.round(v));
    s.dose.appendChild(stormEl('p', '', 'On a quiet day those ' + stormMinutes(now.shelterMin + airlock) + ' add about ' + fmt(normal) + ' μGy. ' +
      'At the peak of a storm like September 2017 (' + e2017.peakFactorLow + ' to ' + e2017.peakFactorHigh + ' times normal) they add about ' +
      fmt(normal * e2017.peakFactorLow) + ' to ' + fmt(normal * e2017.peakFactorHigh) + ' μGy.'));
    s.dose.appendChild(stormEl('p', 'storm-calc', 'Our calculation: ' + base + ' μGy per day (Curiosity RAD average, 2012-13) × storm factor × time outside. Not inside a suit; suit shielding is not modelled.'));
  } else if (now.inside) {
    s.dose.appendChild(stormEl('p', '', 'You are already under shielding when the alert comes.'));
  }
  s.dose.appendChild(stormEl('p', '', 'Staying outside for the whole of the biggest storm RAD has measured (May 2024) would have meant ' +
    e2024.doseMuGy.toLocaleString('en-US') + ' μGy, which NASA compares to 30 chest X-rays. The sooner you are under shielding, the less of a storm you receive.'));
  s.dose.appendChild(stormSource(e2024.source, e2024.url));
}

/* Adds one line to the route card (pages 1 and 5): how long it takes to be inside if a storm alert comes at
   the worst moment of this walk. Same numbers as the drill above (stormTimeline); nothing new is calculated.
   The walk-back map can arrive a moment after the route, so it tries again a few times. */
function stormsCardLine(tries) {
  const card = document.getElementById('summary-card'), body = card && card.querySelector('.rc-body');
  if (!body || body.querySelector('.rc-storm')) return;
  const line = stormTimeline();
  if (!line) {
    if (STATE.route && STATE.route.status === 'ok' && (tries || 0) < 10) setTimeout(() => stormsCardLine((tries || 0) + 1), 500);
    return;
  }
  const airlock = CONFIG.eva.ingressMinutes, worst = line.peak.min + airlock;
  const limitHours = _storm && _storm.data ? _storm.data.health.evaTerminateHours : null;
  const box = stormEl('div', 'rc-storm' + (limitHours ? (worst <= limitHours * 60 ? ' pass' : ' fail') : ''));
  box.appendChild(stormEl('b', '', 'Solar storm alert at the worst moment: ' + stormMinutes(worst) + ' to be inside'));
  box.appendChild(stormEl('small', '', stormMinutes(line.peak.min) + ' walk back from ' + line.peak.km.toFixed(2) + ' km along the route + ' +
    airlock + ' min airlock (our assumption).' +
    (limitHours ? ' ' + (worst <= limitHours * 60 ? 'Inside' : 'Over') + ' NASA\'s ' + limitHours + '-hour figure for ending an EVA (our reading of it).' : '')));
  const go = stormEl('button', 'rc-storm-go', 'Open the storm drill →'); go.type = 'button';
  go.addEventListener('click', () => { if (typeof pagesShow === 'function') pagesShow('storm'); });
  box.appendChild(go);
  body.insertBefore(box, body.querySelector(':scope > .rc-section'));
}

/* Hooks into the route card so the storm line is added every time the card is rebuilt. Runs once. */
function stormsCardHook() {
  if (typeof updateSummaryCard !== 'function' || window._stormCardHooked) return;
  window._stormCardHooked = true;
  const original = window.updateSummaryCard;
  window.updateSummaryCard = function () {
    const result = original.apply(this, arguments);
    try { stormsCardLine(); } catch (err) { console.warn('[storms]', err); }
    return result;
  };
}
