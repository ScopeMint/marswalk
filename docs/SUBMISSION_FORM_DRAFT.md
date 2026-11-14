SUBMISSION FORM DRAFT — MarsWalk / Dark Matter Devs
(All text pre-drafted so Sunday is copy-paste only. Paste into form fields exactly.
Verify against the 2026 guide for any field changes. Use "Save Progress" after each field.)

===========================================================================
1. PROJECT NAME
===========================================================================
MarsWalk

===========================================================================
2. HIGH-LEVEL PROJECT SUMMARY (keep short — this is the hook)
===========================================================================
MarsWalk is a web-based EVA planning tool that layers five kinds of NASA science mission data at
astronaut walking scale. A crew member picks a science target near Gale Crater / Mount Sharp, and
the app draws a slope-aware walking route with a full safety summary: distance, time, EVA budget,
radiation baseline, and temperature range — in under one second. It fills the gap between global
Mars maps (JPL Mars Trek, USGS planetary mapping) and the hyper-local needs of a single Marswalk.

===========================================================================
3. LINK TO PROJECT DEMO (ONE public link — video or slide deck)
===========================================================================
[Fill in Sunday: YouTube unlisted link or Google Drive link — test logged out first]

===========================================================================
4. LINK TO FINAL PROJECT (public GitHub Pages link — no login)
===========================================================================
[Fill in Sunday after enabling GitHub Pages and testing in private window]
Format will be: https://[your-username].github.io/[repo-name]/

===========================================================================
5. DETAILED PROJECT DESCRIPTION
===========================================================================

WHAT IT DOES:
MarsWalk combines data from five NASA science missions into a single interactive planning interface
sized for a single Marswalk — a ~6 km × 6 km area around the boxwork formations at Gale Crater /
Mount Sharp, the site studied by Curiosity rover since 2012.

A planner picks one of four to six named science targets. MarsWalk then:
(1) Loads a topographic grid (10 m cells) derived from a NASA/USGS elevation model and computes
    slope and roughness for every cell.
(2) Runs an A-star pathfinding algorithm (in a background Web Worker so the page never freezes)
    to find the fastest walkable route from the habitat to the target — blocked by cells steeper
    than the crew's slope limit.
(3) Computes a "walk-back time map" showing how many minutes it would take to return home from
    any point in the study area — the key safety check that existing tools do not provide.
(4) Checks the full EVA budget: out + 60-minute work time + walk back must leave at least 25%
    of EVA time unused as a safety reserve.
(5) Shows an estimated radiation dose for the EVA based on the published Curiosity RAD baseline,
    and the temperature range during the EVA window from Curiosity REMS data.
(6) Displays real Curiosity Mastcam/Navcam photos near each science target so the crew knows
    what to expect on arrival.
(7) Makes every number traceable: each data point has a source label or is marked "our assumption"
    on screen. An Assumptions panel lists all modeled parameters.

WHAT WE HOPE TO ACHIEVE:
To show that the gap between global-scale Mars maps and walking-scale EVA planning can be bridged
with real NASA data, open web tools, and careful engineering — and to give future mission planners
a concrete, openly licensed prototype they can build on.

HOW WE BUILT IT:
Static website (HTML, CSS, plain JavaScript, Leaflet map library) hosted on GitHub Pages.
Python scripts process raw NASA data files once into small binary grid files (~4 MB total).
Route math runs in a browser Web Worker. No server, no API keys, no login required — the app
opens instantly from a public link.

TOOLS AND LANGUAGES:
- Languages: JavaScript (application), Python (data preparation), HTML/CSS (interface)
- Libraries: Leaflet.js (map display, BSD-2-Clause)
- Data processing: Python / NumPy / rasterio (or GDAL)
- Hosting: GitHub Pages
- Code assistance: Claude Code (see AI Use field)

WHAT WE LEARNED / CHALLENGES:
The hardest step was acquiring a real elevation file for a specific 6 km box on Mars. Tile imagery
(the pictures in JPL Mars Trek) looks like topography but contains no elevation numbers — getting
actual Digital Terrain Models required working with NASA/USGS planetary data formats (GeoTIFF,
IMG). The route pathfinding on a 360,000-cell grid also required careful performance tuning to
stay under one second. We also learned that honesty about data limits (what the model cannot see,
where assumptions were made) is both scientifically correct and builds judge trust.

===========================================================================
6. NASA DATA USED (required for global award eligibility — be specific)
===========================================================================

We use data from FOUR NASA missions and FIVE instruments:

