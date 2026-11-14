/* config.js — ALL numbers and constants live here. Never put magic numbers in other files.
   The Assumptions panel reads directly from this object. */
const CONFIG = {

  /* Study area: ~6 km x 6 km box around boxwork formations at Mount Sharp, Gale Crater.
     OUR ASSUMPTION: 6 km walkable range for a single Marswalk. */
  studyArea: {
    centerLat:    -5.10,    // Murray formation boxwork zone, Mount Sharp (not Bradbury Landing)
    centerLon:    137.75,   // degrees, east longitude
    sizeMeters:   6000,     // side length of the study area square [OUR ASSUMPTION]
    defaultZoom:  12,       // shows Gale Crater terrain detail on load
    planningZoom: 14,       // zoom used when flying to the planning area / clicking a target
    // Default habitat position (NW quadrant of study area, flattest zone near targets)
    // Matches aoi.json defaultHabitatLat/Lon — duplicated here as fallback if aoi.json fails
    defaultHabitatLat: -5.0747,
    defaultHabitatLon: 137.7247
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
    },
    themisDay: {
      id:          'themisDay',
      name:        'THEMIS Day IR (thermal)',
      /* Mars Trek WMTS URL — may need updating if Trek server comes back online.
         Tested Nov 14 2026: Trek tile server returning 404 for all layer names tried.
         Keeping URL here so it can be re-enabled when Trek is accessible. */
      urlTemplate: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MO_THEMIS-Day-IR_mosaic_global_100m_v12/default/default028mm/{z}/{y}/{x}.jpg',
      attribution: 'NASA/JPL-Caltech/ASU — Mars Odyssey THEMIS via Mars Trek',
      minZoom: 1, maxZoom: 18, tms: false,
      mission: 'Mars Odyssey', instrument: 'THEMIS', resolution: '~100 m/px'
    },
    themisNight: {
      id:          'themisNight',
      name:        'THEMIS Night IR (thermal)',
      urlTemplate: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MO_THEMIS-Night-IR_mosaic_global_100m_v14/default/default028mm/{z}/{y}/{x}.jpg',
      attribution: 'NASA/JPL-Caltech/ASU — Mars Odyssey THEMIS via Mars Trek',
      minZoom: 1, maxZoom: 18, tms: false,
      mission: 'Mars Odyssey', instrument: 'THEMIS', resolution: '~100 m/px'
    }
  },

  /* Grid: elevation, slope, roughness binary files in data/.
     20 m cells = 300x300 = 90,000 cells. Fast enough for A* in a Web Worker.
     OUR ASSUMPTION: 20 m cells. Upgrade to 10 m only if route computes in < 200 ms. */
  grid: {
    cellSizeMeters: 20   // [OUR ASSUMPTION]
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

  /* UI behavior */
  ui: {
    debounceMs:       250,  // slider debounce before recalculating
    routeAnimMs:      200,  // route line draw animation duration
    mapTransitionMs:  200   // map fly-to transition
  },

  /* Slope speed penalty model (uphill/downhill adjustment).
     OUR ASSUMPTION: linear from 100% at 0° to 40% at the slope limit (uphill).
     Downhill: half the penalty of uphill. */
  speedModel: {
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
