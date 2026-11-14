/* config.js — ALL numbers and constants live here. Never put magic numbers in other files.
   The Assumptions panel reads directly from this object. */
const CONFIG = {

  /* Study area: ~6 km x 6 km box around boxwork formations at Mount Sharp, Gale Crater.
     OUR ASSUMPTION: 6 km walkable range for a single Marswalk. */
  studyArea: {
    centerLat:    -4.59,    // degrees, areocentric lat (Mars)
    centerLon:    137.44,   // degrees, east longitude
    sizeMeters:   6000,     // side length of the study area square [OUR ASSUMPTION]
    defaultZoom:  14        // Leaflet zoom level on first load
  },

  /* Mars Trek WMTS tile layers.
     URL pattern: https://trek.nasa.gov/tiles/Mars/EQ/{LayerName}/default/default028mm/{z}/{y}/{x}.{ext}
     NOTE: Trek uses {z}/{y}/{x} order (row then col). tms:false for north-up tiles. */
  tileLayers: {
    ctx: {
      id:          'ctx',
      name:        'CTX Mosaic (optical)',
      urlTemplate: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MRO_CTX_Mosaic_global_006_v1/default/default028mm/{z}/{y}/{x}.jpg',
      attribution: 'NASA/JPL-Caltech/MSSS — MRO CTX via <a href="https://trek.nasa.gov/mars">Mars Trek</a>',
      minZoom: 1, maxZoom: 18, tms: false,
      mission: 'MRO', instrument: 'CTX', resolution: '~5 m/px'
    },
    hirise: {
      id:          'hirise',
      name:        'HiRISE (high-res optical)',
      urlTemplate: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MRO_HiRISE_Mosaic_global_25cm/default/default028mm/{z}/{y}/{x}.jpg',
      attribution: 'NASA/JPL-Caltech/UofA — MRO HiRISE via <a href="https://trek.nasa.gov/mars">Mars Trek</a>',
      minZoom: 1, maxZoom: 18, tms: false,
      mission: 'MRO', instrument: 'HiRISE', resolution: '~0.25 m/px'
    },
    themisDay: {
      id:          'themisDay',
      name:        'THEMIS Day IR (thermal)',
      urlTemplate: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MO_THEMIS-Day-IR_mosaic_global_100m_v12/default/default028mm/{z}/{y}/{x}.jpg',
      attribution: 'NASA/JPL-Caltech/ASU — MO THEMIS via <a href="https://trek.nasa.gov/mars">Mars Trek</a>',
      minZoom: 1, maxZoom: 18, tms: false,
      mission: 'Mars Odyssey', instrument: 'THEMIS', resolution: '~100 m/px'
    },
    themisNight: {
      id:          'themisNight',
      name:        'THEMIS Night IR (thermal)',
      urlTemplate: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MO_THEMIS-Night-IR_mosaic_global_100m_v14/default/default028mm/{z}/{y}/{x}.jpg',
      attribution: 'NASA/JPL-Caltech/ASU — MO THEMIS via <a href="https://trek.nasa.gov/mars">Mars Trek</a>',
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
