PLAN — MarsWalk / Dark Matter Devs

Idea: EVA Planner for Mars. Pick a science target at Mount Sharp, Gale Crater. The app draws a
safe walking route and shows a full safety summary: distance, time, steepest slope, radiation,
temperature, and an EVA budget with reserve.

Location: Gale Crater / Mount Sharp (boxwork formations). Reason: matches the challenge example;
Curiosity's radiation (RAD) and weather (REMS) data come from there; abundant imagery and elevation.

===========================================================================
WHAT MAKES MARSWALK DIFFERENT FROM EVERY OTHER ENTRY
===========================================================================

1. WALK-BACK-TIME MAP — unique feature, no other tool does this.
   JPL Mars Trek shows terrain. MarsWalk shows "can I make it home in time?" for every cell.
   The walk-back-time layer is computed from the same grid as the route — it is not an estimate,
   it is the actual fastest walk-home time accounting for slope and speed. This directly answers
   the safety question that matters most on a real EVA.

2. EVA BUDGET WITH RESERVE — operationally realistic.
   The app enforces a 25% safety reserve. Out + work + back must be ≤ 75% of EVA time.
   This is how NASA actually plans EVAs. No other hackathon entry is likely to include this.

3. FIVE MISSIONS, ONE VIEW — the multi-mission integration is the core validity claim.
   MRO (HiRISE + CTX + CRISM), Mars Odyssey (THEMIS), MSL (RAD + REMS + images).
   Judges scoring "Best Use of Data" need to see multiple missions clearly. We show them.

4. REAL CURIOSITY PHOTOS — tangible and emotional.
   Real Mastcam/Navcam images near each target. Judges feel the difference between a data viz
   and a planning tool they could imagine handing to a real astronaut.

5. RADICAL HONESTY — rare and respected.
   Every number has a source label or "our assumption" on screen. The Assumptions panel lists
   everything. The footer says "not flight software." Teams that are honest about limits score
   higher on Validity than teams that over-claim.

===========================================================================
LAYERS (aim for 5, need 3)
===========================================================================
1. Topography: elevation, and slope computed from it (MRO HiRISE or CTX DTM)
2. Optical: HiRISE (~0.25 m/pixel) and CTX (~5 m/pixel) images (MRO, via Mars Trek)
3. Thermal: THEMIS day/night (~100 m/pixel) (Mars Odyssey, via Mars Trek)
4. Radiation + weather: Curiosity RAD dose baseline + REMS temperature (MSL)
5. Spectral: CRISM minerals (MRO) [optional — cut if not obtained by Sat 2 PM]

===========================================================================
JUDGING (5 things) AND HOW WE WIN EACH
===========================================================================
Influence    -> The first people on Mars will need this tool. We show a working prototype.
               Key argument: existing tools (Mars Trek, USGS mapping) work at regional/global scale;
               no tool exists for the hyper-local ~6 km scale of a single Marswalk.
Creativity   -> Walk-back-time map is genuinely novel. Five-mission integration at walking scale
               has not been done in a web app before.
Validity     -> Real data (HiRISE DTM, Curiosity RAD, REMS), all numbers cited in the app,
               honest about limits ("MOLA 200 m resolution — single boulders not visible").
               Every assumption labeled. Research NASA-STD-3001 for EVA dose limit.
Relevance    -> Answers every suggestion in the challenge statement:
               ✓ Layered data (3-5 layers)  ✓ At least 3 data types  ✓ Safety first (route + EVA budget)
               ✓ Route that avoids obstacles  ✓ Surface POV images  ✓ Format: interactive web app
Presentation -> App opens with example mission already running (judges see value in 10 seconds).
               30-second demo video tells the story in 5 beats. Dark mission-control aesthetic.

===========================================================================
SCHEDULE (summary — full detail in BUILD_ORDER.md)
===========================================================================
Sat morning    : M1 area + data, M2 tile test (biggest risk), M3 elevation + grids
Sat afternoon  : M4 map + layers, M5 route + walk-back-time (hardest step)
Sat night      : M6 radiation + temperature cards. GitHub Pages link tested. Working version done.
Sun morning    : M7 targets + POV photos. Tests T1-T12. Polish.
Sun afternoon  : Record demo. Fill submission form from SUBMISSION_FORM_DRAFT.md. SUBMIT BY 6 PM.

===========================================================================
CUT ORDER IF BEHIND (cut from bottom up, never the top)
===========================================================================
CUT FIRST:  5) CRISM mineral layer
            4) THEMIS thermal layer
            3) Temperature chart
            2) Walk-back-time layer
            1) No-go zone drawing
NEVER CUT:  Route planner, slope layer, optical imagery, safety card, Assumptions panel, Sources panel.

===========================================================================
GLOBAL AWARD TARGETS
===========================================================================
Best Use of Data       — explicit multi-mission credits in-app + the layers "i" info button
Best Mission Concept   — walk-back-time + EVA budget makes this feel like a real operations tool
Best Use of Technology — Web Worker + A* on 90k-cell grid, real binary NASA data, no server needed
