# MarsWalk

NASA Space Apps Challenge 2026 — Challenge: Mars Marswalk layered map.
Team: Dark Matter Devs

## What it is
A web-based EVA planning tool that layers five kinds of NASA science mission data at astronaut walking scale. Pick a science target near Gale Crater / Mount Sharp, and MarsWalk draws a slope-aware route with a full safety summary: distance, time, EVA budget, radiation estimate, and temperature range. It fills the gap between global Mars maps and the hyper-local needs of a single surface excursion.

## Live demo
[GitHub Pages link — add before submission]

## Science goal and location
Goal: Study boxwork formations at Gale Crater / Mount Sharp (Aeolis Mons), Mars.
Location: 6 km × 6 km study area around the Mount Sharp boxwork ridges (bounds recorded in scripts/01_pick_area.txt).

## Data layers (all NASA)
1. Topography + computed slope — HiRISE or CTX elevation model (MRO) via USGS Astropedia
2. Optical imagery — HiRISE (~0.25 m/px) and CTX (~5 m/px) tiles via NASA Mars Trek (MRO)
3. Thermal — THEMIS day/night IR mosaics (~100 m/px) via Mars Trek (Mars Odyssey)
4. Radiation + temperature — Curiosity RAD baseline and REMS temperature data (MSL)
5. Spectral/minerals — CRISM mineral map (MRO) [optional]
See docs/SOURCES.md for every source, link, and license.

## How to run it locally
1. Clone the repo.
2. In Terminal: `cd src && python3 -m http.server 8080`
3. Open `http://localhost:8080` in Chrome, Safari, or Firefox.
(Opening index.html directly will not work — data files need a local server to load.)

## Assumptions
Every assumption is labeled on screen and listed in the Assumptions panel.
Key ones: 6 km walkable range, 10 m grid cells, 15° slope limit, 3 km/h normal walking speed, 6 h EVA with 25% reserve.
See docs/ROUTE_AND_SAFETY_MODEL.md for the full model.

## AI use
Claude Code (Anthropic) wrote the application code and planning documents.
The team chose the concept, verified data sources, tested, and recorded the demo.
No AI-generated images or video. See docs/AI_USE.md for the full log.

## License
MIT — see LICENSE.
