/* search.js - Mars location directory, search bar, and location library panel.
   The list is deliberately short: our EVA study area plus the ten successful Mars landing sites.
   Landing coordinates are the published landing positions as tabulated in Wikipedia's
   "List of artificial objects on Mars" (rows cite the missions' own sources), checked Nov 2026.
   Longitudes stored as -180 to +180 (east positive) to match Leaflet. No invented safety ratings:
   EVA planning (route, slope, safety) only exists for the Gale study area. */

const MARS_LOCATIONS = [
  {
    id: 'marswalk-study-area', name: 'MarsWalk study area: boxwork ridges', type: 'EVA study area (Gale Crater)',
    lat: -4.808, lon: 137.372, zoom: 14, isStudyArea: true,
    description: "4 km x 4 km box on Mount Sharp containing Curiosity's 2025-2026 boxwork route. The only place where MarsWalk plans routes (HiRISE 1 m terrain).",
    missions: 'MSL/Curiosity (boxwork campaign 2025-2026)',
    source: 'Curiosity traverse: NASA/JPL-Caltech MMGIS; terrain: HiRISE DTM DTEEC_019698_1750_019988_1750_U01'
  },
  {
    id: 'curiosity-landing', name: 'Bradbury Landing (Curiosity)', type: 'Landing site, Gale Crater',
    lat: -4.589, lon: 137.442, zoom: 11, isStudyArea: false,
    description: 'Curiosity landed here in August 2012 and has since driven south and up the lower slopes of Mount Sharp.',
    missions: 'Mars Science Laboratory / Curiosity (2012-present)',
    source: 'Landing coordinates: List of artificial objects on Mars (Wikipedia, NASA-sourced)'
  },
  {
    id: 'perseverance-landing', name: 'Octavia E. Butler Landing (Perseverance)', type: 'Landing site, Jezero Crater',
    lat: 18.446, lon: 77.451, zoom: 11, isStudyArea: false,
    description: 'Perseverance landed in Jezero Crater, an ancient lake basin with a river delta, in February 2021 and has been collecting rock cores.',
    missions: 'Mars 2020 / Perseverance (2021-present)',
    source: 'Landing coordinates: List of artificial objects on Mars (Wikipedia, NASA-sourced)'
  },
  {
    id: 'zhurong-landing', name: 'Zhurong landing site', type: 'Landing site, Utopia Planitia',
    lat: 25.1, lon: 109.9, zoom: 10, isStudyArea: false,
    description: "China's Tianwen-1 lander set down the Zhurong rover in southern Utopia Planitia in May 2021.",
    missions: 'Tianwen-1 / Zhurong (CNSA, 2021-2022)',
    source: 'Landing coordinates: List of artificial objects on Mars (Wikipedia)'
  },
  {
    id: 'insight-landing', name: 'InSight landing site', type: 'Landing site, Elysium Planitia',
    lat: 4.503, lon: 135.623, zoom: 11, isStudyArea: false,
    description: 'The InSight lander measured marsquakes here from 2018 to 2022, on a flat, smooth plain chosen for a safe landing.',
    missions: 'InSight (2018-2022)',
    source: 'Landing coordinates: List of artificial objects on Mars (Wikipedia, NASA-sourced)'
  },
  {
    id: 'phoenix-landing', name: 'Phoenix landing site', type: 'Landing site, northern plains',
    lat: 68.217, lon: -125.7, zoom: 10, isStudyArea: false,
    description: 'Phoenix dug into the arctic plains in 2008 and found water ice a few centimetres below the surface.',
    missions: 'Phoenix (2008)',
    source: 'Landing coordinates: List of artificial objects on Mars (Wikipedia, NASA-sourced)'
  },
  {
    id: 'opportunity-landing', name: 'Challenger Memorial Station (Opportunity)', type: 'Landing site, Meridiani Planum',
    lat: -1.946, lon: -5.527, zoom: 11, isStudyArea: false,
    description: 'Opportunity landed in Eagle crater in January 2004 and drove about 45 km across Meridiani Planum, finding rocks that formed in water.',
    missions: 'MER-B / Opportunity (2004-2018)',
    source: 'Landing coordinates: List of artificial objects on Mars (Wikipedia, NASA-sourced)'
  },
  {
    id: 'spirit-landing', name: 'Columbia Memorial Station (Spirit)', type: 'Landing site, Gusev Crater',
    lat: -14.572, lon: 175.479, zoom: 11, isStudyArea: false,
    description: 'Spirit landed in Gusev Crater in January 2004 and explored the Columbia Hills until 2010.',
    missions: 'MER-A / Spirit (2004-2010)',
    source: 'Landing coordinates: List of artificial objects on Mars (Wikipedia, NASA-sourced)'
  },
  {
    id: 'pathfinder-landing', name: 'Carl Sagan Memorial Station (Pathfinder)', type: 'Landing site, Ares Vallis',
    lat: 19.333, lon: -33.55, zoom: 10, isStudyArea: false,
    description: 'Mars Pathfinder and the first Mars rover, Sojourner, landed at the mouth of the Ares Vallis outflow channel in 1997.',
    missions: 'Mars Pathfinder / Sojourner (1997)',
    source: 'Landing coordinates: List of artificial objects on Mars (Wikipedia, NASA-sourced)'
  },
  {
    id: 'viking2-landing', name: 'Viking 2 landing site', type: 'Landing site, Utopia Planitia',
    lat: 48.269, lon: 134.01, zoom: 10, isStudyArea: false,
    description: 'Viking 2 landed on the northern plains of Utopia Planitia in 1976 and photographed frost on the ground in winter.',
    missions: 'Viking 2 (1976-1980)',
    source: 'Landing coordinates: List of artificial objects on Mars (Wikipedia, NASA-sourced)'
  },
  {
    id: 'viking1-landing', name: 'Thomas Mutch Memorial Station (Viking 1)', type: 'Landing site, Chryse Planitia',
    lat: 22.697, lon: -48.222, zoom: 10, isStudyArea: false,
    description: 'Viking 1 landed on the plains of Chryse Planitia in 1976, the first long-lived lander on Mars.',
    missions: 'Viking 1 (1976-1982)',
    source: 'Landing coordinates: List of artificial objects on Mars (Wikipedia, NASA-sourced)'
  }
];

