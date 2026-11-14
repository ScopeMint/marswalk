# CLAUDE.md - MASTER PROJECT FILE (read fully at the start of every session)

Project: MarsWalk   Team: Dark Matter Devs   Team size: 4 (2 primary builders: Data+Route / Map+UI)
Event: 2026 NASA Space Apps Challenge, theme "The Next Frontier". Hackathon Sat Nov 14 - Sun Nov 15, 2026.
Submission window: Sat 9:00 AM -> Sun 11:59 PM local time. OUR TARGET: submit Sun by 6:00 PM.
Goal: submit a project strong enough to reach GLOBAL judging.

## 0. HOW TO WORK WITH THIS USER (applies to every reply)
- User is a novice coder using AI help. Explain in very simple words, short, key numbers only.
- One small step at a time. After each step say: how to run it, what they should see.
- When the user asks for a change, just do it (no permission needed). Ask only about the open decisions in section 15.
- Never write code the user cannot explain to a judge. Simplify instead.
- If something breaks, show the exact error text; do not guess silently.
- Commit after each working step. Log every AI-written file in docs/AI_USE.md immediately.

## 1. STATUS RIGHT NOW
- Folder has plans and templates only. NO application code exists. That is intentional.
- DO NOT WRITE ANY APP/SOLUTION CODE BEFORE Sat Nov 14, 2026 9:00 AM LOCAL (event rule: work starts when the event starts).
- Tonight (Fri) allowed: read docs, check tools, git init/commit, connect GitHub, fill name placeholders.
- First-session action list is in section 14.

## 2. THE CHALLENGE (NASA's statement, condensed faithfully)
Difficulty: Intermediate. Subjects: Human Exploration, Mars, Planets & Moons, Software, Space Exploration.
Context: The first astronauts on Mars will want the best possible map, with route details, destination details,
current conditions, and the data to finish the mission quickly and safely. Humans can do science robots cannot
(critical thinking, real-time context). Today's human exploration focus is the Moon (Artemis, Moon Base planning);
NASA science missions pave the way for new destinations. Mars data is rich but not yet layered in the combinations
needed to plan human missions. JPL Mars Trek and the USGS-NASA Planetary Geologic Mapping Program layer data on a
global map, but are built for regional/global views, NOT the hyper-local areas of single spacewalks/excursions.
CHALLENGE: Create a map, tool, or interface a Mars astronaut could use during a surface exploration mission, using
NASA data and tools. Make a LAYERED, INTEGRATED view of a location or route on the Martian surface that pulls
together data from MULTIPLE NASA science missions and could help a human explorer plan and carry out a successful
"Marswalk" while doing new science.
Suggestions in the statement:
- Start by choosing science goals and a location (example: boxwork formations, studied by Curiosity in 2025 at the
  Mount Sharp region).
- Use a well-explored location (rovers, lots of imagery) or challenge yourself with a less-studied one.
- Include AT LEAST THREE kinds of data (optical, thermal, spectral, topographic, geophysical, atmospheric, radiation,
  chemical are examples), layered so they help navigate the location.
- Astronaut SAFETY comes first: radiation environment (consider space weather), suit mobility, carrying equipment.
  If possible include a ROUTE MAP that reaches science objectives while avoiding major obstacles (large rock formations).
- Format is free: display inside the spacecraft/habitat, tablet app, helmet visor HUD, static snapshot, interactive
  product, or a system that generates maps for different places/data.
- Time frame is free: past data, predicted future conditions, or none (stable data like topography/geology).
- Look at maps made for the Moon, Earth, other planets for inspiration.
- Use surface point-of-view images from NASA Mars missions so the astronaut knows what to expect.
- Consider rovers/robots transporting crew and tools, or astronauts working in pairs.
- Data/resources are on the challenge's Resources tab on spaceappschallenge.org.

## 3. OUR CONCEPT (decided)
"MarsWalk": a web app for ONE named science goal: study boxwork formations at Gale Crater / Mount Sharp.
Why this site: matches the example in the statement; Curiosity's radiation (RAD) and weather (REMS) data come from
Gale; abundant imagery and elevation data.
User flow: pick a target -> app draws a safe walking route from the habitat -> summary card with distance, time,
steepest slope, climb/descent, walk-back time, EVA time used, radiation estimate, temperature range, safety checklist.
It is a PLANNING CONCEPT, not flight software (say so on screen).
Five data layers (need 3): (1) topography + computed slope, (2) optical HiRISE/CTX imagery, (3) thermal THEMIS,
(4) radiation baseline (RAD) + temperature (REMS), (5) spectral CRISM minerals [optional].
Plus: real Curiosity point-of-view photos near each target, walk-back-time map, EVA time budget with reserve.

