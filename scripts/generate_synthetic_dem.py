"""
generate_synthetic_dem.py — Synthetic terrain for the Gale Crater / Mount Sharp study area.
SYNTHETIC DATA — replace with real HiRISE/CTX DTM before final submission.

Key fix: explicitly flattens 10-cell radius around habitat and all science targets
so slope < 5° there, allowing route planning to function.

Also generates hillshade.png: elevation-coloured terrain with shading for depth/height.

Output files (src/data/):
  aoi.json, elevation.bin, slope.bin, roughness.bin
  slope-overlay.png  — slope classification (semi-transparent)
  hillshade.png      — terrain visualization: elevation colour + hillshade shadows
"""

import numpy as np
import json
import os
import sys
from scipy.ndimage import gaussian_filter, generic_filter
try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not installed. Run: pip3 install Pillow")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(SCRIPT_DIR, '..', 'src', 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# Study area — 6 km × 6 km, Gale Crater Murray formation boxwork zone
WEST   = 137.699388
EAST   = 137.800612
SOUTH  = -5.150612
NORTH  = -5.049388
CELL_M = 20
GRID_N = 300  # 300 × 300 cells at 20 m = 6 km × 6 km

# Key positions: lon, lat.  ALL must end up with slope < 5°.
KEY_POS = [
    {'name': 'habitat',  'lon': 137.7247, 'lat': -5.0747},
    {'name': 'target-1', 'lon': 137.7500, 'lat': -5.0800},
    {'name': 'target-2', 'lon': 137.7220, 'lat': -5.1120},
    {'name': 'target-3', 'lon': 137.7800, 'lat': -5.0720},
    {'name': 'target-4', 'lon': 137.7800, 'lat': -5.1380},
    {'name': 'target-5', 'lon': 137.7120, 'lat': -5.0620},
]

def lonlat_to_rc(lon, lat):
    col = int((lon  - WEST)  / (EAST  - WEST)  * GRID_N)
    row = int((NORTH - lat)  / (NORTH - SOUTH) * GRID_N)
    return (max(0, min(GRID_N - 1, row)),
            max(0, min(GRID_N - 1, col)))

print(f"Grid: {GRID_N}×{GRID_N} at {CELL_M} m/cell")

# ---------------------------------------------------------------------------
# 1.  Base elevation: gentle SE-rising gradient (crater floor → Mount Sharp)
#     Gale Crater floor ~-4,500 m; upper Murray formation ~-3,800 m
# ---------------------------------------------------------------------------
rng = np.random.default_rng(42)

r_idx, c_idx = np.meshgrid(np.arange(GRID_N), np.arange(GRID_N), indexing='ij')
nx = c_idx / (GRID_N - 1)   # 0=W → 1=E
ny = r_idx / (GRID_N - 1)   # 0=N → 1=S

base = -4300.0 + 400.0 * (0.5 * nx + 0.5 * ny)   # -4300 to -3900 m

# ---------------------------------------------------------------------------
# 2.  Very gentle undulations (smooth, no steep ridges)
# ---------------------------------------------------------------------------
# Large smooth swells — sigma=30 cells = 600 m wavelength, amplitude ±20 m
swell = gaussian_filter(rng.standard_normal((GRID_N, GRID_N)), sigma=30) * 20

# Small roughness — sigma=8 cells = 160 m wavelength, amplitude ±5 m
rough_noise = gaussian_filter(rng.standard_normal((GRID_N, GRID_N)), sigma=8) * 5

# A few gentle boxwork ridges: very wide (sigma=0.07) and low (amplitude=12 m)
def soft_ridge(nx, ny, x0, y0, amplitude, sigma, angle_deg):
    a = np.radians(angle_deg)
    perp = -(nx - x0) * np.sin(a) + (ny - y0) * np.cos(a)
    return amplitude * np.exp(-0.5 * (perp / sigma) ** 2)

ridges = (
    soft_ridge(nx, ny, 0.35, 0.50, 12, 0.07, -55) +
    soft_ridge(nx, ny, 0.55, 0.45, 10, 0.06, -58) +
    soft_ridge(nx, ny, 0.70, 0.60, 11, 0.07, -50) +
    soft_ridge(nx, ny, 0.20, 0.30, 15, 0.09, -20)   # gentle butte NW
)

