# data-accuracy branch: what changed (for the merge with ui-polish)

## Science numbers fixed (all checked against the original source)

| What | Before | Now | Source checked |
|---|---|---|---|
| Radiation baseline | 233 ± 12 μGy/day | **210 ± 40 μGy/day** (daily 180-225) | Hassler et al. 2014, Science 343, paper text + Table 1 |
| Solar storm | "10× scenario, 1-8 mGy, Table S2" | removed (not in the paper). Real context added: **8,100 μGy** in the 20 May 2024 storm | NASA, 10 June 2024 article |
| Radiation zones layer | "+1.5% per 100 m" | **removed** (invented) | — |
| Temperatures | 48 hand-typed values, wrong DOI (a Moon paper) | **medians of real REMS files** from NASA PDS; peak ~13-15 h LTST; Ls 180-360 is the warmer half at Gale | PDS MODRDR + REMS daily feed |
| Temperature season | hard-coded "northern spring/summer" | **today's season** from the Mars clock; EVA start converted LMST → LTST | Mars24 clock |
| Mars locations | 52 AI-written places, invented elevations/safety notes | **study area + 10 landing sites** | published landing coordinates |
| Curiosity odometry (target 4) | 38.6 km | **38.3 km** | MMGIS waypoint data |
| Rover slope check | "Curiosity's path stays on walkable slopes" | **99.9%** of the distance driven in our area is under 15°; steepest cell 19.7° (computed live) | our grid + MMGIS path |

## Model fixes
- **Turn-back point** was ~3× too late (counted display points as single cells at flat speed). Now uses the
  worker's real slope-aware time per cell. HUD replay moves at the planned pace. Works in multi-stop traverses too.
- **Slope slider no longer changes walking speed** on the same hill (fixed 25° reference slope).
- **Airlock time** (15 min out + 15 min in) now counted everywhere, not only on the cue card.
  "EVA used" is ~8 points higher than before. This is correct, not a bug.

## Text
- Assumptions panel: all ~35 model values (was 12), read live from the code, grouped.
- About, help text, welcome card, form draft, README, SOURCES.md: wrong claims removed, all DOIs checked on Crossref.
- Judging criterion renamed "Impact" (was "Influence").

## Files the ui-polish branch may conflict on
`src/js/ui.js` (Assumptions/About text, summary rows), `src/js/hud.js` (timing lines), `src/js/profile.js`
(temperature chart title + LTST shift), `src/js/layers.js` (removed rad layer + dead THEMIS functions),
`src/sw.js` (cache v8), `src/index.html` (search placeholder). Keep the data-accuracy version of any
**number or sentence**; keep the ui-polish version of any **styling**.

## Still for humans (cannot be done by code)
1. Turn on GitHub Pages: repo Settings → Pages → branch `main`, folder `/ (root)`. Test the link in a private window.
2. Everyone registered on the **Tampa** local event, not waitlisted, on the team Members tab (max 6).
3. Ask the Tampa Local Lead: exact local deadline, and whether there is a live pitch.
4. Upload the demo video to YouTube (Unlisted/Public), paste the link in the form. Re-record if the UI changed a lot.
5. Read docs/SUBMISSION_FORM_DRAFT.md once before pasting it into the form.
6. Deadline: Sun Nov 15, 11:59 PM local (unless the Local Lead says earlier).

## Datasets dropped on Nov 15 (next-improvements branch)
Not obtained in the time left, so not shown. Nothing was approximated or faked.
- CRISM minerals (prompt 1.1): needs a CRISM targeted cube over the 4 km box and parameter maps (e.g. BD1900, SINDEX2).
- CTX context mosaic (prompt 1.2): needs Murray Lab mosaic tiles cut around the box (Dickson et al.).
- Dust opacity (prompt 1.3): needs Mastcam tau or REMS UV opacity from PDS; the REMS daily report has only a UV category.
- Insolation (prompt 1.7): needs a cited model (e.g. Appelbaum & Flood) and dust opacity; skipped as the prompt allows.