## 4. JUDGING + AWARDS (design every feature to score on these)
Five criteria: Influence (impact), Creativity (novel vs incremental), Validity (scientifically sound, cited,
honest assumptions), Relevance (answers the challenge, complete, usable), Presentation (story; weighted equally).
Global awards to aim for: Best Use of Data, Best Mission Concept, Best Use of Technology (also: Best Use of Science,
Galactic Impact, Most Inspirational, Best Storytelling, Art & Technology).
Judging path: Local judging -> Global Nominees -> NASA/space-agency expert review -> Global Finalists -> Winners.
NASA data use is REQUIRED for global-award eligibility. (Criteria come from the 2024 guide; check the 2026 guides.)

## 5. HARD RULES (breaking these can disqualify us)
1. No app code before the event starts (see section 1).
2. CITE EVERY SOURCE (data, libraries, images, ideas, even open-source) in docs/SOURCES.md the moment we use it.
   NASA may remove awards for missing citations. License info for all materials must be documented.
3. DISCLOSE AI USE. Log every file in docs/AI_USE.md. Form field "Use of AI" must say Claude Code wrote code, humans
   chose the idea, checked sources, tested.
4. No NASA logos/branding anywhere. No AI-generated images or video. Only real screenshots and credited NASA photos.
5. Never invent a number. No source = do not show it. Our own guesses are labeled "our assumption" on screen.
6. Original work + open-source license in repo (MIT in place). No personal info, no secrets, no huge raw files in repo.
7. Final project link must be public, no login/password. Project text and demo in English.
8. All team members must be confirmed at the SAME Local Event. Submission is final.

## 6. SUBMISSION REQUIREMENTS (from the 2025 guide - verify against 2026 guide on Sat)
Form fields: project name; high-level summary; link to demo (ONE public link); link to final project (public);
detailed description; NASA data used; space-agency partner and other data/tools; use of AI; references (all sources);
checkboxes: Terms and Conditions + Confirm All Work is Original. Then "Submit for Judging" (look for the banner).
Demo: EITHER video up to 30 s with English subtitles OR slide deck up to 7 slides (English; include team name, member
names, challenge). Host externally (YouTube/Drive/GitHub), public, test logged out. Images upload only: JPG/PNG/GIF
up to 10 MB. Use "Save Progress" often (saved text is publicly visible). Certificate downloads from profile after submit.
Planned demo: 30-second video, 5 beats (~6 s each): problem; pick location; layers on; route draws; safety summary.
Backup: 7-slide deck with real screenshots. Drafts live in docs/SUBMISSION_FORM_DRAFT.md and docs/DEMO_SCRIPT.md.

## 7. FEATURE LIST (priority: P0 must ship, P1 should, P2 stretch)
ID  Pri Feature                                  Done when
F1  P0  Base map: Mars Trek imagery tiles, study-area outline, scale bar, coordinate readout   tiles show in right place
F2  P0  Load grids (elevation, slope, roughness) from data/                                     grids load, values sane
F3  P0  Slope-class overlay (5 classes, legend)                                                 cliffs show red, plains green
F4  P0  Layer panel: on/off, opacity, "i" info (mission, resolution, source), legend           all layers controllable
F5  P0  Habitat marker + 4-6 science target markers and cards (name, why it matters, distance)  click card -> map flies
F6  P0  Route planner: fastest walkable path habitat -> target; blocked cells above slope limit  route draws <1 s
F7  P0  Summary card: distance, time, steepest slope vs limit, climb/descent, walk-back time,
        EVA budget % bar, radiation estimate, temperature range                                 numbers match model
