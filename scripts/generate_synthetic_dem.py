"""
generate_synthetic_dem.py — Creates synthetic terrain grids for the Gale Crater / Mount Sharp
study area so the web app can run route planning before real NASA elevation data is downloaded.

IMPORTANT: This is SYNTHETIC (simulated) data. The app labels all computed numbers with
"[synthetic terrain — replace with real DTM before submission]" so judges see this clearly.
Replace with real HiRISE or CTX DTM data on Saturday morning using 03_make_grids.py.

Study area: 6 km x 6 km centered at -5.10°S, 137.75°E (Murray formation boxwork zone)
Grid: 20 m cells, 300 x 300 = 90,000 cells
Elevation range: approx -4,200 m to -3,500 m (crater floor rising toward Mount Sharp)

Output files (all in src/data/):
  aoi.json        — bounds, cell size, grid dimensions, default habitat position
  elevation.bin   — Float32, row-major, top-left origin, metres above MOLA datum
  slope.bin       — Float32, degrees (0–90)
  roughness.bin   — Float32, metres (std dev of elevation in 3x3 neighbourhood)
  slope-overlay.png — RGBA image, one pixel per cell, slope classes coloured
"""

import numpy as np
import json
import os
from scipy.ndimage import gaussian_filter, generic_filter

# ── Study area parameters ─────────────────────────────────────────────────────
CENTER_LAT  = -5.10   # Murray formation boxwork zone
CENTER_LON  = 137.75
SIZE_M      = 6000    # 6 km side
CELL_M      = 20      # 20 m cells
GRID_N      = SIZE_M // CELL_M  # 300 x 300

# Mars km per degree (approximate at equatorial latitudes)
KM_PER_DEG  = 59.274  # used only for display / aoi.json — not for grid math
DEG_HALF    = (SIZE_M / 2) / (KM_PER_DEG * 1000)  # 0.05064°

WEST  = CENTER_LON - DEG_HALF
EAST  = CENTER_LON + DEG_HALF
SOUTH = CENTER_LAT - DEG_HALF
NORTH = CENTER_LAT + DEG_HALF

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
os.makedirs(OUT_DIR, exist_ok=True)

print(f'Study area: W={WEST:.4f} E={EAST:.4f} S={SOUTH:.4f} N={NORTH:.4f}')
print(f'Grid: {GRID_N} x {GRID_N} cells at {CELL_M} m/cell')

# ── Build synthetic elevation ─────────────────────────────────────────────────
# The terrain model has three components:
#   1. Regional slope — Mount Sharp rises toward the SE corner
#   2. Ridges — a few linear boxwork ridges running NE-SW (matches Curiosity observations)
#   3. Filtered noise — adds realistic small-scale roughness

rng = np.random.default_rng(42)  # fixed seed for reproducibility

# Coordinate grids (row 0 = north edge)
row_idx, col_idx = np.meshgrid(np.arange(GRID_N), np.arange(GRID_N), indexing='ij')

# Normalised coordinates [0, 1] where (0,0) = NW corner (top-left)
norm_x = col_idx / (GRID_N - 1)   # west→east
norm_y = row_idx / (GRID_N - 1)   # north→south

# 1. Base elevation: crater floor at -4,200 m; Mount Sharp rises toward SE
#    SE corner ≈ -3,500 m; gradient across 6 km ≈ 700 m / 6000 m ≈ 0.117 m/m = ~6.7°
base_elev = -4200.0 + 700.0 * (0.6 * norm_x + 0.4 * norm_y)

# 2. Boxwork ridges: 4 roughly parallel ridges running NE–SW
#    Each ridge is a narrow Gaussian bump across-track
def ridge(norm_x, norm_y, offset_x, offset_y, amplitude, width, angle_deg):
    angle = np.radians(angle_deg)
    # Project coords onto a direction perpendicular to the ridge strike
    perp = -(norm_x - offset_x) * np.sin(angle) + (norm_y - offset_y) * np.cos(angle)
    return amplitude * np.exp(-0.5 * (perp / width) ** 2)

ridge_elev  = ridge(norm_x, norm_y, 0.35, 0.50,  80, 0.012, -55)
ridge_elev += ridge(norm_x, norm_y, 0.50, 0.45,  65, 0.010, -58)
ridge_elev += ridge(norm_x, norm_y, 0.60, 0.55,  55, 0.009, -50)
ridge_elev += ridge(norm_x, norm_y, 0.72, 0.60,  70, 0.011, -52)
# A broader mound in the NW representing a butte
ridge_elev += ridge(norm_x, norm_y, 0.20, 0.30, 120, 0.040, -20)

# 3. Filtered noise — two scales (large swells + small roughness)
noise_large = gaussian_filter(rng.standard_normal((GRID_N, GRID_N)), sigma=25) * 60
noise_small = gaussian_filter(rng.standard_normal((GRID_N, GRID_N)), sigma=4)  * 12

