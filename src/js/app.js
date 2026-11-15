/* app.js — Turns MarsWalk into an installable, offline-capable app.
   - Boot sequence screen that reports the REAL loading steps (grids, targets, route engine, validation)
   - Service worker registration (sw.js) so the app runs with no network
   - "Install app" button (browser install prompt) and "Offline pack" download (all HiRISE tiles)
   - Link status pill: ONLINE / OFFLINE (EARTH LINK LOST) — the planner keeps working either way
   Depends on: state.js (STATE). Must load before main.js; bootStart() runs immediately. */

const APP_BOOT_TIMEOUT_MS = 9000;   // hide the boot screen even if a step stalls
const APP_BOOT_POLL_MS = 120;

/* Builds the boot overlay and starts polling STATE for each loading step. */
function bootStart() {
  const el = document.createElement('div');
  el.id = 'boot';
  el.className = 'boot';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <div class="boot-inner">
      <img class="boot-logo" src="./icons/icon-192.png" alt="">
      <div class="boot-title">MARSWALK <span>EVA PLANNER</span></div>
      <div class="boot-sub">Boxwork site · Mount Sharp · Gale Crater · 4.81°S 137.37°E</div>
      <ol class="boot-steps"></ol>
      <div class="boot-bar"><div class="boot-fill"></div></div>
      <button class="boot-skip" type="button">Enter</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('.boot-skip').addEventListener('click', bootFinish);

  const steps = [
    { label: 'HiRISE 1 m terrain model → 160,000 route cells', done: () => STATE.grids && STATE.grids.loaded },
    { label: 'Science targets at Curiosity drill sites', done: () => STATE.targets && STATE.targets.length > 0 },
    { label: 'Curiosity traverse (NASA/JPL MMGIS)', done: () => !!(STATE.curiosity && STATE.curiosity.waypoints) },
    { label: 'Terrain check vs rover elevations', done: () => !!STATE.validation,
      detail: () => STATE.validation ? `${STATE.validation.n} waypoints · ${STATE.validation.rmsAfterOffsetM.toFixed(1)} m RMS` : '' },
    { label: 'RAD radiation + REMS weather baselines', done: () => !!STATE.radBaseline },
    { label: 'Walk-back time field (Dijkstra)', done: () => STATE.walkback && STATE.walkback.status === 'ready' }
  ];
  const list = el.querySelector('.boot-steps');
  steps.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="boot-dot"></span><span class="boot-label"></span><span class="boot-detail"></span>';
    li.querySelector('.boot-label').textContent = s.label;
    list.appendChild(li);
    s.li = li;
  });

  const t0 = performance.now();
  const timer = setInterval(() => {
    let n = 0;
    steps.forEach(s => {
      let ok = false;
      try { ok = s.done(); } catch (e) { ok = false; }
      if (ok) {
        n++;
        if (!s.li.classList.contains('ok')) {
          s.li.classList.add('ok');
          if (s.detail) s.li.querySelector('.boot-detail').textContent = s.detail();
        }
      }
    });
    el.querySelector('.boot-fill').style.width = Math.round(n / steps.length * 100) + '%';
    if (n === steps.length || performance.now() - t0 > APP_BOOT_TIMEOUT_MS) {
      clearInterval(timer);
      setTimeout(bootFinish, n === steps.length ? 650 : 0);
    }
  }, APP_BOOT_POLL_MS);
}

/* Fades the boot overlay out and removes it, then shows the welcome card on first visit. */
function bootFinish() {
  const el = document.getElementById('boot');
  if (!el || el.classList.contains('boot-out')) return;
  el.classList.add('boot-out');
  setTimeout(() => { el.remove(); showWelcome(); }, 500);
}

