ARCHITECTURE PLAN (words only, no code)

1. THE BIG PICTURE IN FOUR LINES
- Python scripts run ONCE on Saturday morning. They turn raw NASA data into a few small files in data/.
- The website (plain HTML, CSS, JavaScript, Leaflet map) loads those files and NASA map tiles.
- All route math runs inside the visitor's browser. There is no server and no database.
- The site is hosted free on GitHub Pages, so the link is public with no login.

2. WHY THESE CHOICES
- Static site: nothing to break, free hosting, judges can open it instantly.
- Plain JavaScript, no framework: fewer tools to install, easier for a novice to read.
- Leaflet: simple, popular map library, works with NASA's Mars Trek tiles.
- Python for data prep: best tools for reading NASA elevation files.
- Route math in a Web Worker: a background thread, so the page never freezes while it calculates.
- Relative file paths only: GitHub Pages serves the site from a sub-folder, absolute paths break.
- No API keys in the code. Use the open Mars Trek tile address, not a keyed one. Never commit secrets.

CRITICAL — LOCAL SERVER REQUIRED:
Data files (elevation.bin, etc.) are loaded with JavaScript fetch(). The fetch() function refuses
to load files from your computer's hard drive (file:// protocol) for security reasons. If you open
index.html by double-clicking it, the page will appear but data loading will silently fail and you
will see no map, no route, no layers.

HOW TO RUN LOCALLY (always do this, never double-click):
  cd src
  python3 -m http.server 8080
Then open: http://localhost:8080 in Chrome, Safari, or Firefox.
To stop: press Ctrl+C in the Terminal.

3. PLANNED FILE LAYOUT
Root: README.md, LICENSE, CLAUDE.md, docs/ (plans), media/ (screenshots for the form)

src/
  index.html            One page. Holds the empty panels, loads CSS and JS.
  css/styles.css        All colors, spacing, fonts. Colors live in one list at the top.
  js/config.js          ALL assumptions and numbers in ONE place (slope limit, speed, EVA hours, etc.).
                        The Assumptions panel on screen reads from this same file, so screen and math
                        can never disagree.
  js/state.js           One shared "current choices" object: habitat spot, target, sliders, visible layers.
  js/main.js            Starts everything in the right order. Loads data, builds map, builds panels.
  js/map.js             Leaflet setup, base layers, overlays, route line, markers, click handling.
  js/layers.js          The catalog of layers: name, source, how to draw, legend, citation text.
  js/grid.js            Loads the elevation, slope, roughness grids from data/. Converts map
                        position <-> grid cell.
  js/route.js           The pathfinding math (walk-back-time map + route). Pure math, no screen code.
  js/route-worker.js    Runs BOTH the walk-back-time map AND the route in the background thread.
                        BOTH computations go in this Worker — not just the route. The walk-back-time
                        map is Dijkstra on 90,000 cells (or 360k if 10 m) and must not block the UI.
                        The Worker sends back: { type: 'walkback', data: Float32Array } and
                        then { type: 'route', data: {...route result...} }.
  js/safety.js          Radiation dose estimate, temperature during the EVA, warning rules.
  js/targets.js         Loads and shows the science targets.
  js/pov.js             Point-of-view photo drawer.
  js/profile.js         Elevation profile chart along the route (drawn on a canvas, no chart library).
  js/ui.js              Builds and updates the side panels and the summary card.
  js/export.js          "Download mission plan" (text or image) - stretch goal only.

data/ (made by scripts, committed to the repo)
  aoi.json              Area of interest: bounds, cell size (meters), grid width/height, default habitat.
  elevation.bin         Elevation grid (meters), Float32 binary, row-major, top-left origin.
  slope.bin             Slope grid (degrees), Float32 binary.
  roughness.bin         Roughness grid (meters), Float32 binary.
  slope-overlay.png     Color picture of the slope classes, for the map.
  targets.geojson       The science targets (points + descriptions + source).
  rems-temps.json       Temperature by local time of day (from Curiosity REMS), two seasons.
  rad-baseline.json     Radiation baseline number, units, date range, DOI.
  pov-images.json       List of surface photos: file, credit, where taken, NASA link.
  pov/                  Small copies of those photos (under 300 KB each).

