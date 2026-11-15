SOURCES — MarsWalk / Dark Matter Devs
Every data set, library, image and idea the app uses. Values were checked against the original
source on 2026-11-14 (see "Checked" notes). Format: what | used for | link | license/credit.

===========================================================================
1. NASA MISSION DATA
===========================================================================

MRO HiRISE DTM DTEEC_019698_1750_019988_1750_U01 (1 m/px)
  Used for: elevation, 10 m slope grid, 1 m rock & ridge relief, 3D terrain, routing.
  https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_socet_dtms/items/DTEEC_019698_1750_019988_1750_U01
  COG: https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_019698_1750_ESP_019988_1750/
  Producer: HiRISE team, University of Arizona (McEwen et al. 2007, JGR 112, E05S02, doi:10.1029/2005JE002605).
  License: CC0 (USGS Astrogeology analysis-ready data). Credit: NASA/JPL/University of Arizona.
  Checked: matches Curiosity-reported elevations at 227 waypoints, 2.4 m RMS after a 12.8 m datum offset
  (computed live in the app, site-layers.js).

MRO HiRISE orthoimage ESP_019988_1750_RED_A_01_ORTHO (0.25 m/px)
  Used for: map tiles (src/tiles/hirise) and the 3D texture. Same STAC item as above. CC0.

Mars Odyssey THEMIS Day/Night IR Controlled Mosaics 100 m v2 (Oct 2018), via NASA Mars Trek
  Used for: thermal overlays (relative brightness only, no temperatures).
  https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm/{z}/{row}/{col}.png
  Credit: NASA/JPL-Caltech/Arizona State University. Edwards et al. (2011), JGR 116, E10008, doi:10.1029/2010JE003755

MSL Curiosity traverse + waypoints (NASA/JPL-Caltech MMGIS)
  Used for: rover path layer, target positions, latest position (sol 5073), terrain and slope validation.
  https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json , MSL_waypoints.json

MSL Curiosity raw images (Navcam: NASA/JPL-Caltech; Mastcam: NASA/JPL-Caltech/MSSS)
  Used for: point-of-view photo per target. Image IDs and links: src/data/pov-images.json
  https://mars.nasa.gov/msl/multimedia/raw-images/

MSL Curiosity RAD: Hassler, D. M. et al. (2014), Mars' Surface Radiation Environment Measured with
  the Mars Science Laboratory's Curiosity Rover, Science 343(6169), 1244797, doi:10.1126/science.1244797
  Used for: radiation baseline (src/data/rad-baseline.json, scripts/06_prepare_rad.py).
  Values (checked in the paper text and Table 1/2):
    - average GCR absorbed dose rate at Gale 0.210 +/- 0.040 mGy/day (210 +/- 40 uGy/day)
    - daily GCR dose rate varied 180-225 uGy/day
    - dose-equivalent rate 0.64 +/- 0.12 mSv/day
    - period 7 Aug 2012 - 1 Jun 2013 (~300 sols, near solar maximum)
    - the one surface SEP event (11-12 Apr 2013): ~30% above GCR, 0.025 mGy per event
  Space weather context: NASA (10 June 2024), "NASA Watches Mars Light Up During Epic Solar Storm":
    RAD measured 8,100 micrograys at the surface in the 20 May 2024 storm (about 30 chest X-rays).
    https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm/
  CORRECTED 2026-11-14: earlier drafts used "233 +/- 12 uGy/day" and a "10x solar storm, 1-8 mGy,
  Table S2" scenario. Neither appears in the paper; both were removed.

