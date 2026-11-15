# NEXT_NOTES: branch `next-improvements` (Nov 15)

Work from `MARSWALK_NEXT_PROMPT.md`, done on one teammate's clone. Not merged to main.

## Done and tested in the browser (no console errors, data check passes)
- **2.1 Rover check** (`src/js/rovercheck.js`, Menu > Rover check). Our planner vs Curiosity's real drive, leg by leg.
  Result on the current grids: 15 deg connects 17 of 19 legs (our 3.90 km vs rover 5.42 km, average gap 17 m);
  20 deg and 25 deg connect 19 of 19 (our 4.44 km vs rover 7.29 km, average gap 20 m).
  Leg length (300 m) and the three limits are test settings in `config.js` (`roverCheck`) and are listed in the Assumptions panel.
- **2.2 Straight line vs safe route** (`src/js/straightline.js`). New fold-out section in the route card plus a dashed
  line on the map; too-steep stretches are red; a checkbox hides the line.
- **2.6 Ranges.** Temperature shows the day-to-day range (P10-P90) on the route card, Weather page and chart band.
  Radiation shows its range (from the 180-225 uGy/day daily values) on the route card, cue card, HUD and Weather page.

- **1.4 Extra REMS (part).** `scripts/13_prepare_rems_daily.py` builds `src/data/rems-daily.json` from the REMS daily
  report (4,745 sols, grouped into 12 Mars months of 30 deg Ls). Weather page shows ground temperature, air pressure and
  UV category for the current Mars month (`src/js/weatherextra.js`). Humidity and wind: the report has no value for any
  sol, and the page says so. Not done from 1.4: hourly (not daily) ground temperature, and a seasonal pressure chart.

## Checked, no change needed
- **3.1 Floating habitat.** On current main the habitat sits on a graded pad at the highest ground under it, and the
  "ROVER (illustrative)" label follows a visible rover. `walk3d.js` was not touched.

## Not done (and why)
- 1.1 CRISM, 1.2 CTX, 1.3 dust, 1.5 wind (beyond the one-line note), 1.6-1.9: need dataset downloads and citation checks; not started.
- 2.3 slope method note, 2.4 walking-speed references, 2.5 metabolic check: not started.
- 2.7 unit tests: Node is not installed on this PC, so no test could be run. Not written.
- 3.2-3.5, 4.x story pages, 4.5-4.6 README and form, 5.x robustness: not started.

## For whoever merges
- `docs/SUBMISSION_FORM_DRAFT.md` is not updated. If the rover check is quoted there, use the numbers above and say
  the rover's distance includes science stops.
- The submission claim "Curiosity's own path stays on slopes our model rates as walkable" should match the rover check:
  at 15 deg our planner connects 17 of 19 legs, not all.
- `node tests/marsclock.test.js` and `node --check` were NOT run (no Node here). Run them before merging.
