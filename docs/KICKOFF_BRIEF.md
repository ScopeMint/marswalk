KICKOFF BRIEF FOR CLAUDE CODE
(Read this fully before doing anything. Then read CLAUDE.md and the files in docs/.)

1. WHO YOU ARE WORKING WITH
- A student team (novice coders, comfortable working with AI help) in the 2026 NASA Space Apps Challenge.
- Explain things in very simple words, one line at a time. Short answers. Key numbers only.
- Do one small step at a time. After each step, tell me how to run it and what I should see.
- When I ask you to change something, just do it. No need to ask permission for a change I requested.
- You must never write something I cannot explain to a judge. If I do not understand it, simplify it.

2. THE EVENT
- 2026 NASA Space Apps Challenge, theme "The Next Frontier". Hackathon: Saturday Nov 14 and Sunday Nov 15, 2026.
- Project submission opens Saturday 9:00 AM and closes Sunday 11:59 PM, local time. Our own target: submit by Sunday 6 PM.
- GOAL: submit a strong project that can advance to GLOBAL judging (local judging first, then NASA/space-agency
  experts). Judges score five things: Influence, Creativity, Validity, Relevance, Presentation.
  Presentation counts as much as the rest, so the demo and story matter.

3. THE CHALLENGE WE CHOSE (Intermediate level; subjects: Human Exploration, Mars, Software)
Create a layered, integrated view of a location or route on the Martian surface that pulls together data
from MULTIPLE NASA science missions and could help a human explorer plan and carry out a "Marswalk" (a surface
excursion on foot), while doing new science. Existing tools (like JPL Mars Trek and the USGS-NASA geologic
mapping) are built for regional and global views, not the hyper-local areas of a single spacewalk.
What the challenge asks for or suggests:
- A map, tool or interface a Mars astronaut could use on a surface mission, built with NASA data and tools.
- Pick a science goal and a location (example in the text: boxwork formations studied by Curiosity near Mount Sharp).
- Include at least three kinds of data (optical, thermal, spectral, topographic, geophysical, atmospheric,
  radiation, chemical are examples), layered in a way that helps navigation.
- Astronaut safety is first: consider radiation (space weather), suit mobility, and a route map that avoids
  obstacles like big rock formations.
- Format is open: crew-habitat display, tablet app, helmet heads-up display, static map, interactive tool, or a
  tool that generates maps.
- Time frame is open: past data, predicted future conditions, or none (stable data like topography).
- Surface point-of-view images from NASA missions are encouraged, so the astronaut knows what to expect.
- Consider rovers/robots helping, or astronauts working in pairs (optional).

4. OUR CONCEPT (decided)
Name: MarsWalk   Team: Dark Matter Devs
A web "EVA Planner" for ONE science goal: studying boxwork formations at Gale Crater / Mount Sharp.
The user picks a target. The app draws a safe walking route from the habitat and shows a safety summary.
Five data layers (need at least 3; cut in this order if behind: spectral, thermal, temperature chart):
  1. Topography and computed slope (from a NASA/USGS elevation model)
  2. Optical imagery (HiRISE ~0.25 m/pixel, CTX ~5 m/pixel) from Mars Trek tiles
  3. Thermal (THEMIS day/night)
  4. Radiation baseline (Curiosity RAD) and temperature by time of day (Curiosity REMS)
  5. Spectral/minerals (CRISM) - optional
Plus: real Curiosity point-of-view photos near each science target, a walk-back-time map, an EVA time budget with
a safety reserve, and a safety checklist.
It is a static website (HTML, CSS, JavaScript, Leaflet) hosted on GitHub Pages. Python scripts prepare small data
files once. No server. No API keys.
All the details are in docs/: PLAN, ARCHITECTURE, DATA_PLAN, UI_DESIGN, ROUTE_AND_SAFETY_MODEL, BUILD_ORDER.

5. HARD RULES (breaking these can disqualify us)
- DO NOT write solution/app code before the hackathon starts on Saturday Nov 14, 2026 (9:00 AM local).
  Tonight is setup only: git, repo, folders, reading the plans.
- CITE EVERY SOURCE (data, libraries, images, ideas) in docs/SOURCES.md the moment we use it. Even free or
  open-source material. NASA can remove awards for missing citations.
- DISCLOSE AI USE. Log every file you write or change in docs/AI_USE.md (file, what you did, who checked it).
  The submission form has an AI-use field.
