DATA PLAN (words only, no code)

GOAL: at least 3 kinds of NASA data layered. We aim for 5, and each one answers a safety or science question.

0. HOW BIG IS THE STUDY AREA?
- Study area: a square about 6 km x 6 km. Mars is about 59 km per degree of latitude, so that is
  about 0.10 degrees on each side.
- Grid: START WITH 20 m cells -> 300 x 300 = 90,000 cells. Each grid file is about 360 KB (4 bytes per cell).
  Three grids = about 1.1 MB. Well within the 8 MB budget, and the route runs 4x faster than 10 m cells.
  UPGRADE TO 10 m cells ONLY IF: route computes in under 200 ms consistently on your laptop.
  (10 m: 600 x 600 = 360,000 cells, ~1.4 MB per grid, ~4.3 MB total — still fits, just slower.)
- Why 6 km: astronauts on foot cannot go far. This is a walkable range with return time included.
  (This size is our assumption, stated on screen.)

1. CHOOSING THE AREA (Saturday 9:15 - 10:30, do this FIRST, by hand, in the Mars Trek website)
Steps:
  a. Open Mars Trek, zoom to Gale Crater, then Mount Sharp (Aeolis Mons).
     Approximate center: 137.44°E, -4.59°N (Bradbury Landing / Curiosity's starting area).
     The boxwork ridges are ~5-6 km south of Bradbury Landing toward Vera Rubin Ridge / Murray formation.
  b. Find a place with boxwork-style ridges. Use NASA's Curiosity boxwork news and images to confirm.
     Key search: "Curiosity boxwork formations 2025 Mount Sharp" for recent news articles.
  c. Check that HiRISE image coverage and an elevation model (DTM) exist there.
     Fallback ladder for elevation (try in order — stop at first success):
       1) HiRISE DTM (~1 m posts) — best. Search: https://www.uahirise.org/dtm/ for "Gale" or "Murray"
       2) CTX DTM (~20 m posts) — fine for 20 m cells. Source: https://murray-lab.caltech.edu/CTX/
       3) USGS Astropedia Mars products — https://astropedia.astrogeology.usgs.gov/search?ptype=product&target=mars
       4) MOLA 128ppd global (~200 m) — last resort. PDS: https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/
          If using MOLA: use 200 m cells, say "MOLA 200 m resolution — single boulders not visible" on screen.
  d. Draw the 6 km box. Write the four corner coordinates in scripts/01_pick_area.txt.
  e. Pick the habitat/landing spot on the flattest ground inside the box.
  f. Pick 4-6 science targets (boxwork ridges and other interesting spots), at least 1 km apart.
     Save each as a name, a point, and a one-line "why it matters" (cite a Curiosity finding or paper).
Done when: bounds written down, data coverage confirmed, habitat and targets chosen.

**ELEVATION EMERGENCY PLAN (if blocked for more than 90 minutes)**
If none of the sources above yield a usable elevation file by 11:30 AM Saturday:
  Option A: Move the study box. Try a 1-2 km shift. Different boxes may have different DTM coverage.
  Option B: Ask a mentor at the event — this is exactly the kind of data question mentors help with.
  Option C: Use MOLA 200 m global with 200 m cells (1 file, easy Python). Label it on screen.
            Route still works. Slope layer still works. Just coarser. NOT a project failure.
  NEVER DO: invent elevation numbers. NEVER DO: skip the elevation file and show no route.
  A route computed from MOLA at 200 m is infinitely better than no route at all.

2. THE LAYERS

LAYER A - TOPOGRAPHY AND SLOPE (the heart of the safety route)
- Question it answers: "Can a person walk here?"
- Source plan: elevation model from NASA/USGS planetary data (see fallback ladder above).
- Processing (03_make_grids.py): read file -> cut to the box -> resample to target cell size (average) ->
  fill small holes -> compute slope in degrees for every cell from its neighbors ->
  compute roughness (how bumpy: spread of elevation among nearby cells) -> save three .bin files.
- Shown as: slope-class color overlay (see UI plan) and a hillshade look from the map tiles.
- Biggest risk: getting real elevation NUMBERS. Map tiles are pictures, not numbers. We need the
  actual elevation file. Test this on Saturday morning before anything else.
- Check: elevation range in our box should match what the Trek viewer shows for the same spot.
- Python package note: rasterio is the best tool but requires GDAL, which sometimes fails to install.
  Backup plan if rasterio fails: use numpy + struct to read .bin files; for GeoTIFF reading try
  'pip3 install pillow' (PIL can read some GeoTIFFs) or use 'gdal_translate' command-line tool.
  If all else fails and you have MOLA .img files: they can be read with numpy as raw binary arrays.

LAYER B - OPTICAL IMAGERY (what it looks like, where the rocks are)
- Question: "What will I see and what looks rough?"
- Source: Mars Trek HiRISE and CTX mosaics for the Curiosity landing site area (HiRISE is about
  0.25 m per pixel, CTX about 5 m per pixel). Loaded live as map tiles. Not downloaded.
- Tile URL pattern to test on Saturday M2:
  https://trek.nasa.gov/tiles/Mars/EQ/{LayerName}/default/default028mm/{z}/{y}/{x}.jpg
  Candidate CTX layer name: Mars_MRO_CTX_Mosaic_global_006_v1
  Candidate HiRISE layer name: search the Trek catalog page for Gale area layers.
