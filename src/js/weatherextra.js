/* weatherextra.js — Extra REMS cards on the Weather page: ground temperature, air pressure, UV index.
   Depends on: pages.js (pgCard, #pg-weather), marsclock.js (window.MARS_CLOCK), data/rems-daily.json
   (built by scripts/13_prepare_rems_daily.py from the REMS team's daily report).
   Call initWeatherExtra() in main.js AFTER initPages().

   It calculates nothing new: every number is a median (with 10th-90th percentile) of real daily
   reports for the current 30-degree-Ls "Mars month". Context only: not used by the route or safety checks. */

const WX_UV_LABELS = { Low: 'Low', Moderate: 'Moderate', High: 'High', Very_High: 'Very high' };

/* Loads the file and adds the cards. Any failure leaves the Weather page exactly as it was. */
async function initWeatherExtra() {
  const panel = document.getElementById('pg-weather');
  if (!panel || typeof pgCard !== 'function' || panel.querySelector('.wx-extra')) return;
  let data;
  try {
    const resp = await fetch('./data/rems-daily.json');
    if (!resp.ok) throw new Error(resp.status);
    data = await resp.json();
  } catch (err) { console.warn('[weatherextra] rems-daily.json not loaded:', err); return; }

  let ls = null;
  try { ls = window.MARS_CLOCK.now().lsDeg; } catch (e) { /* clock is optional */ }
  if (!Number.isFinite(ls)) ls = data.latest ? data.latest.ls : 0;       // no clock: use the latest reported sol
  const month = data.months.find(m => ls >= m.lsFrom && ls < m.lsTo) || data.months[0];
  const when = `Ls ${month.lsFrom}–${month.lsTo}°, the Mars month it is now`;
  const range = s => `usual range ${s.p10} to ${s.p90}`;
  const foot = panel.querySelector('.pg-foot');
  const card = title => { const c = pgCard(panel, title); c.box.classList.add('wx-extra'); if (foot) panel.insertBefore(c.box, foot); return c; };

  if (month.groundMinC && month.groundMaxC) {
    const c = card('Ground temperature this Mars month');
    c.value.textContent = `night ${month.groundMinC.median} °C · day ${month.groundMaxC.median} °C`;
    c.note.textContent = `Ground surface, daily minimum and maximum (median of ${month.groundMinC.n} sols, ${when}). Night ${range(month.groundMinC)}; day ${range(month.groundMaxC)}. ` +
      (month.airMinC && month.airMaxC ? `Air on the same sols: ${month.airMinC.median} to ${month.airMaxC.median} °C. The ground swings wider than the air.` : '');
  }
  if (month.pressurePa) {
    const withP = data.months.filter(m => m.pressurePa);
    const lo = withP.reduce((a, b) => (b.pressurePa.median < a.pressurePa.median ? b : a));
    const hi = withP.reduce((a, b) => (b.pressurePa.median > a.pressurePa.median ? b : a));
    const c = card('Air pressure this Mars month');
    c.value.textContent = `${month.pressurePa.median} Pa`;
    c.note.textContent = `Median of ${month.pressurePa.n} sols (${range(month.pressurePa)} Pa). Over the Mars year the monthly median goes from ${lo.pressurePa.median} Pa (Ls ${lo.lsFrom}–${lo.lsTo}°) to ${hi.pressurePa.median} Pa (Ls ${hi.lsFrom}–${hi.lsTo}°).`;
  }
  if (month.uvSols) {
    const total = Object.values(month.uvSols).reduce((a, b) => a + b, 0);
    const sorted = Object.keys(month.uvSols).filter(k => month.uvSols[k] / total >= 0.005)   // skip categories under 0.5% of sols
     .sort((a, b) => month.uvSols[b] - month.uvSols[a]);
    const c = card('UV index this Mars month');
    c.value.textContent = WX_UV_LABELS[sorted[0]] || sorted[0];
    c.note.textContent = 'REMS UV category on ' + sorted.map(k => `${Math.round(100 * month.uvSols[k] / total)}% ${WX_UV_LABELS[k] || k}`).join(', ') + ` of ${total} sols. Suit and visor UV protection is not modelled.`;
  }
  const src = card('About these three cards');
  src.value.textContent = `Sols ${data.solRange[0]}–${data.solRange[1]}`;
  src.note.textContent = 'Source: REMS team daily weather report for Curiosity (CAB/INTA-CSIC, via NASA). An outreach product: shown as context, not used in the route or safety checks.' +
    (data.notInReport && data.notInReport.humidity && data.notInReport.wind ? ` The report carries no humidity or wind value for any of its ${data.notInReport.solsChecked} sols, so none is shown.` : '');
  STATE.remsDaily = { month, ls };
}
