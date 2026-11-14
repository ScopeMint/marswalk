BUILD ORDER, SCHEDULE, RISKS (words only, no code)

PROJECT: MarsWalk | TEAM: Dark Matter Devs

0. WHERE TO WORK
Use VS Code (you also have Cursor installed; either works). Open the folder nasa-space-apps-2026.
Run Claude Code in the IDE terminal or its extension panel. Why an IDE: you see all files, run the
page next to the code, and use git buttons. Add the "Live Server" extension (or run a tiny local server)
so the page refreshes when you save.

CRITICAL: Keep the browser DevTools Console open at ALL TIMES. Errors show up there first.
To open: Chrome/Safari/Firefox -> right-click anywhere on the page -> Inspect -> Console tab.
A red error in the Console = something is broken. Never ignore it.

NEVER open index.html by double-clicking. Always use: cd src && python3 -m http.server 8080

Final output is a public GitHub link, so always work inside the git repo.

1. MILESTONES (each has a "done when" test)
M0  Setup (tonight)          done when: folder in IDE, git works, empty GitHub repo exists, team registered.
M1  Area + data chosen       done when: bounds, habitat, 4-6 targets saved; elevation file located.
M2  Tiles on a page          done when: one Mars Trek imagery layer shows in a Leaflet page, in the right place.
M3  Grids made               done when: elevation/slope/roughness .bin files made; sanity checks pass.
M4  Map + layers + panels    done when: base map, slope overlay, layer toggles, opacity sliders work.
M5  Route planner            done when: click a target, a route appears, summary numbers appear.
M6  Safety cards             done when: radiation and temperature cards show sourced numbers; checklist works.
M7  Targets + POV            done when: 4-6 targets with text; photo drawer shows credited images.
M8  Polish + About + tests   done when: Assumptions and Sources panels done; tests T1-T12 run; no console errors.
M9  Submit                   done when: public link opens in a private window; form submitted; banner seen.
WORKING VERSION (everything through M6, even if ugly) must exist by Saturday 10 PM.

2. HOUR-BY-HOUR PLAN (times are local; adjust to your Local Event schedule)
SATURDAY
 8:30  Everyone at the event, tools open, repo cloned.
 9:00  Hackathon starts. Project submission page opens. Open docs/ and read this plan aloud once.
 9:00  FIRST THING: open GitHub repo Settings -> Pages -> main branch -> / (root) -> Save.
       This starts the GitHub Pages build now. It takes 2-5 minutes. Test the link once it shows green.
       Re-push any change to trigger a new build. Testing Pages early = no Sunday surprises.
 9:15  M1: pick the area in Mars Trek (DATA_PLAN section 1). Write bounds down.
       SIMULTANEOUSLY: 30-min radiation limit research task (see DATA_PLAN Layer E, SOURCES.md).
10:30  M2: first tile test page. THIS IS THE RISKIEST STEP — budget 90 min.
       If tiles show in the wrong place after 45 min: immediately try a different tile layer name.
       If tiles show nothing after 60 min: try OpenPlanetaryMap as backup (see DATA_PLAN Layer B emergency).
       Do not spend more than 90 min total on M2. A gray background map works. Keep moving.
11:30  M3 part 1: get the elevation file. Try fallback ladder in order. Budget 60 min.
       If BLOCKED at 11:30: immediately activate elevation emergency plan (DATA_PLAN section 1).
12:30  Lunch break. Update SOURCES.md while eating.
 1:00  M3 part 2: make grids (03_make_grids.py), run sanity checks (07_check_data.py).
       Meanwhile: second person starts M4 (layout and layers) with placeholder/fake grid data.
 3:00  M5: route planner (the hardest step). Start with 20 m cells.
       Build route-worker.js to run BOTH the walk-back-time map AND the route.
       Have a second person build the summary card UI with fake hard-coded numbers.
 5:30  Break. Commit and push. Test the GitHub Pages link in a private window (should be working now).
 6:30  M6: radiation and temperature files + cards. Paste real numbers from docs/SOURCES.md.
 8:30  M7: targets and photos (collect photo IDs; write the one-liners).
10:00  STOP CODING. Push to GitHub. Sleep. (Tired builders make bugs.)

SUNDAY
 8:00  Test day: run T1-T12. Fix only bugs, no new features.
 9:30  Polish: legends, microcopy, About, Assumptions. Check on a second computer.
