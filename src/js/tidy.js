/* tidy.js — Reorganises the screen so it is easy to read. Adds no features and removes none.
   Depends on: every other script having built its part of the page (call initTidy() LAST in main.js).
   Styles: css/tidy.css.

   What it does:
     1. TOP BAR  : keeps the main actions visible (Tour, EVA cue card, 3D terrain, Visor HUD) and moves the
                   rest (How to Use, About & Sources, Assumptions, Reload example, Install, Offline pack)
                   into one "Menu" button.
     2. LEFT PANEL: two tabs.
                   "Mission"   = science goal, chosen target, and the planning tools as fold-out sections.
                   "Locations" = every place in one tab, grouped: our science targets, the NASA landing
                                 sites, then the Mars location library sorted by kind of terrain.
     3. LAYERS   : the layer switches are grouped (Imagery / Terrain & safety / Reference).

   It only MOVES existing elements, so every button keeps the click behaviour its own script gave it. */

/* Top-bar buttons that go inside the Menu (by id). Buttons with class .app-btn (Install, Offline pack) go too. */
const TIDY_MENU_BUTTON_IDS = ['btn-how-to-use', 'btn-about', 'btn-assumptions', 'btn-reload'];

/* Left-panel section titles that start folded shut (everything else starts open). */
const TIDY_CLOSED_SECTIONS = [/mission tools/i, /multi-stop/i];

/* Library groups, checked in order: the first rule whose pattern matches the location's type wins. */
const TIDY_LIBRARY_GROUPS = [
  { title: 'Volcanoes & lava plains',   match: /volcan/i },
  { title: 'Canyons, channels & chaos', match: /canyon|channel|valley|fracture|chaotic/i },
  { title: 'Craters, basins & lakes',   match: /crater|basin|delta|mound/i },
  { title: 'Ice & polar regions',       match: /polar|ice|glaci/i },
  { title: 'Highlands & mountains',     match: /highland|plateau|mountain/i },
  { title: 'Plains & lowlands',         match: /plain/i },
  { title: 'Other places',              match: /./ }
];

/* Layer switches by group. Any layer id not listed lands in the last group. */
const TIDY_LAYER_GROUPS = [
  { title: 'Imagery',          ids: ['hirise', 'opm', 'themisDay', 'themisNight'] },
  { title: 'Terrain & safety', ids: ['slope', 'relief', 'walkback', 'los', 'rad'] },
  { title: 'Reference',        ids: ['sites', 'traverse', 'grid'] }
];

/* Makes a fold-out section (<details>) with a title and an optional count badge. Returns { box, body }. */
function _tidySection(titleText, open, count) {
  const box = document.createElement('details');
  box.className = 'tidy-section';
  box.open = !!open;
  const summary = document.createElement('summary');
  const title = document.createElement('span');
  title.className = 'tidy-section-title';
  title.textContent = titleText;
  summary.appendChild(title);
  if (count !== undefined && count !== null) {
    const badge = document.createElement('span');
    badge.className = 'tidy-count';
    badge.textContent = String(count);
    summary.appendChild(badge);
  }
  box.appendChild(summary);
  const body = document.createElement('div');
  body.className = 'tidy-section-body';
  box.appendChild(body);
  return { box, body };
}

/* ── 1. Top bar ─────────────────────────────────────────────────────────── */

