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
(ui-polish branch: add any font, icon set or 3D model here with its license.)

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
5. NOT USED (kept here so nobody re-adds them)
===========================================================================
MOLA MEGDR elevation (too coarse; replaced by the HiRISE DTM). Synthetic terrain (removed).
Mars Trek live THEMIS tile URLs (returned 404; replaced by cut overlays above).
"Radiation zones" layer with +1.5%/100 m scaling (invented; removed).
Solar-storm 10x scenario (not in the cited paper; removed).
52-entry Mars location list with AI-written elevations and safety notes (unverified; replaced by
the 10 landing sites above).