1. Mars Reconnaissance Orbiter (MRO) — HiRISE instrument
   What: Digital Terrain Model (elevation, ~1 m/post) and optical imagery (~0.25 m/px)
   Used for: topographic grid (elevation, slope, roughness), base map imagery at close zoom
   Source: University of Arizona HiRISE DTM catalog (https://www.uahirise.org/dtm/) and
           NASA Mars Trek tile service (https://trek.nasa.gov/mars/)

2. Mars Reconnaissance Orbiter (MRO) — CTX instrument
   What: Stereo-derived elevation model (~20 m/post) and optical imagery (~5 m/px)
   Used for: elevation fallback and base map imagery at wider zoom
   Source: Murray Lab CTX stereo mosaic (https://murray-lab.caltech.edu/CTX/) and Mars Trek

3. Mars Reconnaissance Orbiter (MRO) — CRISM instrument [if data obtained]
   What: Mineral identification summary maps
   Used for: spectral / minerals layer showing hydrated mineral locations
   Source: PDS Geosciences Node CRISM archive

4. Mars Odyssey — THEMIS instrument
   What: Thermal infrared day and night mosaics (~100 m/px)
   Used for: thermal layer showing relative surface temperature patterns
   Source: NASA Mars Trek tile service

5. Mars Science Laboratory (Curiosity rover) — RAD instrument
   What: Published surface absorbed dose rate at Gale Crater
   Used for: per-EVA radiation dose estimate in the safety card
   Source: Hassler et al. (2014), Science, doi:10.1126/science.1244797

6. Mars Science Laboratory (Curiosity rover) — REMS instrument
   What: Air and ground temperature data by time of day at Gale Crater
   Used for: temperature range display during the EVA time window
   Source: NASA PDS REMS dataset / CAB-INTA-CSIC REMS portal (https://cab.inta-csic.es/rems/en/)

7. Mars Science Laboratory (Curiosity rover) — Mastcam / Navcam cameras
   What: Surface imagery near Mount Sharp science targets
   Used for: point-of-view photos in the target drawer
   Source: NASA raw image archive (https://mars.nasa.gov/msl/multimedia/raw-images/)

All imagery tiles are served live via NASA/JPL Mars Trek (https://trek.nasa.gov/mars/).
Full citations and links are in docs/SOURCES.md and displayed in the app's About & Sources panel.

===========================================================================
7. SPACE AGENCY PARTNER AND OTHER DATA / TOOLS
===========================================================================

NASA data and tools:
- NASA/JPL Mars Trek tile service (map tiles)
- NASA Planetary Data System (PDS) — RAD and REMS datasets
- USGS Astropedia — planetary data products

Other:
- University of Arizona HiRISE DTM catalog
- Murray Lab at Caltech — CTX stereo mosaic
- CAB-INTA-CSIC — REMS data portal

Open-source libraries:
- Leaflet.js (BSD-2-Clause, https://leafletjs.com)
- Python / NumPy / rasterio (for data preparation scripts)

===========================================================================
8. USE OF ARTIFICIAL INTELLIGENCE
===========================================================================

Tool: Claude Code by Anthropic (claude-sonnet-4-6).

What the AI did: Wrote application code (HTML, CSS, JavaScript), Python data preparation scripts,
and planning documents (architecture, route model, UI spec) based on detailed specifications
provided by the team. All AI-generated files are logged in docs/AI_USE.md in the repository.

What the humans did: Chose the science concept, selected the location and science targets,
verified all data sources and citations, manually tested the application in multiple browsers,
recorded the demo video, and wrote the final submission text.

No AI-generated images or video are used anywhere in the project. All imagery is real NASA mission
data with proper credits. All scientific claims are sourced from published papers or NASA mission
data, not generated by AI.

===========================================================================
9. REFERENCES (copy from docs/SOURCES.md when confirmed Saturday)
===========================================================================

[Fill in Sunday from docs/SOURCES.md — paste each confirmed source as a line]

Minimum to include:
- Hassler et al. (2014) — RAD dose rate — doi:10.1126/science.1244797
- HiRISE DTM source — uahirise.org/dtm/
- CTX stereo mosaic — murray-lab.caltech.edu/CTX/ (if used)
- MOLA — PDS Geosciences Node (if used)
- THEMIS — Mars Trek / Mars Odyssey mission
- REMS — PDS / CAB-INTA-CSIC
- Curiosity images — mars.nasa.gov/msl/multimedia/raw-images/
- Leaflet.js — leafletjs.com — BSD-2-Clause
- Mars Trek — trek.nasa.gov/mars/

===========================================================================
10. CHECKBOXES
===========================================================================
[ ] I agree to the Terms and Conditions
[ ] I confirm all work is original (created during the event; sources cited; AI use disclosed)

After ticking both: click "Submit for Judging". Look for the confirmation banner.
Download certificate from your profile page.

===========================================================================
SUBMISSION QA (do this Sunday at 4 PM before submitting)
===========================================================================
[ ] Demo link opens in a private/incognito window, no login, plays correctly
[ ] Final project link opens in a private window, no login, example mission shows
[ ] Every field is filled (no "[fill in]" placeholders remain)
[ ] References field has every source from docs/SOURCES.md
[ ] AI use field is complete and honest
[ ] No NASA logos in the app or screenshots
[ ] Screenshots uploaded (JPG/PNG/GIF, up to 10 MB each)
[ ] Both checkboxes ticked
[ ] "Submit for Judging" clicked — confirmation banner seen