/* First-visit welcome card: three-line pitch + "Take the tour" / "Explore". Remembered per browser. */
function showWelcome() {
  let seen = false;
  try { seen = localStorage.getItem('marswalk-welcome') === '1'; } catch (e) { seen = false; }
  if (seen || /[?&]video=1/.test(location.search) || document.getElementById('welcome')) return;
  const card = document.createElement('div');
  card.id = 'welcome';
  card.className = 'welcome';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Welcome to MarsWalk');
  card.innerHTML = `
    <figure class="welcome-hero">
      <img src="./data/pov/pov-3-nevado-sajama.jpg" alt="Curiosity Mastcam photo of cemented boxwork ridge rock at Nevado Sajama, Mount Sharp" width="1024" height="913">
      <figcaption>Boxwork ridge rock at Nevado Sajama, photographed by Curiosity's Mastcam on sol 4711 (Nov 2025). Credit: NASA/JPL-Caltech/MSSS</figcaption>
    </figure>
    <div class="welcome-kicker">WELCOME, EVA PLANNER</div>
    <div class="welcome-title">Plan a safe Marswalk on Curiosity's real route</div>
    <ol class="welcome-steps">
      <li><b>Pick a science target</b>: places where Curiosity drilled and surveyed on Mount Sharp, plus one ridge field no rover has visited.</li>
      <li><b>Read the plan</b>: safest route, oxygen, radiation, daylight, turn-back point.</li>
      <li><b>Brief &amp; walk it</b>: print the EVA cue card, replay it in the visor HUD or in 3D.</li>
    </ol>
    <p class="welcome-note">Built with public NASA data and images for NASA Space Apps 2026. Not affiliated with or endorsed by NASA.</p>
    <div class="welcome-actions">
      <button type="button" class="welcome-tour"><svg class="icon" aria-hidden="true"><use href="#icon-play"/></svg> Take the 45-second tour</button>
      <button type="button" class="welcome-close">Explore on my own</button>
    </div>`;
  document.body.appendChild(card);
  const done = () => { try { localStorage.setItem('marswalk-welcome', '1'); } catch (e) { /* private mode */ } card.remove(); };
  card.querySelector('.welcome-close').addEventListener('click', done);
  card.querySelector('.welcome-tour').addEventListener('click', () => { done(); if (typeof runTour === 'function') runTour(); });
}

/* Registers the service worker and wires install / offline-pack buttons into the top bar. */
function initAppShell() {
  const bar = document.getElementById('top-bar');
  const group = document.createElement('div');
  group.className = 'app-actions';


  const installBtn = document.createElement('button');
  installBtn.className = 'app-btn';
  installBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-download"/></svg> Install app';
  installBtn.hidden = true;
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; installBtn.hidden = false; });
  installBtn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => { installBtn.hidden = true; });
  group.appendChild(installBtn);

  const packBtn = document.createElement('button');
  packBtn.className = 'app-btn';
  packBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-download"/></svg> Offline pack';
  packBtn.title = 'Store every HiRISE map tile (≈13 MB) on this device so the whole map works with no network.';
  group.appendChild(packBtn);

  if (bar) bar.insertBefore(group, bar.querySelector('button'));

  if (!('serviceWorker' in navigator)) { packBtn.hidden = true; return; }
  navigator.serviceWorker.register('./sw.js').then(reg => {
    packBtn.addEventListener('click', () => {
      const target = navigator.serviceWorker.controller || reg.active;
      if (!target) { packBtn.textContent = 'Reload once, then retry'; return; }
      packBtn.disabled = true;
      packBtn.textContent = 'Downloading… 0%';
      target.postMessage({ type: 'download-offline-pack' });
    });
  }).catch(err => console.warn('[app] service worker failed:', err));

  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data.type === 'offline-pack-progress') {
      packBtn.textContent = `Downloading… ${Math.round(e.data.done / e.data.total * 100)}%`;
    } else if (e.data.type === 'offline-pack-done') {
      packBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-check"/></svg> Offline ready (' + Number(e.data.total) + ' tiles)';
    }
  });
}

/* Small-screen notice: dismiss button hides the overlay for this session. */
(function () {
  const dismiss = () => {
    const el = document.getElementById('small-screen-notice');
    if (el) el.style.display = 'none';
  };
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-small-screen-dismiss');
    if (btn) btn.addEventListener('click', dismiss);
  });
}());

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootStart);
else bootStart();
