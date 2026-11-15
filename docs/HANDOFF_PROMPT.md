# Handoff prompt (paste into GPT / Codex to continue the project)

Copy everything below the line into your AI assistant, with the repo folder open (C:\Users\karth\marswalk, GitHub ScopeMint/marswalk).

---

You are continuing **MarsWalk**, our NASA Space Apps 2026 entry for the challenge "Interplanetary Survival Guide: Martian Map". Goal: win global first place. Deadline: Sunday Nov 15 2026, submit by 6 PM local (hard deadline 11:59 PM).

READ FIRST: `CLAUDE.md` (rules), `README.md` (what the app is), `docs/AI_USE.md` (log EVERY file you touch there), `docs/SOURCES.md` (cite every source), `docs/SUBMISSION_FORM_DRAFT.md` (form text, already written).

## What exists (all in `src/`; static site + installable offline PWA; plain JS globals + Leaflet 1.9.4; three.js r160 lazy-loaded; no build step)
- Real site: 4 km box on Curiosity's 2025-26 boxwork route (center 4.808 S, 137.372 E). Habitat 4.82276 S, 137.36447 E.
- Data pipeline `scripts/08..11`: HiRISE 1 m DTM -> 10 m grids (elevation/slope/roughness .bin), HiRISE 25 cm tiles `src/tiles/hirise/`, THEMIS PNGs, Curiosity traverse geojson, 5 targets at real rover positions, real Curiosity photos, 3D texture.
- Validation (live, `site-layers.js`): DTM vs 227 Curiosity waypoints = 2.4 m RMS after 12.8 m offset.
- Modules: `route.js`/`route-worker.js` (Dijkstra/A*), `site-layers.js` (HiRISE/THEMIS/relief/traverse/walk-back), `consumables.js` (Pandolf 1977 + Mars gravity, O2/CO2/water), `hazards.js` (radio shadow, rocky, near-limit ranges), `brief.js` (printable EVA cue card), `hud.js` (visor HUD replay), `marsclock.js` (Mars24, tests in `tests/`), `terrain3d.js` (3D fly-through), `tour.js` (captioned guided tour + sun chart), `interact.js` (move base, any-point target, no-go zones), `app.js` + `sw.js` + `manifest.webmanifest` (PWA, offline pack, boot screen).
- Teammate Neel removed the solar-storm feature on purpose; do not re-add.

## Rules
- Never invent numbers. Cite sources; label guesses "OUR ASSUMPTION" (on screen + `config.js`).
- No NASA logos, no AI-generated images. Relative paths only.
- `git pull --rebase` before every push, small commits, never force-push. No AI "Co-Authored-By" lines.
- After changing files listed in `src/sw.js` SHELL_FILES, bump `CACHE_VERSION`.
- Test in Chrome with DevTools console open: no red errors; run `node tests/marsclock.test.js`.

## Remaining TODO (highest value first)
1. **GitHub Pages**: needs an org/repo ADMIN (our account only has write). Settings -> Pages -> Deploy from branch -> main / (root) -> Save. Then test https://scopemint.github.io/marswalk/ in a private window, install the app, toggle airplane mode, reload: it must still work.
2. **Demo video (30 s, English subtitles)**: screen-record the in-app "▶ Tour" (captions = subtitles), trim to 30 s; upload unlisted to YouTube; put link in the form.
3. **5 screenshots**: tour caption over map, route card with suit & hazards, EVA cue card, visor HUD, 3D fly-through.
4. Fill the form from `docs/SUBMISSION_FORM_DRAFT.md`; submit; download certificate.
5. Nice-to-have: multi-stop traverse (Base -> several targets -> Base), tablet layout polish (<1100 px), light print test of the cue card.