F8  P0  Safety checklist (pass/caution/fail, icon + words)                                      rules from section 10
F9  P0  Controls: slope limit, EVA length, walking speed preset, EVA start time                  live update
F10 P0  Example mission preloaded on open; "Try your own mission" and "Reload example"          route visible on load
F11 P0  Assumptions panel + About & Sources panel (+ AI-use statement)                          every number traceable
F12 P0  Radiation card: sourced RAD baseline x EVA hours                                        source + limits noted
F13 P0  Temperature chart for EVA window from REMS-based file                                   night < day
F14 P0  Point-of-view photo drawer with credit + link                                           photo per target
F15 P0  Elevation profile chart of route (steep parts shaded)                                   matches route
F16 P0  Hover tooltip: elevation, slope, walk-back minutes                                      values show
F17 P1  Thermal layer (THEMIS day/night toggle)                                                 toggle works
F18 P1  Walk-back-time layer (bands 0-15, 15-30, 30-60, 60-90, 90+ min)                         recolors on habitat move
F19 P1  Move habitat (click map)                                                                recalculates
F20 P1  No-go zones (draw polygons over rocky ground; route avoids)                             route detours
F21 P1  Welcome card (3 steps), friendly error messages                                         copy from section 11
F22 P1  CRISM mineral layer                                                                     only if data found by Sat 2 PM
F23 P2  Visor mode (high-contrast simplified HUD)
F24 P2  Compare two slope limits side by side
F25 P2  Download mission plan
F26 P2  Solar-storm scenario (ONLY with a sourced number)
F27 P2  Second science location
CUT ORDER if behind: F22, F17, F13, F18, F20, F14 (keep text). NEVER cut: F1-F8, F10-F12, F15.

## 8. DATA PLAN (details: docs/DATA_PLAN.md)
Study area: ~6 km x 6 km square near Mount Sharp boxwork (~0.10 degrees; Mars ~59 km per degree). Grid 10 m cells
= 600 x 600 = 360,000 cells; ~1.4 MB per grid (Float32 binary); 3 grids ~4.3 MB. Budget: under 8 MB total first load.
(Our assumption: 6 km walkable range. Fallback grid: 20 m cells = 90,000 cells if route is slow.)
Pick the area FIRST (Sat 9:15): Mars Trek -> Gale -> Mount Sharp -> find boxwork ridges -> confirm HiRISE coverage and an
elevation model (DTM) -> draw the box -> record 4 corners in scripts/01_pick_area.txt -> flattest spot = habitat ->
4-6 science targets >= 1 km apart (name, point, one-line why, evidence source, photo ID; label "our selection").
Layers:
A Topography/slope: real elevation FILE needed (tiles are pictures, not numbers). Ladder: HiRISE DTM (~1 m) > CTX DTM
  (~20 m) > MOLA/HRSC blend (~200 m, too coarse; say so if used). Scripts: resample to 10 m (average), fill holes,
  slope in degrees from neighbors, roughness = elevation spread among nearby cells. BIGGEST RISK - test first.
B Optical: Mars Trek HiRISE (~0.25 m/px) and CTX (~5 m/px) tiles, loaded live. Missing tile = no coverage. First test:
  one tile on a Leaflet page; settle tile row/col order and zoom numbering. Use open trek.nasa.gov tiles, no API key.
  URL pattern: endpoint/1.0.0/Style/TileMatrixSet/TileMatrix/TileRow/TileCol (png or jpg per product).
C Thermal: THEMIS day/night IR (~100 m/px) as tiles if available; legend "relative brightness (warmer = lighter)";
  no Kelvin/Celsius values unless sourced.
D Spectral: CRISM minerals, optional. Fallback: science targets text with cited Curiosity findings.
E Radiation + weather: RAD published surface dose rate at Gale -> ONE sourced baseline (value, unit, date range, link,
  note "measured on the rover, not in a suit"; EVA estimate = baseline per day x EVA hours/24). REMS air/ground temp ->
  small file: typical temperature by local hour, two seasons. MAVEN solar storm info only if a sourced number exists.
F POV photos: Curiosity Mastcam/Navcam, 1 per target (4-6), copies under 300 KB in data/pov/, with image ID, sol,
  credit, link to NASA. Real photos only.
Honesty rules: every number has a hover/tap source note; remove any number not sourced by Sat 6 PM; state limits
(elevation cannot see single boulders; radiation measured on rover; speed and slope limit are our assumptions).