MSL Curiosity REMS air temperature: MODRDR product (MSL-M-REMS-5-MODRDR-V1.0), NASA PDS Atmospheres Node
  Used for: hourly air temperature by season (src/data/rems-temps.json, scripts/05_prepare_rems.py).
  https://atmos.nmsu.edu/PDS/data/mslrem_1001/
  Instrument: Gomez-Elvira, J. et al. (2012), REMS: The Environmental Sensor Suite for the Mars Science
  Laboratory Rover, Space Sci. Rev. 170, 583-640, doi:10.1007/s11214-012-9921-1
  Method: AMBIENT_TEMP column, median per LTST hour per sol, then median over one sol about every
  25 sols, split into Ls 0-180 and Ls 180-360.
  Ls per sol: REMS daily summary feed (CAB/INTA-CSIC) https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json
  CORRECTED 2026-11-14: earlier drafts used 48 hand-typed values "read from published graphs" with a
  DOI (10.1002/2016JE005168) that belongs to an unrelated Moon paper. Real data shows the afternoon
  peak at ~13-15 LTST and Ls 180-360 as the WARMER half at Gale (median daily max ~-4 C vs ~-21 C).
  Context review (not a data source): Martinez, G. M. et al. (2017), The Modern Near-Surface Martian
  Climate, Space Sci. Rev. 212, 295-338, doi:10.1007/s11214-017-0360-x

Viking MDIM 2.1 + MGS MOLA, via OpenPlanetaryMap
  Used for: global context basemap outside the study area. https://www.openplanetary.org/opm
  Also stored in the app as one whole-Mars picture, src/data/mars-global.jpg: the 64 zoom-3 tiles of the
  same basemap stitched unchanged by scripts/13_build_global_basemap.py (drawn under the live tiles).

Solar storms page (src/data/space-weather.json, src/js/storms.js). All read from the source on 2026-11-15:
  NASA/JPL (29 Sept 2017), "Large Solar Storm Sparks Global Aurora and Doubles Radiation Levels on the Martian
    Surface": surface radiation more than double any RAD had measured; high readings lasted more than two days.
    https://www.jpl.nasa.gov/news/large-solar-storm-sparks-global-aurora-and-doubles-radiation-levels-on-the-martian-surface/
  Zeitlin, C. et al. (2018), Geophys. Res. Lett., doi:10.1029/2018GL077760: dose rates 2 to 3 times GCR background,
    ~12 h at peak, 36 h decline, under 23 g/cm2 of CO2. (Abstract read; full paper not opened.)
  NASA/JPL (10 June 2024), "NASA Watches Mars Light Up During Epic Solar Storm": 20 May 2024, X12 flare, 8,100 uGy,
    30 chest X-rays, particles arrived in tens of minutes, cliffsides / lava tubes quote (link above).
  NASA/JPL (15 Nov 2021), "How NASA's Curiosity Rover Is Making Mars Safer for Astronauts": 4% / 7.5% less
    radiation at the foot of a cliff, Murray Buttes, 9-21 Sept 2016; more than a dozen storms measured.
    https://www.jpl.nasa.gov/news/how-nasas-curiosity-rover-is-making-mars-safer-for-astronauts/
  NASA-STD-3001 Technical Brief OCHMO-TB-020 Rev E (27 Dec 2022), "Design for Ionizing Radiation Protection":
    600 mSv career limit, 250 mSv per solar particle event, acute effects, storm shelter (10 cm water equivalent),
    EVA termination within 2 hours, monitoring / alerting / dosimetry requirements [V2 6099-6101].
    https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
  OUR CALCULATION (labelled on screen): dose on the walk home in a 2017-type storm = 210 uGy/day x (2 to 3) x time.
  OUR INTERPRETATION (labelled on screen): comparing "time to be back inside" with NASA's 2-hour EVA figure.

===========================================================================
2. PAPERS AND REFERENCE NUMBERS
===========================================================================

Pandolf, K. B., Givoni, B. & Goldman, R. F. (1977), Predicting energy expenditure with loads while
  standing or walking very slowly, J. Appl. Physiol. 43(4), 577-581, doi:10.1152/jappl.1977.43.4.577
  Used for: walking energy in the suit & crew model (consumables.js).
Weir, J. B. de V. (1949), New methods for calculating metabolic rate..., J. Physiol. 109, 1-9,
  doi:10.1113/jphysiol.1949.sp004363 — 4.825 kcal per litre O2 (consumables.js).
