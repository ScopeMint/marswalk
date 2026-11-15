SUBMISSION FORM DRAFT — MarsWalk / Dark Matter Devs
(All text pre-drafted so Sunday is copy-paste only. Paste into form fields exactly.
Verify against the 2026 guide for any field changes. Use "Save Progress" after each field.)

===========================================================================
1. PROJECT NAME
===========================================================================
MarsWalk

===========================================================================
2. HIGH-LEVEL PROJECT SUMMARY (keep short — this is the hook)
===========================================================================
MarsWalk is an installable, offline EVA planner for the first humans on Mars, built on the real
place where Curiosity studied boxwork ridges in 2025-26 on Mount Sharp. It layers data from four
NASA missions at walking scale: HiRISE 1 m terrain (checked against Curiosity's own elevations to
2.4 m), 25 cm imagery, THEMIS thermal, Curiosity RAD/REMS and the rover's real path. It plans the
safest walk to a science target, computes oxygen, cooling water, radiation, daylight and the
turn-back point, prints an astronaut cue card, and replays the walk in a helmet-visor HUD. A Rover
check runs our planner along Curiosity's real drive: it connects 17 of 19 legs at a 15 degree limit.

===========================================================================
3. LINK TO PROJECT DEMO (ONE public link — video or slide deck)
===========================================================================
[PASTE YOUTUBE LINK HERE]
(Upload media/marswalk-demo-30s.mp4 + media/marswalk-demo-30s.srt to YouTube as Unlisted or Public,
 test the link logged out, paste it here. Re-record first if the UI changed a lot after the ui-polish merge.
 Fallback if YouTube fails: https://scopemint.github.io/marswalk/media/marswalk-demo-30s.mp4 once Pages is on.)
Screenshots to upload: media/shot-1-map-route.png, shot-2-cue-card.png, shot-3-traverse.png, shot-4-visor-hud.png, shot-5-3d-flythrough.png

===========================================================================
4. LINK TO FINAL PROJECT (public GitHub Pages link — no login)
===========================================================================
https://scopemint.github.io/marswalk/   (enable Pages: repo Settings -> Pages -> main / root; test in a private window)

===========================================================================
5. DETAILED PROJECT DESCRIPTION
===========================================================================

WHAT IT DOES:
MarsWalk turns layered NASA data into the decisions a suited astronaut must make on a Marswalk:
which way to walk, how long it takes, what it costs the suit, and when to turn back.

Site: a 4 km x 4 km box on Curiosity's actual 2025-26 boxwork traverse (4.81 S, 137.37 E). The
challenge's own example science goal. Targets are where Curiosity really parked on the drill sols:
Altadena (sol 4571), the Monte Grande hollow / Nevado Sajama ridge pair (sols ~4695-4718), the
boxwork entry (sol 4548) and the rover's latest position (sol 5073), plus one boxwork field no rover
has visited, which we found in HiRISE images. Human science where robots have not gone.

For a chosen target MarsWalk:
(1) Finds the fastest walkable route through 160,000 terrain cells of 10 m, built from the HiRISE
    1 m Digital Terrain Model. It blocks slopes above the crew's limit and slows on uphill and on
    rocky ground (1 m "rock & ridge relief" from the same DTM). It runs in a Web Worker in ~0.1 s.
(2) Computes a walk-back-time field from the habitat and the point of no return on the route.
(3) Runs a suit & crew model: walking energy from the Pandolf (1977) equation scaled to Mars
    gravity, oxygen (Weir 1949), CO2 and cooling water against suit capacity, for a buddy pair.
(4) Checks radiation (Curiosity RAD surface baseline: 210 +/- 40 uGy/day, Hassler et al. 2014; space-weather
    context from the largest storm RAD measured, 8,100 uGy on 20 May 2024),
    air temperature (real REMS hourly measurements for today's Mars season at Gale), daylight (live Mars24 clock: today's sol, local Mars time, sunrise and sunset), and the
    EVA time budget with a 25% reserve, then gives GO / NO-GO.
(5) Prints an EVA cue card (timeline in elapsed time and local Mars time, stations, oxygen left,
    turn-back rule). This is what an astronaut would carry.
(6) Replays the walk in a full-screen helmet-visor HUD and in a 3D HiRISE terrain fly-through.
(7) Shows the real Curiosity photo from each target, so the crew knows what to expect.
(8) Plans multi-stop traverses: times every leg on the real terrain and picks the fastest
    visiting order (Base -> stops -> Base), like an Apollo EVA with several science stations.
(9) Flags hazards along the route: stretches with no direct radio line to base (computed over
    the terrain), rocky ground and near-limit slopes. Lets the crew move the base, pick any
    point, and draw no-go zones that the route avoids.
(10) Rover check: cuts Curiosity's real drive into 19 legs and runs our planner on each one at 15, 20
    and 25 degrees. Connected legs show green on the map, legs we cannot connect show red.
(11) "Why not walk straight?": the straight line next to the safe route, with the % detour and the
    stretches steeper than the crew's limit drawn in red.
(12) Four pages (Plan, Layers, Weather, Summary). The Weather page adds ground temperature, air
    pressure and UV for the current Mars month from 4,745 sols of REMS daily reports. Radiation and
    temperature show their measured ranges, not just one number.
It installs like a native app and works fully offline. On Mars there is no internet.

WHY WE TRUST THE NUMBERS:
- Our terrain matches the elevations Curiosity itself reported at 227 stops: 2.4 m RMS after a
  constant 12.8 m datum offset (computed live in the app).
- 99.9% of the distance Curiosity actually drove inside our study area is on 10 m cells under our
  15 degree default slope limit; the steepest cell it crossed is 19.7 degrees (computed live in the app).
- Every science number was re-checked against the original source: radiation against the Hassler et
  al. (2014) paper text, temperatures from raw REMS files in NASA's Planetary Data System.
- Slope test: 500 random cells recomputed by hand match our slope grid exactly (scripts/14_check_slope.py).
- Rover check: our planner connects 17 of 19 legs of Curiosity's real drive at 15 degrees, 19 of 19 at
  20 and 25 degrees.
- Energy check: our walking-energy average (about 280 kcal/h on target 5) sits inside the 100-500 kcal/h
  measured on Skylab and Apollo-era EVAs (Waligora & Horrigan 1974).
- The Mars clock passes 80 tests (GISS worked example + every photo's sol and time).
- Every number on screen is either cited or labelled "OUR ASSUMPTION"; the Assumptions panel lists
  every model value (about 35), read live from the code.

WHAT WE HOPE TO ACHIEVE:
A concrete, open prototype of the walking-scale planning layer that Mars mission planners and crews
will need. It can be re-run for any site with a HiRISE DTM: the data pipeline only needs a new box.

HOW WE BUILT IT:
Python scripts read only the needed window from cloud-optimised NASA/USGS GeoTIFFs (no huge
downloads) and produce small binary grids, overlays and 865 map tiles. The app is static HTML/CSS/
JavaScript with Leaflet and three.js. Routing runs in a Web Worker; a service worker makes it an
offline Progressive Web App. No server, no API keys, no login.

TOOLS AND LANGUAGES:
- JavaScript, HTML/CSS (app); Python with numpy, scipy, rasterio, Pillow (data pipeline)
- Leaflet 1.9.4 (BSD-2), three.js r160 (MIT); GitHub Pages hosting
- Code assistance: Claude Code and OpenAI Codex (see AI field)

CHALLENGES / WHAT WE LEARNED:
Map tiles look like terrain but hold no heights; we needed a real DTM and found a 1 m HiRISE DTM
covering Curiosity's route as a cloud-optimised file. Placing targets honestly meant matching
named drill sites to the rover's real end-of-drive positions by sol. We also learned to check our
own model against the rover's measurements before trusting it.

===========================================================================
6. NASA DATA USED (required for global award eligibility — be specific)
===========================================================================
Four NASA missions, seven instruments/products:
1. MRO HiRISE DTM DTEEC_019698_1750_019988_1750_U01 (1 m) — elevation, slope, rock & ridge relief,
   3D terrain. Via USGS Astrogeology STAC (CC0).
2. MRO HiRISE orthoimage ESP_019988_1750 (0.25 m) — map tiles and 3D texture.
3. Mars Odyssey THEMIS Day/Night IR controlled mosaics (100 m) — thermal layers, via NASA Mars Trek.
4. MSL Curiosity traverse + waypoints (NASA/JPL MMGIS) — rover path, target positions, validation.
5. MSL Curiosity Navcam / Mastcam raw images — point-of-view photos per target.
6. MSL Curiosity RAD — surface dose baseline (Hassler et al. 2014, Science 343).
7. MSL Curiosity REMS — hourly air temperature (MODRDR product, NASA PDS Atmospheres Node), median by
   local true solar time for the two halves of the Mars year. REMS daily report (CAB/INTA-CSIC):
   ground temperature, pressure and UV category by Mars month (context only).
Context basemap: Viking MDIM 2.1 + MGS MOLA (via OpenPlanetaryMap).

===========================================================================
7. SPACE AGENCY PARTNER AND OTHER DATA / TOOLS
===========================================================================
- NASA Mars Trek tile service; NASA/JPL MMGIS; NASA raw-image service; NASA GISS Mars24 algorithm
- USGS Astrogeology analysis-ready data + STAC API (HiRISE DTM/orthoimages)
- University of Arizona HiRISE team (DTM producer)
- NASA Planetary Data System Atmospheres Node (REMS MODRDR); CAB-INTA-CSIC REMS team; OpenPlanetaryMap
- Libraries: Leaflet (BSD-2), three.js (MIT); Python numpy/scipy/rasterio/Pillow

===========================================================================
8. USE OF ARTIFICIAL INTELLIGENCE (the 2026 form may call this "Super Intelligence (SI)")
===========================================================================
Claude Code (Anthropic) wrote most of the application code and the Python data scripts from our
specifications. OpenAI Codex wrote three modules from written specs: the visor HUD, the Mars24
clock (with tests) and the 3D terrain view. Every AI-written file is logged in docs/AI_USE.md.
Humans chose the concept, the site and the science targets, checked every source and citation,
tested the app, and recorded the demo. No AI-generated images or video: all imagery is NASA data
or real screenshots.

===========================================================================
9. REFERENCES
===========================================================================
- HiRISE DTM DTEEC_019698_1750_019988_1750_U01: https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_socet_dtms/items/DTEEC_019698_1750_019988_1750_U01
- McEwen et al. (2007), HiRISE, JGR 112, E05S02, doi:10.1029/2005JE002605
- Curiosity MMGIS traverse/waypoints: https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/
- Curiosity raw images: https://mars.nasa.gov/msl/multimedia/raw-images/
- THEMIS mosaics via Mars Trek: https://trek.nasa.gov/mars/ ; Edwards et al. (2011), JGR 116, E10008
- Hassler et al. (2014), Science 343(6169), 1244797, doi:10.1126/science.1244797 (RAD)
- NASA (10 June 2024), NASA Watches Mars Light Up During Epic Solar Storm (RAD 8,100 microgray event): https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm/
- REMS MODRDR data, NASA PDS Atmospheres Node: https://atmos.nmsu.edu/PDS/data/mslrem_1001/
- Gomez-Elvira et al. (2012), REMS, Space Sci. Rev. 170, 583-640, doi:10.1007/s11214-012-9921-1
- REMS daily summaries, CAB/INTA-CSIC: https://cab.inta-csic.es/rems/en/
- Curiosity REMS daily weather record (Ls per sol): https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json
- Allison & McEwen (2000), Planet. Space Sci. 48, 215-235; https://www.giss.nasa.gov/tools/mars24/help/algorithm.html
- Pandolf, Givoni & Goldman (1977), J. Appl. Physiol. 43(4), 577-581, doi:10.1152/jappl.1977.43.4.577
- Weir (1949), J. Physiol. 109, 1-9, doi:10.1113/jphysiol.1949.sp004363
- Edwards et al. (2011), THEMIS mosaics, JGR 116, E10008, doi:10.1029/2010JE003755
- Mars landing sites (names, dates, coordinates): NASA GISS Mars24 lander list, https://www.giss.nasa.gov/tools/mars24/help/landers.html
- Kuchynka et al. (2014), Icarus 229, 340-347, doi:10.1016/j.icarus.2013.11.015 (Viking and Pathfinder coordinates)
- Siebach & Grotzinger (2014), JGR Planets 119, doi:10.1002/2013JE004508 (boxwork)
- NASA/JPL news, Curiosity starts unpacking boxwork formations (June 2025)
- NASA/JPL news, Curiosity Rover Sees Martian 'Spiderwebs' Up Close (Feb 2026)
- Horn (1981), Proc. IEEE 69(1), 14-47, doi:10.1109/PROC.1981.11918 (slope method comparison)
- Carr & McGee (2009), PLoS ONE 4(8), e6614, doi:10.1371/journal.pone.0006614 (Apollo walking reference)
- Waligora & Horrigan (1974), Metabolic cost of extravehicular activities, NTRS 19750006325
- Guo et al. (2015), Astrophys. J. 810, 24, doi:10.1088/0004-637X/810/1/24 (RAD dose variations)
- NASA, Apollo 17 Mission Details: https://www.nasa.gov/mission_pages/apollo/missions/apollo17.html
- NASA Curiosity mission page (rover size): https://science.nasa.gov/mission/msl-curiosity/
- NASA CHAPEA (habitat floor area): https://www.nasa.gov/humans-in-space/chapea/
- Curiosity blog posts, sols 4641-4648, 4695-4701, 4709-4715, 4716-4722 (science.nasa.gov)
- NASA Mars Fact Sheet (gravity): https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
- OpenPlanetaryMap: https://www.openplanetary.org/opm
- Leaflet 1.9.4 (BSD-2-Clause): https://leafletjs.com ; three.js r160 (MIT): https://threejs.org
- Rover photos: NASA/JPL-Caltech/MSSS raw images (image IDs listed in src/data/pov-images.json)
- IBM Plex Sans (SIL Open Font License 1.1): https://github.com/IBM/plex
Full list with licences: docs/SOURCES.md

===========================================================================
10. CHECKBOXES
===========================================================================
[ ] I agree to the Terms and Conditions
[ ] I confirm all work is original (created during the event; sources cited; AI use disclosed)

After ticking both: click "Submit for Judging". Look for the confirmation banner.
Download certificate from your profile page.

===========================================================================
SUBMISSION QA (do this Sunday at 4 PM before submitting)
===========================================================================
[ ] Demo link opens in a private/incognito window, no login, plays correctly
[ ] Final project link opens in a private window, no login, example mission shows
[ ] Every field is filled (no "[fill in]" placeholders remain)
[ ] References field has every source from docs/SOURCES.md
[ ] AI use field is complete and honest
[ ] No NASA logos in the app or screenshots
[ ] Screenshots uploaded (JPG/PNG/GIF, up to 10 MB each)
[ ] Both checkboxes ticked
[ ] "Submit for Judging" clicked — confirmation banner seen
