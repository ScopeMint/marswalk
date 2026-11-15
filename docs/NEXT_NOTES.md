# NEXT_NOTES: branch `next-improvements` (Nov 15)

Work from `MARSWALK_NEXT_PROMPT.md`. Every new number is cited in `docs/SOURCES.md` (section 1 entries and the
"Reference checks" block in section 2) and every changed file is logged in `docs/AI_USE.md`.

## Done and tested in the browser (all 5 targets route, no console errors, `07_check_data.py` passes)
- **2.1 Rover check** (`src/js/rovercheck.js`, Menu > Rover check). Our planner vs Curiosity's real drive, leg by leg.
  15 deg connects 17 of 19 legs (our 3.90 km vs rover 5.42 km, average gap 17 m); 20 and 25 deg connect 19 of 19
  (our 4.44 km vs rover 7.29 km, gap 20 m). Leg length and limits are in `config.js` and the Assumptions panel.
- **2.2 Straight line vs safe route** (`src/js/straightline.js`). Route-card section plus a dashed map line with the
  too-steep stretches in red; a checkbox hides it.
- **2.6 Ranges.** Temperature P10-P90 and radiation 180-225 uGy/day on the route card, cue card, HUD and Weather page.
- **1.4 Extra REMS (part).** `scripts/13_prepare_rems_daily.py` -> `src/data/rems-daily.json`; Weather page cards for
  ground temperature, pressure and UV for the current Mars month (`src/js/weatherextra.js`).
- **1.5 Wind (note only).** The REMS daily report has no wind or humidity value for any of its 4,745 sols; the Weather
  page and the About panel say so. No wind layer.
- **1.6 Radiation over the solar cycle.** Text only in About (Hassler 2014 measured near solar maximum; Guo et al. 2015:
  dose varies with pressure and solar modulation). No new multiplier. The 8,100 uGy storm note is kept.
- **1.8 / 1.9 Citations.** All `[TO VERIFY]` lines in SOURCES.md resolved. Landing-site names confirmed on the Mars24
  lander page. Curiosity size confirmed on NASA's mission page (10 x 9 x 7 ft); the 3D rover height was 2.2 m and is
  now 2.1 m. The About and form reference lists no longer cite Wikipedia for landing sites.
- **2.3 Slope method.** About explains the simple central-difference gradient. `python scripts/14_check_slope.py`:
  500 random cells recomputed by hand match `slope.bin` (largest difference 0.0000 deg). Horn's 3x3 method would differ
  by a median of 0.35 deg (90th percentile 1.10 deg).
- **2.4 Walking speed reference.** About: the one measured lunar speed in Carr & McGee 2009 (Apollo 11 run, ~3.2 km/h).
  Defaults not changed.
- **2.5 Energy check.** About shows our Pandolf average in kcal/h next to the measured 100-500 kcal/h EVA range
  (Waligora & Horrigan 1974). Target 5: 324 W = 279 kcal/h, inside the range.
- **3.2 3D route + turn-back flag.** The route was already draped in 3D. Added a "TURN-BACK POINT" pin in the orbit view,
  from the same `computePointOfNoReturn()` as the map, cue card and HUD.
- **3.5 Memory (part).** 3D opened and closed 10 times: JS heap 14 MB before, 14 MB after. FPS not measured.
- **4.1 Why this site, 4.3 Apollo 17 comparison, 4.4 Honest limits.** New About sections (`src/js/story.js`). Apollo 17
  numbers from NASA's mission page; the Marswalk numbers are read live from the route.
- **4.5 README.** New "How we know the numbers are right" table.
- **4.6 Submission form draft.** Rover check, straight line, four pages, Weather extras, new checks and all new
  references added.
- **5.1 Offline (part).** Every new file is in `sw.js`; cache is now `marswalk-v17`. Offline mode not tested.
- **5.3 Error paths (part).** Unreachable target at 5 deg shows "No walkable route at this slope limit..." with no crash.

## Already done by a teammate (not redone)
- **3.1 Floating habitat.** On main the habitat sits on a graded pad and the rover label follows the rover.
- **4.2 Mission timeline.** The EVA cue card (`brief.js`) is already a printable timeline with PET, local time, stations
  and the turn-back rule.

## Not done (and why)
- **1.1 CRISM, 1.2 CTX, 1.3 dust opacity, 1.7 insolation:** each needs a new dataset download and processing; not
  started in the time left. Nothing was faked. See `docs/DATA_NOTES_FOR_MERGE.md`.
- **2.7 Unit tests:** Node is not installed on this PC, so no JavaScript test could be run. None written.
- **3.3 LOD terrain, 3.4 photo billboards in 3D:** not started.
- **5.2 slow-network states, 5.4 other browsers and screen sizes, 5.5 page weight:** not checked.

## For whoever merges
- `node tests/marsclock.test.js` and `node --check` were NOT run here (no Node). Run them before merging to main.
- The README energy line quotes target 5 (about 280 kcal/h). Other targets give other values; the About panel shows
  the live one.