Mars surface gravity 3.721 m/s^2: NASA Mars Fact Sheet https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
Mars clock: Allison, M. & McEwen, M. (2000), Planet. Space Sci. 48, 215-235; NASA GISS Mars24 algorithm
  https://www.giss.nasa.gov/tools/mars24/help/algorithm.html (tests: tests/marsclock.test.js, 80 checks)
Siebach, K. L. & Grotzinger, J. P. (2014), Volumetric estimates of ancient water on Mount Sharp based
  on boxwork deposits, JGR Planets 119, doi:10.1002/2013JE004508 — boxwork science context.
Mars landing-site coordinates (location library): Wikipedia, List of artificial objects on Mars
  https://en.wikipedia.org/wiki/List_of_artificial_objects_on_Mars (rows cite mission sources), CC BY-SA text; coordinates are facts.

Science target context
  NASA/JPL news, "NASA's Curiosity Mars Rover Starts Unpacking Boxwork Formations" (June 2025):
    https://www.jpl.nasa.gov/news/nasas-curiosity-mars-rover-starts-unpacking-boxwork-formations/
  Curiosity blog sols 4641-4648: https://science.nasa.gov/blog/curiosity-blog-sols-4641-4648-thinking-outside-and-inside-the-boxwork/
  Curiosity blog sols 4695-4701: https://science.nasa.gov/blog/curiosity-blog-sols-4695-4701-searching-for-answers-at-monte-grande/
  Curiosity blog sols 4709-4715: https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit
  Curiosity blog sols 4716-4722: https://science.nasa.gov/blog/curiosity-blog-sols-4716-4722-drilling-success-at-nevado-sajama/

===========================================================================
3. SOFTWARE AND LIBRARIES
===========================================================================

Leaflet 1.9.4 (BSD-2-Clause) — map. Self-hosted copy in src/vendor/. https://leafletjs.com
three.js r160 (MIT) — 3D terrain view. Self-hosted copy in src/vendor/. https://threejs.org
Electron 33 (MIT) + electron-builder (MIT) — Windows desktop app shell (desktop/).
Python: numpy, scipy, rasterio, Pillow — data pipeline (scripts/).
USGS Astrogeology STAC API — data discovery. https://stac.astrogeology.usgs.gov/api/
IBM Plex Sans (SIL Open Font License 1.1) — UI font, self-hosted in src/vendor/fonts/ (static Latin-1 woff2,
  weights 400/500/600/700 + italic), from the official IBM Plex GitHub release https://github.com/IBM/plex

===========================================================================
4. RESEARCH / INSPIRATION (read during planning, nothing copied)
===========================================================================

NASA Space Apps 2026 challenge, Interplanetary Survival Guide: Martian Map:
  https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/
Space Apps Judging & Awards Guide: https://www.spaceappschallenge.org/resources/judging-awards-guide
JPL Mars Trek: https://trek.nasa.gov/mars/
USGS Planetary Geologic Mapping Program: https://www.usgs.gov/centers/astrogeology-science-center/science/planetary-geologic-mapping
Space Data Atlas, Martian Map challenge datasets: https://spacedata.swapniltamse.com/challenges/martian-map/
Other 2026 team repos looked at for scope comparison only:
  https://github.com/AhsanulHoque22/Nasa-Space-Apps-Challenge-2026-Team-Protikriti
  https://github.com/pollob-kumar/nasa-space-apps-martian-map

