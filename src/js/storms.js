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

/* Builds the empty page once and loads the facts file. Called by initPages.
   Layout, top to bottom: headline + three key numbers | the storm drill for the planned walk |
   the three measured storms side by side | what to do (left) and what it does to a person (right). */
function stormsBuild() {
  if (_storm) return;
  const root = stormEl('section'); root.id = 'pg-storm'; root.setAttribute('aria-label', 'Solar storms');
  const wrap = stormEl('div', 'st-wrap'); root.appendChild(wrap);

  const hero = stormEl('header', 'st-hero'), heroText = stormEl('div', 'st-hero-text'), stats = stormEl('div', 'st-stats');
  heroText.appendChild(stormEl('div', 'st-kicker', 'Space weather · measured by Curiosity'));
  heroText.appendChild(stormEl('h2', '', 'A solar storm hits the whole planet at once'));
  heroText.appendChild(stormEl('p', '', 'Mars has no magnetic field and only thin air, so there is no route around a storm. ' +
    'The one thing a crew controls is how fast they get under shielding.'));
  hero.appendChild(heroText); hero.appendChild(stats); wrap.appendChild(hero);

  const drill = stormEl('section', 'st-drill'), events = stormEl('section', 'st-events');
  const bottom = stormEl('div', 'st-bottom'), steps = stormEl('section', 'st-col'), person = stormEl('section', 'st-col');
  bottom.appendChild(steps); bottom.appendChild(person);
  wrap.appendChild(drill); wrap.appendChild(events); wrap.appendChild(bottom);
  document.body.appendChild(root);
  _storm = { root, stats, events, drill, steps, person, data: null, drawn: '', warnMin: null };
  stormsCardHook();

  fetch('./data/space-weather.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => { _storm.data = data; stormsStatic(); stormsRefresh(); })
    .catch(err => { console.warn('[storms]', err); drill.appendChild(stormEl('p', 'st-note', 'Could not load the storm data file. Refresh the page.')); });
}

/* A fold-out "more" block: a short label you click to read the longer text. */
function stormFold(label) {
  const box = stormEl('details', 'st-fold'); box.appendChild(stormEl('summary', '', label));
  return box;
}

/* A section heading with an optional short line beside it. */
function stormHead(title, aside) {
  const head = stormEl('div', 'st-head'); head.appendChild(stormEl('h3', '', title));
  if (aside) head.appendChild(stormEl('span', '', aside));
  return head;
}

/* Draws the parts that never change. Every text and number comes from space-weather.json. */
function stormsStatic() {
  const s = _storm, d = s.data;
  const e2017 = d.events.find(e => e.id === '2017-09'), e2024 = d.events.find(e => e.id === '2024-05');

  // Headline numbers
  [[e2017.stat, e2017.statLabel, e2017.date], [e2024.stat, e2024.statLabel, e2024.date],
   [d.health.evaTerminateHours + ' h', 'to end an EVA and reach shielding', 'NASA planning figure']].forEach(([big, label, foot]) => {
    const tile = stormEl('div', 'st-stat');
    tile.appendChild(stormEl('b', '', big)); tile.appendChild(stormEl('span', '', label)); tile.appendChild(stormEl('small', '', foot));
    s.stats.appendChild(tile);
  });

  // The drill: frame only; stormsRefresh fills in the numbers
  s.drill.appendChild(stormHead('Storm drill for your planned walk', 'Drag the slider: when does the alert come?'));
  s.empty = stormEl('p', 'st-note');
  const go = stormEl('button', 'st-go', '← Go to 1 · Plan route'); go.type = 'button';
  go.addEventListener('click', () => { if (typeof pagesShow === 'function') pagesShow('plan'); });
  s.emptyBox = stormEl('div', 'st-empty'); s.emptyBox.appendChild(s.empty); s.emptyBox.appendChild(go);
  s.live = stormEl('div', 'st-live');
  const main = stormEl('div', 'st-main'), side = stormEl('div', 'st-side');

  s.track = stormEl('div', 'st-track'); s.marker = stormEl('i', 'st-marker');
  s.slider = stormEl('input'); s.slider.type = 'range'; s.slider.min = '0'; s.slider.step = '1';
  s.slider.setAttribute('aria-label', 'Minutes into the EVA when the storm alert comes');
  s.slider.addEventListener('input', () => { s.warnMin = Number(s.slider.value); stormsRefresh(true); });
  const rail = stormEl('div', 'st-rail'); rail.appendChild(s.track); rail.appendChild(s.marker); rail.appendChild(s.slider);
  s.where = stormEl('p', 'st-where');
  const answer = stormEl('div', 'st-answer'); s.big = stormEl('b'); s.bigNote = stormEl('span');
  answer.appendChild(s.big); answer.appendChild(s.bigNote);
  s.sum = stormEl('p', 'st-sum');
  const gauge = stormEl('div', 'st-gauge');
  s.gaugeText = stormEl('div', 'st-gauge-text');
  const bar = stormEl('div', 'st-gauge-bar'); s.gaugeFill = stormEl('i'); s.gaugeTick = stormEl('em');
  bar.appendChild(s.gaugeFill); bar.appendChild(s.gaugeTick);
  s.far = stormEl('p', 'st-fine');
  gauge.appendChild(s.gaugeText); gauge.appendChild(bar); gauge.appendChild(s.far);
  main.appendChild(rail); main.appendChild(s.where); main.appendChild(answer); main.appendChild(s.sum); main.appendChild(gauge);

  const tripBox = stormEl('div', 'st-block'); tripBox.appendChild(stormEl('h4', '', 'What it does to the trip'));
  s.trip = stormEl('div'); tripBox.appendChild(s.trip);
  const doseBox = stormEl('div', 'st-block'); doseBox.appendChild(stormEl('h4', '', 'Radiation on the walk home'));
  s.dose = stormEl('div'); doseBox.appendChild(s.dose);
  side.appendChild(tripBox); side.appendChild(doseBox);
  s.live.appendChild(main); s.live.appendChild(side);
  s.drill.appendChild(s.emptyBox); s.drill.appendChild(s.live);

  // The three storms, side by side, oldest first
  s.events.appendChild(stormHead('Storms Curiosity measured on the ground', d.context.stormCount));
  const row = stormEl('div', 'st-event-row');
  d.events.forEach(ev => {
    const card = stormEl('article', 'st-event');
    card.appendChild(stormEl('time', '', ev.date));
    card.appendChild(stormEl('b', '', ev.stat)); card.appendChild(stormEl('span', '', ev.statLabel));
    card.appendChild(stormEl('h4', '', ev.title));
    card.appendChild(stormEl('p', 'st-quote', ev.meaning));
    const more = stormFold('What RAD measured');
    more.appendChild(stormEl('p', '', ev.measured)); more.appendChild(stormSource(ev.source, ev.url));
    card.appendChild(more); row.appendChild(card);
  });
  s.events.appendChild(row);
  s.events.appendChild(stormSource(d.context.stormCountSource, d.context.stormCountUrl));

  // What to do
  s.steps.appendChild(stormHead('When the storm alert sounds'));
  const list = stormEl('ol', 'st-steps');
  d.precautions.forEach(p => {
    const li = stormEl('li');
    li.appendChild(stormEl('strong', '', p.step)); li.appendChild(stormEl('p', '', p.why)); li.appendChild(stormEl('small', '', p.source));
    list.appendChild(li);
  });
  s.steps.appendChild(list);

  // What it does to a person
  s.person.appendChild(stormHead('What a storm can do to a person'));
  const rows = stormEl('dl', 'st-facts');
  [['During the mission', d.health.duringMission], ['Years later', d.health.afterMission]].forEach(([label, text]) => {
    rows.appendChild(stormEl('dt', '', label)); rows.appendChild(stormEl('dd', '', text));
  });
  s.person.appendChild(rows);
  const limits = stormEl('div', 'st-limits');
  [[d.health.sepLimitMsv + ' mSv', 'NASA limit for any one solar storm'], [d.health.careerLimitMsv + ' mSv', 'NASA limit over a whole career'],
   [d.context.cliffPercent + '%', 'less radiation measured at the foot of a cliff']].forEach(([big, label]) => {
    const chip = stormEl('div', 'st-limit'); chip.appendChild(stormEl('b', '', big)); chip.appendChild(stormEl('span', '', label)); limits.appendChild(chip);
  });
  s.person.appendChild(limits);
  const likely = stormFold('How likely is a dangerous dose?'); likely.appendChild(stormEl('p', '', d.health.howLikely)); likely.appendChild(stormEl('p', '', d.health.limits));
  const units = stormFold('Why this page does not convert gray to sievert'); units.appendChild(stormEl('p', '', d.health.unitNote));
  const cliff = stormFold('How much does a cliff help?'); cliff.appendChild(stormEl('p', '', d.context.cliffShielding)); cliff.appendChild(stormSource(d.context.cliffSource, d.context.cliffUrl));
  s.person.appendChild(likely); s.person.appendChild(units); s.person.appendChild(cliff);
  s.person.appendChild(stormSource(d.health.source, d.health.url));
}

/* Works out where the crew is, minute by minute, for the planned EVA.
   Returns null without a route. Otherwise { totalMin, arriveMin, phases, peak: {min, km}, at(minute) }.
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
    phases: [['Airlock', egress], ['Walk out', out], ['Work at target', work], ['Walk back', home], ['Airlock', ingress]]
      .map(([name, seconds]) => ({ name, min: seconds / 60 })),
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

/* One row of the dose comparison: a label, a bar and the number. from/to are shares (0 to 1) of the bar. */
function stormDoseRow(label, value, from, to, kind) {
  const row = stormEl('div', 'st-dose-row');
  row.appendChild(stormEl('span', '', label));
  const bar = stormEl('div', 'st-dose-bar'), solid = stormEl('i', kind);
  solid.style.width = (from * 100).toFixed(1) + '%'; bar.appendChild(solid);
  if (to > from) { const range = stormEl('i', kind + ' range'); range.style.width = ((to - from) * 100).toFixed(1) + '%'; bar.appendChild(range); }
  row.appendChild(bar); row.appendChild(stormEl('b', '', value));
  return row;
}

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
    return;
  }

  const total = Math.floor(line.totalMin);
  if (s.warnMin == null || s.warnMin > total) s.warnMin = Math.round(line.arriveMin);     // start the drill at arrival: usually the far point
  s.slider.max = String(total); s.slider.value = String(s.warnMin);
  const now = line.at(s.warnMin);

  // The EVA as one bar: each phase as wide as the time it takes
  s.track.textContent = '';
  line.phases.forEach((phase, i) => {
    const part = stormEl('div', 'st-phase p' + i); part.style.flexGrow = String(Math.max(phase.min, 0.01));
    part.appendChild(stormEl('span', '', phase.name)); part.appendChild(stormEl('small', '', stormMinutes(phase.min)));
    s.track.appendChild(part);
  });
  s.marker.style.left = (100 * s.warnMin / total).toFixed(2) + '%';

  s.where.textContent = 'Alert ' + stormMinutes(s.warnMin) + ' into the EVA. You are ' + now.phase + (now.km != null ? ', ' + now.km.toFixed(2) + ' km along the route' : '') + '.';
  if (now.inside) {
    s.big.textContent = 'Already at the habitat'; s.bigNote.textContent = '';
    s.sum.textContent = 'Stay in and go to the storm shelter.';
  } else {
    s.big.textContent = stormMinutes(now.shelterMin + airlock); s.bigNote.textContent = 'to be inside';
    s.sum.textContent = stormMinutes(now.shelterMin) + ' walk to the habitat + ' + airlock + ' min airlock (our assumption). The habitat is the storm shelter (our assumption).';
  }

  // NASA's 2-hour figure against the worst moment of this route
  const worst = line.peak.min + airlock, limitMin = d.health.evaTerminateHours * 60, ok = worst <= limitMin;
  const scale = Math.max(limitMin * 1.25, worst * 1.05);
  s.gaugeText.className = 'st-gauge-text ' + (ok ? 'pass' : 'fail');
  s.gaugeText.textContent = (ok ? '✓ ' : '✕ ') + 'Worst moment of this walk: ' + stormMinutes(worst) + ' to be inside';
  s.gaugeFill.className = ok ? 'pass' : 'fail'; s.gaugeFill.style.width = (100 * worst / scale).toFixed(1) + '%';
  s.gaugeTick.style.left = (100 * limitMin / scale).toFixed(1) + '%'; s.gaugeTick.textContent = 'NASA ' + d.health.evaTerminateHours + ' h';
  s.far.textContent = 'That moment is ' + line.peak.km.toFixed(2) + ' km along the route (' + stormMinutes(line.peak.min) + ' walk back). NASA: ' + d.health.evaRule +
    ' Reading "ended" as "back inside" is our interpretation.';

  // What it does to the trip
  const used = Math.min(s.warnMin, total), lost = Math.max(0, line.arriveMin + CONFIG.eva.workMinutes - used);
  s.trip.appendChild(stormEl('p', '', now.inside ? 'The walk does not start, or is already over.'
    : 'The walk ends here. ' + (Math.round(lost) >= CONFIG.eva.workMinutes ? 'All ' + CONFIG.eva.workMinutes + ' min of science at the target are lost.'
      : lost > 0 ? 'About ' + stormMinutes(lost) + ' of the ' + CONFIG.eva.workMinutes + ' min of science at the target are lost.' : 'The science at the target was already done.')));
  s.trip.appendChild(stormEl('p', '', 'Then the crew stays inside. In September 2017 the radiation stayed at its peak for about ' + e2017.peakHours +
    ' hours and took ' + e2017.declineHours + ' more to fall back: about two days with no EVAs.'));
  s.trip.appendChild(stormSource(e2017.source, e2017.url2 || e2017.url));

  // Dose on the walk home: normal, and at the measured 2017 peak (our calculation from two sourced numbers)
  const base = STATE.radBaseline && STATE.radBaseline.doseRateMuGyPerDay;
  if (base && !now.inside) {
    const days = (now.shelterMin + airlock) / 1440, normal = base * days, low = normal * e2017.peakFactorLow, high = normal * e2017.peakFactorHigh;
    const fmt = v => v < 10 ? v.toFixed(1) : String(Math.round(v));
    s.dose.appendChild(stormDoseRow('Quiet day', fmt(normal) + ' μGy', normal / high, 0, 'quiet'));
    s.dose.appendChild(stormDoseRow('Storm like Sept 2017', fmt(low) + ' to ' + fmt(high) + ' μGy', low / high, 1, 'storm'));
    s.dose.appendChild(stormEl('p', 'st-fine', 'Our calculation for those ' + stormMinutes(now.shelterMin + airlock) + ' outside: ' + base + ' μGy per day (Curiosity RAD average, 2012-13) × storm factor (' +
      e2017.peakFactorLow + ' to ' + e2017.peakFactorHigh + ' times normal) × time. Suit shielding is not modelled.'));
  } else if (now.inside) {
    s.dose.appendChild(stormEl('p', '', 'You are already under shielding when the alert comes.'));
  }
  s.dose.appendChild(stormEl('p', 'st-fine', 'Staying outside for the whole of the biggest storm RAD has measured (May 2024) would have meant ' +
    e2024.doseMuGy.toLocaleString('en-US') + ' μGy, which NASA compares to 30 chest X-rays.'));
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
