/* search.js — Mars location directory, search bar filter, and map flyTo.
   Coordinates from USGS Gazetteer of Planetary Nomenclature.
   Elevations from MOLA global topography [Smith et al. 2001, JGR 106(E10)].
   Safety notes compiled from published mission data (see docs/SOURCES.md). */

/* ── Location database ────────────────────────────────────────────────── */
const MARS_LOCATIONS = [
  {
    id:        'gale-crater',
    name:      'Gale Crater',
    type:      'Impact Crater',
    lat:       -5.4,
    lon:       137.8,
    zoom:      13,
    elevM:     -4451,          // MOLA [Smith et al. 2001]
    riskLevel: 'caution',      // dot color: safe / caution / danger
    description: 'Site of the Curiosity rover (MSL). Ancient lake sediments and layered rocks record billions of years of Mars climate history. Our primary MarsWalk study area.',
    safetyNotes: [
      { level: 'info', text: 'Radiation baseline measured here: ~233 μGy/day [Hassler et al. 2014, Science]' },
      { level: 'warn', text: 'Sandy dunes in lower crater — potential wheel/mobility hazard for EVA equipment' },
      { level: '',     text: 'Dust devils observed frequently; monitor REMS wind + pressure data' }
    ],
    missions: 'MSL/Curiosity (2012–present)',
    source:    'USGS Gazetteer; MSL mission data'
  },
  {
    id:        'mount-sharp',
    name:      'Mount Sharp (Aeolis Mons)',
    type:      'Sedimentary Mound',
    lat:       -5.08,
    lon:       137.85,
    zoom:      14,
    elevM:     -1500,          // approximate mid-flank elevation [MOLA]
    riskLevel: 'caution',
    description: 'Central mound of Gale Crater, 5.5 km tall above the crater floor. Curiosity is actively climbing layered strata. Each rock layer represents a different epoch of Mars climate.',
    safetyNotes: [
      { level: 'warn', text: 'Steep upper slopes (>20°) — route planning critical; approach only via gradual switchbacks' },
      { level: '',     text: 'Loose sedimentary rock on upper flanks increases slip risk' },
      { level: 'info', text: 'Primary MarsWalk science target. Boxwork formations at ~-4.2°, 137.75°' }
    ],
    missions: 'MSL/Curiosity (actively exploring)',
    source:    'Grotzinger et al. 2015, Science; MOLA'
  },
  {
    id:        'jezero-crater',
    name:      'Jezero Crater',
    type:      'Ancient Lake Delta',
    lat:       18.4,
    lon:       77.7,
    zoom:      13,
    elevM:     -2535,
    riskLevel: 'caution',
    description: 'Site of the Perseverance rover (Mars 2020). An ancient river delta — the highest probability site for preserved biosignatures. Mars Sample Return cache is being assembled here.',
    safetyNotes: [
      { level: '',     text: 'Rocky delta fan — higher boulder density than flat plains; slower EVA traverse expected' },
      { level: 'info', text: 'Perseverance traverse data available for terrain assessment via NASA PDS' },
      { level: 'info', text: 'Equatorial site: radiation environment similar to Gale Crater baseline' }
    ],
    missions: 'Mars 2020/Perseverance (2021–present)',
    source:    'Farley et al. 2020, Space Science Reviews; USGS Gazetteer'
  },
  {
    id:        'olympus-mons',
    name:      'Olympus Mons',
    type:      'Shield Volcano',
    lat:       18.65,
    lon:       226.2,
    zoom:      7,
    elevM:     21229,           // summit [MOLA, Smith et al. 2001]
    riskLevel: 'danger',
    description: 'Largest volcano in the solar system: 624 km across, 21.2 km tall. Caldera alone is 80 km wide. Last erupted within the past 25 million years — geologically very recent.',
    safetyNotes: [
      { level: 'warn', text: 'EXTREME ELEVATION: 21 km — near-vacuum conditions, suit pressure margin critical' },
      { level: 'warn', text: 'Base escarpment 8 km tall — impassable without specialized equipment, no EVA approach possible' },
      { level: '',     text: 'No surface mission data — terrain uncertainty very high' }
    ],
    missions: 'Orbital coverage only (MRO, MEx, TGO)',
    source:    'Plescia 2004, JGR; MOLA Smith et al. 2001'
  },
  {
    id:        'valles-marineris',
    name:      'Valles Marineris',
    type:      'Canyon System',
    lat:       -13.9,
    lon:       300.8,
    zoom:      6,
    elevM:     -8200,           // canyon floor [MOLA]
    riskLevel: 'danger',
    description: 'Largest canyon in the solar system: 4,000 km long, up to 7 km deep. Formed by ancient tectonic rifting. Comparable to the width of the continental US.',
    safetyNotes: [
      { level: 'warn', text: 'Wall heights up to 7 km — catastrophic terrain; strict slope limits essential near rim' },
      { level: 'warn', text: 'Deepest dust accumulations on Mars found in canyon floors — equipment burial risk' },
      { level: '',     text: 'Evidence of ancient landslides and ongoing slope failures (MRO HiRISE data)' }
    ],
    missions: 'No surface missions; MRO/CRISM/HiRISE orbital coverage',
    source:    'Lucchitta et al. 1994; MOLA Smith et al. 2001'
  },
  {
    id:        'hellas-planitia',
    name:      'Hellas Planitia',
    type:      'Impact Basin',
    lat:       -42.4,
    lon:       70.5,
    zoom:      6,
    elevM:     -8200,           // deepest point [MOLA]
    riskLevel: 'caution',
    description: 'Deepest point on Mars, 8.2 km below datum. Highest surface atmospheric pressure on Mars (~1,155 Pa vs ~600 Pa average) — a natural advantage for EVA suit pressure margins.',
    safetyNotes: [
      { level: 'ok',   text: 'HIGHEST PRESSURE ZONE: ~40% above Mars average — most favorable EVA pressure environment' },
      { level: 'warn', text: 'Major dust storm initiation zone: global storms often originate here each southern summer' },
      { level: '',     text: 'Potential seasonal CO₂ frost deposition in autumn/winter — terrain can be obscured' }
    ],
    missions: 'Orbital coverage only (MRO, MEx, TGO)',
    source:    'Haberle et al. 2001; MOLA Smith et al. 2001'
  },
  {
    id:        'elysium-planitia',
    name:      'Elysium Planitia',
    type:      'Volcanic Plain',
    lat:       4.5,
    lon:       135.9,
    zoom:      8,
    elevM:     -2800,
    riskLevel: 'caution',
    description: 'Site of the InSight lander (2018–2022). Very flat terrain. First seismic data from another planet — Mars is more seismically active than expected.',
    safetyNotes: [
      { level: 'warn', text: 'SEISMICALLY ACTIVE: marsquakes up to M5 recorded [InSight data, Banerdt et al. 2020]' },
      { level: '',     text: 'Loose, sandy regolith confirmed by InSight HP3 and seismic data — soil mobility risk' },
      { level: 'ok',   text: 'Very flat terrain — excellent surface mobility, minimal slope hazard' }
    ],
    missions: 'InSight (2018–2022)',
    source:    'Banerdt et al. 2020, Nature Geoscience; InSight mission data'
  },
  {
    id:        'meridiani-planum',
    name:      'Meridiani Planum',
    type:      'Hematite Plain',
    lat:       -1.95,
    lon:       354.47,
    zoom:      9,
    elevM:     -1374,
    riskLevel: 'safe',
    description: 'Site of Opportunity rover (2004–2018, 45 km driven). Hematite "blueberries" litter the surface — iron oxide concretions formed in ancient standing water.',
    safetyNotes: [
      { level: 'ok',   text: 'Very flat, smooth terrain — Opportunity drove 45 km with minimal terrain hazards' },
      { level: '',     text: 'Hard hematite concretions on loose sand surface — moderate traction variability' },
      { level: 'info', text: 'Fine dust accumulation: Opportunity survived 15 years of dust — good precedent for equipment longevity' }
    ],
    missions: 'MER-B/Opportunity (2004–2018)',
    source:    'Squyres et al. 2004, Science; USGS Gazetteer'
  },
  {
    id:        'chryse-planitia',
    name:      'Chryse Planitia',
    type:      'Plains',
    lat:       22.3,
    lon:       312.0,
    zoom:      8,
    elevM:     -2600,
    riskLevel: 'safe',
    description: 'Site of the Viking 1 lander (1976) — the first successful Mars surface mission. Rocky plains at the mouth of ancient outflow channels from Valles Marineris.',
    safetyNotes: [
      { level: 'ok',   text: 'First successful Mars landing site — Viking 1 operated for 6 years' },
      { level: '',     text: 'Rock field from ancient catastrophic floods — moderate boulder density' },
      { level: 'info', text: 'Historical baseline: first in-situ Mars atmospheric pressure measurements made here' }
    ],
    missions: 'Viking 1 Lander (1976–1982)',
    source:    'Soffen & Snyder 1976, Science; USGS Gazetteer'
  }
];

