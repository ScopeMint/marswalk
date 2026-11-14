/* search.js — Mars location directory, search bar, and location library panel.
   Coordinates: USGS Gazetteer of Planetary Nomenclature (IAU approved).
   Elevations: MOLA global topography, Smith et al. (2001), JGR 106(E10).
   Longitudes stored as -180 to +180 (east positive) to match Leaflet convention. */

/* ── Complete Mars locations database ────────────────────────────────── */
/* riskLevel: 'safe' (green) | 'caution' (orange) | 'danger' (red)
   These reflect EVA terrain difficulty, NOT radiation alone. */
const MARS_LOCATIONS = [

  /* ── Rover / lander sites — well-studied ── */
  {
    id: 'gale-crater', name: 'Gale Crater', type: 'Impact Crater',
    lat: -5.37, lon: 137.80, zoom: 11, elevM: -4451,
    isStudyArea: true,
    riskLevel: 'caution',
    description: 'Site of the Curiosity rover (MSL). Ancient lake sediments and layered rocks inside Mount Sharp record billions of years of Mars climate history. Our primary MarsWalk study area.',
    safetyNotes: [
      { level: 'info', text: 'Radiation baseline: ~233 μGy/day [Hassler et al. 2014, Science 343]' },
      { level: '',     text: 'Sandy dunes in lower crater — potential wheel/mobility hazard for EVA equipment' },
      { level: '',     text: 'Dust devils observed frequently by Curiosity REMS' }
    ],
    missions: 'MSL/Curiosity (2012–present)',
    source: 'USGS Gazetteer; Hassler et al. 2014 Science'
  },
  {
    id: 'mount-sharp', name: 'Mount Sharp (Aeolis Mons)', type: 'Sedimentary Mound',
    lat: -5.08, lon: 137.85, zoom: 13, elevM: -1500,
    isStudyArea: true,
    riskLevel: 'caution',
    description: 'Central mound of Gale Crater, rising ~5.5 km above the crater floor. Curiosity is actively climbing layered strata. Each rock layer records a different climate epoch.',
    safetyNotes: [
      { level: 'warn', text: 'Steep upper slopes (>20°) — route planning critical; approach only via gradual switchbacks' },
      { level: '',     text: 'Loose sedimentary rock on upper flanks increases slip risk' },
      { level: 'ok',   text: 'Primary MarsWalk science target. Boxwork ridges studied by Curiosity at ~5.1°S, 137.75°E' }
    ],
    missions: 'MSL/Curiosity (actively exploring)',
    source: 'Grotzinger et al. 2015, Science; MOLA'
  },
  {
    id: 'jezero-crater', name: 'Jezero Crater', type: 'Ancient Lake Delta',
    lat: 18.38, lon: 77.69, zoom: 12, elevM: -2535,
    riskLevel: 'caution',
    description: 'Site of the Perseverance rover (Mars 2020). An ancient river delta — highest probability site for preserved biosignatures. Mars Sample Return cache is being assembled here.',
    safetyNotes: [
      { level: '',     text: 'Rocky delta fan — higher boulder density than flat plains; slower EVA traverse' },
      { level: 'info', text: 'Perseverance traverse data available via NASA PDS for terrain assessment' },
      { level: 'info', text: 'Equatorial site: radiation environment similar to Gale Crater baseline' }
    ],
    missions: 'Mars 2020/Perseverance (2021–present)',
    source: 'Farley et al. 2020, Space Science Reviews; USGS Gazetteer'
  },
  {
    id: 'meridiani-planum', name: 'Meridiani Planum', type: 'Hematite Plain',
    lat: -1.95, lon: -5.53, zoom: 9, elevM: -1374,
    riskLevel: 'safe',
    description: 'Site of Opportunity rover (2004–2018, 45 km driven). Hematite "blueberries" (iron oxide concretions formed in ancient standing water) litter the surface.',
    safetyNotes: [
      { level: 'ok',   text: 'Very flat, smooth terrain — Opportunity drove 45 km with minimal hazards' },
      { level: '',     text: 'Hard hematite concretions over loose sand — moderate traction variability' },
      { level: 'info', text: 'Fine dust: Opportunity survived 15 years — good equipment longevity precedent' }
    ],
    missions: 'MER-B/Opportunity (2004–2018)',
    source: 'Squyres et al. 2004, Science; USGS Gazetteer'
  },
  {
    id: 'chryse-planitia', name: 'Chryse Planitia', type: 'Plains',
    lat: 22.3, lon: -48.0, zoom: 8, elevM: -2600,
    riskLevel: 'safe',
    description: 'Site of Viking 1 lander (1976) — the first successful Mars surface mission. Rocky plains at the mouth of ancient outflow channels from Valles Marineris.',
    safetyNotes: [
      { level: 'ok',   text: 'First successful Mars landing — Viking 1 operated for 6 years' },
      { level: '',     text: 'Rock field from ancient catastrophic floods — moderate boulder density' },
      { level: 'info', text: 'First in-situ Mars atmospheric pressure measurements made here (730 Pa avg)' }
    ],
    missions: 'Viking 1 Lander (1976–1982)',
    source: 'Soffen & Snyder 1976, Science; USGS Gazetteer'
  },
  {
    id: 'utopia-planitia', name: 'Utopia Planitia', type: 'Plains',
    lat: 47.9, lon: 118.0, zoom: 7, elevM: -4800,
    riskLevel: 'caution',
    description: 'Site of Viking 2 lander (1976) and Zhurong rover (2021). Largest recognized impact basin on Mars. Subsurface radar (SHARAD) detected possible water ice deposits.',
    safetyNotes: [
      { level: '',     text: 'High latitude (48°N): seasonal frost deposition; terrain can freeze overnight' },
      { level: 'warn', text: 'Subsurface ice detected by SHARAD — ground instability risk in warmer seasons' },
      { level: 'info', text: 'Viking 2 measured temperatures from -17°C to -107°C at this site [NASA]' }
    ],
    missions: 'Viking 2 Lander (1976–1980); Zhurong rover (2021)',
    source: 'Lander et al. 1976; Stuurman et al. 2016 GRL; USGS Gazetteer'
  },
  {
    id: 'elysium-planitia', name: 'Elysium Planitia', type: 'Volcanic Plain',
    lat: 4.5, lon: 135.9, zoom: 8, elevM: -2800,
    riskLevel: 'caution',
    description: 'Site of InSight lander (2018–2022). Very flat terrain. First seismic data from another planet — Mars is more seismically active than expected.',
    safetyNotes: [
      { level: 'warn', text: 'SEISMICALLY ACTIVE: marsquakes up to M5 recorded [Banerdt et al. 2020, Nature Geoscience]' },
      { level: '',     text: 'Loose, sandy regolith confirmed by InSight — soil mobility risk' },
      { level: 'ok',   text: 'Very flat terrain — excellent surface mobility, minimal slope hazard' }
    ],
    missions: 'InSight (2018–2022)',
    source: 'Banerdt et al. 2020, Nature Geoscience; InSight mission data'
  },

  /* ── Extreme terrain ── */
  {
    id: 'olympus-mons', name: 'Olympus Mons', type: 'Shield Volcano',
    lat: 18.65, lon: -133.8, zoom: 7, elevM: 21229,
    riskLevel: 'danger',
    description: 'Largest volcano in the solar system: 624 km across, 21.2 km tall. Caldera alone is 80 km wide. Last erupted within the past 25 million years — geologically very recent.',
    safetyNotes: [
      { level: 'warn', text: 'EXTREME ELEVATION: 21.2 km — near-vacuum at summit, suit pressure margin critical' },
      { level: 'warn', text: 'Base escarpment 8 km tall — impassable without specialized equipment' },
      { level: '',     text: 'No surface mission data — terrain uncertainty very high' }
    ],
    missions: 'Orbital coverage only (MRO, MEx, TGO)',
    source: 'Plescia 2004, JGR; MOLA Smith et al. 2001'
  },
  {
    id: 'valles-marineris', name: 'Valles Marineris', type: 'Canyon System',
    lat: -13.9, lon: -59.2, zoom: 6, elevM: -8200,
    riskLevel: 'danger',
    description: 'Largest canyon in the solar system: 4,000 km long, up to 7 km deep. Formed by ancient tectonic rifting. As wide as the continental US.',
    safetyNotes: [
      { level: 'warn', text: 'Wall heights up to 7 km — extreme terrain, strict slope limits critical near rim' },
      { level: 'warn', text: 'Deepest dust accumulations on Mars — equipment burial risk on canyon floors' },
      { level: '',     text: 'Evidence of ancient landslides and ongoing slope failures (MRO HiRISE data)' }
    ],
    missions: 'No surface missions; MRO/CRISM/HiRISE orbital coverage',
    source: 'Lucchitta et al. 1994; MOLA Smith et al. 2001'
  },
  {
    id: 'hellas-planitia', name: 'Hellas Planitia', type: 'Impact Basin',
    lat: -42.4, lon: 70.5, zoom: 6, elevM: -8200,
    riskLevel: 'caution',
    description: 'Deepest point on Mars, 8.2 km below datum. Highest surface atmospheric pressure on Mars (~1,155 Pa vs ~600 Pa average) — a natural advantage for EVA suit pressure margins.',
    safetyNotes: [
      { level: 'ok',   text: 'HIGHEST PRESSURE ZONE: ~40% above Mars average — most favorable EVA pressure environment' },
      { level: 'warn', text: 'Major dust storm initiation zone — global storms often start here each southern summer' },
      { level: '',     text: 'Potential seasonal CO₂ frost deposition in autumn/winter' }
    ],
    missions: 'Orbital coverage only (MRO, MEx, TGO)',
    source: 'Haberle et al. 2001; MOLA Smith et al. 2001'
  },
  {
    id: 'argyre-planitia', name: 'Argyre Planitia', type: 'Impact Basin',
    lat: -50.0, lon: -43.0, zoom: 7, elevM: -5200,
    riskLevel: 'caution',
    description: 'Second largest recognized impact basin on Mars, 1,800 km across. Possible subsurface ice deposits. Surrounded by high mountains (Charitum Montes).',
    safetyNotes: [
      { level: '',     text: 'High latitude (50°S): frost risk; polar vortex dust storms in winter' },
      { level: '',     text: 'Rim mountains >4 km tall — significant slope hazards at basin edges' },
      { level: 'info', text: 'Possible ancient glacial deposits on northern floor — terrain uncertainty' }
    ],
    missions: 'Orbital coverage only',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },

  /* ── Major named regions (orbital data only) ── */
  {
    id: 'utopia-region', name: 'Amazonis Planitia', type: 'Plain',
    lat: 24.0, lon: -156.0, zoom: 7, elevM: -3200,
    riskLevel: 'safe',
    description: 'Very smooth, flat plain in the western hemisphere. Among the smoothest terrain on Mars (low crater density). Possible ancient ocean floor deposits.',
    safetyNotes: [
      { level: 'ok',   text: 'Some of the flattest, smoothest terrain on Mars — favorable for EVA mobility' },
      { level: '',     text: 'No surface mission data — confirm via orbital imaging before planning' },
      { level: 'info', text: 'Low boulder density based on orbital radar and imaging' }
    ],
    missions: 'Orbital coverage only (MRO, MEx)',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },
  {
    id: 'isidis-planitia', name: 'Isidis Planitia', type: 'Impact Basin',
    lat: 12.9, lon: 87.0, zoom: 7, elevM: -3900,
    riskLevel: 'caution',
    description: 'Large impact basin, 1,500 km across. ESA Beagle 2 lander targeted this region in 2003 (crash-landed). Relatively smooth floor. ISRO Mars Orbiter Mission imaged this area.',
    safetyNotes: [
      { level: '',     text: 'Smooth basin floor but basin-edge scarps can be steep' },
      { level: 'info', text: 'Near Syrtis Major — known high-albedo dust source, affects visibility' },
      { level: '',     text: 'No successful surface mission — terrain uncertainty moderate' }
    ],
    missions: 'Beagle 2 attempt (2003, failed); orbital coverage MRO/MEx',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },
  {
    id: 'acidalia-planitia', name: 'Acidalia Planitia', type: 'Plain',
    lat: 46.0, lon: -27.0, zoom: 7, elevM: -4100,
    riskLevel: 'caution',
    description: 'Large northern hemisphere plain. Theorized by some researchers as a potential ancient ocean floor. Dark surface from wind-deposited basaltic sand.',
    safetyNotes: [
      { level: '',     text: 'High latitude (46°N) — temperature extremes; possible seasonal frost' },
      { level: 'info', text: 'Dark basaltic sand dunes common — dune fields create navigation obstacles' },
      { level: '',     text: 'No surface mission data — orbital assessment only' }
    ],
    missions: 'Orbital coverage only',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },
  {
    id: 'arcadia-planitia', name: 'Arcadia Planitia', type: 'Plain',
    lat: 46.0, lon: -168.0, zoom: 7, elevM: -4200,
    riskLevel: 'caution',
    description: 'Northern hemisphere plain with radar evidence of near-surface ice. Candidate site for future human landing due to ice access and relatively smooth terrain.',
    safetyNotes: [
      { level: 'info', text: 'Near-surface ice detected by SHARAD/MARSIS radar — potential water resource' },
      { level: 'warn', text: 'Ice table at shallow depth — ground could be unstable in warm season' },
      { level: '',     text: 'High latitude seasonal frost risk; no surface mission data' }
    ],
    missions: 'Orbital coverage only (MRO SHARAD radar data)',
    source: 'Bramson et al. 2015, GRL; USGS Gazetteer'
  },
  {
    id: 'arabia-terra', name: 'Arabia Terra', type: 'Highland Region',
    lat: 21.0, lon: 6.0, zoom: 7, elevM: 500,
    riskLevel: 'caution',
    description: 'Heavily cratered highland transition zone. High density of ancient craters. Possible ancient explosive volcanic calderas identified in 2021.',
    safetyNotes: [
      { level: '',     text: 'Heavily cratered — complex terrain with many depressions and rim ridges' },
      { level: '',     text: 'Dust-covered surfaces — Opportunity-class dust accumulation risk' },
      { level: 'info', text: 'Possible ancient supervolcano calderas identified by NASA (2021) — geological interest' }
    ],
    missions: 'Orbital coverage only',
    source: 'MOLA Smith et al. 2001; Michalski & Bleacher 2013 Nature; USGS Gazetteer'
  },
  {
    id: 'syrtis-major', name: 'Syrtis Major Planum', type: 'Volcanic Plain',
    lat: 9.0, lon: 69.0, zoom: 7, elevM: 500,
    riskLevel: 'caution',
    description: 'Ancient shield volcano and one of the most prominent dark features visible from Earth. Low, broad volcanic plateau. Dark surface from wind-swept basaltic rock.',
    safetyNotes: [
      { level: '',     text: 'Basaltic surface with wind-eroded features — moderate rock hazard' },
      { level: 'info', text: 'Dark surface means higher thermal inertia — ground stays warmer longer after sunset' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },
  {
    id: 'terra-cimmeria', name: 'Terra Cimmeria', type: 'Highland Region',
    lat: -35.0, lon: -149.0, zoom: 7, elevM: 2000,
    riskLevel: 'caution',
    description: 'Ancient cratered highland in the southern hemisphere. One of the oldest terrains on Mars. Possible remnant crustal magnetic anomalies (detected by Mars Global Surveyor).',
    safetyNotes: [
      { level: '',     text: 'Heavily cratered ancient highland — complex, rough terrain' },
      { level: 'info', text: 'Strong crustal magnetic fields detected — potential compass interference' },
      { level: '',     text: 'No surface mission data — orbital assessment only' }
    ],
    missions: 'Orbital coverage only',
    source: 'Acuña et al. 1999, Science; USGS Gazetteer'
  },
  {
    id: 'terra-sirenum', name: 'Terra Sirenum', type: 'Highland Region',
    lat: -40.0, lon: -152.0, zoom: 7, elevM: 1500,
    riskLevel: 'caution',
    description: 'Ancient cratered highland. Gully features observed by MRO suggest possible recent liquid water flows. Recurring slope lineae (RSL) have been debated.',
    safetyNotes: [
      { level: '',     text: 'Gully features suggest possible recent slope activity — landslide risk on steep slopes' },
      { level: '',     text: 'High southern latitude — extreme temperature swings, CO₂ frost possible' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only (MRO/HiRISE)',
    source: 'Malin & Edgett 2000, Science; USGS Gazetteer'
  },
  {
    id: 'noachis-terra', name: 'Noachis Terra', type: 'Highland Region',
    lat: -45.0, lon: -30.0, zoom: 7, elevM: 1200,
    riskLevel: 'caution',
    description: 'Ancient cratered southern highland. Named after the Noachian geological period (the oldest). One of Mars\'s most ancient preserved surfaces.',
    safetyNotes: [
      { level: '',     text: 'Very heavily cratered — irregular terrain requiring careful route planning' },
      { level: '',     text: 'High southern latitude — temperature extremes; seasonal frost deposition' },
      { level: 'info', text: 'Ancient terrain: geology records earliest Mars history (4+ billion years)' }
    ],
    missions: 'Orbital coverage only',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },
  {
    id: 'aonia-terra', name: 'Aonia Terra', type: 'Highland Region',
    lat: -59.0, lon: -99.0, zoom: 7, elevM: 1000,
    riskLevel: 'danger',
    description: 'High-latitude southern highland. Very cold region with significant seasonal frost. One of the more hostile EVA environments on Mars.',
    safetyNotes: [
      { level: 'warn', text: 'HIGH LATITUDE (59°S): extreme cold, significant seasonal CO₂ and water frost' },
      { level: '',     text: 'Near south polar vortex — severe dust storms in winter' },
      { level: '',     text: 'No surface mission data — high terrain uncertainty' }
    ],
    missions: 'Orbital coverage only',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },
  {
    id: 'promethei-terra', name: 'Promethei Terra', type: 'Highland Region',
    lat: -63.0, lon: 101.0, zoom: 7, elevM: 2200,
    riskLevel: 'danger',
    description: 'High-latitude southern highland near the edge of the southern polar layered deposits. Extreme cold environment.',
    safetyNotes: [
      { level: 'warn', text: 'NEAR SOUTH POLE (63°S): extreme cold, CO₂ frost risk year-round at elevated locations' },
      { level: '',     text: 'Polar ice cap influence — terrain can be covered by dry ice seasonally' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },
  {
    id: 'lunae-planum', name: 'Lunae Planum', type: 'Plateau',
    lat: 13.0, lon: -61.0, zoom: 7, elevM: 2200,
    riskLevel: 'caution',
    description: 'High plateau north of Valles Marineris. Relatively smooth volcanic plateau. The canyon rim of Valles Marineris is visible to the south.',
    safetyNotes: [
      { level: 'warn', text: 'CANYON EDGE PROXIMITY: Valles Marineris rim is to the south — extreme drop-off hazard' },
      { level: 'ok',   text: 'Plateau surface relatively smooth — good mobility away from canyon rim' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },
  {
    id: 'daedalia-planum', name: 'Daedalia Planum', type: 'Volcanic Plain',
    lat: -15.0, lon: -128.0, zoom: 7, elevM: 3000,
    riskLevel: 'caution',
    description: 'Volcanic plain on the flanks of the Tharsis volcanic region. Ancient lava flows create distinctive layered terrain.',
    safetyNotes: [
      { level: '',     text: 'Lava flow features — rough surface with possible lava tubes and collapse pits' },
      { level: 'info', text: 'High elevation (~3 km) — lower atmospheric pressure than Mars average' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only (MRO/THEMIS)',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
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
    const elevStr = (loc.elevM >= 0 ? '+' : '') + loc.elevM.toLocaleString() + ' m (MOLA)';
    html += `<div class="search-result" data-id="${loc.id}" data-lat="${loc.lat}" data-lon="${loc.lon}" data-zoom="${loc.zoom}">
      <div class="search-result-name">${loc.name}</div>
      <div class="search-result-type">${loc.type}</div>
      <div class="search-result-coords">${formatCoord(loc.lat, loc.lon)}  |  ${elevStr}</div>
    </div>`;
  });

  if (!html) {
    html = '<div style="padding:10px 12px;color:var(--muted);font-size:12px;">No matches. Try "Gale", "Olympus", or "-4.59, 137.44".</div>';
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
    card.classList.toggle('expanded', card.dataset.id === id);
    if (card.dataset.id === id) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

/* ── Location library (left panel) ───────────────────────────────────── */

/* innerHTML safety: all values from MARS_LOCATIONS constant — no user input. */
function renderLibrary() {
  const container = document.getElementById('location-library');
  if (!container) return;

  container.innerHTML = MARS_LOCATIONS.map(loc => {
    const elevStr = (loc.elevM >= 0 ? '+' : '') + loc.elevM.toLocaleString() + ' m (MOLA)';
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
        <div class="loc-card-coords">${formatCoord(loc.lat, loc.lon)}  |  ${elevStr}</div>
        <div class="loc-safety-heading">Astronaut Safety Notes</div>
        ${safetyHtml}
        <button class="loc-fly-btn" data-id="${loc.id}">Fly to this location →</button>
        ${loc.isStudyArea ? '' : '<div class="loc-note-outside-area">⚠ EVA planning (route, slope, safety) only works for the Gale Crater study area</div>'}
        <div class="loc-missions">${loc.missions}</div>
        <div class="loc-missions" style="font-style:normal;margin-top:2px;">Source: ${loc.source}</div>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.loc-card-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.loc-card').classList.toggle('expanded');
    });
  });

  container.querySelectorAll('.loc-fly-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const loc = MARS_LOCATIONS.find(l => l.id === btn.dataset.id);
      if (loc) flyToLocation(loc.lat, loc.lon, loc.zoom);
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