## 9. ARCHITECTURE (details: docs/ARCHITECTURE.md)
Static site: HTML + CSS + plain JavaScript + Leaflet. Python data prep scripts run once. No server, no API keys.
Route math in a Web Worker. Relative paths only (GitHub Pages sub-folder). One page opens with example mission.
Planned files:
 src/index.html, src/css/styles.css (all colors in one list at top)
 src/js/config.js  ALL assumptions/numbers in ONE place; the Assumptions panel reads from it
 src/js/state.js   single shared state: habitat, target, start/end, slope limit, EVA hours, speed, start time,
                   layer visibility/opacity, selected target, latest route result
 src/js/main.js (startup order), map.js (Leaflet), layers.js (catalog + legends + citations), grid.js (load grids,
 map position <-> cell), route.js (pure math), route-worker.js, safety.js (radiation, temperature, warnings),
 targets.js, pov.js, profile.js (canvas chart, no chart library), ui.js (panels, summary card), export.js (P2)
 data/: aoi.json (bounds, cell size, grid width/height, default habitat), elevation.bin, slope.bin, roughness.bin,
 slope-overlay.png, targets.geojson, rems-temps.json, rad-baseline.json, pov-images.json, pov/ (photos)
 scripts/: 01_pick_area.txt, 02_get_elevation.py, 03_make_grids.py, 04_make_overlays.py, 05_prepare_rems.py,
 06_prepare_rad.py, 07_check_data.py (PASS/FAIL checks)
Rule: click/slider -> change state -> state change redraws screen. No hidden copies of values.
Coding rules: one job per file, under ~250 lines; plain-English comment above each function (does what, takes what,
gives what); units in names (distanceMeters, timeSeconds, slopeDegrees); no magic numbers (use config.js); never invent
data ("no data" instead); run and look at each step before the next; update SOURCES.md and AI_USE.md as you go.
Performance targets: first load under 8 MB and 3 s; route under 1 s (else 20 m cells); debounce sliders ~250 ms.
Errors (always a plain message, never a crash): missing tile -> blank + "No data coverage here"; data file fails ->
red banner "Could not load [file]. Refresh the page."; unreachable target -> message + nearest reachable spot; click
outside area -> "Pick a point inside the study area."; no Worker support -> slower fallback or browser message.
GitHub Pages: serve from main/root with a small root index.html redirecting to src/ (decide Sat). Test link in a
private window.

## 10. ROUTE + SAFETY MODEL (details: docs/ROUTE_AND_SAFETY_MODEL.md). [A] = OUR ASSUMPTION (label on screen), [S] = sourced
Grid: 10 m cells [A], 8 neighbors, diagonal step = 1.414 x straight. Each cell: elevation, slope, roughness, no-go flag.
Blocked cell: slope > slope limit (default 15 deg, slider 5-25) [A]; inside a no-go zone; or no data.
Step time = length / speed. Flat speed presets: slow 2, normal 3 (default), fast 4 km/h [A]. Uphill speed falls linearly
from 100% at 0 deg to 40% at the slope limit [A]; downhill slowdown is half as strong [A]. Rough ground (above a
roughness threshold [A]) adds 25% time. Use along-step elevation change for up/down; cell slope for blocking.
Calc (a) walk-back-time map: shortest-path (Dijkstra) spreading from the habitat, computed for the walk BACK (reverse
up/down). Layer bands in minutes. (b) Route: fastest path habitat -> target (A* or reuse spreading); smooth for display
without changing numbers. Output: distance, time, steepest slope, climb, descent, elevation profile, or "unreachable".
EVA budget [A]: default 6 h (slider 2-8); work time at target 60 min; reserve >= 25% of EVA unused.
Budget used = (out + work + back) / EVA length. Pass <= 75%; caution 75-90%; fail > 90%. Also: walk-back time from
target must be less than remaining time.
Radiation [S]: baseline per day from RAD x EVA hours/24; show with note "Baseline measured on the rover at Gale.
Suit shielding and solar storms not included." No pass/fail unless a cited limit is found.
Temperature [S]: min/max over the EVA window from the REMS file; "Suit limits not modeled" unless a cited limit is found.
Checklist: slope within limit; round trip fits in EVA time; reserve kept; temperature (info + source); radiation
(info + source); route avoids no-go zones. Amber warnings: route > 1.5 x straight line; target near area edge;
steepest slope within 2 deg of the limit.
Edge cases (each needs a message): start = target; target in blocked cell; target unreachable; habitat moved into blocked
cell; slope limit changed while route shown (recalc, keep target); no-go zone over habitat/target; data holes; EVA too
short (fail message, still show route).
Cannot model (say so on About page): single boulders, soil softness/dust, suit/gear details, radiation forecasts.

