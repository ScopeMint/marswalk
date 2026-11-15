/* config.js — ALL numbers and constants live here. Never put magic numbers in other files.
   The Assumptions panel reads directly from this object. */
const CONFIG = {

  /* Study area: 4 km x 4 km box on Curiosity's real 2025-2026 boxwork route, Mount Sharp, Gale Crater.
     Box size limited by the HiRISE 1 m terrain model strip (~5.4 km wide here).
     OUR ASSUMPTION: 4 km covers a single Marswalk (all targets within ~2 km of the habitat). */
  studyArea: {
    centerLat:    -4.808,   // center of Curiosity's boxwork traverse (MMGIS waypoints, sols 4500-5073)
    centerLon:    137.372,  // degrees, east longitude
    sizeMeters:   4000,     // side length of the study area square [OUR ASSUMPTION]
    defaultZoom:  14,       // shows the whole study area on load
    planningZoom: 15,       // zoom used when flying to the planning area / clicking a target
    // Default habitat position: flattest wide pad near the targets (our selection from HiRISE DTM).
    // Matches aoi.json defaultHabitatLat/Lon — duplicated here as fallback if aoi.json fails
    defaultHabitatLat: -4.82276,
    defaultHabitatLon: 137.36447
  },

  /* Mars size, for converting meters to degrees on the map (IAU 2015 Mars sphere). */
  mars: {
    radiusMeters: 3396190
  },

  /* HiRISE 25 cm orthoimage tiles cut for the study area (scripts/08_build_real_site.py). */
  hirise: {
    minZoom: 12,   // below this the global basemap is enough
    maxZoom: 19,   // Leaflet over-zooms past the native z17 (~0.6 m/px)
    attribution: 'HiRISE: NASA/JPL/University of Arizona; DTM/ortho via USGS Astrogeology'
  },

  /* Tile layers for the map.
     Primary base: OpenPlanetaryMap (OPM) — NASA Viking MDIM + MOLA color data, CARTO hosted.
     Mars Trek WMTS tile endpoints were returning 404 as of Nov 14 2026 (server change/downtime).
     OPM is openly licensed, cites NASA data, and is the documented fallback in docs/DATA_PLAN.md.
     Source: https://www.openplanetary.org/opm-basemaps/opm-mars-basemap-v0-1
     Data: NASA Viking MDIM 2.1 + MOLA colorized elevation (NASA/USGS/CARTO) */
  tileLayers: {
    opm: {
      id:          'opm',
      name:        'OPM Mars Basemap (optical + MOLA)',
      urlTemplate: 'https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-1/all/{z}/{x}/{y}.png',
      attribution: 'Tiles: <a href="https://www.openplanetary.org/opm">OpenPlanetaryMap</a> | Data: NASA Viking MDIM 2.1, MOLA (NASA/USGS/CARTO)',
      minZoom: 1, maxZoom: 18, tms: false,
      mission: 'Viking + MGS', instrument: 'MDIM + MOLA', resolution: '~232 m/px global'
    }
    /* THEMIS day/night IR is served as local overlays cut by scripts/09_get_themis.py
       (see site-layers.js); the old Mars Trek tile URLs returned 404 and were removed. */
  },

  /* Grid: elevation, slope, roughness binary files in data/.
     10 m cells = 400x400 = 160,000 cells over the 4 km study area (elevation averaged from the 1 m
     HiRISE DTM). The real size comes from data/aoi.json; this is only a fallback. [OUR ASSUMPTION] */
  grid: {
    cellSizeMeters: 10   // [OUR ASSUMPTION]
  },

  /* Walking speed presets (flat ground, no suit, no gear).
     OUR ASSUMPTION: based on typical suited-astronaut estimates. No sourced value found. */
  walk: {
    slowKmh:   2,   // [OUR ASSUMPTION]
    normalKmh: 3,   // [OUR ASSUMPTION] default
    fastKmh:   4    // [OUR ASSUMPTION]
  },

  /* Slope blocking: cells steeper than the limit are impassable.
     OUR ASSUMPTION: 15° default, range 5–25°. No mission-specific source found. */
  slope: {
    defaultLimitDeg: 15,  // [OUR ASSUMPTION]
    minDeg:           5,  // slider minimum
    maxDeg:           25  // slider maximum
  },

  /* EVA (spacewalk) budget.
     OUR ASSUMPTION: 6 h EVA, 60 min science work, 25% reserve.
     NASA plans EVAs with safety margins; 25% reserve is a reasonable planning assumption. */
  eva: {
    defaultHours:    6,     // [OUR ASSUMPTION]
    minHours:        2,     // slider minimum
    maxHours:        8,     // slider maximum
    workMinutes:     60,    // time at the science target [OUR ASSUMPTION]
    reserveFraction: 0.25   // must keep 25% of EVA unused [OUR ASSUMPTION]
  },

  /* Radiation baseline from Curiosity RAD instrument at Gale Crater.
     Source: Hassler et al. (2014), Science 343(6169), doi:10.1126/science.1244797
     NOTE: measured on the rover surface, not inside a suit. Suit shielding not modeled. */
  radiation: {
    baselineMuGyPerDay: 233,  // μGy/day — sourced from Hassler et al. 2014
    sourceLabel: 'Hassler et al. (2014), Science 343(6169)'
  },

  /* Suit & crew model (consumables.js). Walking energy: Pandolf et al. (1977). O2 equivalent: Weir (1949).
     Suit capacities are EMU-class PLANNING values — OUR ASSUMPTION, not a specific flight suit spec. */
  suit: {
    crewSize:            2,     // buddy rule: astronauts never walk alone [OUR ASSUMPTION]
    bodyMassKg:          75,    // astronaut body mass [OUR ASSUMPTION]
    backpackMassKg:      45,    // life-support backpack carried on the back (pressure garment cost is in suitMobilityFactor) [OUR ASSUMPTION]
    toolMassKg:          15,    // sample bags, hammer, drill, camera [OUR ASSUMPTION]
    terrainFactor:       1.2,   // Pandolf terrain coefficient for rough unpaved ground (1.0 = treadmill) [OUR ASSUMPTION]
    suitMobilityFactor:  1.3,   // extra effort to bend a pressurized suit at the joints [OUR ASSUMPTION]
    scienceWorkWatts:    300,   // metabolic rate while sampling at the target [OUR ASSUMPTION]
    mechanicalEfficiency:0.15,  // share of metabolic energy that becomes work, not heat [OUR ASSUMPTION]
    sublimatorShare:     0.8,   // share of heat rejected by water sublimation [OUR ASSUMPTION]
    o2CapacityKg:        0.54,  // primary O2 supply (~1.2 lb, EMU-class) [OUR ASSUMPTION]
    o2LeakKgPerHour:     0.005, // suit leakage allowance [OUR ASSUMPTION]
    co2CapacityKg:       1.2,   // CO2 scrubber capacity [OUR ASSUMPTION]
    feedwaterCapacityKg: 4.5,   // cooling feedwater (~10 lb, EMU-class) [OUR ASSUMPTION]
    cautionFraction:     0.75   // amber above 75% of capacity (keeps a 25% reserve, same as EVA time rule)
  },

  /* UI behavior */
  ui: {
    debounceMs:       250,  // slider debounce before recalculating
    routeAnimMs:      200,  // route line draw animation duration
    mapTransitionMs:  200   // map fly-to transition
  },

  /* Slope speed penalty model (uphill/downhill adjustment).
     OUR ASSUMPTION: uphill speed falls linearly from 100% at 0° to 40% at a FIXED 25° reference slope.
     The reference does NOT move with the slope-limit slider: the slider only decides which cells are
     blocked, so a 10° hill always takes the same time. Downhill: half the penalty of uphill.
     route-worker.js keeps its own copy of these numbers (workers cannot read CONFIG) - keep in sync. */
  speedModel: {
    referenceSlopeDeg:  25,    // [OUR ASSUMPTION] = slider maximum
    uphillMinFraction:  0.40,  // [OUR ASSUMPTION]
    downhillPenaltyFactor: 0.5 // [OUR ASSUMPTION]
  },

  /* Roughness slowdown: cells above the roughness threshold take 25% longer.
     OUR ASSUMPTION: threshold and penalty are planning estimates. */
  roughness: {
    thresholdMeters:    0.5,  // elevation spread in a cell [OUR ASSUMPTION]
    timePenaltyFraction: 0.25 // 25% slower on rough ground [OUR ASSUMPTION]
  }
};
