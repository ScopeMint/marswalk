"""
06_prepare_rad.py - Build src/data/rad-baseline.json from Hassler et al. (2014).

HOW TO RUN:
  python scripts/06_prepare_rad.py

SOURCE (values checked against the paper text, Nov 14 2026):
  Hassler, D. M. et al. (2014), "Mars' Surface Radiation Environment Measured with the Mars
  Science Laboratory's Curiosity Rover", Science 343(6169), 1244797, doi:10.1126/science.1244797

  - Average total galactic cosmic ray (GCR) dose rate at Gale crater (-4.4 km MOLA):
      0.210 +/- 0.040 mGy/day  (tissue-like E detector)  -> 210 +/- 40 uGy/day
  - Daily GCR dose rate varied between 180 and 225 uGy/day (air pressure, season, solar activity).
  - Dose-equivalent rate: 0.64 +/- 0.12 mSv/day.
  - Observation period: ~300 sols, 7 August 2012 to 1 June 2013, near solar maximum (cycle 24).
  - The one solar energetic particle (SEP) event seen on the surface (11-12 April 2013) was small:
    ~30% over the GCR rate, 0.025 mGy for the whole event. No storm multiplier is used in the app.

NOTE: Measured on the rover at the surface. Not inside a suit; suit shielding and solar storms
      are not modeled.
"""

import json
import os

RAD_DATA = {
    'doseRateMuGyPerDay': 210,
    'uncertaintyMuGyPerDay': 40,
    'rangeMuGyPerDay': [180, 225],
    'doseEquivalentMicroSvPerDay': 640,
    'doseEquivalentUncertaintyMicroSvPerDay': 120,
    'unit': 'μGy/day (micro-gray per day, absorbed dose in tissue-like detector)',
    'type': 'Surface absorbed dose rate, galactic cosmic rays (GCR)',
    'instrument': 'RAD (Radiation Assessment Detector), E detector (tissue-like)',
    'mission': 'MSL/Curiosity',
    'location': 'Gale Crater, Mars surface (-4.4 km MOLA)',
    'measurementPeriod': '7 Aug 2012 - 1 Jun 2013 (~300 sols, near solar maximum)',
    'doi': '10.1126/science.1244797',
    'citation': 'Hassler et al. (2014), Science 343(6169), 1244797',
    'screenNote': 'Average galactic cosmic ray dose measured on the rover at Gale (210 ± 40 μGy/day; '
                  'daily values 180-225). Not inside a spacesuit. Suit shielding and solar storms are not modeled.',
    'sepNote': 'The only solar particle event RAD saw on the surface in this period (11-12 April 2013) '
               'raised the dose rate ~30% and added 0.025 mGy in total. Larger events are possible; '
               'no storm scenario is modeled.',
    'largestSurfaceEvent': {
        'date': '2024-05-20',
        'doseMuGy': 8100,
        'note': 'Largest solar-storm dose RAD has measured on the surface since landing: 8,100 μGy for a person '
                'standing next to the rover (NASA: about 30 chest X-rays), about 39 days of normal background in one event.',
        'source': 'NASA, "NASA Watches Mars Light Up During Epic Solar Storm", 10 June 2024',
        'url': 'https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm/',
    },
    'evaEstimateFormula': 'EVA dose estimate = doseRateMuGyPerDay x (EVA_hours / 24)',
}

OUT_FILE = os.path.join('src', 'data', 'rad-baseline.json')
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(RAD_DATA, f, indent=2, ensure_ascii=False)

print(f'[06] Saved: {OUT_FILE}')
print(f'     Baseline: {RAD_DATA["doseRateMuGyPerDay"]} +/- {RAD_DATA["uncertaintyMuGyPerDay"]} uGy/day')
print(f'     For a 6-hour EVA: ~{round(RAD_DATA["doseRateMuGyPerDay"] * 6 / 24)} uGy')