## 11. UI SPEC (details: docs/UI_DESIGN.md)
Goal: judge understands in 10 s, sees a route in 30 s. Target 1440x900; works to ~1100 px; phones show "best on a laptop".
Opens with example mission "Boxwork Survey" already routed. 3-step dismissible welcome card.
Regions:
 TOP BAR (56 px): project name + tagline "Walk Mars safely: a layered EVA planner"; mission title; buttons: About and
   Sources, Assumptions, Reload example.
 LEFT PANEL (300 px) Mission setup: science goal dropdown ("Study boxwork formations"); 4-6 target cards (name, one-line
   why, distance from habitat); sliders (slope limit 5-25 default 15; EVA length 2-8 default 6; walking speed presets;
   EVA start time, local Mars time, default morning); "Move habitat"; "Draw no-go zone" with delete list.
 CENTER MAP: Leaflet imagery; study-area outline, outside slightly darkened; habitat icon; numbered target circles;
   thick route line; hatched amber no-go zones; scale bar; coordinate readout; hover tooltip; floating SUMMARY CARD top-right.
 RIGHT PANEL (260 px) Layers: Imagery (on), Slope classes (on, 60%), Walk-back time (off), Thermal (off, day/night toggle),
   Minerals (only if data), Science targets (on); each with switch, opacity slider, "i" info; legend for active layers.
 BOTTOM BAR (200 px, collapsible): elevation profile (left), EVA temperature chart with EVA window shaded (right).
Summary card rows (big numbers): distance km; one-way minutes; steepest slope + "limit 15" tag; climb/descent m;
walk-back minutes; EVA used % bar; radiation estimate; temperature range; then safety checklist; button "Show photo".
POV drawer (slides from right): large photo, caption (camera, sol), credit + NASA link, prev/next, "What you should
expect on arrival" 2-3 lines; fallback "No surface photo near this target yet".
Assumptions modal: table (name, value, why, "our assumption" or source) + "This is a planning concept, not flight software."
About and Sources modal: what/why, the 5 layers and missions, all sources + licenses, AI-use statement, limits, team names,
challenge name.
Style: dark mission-control. Colors (hex, one list at top of styles.css): background #0F1115; panel #181B22; border #2A2F3A;
text #E8E6E3; muted #A3A8B3; accent Mars orange #D9622B; route #3FD0C9; pass #46C37B; caution #F2B134; danger #E5484D.
Slope classes: 0-5 #2E7D5B very gentle; 5-10 #8FBF4D gentle; 10-15 #F2B134 moderate; 15-20 #E8742E steep; >20 #E5484D very steep
(red starts at the slider limit when possible). Fonts: system sans-serif; monospace for numbers. Body >= 14 px; summary
numbers 24-28 px. Text contrast >= 4.5:1. 8 px spacing grid. Motion ~200 ms, respect reduce-motion.
Accessibility: Tab/Enter works everywhere, labeled controls, visible focus, never color alone (icon + words).
Exact microcopy: Empty route "Pick a target to plan a route."; Blocked "No walkable route at this slope limit. Try raising
the limit or choosing a closer target."; Outside "Pick a point inside the study area."; Loading "Loading Mars data...";
Footer "Data: NASA Mars missions. A planning concept, not flight software."

## 12. BUILD ORDER + SCHEDULE (details: docs/BUILD_ORDER.md)
Milestones: M0 setup (tonight) | M1 area + data chosen | M2 one tile on a Leaflet page | M3 grids made + sanity checks |
M4 map + layers + panels | M5 route planner | M6 safety cards | M7 targets + POV | M8 polish + About + tests | M9 submit.
WORKING VERSION (through M6) due Sat 10 PM.
SAT: 9:00 start; 9:15 M1; 10:30 M2; 11:30 M3 elevation file (fallback ladder if blocked); 1:00 grids + UI layout in parallel;
3:00 M5 route (hardest); 6:30 M6; 8:30 M7; 10:00 STOP and push.
SUN: 8:00 tests T1-T12 (bugs only, no new features); 9:30 polish; 11:00 record demo + 5 screenshots; 1:00 upload demo, turn on
GitHub Pages, test public link; 2:00 fill form; 4:00 final check; 5:00 SUBMIT; 6:00 buffer.
Ownership (avoid editing the same file): Data = scripts/, data/, SOURCES.md; Map/UI = index.html, css, map/layers/ui/profile/
pov js; Route = route/route-worker/safety/config js; Story = README, demo, screenshots, form text, targets text, About words.
Git: commit each working step; push hourly; pull before editing a shared file; never commit raw big files (data/raw ignored).