elevation = base_elev + ridge_elev + noise_large + noise_small
elevation = elevation.astype(np.float32)

print(f'Elevation: min={elevation.min():.1f} m  max={elevation.max():.1f} m')
assert -5000 < elevation.min() < -3500, 'Elevation range sanity check failed'

# ── Slope (degrees) ───────────────────────────────────────────────────────────
# np.gradient returns [dz/drow, dz/dcol]; divide by cell size to get m/m
dz_row, dz_col = np.gradient(elevation.astype(float), CELL_M, CELL_M)
slope_rad = np.arctan(np.sqrt(dz_row**2 + dz_col**2))
slope_deg = np.degrees(slope_rad).astype(np.float32)

print(f'Slope:     min={slope_deg.min():.1f}°  max={slope_deg.max():.1f}°')
assert slope_deg.max() < 60, 'Slope max sanity check failed'

# ── Roughness (m) — std dev in 3×3 neighbourhood ─────────────────────────────
def _std3x3(values):
    return np.std(values)

roughness = generic_filter(elevation.astype(float), _std3x3, size=3).astype(np.float32)

print(f'Roughness: min={roughness.min():.2f} m  max={roughness.max():.2f} m')

# ── Save binary grids ─────────────────────────────────────────────────────────
elev_path  = os.path.join(OUT_DIR, 'elevation.bin')
slope_path = os.path.join(OUT_DIR, 'slope.bin')
rough_path = os.path.join(OUT_DIR, 'roughness.bin')

elevation.tofile(elev_path)
slope_deg.tofile(slope_path)
roughness.tofile(rough_path)

print(f'Saved {os.path.getsize(elev_path)//1024} KB → elevation.bin')
print(f'Saved {os.path.getsize(slope_path)//1024} KB → slope.bin')
print(f'Saved {os.path.getsize(rough_path)//1024} KB → roughness.bin')

# ── Save aoi.json ─────────────────────────────────────────────────────────────
# Habitat: flat spot in the NW quarter of the study area (lower terrain = crater floor)
habitat_lat = CENTER_LAT + DEG_HALF * 0.5   # slightly north of center
habitat_lon = CENTER_LON - DEG_HALF * 0.5   # slightly west of center

aoi = {
    'west':              round(WEST, 6),
    'east':              round(EAST, 6),
    'south':             round(SOUTH, 6),
    'north':             round(NORTH, 6),
    'cellSizeMeters':    CELL_M,
    'width':             GRID_N,
    'height':            GRID_N,
    'defaultHabitatLat': round(habitat_lat, 4),
    'defaultHabitatLon': round(habitat_lon, 4),
    'syntheticTerrain':  True,
    'syntheticNote':     'Synthetic terrain for development. Replace with HiRISE or CTX DTM before submission.'
}

aoi_path = os.path.join(OUT_DIR, 'aoi.json')
with open(aoi_path, 'w') as f:
    json.dump(aoi, f, indent=2)
print(f'Saved aoi.json: {aoi}')

# ── Slope-overlay PNG ─────────────────────────────────────────────────────────
try:
    from PIL import Image

    # Colour classes (must match styles.css and config descriptions)
    SLOPE_COLORS = [
        (0,   5,  ( 46, 125,  91, 200)),   # 0–5°   very gentle  #2E7D5B
        (5,  10,  (143, 191,  77, 200)),   # 5–10°  gentle       #8FBF4D
        (10, 15,  (242, 177,  52, 200)),   # 10–15° moderate     #F2B134
        (15, 20,  (232, 116,  46, 200)),   # 15–20° steep        #E8742E
        (20, 999, (229,  72,  77, 200)),   # >20°   very steep   #E5484D
    ]

    rgba = np.zeros((GRID_N, GRID_N, 4), dtype=np.uint8)
    for lo, hi, color in SLOPE_COLORS:
        mask = (slope_deg >= lo) & (slope_deg < hi)
        rgba[mask] = color

    img = Image.fromarray(rgba, 'RGBA')
    img_path = os.path.join(OUT_DIR, 'slope-overlay.png')
    img.save(img_path)
    print(f'Saved slope-overlay.png ({os.path.getsize(img_path)//1024} KB)')

except ImportError:
    print('WARNING: Pillow not installed — slope-overlay.png not created.')
    print('Run: pip3 install Pillow  then rerun this script.')

# ── Summary ───────────────────────────────────────────────────────────────────
print()
print('ALL FILES WRITTEN — route planning should now work in the browser.')
print(f'Default habitat: {habitat_lat:.4f}°N, {habitat_lon:.4f}°E')
print('NOTE: This is SYNTHETIC terrain. Replace with real NASA DTM before submission.')
