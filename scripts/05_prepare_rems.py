"""
05_prepare_rems.py — Build data/rems-temps.json from published REMS seasonal temperature data.
Output: data/rems-temps.json

HOW TO RUN:
  python3 scripts/05_prepare_rems.py

SOURCE:
  Martínez et al. (2017), Journal of Geophysical Research: Planets
  REMS team data: https://cab.inta-csic.es/rems/en/

  These values are typical seasonal means from published figures in the Martínez et al. paper.
  They are approximate — read from published graphs, not raw PDS data.
  Marked [S] in the app because they come from a published peer-reviewed source.

NOTE ON VALUES:
  Air temperature at 1.6 m height (Curiosity REMS air temperature sensor).
  NOT ground temperature (which swings wider, +20°C day to -100°C night).
  NOT inside a spacesuit (suit thermal limits not modeled).
  Two seasons: Ls 0-180 (northern spring/summer) and Ls 180-360 (northern autumn/winter).
"""

import json
import os

# Approximate hourly air temperature at 1.6 m (from Martínez et al. 2017 figures)
# Source: Martínez et al. (2017), JGR Planets, doi:10.1002/2016JE005168
# Values are seasonal means in degrees Celsius, 24 local Mars hours (0-23)
# Local hour 0 = midnight, hour 12 = noon

REMS_DATA = {
    'source': 'Martínez et al. (2017), JGR Planets, doi:10.1002/2016JE005168 + REMS team (cab.inta-csic.es/rems/en/)',
    'unit': 'Celsius',
    'sensor': 'REMS air temperature at 1.6 m height from Curiosity rover',
    'note': 'Approximate seasonal means from published figures. Suit thermal limits not modeled. Ground temperature has wider swings (day: +20°C, night: -100°C).',
    'seasons': {
        'northern_spring_summer': {
            'lsSeason': 'Ls 0-180',
            'description': 'Northern spring/summer. Mars is farther from Sun (aphelion ~Ls 70). Milder season.',
            'localHours': list(range(24)),
            # Midnight to noon to midnight — rough seasonal mean from published REMS data
            'airTempC': [
                -73,  # 0h midnight
                -75,  # 1h
                -78,  # 2h
                -80,  # 3h (coldest before dawn)
                -78,  # 4h
                -72,  # 5h
                -60,  # 6h (dawn warming)
                -45,  # 7h
                -30,  # 8h
                -15,  # 9h
                -5,   # 10h
                -2,   # 11h
                -3,   # 12h (noon — slightly drops due to convection)
                -5,   # 13h
                -10,  # 14h
                -20,  # 15h (afternoon cooling)
                -35,  # 16h
                -50,  # 17h
                -60,  # 18h (sunset)
                -67,  # 19h
                -70,  # 20h
                -71,  # 21h
                -72,  # 22h
                -73,  # 23h
            ]
        },
        'northern_autumn_winter': {
            'lsSeason': 'Ls 180-360',
            'description': 'Northern autumn/winter. Mars closer to Sun (perihelion ~Ls 251). Dustier, colder nights.',
            'localHours': list(range(24)),
            'airTempC': [
                -83,  # 0h
                -86,  # 1h
                -88,  # 2h
                -89,  # 3h (coldest)
                -88,  # 4h
                -83,  # 5h
                -70,  # 6h
                -55,  # 7h
                -40,  # 8h
                -25,  # 9h
                -12,  # 10h
                -8,   # 11h
                -9,   # 12h
                -12,  # 13h
                -20,  # 14h
                -32,  # 15h
                -45,  # 16h
                -58,  # 17h
                -68,  # 18h
                -75,  # 19h
                -79,  # 20h
                -81,  # 21h
                -82,  # 22h
                -83,  # 23h
            ]
        }
    }
}

# Validate: nighttime should be colder than daytime
for season_key, season in REMS_DATA['seasons'].items():
    temps = season['airTempC']
    night_temps = [temps[0], temps[1], temps[2], temps[3]]
    day_temps   = [temps[10], temps[11], temps[12], temps[13]]
    if min(night_temps) >= min(day_temps):
        print(f'WARNING: {season_key} — nighttime is not colder than daytime. Check values.')
    else:
        print(f'[05] {season_key}: night min={min(night_temps)}°C  day peak={max(day_temps)}°C  OK')

OUT_FILE = 'data/rems-temps.json'
os.makedirs('data', exist_ok=True)
with open(OUT_FILE, 'w') as f:
    json.dump(REMS_DATA, f, indent=2)

print(f'[05] Saved: {OUT_FILE}')
print('     Used by safety.js to show temperature range during the EVA window.')
