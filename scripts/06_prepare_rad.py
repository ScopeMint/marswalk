"""
06_prepare_rad.py — Build data/rad-baseline.json from the Hassler et al. 2014 paper.
Output: data/rad-baseline.json

HOW TO RUN:
  python3 scripts/06_prepare_rad.py

SOURCE:
  Hassler et al. (2014), Science 343(6169): "Mars' Surface Radiation Environment Measured
  with the Mars Science Laboratory's Curiosity Rover"
  DOI: 10.1126/science.1244797

  Value: surface absorbed dose rate from galactic cosmic rays.
  Measurement period: sol 15–350 (August 2012 to June 2013).
  Measured AT the surface (not deep underground, not inside a suit).

NOTE: This is a galactic cosmic ray baseline — it excludes solar energetic particle events.
      Actual dose during a solar storm can be much higher.
      We show it as a planning baseline, clearly labeled.
"""

import json
import os

RAD_DATA = {
    'doseRateMuGyPerDay': 233,
    'uncertaintyMuGyPerDay': 12,
    'unit': 'μGy/day (micro-gray per day)',
    'type': 'Surface absorbed dose, galactic cosmic rays',
    'instrument': 'RAD (Radiation Assessment Detector)',
    'mission': 'MSL/Curiosity',
    'location': 'Gale Crater, Mars surface',
    'measurementPeriod': 'Sol 15–350 (August 2012 – June 2013)',
    'doi': '10.1126/science.1244797',
    'citation': 'Hassler et al. (2014), Science 343(6169)',
    'screenNote': 'Measured on the rover at Gale Crater surface. NOT inside a spacesuit. Solar storms and suit shielding not modeled. This is a planning baseline only.',
    'evaEstimateFormula': 'EVA dose estimate = doseRateMuGyPerDay × (EVA_hours / 24)'
}

OUT_FILE = 'data/rad-baseline.json'
os.makedirs('data', exist_ok=True)
with open(OUT_FILE, 'w') as f:
    json.dump(RAD_DATA, f, indent=2)

print(f'[06] Saved: {OUT_FILE}')
print(f'     Baseline: {RAD_DATA["doseRateMuGyPerDay"]} μGy/day')
print(f'     Source: {RAD_DATA["citation"]}')
print(f'     For a 6-hour EVA: {RAD_DATA["doseRateMuGyPerDay"] * 6 / 24:.1f} μGy')
print('     Used by safety.js to compute the radiation estimate card.')
