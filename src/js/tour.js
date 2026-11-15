/* tour.js — Guided mission tour with large English captions.
   One click plays a ~45 s scripted walkthrough of the real app (no video, no mock-ups): global view → Curiosity's
   real route → pick a target → safe route → suit/safety numbers → EVA cue card → visor HUD walk.
   Doubles as the demo-video script: screen-record it and the captions are the subtitles.
   Depends on: STATE, CONFIG, selectTarget, toggleLayer, showBrief (brief.js), hud.js (hud-toggle button). */

const TOUR_VIDEO = /[?&]video=1/.test(location.search);   // 30-second demo-video cut (open index.html?video=1)
const TOUR_STEP_MS = TOUR_VIDEO ? 3600 : 5200;   // time each caption stays up
const TOUR_LOG = [];                 // {tMs, main, small} for building video subtitles
const TOUR_TARGET_INDEX = 1;         // Monte Grande hollow / Nevado Sajama ridge (Curiosity's drill pair)

let _tour = null;

/* Waits ms milliseconds unless the tour is stopped. Returns false if stopped. */
function tourWait(ms) {
  return new Promise(resolve => {
    const t0 = performance.now();
    const tick = () => {
      if (!_tour || _tour.stopped) return resolve(false);
      if (performance.now() - t0 >= ms) return resolve(true);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/* Shows a caption: big line + small source line. */
function tourCaption(main, small) {
  const el = _tour && _tour.el;
  if (!el) return;
  TOUR_LOG.push({ tMs: performance.now(), main, small: small || '' });
  el.querySelector('.tour-main').textContent = main;
  el.querySelector('.tour-small').textContent = small || '';
  el.classList.remove('tour-in');
  void el.offsetWidth;          // restart the fade-in animation
  el.classList.add('tour-in');
}

/* Waits until the route is computed (or times out). */
async function tourWaitRoute() {
  for (let i = 0; i < 40; i++) {
    if (STATE.route && STATE.route.status === 'ok') return true;
    if (!(await tourWait(100))) return false;
  }
  return false;
}

/* Runs the scripted tour. */
async function runTour() {
  if (_tour) return;
  const el = document.createElement('div');
  el.className = 'tour-caption';
  el.innerHTML = '<div class="tour-main"></div><div class="tour-small"></div><button class="tour-stop" type="button">Stop tour · Esc</button>';
  document.body.appendChild(el);
  _tour = { el, stopped: false };
  el.querySelector('.tour-stop').addEventListener('click', stopTour);
  document.addEventListener('keydown', tourEsc);
  const map = STATE.map;
  const c = CONFIG.studyArea;

  try {
    // Pre-load three.js now so the 3D step starts instantly later (module cache)
    import(new URL('./vendor/three.module.js', document.baseURI).href).catch(() => null);
    if (STATE.map) map.setView([c.centerLat, c.centerLon], CONFIG.studyArea.defaultZoom - 2, { animate: false });
    tourCaption('Today\'s Mars maps are global. Astronauts will walk a few kilometres.', 'Gale Crater, Mars · global basemap: NASA Viking + MOLA');
    if (!(await tourWait(TOUR_STEP_MS))) return;

    map.flyTo([c.centerLat, c.centerLon], CONFIG.studyArea.defaultZoom + 0.5, { duration: 2.5 });
    toggleLayer('traverse', true);
    tourCaption('MarsWalk zooms to walking scale: Curiosity\'s real 2025 boxwork route on Mount Sharp.',
      TOUR_VIDEO && STATE.validation
        ? `25 cm HiRISE images · 1 m terrain matches the rover's own heights to ${STATE.validation.rmsAfterOffsetM.toFixed(1)} m`
        : '25 cm HiRISE images · 1 m HiRISE terrain · rover path from NASA/JPL');
    if (!(await tourWait(TOUR_STEP_MS))) return;

    if (!TOUR_VIDEO) {
      tourCaption(STATE.validation
        ? `Our terrain matches the heights Curiosity itself measured at ${STATE.validation.n} stops, within ${STATE.validation.rmsAfterOffsetM.toFixed(1)} m.`
        : 'Our terrain is checked against the heights Curiosity itself measured.', 'Validation: HiRISE DTM vs MSL waypoint elevations');
      if (!(await tourWait(TOUR_STEP_MS))) return;
    }

    const t = STATE.targets[TOUR_TARGET_INDEX];
    selectTarget(t);
    tourCaption(`Pick a science target: ${t.properties.name}, where Curiosity drilled a ridge and a hollow.`, 'Real rover position on the drill sols');
    await tourWaitRoute();
    if (!(await tourWait(TOUR_STEP_MS))) return;

    if (!TOUR_VIDEO) {
      toggleLayer('relief', true);
      tourCaption(`It finds the fastest safe walk: ${(STATE.route.distanceMeters / 1000).toFixed(2)} km, never steeper than ${STATE.slopeLimitDeg}°, slowing on rocky ground.`,
        'Slope + 1 m rock & ridge relief from the HiRISE terrain model');
      if (!(await tourWait(TOUR_STEP_MS))) return;
      toggleLayer('relief', false);
    }

    const cons = STATE.consumables;
    tourCaption(cons
      ? `It checks the crew: ${Math.round(cons.kcal)} kcal, ${cons.o2Kg.toFixed(2)} kg of oxygen, cooling water, radiation, daylight and the turn-back point.`
      : 'It checks oxygen, cooling water, radiation, daylight and the turn-back point.',
      'Walking energy: Pandolf 1977 at Mars gravity · radiation: Curiosity RAD · weather: REMS');
    if (!(await tourWait(TOUR_STEP_MS))) return;

    _tour.el.classList.add('tour-bottom');
    if (typeof showBrief === 'function') showBrief();
    tourCaption('One click prints the EVA cue card: timeline, stations, oxygen left, GO / NO-GO.', 'Uses today\'s real Mars time (Mars24 algorithm)');
    if (!(await tourWait(TOUR_STEP_MS))) return;
    const bm = document.getElementById('brief-modal');
    if (bm) bm.remove();
    _tour.el.classList.remove('tour-bottom');

    const hudBtn = document.querySelector('#top-bar .hud-toggle');
    if (hudBtn) {
      hudBtn.click();
      await tourWait(300);
      const sel = document.querySelector('.hud-overlay select');
      if (sel) { sel.value = sel.options[sel.options.length - 1].value; sel.dispatchEvent(new Event('change')); }
      const play = [...document.querySelectorAll('.hud-overlay button')].find(b => b.textContent.trim() === 'Play');
      if (play) play.click();
    }
    tourCaption('Then the crew walks it, with a visor HUD that counts down time, oxygen and the way home.', 'Simulated replay of the planned route');
    if (!(await tourWait(TOUR_VIDEO ? 4500 : TOUR_STEP_MS + 2500))) return;
    if (typeof hudClose === 'function') hudClose();

    const t3dBtn = [...document.querySelectorAll('#top-bar button')].find(b => /3D/.test(b.textContent));
    if (t3dBtn) {
      t3dBtn.click();
      tourCaption('…and rehearses it on the real terrain in 3D, at eye level, before ever leaving the habitat.',
        'HiRISE 1 m terrain + 25 cm image · vertical exaggeration 1.5× (labelled)');
      for (let i = 0; i < 60; i++) {
        const fly = document.querySelector('[data-t3d="fly"]');
        // wait past the 3D view's first overlay refresh (it resets the camera to orbit), then fly
        if (fly && !fly.disabled) { await tourWait(700); fly.click(); break; }
        if (!(await tourWait(150))) return;
      }
      if (!(await tourWait(TOUR_VIDEO ? 5000 : TOUR_STEP_MS + 3000))) return;
      if (typeof t3dClose === 'function') t3dClose();
    }

    tourCaption('MarsWalk: plan it, brief it, walk it. Works offline, because Mars has no internet.', 'NASA Space Apps 2026 · Dark Matter Devs');
    await tourWait(TOUR_VIDEO ? 3500 : TOUR_STEP_MS);
  } finally {
    stopTour();
  }
}

/* Stops the tour, closes anything it opened, removes the caption. */
function stopTour() {
  if (!_tour) return;
  _tour.stopped = true;
  document.removeEventListener('keydown', tourEsc);
  if (typeof hudClose === 'function' && document.body.classList.contains('hud-active')) hudClose();
  if (typeof t3dClose === 'function') { try { t3dClose(); } catch (e) { /* not open */ } }
  const bm = document.getElementById('brief-modal');
  if (bm) bm.remove();
  _tour.el.remove();
  _tour = null;
}

function tourEsc(e) { if (e.key === 'Escape') stopTour(); }

/* Adds the "▶ Tour" button to the top bar. Call once. */
function initTour() {
  const bar = document.getElementById('top-bar');
  if (!bar || document.getElementById('btn-tour')) return;
  const b = document.createElement('button');
  b.id = 'btn-tour';
  b.textContent = '▶ Tour';
  b.title = 'Guided 45-second walkthrough with captions';
  b.addEventListener('click', runTour);
  bar.insertBefore(b, bar.querySelector('#btn-how-to-use'));
}

/* Adds a third chart to the bottom bar: today's sun elevation at the site with the EVA window shaded. */
function initSunChart() {
  if (typeof drawSunChart !== 'function') return;
  const bar = document.getElementById('bottom-bar');
  const temp = document.getElementById('temperature-chart-slot');
  if (!bar || !temp || document.getElementById('sun-chart-slot')) return;
  const slot = document.createElement('div');
  slot.className = 'chart-slot';
  slot.id = 'sun-chart-slot';
  slot.setAttribute('aria-label', 'Sun elevation today');
  const cv = document.createElement('canvas');
  cv.id = 'sun-canvas';
  slot.appendChild(cv);
  temp.after(slot);
  const draw = () => { try { drawSunChart('sun-canvas', STATE.evaStartHour, STATE.evaHours); } catch (e) { console.warn('[sun]', e); } };
  setTimeout(draw, 150);
  ['eva-start-slider', 'eva-hours-slider'].forEach(id => {
    const s = document.getElementById(id);
    if (s) s.addEventListener('input', () => setTimeout(draw, 50));
  });
  window.addEventListener('resize', () => setTimeout(draw, 100));
  setInterval(draw, 60000);
}
