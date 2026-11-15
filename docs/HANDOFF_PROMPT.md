# Handoff prompt (paste into GPT / Codex to continue the project)

Copy everything below the line into your AI assistant, with the repo folder open (C:\Users\karth\marswalk, GitHub ScopeMint/marswalk).

---

You are continuing **MarsWalk**, our NASA Space Apps 2026 entry for the challenge "Interplanetary Survival Guide: Martian Map". Goal: win global first place. Deadline: Sunday Nov 15 2026, submit by 6 PM local (hard deadline 11:59 PM).

READ FIRST: `CLAUDE.md` (rules), `docs/AI_USE.md` (log every file you touch there), `docs/SOURCES.md` (cite every source).

## What exists (all in `src/`, static site + installable PWA, plain JS + Leaflet 1.9.4, no build step)
- Study area: 4 km x 4 km on Curiosity's REAL 2025-26 boxwork route, Mount Sharp, Gale Crater (center 4.808 S, 137.372 E). Habitat at 4.82276 S, 137.36447 E.
- Data (scripts/08_build_real_site.py, 09_get_themis.py): HiRISE 1 m DTM -> 10 m grids (`elevation.bin`, `slope.bin`, `roughness.bin` = 1 m rock & ridge relief), HiRISE 25 cm tiles in `src/tiles/hirise/{z}/{x}/{y}.jpg`, THEMIS day/night PNGs, Curiosity traverse (`curiosity-traverse.geojson`), 5 targets (`targets.geojson`) at real rover positions + 1 unvisited boxwork field, real Curiosity photos (`data/pov/`).
- Validation: our DTM matches Curiosity's own elevations at 227 waypoints, 2.4 m RMS after a 12.8 m datum offset (computed live in `site-layers.js`, shown in About).
- Route: Dijkstra/A* in `route-worker.js` (slope limit, uphill/downhill speed, roughness penalty), walk-back map, point of no return.
- Visor HUD + walk replay: `hud.js`, `hud.css` (full-screen map mode).
- Mars clock: `marsclock.js` (Mars24 algorithm: sol, LMST, Ls, sun elevation) — check it is wired in `index.html` + `main.js`.
- Safety: radiation (RAD, Hassler 2014), temperature (REMS), checklist, solar-storm mode.

## Rules you must follow
- Never invent numbers. Sourced numbers cite the paper/URL; our own guesses are labelled "OUR ASSUMPTION" on screen and in `config.js`.
- No NASA logos, no AI-generated images.
- Relative paths only (GitHub Pages serves the repo root; root `index.html` redirects to `src/index.html`).
- Commit small, `git pull --rebase` before every push, never force-push. Teammate Neel also pushes to main.
- Do not add "Co-Authored-By" AI lines to commits.

## Remaining TODO (highest value first) — check `git log` for what is already done
1. Enable GitHub Pages (repo Settings -> Pages -> main / root) if not on; test https://scopemint.github.io/marswalk/ in a private window.
2. Test the full app in Chrome: no console errors; every target routes; HUD plays; PWA installs; works offline after first load.
3. Demo: 30 s video with English subtitles (see docs/DEMO_SCRIPT.md), 5 screenshots.
4. Fill docs/SUBMISSION_FORM_DRAFT.md with the new real-data story (HiRISE 1 m, real rover positions, validation number, offline app, HUD, Mars clock, consumables model).
5. Polish: README with screenshots, What/Why/How-to-run, credits.