elevation = (base + swell + rough_noise + ridges).astype(np.float32)

# ---------------------------------------------------------------------------
# 3.  Explicitly flatten around every key position (10-cell = 200 m radius)
#     This guarantees slope < 5° there regardless of random terrain.
# ---------------------------------------------------------------------------
FLAT_R = 10    # cells fully flattened inside this radius
BLEND_R = 6    # cells of smooth blend beyond the flat zone

print("Flattening key positions…")
for kp in KEY_POS:
    r, c = lonlat_to_rc(kp['lon'], kp['lat'])
    rA, rB = max(0, r - FLAT_R - BLEND_R), min(GRID_N, r + FLAT_R + BLEND_R + 1)
    cA, cB = max(0, c - FLAT_R - BLEND_R), min(GRID_N, c + FLAT_R + BLEND_R + 1)
    local_mean = float(elevation[rA:rB, cA:cB].mean())
    for dr in range(-(FLAT_R + BLEND_R), FLAT_R + BLEND_R + 1):
        for dc in range(-(FLAT_R + BLEND_R), FLAT_R + BLEND_R + 1):
            nr, nc = r + dr, c + dc
            if not (0 <= nr < GRID_N and 0 <= nc < GRID_N):
                continue
            dist = np.sqrt(dr * dr + dc * dc)
            if dist <= FLAT_R:
                weight = 1.0
            else:
                weight = float(np.exp(-0.5 * ((dist - FLAT_R) / (BLEND_R * 0.5)) ** 2))
            elevation[nr, nc] = elevation[nr, nc] * (1 - weight) + local_mean * weight

# Light smooth pass to remove numerical artifacts at blend edges
elevation = gaussian_filter(elevation, sigma=0.7).astype(np.float32)

# ---------------------------------------------------------------------------
# 4.  Slope and roughness
# ---------------------------------------------------------------------------
dz_r, dz_c = np.gradient(elevation.astype(np.float64), CELL_M, CELL_M)
slope_deg  = np.degrees(np.arctan(np.sqrt(dz_r**2 + dz_c**2))).astype(np.float32)
roughness  = generic_filter(elevation.astype(np.float64), np.std, size=3).astype(np.float32)

# ---------------------------------------------------------------------------
# 5.  Verify key positions
# ---------------------------------------------------------------------------
print("\nSlope at key positions:")
all_ok = True
for kp in KEY_POS:
    r, c = lonlat_to_rc(kp['lon'], kp['lat'])
    s = slope_deg[r, c]
    e = elevation[r, c]
    ok = s < 5.0
    if not ok:
        all_ok = False
    print(f"  {kp['name']:10s}: {s:.1f}°  elev={e:.0f}m  {'OK' if ok else '*** HIGH SLOPE ***'}")

pct15 = (slope_deg <= 15).mean() * 100
print(f"\nTerrain: max={slope_deg.max():.1f}° mean={slope_deg.mean():.1f}° "
      f"walkable@15°={pct15:.0f}%")
if not all_ok:
    print("WARNING: Some positions > 5°. Increase FLAT_R and re-run.")

# ---------------------------------------------------------------------------
# 6.  Write binary grids
# ---------------------------------------------------------------------------
print("\nWriting grids…")
elevation.tofile(os.path.join(DATA_DIR, 'elevation.bin'))
slope_deg.tofile(os.path.join(DATA_DIR, 'slope.bin'))
roughness.tofile(os.path.join(DATA_DIR, 'roughness.bin'))

aoi = {
    "west":  WEST,  "east":  EAST,
    "south": SOUTH, "north": NORTH,
    "cellSizeMeters": CELL_M,
    "width": GRID_N, "height": GRID_N,
    "defaultHabitatLat": -5.0747,
    "defaultHabitatLon": 137.7247,
    "syntheticTerrain": True,
    "syntheticNote": "Synthetic terrain for development. Replace with HiRISE or CTX DTM before submission."
}
with open(os.path.join(DATA_DIR, 'aoi.json'), 'w') as f:
    json.dump(aoi, f, indent=2)

# ---------------------------------------------------------------------------
# 7.  Hillshade + elevation-colour PNG  (terrain visualisation)
#     Shows depth/height with natural-looking shadows.
# ---------------------------------------------------------------------------
print("Generating hillshade.png…")