- Plan: HiRISE when zoomed in, CTX when zoomed out. If a tile is missing, that area has no coverage.
- TILE EMERGENCY PLAN: if no tiles load after 45 minutes of trying:
  Option A: Use OpenPlanetaryMap tiles (https://www.openplanetary.org/opm) — different tile server.
  Option B: Use a CTX global mosaic from a different source (Malin Space Science Systems has some).
  Option C: Show only the slope overlay on a plain gray background. The route and safety card still work.
  The map imagery is P0 but it is not the whole project. A working route on a gray background beats
  a beautiful map with no route.

LAYER C - THERMAL (how hot or cold is the ground)
- Question: "How does the surface temperature behave?"
- Source: THEMIS day and night infrared mosaics (about 100 m per pixel), as map tiles from Mars Trek.
  Candidate layer names: Mars_MO_THEMIS-Day-IR_mosaic_global_100m_v12 (day)
                         Mars_MO_THEMIS-Night-IR_mosaic_global_100m_v14 (night)
  Verify these in the Trek catalog on Saturday M2 when testing tile loading.
- Shown as: a toggle with a legend labeled "relative brightness (warmer = lighter)".
  Do NOT print Kelvin or Celsius values unless the source gives them.
- Cut this if behind (cut order: CRISM, then THEMIS, then temperature chart, then walk-back layer).

LAYER D - SPECTRAL / MINERALS (where the science is)
- Question: "Where are the minerals that tell the water story?"
- Source plan: CRISM mineral summary or an existing published mineral map for Gale.
  PDS CRISM archive: https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/
  Alternative: use cited Curiosity text findings per target (still counts as science for Validity score).
- CUT if not obtained by Saturday 2 PM. The science targets text with cited findings is the fallback.

LAYER E - RADIATION AND WEATHER (the safety cards)
- Question: "How much radiation and what temperature during the EVA?"
- Radiation source: Curiosity RAD — Hassler et al. (2014), Science, doi:10.1126/science.1244797
  Value: surface absorbed dose rate from galactic cosmic rays (~233 μGy/day — verify in the paper).
  Store: value, unit, date range, DOI, note "measured on the rover, not inside a spacesuit".
  EVA estimate = baseline per day x (EVA hours / 24). Label "baseline estimate, our calculation."
  RESEARCH TASK Saturday morning (30 min): look for NASA-STD-3001 Volume 2 short-term EVA dose limit.
  URL: https://www.nasa.gov/sites/default/files/atoms/files/nasa-std-3001-vol-2.pdf
  If a cited limit is found: add pass/caution/fail to the radiation card (strengthens Validity score).
- Weather source: Curiosity REMS air and ground temperature data.
  Source: https://cab.inta-csic.es/rems/en/ or PDS REMS dataset.
  Pre-process into a small file: for each local hour of the Mars day, a typical temperature, two seasons.
  Values expected: air temp roughly -60°C night to 0°C afternoon. Ground temp has wider swings.
  Check: nighttime values lower than daytime values; ground vs air differ as expected.

LAYER F - POINT-OF-VIEW PHOTOS (what it will feel like)
- Question: "What will the astronaut see when they arrive?"
- Source: Curiosity raw images from NASA: https://mars.nasa.gov/msl/multimedia/raw-images/
  Filter: Mastcam (best quality, color), Navcam (wider view, navigation context).
  Search near your science target coordinates, within a few hundred meters.
- Plan: choose 1 photo per target (4-6 total). Save small copies (under 300 KB each) in data/pov/.
  Record for each: image ID, date (sol), what it shows, credit "NASA/JPL-Caltech/MSSS", NASA link.
- Rule: real NASA photos only. No AI-generated images. Cite each one.
- If no photo within ~500 m of a target: say "No surface photo near this target yet" (this is fine).

3. THE SCIENCE TARGETS FILE
- 4 to 6 targets. Each has: name, position, kind (boxwork ridge, boxwork hollow, mineral outcrop,
  layered rock, overlook), one-line "why it matters", the evidence source, and the photo ID.
- Our interpretations (like picking spots on HiRISE) must be labeled "our selection".
- Research each target's scientific significance using published Curiosity papers:
  Grotzinger et al. (2014) doi:10.1126/science.1242777 — geological context
  NASA Curiosity news: https://www.jpl.nasa.gov/news?topic=Mars+Science+Laboratory

4. DATA HONESTY RULES
- Every number on screen has a hover or tap source note.
- If we cannot source a number by Saturday 6 PM, we remove it.
- "About & Sources" panel lists everything, copied from docs/SOURCES.md.
- Limits we state out loud: elevation data cannot see single boulders; the radiation number is measured
  on the rover; the walking-speed and slope-limit values are our assumptions.

5. DATA TASK CHECKLIST (each with "done when")
[ ] Area chosen and written down ............ done when bounds + habitat + targets are saved
[ ] Elevation file in hand .................. done when we can print a few elevation numbers
[ ] Grids made .............................. done when 03_make_grids.py makes 3 files at target cell size
[ ] Slope sanity check ...................... done when steep cliffs on the image show high slope numbers
[ ] Overlay picture made .................... done when it lines up with the map tiles
[ ] REMS temperature file ................... done when night < day and source is recorded
[ ] RAD baseline file ....................... done when value + unit + DOI are recorded
[ ] RAD limit research ...................... done when NASA-STD-3001 checked (found or not found, say so)
[ ] Targets file ............................ done when 4-6 targets each have text + source
[ ] POV photos .............................. done when each photo has credit + link
[ ] SOURCES.md up to date ................... done when every item above has a confirmed line
