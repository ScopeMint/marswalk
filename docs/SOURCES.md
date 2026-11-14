SOURCES LOG — MarsWalk / Dark Matter Devs
Rule: every data set, library, image and idea gets a line here the moment we use it.
Format: name | what we used it for | link | license/terms | date accessed

STATUS KEY: [TO VERIFY] = URL found, not tested yet. [CONFIRMED] = accessed and working.

===========================================================================
LAYER A — TOPOGRAPHY AND ELEVATION (try in order; use first that works)
===========================================================================

[TO VERIFY] HiRISE DTM search (best, ~1 m/post)
  Source: University of Arizona HiRISE DTM catalog
  URL: https://www.uahirise.org/dtm/
  How to find: search "Gale" or "Murray Buttes" or "Aeolis Mons"
  What to download: the .IMG or GeoTIFF file (not the browse image)
  License: NASA/JPL-Caltech/UA — public domain / free use with credit

[TO VERIFY] CTX stereo mosaic (good fallback, ~20 m/post)
  Source: Murray Lab at Caltech
  URL: https://murray-lab.caltech.edu/CTX/
  Coverage: global Mars, should include Gale
  License: free for non-commercial and educational use, credit required

[TO VERIFY] USGS Astropedia Mars products
  Search URL: https://astropedia.astrogeology.usgs.gov/search?ptype=product&target=mars
  Search for: "HiRISE" OR "CTX" with region near Gale Crater (-5.4, 137.8 roughly)
  License: USGS products are public domain

[TO VERIFY] MOLA 128ppd global (last resort, ~200 m/post — coarse but it works)
  Source: PDS Geosciences Node
  URL: https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/
  File: megt90n000cb.img (the 128 pixels per degree global file)
  License: NASA/JPL public domain
  NOTE: If using MOLA, say on screen: "Elevation from MOLA global model (~200 m resolution).
  Individual boulders are not visible. Used as a teaching illustration."

===========================================================================
LAYER B — OPTICAL IMAGERY (Mars Trek tiles, loaded live)
===========================================================================

[TO VERIFY] Mars Trek tile API documentation
  URL: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars
  License: NASA Open Data — free for non-commercial use with credit

[TO VERIFY] Mars Trek WMTS base URL pattern
  Pattern: https://trek.nasa.gov/tiles/Mars/EQ/{LayerName}/default/default028mm/{z}/{y}/{x}.jpg
  Test on Saturday M2: plug in a known layer name, zoom 5, row 8, col 10, see if a tile loads.

[TO VERIFY] CTX mosaic layer (HiRISE zoom companion, ~5 m/px)
  Likely layer name: Mars_MRO_CTX_Mosaic_global_006_v1 (verify in Trek layer catalog)
  Trek catalog: https://trek.nasa.gov/mars/#v=0.1&x=137.44&y=-4.59&z=10&p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104905&d=&l=
  Mission: Mars Reconnaissance Orbiter (MRO), CTX camera
  Resolution: ~5 m/px
  Credit: NASA/JPL-Caltech/MSSS

[TO VERIFY] HiRISE mosaic layer (~0.25 m/px where available)
  Likely layer name: Mars_MRO_HiRISE_Red_roi_site22 (or search Trek catalog for Curiosity area)
  Mission: MRO, HiRISE camera
  Resolution: ~0.25 m/px
  Credit: NASA/JPL-Caltech/UA

===========================================================================
LAYER C — THERMAL (Mars Trek tiles, loaded live)
===========================================================================

[TO VERIFY] THEMIS Day IR mosaic (~100 m/px)
  Likely layer name: Mars_MO_THEMIS-Day-IR_mosaic_global_100m_v12
  Mission: Mars Odyssey, THEMIS instrument
  URL pattern: same Mars Trek WMTS pattern above
  Legend: relative brightness, warmer = brighter. Do NOT show Kelvin values unless sourced.
  Credit: NASA/JPL-Caltech/ASU

[TO VERIFY] THEMIS Night IR mosaic (~100 m/px)
  Likely layer name: Mars_MO_THEMIS-Night-IR_mosaic_global_100m_v14
  Mission: Mars Odyssey, THEMIS instrument
  Credit: NASA/JPL-Caltech/ASU

===========================================================================
LAYER D — SPECTRAL / MINERALS (optional, only if reachable by Sat 2 PM)
===========================================================================