az  = np.radians(315)   # NW light source
alt = np.radians(40)    # 40° sun elevation

slope_r2 = np.arctan(np.sqrt(dz_r**2 + dz_c**2))
aspect   = np.arctan2(-dz_r, dz_c)
hs = np.cos(alt) * np.cos(slope_r2) + np.sin(alt) * np.sin(slope_r2) * np.cos(az - aspect)
hs = np.clip(hs, 0, 1).astype(np.float32)

# Elevation colour ramp — Mars-like palette from low to high
elev_norm = ((elevation - elevation.min()) /
             (elevation.max() - elevation.min() + 1e-6))

# LUT: 256 steps from dark reddish-brown (low) → warm tan → light buff (high)
lut = np.zeros((256, 3), dtype=np.uint8)
for i in range(256):
    t = i / 255.0
    if t < 0.4:
        t2 = t / 0.4
        lut[i] = (int(100 + 55 * t2),  int(55 + 40 * t2),  int(30 + 20 * t2))
    elif t < 0.75:
        t2 = (t - 0.4) / 0.35
        lut[i] = (int(155 + 35 * t2),  int(95 + 50 * t2),  int(50 + 35 * t2))
    else:
        t2 = (t - 0.75) / 0.25
        lut[i] = (int(190 + 25 * t2),  int(145 + 30 * t2), int(85 + 30 * t2))

idx = (elev_norm * 255).astype(np.uint8)
cr = lut[idx, 0].astype(np.float32)
cg = lut[idx, 1].astype(np.float32)
cb = lut[idx, 2].astype(np.float32)

# Blend elevation colour with hillshade (multiplicative shading)
shade = 0.35 + 0.65 * hs
r8 = np.clip(cr * shade, 0, 255).astype(np.uint8)
g8 = np.clip(cg * shade, 0, 255).astype(np.uint8)
b8 = np.clip(cb * shade, 0, 255).astype(np.uint8)
a8 = np.full((GRID_N, GRID_N), 215, dtype=np.uint8)   # ~84% opaque; Leaflet controls the rest

hs_img = Image.fromarray(np.dstack([r8, g8, b8, a8]), 'RGBA')
hs_path = os.path.join(DATA_DIR, 'hillshade.png')
hs_img.save(hs_path)

# ---------------------------------------------------------------------------
# 8.  Slope-overlay PNG  (semi-transparent classification)
# ---------------------------------------------------------------------------
print("Generating slope-overlay.png…")

CLASSES = [
    ( 0,  5,  46, 125,  91, 160),   # 0–5°   green   #2E7D5B
    ( 5, 10, 143, 191,  77, 160),   # 5–10°  lime    #8FBF4D
    (10, 15, 242, 177,  52, 160),   # 10–15° amber   #F2B134
    (15, 20, 232, 116,  46, 170),   # 15–20° orange  #E8742E
    (20, 999,229,  72,  77, 180),   # >20°   red     #E5484D
]

sr = np.zeros((GRID_N, GRID_N), dtype=np.uint8)
sg = np.zeros((GRID_N, GRID_N), dtype=np.uint8)
sb = np.zeros((GRID_N, GRID_N), dtype=np.uint8)
sa = np.zeros((GRID_N, GRID_N), dtype=np.uint8)

for lo, hi, r, g, b, a in CLASSES:
    mask = (slope_deg >= lo) & (slope_deg < hi)
    sr[mask] = r; sg[mask] = g; sb[mask] = b; sa[mask] = a

slope_img = Image.fromarray(np.dstack([sr, sg, sb, sa]), 'RGBA')
slope_path = os.path.join(DATA_DIR, 'slope-overlay.png')
slope_img.save(slope_path)

# ---------------------------------------------------------------------------
# 9.  File sizes
# ---------------------------------------------------------------------------
print("\nFile sizes:")
for fname in ['aoi.json', 'elevation.bin', 'slope.bin', 'roughness.bin',
              'hillshade.png', 'slope-overlay.png']:
    p = os.path.join(DATA_DIR, fname)
    if os.path.exists(p):
        print(f"  {fname:22s} {os.path.getsize(p)//1024} KB")
print("\nDone.")
