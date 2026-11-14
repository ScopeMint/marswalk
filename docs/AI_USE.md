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
