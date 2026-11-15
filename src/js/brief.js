/* brief.js — EVA Cue Card: a printable, timeline-style mission brief for the planned Marswalk,
   modelled on the wrist "cuff checklists" astronauts carry. Built only from computed values:
   route (route-worker), walk-back field, point of no return, suit & crew model (consumables.js),
   radiation (safety.js), Mars clock (marsclock.js, if loaded).
   Depends on: CONFIG, STATE, cellToLatLon, getCellValue, computePointOfNoReturn, computeRadiation. */

const BRIEF_STATIONS = [0.25, 0.5, 0.75];   // check-points at 25/50/75% of the walk out [OUR ASSUMPTION]
const BRIEF_EGRESS_MIN = CONFIG.eva.egressMinutes;    // airlock exit + suit checks before walking [OUR ASSUMPTION]
const BRIEF_INGRESS_MIN = CONFIG.eva.ingressMinutes;  // airlock entry after return [OUR ASSUMPTION]

/* Formats minutes as a PET (phased elapsed time) string "H:MM". */
function briefPet(min) {
  const m = Math.max(0, Math.round(min));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/* Formats an LMST hour (0-24) as "HH:MM", or "" if no clock. */
function briefLmst(h) {
  if (!isFinite(h)) return '';
  const x = ((h % 24) + 24) % 24;
  return `${String(Math.floor(x)).padStart(2, '0')}:${String(Math.floor((x % 1) * 60)).padStart(2, '0')}`;
}

/* Returns { distM, elevM, walkbackMin, o2LeftFrac, petMin } at a fraction of the walk out. */
function briefStation(frac, cons, petStartMin) {
  const route = STATE.route, prof = route.profile;
  const target = frac * prof[prof.length - 1].distanceMeters;
  let i = prof.findIndex(p => p.distanceMeters >= target);
  if (i < 0) i = prof.length - 1;
  const elev = prof[i].elevationM !== undefined ? prof[i].elevationM : prof[i].elevationMeters;
  const cell = route.cells[Math.min(route.cells.length - 1, Math.round(frac * (route.cells.length - 1)))];
  const W = STATE.grids.aoi.width;
  const wb = STATE.walkback && STATE.walkback.data ? STATE.walkback.data[cell.row * W + cell.col] : NaN;
  const usedJ = cons ? cons.outCumJ[Math.min(i, cons.outCumJ.length - 1)] : NaN;
  // Time comes from the route engine (route.timeSeconds); the suit model only shapes it along the path
  const totalS = cons ? cons.outCumS[cons.outCumS.length - 1] : 0;
  const tS = cons && totalS > 0 ? cons.outCumS[Math.min(i, cons.outCumS.length - 1)] / totalS * route.timeSeconds : frac * route.timeSeconds;
  return {
    distM: prof[i].distanceMeters, elevM: elev, walkbackMin: wb / 60,
    o2LeftFrac: cons ? 1 - (usedJ * cons.o2KgPerJ) / CONFIG.suit.o2CapacityKg : NaN,
    petMin: petStartMin + tS / 60
  };
}

/* Builds the cue-card HTML element for the current route. Returns the element or null. */
function buildBrief() {
  const route = STATE.route;
  if (!route || route.status !== 'ok') return null;
  const t = STATE.selectedTarget ? STATE.selectedTarget.properties : { name: 'Selected point' };
  const cons = typeof computeConsumables === 'function' ? computeConsumables() : null;
  const clock = window.MARS_CLOCK ? window.MARS_CLOCK.now() : null;
  const startLmst = STATE.evaStartHour;
  const MARS_SOL_PER_DAY = 1.0275;      // one sol = 1.0275 Earth days (Allison & McEwen 2000)
  const lmstAt = petMin => startLmst + petMin / 60 / MARS_SOL_PER_DAY;   // PET is in Earth minutes
  const toLmst = petMin => briefLmst(lmstAt(petMin));
  const day = (typeof daylight === 'function' && window.MARS_CLOCK)
    ? daylight(new Date(), CONFIG.studyArea.centerLon, CONFIG.studyArea.centerLat) : null;
  const outMin = route.timeSeconds / 60;
  const walkStart = BRIEF_EGRESS_MIN;
  const arrive = walkStart + outMin;
  const leave = arrive + CONFIG.eva.workMinutes;
  const lastCell = route.cells[route.cells.length - 1];
  const wbTarget = STATE.walkback && STATE.walkback.data ? STATE.walkback.data[lastCell.row * STATE.grids.aoi.width + lastCell.col] : NaN;
  const backMin = isFinite(wbTarget) && wbTarget > 0 ? wbTarget / 60 : outMin;
  const home = leave + backMin;
  const done = home + BRIEF_INGRESS_MIN;
  const evaMin = STATE.evaHours * 60;
  const ponrIdx = typeof computePointOfNoReturn === 'function' ? computePointOfNoReturn() : null;
  const wholeSafe = ponrIdx !== null && ponrIdx >= route.cells.length - 1;
  const ponrPet = ponrIdx === null ? null
    : (route.cellTimeSeconds && route.cellTimeSeconds[ponrIdx] !== undefined)
      ? walkStart + route.cellTimeSeconds[ponrIdx] / 60
      : walkStart + (ponrIdx / Math.max(1, route.cells.length - 1)) * outMin;
  const rad = typeof computeRadiation === 'function' ? computeRadiation(done / 60) : null;

  const rows = [
    ['0:00', toLmst(0), 'EGRESS', 'Airlock out. Suit leak check, comms check with habitat, buddy check.', ''],
    [briefPet(walkStart), toLmst(walkStart), 'DEPART BASE', `Head for ${t.name}. ${(route.distanceMeters / 1000).toFixed(2)} km, steepest ${route.steepestDeg.toFixed(1)}° (limit ${STATE.slopeLimitDeg}°).`, cons ? 'O2 100%' : '']
  ];
  BRIEF_STATIONS.forEach((f, k) => {
    const s = briefStation(f, cons, walkStart);
    rows.push([briefPet(s.petMin), toLmst(s.petMin), `STATION ${k + 1}`,
      `${(s.distM / 1000).toFixed(2)} km · elev ${Math.round(s.elevM)} m · walk-back ${isFinite(s.walkbackMin) ? Math.round(s.walkbackMin) + ' min' : '—'}. Report position + suit status.`,
      isFinite(s.o2LeftFrac) ? `O2 ${Math.round(s.o2LeftFrac * 100)}%` : '']);
  });
  rows.push([briefPet(arrive), toLmst(arrive), 'ARRIVE TARGET', `${t.findings || 'Begin science tasks.'}`,
    cons ? `O2 ${Math.round((1 - cons.outJ * cons.o2KgPerJ / CONFIG.suit.o2CapacityKg) * 100)}%` : '']);
  rows.push([briefPet(leave), toLmst(leave), 'SCIENCE DONE', `Stow samples. Photo-document site. Begin return.`,
    cons ? `O2 ${Math.round((1 - (cons.outJ + cons.workJ) * cons.o2KgPerJ / CONFIG.suit.o2CapacityKg) * 100)}%` : '']);
  rows.push([briefPet(home), toLmst(home), 'BASE', 'Arrive habitat. Dust off, tool stow.', cons ? `O2 ${Math.round((1 - cons.o2Frac) * 100)}%` : '']);
  rows.push([briefPet(done), toLmst(done), 'INGRESS', `EVA complete: ${briefPet(done)} of ${briefPet(evaMin)} available (${Math.round(done / evaMin * 100)}%).`, '']);

  const go = [
    [route.steepestDeg <= STATE.slopeLimitDeg, `Slope on route ≤ ${STATE.slopeLimitDeg}°`],
    [done <= evaMin * (1 - CONFIG.eva.reserveFraction), `EVA fits with ${Math.round(CONFIG.eva.reserveFraction * 100)}% time reserve`],
    [!cons || cons.o2Frac <= CONFIG.suit.cautionFraction, 'Oxygen keeps ≥ 25% reserve'],
    [!cons || cons.waterFrac <= CONFIG.suit.cautionFraction, 'Cooling water keeps ≥ 25% reserve'],
    [!day || (lmstAt(0) >= day.sunriseLmst && lmstAt(done) <= day.sunsetLmst),
      day ? `Whole EVA in daylight (sunrise ${briefLmst(day.sunriseLmst)}, sunset ${briefLmst(day.sunsetLmst)} LMST)` : 'Whole EVA in daylight']
  ];

  const el = document.createElement('div');
  el.className = 'brief';
  const head = document.createElement('div');
  head.className = 'brief-head';
  head.innerHTML = `<div><div class="brief-kicker">EVA CUE CARD · MARSWALK</div>
    <div class="brief-title"></div><div class="brief-sub"></div></div>
    <div class="brief-badge"></div>`;
  head.querySelector('.brief-title').textContent = t.name;
  head.querySelector('.brief-sub').textContent =
    `Crew ${CONFIG.suit.crewSize} (buddy pair) · start ${briefLmst(startLmst)} LMST` +
    (clock ? ` · today is sol ${clock.mslSol}, Ls ${Math.round(clock.lsDeg)}°` : '') +
    ` · ${STATE.speedKmh} km/h pace · ${STATE.evaHours} h EVA`;
  const allGo = go.every(g => g[0]);
  const badge = head.querySelector('.brief-badge');
  badge.textContent = allGo ? 'GO' : 'NO-GO';
  badge.classList.add(allGo ? 'brief-go' : 'brief-nogo');
  el.appendChild(head);

  const table = document.createElement('table');
  table.className = 'brief-table';
  table.innerHTML = '<thead><tr><th>PET</th><th>LMST</th><th>EVENT</th><th>ACTIONS / CUES</th><th>SUIT</th></tr></thead>';
  const tb = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    r.forEach((c, k) => { const td = document.createElement('td'); td.textContent = c; if (k === 2) td.className = 'brief-ev'; tr.appendChild(td); });
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  el.appendChild(table);

  const turn = document.createElement('div');
  turn.className = 'brief-turn';
  turn.textContent = wholeSafe ? 'TURN-BACK RULE: whole route is inside the turn-back limit. Still abort on any suit alarm, comm loss > 5 min, or buddy issue.'
    : `TURN-BACK RULE: if not at the target by PET ${briefPet(ponrPet)}, TURN BACK. Also abort on any suit alarm, comm loss > 5 min, or buddy issue.`;
  el.appendChild(turn);

  const grid = document.createElement('div');
  grid.className = 'brief-grid';
  const goBox = document.createElement('div');
  goBox.innerHTML = '<div class="brief-h">GO / NO-GO</div>';
  go.forEach(([ok, label]) => { const d = document.createElement('div'); d.className = ok ? 'brief-ok' : 'brief-bad'; d.textContent = (ok ? '✓ ' : '✗ ') + label; goBox.appendChild(d); });
  const numBox = document.createElement('div');
  numBox.innerHTML = '<div class="brief-h">NUMBERS</div>';
  const nums = [
    ['Distance out / climb', `${(route.distanceMeters / 1000).toFixed(2)} km / +${Math.round(route.climbMeters)} m`],
    ['Walk out / back', `${Math.round(outMin)} / ${Math.round(backMin)} min`],
    ['Energy per astronaut', cons ? `${Math.round(cons.kcal)} kcal (avg ${Math.round(cons.avgW)} W)` : '—'],
    ['O2 / water used', cons ? `${cons.o2Kg.toFixed(2)} kg / ${cons.waterKg.toFixed(2)} kg` : '—'],
    ['Radiation, this EVA (rover baseline)', rad ? `${rad.doseEstimateMuGy} μGy${doseRangeText(rad)}` : '—']
  ];
  nums.forEach(([k, v]) => { const d = document.createElement('div'); d.className = 'brief-num'; d.innerHTML = '<span></span><b></b>'; d.firstChild.textContent = k; d.lastChild.textContent = v; numBox.appendChild(d); });
  grid.append(goBox, numBox);
  el.appendChild(grid);

  const foot = document.createElement('div');
  foot.className = 'brief-foot';
  foot.textContent = 'Planning concept, not flight software. Terrain: HiRISE DTM (NASA/JPL/UArizona). Energy: Pandolf 1977 + Mars gravity; O2: Weir 1949. Suit capacities, egress/ingress times and station spacing are OUR ASSUMPTIONS.';
  el.appendChild(foot);
  return el;
}

/* Opens the cue card in a modal with Print and Close buttons. */
function showBrief() {
  let modal = document.getElementById('brief-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'brief-modal';
  modal.className = 'brief-modal';
  const box = document.createElement('div');
  box.className = 'brief-box';
  const tools = document.createElement('div');
  tools.className = 'brief-tools';
  const pr = document.createElement('button'); pr.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-print"/></svg> Print / save PDF'; pr.addEventListener('click', () => window.print());
  const closeBrief = () => { modal.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') closeBrief(); };          // Escape closes the card, like the other panels
  document.addEventListener('keydown', onKey);
  const cl = document.createElement('button'); cl.textContent = 'Close'; cl.addEventListener('click', closeBrief);
  tools.append(pr, cl);
  box.appendChild(tools);
  const card = buildBrief();
  if (card) box.appendChild(card);
  else { const p = document.createElement('p'); p.className = 'brief-empty'; p.textContent = 'Plan a route first: pick a science target.'; box.appendChild(p); }
  modal.appendChild(box);
  modal.addEventListener('click', e => { if (e.target === modal) closeBrief(); });
  document.body.appendChild(modal);
}

/* Adds the "EVA cue card" button to the top bar. Call once. */
function initBrief() {
  const bar = document.getElementById('top-bar');
  if (!bar || document.getElementById('btn-brief')) return;
  const b = document.createElement('button');
  b.id = 'btn-brief';
  b.textContent = 'EVA cue card';
  b.title = 'Printable timeline for this Marswalk: stations, times, oxygen, turn-back rule, GO/NO-GO.';
  b.addEventListener('click', showBrief);
  bar.appendChild(b);
}
