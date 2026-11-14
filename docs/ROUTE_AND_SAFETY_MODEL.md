ROUTE AND SAFETY MODEL (words only, no code)

All numbers marked [A] are OUR ASSUMPTIONS. They are shown on screen and live in config.js.
Numbers marked [S] must come from a cited source. If we cannot cite one, we do not show it.

0. GRID CELL SIZE DECISION
START WITH 20 m CELLS (300 x 300 = 90,000 cells), not 10 m.
Reason: A* on 90k cells with 8 neighbors takes ~100-300 ms. On 360k cells it takes ~400-1200 ms.
Both fit the 8 MB budget. 20 m is safe; 10 m is a performance gamble at hackathon pace.
UPGRADE TO 10 m cells ONLY IF both of these are true:
  - Route computes in under 200 ms consistently on your laptop, AND
  - Walk-back-time map computes in under 500 ms.
Document the chosen cell size in config.js and scripts/01_pick_area.txt.

1. THE MAP AS A GRID
- The study area is a grid of cells (default 20 m, optionally 10 m). [A]
- Each cell stores: elevation (m), slope (degrees), roughness (m), and whether it is inside a no-go zone.
- Each cell connects to its 8 neighbors (up, down, left, right, and the four diagonals).
  A diagonal step is about 1.414 times as long as a straight step.

2. WHICH CELLS CAN BE WALKED?
A cell is BLOCKED if:
  - its slope is above the slope limit (default 15 degrees, slider 5 to 25) [A], or
  - it is inside a no-go zone the user drew, or
  - it has no elevation data.
Otherwise it is walkable.

3. HOW LONG DOES A STEP TAKE?
- Flat-ground walking speed: slow 2 km/h, normal 3 km/h, fast 4 km/h. Default normal. [A]
  (Spacesuit walking is slower than normal walking on Earth.)
- Speed changes with slope along the direction of the step:
    going uphill: speed drops in a straight line from full speed at 0 degrees to 40 percent of full speed
                  at the slope limit. [A]
    going downhill: same drop, but milder (half as much slowdown). [A]
- Rough ground: if roughness is above a "rough" threshold [A], add 25 percent to the time for that step.
- Step time = step length divided by the speed that applies.
(These are simple teaching-level rules, and we say that on screen.)

4. TWO CALCULATIONS — BOTH RUN IN route-worker.js (NOT the main thread)
(a) WALK-BACK TIME MAP
  Start at the habitat. Spread outward to find the fastest walking time from the habitat to every walkable
  cell. (This is the classic "shortest path" method, Dijkstra.) Result: a number of seconds for every cell.
  Because walking uphill and downhill differ, "to the habitat" and "from the habitat" can differ a little.
  We compute the time to walk BACK to the habitat (what matters for safety): run the spreading step with
  uphill/downhill reversed.
  Shown as the optional "Walk-back time" layer: bands such as 0-15, 15-30, 30-60, 60-90, over 90 minutes.
  PERFORMANCE NOTE: Dijkstra on 90k cells with a binary heap = ~20-50ms. On 360k cells = ~100-400ms.
  Cache the result in a Float32Array. Only recompute when: habitat moves, slope limit changes, speed
  changes, or no-go zone changes. Do NOT recompute on every target selection.
  The Worker sends the result as a transferable ArrayBuffer (fast, no copy).

(b) THE ROUTE
  Find the fastest path from the habitat to the target (A* with euclidean distance heuristic, or reuse
  the walk-back spreading step). Result: ordered list of cells, then total distance, time, steepest slope,
  total climb and descent, and elevation along the path for the profile chart.
  Smooth the path a little for display (remove tiny zig-zags using a simple line simplification) without
  changing the numbers. The displayed line may be smoother; the numbers stay raw.

5. EVA BUDGET RULES [A]
- EVA length (default 6 hours, slider 2 to 8).
- Work time at the target (default 60 minutes) [A].
- Reserve: at least 25 percent of EVA length must remain unused [A].
- Budget used = (time out + work time + time back) divided by EVA length.
- Pass if budget used is 75 percent or less. Caution between 75 and 90 percent. Fail above 90 percent.
- Also check: walk-back time from the target, alone, must be less than the remaining time.