/* ── Search bar logic ─────────────────────────────────────────────────── */

/* Parses a "lat, lon" string typed by the user. Returns {lat, lon} or null. */
function parseCoordinateInput(str) {
  const match = str.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

/* Renders the filtered location list into the dropdown.
   innerHTML safety: all inserted values come from MARS_LOCATIONS (developer constant,
   never user input) or from parseFloat().toFixed() (numeric output, no HTML tags possible).
   No user-supplied string is ever concatenated into HTML here. */
function renderSearchDropdown(query) {
  const dropdown = document.getElementById('search-dropdown');
  if (!dropdown) return;

  const q = query.toLowerCase().trim();

  // Check if user typed coordinates
  const coords = q.length > 2 ? parseCoordinateInput(query) : null;

  let results = MARS_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(q) ||
    loc.type.toLowerCase().includes(q) ||
    (loc.missions && loc.missions.toLowerCase().includes(q))
  );

  if (results.length === 0 && !coords) {
    dropdown.innerHTML = '<div style="padding:10px 12px;color:var(--muted);font-size:12px;">No locations found. Try "Gale" or "-4.59, 137.44".</div>';
    dropdown.classList.add('open');
    return;
  }

  let html = '';

  if (coords) {
    html += `<div class="search-result" data-lat="${coords.lat}" data-lon="${coords.lon}" data-zoom="14">
      <div class="search-result-name">Go to coordinates</div>
      <div class="search-result-type">Custom</div>
      <div class="search-result-coords">${coords.lat.toFixed(4)}°  ${coords.lon.toFixed(4)}°E</div>
    </div>`;
  }

  results.forEach(loc => {
    const latStr = loc.lat >= 0 ? loc.lat.toFixed(2) + '°N' : Math.abs(loc.lat).toFixed(2) + '°S';
    const lonStr = loc.lon >= 0 ? loc.lon.toFixed(2) + '°E' : Math.abs(loc.lon).toFixed(2) + '°W';
    html += `<div class="search-result" data-id="${loc.id}" data-lat="${loc.lat}" data-lon="${loc.lon}" data-zoom="${loc.zoom}">
      <div class="search-result-name">${loc.name}</div>
      <div class="search-result-type">${loc.type}</div>
      <div class="search-result-coords">${latStr}  ${lonStr}  |  ${loc.elevM >= 0 ? '+' : ''}${loc.elevM.toLocaleString()} m</div>
    </div>`;
  });

  dropdown.innerHTML = html;
  dropdown.classList.add('open');

  // Wire up click handlers
  dropdown.querySelectorAll('.search-result').forEach(el => {
    el.addEventListener('click', () => {
      const lat  = parseFloat(el.dataset.lat);
      const lon  = parseFloat(el.dataset.lon);
      const zoom = parseInt(el.dataset.zoom) || 13;
      flyToLocation(lat, lon, zoom);
      const id   = el.dataset.id;
      if (id) expandLibraryCard(id);
      closeSearch();
    });
  });
}

