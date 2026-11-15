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
  },

  /* ── Tharsis volcanoes ── */
  {
    id: 'arsia-mons', name: 'Arsia Mons', type: 'Shield Volcano',
    lat: -8.4, lon: -120.1, zoom: 8, elevM: 17781,
    riskLevel: 'danger',
    description: 'Southernmost of the three Tharsis Montes shield volcanoes. Caldera 110 km wide. The youngest volcanism on Mars may have occurred here within the last 150 million years.',
    safetyNotes: [
      { level: 'warn', text: 'EXTREME ALTITUDE: 17.8 km — near-vacuum at summit, atmospheric pressure <1% of Mars average' },
      { level: '',     text: 'Caldera edges have vertical drop-offs; steep flank slopes on approach' },
      { level: 'info', text: 'Possible recent glacial deposit on flanks (Head et al. 2003, Nature) — ice resource candidate' }
    ],
    missions: 'Orbital coverage only (MRO, MEx, TGO)',
    source: 'Plescia 2004, JGR; USGS Gazetteer; MOLA'
  },
  {
    id: 'pavonis-mons', name: 'Pavonis Mons', type: 'Shield Volcano',
    lat: -0.1, lon: -113.4, zoom: 8, elevM: 14057,
    riskLevel: 'danger',
    description: 'Middle of the three Tharsis Montes. Located almost exactly on the Martian equator. Caldera 50 km wide.',
    safetyNotes: [
      { level: 'warn', text: 'EXTREME ALTITUDE: 14 km — extremely thin atmosphere, EVA suit pressure margin critical' },
      { level: '',     text: 'Equatorial location gives moderate temperature, but altitude cancels this advantage' },
      { level: '',     text: 'No surface mission data — terrain uncertainty high' }
    ],
    missions: 'Orbital coverage only',
    source: 'Plescia 2004, JGR; USGS Gazetteer'
  },
  {
    id: 'ascraeus-mons', name: 'Ascraeus Mons', type: 'Shield Volcano',
    lat: 11.9, lon: -104.1, zoom: 8, elevM: 18209,
    riskLevel: 'danger',
    description: 'Northernmost and tallest of the three Tharsis Montes. At 18.2 km, it rivals Olympus Mons in height. The volcano\'s broad, low-angle slopes are remarkably uniform.',
    safetyNotes: [
      { level: 'warn', text: 'TALLEST THARSIS VOLCANO: 18.2 km — above most Martian atmosphere' },
      { level: '',     text: 'Caldera pit 3 km deep — steep inner walls, collapse risk' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
    source: 'Plescia 2004, JGR; USGS Gazetteer'
  },
  {
    id: 'alba-mons', name: 'Alba Mons', type: 'Shield Volcano',
    lat: 40.5, lon: -110.0, zoom: 7, elevM: 6788,
    riskLevel: 'caution',
    description: 'Largest volcano by area on Mars (wider than Olympus Mons), but with extremely gentle slopes — typically less than 1°. The flattest large volcano in the solar system.',
    safetyNotes: [
      { level: 'ok',   text: 'ULTRA-FLAT: slopes typically <1° — excellent EVA mobility across summit' },
      { level: '',     text: 'High latitude (40.5°N) — temperature extremes; frost risk in autumn/winter' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
    source: 'Cailleau et al. 2003; USGS Gazetteer'
  },
  {
    id: 'elysium-mons', name: 'Elysium Mons', type: 'Shield Volcano',
    lat: 25.0, lon: 147.2, zoom: 8, elevM: 14127,
    riskLevel: 'danger',
    description: 'Largest volcano in the Elysium volcanic region. Located near the InSight lander but far enough away to represent completely different terrain.',
    safetyNotes: [
      { level: 'warn', text: 'HIGH ALTITUDE: 14.1 km — far above the InSight landing plains below' },
      { level: '',     text: 'Lava flow channels on flanks — rough terrain with collapse pit hazards' },
      { level: '',     text: 'No surface mission data for the volcano itself' }
    ],
    missions: 'Orbital coverage only (InSight is on the adjacent plain, not the volcano)',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },

  /* ── Outflow channels and valleys ── */
  {
    id: 'noctis-labyrinthus', name: 'Noctis Labyrinthus', type: 'Canyon Labyrinth',
    lat: -7.0, lon: -99.0, zoom: 7, elevM: 3500,
    riskLevel: 'danger',
    description: 'A maze of intersecting valleys at the western end of Valles Marineris. Formed by tectonic collapse and volcanic activity. Canyon floors are 4–8 km below the plateau rim.',
    safetyNotes: [
      { level: 'warn', text: 'COMPLEX CANYON SYSTEM: walls up to 8 km tall — extreme terrain with many dead ends' },
      { level: '',     text: 'Evidence of collapse pits and pit chains — unstable subsurface near vents' },
      { level: 'info', text: 'Recently active volcanic features detected by ESA Mars Express (Brož et al. 2021, Nature Geoscience)' }
    ],
    missions: 'Orbital coverage only (MRO/HiRISE, MEx)',
    source: 'Hauber et al. 2010; Brož et al. 2021 Nature Geoscience; USGS Gazetteer'
  },
  {
    id: 'kasei-vallis', name: 'Kasei Vallis', type: 'Outflow Channel',
    lat: 24.6, lon: -58.0, zoom: 7, elevM: -1500,
    riskLevel: 'caution',
    description: 'One of Mars\'s largest outflow channels. Carved by catastrophic ancient floods, it extends over 3,000 km. The channel\'s floor shows massive streamlined islands and scoured terrain.',
    safetyNotes: [
      { level: '',     text: 'Flood-scoured terrain — high boulder density and irregular channel floor' },
      { level: '',     text: 'Channel walls up to 3 km tall — extreme terrain at edges' },
      { level: 'info', text: 'Flood carved in Noachian/Hesperian; evidence of multiple flood events' }
    ],
    missions: 'Orbital coverage only',
    source: 'Baker et al. 1992; USGS Gazetteer; MOLA'
  },
  {
    id: 'ares-vallis', name: 'Ares Vallis (Pathfinder)', type: 'Outflow Channel',
    lat: 19.33, lon: -33.25, zoom: 10, elevM: -3680,
    riskLevel: 'caution',
    description: 'Site of Mars Pathfinder and Sojourner rover (1997). Flood-scoured channel mouth with rock fields deposited by ancient catastrophic water flows.',
    safetyNotes: [
      { level: '',     text: 'Rock field from ancient flooding — moderate boulder density confirmed by Pathfinder' },
      { level: 'ok',   text: 'Relatively flat channel floor — Sojourner successfully traversed the area' },
      { level: 'info', text: 'First Mars rover operation proved rover mobility on rocky terrain' }
    ],
    missions: 'Mars Pathfinder / Sojourner (1997)',
    source: 'Golombek et al. 1997, Science; USGS Gazetteer'
  },
  {
    id: 'gusev-crater', name: 'Gusev Crater (Spirit)', type: 'Impact Crater',
    lat: -14.57, lon: 175.47, zoom: 11, elevM: -1900,
    riskLevel: 'caution',
    description: 'Site of the Spirit rover (2004–2010). An ancient lake bed where water once flowed through Ma\'adim Vallis. Spirit discovered evidence of ancient volcanic and hydrothermal activity at Columbia Hills.',
    safetyNotes: [
      { level: '',     text: 'Rocky plains and Columbia Hills confirmed by Spirit traverse data' },
      { level: 'warn', text: 'Spirit became stuck in soft soil (Trojan) in 2009 — loose, unconsolidated ground hazard' },
      { level: 'ok',   text: 'Columbia Hills offer scientifically rich hydrothermal deposits within EVA range' }
    ],
    missions: 'MER-A/Spirit (2004–2010)',
    source: 'Squyres et al. 2004, Science 305; USGS Gazetteer'
  },
  {
    id: 'reull-vallis', name: 'Reull Vallis', type: 'Ancient River Valley',
    lat: -41.0, lon: 102.0, zoom: 7, elevM: 500,
    riskLevel: 'caution',
    description: 'One of Mars\'s best-preserved ancient river valley systems. MRO HiRISE images reveal well-preserved meandering channels. Evidence of ice-carved modifications in later epochs.',
    safetyNotes: [
      { level: '',     text: 'High latitude (41°S) — seasonal frost, low winter temperatures' },
      { level: 'info', text: 'Valley walls preserve ancient river terrace features — excellent geology target' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only (MRO/HiRISE)',
    source: 'Dohm et al. 2001; USGS Gazetteer'
  },
  {
    id: 'nirgal-vallis', name: 'Nirgal Vallis', type: 'Ancient River Valley',
    lat: -28.0, lon: -41.0, zoom: 8, elevM: 400,
    riskLevel: 'caution',
    description: 'An ancient valley network with evidence of both ancient groundwater sapping and surface flow. Associated gullies suggest more recent liquid water activity.',
    safetyNotes: [
      { level: '',     text: 'Valley walls may have gully erosion — slope instability possible' },
      { level: 'info', text: 'Gully features in walls suggest relatively recent fluid flow (MRO/HiRISE data)' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
    source: 'Malin & Edgett 2000, Science; USGS Gazetteer'
  },

  /* ── High-interest astrobiology targets ── */
  {
    id: 'mawrth-vallis', name: 'Mawrth Vallis', type: 'Ancient Valley',
    lat: 24.5, lon: -19.0, zoom: 9, elevM: -2400,
    riskLevel: 'caution',
    description: 'One of the best-preserved clay mineral sites on Mars. OMEGA and CRISM instruments detected thick deposits of phyllosilicate clays — formed in liquid water billions of years ago. High-priority astrobiology target.',
    safetyNotes: [
      { level: 'info', text: 'CLAY DEPOSITS: thickest phyllosilicates on Mars — ancient habitability indicator (Poulet et al. 2005, Nature)' },
      { level: '',     text: 'Valley terrain with moderate boulder density based on orbital imaging' },
      { level: '',     text: 'Was a finalist landing site for Mars 2020 (Perseverance) — well characterized orbitally' }
    ],
    missions: 'Orbital coverage only; finalist for Mars 2020 landing',
    source: 'Poulet et al. 2005, Nature; Bishop et al. 2008, Science; USGS Gazetteer'
  },
  {
    id: 'oxia-planum', name: 'Oxia Planum', type: 'Ancient Plain',
    lat: 18.3, lon: -24.6, zoom: 9, elevM: -3100,
    riskLevel: 'caution',
    description: 'Selected landing site for ESA/Roscosmos ExoMars Rosalind Franklin rover (target ~2028). Extensive ancient clay deposits. One of the highest-priority biosignature search areas.',
    safetyNotes: [
      { level: 'ok',   text: 'CHOSEN FOR SAFETY: ESA performed exhaustive hazard mapping — unusually good terrain data available' },
      { level: 'info', text: 'Fe/Mg phyllosilicate clays at >3.5 Ga — ancient habitability confirmed orbitally (Quantin-Nataf et al. 2021)' },
      { level: '',     text: 'No surface mission to date — ExoMars Rosalind Franklin rover planned ~2028' }
    ],
    missions: 'ExoMars Rosalind Franklin rover (planned ~2028)',
    source: 'Quantin-Nataf et al. 2021, Astrobiology; ESA ExoMars landing site selection documents'
  },
  {
    id: 'nili-fossae', name: 'Nili Fossae', type: 'Fracture System',
    lat: 22.5, lon: 76.5, zoom: 8, elevM: 1200,
    riskLevel: 'caution',
    description: 'A system of ancient fractures (grabens) north of Isidis Basin. Rich in olivine and clay minerals. Historically associated with methane detections from orbit, though interpretation is contested.',
    safetyNotes: [
      { level: '',     text: 'Fracture terrain — irregular topography with steep graben walls' },
      { level: 'info', text: 'Olivine-rich terrain: possible hydrothermal history (Hoefen et al. 2003, Science)' },
      { level: 'info', text: 'Associated with periodic methane detections (Mumma et al. 2009) — scientific interest but source unconfirmed' }
    ],
    missions: 'Orbital coverage only (MRO/CRISM, MEx/OMEGA)',
    source: 'Hoefen et al. 2003, Science; Mumma et al. 2009, Science; USGS Gazetteer'
  },

  /* ── Polar regions ── */
  {
    id: 'planum-boreum', name: 'Planum Boreum (North Polar Cap)', type: 'Polar Ice Cap',
    lat: 88.0, lon: 0.0, zoom: 5, elevM: 2900,
    riskLevel: 'danger',
    description: 'Mars\'s north polar ice cap — a layered stack of water ice and CO₂ frost about 3 km thick. The polar layered deposits record Mars climate history like tree rings.',
    safetyNotes: [
      { level: 'warn', text: 'EXTREME COLD: polar winter temperatures below -120°C — well outside EVA suit operating range' },
      { level: 'warn', text: 'CO₂ frost year-round at high latitudes — unstable surface traction' },
      { level: 'info', text: 'Water ice cap is a potential resource but CO₂ processing required first' }
    ],
    missions: 'Orbital coverage only (SHARAD, MOLA, MEx MARSIS)',
    source: 'Phillips et al. 2008, Science; MOLA Smith et al. 2001'
  },
  {
    id: 'planum-australe', name: 'Planum Australe (South Polar Cap)', type: 'Polar Ice Cap',
    lat: -86.0, lon: 0.0, zoom: 5, elevM: 3700,
    riskLevel: 'danger',
    description: 'Mars\'s south polar ice cap — permanently covered by CO₂ ice. Radar data (MARSIS) suggests a possible liquid water lake beneath the ice at ~1.5 km depth.',
    safetyNotes: [
      { level: 'warn', text: 'EXTREME COLD: consistently below -130°C; CO₂ ice layer year-round' },
      { level: 'info', text: 'POSSIBLE SUBGLACIAL LAKE: radar reflection at 1.5 km depth (Orosei et al. 2018, Science) — unconfirmed' },
      { level: 'warn', text: 'CO₂ sublimation creates unstable terrain seasonally (Swiss cheese pits observed by MRO)' }
    ],
    missions: 'Orbital coverage only (MEx/MARSIS radar)',
    source: 'Orosei et al. 2018, Science; MOLA Smith et al. 2001'
  },

  /* ── Glacial and periglacial terrain ── */
  {
    id: 'deuteronilus-mensae', name: 'Deuteronilus Mensae', type: 'Glacial Terrain',
    lat: 44.4, lon: 23.5, zoom: 7, elevM: -700,
    riskLevel: 'caution',
    description: 'A region of mesas and lobate debris aprons that are almost certainly debris-covered glaciers. SHARAD radar confirms ice is present a few meters below the surface.',
    safetyNotes: [
      { level: 'info', text: 'ICE DETECTED: SHARAD radar confirms buried glacier ice (Plaut et al. 2009, GRL)' },
      { level: 'warn', text: 'Lobate terrain may hide ice table 1–10 m deep — ground instability possible if ice sublimates' },
      { level: '',     text: 'High latitude (44°N) — temperature extremes; frost possible' }
    ],
    missions: 'Orbital coverage only (MRO SHARAD radar)',
    source: 'Plaut et al. 2009, GRL; USGS Gazetteer'
  },
  {
    id: 'medusae-fossae', name: 'Medusae Fossae Formation', type: 'Mysterious Deposit',
    lat: -2.5, lon: -146.1, zoom: 7, elevM: 1200,
    riskLevel: 'caution',
    description: 'A vast, enigmatic deposit larger than the United States that is unusually easy to erode. Its origin is debated: volcanic ash, ancient ice, or aeolian dust. One of Mars\'s most puzzling features.',
    safetyNotes: [
      { level: '',     text: 'Very soft, friable material — terrain may crumble; sinkhole/collapse risk uncertain' },
      { level: 'info', text: 'Origin debated: volcanic ash vs. ancient ice deposit (Bradley et al. 2002)' },
      { level: '',     text: 'Yardangs (wind-eroded ridges) create complex, irregular surface terrain' }
    ],
    missions: 'Orbital coverage only (MRO/HiRISE, MOLA)',
    source: 'Bradley et al. 2002, JGR; Watters et al. 2007 Science; USGS Gazetteer'
  },
  {
    id: 'phlegra-montes', name: 'Phlegra Montes', type: 'Mountain Range',
    lat: 41.0, lon: 165.0, zoom: 7, elevM: 2400,
    riskLevel: 'caution',
    description: 'A curved mountain range in the northern hemisphere. The mountains border the transition between the northern lowlands and ancient highlands.',
    safetyNotes: [
      { level: '',     text: 'Mountain terrain — slopes can exceed 20°; route planning essential' },
      { level: '',     text: 'High latitude (41°N) — frost risk; cold temperatures' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },

  /* ── Canyons (Valles Marineris system) ── */
  {
    id: 'candor-chasma', name: 'Candor Chasma', type: 'Canyon',
    lat: -6.0, lon: -78.0, zoom: 8, elevM: -6000,
    riskLevel: 'danger',
    description: 'One of the largest individual canyons in Valles Marineris, 813 km long and 4 km deep. Light-toned layered deposits on the canyon floor may have formed in ancient standing water.',
    safetyNotes: [
      { level: 'warn', text: 'CANYON DEPTH: 4–6 km below rim — extreme terrain, no EVA route in/out without specialized equipment' },
      { level: 'info', text: 'Light-toned layered deposits suggest ancient lake sediments (Murchie et al. 2009, JGR)' },
      { level: '',     text: 'Major dust trap — thick dust deposits on canyon floor' }
    ],
    missions: 'Orbital coverage only (MRO/CRISM detects sulfate minerals)',
    source: 'Murchie et al. 2009, JGR; Bibring et al. 2007 Science; USGS Gazetteer'
  },
  {
    id: 'hesperia-planum', name: 'Hesperia Planum', type: 'Volcanic Plain',
    lat: -23.0, lon: 109.0, zoom: 7, elevM: 800,
    riskLevel: 'caution',
    description: 'The type locality for the Hesperian geological period (~3.7–3.0 Ga). An ancient volcanic plain with distinctive wrinkle ridges from lava cooling and tectonic compression.',
    safetyNotes: [
      { level: '',     text: 'Wrinkle ridges create kilometre-scale obstacles — route planning around them needed' },
      { level: 'info', text: 'Type locality for Hesperian epoch: studying this terrain helps calibrate Mars geological timescale' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
    source: 'Scott & Tanaka 1986 USGS; MOLA Smith et al. 2001'
  },
  {
    id: 'tyrrhena-patera', name: 'Tyrrhena Patera', type: 'Ancient Volcano',
    lat: -21.3, lon: 106.8, zoom: 8, elevM: 1600,
    riskLevel: 'caution',
    description: 'One of Mars\'s most ancient volcanoes, dating to the Noachian (>3.7 Ga). Very low, broad shield with a heavily eroded caldera. Phreatomagmatic (steam-driven) eruptions likely.',
    safetyNotes: [
      { level: '',     text: 'Heavily eroded ancient volcano — rough, irregular terrain from billions of years of weathering' },
      { level: 'info', text: 'Ancient phreatomagmatic eruptions suggest water interaction — geological interest high' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
    source: 'Greeley & Spudis 1981; USGS Gazetteer'
  },
  {
    id: 'apollinaris-patera', name: 'Apollinaris Patera', type: 'Ancient Volcano',
    lat: -8.65, lon: 174.4, zoom: 8, elevM: 4890,
    riskLevel: 'caution',
    description: 'An ancient isolated shield volcano with a prominent caldera and a large fan deposit on its south flank from possible pyroclastic flows. Relatively isolated; not part of Tharsis.',
    safetyNotes: [
      { level: '',     text: 'Flank fan deposit may include loose pyroclastic material — traction risk' },
      { level: 'info', text: 'The fan deposit on the south flank may preserve water-altered volcanic material' },
      { level: '',     text: 'No surface mission data; orbital imaging available' }
    ],
    missions: 'Orbital coverage only',
    source: 'Robinson et al. 1993; USGS Gazetteer'
  },
  {
    id: 'margaritifer-terra', name: 'Margaritifer Terra', type: 'Chaotic Terrain',
    lat: -10.0, lon: -25.0, zoom: 7, elevM: -1200,
    riskLevel: 'caution',
    description: 'Transition zone between ancient highlands and chaotic terrain at the head of Ares Vallis. Contains abundant evidence of water-altered minerals and ancient valley networks.',
    safetyNotes: [
      { level: '',     text: 'Chaotic terrain with irregular blocks and scarps — complex EVA navigation' },
      { level: 'info', text: 'Abundant water-altered minerals detected by CRISM (Noe Dobrea et al. 2010)' },
      { level: '',     text: 'Near outflow channel heads — ancient catastrophic flood source region' }
    ],
    missions: 'Orbital coverage only (MRO/CRISM)',
    source: 'Noe Dobrea et al. 2010; USGS Gazetteer'
  },
  {
    id: 'tharsis-tholus', name: 'Tharsis Tholus', type: 'Shield Volcano',
    lat: 13.4, lon: -91.0, zoom: 8, elevM: 8100,
    riskLevel: 'danger',
    description: 'A smaller but steep-flanked shield volcano on the eastern edge of the Tharsis plateau. Its caldera has collapsed on its southeastern side, creating a dramatic partial rim.',
    safetyNotes: [
      { level: 'warn', text: 'STEEP SLOPES: flank slopes up to 20–25° — near the EVA planning limit' },
      { level: '',     text: 'High altitude (~8 km) — lower atmospheric pressure than Mars average' },
      { level: '',     text: 'Caldera collapse wall on SE side — extreme drop-off hazard' }
    ],
    missions: 'Orbital coverage only',
    source: 'Plescia 2004, JGR; USGS Gazetteer'
  },
  {
    id: 'nili-planum', name: 'Nili Planum', type: 'Ancient Plain',
    lat: 28.0, lon: 73.0, zoom: 8, elevM: 1500,
    riskLevel: 'caution',
    description: 'An ancient plateau near Nili Fossae with olivine and carbonate mineral detections — among the strongest carbonate signatures on Mars. Carbonates hint at ancient CO₂-rich neutral-pH water.',
    safetyNotes: [
      { level: 'info', text: 'CARBONATE DETECTED: Mg-Fe carbonates indicate ancient neutral-pH water (Ehlmann et al. 2008, Science)' },
      { level: '',     text: 'Plateau edge — canyon rim hazards on northern side' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only (MRO/CRISM)',
    source: 'Ehlmann et al. 2008, Science; USGS Gazetteer'
  },
  {
    id: 'isidis-basin-northwest', name: 'Northwest Isidis Basin', type: 'Ancient Basin Floor',
    lat: 11.0, lon: 82.0, zoom: 8, elevM: -3400,
    riskLevel: 'safe',
    description: 'The smooth northwestern floor of the Isidis impact basin. Very flat terrain at the transition between ancient highlands and the northern lowlands. Potential ancient shoreline deposits.',
    safetyNotes: [
      { level: 'ok',   text: 'Very flat terrain — smooth ancient basin floor, good mobility' },
      { level: 'info', text: 'Near Nili Fossae clay deposits — scientifically rich area within reach' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
    source: 'MOLA Smith et al. 2001; USGS Gazetteer'
  },
  {
    id: 'amenthes-planum', name: 'Amenthes Planum', type: 'Ancient Highland',
    lat: 3.0, lon: 107.0, zoom: 7, elevM: 1800,
    riskLevel: 'caution',
    description: 'An ancient highland region east of Elysium. Contains well-preserved ancient valley networks carved by water runoff billions of years ago. Relatively unexplored region scientifically.',
    safetyNotes: [
      { level: '',     text: 'Cratered highland terrain with ancient valley networks — irregular EVA surface' },
      { level: 'info', text: 'Valley networks here date from the Noachian — well-preserved ancient water channels' },
      { level: '',     text: 'No surface mission data' }
    ],
    missions: 'Orbital coverage only',
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
  const elevStr = (loc.elevM >= 0 ? '+' : '') + loc.elevM.toLocaleString() + ' m (MOLA)';
  const safetyHtml = loc.safetyNotes.map(n =>
    `<div class="loc-safety-note ${n.level}">${n.text}</div>`
  ).join('');
  return `<div class="loc-card-body">
    <div class="loc-card-desc">${loc.description}</div>
    <div class="loc-card-coords">${formatCoord(loc.lat, loc.lon)}  |  ${elevStr}</div>
    <div class="loc-safety-heading">Astronaut Safety Notes</div>
    ${safetyHtml}
    <button class="loc-fly-btn" data-id="${loc.id}">Fly to this location →</button>
    ${loc.isStudyArea ? '' : '<div class="loc-note-outside-area">⚠ EVA planning (route, slope, safety) only works for the Gale Crater study area</div>'}
    <div class="loc-missions">${loc.missions}</div>
    <div class="loc-missions" style="font-style:normal;margin-top:2px;">Source: ${loc.source}</div>
  </div>`;
}

/* Renders only the card headers for all 52 locations on startup.
   Card bodies are injected lazily on first expand to keep initial paint fast.
   innerHTML safety: all values from MARS_LOCATIONS constant — no user input. */
function renderLibrary() {
  const container = document.getElementById('location-library');
  if (!container) return;

  container.innerHTML = MARS_LOCATIONS.map(loc =>
    `<div class="loc-card" data-id="${loc.id}">
      <div class="loc-card-header">
        <div class="loc-card-dot ${loc.riskLevel}"></div>
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