6. RADIATION ESTIMATE
- Baseline [S]: one published surface dose rate from Curiosity RAD. Value, unit, date range, DOI, saved in
  rad-baseline.json. Not typed into code by hand.
  Source: Hassler et al. (2014), Science 343(6169), doi:10.1126/science.1244797
  Expected value: ~233 μGy/day (micro-gray per day) from galactic cosmic rays — verify in the paper.
- EVA estimate = baseline per day x (EVA hours used / 24).
- Show it as a value with the note: "Baseline measured by Curiosity's RAD instrument at Gale Crater.
  Not inside a spacesuit. Solar storms not included."

RESEARCH TASK (Saturday morning, 30 minutes):
  Look for NASA-STD-3001 Volume 2 short-term EVA radiation dose limit.
  URL: https://www.nasa.gov/sites/default/files/atoms/files/nasa-std-3001-vol-2.pdf
  Search for: "radiation", "EVA dose", "permissible exposure limits"
  If a specific limit is found with units and threshold: add pass/caution/fail to the radiation card.
  This would be a significant scoring advantage on the Validity criterion.
  If not found by Saturday 6 PM: show estimate only with note "EVA dose limit not modeled."
  NEVER add a pass/fail without a cited source.

7. TEMPERATURE CHECK
- Use the REMS-based temperature-by-hour file [S]. Show min and max temperature during the EVA window.
- Caution/fail thresholds only if we find a sourced suit temperature limit. Otherwise show the range only
  and the note "Suit limits not modeled."

8. SAFETY CHECKLIST LOGIC (what the summary card shows)
  - Slope within limit ............ pass if steepest slope on route is at or below the limit
                                    (it always should be; this proves the route logic)
  - Round trip fits in EVA time ... uses budget rule (section 5)
  - Reserve time kept ............. pass if at least 25 percent of EVA remains
  - Temperature range ............. informational, with source
  - Radiation estimate ............ informational, with source (and pass/fail if limit found)
  - Route avoids no-go zones ...... pass if none crossed (should always be pass)
  - Warnings (amber): route length is more than 1.5 times the straight line (big detour);
    target is very close to the study-area edge; steepest slope is within 2 degrees of the limit.

9. EDGE CASES (each needs a clear message, no crash)
  - Start equals target
  - Target inside a blocked cell
  - Target unreachable (surrounded by steep terrain)
  - Habitat moved into a blocked cell
  - Slope limit moved while a route is shown (recalculate, keep the target)
  - A no-go zone drawn over the habitat or target
  - Data missing for some cells (holes)
  - EVA length shorter than needed (fail message, still show the route)

10. TEST PLAN (all manual, write results in docs/TEST_LOG.md on Sunday)
  T1  Flat-ish area, short route: route length close to straight line (ratio about 1.0 to 1.1).
  T2  Put a very steep cliff between habitat and target: route goes around or says unreachable.
  T3  Slope limit 25 then 5: route gets shorter then detours or fails.
  T4  Slider extremes do not crash.
  T5  Move habitat: walk-back map redraws and is centered on the new spot.
  T6  Draw a no-go zone across the route: route avoids it.
  T7  Pick the habitat as target: friendly message.
  T8  Compare elevation at 5 spots with the Trek viewer: values agree closely.
  T9  Visual check: slope colors high on cliffs seen in the imagery, low on flat plains.
  T10 Hand check: estimate a route time with a calculator for a short straight stretch; the app agrees.
  T11 Units: distance in km, time in minutes, slope in degrees, everywhere. No mixed units.
  T12 Run in Chrome, Safari, and Firefox. Open the public link in a private window.

11. WHAT THIS MODEL CANNOT DO (we say it openly on the About page)
  - Elevation data cannot see single boulders. The no-go zones and the imagery help, but a human must check.
  - Soil softness and dust are not modeled.
  - Suit and gear details are not modeled.
  - Radiation and temperature are baselines, not forecasts.
  - Walking speed model is a simple linear approximation, not a biomechanical simulation.
