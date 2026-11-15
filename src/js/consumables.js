/* consumables.js — Suit & crew engineering model for the planned EVA.
   Depends on: config.js (CONFIG), state.js (STATE). Hooks into ui.js updateSummaryCard() to add a
   "Suit & crew" section to the route card.

   WHAT IT COMPUTES, segment by segment along the real route profile:
     1. Metabolic power while walking — Pandolf load-carriage equation (Pandolf, Givoni & Goldman 1977,
        J. Appl. Physiol. 43(4):577-581), adapted to Mars gravity (locomotion terms scaled by g_Mars/g_Earth).
     2. Energy for the whole EVA: walk out + science work + walk back.
     3. Oxygen used  = energy / oxygen energy equivalent (Weir 1949: ~4.825 kcal per litre O2 at RQ 0.82).
     4. CO2 made     = O2 used x respiratory quotient.
     5. Heat the suit must reject, and the cooling water a sublimator would boil off (latent heat of ice sublimation).
   Then compares totals to the suit's planning capacities and shows margin bars.
   Every number is either a cited constant or labelled OUR ASSUMPTION in CONFIG.suit. */

const SUIT_PHYS = {
  G_EARTH_MPS2: 9.80665,               // standard gravity (CGPM 1901)
  G_MARS_MPS2: 3.721,                  // Mars surface gravity (NASA Mars Fact Sheet)
  KCAL_PER_L_O2: 4.825,                // Weir (1949), J Physiol 109:1-9, at RQ ~0.82
  RQ: 0.82,                            // typical mixed-diet respiratory quotient (Weir 1949)
  O2_G_PER_L: 1.429,                   // O2 density at STP
  CO2_G_PER_L: 1.977,                  // CO2 density at STP
  J_PER_KCAL: 4184,
  ICE_SUBLIMATION_J_PER_KG: 2.83e6     // latent heat of sublimation of water ice near 0 C
};

/* Pandolf (1977) metabolic rate in watts.
   bodyKg W, loadKg L (suit + gear), speedMps V, gradePct G, terrain factor eta, gravityRatio scales locomotion terms. */
function pandolfWatts(bodyKg, loadKg, speedMps, gradePct, eta, gravityRatio) {
  const W = bodyKg, L = loadKg, V = speedMps, G = Math.max(0, gradePct);  // downhill treated as level (conservative)
  const standing = 1.5 * W;
  const load = 2.0 * (W + L) * Math.pow(L / W, 2);
  const move = eta * (W + L) * (1.5 * V * V + 0.35 * V * G);
  return standing + gravityRatio * (load + move);
}

/* Speed (m/s) on one step, same rules as the route worker: uphill slows linearly to 40% at the slope limit,
   downhill slows half as much, rough ground +25% time. */
function stepSpeedMps(slopeDeg, uphill, rough) {
  const flat = STATE.speedKmh * 1000 / 3600;
  const limit = STATE.slopeLimitDeg || CONFIG.slope.defaultLimitDeg;
  let frac = 1 - (1 - CONFIG.speedModel.uphillMinFraction) * Math.min(slopeDeg / limit, 1);
  if (!uphill) frac = 1 - (1 - frac) * CONFIG.speedModel.downhillPenaltyFactor;
  const roughFactor = rough ? (1 + CONFIG.roughness.timePenaltyFraction) : 1;
  return flat * frac / roughFactor;
}

/* Runs the model on STATE.route. Returns a result object, or null if no route. */
function computeConsumables() {
  const route = STATE.route;
  if (!route || route.status !== 'ok' || !route.profile || route.profile.length < 2) return null;
  const S = CONFIG.suit;
  const gRatio = SUIT_PHYS.G_MARS_MPS2 / SUIT_PHYS.G_EARTH_MPS2;
  // Carried load = backpack + tools. Pandolf's load term is valid for loads up to roughly body mass, so the
  // pressure garment itself is not added as load; its extra effort is the suitMobilityFactor.
  const loadKg = S.backpackMassKg + S.toolMassKg;

  // Walk out along the profile; walk back = same segments reversed (uphill <-> downhill)
  let outJ = 0, backJ = 0, outS = 0, backS = 0, peakW = 0, earthJ = 0;
  const p = route.profile;
  const outCumJ = [0], outCumS = [0];   // cumulative energy / time at each profile point (walk out)
  for (let i = 1; i < p.length; i++) {
    const dM = p[i].distanceMeters - p[i - 1].distanceMeters;
    const e0 = p[i - 1].elevationM !== undefined ? p[i - 1].elevationM : p[i - 1].elevationMeters;
    const e1 = p[i].elevationM !== undefined ? p[i].elevationM : p[i].elevationMeters;
    const gradePct = (e1 - e0) / dM * 100;
    const slopeDeg = Math.atan(Math.abs(gradePct) / 100) * 180 / Math.PI;
    if (!(dM > 0) || !isFinite(e0) || !isFinite(e1)) { outCumJ.push(outJ); outCumS.push(outS); continue; }
    for (const dir of [1, -1]) {
      const g = gradePct * dir;
      const v = stepSpeedMps(slopeDeg, g > 0, false);
      const t = dM / v;
      const w = pandolfWatts(S.bodyMassKg, loadKg, v, g, S.terrainFactor, gRatio) * S.suitMobilityFactor;
      if (dir === 1) { outJ += w * t; outS += t; peakW = Math.max(peakW, w); earthJ += pandolfWatts(S.bodyMassKg, loadKg, v, g, S.terrainFactor, 1) * S.suitMobilityFactor * t; }
      else { backJ += w * t; backS += t; }
    }
    outCumJ.push(outJ); outCumS.push(outS);
  }
  const workS = CONFIG.eva.workMinutes * 60;
  const workJ = S.scienceWorkWatts * workS;
  const totalJ = outJ + backJ + workJ;
  const totalS = outS + backS + workS;
  const kcal = totalJ / SUIT_PHYS.J_PER_KCAL;
  const o2L = kcal / SUIT_PHYS.KCAL_PER_L_O2;
  const o2Kg = o2L * SUIT_PHYS.O2_G_PER_L / 1000 + S.o2LeakKgPerHour * totalS / 3600;
  const co2Kg = o2L * SUIT_PHYS.RQ * SUIT_PHYS.CO2_G_PER_L / 1000;
  const heatJ = totalJ * (1 - S.mechanicalEfficiency);
  const waterKg = heatJ * S.sublimatorShare / SUIT_PHYS.ICE_SUBLIMATION_J_PER_KG;

  return {
    totalHours: totalS / 3600, kcal, avgW: totalJ / totalS, peakW,
    o2Kg, o2Frac: o2Kg / S.o2CapacityKg,
    co2Kg, co2Frac: co2Kg / S.co2CapacityKg,
    waterKg, waterFrac: waterKg / S.feedwaterCapacityKg,
    earthKcalOut: earthJ / SUIT_PHYS.J_PER_KCAL, marsKcalOut: outJ / SUIT_PHYS.J_PER_KCAL,
    crew: S.crewSize,
    outCumJ, outCumS, outJ, backJ, workJ,
    o2KgPerJ: o2Kg / totalJ
  };
}

