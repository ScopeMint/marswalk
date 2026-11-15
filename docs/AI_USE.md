AI USE LOG
The submission form has an "Use of Artificial Intelligence" field. Be specific and honest.

Tool: Claude (Claude Code). 
What it did: helped write code, [planning], [writing].
What humans did: chose the idea, checked data sources, tested, fixed, decided design.

Rules we follow:
- No AI-generated images or video (only real screenshots).
- No NASA logos or branding.
- AI-written code and text is acknowledged here and in the form.

LOG (add a line each time AI helps)
Date/time | File or part | What AI did | Who checked it

2026-11-14 | src/index.html | Claude Code wrote full page skeleton (top-bar, main-area, bottom-bar layout, CDN links) | team to verify in browser
2026-11-14 | src/css/styles.css | Claude Code wrote all CSS custom properties (colors, layout sizes), fixed layout, Leaflet dark overrides | team to verify in browser
2026-11-14 | src/js/config.js | Claude Code wrote CONFIG object with all numbers, tile layer URLs, mission metadata | team to verify tile URLs against Mars Trek
2026-11-14 | src/js/state.js | Claude Code wrote STATE object structure | team to review
2026-11-14 | src/js/map.js | Claude Code wrote Leaflet init, CTX tile layer, study-area outline, coordinate readout | team to verify tiles load in browser
2026-11-14 | src/js/main.js | Claude Code wrote initApp entry point | team to review
2026-11-14 | src/js/layers.js, grid.js, route.js, route-worker.js, safety.js, targets.js, pov.js, profile.js, ui.js, export.js | Claude Code created stub files (one-line comments) | n/a (empty stubs)
2026-11-14 | src/js/search.js | Claude Code wrote Mars location database (9 locations with coords, elevations, safety notes) and search/flyTo/library UI logic | team to verify coordinates against USGS Gazetteer
2026-11-14 | src/css/styles.css (search/library styles), src/js/map.js (bounds fix), src/index.html (search bar + library markup), src/js/main.js (initSearch call) | Claude Code fixed map wrapping, added search bar and location library panel | team to test in browser
2026-11-14 | scripts/03_make_grids.py, 04_make_overlays.py | Claude Code wrote Python scripts to resample elevation, compute slope+roughness, generate slope-overlay.png | team to run on Saturday with real elevation file
2026-11-14 | src/data/rad-baseline.json | Claude Code structured sourced radiation data from Hassler et al. 2014 | team verified value against paper (233 µGy/day)
2026-11-14 | src/data/rems-temps.json | Claude Code structured sourced temperature data from Martinez et al. 2017 + REMS | team to verify values against REMS published graphs
2026-11-14 | src/data/targets.geojson | Claude Code created 5 science targets with coordinates and citations from Curiosity mission papers | team to verify coordinates against Mars Trek on Saturday morning
2026-11-14 | src/data/pov-images.json | Claude Code created placeholder POV image entries | team to replace with real NASA Raw Images before submission
2026-11-14 | src/js/grid.js | Claude Code wrote binary grid loader: fetch aoi.json + 3 .bin files, latLon↔cell conversion, walkable-cell check | team to verify after grids generated
2026-11-14 | src/js/layers.js | Claude Code wrote LAYER_CATALOG, SLOPE_LEGEND, slope overlay placement, tile layer wiring | team to verify overlay alignment
2026-11-14 | src/js/route-worker.js | Claude Code wrote Dijkstra walk-back-time map + gradient-descent route extraction in Web Worker | team to run T1-T2 route tests
2026-11-14 | src/js/route.js | Claude Code wrote main-thread worker controller: triggerWalkback, triggerRoute, drawRouteLine, habitat marker | team to test route flow
2026-11-14 | src/js/safety.js | Claude Code wrote radiation estimate, temperature range, and safety checklist from sourced data files | team to verify checklist logic
2026-11-14 | src/js/targets.js | Claude Code wrote target marker + card rendering, selectTarget, route trigger | team to test card clicks
2026-11-14 | src/js/pov.js | Claude Code wrote POV photo panel using DOM methods (security-safe, no innerHTML with user data) | team to add real NASA photos
2026-11-14 | src/js/profile.js | Claude Code wrote elevation profile canvas chart + temperature chart (REMS data, EVA window shading) | team to verify visually
2026-11-14 | src/js/ui.js | Claude Code wrote summary card, layer panel, EVA controls wiring, Assumptions modal, About & Sources modal — all DOM methods | team to review modal content
2026-11-14 | src/js/main.js | Claude Code rewrote initApp with correct async init order | team to verify no console errors on load
2026-11-14 | src/index.html | Claude Code rewrote with full structure: EVA controls, science targets list, map floating elements (summary card, pov panel, tooltips), canvas bottom bar | team to test layout at 1440px
2026-11-14 | src/css/styles.css | Claude Code added CSS for all new components: loading banners, map overlays, summary card, EVA bar, checklist, layer toggles, slope legend, modals, target cards, pov panel, EVA controls | team to verify dark theme rendering
2026-11-14 | src/js/config.js | Claude Code fixed centerLat (-4.59→-5.10), centerLon (137.44→137.75), defaultZoom (4→12) to point at Murray formation boxwork zone | team to verify map opens on correct location
2026-11-14 | scripts/generate_synthetic_dem.py | Claude Code wrote synthetic DEM generator: creates elevation/slope/roughness .bin files + aoi.json for Gale Crater boxwork area until real NASA DTM is available | team to replace with real HiRISE/CTX DTM
2026-11-14 | src/data/ (aoi.json, elevation.bin, slope.bin, roughness.bin, slope-overlay.png) | Claude Code generated synthetic terrain data via generate_synthetic_dem.py | team to replace with real NASA elevation data before submission
2026-11-14 | src/js/search.js | Claude Code added 28 more Mars locations (volcanoes, channels, polar caps, glacial terrain, canyons, astrobiological targets) bringing total to 52 | team to verify coordinates against USGS Gazetteer
2026-11-14 | src/js/ui.js | Claude Code added showHowToUseModal() with full 11-section How to Use guide covering every feature | team to review content accuracy
2026-11-14 | src/index.html | Claude Code added "How to Use" button to top bar; improved EVA controls with hint text explaining each slider | team to test UI
2026-11-14 | src/js/grid.js | Claude Code added showSyntheticTerrainNotice() to flag when synthetic terrain is loaded | team to verify banner appears and dismiss works
2026-11-14 | scripts/generate_synthetic_dem.py | Claude Code rewrote DEM generator with explicit flat zones (200m radius) at all key positions; added hillshade.png generation | team to replace with real HiRISE/CTX DTM before submission
2026-11-14 | src/data/ (elevation.bin, slope.bin, roughness.bin, aoi.json, hillshade.png, slope-overlay.png) | Claude Code regenerated all terrain data — all 6 key positions now 0.0° slope | team to replace with NASA DTM data
2026-11-14 | src/js/state.js, layers.js, ui.js | Claude Code added hillshade terrain visualization layer (elevation colour + shadow shading) to the layer stack | team to verify renders correctly
2026-11-14 | src/js/route.js, css/styles.css | Claude Code changed habitat marker from "H" to "EVA Base" with two-line icon and tooltip | team to verify on map
2026-11-14 | src/js/map.js, css/styles.css | Claude Code added geographic terrain labels (Murray Formation, Crater Floor, Mt. Sharp slope) as map overlays | team to verify positions are accurate
2026-11-14 | src/data/targets.geojson | Claude Code added findings and detail fields to all 5 science targets based on published Curiosity papers (Rapin 2021, Bristow 2021, Fraeman 2020, Edgar 2020, NASA/JPL 2023) | team to verify citations against papers
2026-11-14 | src/js/targets.js | Claude Code added expandable "What to look for" section to target cards (findings + detail fields) | team to verify display in browser
2026-11-14 | src/data/rad-baseline.json | Claude Code added solar storm multiplier (10×) and citation from Hassler et al. 2014 Supplementary Table S2 | team to verify source
2026-11-14 | src/js/state.js | Claude Code added solarStormMode, los layer, rad layer to STATE | team to review
2026-11-14 | src/js/safety.js | Claude Code updated computeRadiation() to use storm multiplier from rad-baseline.json | team to verify storm mode numbers
2026-11-14 | src/js/route.js | Claude Code added computePointOfNoReturn() and updatePonrMarker() — amber "↩ Turn back" marker on the route | team to test on a computed route
2026-11-14 | src/index.html | Claude Code added solar storm toggle and radiation badge (#rad-badge) to map area | team to test UI
2026-11-14 | src/js/ui.js | Claude Code added PONR row, storm mode UI, radiation badge updater, new layer panel entries for LOS and radiation | team to review
2026-11-14 | scripts/generate_los_overlay.py | Claude Code wrote LOS script: Bresenham line algorithm from habitat cell to every cell, amber/red where terrain blocks signal | team to verify algorithm
2026-11-14 | scripts/generate_rad_overlay.py | Claude Code wrote radiation overlay script: elevation-based relative dose, 1.5% per 100m [OUR ASSUMPTION] | team to review assumption
2026-11-14 | src/data/los-overlay.png | Claude Code generated via generate_los_overlay.py (synthetic terrain) | team to verify visually
2026-11-14 | src/data/rad-overlay.png | Claude Code generated via generate_rad_overlay.py (synthetic terrain) | team to verify visually
2026-11-14 | src/js/layers.js | Claude Code added addLosOverlay(), addRadOverlay(), catalog entries for both new layers | team to verify overlays display correctly
2026-11-14 | src/css/styles.css | Claude Code added CSS for ponr-pin, target-detail-block, storm-row toggle, rad-badge | team to verify dark theme rendering
2026-11-14 | scripts/02_get_mola.py | Claude Code wrote script to download real MOLA elevation data from NASA PDS via HTTP Range request (1.73 MB of 130 MB file); bicubic-resample to 300×300 grid; compute slope, roughness, overlays; regenerate all src/data/ binary files | team to verify elevation range and spot-check against Mars Trek