===========================================================================
TEAM ADDITIONS (Nov 14 evening, main branch)
===========================================================================
[CONFIRMED] Explored-sites layer: HiRISE photo patches for the 9 NASA landing sites (added Nov 14 evening)
  Files: src/data/sites/*.jpg, src/data/landing-sites.json (made by scripts/10_build_landing_sites.py)
  Imagery: NASA Mars Trek WMTS tiles, https://trek.nasa.gov/mars/ (HiRISE mosaics, Mars Reconnaissance Orbiter)
  Tile URL: https://trek.nasa.gov/tiles/Mars/EQ/<product>/1.0.0//default/default028mm/{z}/{row}/{col}.png
  Trek products used: PSP_001521_2025_RED (Viking 1), PSP_001501_2280_RED (Viking 2), sojourner_hirise_mosaic
    (Mars Pathfinder), spirit_hirise_mosaic, opportunity_hirise_mosaic, phoenix_hirise_mosaic,
    curiosity_hirise_mosaic, ESP_058005_1845_RED_spline_rect (InSight),
    JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd (Perseverance / Jezero)
  Credit: NASA/JPL-Caltech/University of Arizona (HiRISE); NASA/JPL-Caltech (Mars Trek). NASA media, no copyright claimed.
  Shown at about 2 m/px (zoom 15 tiles resampled to 2048 px); source mosaics are 0.25 m/px.
  Note: the working Trek URL needs "/1.0.0//" and the catalog product name; Trek was not down (earlier 404s were wrong layer names).
[CONFIRMED] Landing coordinates: Viking 1, Viking 2, Mars Pathfinder
  NASA/JPL Horizons observing-site list for Mars, https://ssd.jpl.nasa.gov/api/horizons.api (CENTER='*@499'), fetched Nov 14 2026
  Values from Kuchynka et al. (2014), Icarus 229, 340-347, doi:10.1016/j.icarus.2013.11.015. Latitude = atan2(z, rho).
[CONFIRMED, APPROXIMATE] Landing coordinates: Spirit, Opportunity, Phoenix, InSight; landing dates for all 9 sites
  NASA GISS Mars24 lander list, https://www.giss.nasa.gov/tools/mars24/help/landers.html
  Published to 0.01 degree (about 600 m on Mars): pins are labelled "approximate" in the app.
[CONFIRMED] Landing coordinates: Curiosity, Perseverance
  NASA/JPL-Caltech MMGIS waypoints (first waypoint): MSL_waypoints.json and
  https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json
  Check: every landing point falls inside the bounds of the NASA mosaic it is drawn on (script stops a site if not).
[TO VERIFY] "Thomas Mutch / Gerald Soffen / Carl Sagan / Columbia / Challenger Memorial Station", "Bradbury Landing",
  "Octavia E. Butler Landing" place names: taken from the NASA GISS Mars24 page above; team to re-read before submission.

[CONFIRMED] First-person walk view (src/js/walk3d.js): where each part of the picture comes from
  Ground shape: src/data/elevation.bin (HiRISE DTM DTEEC_019698_1750_019988_1750_U01, 10 m cells), no vertical exaggeration.
  Ground pattern: src/data/hirise-texture.jpg (2 m/px) plus the app's HiRISE map tiles src/tiles/hirise (zoom 17, about 0.64 m/px)
    stitched along the route. HiRISE ESP_019988_1750, NASA/JPL/University of Arizona.
  Ground colour + near-ground texture: Curiosity Mastcam photo src/data/pov/pov-3-nevado-sajama.jpg
    (NASA image 4711MR1085840182401710E01_DXXX, sol 4711, https://mars.nasa.gov/raw_images/1529646, credit NASA/JPL-Caltech/MSSS).
    The photo's average colour tints the ground; the photo itself is repeated every 2.6 m near the viewer [OUR ASSUMPTION for the scale].
  Rockiness: bump height = 2.5 x the measured 1 m relief in src/data/roughness.bin (capped at 1.1 m). Bump POSITIONS are illustrative.
  Walking speed: route distance / route time from the planner. Photos shown at targets: src/data/pov-images.json (real Curiosity images).
  OUR ASSUMPTIONS (labelled on screen): eye height 1.7 m, field of view 70 degrees, sky colours #d9b48c / #9a7b5e,
    east-to-west sun arc, haze ending at 2.3 km (hides the edge of the 4 km terrain model), time-lapse factors.
  Library: three.js r160 (MIT), already bundled in src/vendor.

[CONFIRMED] First-person walk: readouts are cross-referenced to the planner (no separate numbers)
  Distance and "to target" = fraction walked x STATE.route.distanceMeters; one-way time = fraction x STATE.route.timeSeconds;
  elevation = STATE.route.profile (the main page's elevation chart). Same values and rounding as the summary card and visor HUD.
[CONFIRMED] Base camp habitat floor area (src/js/walk3d.js, walkCamp): 17.5 m x 9 m = 157.5 m2 = 1,700 sq ft
  Source: NASA CHAPEA "Mars Dune Alpha", a 1,700-square-foot 3D-printed habitat for a crew of four
  https://www.nasa.gov/humans-in-space/chapea/about-chapea/ and https://www.nasa.gov/humans-in-space/chapea/
  Note: one NASA photo caption says 1,200 sq ft; the CHAPEA pages say 1,700. We use 1,700.
  Comm mast 10 m: the same height our Communication zones (line-of-sight) layer already assumes.
  OUR ASSUMPTION (concept only, not a NASA design): vault shape, airlock size, windows, solar arrays, terrace, layout,
    and the camp's position 22 m behind and 7 m beside the route start. The camp is built along the hillside contour
    read from the HiRISE elevation grid.
[TO VERIFY] Rover size 3.0 x 2.7 x 2.2 m = Curiosity's published size (about 10 ft long, 9 ft wide, 7 ft tall; NASA Curiosity
  fact sheet). Team to confirm on nasa.gov before submission. The rover's loop around the camp and its speed are ILLUSTRATIVE.

[SUPERSEDED 2026-11-15] Temperature data, daily-record version (scripts/11_rems_from_nasa_record.py).
  Replaced by REAL HOURLY REMS data from NASA PDS (scripts/05_prepare_rems.py, see section 1): peak 15:00 LTST,
  low 05:00, Ls 180-360 warmer. The planner now reads today's season. Kept below for the record.
  Source: Curiosity REMS daily air temperature record, NASA Mars / Centro de Astrobiologia (CSIC-INTA)
    https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json   (4,745 sols, sol 1 to 4995)
    The feed states it is for outreach use; the science archive is the NASA PDS REMS dataset.
  MEASURED: mean daily high / low air temperature per half of the Mars year:
    Ls 0-180   (2,524 sols): high -19.1 C, low -77.9 C   (cooler half-year at Gale: southern autumn and winter)
    Ls 180-360 (2,193 sols): high  -4.4 C, low -70.7 C   (warmer half-year at Gale: southern spring and summer)
  APPROXIMATE: the hour-by-hour shape between the low and the high (the record has no hourly values).
    The shape kept from the first version peaks at 11:00 and bottoms at 03:00; real air temperature usually peaks in the
    early afternoon and bottoms near sunrise. [TO VERIFY against hourly PDS REMS data if time allows.]
  WHAT WAS WRONG BEFORE: the hand-typed first version had the seasons the wrong way round (Ls 0-180 "milder", high -2 C).
    The spacewalk temperature on the route card was about 17 C too warm at midday. The data keys in the file
    (northern_spring_summer = Ls 0-180, northern_autumn_winter = Ls 180-360) are unchanged so no code had to move.
  NOTE: the planner always reads the Ls 0-180 curve. Today is Ls 22, so that is the right one now.


===========================================================================
5. NOT USED (kept here so nobody re-adds them)
===========================================================================
MOLA MEGDR elevation (too coarse; replaced by the HiRISE DTM). Synthetic terrain (removed).
Mars Trek live THEMIS tile URLs (returned 404; replaced by cut overlays above).
"Radiation zones" layer with +1.5%/100 m scaling (invented; removed).
Solar-storm 10x scenario (not in the cited paper; removed).
52-entry Mars location list with AI-written elevations and safety notes (unverified; replaced by
the 10 landing sites above).