## 13. TESTS (write results to docs/TEST_LOG.md on Sunday)
T1 flat short route ~ straight line (ratio 1.0-1.1) | T2 cliff between habitat and target -> detour or unreachable |
T3 slope limit 25 then 5 behaves | T4 slider extremes no crash | T5 move habitat redraws walk-back map | T6 no-go zone avoided |
T7 target = habitat -> friendly message | T8 elevation at 5 spots matches Trek viewer | T9 slope colors high on visible cliffs |
T10 hand-check one short route time | T11 units consistent (km, minutes, degrees) | T12 Chrome, Safari, Firefox + public link in
private window. Also: no red errors in the Console on first load.

## 14. FIRST SESSION (TONIGHT) - DO THESE IN ORDER, THEN STOP
1 Read this file, docs/KICKOFF_BRIEF.md, and docs/*.
2 Reply with ~10 lines: goal, concept, hard rules, tonight vs Saturday. User corrects you.
3 Check git, node, python3 versions; say what is missing and the simplest install.
4 git init; first commit "Project setup: plans and templates". No app code.
5 Check if gh is installed and logged in; if yes offer to create a PUBLIC repo; if not, give click-by-click steps for an empty
  public repo on github.com plus exact connect/push commands.
6 Ask for project name, team name, team size; fill placeholders in README.md, LICENSE, this file, docs/; update ownership in
  section 12 and docs/BUILD_ORDER.md.
7 Stop. Tell the user what is next. Saturday 9:00 AM: start M1.

## 15. OPEN DECISIONS (ask, do not decide silently)
Project/team name; team size and roles; exact study-area bounds, habitat, targets (Sat morning); demo video vs slide deck;
anything the 2026 Submission/Judging guides or FAQ change; whether the slope limit/speed/reserve defaults should change.

## 16. RISKS + BACKUPS
Tile order/zoom wrong -> test early (M2), compare to Trek demo page | no real elevation numbers -> fallback ladder, ask a mentor |
no HiRISE DTM in box -> move box (still Mount Sharp) or CTX DTM at 20 m | Python packages fail -> clean virtual env, simpler
method | route too slow -> 20 m cells + Worker | route looks wrong -> draw straight line vs route, run T1/T2, check units |
radiation/temperature not found -> remove number, describe in words with citation | Pages path problems -> relative paths,
test Sat night | demo video slow -> 7-slide deck | scope creep -> nothing outside M0-M9 | teammate out -> README lets anyone run it.

## 17. DEFINITION OF DONE
A public link opens an app that loads an example Marswalk, lets visitors pick other targets and change limits, draws a
slope-aware route, shows a sourced safety summary, credits all data, states its assumptions and AI use, and has a clear
30-second demo. Submitted before Sun 6 PM.

## 18. 30-SECOND PITCH
"Today's Mars maps are global. Astronauts will walk a few kilometers. Our tool layers five kinds of NASA data at walking scale,
draws a route that respects slope limits, and checks the round trip, radiation and temperature, so a crew can plan a safe
Marswalk in minutes."

## 19. DEEPER DETAIL (read the one for your task)
docs/PLAN.md, docs/ARCHITECTURE.md, docs/DATA_PLAN.md, docs/UI_DESIGN.md, docs/ROUTE_AND_SAFETY_MODEL.md,
docs/BUILD_ORDER.md, docs/KICKOFF_BRIEF.md, docs/CHECKLIST.md, docs/SOURCES.md, docs/AI_USE.md, docs/DEMO_SCRIPT.md,
docs/SUBMISSION_FORM_DRAFT.md. If this file and a doc disagree, THIS FILE wins; tell the user about the conflict.
