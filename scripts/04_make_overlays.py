"""
04_make_overlays.py — Color the slope grid into an RGBA PNG overlay for the Leaflet map.
Output: data/slope-overlay.png

HOW TO RUN:
  python3 scripts/04_make_overlays.py

REQUIRES: data/slope.bin and data/aoi.json (run 03_make_grids.py first)

The PNG is exactly the same pixel dimensions as the grid (width x height from aoi.json).
Leaflet's imageOverlay places it precisely on the map using the aoi.json bounds.
Slope class colors match CLAUDE.md section 11 and CONFIG.slopeClasses in config.js.
"""

import os
import sys
import json
import numpy as np

SLOPE_FILE = 'src/data/slope.bin'
AOI_FILE   = 'src/data/aoi.json'
OUT_FILE   = 'src/data/slope-overlay.png'

# Slope class colors (hex → RGBA) — matches styles.css --slope-X variables
SLOPE_CLASSES = [
    (0,   5,  (46,  125, 91,  180)),   # 0–5°   very gentle  #2E7D5B at 70% opacity
    (5,  10,  (143, 191, 77,  180)),   # 5–10°  gentle       #8FBF4D
    (10, 15,  (242, 177, 52,  200)),   # 10–15° moderate     #F2B134
    (15, 20,  (232, 116, 46,  210)),   # 15–20° steep        #E8742E
    (20, 999, (229, 72,  77,  220)),   # >20°   very steep   #E5484D
]


def main():
    if not os.path.exists(SLOPE_FILE):
        print(f'ERROR: {SLOPE_FILE} not found. Run scripts/03_make_grids.py first.')
        sys.exit(1)

    try:
        from PIL import Image
    except ImportError:
        print('Pillow not found. Install it: pip3 install Pillow')
        sys.exit(1)

    # Load aoi.json for grid dimensions
    with open(AOI_FILE) as f:
        aoi = json.load(f)
    width, height = aoi['width'], aoi['height']

    # Load slope grid
    slope = np.fromfile(SLOPE_FILE, dtype=np.float32).reshape((height, width))
    print(f'[04] Slope grid: {width} x {height}  range: {slope.min():.2f}° – {slope.max():.2f}°')

    # Build RGBA image
    rgba = np.zeros((height, width, 4), dtype=np.uint8)

    for lo, hi, color in SLOPE_CLASSES:
        mask = (slope >= lo) & (slope < hi)
        rgba[mask] = color

    # Cells that are exactly 0 AND surrounded by 0s are likely no-data — make transparent
    # (Real Mars terrain always has some slope variation; a perfect 0 field = missing data)
    nodata_mask = (slope == 0.0)
    if nodata_mask.sum() > 0.5 * slope.size:
        print('WARNING: >50% of cells are slope=0. Possible data issue. Making 0° cells semi-transparent.')
        rgba[nodata_mask, 3] = 0  # transparent for no-data

    img = Image.fromarray(rgba, 'RGBA')
    img.save(OUT_FILE)

    size_kb = os.path.getsize(OUT_FILE) / 1024
    print(f'[04] Saved: {OUT_FILE}  ({size_kb:.1f} KB)')
    print(f'     Leaflet will place this image exactly at:')
    print(f'     [[{aoi["south"]}, {aoi["west"]}], [{aoi["north"]}, {aoi["east"]}]]')
    print(f'\n[04] DONE. Run scripts/07_check_data.py to verify all files.')


if __name__ == '__main__':
    main()