/* ── Search bar ──────────────────────────────────────────────────────── */

let _searchOpen = false;

/* Parses "lat, lon" typed by user. Returns {lat, lon} or null.
   Only numeric output is used in HTML — no raw user string inserted. */
function parseCoordInput(str) {
  const m = str.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function formatCoord(lat, lon) {
  const latS = (lat >= 0 ? lat.toFixed(2) + '°N' : Math.abs(lat).toFixed(2) + '°S');
  const lonS = (lon >= 0 ? lon.toFixed(2) + '°E' : Math.abs(lon).toFixed(2) + '°W');
  return latS + '  ' + lonS;
}

/* Opens the search dropdown, positioned directly below the input element.
   Attaches it to <body> so it is never clipped by any parent overflow or stacking context. */
function openDropdown(input) {
  const rect = input.getBoundingClientRect();
  const dd = document.getElementById('search-dropdown');
  if (!dd) return;
  dd.style.top    = (rect.bottom + 4) + 'px';
  dd.style.left   = rect.left + 'px';
  dd.style.width  = Math.max(rect.width, 320) + 'px';
  dd.classList.add('open');
  _searchOpen = true;
}

function closeDropdown() {
  const dd = document.getElementById('search-dropdown');
  if (dd) dd.classList.remove('open');
  _searchOpen = false;
}

/* Renders filtered location results into the dropdown.
   innerHTML safety: all values come from MARS_LOCATIONS constant or parseFloat().toFixed().
   No raw user input string is ever inserted into HTML. */
function renderResults(query) {
  const dd = document.getElementById('search-dropdown');
  const input = document.getElementById('search-input');
  if (!dd || !input) return;

  const q = query.toLowerCase().trim();
  const coords = q.length > 2 ? parseCoordInput(query) : null;

  const matches = MARS_LOCATIONS.filter(loc =>
    q === '' ||
    loc.name.toLowerCase().includes(q) ||
    loc.type.toLowerCase().includes(q) ||
    (loc.missions && loc.missions.toLowerCase().includes(q))
  );

  let html = '';

  if (coords) {
    const lat = coords.lat.toFixed(4);
    const lon = coords.lon.toFixed(4);
    html += `<div class="search-result" data-lat="${lat}" data-lon="${lon}" data-zoom="13">
      <div class="search-result-name">Fly to coordinates</div>
      <div class="search-result-type">Custom coordinates</div>
      <div class="search-result-coords">${lat}°  ${lon}°E</div>
    </div>`;
  }

  matches.forEach(loc => {
    html += `<div class="search-result" data-id="${loc.id}" data-lat="${loc.lat}" data-lon="${loc.lon}" data-zoom="${loc.zoom}">
      <div class="search-result-name">${loc.name}</div>
      <div class="search-result-type">${loc.type}</div>
      <div class="search-result-coords">${formatCoord(loc.lat, loc.lon)}</div>
    </div>`;
  });

  if (!html) {
    html = '<div style="padding:10px 12px;color:var(--muted);font-size:12px;">No matches. Try "Curiosity", "Jezero", or "-4.81, 137.37".</div>';
  }

  dd.innerHTML = html;
  openDropdown(input);

  // Click handlers
  dd.querySelectorAll('.search-result').forEach(el => {
    el.addEventListener('mousedown', e => {
      e.preventDefault(); // prevent input blur before click fires
      const lat  = parseFloat(el.dataset.lat);
      const lon  = parseFloat(el.dataset.lon);
      const zoom = parseInt(el.dataset.zoom) || 10;
      flyToLocation(lat, lon, zoom);
      const id = el.dataset.id;
      if (id) expandLibraryCard(id);
      closeDropdown();
      const inp = document.getElementById('search-input');
      if (inp) inp.blur();
    });
  });
}

/* ── Map navigation ───────────────────────────────────────────────────── */

function flyToLocation(lat, lon, zoom) {
  if (!STATE.map) return;
  STATE.map.flyTo([lat, lon], zoom, { duration: 1.0 });
}

function expandLibraryCard(id) {
  document.querySelectorAll('.loc-card').forEach(card => {
    const isTarget = card.dataset.id === id;
    if (isTarget && !card.querySelector('.loc-card-body')) {
      // Lazy-inject body before expanding (same logic as the click handler)
      const loc = MARS_LOCATIONS.find(l => l.id === id);
      if (loc) {
        card.insertAdjacentHTML('beforeend', _buildLocCardBody(loc)); // data: MARS_LOCATIONS constant
        const flyBtn = card.querySelector('.loc-fly-btn');
        if (flyBtn) flyBtn.addEventListener('click', e => {
          e.stopPropagation();
          flyToLocation(loc.lat, loc.lon, loc.zoom);
        });
      }
    }
    card.classList.toggle('expanded', isTarget);
    if (isTarget) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/* ── Location library (left panel) ───────────────────────────────────── */

/* Builds the full HTML body for one location card (called lazily on first expand). */
function _buildLocCardBody(loc) {
  return `<div class="loc-card-body">
    <div class="loc-card-desc">${loc.description}</div>
    <div class="loc-card-coords">${formatCoord(loc.lat, loc.lon)}</div>
    <button class="loc-fly-btn" data-id="${loc.id}">Fly to this location →</button>
    ${loc.isStudyArea ? '' : '<div class="loc-note-outside-area">⚠ EVA planning (route, slope, safety) only works for the Gale Crater study area</div>'}
    <div class="loc-missions">${loc.missions}</div>
    <div class="loc-missions" style="font-style:normal;margin-top:2px;">Source: ${loc.source}</div>
  </div>`;
}

/* Renders only the card headers for all locations on startup.
   Card bodies are injected lazily on first expand to keep initial paint fast.
   innerHTML safety: all values from MARS_LOCATIONS constant — no user input. */
function renderLibrary() {
  const container = document.getElementById('location-library');
  if (!container) return;

  container.innerHTML = MARS_LOCATIONS.map(loc =>
    `<div class="loc-card" data-id="${loc.id}">
      <div class="loc-card-header">
        <div class="loc-card-dot ${loc.isStudyArea ? 'safe' : ''}"></div>
        <div class="loc-card-name">${loc.name}</div>
        <div class="loc-card-type">${loc.type}</div>
      </div>
    </div>`
  ).join('');

  container.querySelectorAll('.loc-card-header').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.loc-card');
      const wasExpanded = card.classList.contains('expanded');

      // Lazy-inject body HTML on first expand
      if (!wasExpanded && !card.querySelector('.loc-card-body')) {
        const loc = MARS_LOCATIONS.find(l => l.id === card.dataset.id);
        if (loc) {
          card.insertAdjacentHTML('beforeend', _buildLocCardBody(loc));
          // Wire fly button now that it exists in DOM
          const flyBtn = card.querySelector('.loc-fly-btn');
          if (flyBtn) {
            flyBtn.addEventListener('click', e => {
              e.stopPropagation();
              if (loc) flyToLocation(loc.lat, loc.lon, loc.zoom);
            });
          }
        }
      }

      card.classList.toggle('expanded', !wasExpanded);
      if (!wasExpanded) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

/* ── Init ─────────────────────────────────────────────────────────────── */

function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) { console.warn('[search] #search-input not found'); return; }

  // Move the dropdown to <body> so it's never clipped by parent stacking contexts
  const dd = document.getElementById('search-dropdown');
  if (dd && dd.parentElement !== document.body) {
    document.body.appendChild(dd);
    dd.style.position = 'fixed';
  }

  input.addEventListener('focus', () => {
    renderResults(input.value);
  });

  input.addEventListener('input', () => {
    renderResults(input.value);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeDropdown();
      input.blur();
    }
    if (e.key === 'Enter') {
      const first = document.querySelector('#search-dropdown .search-result');
      if (first) first.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }
  });

  // Close when clicking outside the library search bar or dropdown
  document.addEventListener('click', e => {
    if (!e.target.closest('#lib-search-wrap') && !e.target.closest('#search-dropdown')) {
      closeDropdown();
    }
  });

  renderLibrary();
  console.log('[search] ready:', MARS_LOCATIONS.length, 'locations loaded');
}