[TO VERIFY] CRISM mineral summary products
  Source: JHU APL / PDS Geosciences Node
  Search URL: https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/
  Alternative: pre-made mineral maps from published Gale Crater papers
  Mission: MRO, CRISM instrument
  Fallback: Use cited Curiosity text findings per target (still counts for Validity)
  Credit: NASA/JPL-Caltech/JHU APL/USGS

===========================================================================
LAYER E — RADIATION (Curiosity RAD)
===========================================================================

[TO VERIFY] Hassler et al. 2014 — published RAD surface dose rate
  Citation: Hassler, D. M. et al. (2014). Mars' surface radiation environment measured with the
  Mars Science Laboratory's Curiosity rover. Science, 343(6169).
  DOI: https://doi.org/10.1126/science.1244797
  Value to extract: galactic cosmic ray absorbed dose rate at surface (~233 μGy/day, verify in paper)
  Store in: data/rad-baseline.json with value, unit, date range, DOI
  Note to show on screen: "Measured by Curiosity's RAD instrument at Gale Crater.
  Not inside a spacesuit. Solar storms not included."

[TO VERIFY] NASA PDS RAD dataset
  URL: https://pds.nasa.gov/ds-view/pds/viewDataset.jsp?dsid=MSL-M-RAD-4-RDR-V1.0

[RESEARCH TASK — Saturday morning, 30 min] NASA EVA radiation dose limit
  Source to check: NASA-STD-3001 Volume 2 (Human Integration Design Handbook)
  URL: https://www.nasa.gov/sites/default/files/atoms/files/nasa-std-3001-vol-2.pdf
  What to look for: short-term EVA dose limit in mSv or mGy
  If found: add pass/caution/fail to the radiation card (this significantly strengthens Validity score)
  If not found by Saturday 6 PM: show estimate only with note "EVA dose limit not modeled"

===========================================================================
LAYER F — TEMPERATURE (Curiosity REMS)
===========================================================================

[TO VERIFY] Curiosity REMS data — PDS
  URL: https://pds.nasa.gov/ds-view/pds/viewDataset.jsp?dsid=MSL-M-REMS-4-RDR-V1.0

[TO VERIFY] REMS published temperature summaries
  REMS website (CAB/INTA-CSIC): https://cab.inta-csic.es/rems/en/
  Published values: air temp ~-60°C night to 0°C afternoon; ground temp wider range
  Alternative: use temperature values from published papers or NASA mission pages (cite exactly)

===========================================================================
LAYER F — POINT-OF-VIEW PHOTOS (Curiosity Mastcam / Navcam)
===========================================================================

[TO VERIFY] Curiosity raw image archive
  URL: https://mars.nasa.gov/msl/multimedia/raw-images/
  Filter by: Mastcam (best quality), Navcam (wider view), near science targets
  Each photo must have: image ID (e.g. 1234ML0012345678000E1_DXXX), sol, credit "NASA/JPL-Caltech/MSSS"

[TO VERIFY] NASA Image and Video Library
  URL: https://images.nasa.gov/ (search "Curiosity" + location description)

[TO VERIFY] Curiosity Mastcam mosaic images at Mount Sharp
  NASA press release images: https://www.jpl.nasa.gov/images?search=curiosity+mount+sharp
  License: NASA images are public domain; always credit "NASA/JPL-Caltech/MSSS" or as specified

===========================================================================
LIBRARIES
===========================================================================

[CONFIRMED] Leaflet.js v1.9.x | interactive map display | https://leafletjs.com | BSD-2-Clause license
  CDN: https://unpkg.com/leaflet@1.9.4/dist/leaflet.js

===========================================================================
CONFIRMED SOURCES (add each one here when accessed and working)
===========================================================================

(none confirmed yet — confirm on Saturday as you use each one)

===========================================================================
IDEAS / PAPERS / INSPIRATION
===========================================================================

[TO VERIFY] Grotzinger et al. 2014 — A Habitable Fluvio-Lacustrine Environment at Yellowknife Bay, Gale Crater
  Science, 343(6169). doi:10.1126/science.1242777 — geological context for science targets

[TO VERIFY] Palucis et al. 2016 — Sequence and relative timing of large lakes in Gale Crater
  Journal of Geophysical Research, 121. — route terrain context

JPL Mars Trek (inspiration and tile source): https://trek.nasa.gov/mars/
USGS Planetary Geologic Mapping Program (context): https://www.usgs.gov/centers/astrogeology-science-center/science/planetary-geologic-mapping