scripts/ (run on the Mac, Python)
  01_pick_area.txt      Notes: how we chose the area, the four corner coordinates, cell size.
  02_get_elevation.py   Download/clip the elevation file for the area.
  03_make_grids.py      Resample to target cell size, fill gaps, compute slope and roughness, save .bin files.
  04_make_overlays.py   Color the slope grid into the overlay picture.
  05_prepare_rems.py    Turn REMS data into the small temperature file.
  06_prepare_rad.py     Pull the radiation baseline number into its small file.
  07_check_data.py      Sanity checks (ranges, no empty cells, file sizes, row count). Prints PASS/FAIL.

4. DATA FLOW (left to right)
NASA raw data -> scripts/ -> data/ files -> browser loads them -> map + panels + route math -> screen

5. THE SHARED "STATE" (what the app remembers)
- habitat location (map point)
- selected science target (or none)
- start point and end point of the route
- slope limit (degrees), EVA length (hours), walking speed, EVA start time (local Mars time)
- which layers are on and each layer's opacity
- the latest route result (or "none" / "unreachable")
Rule: a click or slider changes the state; the state change redraws the screen. Nothing else
keeps its own secret copy of these values.

6. WHAT EACH MATH PIECE TAKES IN AND GIVES BACK (words)
- Walk-back-time map: IN = grids, habitat cell, slope limit, speed. OUT = for every cell, seconds to
  walk back to the habitat (or "unreachable"). RUNS IN ROUTE WORKER, NOT MAIN THREAD.
  Recompute when: habitat moves, slope limit changes, speed changes, or no-go zone changes.
  This can take 200-800 ms on 90k-360k cells. Cache the result — do not recompute on every click.
- Route: IN = same, plus start and target cells. OUT = ordered list of cell positions, total distance,
  total time, steepest slope on the path, total climb and descent, or "unreachable".
  ALSO RUNS IN ROUTE WORKER. Triggered after a target is picked or changed.
- Safety summary: IN = route result, EVA start time. OUT = radiation estimate, temperature range, warnings list.
  Runs on main thread (fast math, no grid scanning needed).

7. WHEN SOMETHING GOES WRONG (every case needs a plain message)
- A map tile is missing: show that tile blank, no crash. Footer note: "No data coverage here."
- A data file fails to load: red banner on top: "Could not load [file]. Refresh the page."
- Target is unreachable (blocked by slope limit): message "No walkable route at this slope limit.
  Try raising the limit or moving the target." Show the nearest reachable spot.
- Click outside the area: gentle message "Pick a point inside the shaded study area."
- Browser too old or Worker unsupported: fall back to a slower no-worker mode OR show a "use a recent
  Chrome, Edge, Safari, or Firefox" message.

8. PERFORMANCE TARGETS (our targets, to test)
- Total data downloaded on first load: under 8 MB. (With 20 m cells: ~1.1 MB grids. Well within budget.)
- First screen visible in under 3 seconds on a normal laptop and Wi-Fi.
- Route recalculated in under 1 second. If slower: already on 20 m cells, so check the Worker setup.
- Walk-back-time map computed in under 2 seconds (Dijkstra, runs once per habitat move).
- Slider drags update the screen smoothly (do not recompute the whole map on every tiny move;
  wait until the person stops dragging for about a quarter second / 250 ms debounce).
- Worker result message is a serialized Float32Array (transferable) — do not JSON-serialize large arrays.

9. GITHUB PAGES PATH RULES (follow exactly or the public link will break)
- All file paths in HTML and JavaScript must be RELATIVE. Never start a path with /.
  WRONG:  /data/elevation.bin  or  /src/js/main.js
  RIGHT:  ./data/elevation.bin  or  js/main.js  (relative to index.html)
- GitHub Pages test: enable Pages on Saturday night (repo Settings -> Pages -> main branch -> / (root)).
  Wait 2-5 minutes for it to build. Test the link in a private/incognito window on a different network
  or your phone's data. If it works there, it will work for judges.
- If the sub-folder path breaks tiles: add a root index.html that just redirects to src/.
  Content: <meta http-equiv="refresh" content="0; url=src/">

10. CODING RULES FOR CLAUDE CODE (put these in every prompt)
- One job per file. Files stay under about 250 lines.
- Plain-English comments above every function: what it does, what it takes in, what it gives back.
- Units in names: distanceMeters, timeSeconds, slopeDegrees. Never a bare "distance".
- No magic numbers in the math. Every number comes from config.js.
- Never invent a data value. If a value is missing, show "no data".
- After each step, we run it and look at it before moving on.
- Log every AI-written file in docs/AI_USE.md the moment it is created.
