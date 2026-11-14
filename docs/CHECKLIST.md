CHECKLIST — MarsWalk / Dark Matter Devs

TONIGHT (Fri) - no solution code yet
[ ] Everyone is registered for the 2026 challenge
[ ] Everyone is at the SAME Local Event (required for awards)
[ ] Team has picked the Mars Marswalk challenge
[ ] Read the 2026 Project Submission Guide and Judging Guide (released Nov 13)
[ ] Read the 2026 FAQ on when work may start
[ ] Create an empty public GitHub repo named "marswalk" (or similar)
[ ] git init, first commit "Project setup: plans and templates", connect and push
[ ] Pick roles: data+slope / map+UI / route+safety / demo+writing (adjust for team size)
[ ] Check tools on the Mac: git, node, python3 (commands in docs/SETUP_COMMANDS.txt)
[ ] Team name + project name filled in all docs (done: MarsWalk / Dark Matter Devs)

SATURDAY — FIRST 15 MINUTES
[ ] Enable GitHub Pages NOW (repo Settings -> Pages -> main -> / -> Save). Do not wait until Sunday.
[ ] Project submission page opens at 9:00 AM — open it and read the form fields
[ ] Read BUILD_ORDER.md premortem section aloud with the team

SATURDAY — AS YOU GO
[ ] Save every source into docs/SOURCES.md as you use it (URL, what it is, license)
[ ] Move source from "TO VERIFY" to "CONFIRMED" the moment you access it
[ ] Log AI use in docs/AI_USE.md as you go (file, what AI did, who checked)
[ ] Commit and push to GitHub after every working step
[ ] Test GitHub Pages link Saturday evening in a private window (not just localhost)

SATURDAY NIGHT TRIAL RUN
[ ] Example mission loads with route already drawn on first open
[ ] Can click all science targets and route updates
[ ] No red errors in DevTools Console
[ ] GitHub Pages link works in private window on a different device
[ ] 60-second practice screen recording done (QuickTime on Mac: Cmd+Shift+5)

SUNDAY — TESTS (T1-T12 from docs/ROUTE_AND_SAFETY_MODEL.md)
[ ] T1  Flat short route ~ straight line (ratio 1.0-1.1)
[ ] T2  Cliff between habitat and target -> detour or unreachable message
[ ] T3  Slope limit 25 then 5 behaves correctly (route changes or fails)
[ ] T4  Slider extremes no crash
[ ] T5  Move habitat redraws walk-back map centered on new spot
[ ] T6  No-go zone drawn across route -> route avoids it (if feature shipped)
[ ] T7  Target = habitat -> friendly message (no crash)
[ ] T8  Elevation at 5 spots matches Mars Trek viewer (closely)
[ ] T9  Slope colors high on visible cliffs, low on flat plains
[ ] T10 Hand-check one route time matches calculator estimate
[ ] T11 Units consistent: km, minutes, degrees everywhere
[ ] T12 Chrome, Safari, Firefox + public link in private window

SUNDAY — SOURCES AND CONTENT
[ ] Every number on screen has a source note or "our assumption" label
[ ] Assumptions panel: table complete, "not flight software" line present
[ ] About and Sources panel: all data layers listed with mission names and credits
[ ] AI use statement written in the app (About panel)
[ ] All photos in data/pov/ have credit line and NASA link in pov-images.json
[ ] No NASA logos or branding anywhere in the app
[ ] No AI-generated images anywhere

SUNDAY — SUBMISSION
[ ] Demo video (30 s, English subtitles) uploaded, link tested logged out
   OR 7-slide deck uploaded, link tested logged out
[ ] GitHub Pages public link tested in private window
[ ] All screenshots taken (5 hero screenshots)
[ ] docs/SUBMISSION_FORM_DRAFT.md used to fill every form field
[ ] "Save Progress" clicked after each field
[ ] NASA data field complete: names 4+ missions and 5+ instruments
[ ] AI use field: specific, honest, complete
[ ] References field: every source from docs/SOURCES.md CONFIRMED section
[ ] Both checkboxes ticked (Terms + Original Work)
[ ] "Submit for Judging" clicked by 5:00 PM — confirmation banner seen
[ ] Certificate downloaded from profile

PREMORTEM CHECKS (review Saturday morning — if any are red flags, adapt now)
[ ] Elevation source identified (specific URL, not "will find it Saturday")
[ ] Mars Trek tile URL pattern confirmed with a test tile (not just "should work")
[ ] Python data prep environment tested (rasterio or fallback)
[ ] GitHub Pages enabled and first build started
[ ] All team members can run the local server (python3 -m http.server 8080)
[ ] Submission form draft text ready to copy-paste (SUBMISSION_FORM_DRAFT.md)
[ ] Demo video script ready (DEMO_SCRIPT.md)
[ ] Every team member has read the BUILD_ORDER.md premortem section