- No NASA logos or branding. No AI-generated images or video. Real screenshots and real NASA photos only (credited).
- Never invent a number. If we cannot source a value, we do not show it. Label our own guesses "our assumption".
- All work must be original or properly licensed/cited. Put an open-source license in the repo (MIT is in place).
- The final project link must be public with no login or password.
- No personal information, no secrets, and no huge raw data files in the repo.
- Project text and demo must be in English.

6. WHAT IS ALREADY DONE (in this folder)
- CLAUDE.md, README.md template, LICENSE (MIT, placeholders), .gitignore.
- docs/: PLAN, ARCHITECTURE, DATA_PLAN, UI_DESIGN, ROUTE_AND_SAFETY_MODEL, BUILD_ORDER, CHECKLIST,
  SOURCES (leads to verify), AI_USE, DEMO_SCRIPT, SUBMISSION_FORM_DRAFT, SETUP_COMMANDS.txt.
- Empty folders: src/, data/, scripts/, media/.
- No application code exists yet. That is on purpose.

7. SUBMISSION REQUIREMENTS (from the 2025 guide; the 2026 guide may differ - we will check it)
Form fields: project name; short summary; demo link (one public link); final project link (public); detailed
description; NASA data used (required for global-award eligibility); other agency data and tools; use of AI;
references; two boxes (Terms and Conditions, Original Work). Demo = a video up to 30 seconds with English subtitles,
OR a slide deck up to 7 slides in English, hosted externally with a public link. Images upload only
(JPG/PNG/GIF, up to 10 MB). All team members must be confirmed at the same Local Event. Submission is final.

8. YOUR FIRST SESSION (TONIGHT) - ACTION ITEMS, IN ORDER
 1. Read CLAUDE.md, this brief, and all files in docs/.
 2. Reply with a SHORT summary (about 10 lines) of: the goal, the concept, the hard rules, and what we do
    tonight versus Saturday. I will correct anything wrong.
 3. Check my tools: git, node, python3 versions. Tell me what is missing and the simplest way to install it.
 4. Initialize a git repository in this folder. Make the first commit: "Project setup: plans and templates".
    (No application code.)
 5. Help me connect it to GitHub. Check whether the GitHub command-line tool (gh) is installed and logged in.
    If yes, offer to create a PUBLIC repo with it. If not, give me exact click-by-click steps to create an empty
    public repo on github.com, then give me the exact commands to connect and push.
 6. Ask me for the project name, team name, and team size; then fill in the placeholders in README.md, LICENSE,
    and docs/. Update docs/BUILD_ORDER.md section 3 (who owns what) to match team size.
 7. Stop. Do not write any app code. Tell me what to do next.

9. SATURDAY ACTION ITEMS (after 9:00 AM local, follow docs/BUILD_ORDER.md)
 M1  Pick the 6 km x 6 km study area at Mount Sharp (docs/DATA_PLAN.md section 1). I will do the Mars Trek browsing;
     help me record bounds, habitat spot, and 4-6 science targets.
 M2  Build the smallest possible test page: one Mars Trek imagery layer on a Leaflet map. Settle tile order and zoom.
 M3  Find a real elevation file for the area. Make the grids with a Python script. Run sanity checks.
 M4+ Build in the order in BUILD_ORDER.md: map and layers, route planner, safety cards, targets and photos.
 WORKING VERSION (through safety cards) due Saturday 10 PM.
 Sunday: tests, polish, demo, submission form. Submit by 6 PM.

10. HOW TO CODE (when coding starts)
- Follow docs/ARCHITECTURE.md exactly (file layout, state, config.js for every assumption and number).
- Small files, plain-English comments, units in names (meters, seconds, degrees).
- One step at a time: build, run, show me, then commit.
- Show me the exact error text if something breaks; do not guess silently.
- Keep every number in config.js or in the data files, and show source or "our assumption" on screen.
- The page must open with an example mission already showing a route.

11. DECISIONS STILL OPEN (ask me, do not decide silently)
- Project name and team name
- Team size and who does which role
- The exact study-area bounds, habitat spot, and science targets (Saturday morning)
- Whether we use a demo video or a slide deck
- Whether the 2026 guides change anything above

12. DEFINITION OF "DONE" FOR THE WHOLE PROJECT
A public link opens an app that loads an example Marswalk, lets a visitor pick other targets and change limits,
draws a slope-aware route, shows a sourced safety summary, credits all data, states its assumptions and AI use,
and has a clear 30-second demo. Submitted before Sunday 6 PM.