/* Makes one labelled bar row: name, value text, fraction of capacity (0-1+), tooltip. */
function _consumableBar(name, valueText, frac, tip) {
  const row = document.createElement('div');
  row.className = 'cons-row';
  row.title = tip;
  const lab = document.createElement('div');
  lab.className = 'cons-label';
  lab.textContent = name;
  const val = document.createElement('div');
  val.className = 'cons-val';
  const pct = Math.round(frac * 100);
  const level = frac <= CONFIG.suit.cautionFraction ? 'pass' : frac <= 1 ? 'caution' : 'danger';
  val.textContent = `${valueText} · ${pct}%`;
  val.classList.add('cons-' + level);
  const bar = document.createElement('div');
  bar.className = 'cons-bar';
  const fill = document.createElement('div');
  fill.className = 'cons-fill cons-fill-' + level;
  fill.style.width = Math.min(100, pct) + '%';
  bar.appendChild(fill);
  row.append(lab, val, bar);
  return row;
}

/* Adds the "Suit & crew" block to the summary card (after ui.js has drawn it). */
function renderConsumablesSection() {
  const card = document.getElementById('summary-card');
  if (!card) return;
  const old = card.querySelector('.cons-block');
  if (old) old.remove();
  const r = computeConsumables();
  STATE.consumables = r;
  if (!r) return;

  const block = document.createElement('div');
  block.className = 'cons-block';
  const h = document.createElement('div');
  h.className = 'cons-heading';
  h.textContent = 'SUIT & CREW (per astronaut, round trip)';
  h.title = 'Pandolf et al. (1977) walking energy, scaled to Mars gravity; O2 from Weir (1949). Suit capacities are EMU-class planning values (OUR ASSUMPTION).';
  block.appendChild(h);

  const stats = document.createElement('div');
  stats.className = 'cons-stats';
  [['Energy', `${Math.round(r.kcal)} kcal`], ['Avg / peak', `${Math.round(r.avgW)} / ${Math.round(r.peakW)} W`],
   ['Mars vs Earth', `${Math.round(r.marsKcalOut)} vs ${Math.round(r.earthKcalOut)} kcal out`]].forEach(([k, v]) => {
    const s = document.createElement('div');
    s.className = 'cons-stat';
    const kk = document.createElement('span'); kk.textContent = k;
    const vv = document.createElement('b'); vv.textContent = v;
    s.append(kk, vv);
    stats.appendChild(s);
  });
  block.appendChild(stats);

  const S = CONFIG.suit;
  block.appendChild(_consumableBar('Oxygen', `${r.o2Kg.toFixed(2)} kg`, r.o2Frac,
    `O2 used vs ${S.o2CapacityKg} kg primary supply (OUR ASSUMPTION, EMU-class). Includes ${S.o2LeakKgPerHour} kg/h suit leakage (OUR ASSUMPTION).`));
  block.appendChild(_consumableBar('CO2 scrub', `${r.co2Kg.toFixed(2)} kg`, r.co2Frac,
    `CO2 made vs ${S.co2CapacityKg} kg scrubber capacity (OUR ASSUMPTION).`));
  block.appendChild(_consumableBar('Cooling water', `${r.waterKg.toFixed(2)} kg`, r.waterFrac,
    `Water boiled off to reject body heat vs ${S.feedwaterCapacityKg} kg feedwater (OUR ASSUMPTION). Note: sublimators work poorly in Mars' ~6 mbar CO2 air; real Mars suits may need another cooler.`));

  const note = document.createElement('div');
  note.className = 'cons-note';
  note.textContent = `Crew of ${r.crew} (buddy rule): pack ${(r.o2Kg * r.crew).toFixed(2)} kg O2 total. Model: Pandolf 1977 + Mars gravity; suit numbers are planning assumptions.`;
  block.appendChild(note);

  const pov = card.querySelector('.sum-pov-btn');
  card.insertBefore(block, pov || null);
}

/* Wraps ui.js updateSummaryCard so the suit section is redrawn every time the card is. Call once. */
function initConsumables() {
  if (typeof updateSummaryCard !== 'function' || window._consHooked) return;
  const original = updateSummaryCard;
  window.updateSummaryCard = function () {
    original.apply(this, arguments);
    try { renderConsumablesSection(); } catch (e) { console.warn('[consumables]', e); }
  };
  window._consHooked = true;
}
