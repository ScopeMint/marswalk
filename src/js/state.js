/* state.js — single source of truth for the whole app.
   Rule: click/slider -> change STATE -> state change redraws screen. No other copies of values. */
const STATE = {

  /* Leaflet map instance (set by map.js initMap) */
  map: null,

  /* Leaflet tile layer instances (set by map.js / layers.js) */
  tileLayers: {
    opm:         null,
    hillshade:   null,   // elevation-colour + hillshade shadows (hillshade.png)
    slope:       null,   // slope-overlay.png
    los:         null,   // line-of-sight communication shadow overlay
    rad:         null,   // relative radiation level overlay
    themisDay:   null,
    themisNight: null
  },

  /* Layer visibility and opacity for each layer */
  layers: {
    opm:        { visible: true,  opacity: 1.0 },
    hirise:     { visible: true,  opacity: 1.0 },   // HiRISE 25 cm orthoimage tiles (study area)
    relief:     { visible: false, opacity: 0.85 },  // rock & ridge relief from 1 m HiRISE DTM
    traverse:   { visible: true,  opacity: 0.9 },   // Curiosity's real path + waypoints
    hillshade:  { visible: false, opacity: 0.70 },  // terrain shading (off: HiRISE imagery now shows the ground)
    slope:      { visible: true,  opacity: 0.35 },  // slope classification over the imagery
    los:        { visible: false, opacity: 0.75 },  // communication shadow zones
    rad:        { visible: false, opacity: 0.65 },  // relative radiation zones
    walkback:   { visible: false, opacity: 0.70 },
    themisDay:  { visible: false, opacity: 0.70 },
    themisNight:{ visible: false, opacity: 0.70 },
    minerals:   { visible: false, opacity: 0.70 }
  },

  /* Mission settings (driven by sliders/controls in left panel) */
  habitat:       null,  // { lat, lon } — set when user places habitat or on first load
  target:        null,  // { lat, lon, id } — set when user picks a target card

  slopeLimitDeg:  15,    // degrees — from CONFIG.slope.defaultLimitDeg
  evaHours:        6,    // hours — from CONFIG.eva.defaultHours
  speedKmh:        3,    // km/h — from CONFIG.walk.normalKmh
  evaStartHour:    8,    // local Mars time (0-24)
  /* Loaded binary grid data (Float32Arrays) */
  grids: {
    loaded:    false,
    elevation: null,  // Float32Array, row-major, meters
    slope:     null,  // Float32Array, degrees
    roughness: null,  // Float32Array, meters (elevation spread)
    width:     0,     // number of columns
    height:    0      // number of rows
  },

  /* Latest route computation result */
  route: {
    status:          'none',  // 'none' | 'computing' | 'done' | 'unreachable' | 'error'
    distanceMeters:  0,
    timeSeconds:     0,
    steepestDeg:     0,
    climbMeters:     0,
    descentMeters:   0,
    profile:         [],     // array of { distanceMeters, elevationMeters } for the chart
    walkbackSeconds: 0,
    path:            []      // array of { lat, lon } for the route line
  },

  /* Walk-back-time map (Dijkstra from habitat, run in Worker) */
  walkback: {
    status: 'none',  // 'none' | 'computing' | 'done'
    data:   null     // Float32Array of walk-back seconds per cell, or null
  },

  /* No-go zones drawn by the user */
  noGoZones: [],  // array of { id, latLngs: [[lat,lon],...] }

  /* Selected science target (feature object from targets.geojson) */
  selectedTarget: null,

  /* UI state */
  ui: {
    welcomeDismissed: false,
    aboutOpen:        false,
    assumptionsOpen:  false
  }
};
