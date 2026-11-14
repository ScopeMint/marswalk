"""
07_check_data.py — Sanity checks for all data files. Run after 03_make_grids.py.
Prints PASS or FAIL for each check.

HOW TO RUN:
  python3 scripts/07_check_data.py
"""

import os
import sys
import json
import numpy as np

DATA_DIR = 'data'

def check(label, condition, detail=''):
    if condition:
        print(f'  PASS  {label}')
    else:
        print(f'  FAIL  {label}{(" — " + detail) if detail else ""}')
    return condition

def main():
    all_pass = True
    print('\n=== MarsWalk Data Sanity Checks ===\n')

    # ── aoi.json ──────────────────────────────────────────────────────────────
    print('aoi.json:')
    aoi_path = os.path.join(DATA_DIR, 'aoi.json')
    aoi_exists = check('  aoi.json exists', os.path.exists(aoi_path))
    all_pass = all_pass and aoi_exists

    if aoi_exists:
        with open(aoi_path) as f:
            aoi = json.load(f)

        required = ['west', 'east', 'south', 'north', 'cellSizeMeters', 'width', 'height']
        for field in required:
            ok = check(f'  has field: {field}', field in aoi)
            all_pass = all_pass and ok

        if 'width' in aoi and 'height' in aoi:
            w, h = aoi['width'], aoi['height']
            check(f'  grid is at least 10x10', w >= 10 and h >= 10, f'{w}x{h}')
            check(f'  grid is at most 1000x1000', w <= 1000 and h <= 1000, f'{w}x{h}')
            check('  south < north', aoi.get('south', 0) < aoi.get('north', 0))
            check('  west < east',   aoi.get('west', 0)  < aoi.get('east', 0))
    print()

    # ── elevation.bin ─────────────────────────────────────────────────────────
    print('elevation.bin:')
    elev_path = os.path.join(DATA_DIR, 'elevation.bin')
    if check('  elevation.bin exists', os.path.exists(elev_path)):
        expected_bytes = aoi['width'] * aoi['height'] * 4
        actual_bytes = os.path.getsize(elev_path)
        check('  file size matches grid', actual_bytes == expected_bytes,
              f'{actual_bytes} bytes != {expected_bytes} expected')

        elev = np.fromfile(elev_path, dtype=np.float32).reshape(aoi['height'], aoi['width'])
        valid = elev[np.isfinite(elev)]
        nan_pct = 100 * (1 - len(valid)/elev.size)
        check(f'  has valid cells',          len(valid) > 0)
        check(f'  <20% NaN cells',           nan_pct < 20, f'{nan_pct:.1f}%')
        check(f'  min elevation > -9000 m',  valid.min() > -9000, f'{valid.min():.1f} m')
        check(f'  max elevation < 22000 m',  valid.max() < 22000, f'{valid.max():.1f} m')
        print(f'       Elevation range: {valid.min():.1f} m to {valid.max():.1f} m')
        print(f'       NaN cells: {nan_pct:.1f}%')
    else:
        all_pass = False
    print()

    # ── slope.bin ─────────────────────────────────────────────────────────────
    print('slope.bin:')
    slope_path = os.path.join(DATA_DIR, 'slope.bin')
    if check('  slope.bin exists', os.path.exists(slope_path)):
        expected_bytes = aoi['width'] * aoi['height'] * 4
        actual_bytes = os.path.getsize(slope_path)
        check('  file size matches grid', actual_bytes == expected_bytes)

        slope = np.fromfile(slope_path, dtype=np.float32).reshape(aoi['height'], aoi['width'])
        check(f'  min slope >= 0°',   slope.min() >= 0,   f'{slope.min():.2f}°')
        check(f'  max slope <= 90°',  slope.max() <= 90,  f'{slope.max():.2f}°')
        zero_pct = 100 * (slope == 0).sum() / slope.size
        check(f'  <50% zero-slope cells (would indicate computation error)',
              zero_pct < 50, f'{zero_pct:.1f}% are 0°')
        print(f'       Slope range: {slope.min():.2f}° to {slope.max():.2f}°')
        print(f'       Cells > 15°: {100*(slope>15).sum()/slope.size:.1f}%  (steeper than default limit)')
    else:
        all_pass = False
    print()

    # ── roughness.bin ─────────────────────────────────────────────────────────
    print('roughness.bin:')
    rough_path = os.path.join(DATA_DIR, 'roughness.bin')
    if check('  roughness.bin exists', os.path.exists(rough_path)):
        expected_bytes = aoi['width'] * aoi['height'] * 4
        actual_bytes = os.path.getsize(rough_path)
        check('  file size matches grid', actual_bytes == expected_bytes)

        rough = np.fromfile(rough_path, dtype=np.float32).reshape(aoi['height'], aoi['width'])
        check('  min roughness >= 0',    rough.min() >= 0, f'{rough.min():.3f} m')
        check('  max roughness < 1000 m', rough.max() < 1000, f'{rough.max():.2f} m')
    else:
        all_pass = False
    print()

    # ── slope-overlay.png ─────────────────────────────────────────────────────
    print('slope-overlay.png:')
    overlay_path = os.path.join(DATA_DIR, 'slope-overlay.png')
    if check('  slope-overlay.png exists', os.path.exists(overlay_path)):
        size_kb = os.path.getsize(overlay_path) / 1024
        check('  reasonable file size (10–2000 KB)', 10 < size_kb < 2000, f'{size_kb:.0f} KB')
        print(f'       File size: {size_kb:.0f} KB')
    else:
        all_pass = False
    print()

    # ── rad-baseline.json ─────────────────────────────────────────────────────
    print('rad-baseline.json:')
    rad_path = os.path.join(DATA_DIR, 'rad-baseline.json')
    if check('  rad-baseline.json exists', os.path.exists(rad_path)):
        with open(rad_path) as f:
            rad = json.load(f)
        check('  has doseRateMuGyPerDay', 'doseRateMuGyPerDay' in rad)
        check('  has doi',                'doi' in rad)
        check('  dose in plausible range', 50 < rad.get('doseRateMuGyPerDay', 0) < 500,
              str(rad.get('doseRateMuGyPerDay')))
    else:
        all_pass = False
    print()

    # ── rems-temps.json ───────────────────────────────────────────────────────
    print('rems-temps.json:')
    rems_path = os.path.join(DATA_DIR, 'rems-temps.json')
    if check('  rems-temps.json exists', os.path.exists(rems_path)):
        with open(rems_path) as f:
            rems = json.load(f)
        check('  has seasons',  'seasons' in rems)
        if 'seasons' in rems:
            for skey, season in rems['seasons'].items():
                has_24h = 'localHours' in season and len(season['localHours']) == 24
                has_temps = 'airTempC' in season and len(season['airTempC']) == 24
                check(f'  {skey}: 24 hours of data', has_24h and has_temps)
                if has_temps:
                    temps = season['airTempC']
                    night_min = min(temps[0], temps[3])
                    day_max = max(temps[10], temps[11], temps[12])
                    check(f'  {skey}: night colder than day', night_min < day_max,
                          f'night={night_min}°C day={day_max}°C')
    else:
        all_pass = False
    print()

    # ── Summary ───────────────────────────────────────────────────────────────
    if all_pass:
        print('=== ALL CHECKS PASSED — data files are ready ===\n')
    else:
        print('=== SOME CHECKS FAILED — fix the issues above before continuing ===\n')
        sys.exit(1)


if __name__ == '__main__':
    main()