/* Builds the Menu button once and moves the secondary buttons into it. Safe to call again. */
function tidyTopBar() {
  const bar = document.getElementById('top-bar');
  if (!bar) return;

  let menu = document.getElementById('tidy-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'tidy-menu';
    menu.className = 'tidy-menu';
    const toggle = document.createElement('button');
    toggle.id = 'btn-menu';
    toggle.textContent = '☰ Menu';
    toggle.setAttribute('aria-haspopup', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.title = 'How to use, sources, assumptions, reload example, offline options';
    const list = document.createElement('div');
    list.id = 'tidy-menu-list';
    list.className = 'tidy-menu-list';
    list.hidden = true;
    menu.appendChild(toggle);
    menu.appendChild(list);
    bar.appendChild(menu);

    const setOpen = (open) => { list.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); };
    toggle.addEventListener('click', e => { e.stopPropagation(); setOpen(list.hidden); });
    list.addEventListener('click', () => setOpen(false));               // picking an item closes the menu
    document.addEventListener('click', e => { if (!menu.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  const list = document.getElementById('tidy-menu-list');
  TIDY_MENU_BUTTON_IDS.forEach(id => {
    const btn = document.getElementById(id);
    if (btn && btn.parentElement !== list) list.appendChild(btn);
  });
  bar.querySelectorAll('.app-actions .app-btn').forEach(btn => list.appendChild(btn));
}

/* ── 2. Left panel ──────────────────────────────────────────────────────── */

/* Shows one tab ('mission' or 'locations') and hides the other. */
function tidyShowTab(name) {
  document.querySelectorAll('.tidy-tab').forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll('.tidy-pane').forEach(p => { p.hidden = p.dataset.tab !== name; });
}

/* Puts one existing left-panel block into the Mission tab as a fold-out section.
   headingEl = the block's .panel-heading; contentEls = the elements that belong under it. */
function _tidyAdoptSection(pane, headingEl, contentEls) {
  const titleText = (headingEl.childNodes[0] ? headingEl.childNodes[0].textContent : headingEl.textContent).trim();
  const open = !TIDY_CLOSED_SECTIONS.some(rx => rx.test(titleText));
  const section = _tidySection(titleText, open);
  // keep small extras that sat inside the heading, e.g. the "[our assumptions]" tag
  [...headingEl.children].forEach(extra => section.box.querySelector('summary').appendChild(extra));
  contentEls.forEach(el => section.body.appendChild(el));
  headingEl.remove();
  pane.appendChild(section.box);
}

/* Sorts the 52 library cards into terrain groups (cards are moved, so their click handlers survive). */
function _tidyGroupLibrary(library) {
  const cards = [...library.querySelectorAll(':scope > .loc-card')];
  if (!cards.length) return;
  const buckets = TIDY_LIBRARY_GROUPS.map(g => ({ group: g, cards: [] }));
  cards.forEach(card => {
    const typeEl = card.querySelector('.loc-card-type');
    const type = typeEl ? typeEl.textContent : '';
    buckets.find(b => b.group.match.test(type)).cards.push(card);
  });
  buckets.filter(b => b.cards.length).forEach(b => {
    const section = _tidySection(b.group.title, false, b.cards.length);
    section.box.classList.add('tidy-sub');
    b.cards.forEach(card => section.body.appendChild(card));
    library.appendChild(section.box);
  });
}

/* Fills the "NASA landing sites" group from the explored-sites layer (landing-sites.js).
   Clicking a row flies the map to that site. Returns true once filled. */
function _tidyFillLandingSites() {
  const body = document.getElementById('tidy-sites-body');
  if (!body || body.childElementCount || !STATE.landingSites || !STATE.landingSites.length) return !!(body && body.childElementCount);
  STATE.landingSites.forEach(entry => {
    const row = document.createElement('button');
    row.className = 'tidy-site-row';
    const name = document.createElement('span');
    name.className = 'tidy-site-name';
    name.textContent = entry.site.name;
    const meta = document.createElement('span');
    meta.className = 'tidy-site-meta';
    meta.textContent = entry.site.kind + ' · landed ' + entry.site.landed;
    row.appendChild(name);
    row.appendChild(meta);
    row.title = entry.site.siteName + '. Click to view the site on the map.';
    row.addEventListener('click', () => { if (STATE.map) STATE.map.fitBounds(entry.bounds, { maxZoom: 15 }); });
    body.appendChild(row);
  });
  const badge = document.querySelector('#tidy-sites .tidy-count');
  if (badge) badge.textContent = String(STATE.landingSites.length);
  return true;
}

/* Updates the "Target" line on the Mission tab with the currently selected science target. */
function tidyRefreshTargetLine() {
  const el = document.getElementById('tidy-target-name');
  if (!el) return;
  const t = STATE.selectedTarget;
  const name = t && t.properties ? (t.properties.name || t.properties.shortName) : null;
  el.textContent = name || 'None yet';
  el.classList.toggle('none', !name);
}

/* Builds the two tabs and moves every existing left-panel block into the right place. Runs once. */
function tidyLeftPanel() {
  const panel = document.getElementById('left-panel');
  if (!panel || document.getElementById('tidy-tabs')) return;
  const original = [...panel.children];

  const tabs = document.createElement('div');
  tabs.id = 'tidy-tabs';
  tabs.className = 'tidy-tabs';
  tabs.setAttribute('role', 'tablist');
  const missionPane = document.createElement('div');
  const locationsPane = document.createElement('div');
  [['mission', 'Mission', missionPane], ['locations', 'Locations', locationsPane]].forEach(([key, label, pane]) => {
    const tab = document.createElement('button');
    tab.className = 'tidy-tab';
    tab.dataset.tab = key;
    tab.textContent = label;
    tab.setAttribute('role', 'tab');
    tab.addEventListener('click', () => tidyShowTab(key));
    tabs.appendChild(tab);
    pane.className = 'tidy-pane';
    pane.dataset.tab = key;
    pane.setAttribute('role', 'tabpanel');
  });

  // Pull out the pieces that belong to the Locations tab
  const targetsList = document.getElementById('science-targets-list');
  const searchWrap  = document.getElementById('lib-search-wrap');
  const library     = document.getElementById('location-library');
  const locationPieces = new Set([targetsList, searchWrap, library]);
  original.forEach(el => {
    const text = el.textContent.trim();
    if (el.classList.contains('panel-heading') && /^(science targets|mars locations)/i.test(text)) locationPieces.add(el);
    if (el.tagName === 'P' && el.previousElementSibling === searchWrap) locationPieces.add(el);   // old hint line
  });

  // Mission tab: science goal stays as plain text on top, then the chosen target, then fold-out tools
  const goal = panel.querySelector(':scope > .science-goal-desc');
  if (goal) {
    const goalHeading = goal.previousElementSibling;
    if (goalHeading && goalHeading.classList.contains('panel-heading')) { missionPane.appendChild(goalHeading); locationPieces.delete(goalHeading); }
    missionPane.appendChild(goal);
  }
  const targetLine = document.createElement('div');
  targetLine.className = 'tidy-target-line';
  const targetLabel = document.createElement('span');
  targetLabel.className = 'tidy-target-label';
  targetLabel.textContent = 'Target';
  const targetName = document.createElement('span');
  targetName.id = 'tidy-target-name';
  targetName.className = 'tidy-target-name none';
  targetName.textContent = 'None yet';
  const choose = document.createElement('button');
  choose.className = 'tidy-choose-btn';
  choose.textContent = 'Choose →';
  choose.title = 'Open the Locations tab to pick a science target (or click a numbered marker on the map)';
  choose.addEventListener('click', () => tidyShowTab('locations'));
  targetLine.appendChild(targetLabel);
  targetLine.appendChild(targetName);
  targetLine.appendChild(choose);
  missionPane.appendChild(targetLine);

  // Everything else that was in the panel becomes a fold-out section on the Mission tab
  let i = 0;
  while (i < original.length) {
    const el = original[i];
    if (locationPieces.has(el) || el.parentElement !== panel) { i++; continue; }
    if (el.classList.contains('panel-heading')) {
      const content = [];
      let j = i + 1;
      while (j < original.length && !original[j].classList.contains('panel-heading')
             && !locationPieces.has(original[j]) && !_tidyIsToolBox(original[j])) { content.push(original[j]); j++; }
      _tidyAdoptSection(missionPane, el, content);
      i = j;
    } else if (_tidyIsToolBox(el)) {
      _tidyAdoptSection(missionPane, el.querySelector(':scope > .panel-heading'), [el]);
      i++;
    } else {
      missionPane.appendChild(el);
      i++;
    }
  }

  // Locations tab: search on top, then the groups
  if (searchWrap) locationsPane.appendChild(searchWrap);

  const ours = _tidySection('Our study area: science targets', true,
    targetsList ? targetsList.querySelectorAll('.target-card').length : undefined);
  ours.box.classList.add('tidy-group-ours');
  const oursHint = document.createElement('p');
  oursHint.className = 'tidy-hint';
  oursHint.textContent = 'Gale Crater, Mount Sharp. Click a card to plan a route to it.';
  ours.body.appendChild(oursHint);
  if (targetsList) ours.body.appendChild(targetsList);
  locationsPane.appendChild(ours.box);

  const sites = _tidySection('Extra sites explored by NASA', false, '');
  sites.box.id = 'tidy-sites';
  sites.body.id = 'tidy-sites-body';
  const sitesHint = document.createElement('p');
  sitesHint.className = 'tidy-hint';
  sitesHint.textContent = 'Blue borders on the map. Sharp orbital photos, no route planning.';
  sites.box.insertBefore(sitesHint, sites.body);
  locationsPane.appendChild(sites.box);

  if (library) {
    const lib = _tidySection('Mars location library', false, library.querySelectorAll('.loc-card').length);
    const libHint = document.createElement('p');
    libHint.className = 'tidy-hint';
    libHint.textContent = 'Reference places on the global map, sorted by kind of terrain.';
    lib.body.appendChild(libHint);
    _tidyGroupLibrary(library);
    lib.body.appendChild(library);
    locationsPane.appendChild(lib.box);
  }

  // Anything left over from the old layout (old headings, old hint line) is no longer needed
  locationPieces.forEach(el => { if (el && el.parentElement === panel) el.remove(); });

  panel.appendChild(tabs);
  panel.appendChild(missionPane);
  panel.appendChild(locationsPane);
  tidyShowTab('mission');

  // Search results call expandLibraryCard(id): make sure the tab and the card's group are open first
  if (typeof window.expandLibraryCard === 'function' && !window.expandLibraryCard._tidy) {
    const originalExpand = window.expandLibraryCard;
    window.expandLibraryCard = function(id) {
      tidyShowTab('locations');
      const card = [...document.querySelectorAll('.loc-card')].find(c => c.dataset.id === id);
      for (let el = card; el; el = el.parentElement) if (el.tagName === 'DETAILS') el.open = true;
      return originalExpand(id);
    };
    window.expandLibraryCard._tidy = true;
  }
}

/* True for the self-contained tool boxes other scripts add (a div whose first child is its own heading). */
function _tidyIsToolBox(el) {
  return !!(el && el.firstElementChild && el.firstElementChild.classList.contains('panel-heading'));
}

/* ── 3. Layer panel ─────────────────────────────────────────────────────── */

/* Regroups the layer switches under three headings. Each switch row keeps its opacity slider row. */
function tidyLayerPanel() {
  const panel = document.getElementById('layer-panel-content');
  if (!panel || panel.querySelector('.tidy-layer-title')) return;
  const rows = {};
  panel.querySelectorAll(':scope > .layer-row').forEach(row => {
    const box = row.querySelector('input[data-layer-id]');
    if (box) rows[box.dataset.layerId] = [row, row.nextElementSibling && row.nextElementSibling.classList.contains('layer-opacity-row') ? row.nextElementSibling : null];
  });
  const anchor = panel.querySelector(':scope > .layer-row');   // groups are inserted where the first switch was
  if (!anchor) return;
  const marker = document.createComment('layers');
  panel.insertBefore(marker, anchor);

  const listed = new Set(TIDY_LAYER_GROUPS.flatMap(g => g.ids));
  const extras = Object.keys(rows).filter(id => !listed.has(id));
  TIDY_LAYER_GROUPS.forEach((group, index) => {
    const ids = group.ids.concat(index === TIDY_LAYER_GROUPS.length - 1 ? extras : []).filter(id => rows[id]);
    if (!ids.length) return;
    const title = document.createElement('div');
    title.className = 'tidy-layer-title';
    title.textContent = group.title;
    panel.insertBefore(title, marker);
    ids.forEach(id => rows[id].forEach(el => { if (el) panel.insertBefore(el, marker); }));
  });
  marker.remove();
}

/* ── Start ──────────────────────────────────────────────────────────────── */

/* Runs the three clean-ups. Call once, after every other init in main.js. */
function initTidy() {
  document.body.classList.add('tidy');
  tidyTopBar();
  tidyLeftPanel();
  tidyLayerPanel();

  // Landing sites load from their own file a moment later: fill that group when they arrive
  let tries = 0;
  const timer = setInterval(() => { if (_tidyFillLandingSites() || ++tries > 40) clearInterval(timer); }, 250);

  // Keep the "Target" line in step with whatever the user picks (card, map marker, tour, reload)
  tidyRefreshTargetLine();
  setInterval(tidyRefreshTargetLine, 500);
  console.log('[tidy] layout organised');
}