/* Flies the Leaflet map to the given coordinates. */
function flyToLocation(lat, lon, zoom) {
  if (!STATE.map) return;
  STATE.map.flyTo([lat, lon], zoom, { duration: 1.2 });
}

/* Expands the matching card in the location library panel. */
function expandLibraryCard(id) {
  document.querySelectorAll('.loc-card').forEach(card => {
    card.classList.toggle('expanded', card.dataset.id === id);
  });
}

function closeSearch() {
  const dropdown = document.getElementById('search-dropdown');
  const input    = document.getElementById('search-input');
  if (dropdown) dropdown.classList.remove('open');
  if (input)    input.value = '';
}

/* ── Location library (left panel) ───────────────────────────────────── */

/* Renders all location cards into #location-library.
   innerHTML safety: same as above — all values come from MARS_LOCATIONS constant. */
function renderLibrary() {
  const container = document.getElementById('location-library');
  if (!container) return;

  container.innerHTML = MARS_LOCATIONS.map(loc => {
    const latStr = loc.lat >= 0 ? loc.lat.toFixed(2) + '°N' : Math.abs(loc.lat).toFixed(2) + '°S';
    const lonStr = loc.lon >= 0 ? loc.lon.toFixed(2) + '°E' : Math.abs(loc.lon).toFixed(2) + '°W';
    const elevStr = (loc.elevM >= 0 ? '+' : '') + loc.elevM.toLocaleString() + ' m';

    const safetyHtml = loc.safetyNotes.map(n =>
      `<div class="loc-safety-note ${n.level}">${n.text}</div>`
    ).join('');

    return `<div class="loc-card" data-id="${loc.id}">
      <div class="loc-card-header">
        <div class="loc-card-dot ${loc.riskLevel}"></div>
        <div class="loc-card-name">${loc.name}</div>
        <div class="loc-card-type">${loc.type}</div>
      </div>
      <div class="loc-card-body">
        <div class="loc-card-desc">${loc.description}</div>
        <div class="loc-card-coords">${latStr}  ${lonStr}  |  ${elevStr} elev.</div>
        <div class="loc-safety-heading">Astronaut Safety Notes</div>
        ${safetyHtml}
        <button class="loc-fly-btn" data-id="${loc.id}">Fly to location →</button>
        <div class="loc-missions">${loc.missions}</div>
      </div>
    </div>`;
  }).join('');

  // Toggle expand/collapse
  container.querySelectorAll('.loc-card-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.loc-card').classList.toggle('expanded');
    });
  });

  // Fly-to buttons
  container.querySelectorAll('.loc-fly-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id  = btn.dataset.id;
      const loc = MARS_LOCATIONS.find(l => l.id === id);
      if (loc) flyToLocation(loc.lat, loc.lon, loc.zoom);
    });
  });
}

/* ── Init ─────────────────────────────────────────────────────────────── */

function initSearch() {
  const input    = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  if (!input) return;

  // Show dropdown on focus if input has content
  input.addEventListener('focus', () => {
    if (input.value.length > 0) renderSearchDropdown(input.value);
    else {
      // Show all locations on empty focus
      renderSearchDropdown('');
    }
  });

  // Filter on typing
  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length === 0) {
      renderSearchDropdown('');
    } else {
      renderSearchDropdown(q);
    }
  });

  // Keyboard navigation
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'Enter') {
      const first = dropdown && dropdown.querySelector('.search-result');
      if (first) first.click();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('#search-wrap')) closeSearch();
  });

  // Build the location library cards
  renderLibrary();

  console.log('[search] Location directory ready:', MARS_LOCATIONS.length, 'locations');
}