11:00  Record demo video (a few takes). See docs/DEMO_SCRIPT.md for exact words.
12:30  Break.
 1:00  Upload demo (public link, test logged out). Verify GitHub Pages link still works.
 2:00  Fill in the submission form from docs/SUBMISSION_FORM_DRAFT.md (copy-paste ready).
 4:00  Final check of every field and every link.
 5:00  SUBMIT. Look for the confirmation banner. Download the certificate from your profile.
 6:00  Buffer. The real deadline is 11:59 PM, but we do not use it.

3. WHO OWNS WHAT — 4 on team, 2 primary builders
Primary builder 1 "Data + Route":  scripts/*, data/*, config.js, route.js, route-worker.js, safety.js
Primary builder 2 "Map + UI":       index.html, css/*, map.js, layers.js, ui.js, profile.js, pov.js, targets.js
Supporting member 3 "Story":        README, demo video, screenshots, form text (Sunday mainly)
Supporting member 4 "Research":     SOURCES.md, science target text, photo finding, Assumptions text (Sat morning)

SATURDAY SPLIT: Builder 1 works on data + route (scripts, grids, A* pathfinding).
                Builder 2 works on map + UI layout (tiles, panels, layers) in parallel.
                Member 4 does the 30-min radiation limit research then finds POV photos.
                Member 3 drafts submission form text from SUBMISSION_FORM_DRAFT.md.

NEVER HAVE TWO PEOPLE EDITING THE SAME FILE. If blocked on a file, work on a different one and sync.
Order of importance: Data > Route > Map/UI > Story.

4. HOW TO USE CLAUDE CODE WELL (for a novice)
- Ask for ONE small thing at a time. Run it. Look at it. Then the next.
- Start each session: tell it to read CLAUDE.md and the doc for today's step.
- Say: "Explain in simple words what you did and how I can test it."
- Say: "Use only values from config.js and the data files; do not invent numbers."
- After each working step: commit with a plain message and push.
- If something breaks: copy the exact error from the Console into the chat. Do not guess.
- Log each AI-written file in docs/AI_USE.md right away.
- Never paste secrets into the chat. There are no keys in this project.
- Read the code it writes at least once. You must be able to explain your project to judges.

5. GIT HABITS (simple)
- Work on the main branch if one person per file area; commit often (every working step); push every hour.
- If two people edit the same file, pull first, then edit, then push.
- Commit messages: short sentence of what changed.
- Never commit huge raw files. data/raw/ is ignored. Final data files are small.

6. PREMORTEM — WHAT COULD GO WRONG AND WHAT TO DO IMMEDIATELY
(Read this Saturday morning. Do not wait until the problem happens to find the solution.)

FAILURE 1: Elevation file not found by 11:30 AM
  Sign: none of the URLs in DATA_PLAN fallback ladder yield a usable file in 60 min.
  Do: activate DATA_PLAN "ELEVATION EMERGENCY PLAN" immediately. Ask a mentor.
  NEVER spend more than 90 min blocked here. MOLA at 200 m is a valid, honest fallback.

FAILURE 2: Mars Trek tiles show black or in the wrong place
  Sign: Leaflet page shows but map is black, or tiles appear offset from their real location.
  Do (tiles black): try a different layer name from the Trek catalog. Check the WMTS URL pattern.
       Common mistake: using 'default028mm' vs a different tile matrix set name. Check the Trek API doc.
  Do (tiles offset): row/column order is reversed. Leaflet uses {z}/{x}/{y}; Trek may use {z}/{y}/{x}.
       Swap {x} and {y} in the URL template and test again. This is the most common tile mistake.
  If still broken after 60 min: use OpenPlanetaryMap (https://www.openplanetary.org/opm) as tile source.
  Budget no more than 90 min on M2 total.

FAILURE 3: Route too slow (>2 seconds)
  Sign: clicking a target waits >2 s before the route appears.
  Do: check that route-worker.js is actually running in a Worker (not the main thread).
      If already in a Worker: switch to a simple priority queue if using recursion.
      Make sure you are on 20 m cells (90k not 360k). This is the main performance lever.
      If still slow: add a "Computing route..." spinner and move on — it still demonstrates the concept.

FAILURE 4: Python rasterio / GDAL fails to install
  Sign: 'pip3 install rasterio' gives a long error about GDAL or libgdal.
  Do: try 'pip3 install rasterio[s3]' first. Then try 'conda install -c conda-forge rasterio'.
      If conda is not installed: install Miniforge (https://github.com/conda-forge/miniforge) — fast.
      Fallback: if the elevation source is MOLA .img binary, it can be read with just numpy.
      Read the .img file header to find dimensions, then numpy.fromfile() to read the data.

FAILURE 5: GitHub Pages link broken on Sunday
  Sign: the public link shows 404, a blank page, or loads HTML but no data/tiles.
  Do: check that Pages is enabled (repo Settings -> Pages) and the build completed (green checkmark).
      If 404: make sure there is an index.html at the root or in /src and Pages points to the right folder.
      If blank (data not loading): check DevTools Console for failed fetch() calls.
        Common cause: absolute paths (/data/...) that work locally but break on Pages. Change to relative.
      If tiles not loading: check for CORS errors in the Console. Mars Trek tiles should be CORS-open;
        if not, the workaround is a Leaflet proxy (complex — ask Claude Code for help).
  Prevention: test the Pages link Saturday night after pushing. Do not discover this on Sunday.

FAILURE 6: Demo recording fails (audio, lag, bad takes)
  Sign: Sunday morning, the recording is choppy, text is too small, or narration is wrong.
  Do: switch to the 7-slide deck immediately. See DEMO_SCRIPT.md for the 5 beats to cover.
      Have the slide template ready Saturday night (Google Slides, Keynote, or PowerPoint).
      Minimum slides: title + team, problem statement, 3 screenshots (map+layers, route+summary, safety card),
      data sources list, next steps.
  Prevention: do a 60-second trial recording Saturday night using QuickTime (Mac: Cmd+Shift+5).
              Make sure text is readable at 1920x1080. Write subtitle text in a text file Saturday night.

FAILURE 7: Running out of time on Sunday to fill the form
  Sign: it is 4 PM Sunday and fields are still empty.
  Do: docs/SUBMISSION_FORM_DRAFT.md is copy-paste ready. Paste each field, check the boxes, submit.
      The form does NOT need to be perfect. A good, complete form beats a perfect form submitted late.
  Prevention: this cannot happen if you use SUBMISSION_FORM_DRAFT.md as written.

FAILURE 8: Sources missing
  Sign: docs/SOURCES.md has lines under "TO VERIFY" but nothing under "CONFIRMED SOURCES."
  Do: add each source to CONFIRMED the moment you actually access and use it. Do not batch this.
      NASA can remove awards for missing citations. If a source is in the app, it must be in SOURCES.md.
  Prevention: docs/SOURCES.md now has specific URLs for every layer. Work from that list Saturday.

7. CUT LIST (cut in this order if behind — STOP at "never cut")
 1) Spectral/CRISM layer   2) Thermal layer   3) Temperature chart   4) Walk-back layer
 5) No-go zone drawing     6) POV photos (keep the text descriptions)
 NEVER cut: route, slope layer, optical imagery, safety card, Assumptions panel, Sources panel.

8. STRETCH LIST (only after M8 is solid and it is Sunday before noon)
 1) Visor mode  2) Compare two slope limits  3) Download mission plan  4) Solar-storm scenario with sourced data
 5) Second science location  6) Keyboard shortcuts

9. SCREENSHOTS TO TAKE (5 for the submission form, JPG/PNG up to 10 MB each)
 1) Hero: full app with example mission route visible
 2) Layer stack on (imagery + slope overlay + thermal)
 3) Route + summary card with numbers visible
 4) Safety checklist + EVA budget bar
 5) POV drawer with photo and credit visible
 Take these Saturday night and Sunday morning while the app is fresh.

10. FINAL QA CHECKLIST (Sunday 4 PM before submitting)
 [ ] Public link opens in a private window, no login
 [ ] No red errors in the Console on first load
 [ ] Example mission "Boxwork Survey" shows on load with route already drawn
 [ ] Every number on screen has a source or an "our assumption" tag
 [ ] About and Sources panel complete; AI use written down (docs/AI_USE.md filled)
 [ ] No NASA logos; no AI-made images; all photos have credit lines
 [ ] README has what/why/how-to-run/credits (filled in already)
 [ ] LICENSE has Dark Matter Devs (filled in already)
 [ ] Demo link public and tested logged out; English subtitles on video
 [ ] Submission form all fields filled from docs/SUBMISSION_FORM_DRAFT.md
 [ ] All members at the same Local Event; form boxes ticked
 [ ] Submitted; confirmation banner seen; certificate downloaded

11. PROJECT NAME
MarsWalk (chosen). Team: Dark Matter Devs.

12. THE 30-SECOND PITCH (say it out loud)
 "Today's Mars maps are global. Astronauts will walk a few kilometers. MarsWalk layers five kinds of NASA
 data at walking scale, draws a route that respects slope limits, and checks the round trip, radiation and
 temperature, so a crew can plan a safe Marswalk in minutes."
