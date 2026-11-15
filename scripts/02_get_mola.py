"""
02_get_mola.py — Download real MOLA elevation data for Gale Crater and rebuild terrain files.

Downloads a ~1.5 MB byte range from NASA PDS (instead of the full 130 MB file),
parses the binary int16 data, extracts Gale Crater, resamples to 300×300, and
regenerates all terrain data files the web app uses.

SOURCE: MOLA MEGDR 128ppd — megt00n090hb.img
  NASA PDS Geosciences Node:
  https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/

CITATION (required by CLAUDE.md rule 2):
  Smith, D.E. et al. (2001). Mars Orbiter Laser Altimeter: Experiment summary
  after the first year of global mapping of Mars. Journal of Geophysical Research:
  Planets, 106(E10), 23689–23722. doi:10.1029/2000JE001364

RESOLUTION NOTE (CLAUDE.md rule 5 — never hide limitations):
  MOLA 128ppd = ~463 m/pixel. Resampled to 20 m cells using bicubic interpolation.
  Features smaller than ~460 m (individual ridges, boxwork) are NOT visible.
  Use HiRISE DTM (~1 m/px) or CTX DTM (~18 m/px) for higher fidelity.
  This limitation is stated in aoi.json and in the app's About panel.

HOW TO RUN:
  cd /path/to/nasa-space-apps-2026
  python3 scripts/02_get_mola.py

OUTPUTS (src/data/):
  elevation.bin       Float32, row-major, meters (MOLA areoid)
  slope.bin           Float32, degrees
  roughness.bin       Float32, meters
  aoi.json            bounds, dimensions, citation, resolution note
  slope-overlay.png   slope classification overlay
  hillshade.png       elevation colour + hillshade shadows
  los-overlay.png     line-of-sight communication shadow
  rad-overlay.png     relative radiation zones
"""

import os
import sys
import json
import urllib.request
import numpy as np
from pathlib import Path

# ── Optional imports ──────────────────────────────────────────────────────────

try:
    from scipy.ndimage import zoom as scipy_zoom, gaussian_filter, generic_filter
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("ERROR: Pillow not found. Run: pip3 install Pillow")
    sys.exit(1)

# ── File + path setup ─────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
DATA_DIR   = SCRIPT_DIR.parent / "src" / "data"
os.makedirs(DATA_DIR, exist_ok=True)

# ── MOLA MEGDR file parameters (from megt00n090hb.lbl) ───────────────────────
# File covers 0°–44°S latitude, 90°–180°E longitude at 128 pixels/degree

PDS_URL          = (
    "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/"
    "mgsl_300x/meg128/megt00n090hb.img"
)
MOLA_PPD         = 128.0       # pixels per degree
MOLA_TOTAL_ROWS  = 5632        # 44 degrees × 128 ppd
MOLA_TOTAL_COLS  = 11520       # 90 degrees × 128 ppd
MOLA_ROW_BYTES   = MOLA_TOTAL_COLS * 2   # 2 bytes per int16 = 23,040
MOLA_LAT_N       = 0.0         # row 0 = equator (0°S)
MOLA_LON_W       = 90.0        # col 0 = 90°E
MOLA_NULL        = -32768      # fill/missing value

# ── Our study area (Gale Crater boxwork, matches existing aoi.json) ───────────

AOI_WEST  = 137.699388
AOI_EAST  = 137.800612
AOI_SOUTH = -5.150612
AOI_NORTH = -5.049388

GRID_W    = 300             # output columns
GRID_H    = 300             # output rows
CELL_M    = 20              # meters per cell [OUR ASSUMPTION]

# Default habitat: flat area NW quadrant, matches existing app setup
HAB_LAT   = -5.0747
HAB_LON   = 137.7247

MARS_KM_PER_DEG = 59.274   # Mars mean radius 3389.5 km → πR/180

# ── MOLA pixel coordinates for our AOI ───────────────────────────────────────

def latlon_to_mola(lat, lon):
    """Lat/lon → (row, col) in the MOLA file. Lat negative = south."""
    row = (-lat) * MOLA_PPD              # row 0 = equator, increases southward
    col = (lon - MOLA_LON_W) * MOLA_PPD  # col 0 = 90°E, increases eastward
    return row, col

row_N_f, col_W_f = latlon_to_mola(AOI_NORTH, AOI_WEST)   # top-left of AOI
row_S_f, col_E_f = latlon_to_mola(AOI_SOUTH, AOI_EAST)   # bottom-right of AOI

# AOI in integer pixel coordinates
row_N = int(row_N_f)
row_S = int(row_S_f) + 1
col_W = int(col_W_f)
col_E = int(col_E_f) + 1

# Download a margin of 30 extra pixels on each side for better bicubic interpolation
MARGIN = 30
dl_row_start = max(0,                 row_N - MARGIN)
dl_row_end   = min(MOLA_TOTAL_ROWS-1, row_S + MARGIN)
dl_col_start = max(0,                 col_W - MARGIN)
dl_col_end   = min(MOLA_TOTAL_COLS-1, col_E + MARGIN)

n_dl_rows = dl_row_end - dl_row_start + 1

byte_start = dl_row_start * MOLA_ROW_BYTES
byte_end   = (dl_row_end + 1) * MOLA_ROW_BYTES - 1

print("=" * 60)
print("02_get_mola.py — MOLA MEGDR Gale Crater download")
print("=" * 60)
print(f"Study area: {AOI_WEST:.4f}°E  {AOI_EAST:.4f}°E  {AOI_SOUTH:.4f}°  {AOI_NORTH:.4f}°")
print(f"MOLA pixels in AOI: {row_S-row_N} rows × {col_E-col_W} cols")
print(f"Download strip: rows {dl_row_start}–{dl_row_end} ({n_dl_rows} rows, all {MOLA_TOTAL_COLS} cols)")
print(f"Byte range: {byte_start:,} – {byte_end:,}  ({(byte_end-byte_start+1)/1024:.0f} KB)")

# ── Download ───────────────────────────────────────────────────────────────────

def download_range(url, b_start, b_end):
    req = urllib.request.Request(url)
    req.add_header("Range",      f"bytes={b_start}-{b_end}")
    req.add_header("User-Agent", "MarsWalk/1.0 NASA-SpaceApps-2026 (non-commercial educational project)")
    print(f"\nDownloading from NASA PDS ...")
    print(f"  {url}")
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = resp.read()
            print(f"  HTTP {resp.status}: received {len(data):,} bytes ✓")
            return data
    except urllib.error.HTTPError as e:
        print(f"  HTTP Error {e.code}: {e.reason}")
        return None
    except Exception as e:
        print(f"  Network error: {e}")
        return None

raw = download_range(PDS_URL, byte_start, byte_end)
if not raw:
    print("\nDownload failed. Check your network connection and try again.")
    sys.exit(1)

# ── Parse binary data ─────────────────────────────────────────────────────────
# Format: big-endian int16 (MSB_INTEGER), no header, row-major
# Each row is exactly MOLA_TOTAL_COLS × 2 = 23,040 bytes

expected = n_dl_rows * MOLA_ROW_BYTES
if len(raw) < expected:
    print(f"WARNING: Got {len(raw)} bytes, expected {expected}. Partial download.")
    # Trim to complete rows only
    n_dl_rows = len(raw) // MOLA_ROW_BYTES
    raw = raw[:n_dl_rows * MOLA_ROW_BYTES]
    print(f"  Using {n_dl_rows} complete rows")

# Parse as big-endian int16, reshape to (rows × full_cols)
strip = np.frombuffer(raw, dtype=">i2").reshape((n_dl_rows, MOLA_TOTAL_COLS)).astype(np.float32)

# Replace MOLA null/missing values with NaN
strip[strip <= MOLA_NULL + 1] = np.nan

# Extract our column range (AOI + margin)
patch = strip[:, dl_col_start:dl_col_end + 1]  # shape: (n_dl_rows, dl_col_width)
dl_col_width = dl_col_end - dl_col_start + 1

valid_mask = np.isfinite(patch)
n_valid = valid_mask.sum()
n_total = patch.size
print(f"\nMOLA patch: {n_dl_rows} rows × {dl_col_width} cols = {n_total:,} cells")
print(f"  Valid: {n_valid:,}  NaN: {n_total - n_valid}")

if n_valid == 0:
    print("ERROR: All values are NaN. Check byte offsets or file format.")
    sys.exit(1)

valid_vals = patch[valid_mask]
print(f"  Elevation range: {valid_vals.min():.0f} m – {valid_vals.max():.0f} m (MOLA areoid)")
print(f"  (Negative values are normal for Gale Crater — below Mars reference surface)")

# ── Fill NaN holes ─────────────────────────────────────────────────────────────

def fill_nan_rows(arr):
    """Simple row-wise forward/backward fill."""
    out = arr.copy()
    for r in range(out.shape[0]):
        row = out[r]
        nan_mask = ~np.isfinite(row)
        if nan_mask.any() and not nan_mask.all():
            idxs = np.where(~nan_mask)[0]
            out[r] = np.interp(np.arange(len(row)), idxs, row[idxs])
    return out

patch = fill_nan_rows(patch)
patch = fill_nan_rows(patch.T).T  # also fill column-wise

# ── Extract exact AOI sub-region ──────────────────────────────────────────────
# Map our AOI pixel coords into the downloaded strip's local coordinates

local_row_N = row_N - dl_row_start
local_row_S = row_S - dl_row_start
local_col_W = col_W - dl_col_start
local_col_E = col_E - dl_col_start

# Clamp to valid range
local_row_N = max(0, local_row_N)
local_row_S = min(n_dl_rows, local_row_S)
local_col_W = max(0, local_col_W)
local_col_E = min(dl_col_width, local_col_E)

aoi_patch = patch[local_row_N:local_row_S, local_col_W:local_col_E]
print(f"\nAOI patch (before resample): {aoi_patch.shape[0]} rows × {aoi_patch.shape[1]} cols")

if aoi_patch.size == 0:
    print("ERROR: AOI patch is empty. Check coordinate calculations.")
    sys.exit(1)

# ── Resample to 300×300 ───────────────────────────────────────────────────────

if HAS_SCIPY:
    zoom_r = GRID_H / aoi_patch.shape[0]
    zoom_c = GRID_W / aoi_patch.shape[1]
    print(f"Resampling {aoi_patch.shape} → ({GRID_H}, {GRID_W})  zoom={zoom_r:.1f}× (bicubic)")
    elevation = scipy_zoom(aoi_patch, (zoom_r, zoom_c), order=3).astype(np.float32)
else:
    print(f"scipy not available — using nearest-neighbor resize")
    r_idx = np.linspace(0, aoi_patch.shape[0]-1, GRID_H).round().astype(int)
    c_idx = np.linspace(0, aoi_patch.shape[1]-1, GRID_W).round().astype(int)
    elevation = aoi_patch[np.ix_(r_idx, c_idx)].astype(np.float32)

# Gentle smoothing to remove zoom ringing artifacts (sigma=0.5 = very mild)
if HAS_SCIPY:
    elevation = gaussian_filter(elevation, sigma=0.5)

elevation = elevation.astype(np.float32)
print(f"Output elevation: {elevation.shape}  min={elevation.min():.0f} m  max={elevation.max():.0f} m")
print(f"  Total relief: {elevation.max()-elevation.min():.0f} m across 6 km study area")

# ── Slope ─────────────────────────────────────────────────────────────────────

dz_dy, dz_dx = np.gradient(elevation.astype(np.float64), CELL_M, CELL_M)
slope = np.degrees(np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))).astype(np.float32)
slope = np.clip(slope, 0, 90)
print(f"Slope: min={slope.min():.2f}°  max={slope.max():.2f}°")

# ── Roughness ─────────────────────────────────────────────────────────────────

if HAS_SCIPY:
    roughness = generic_filter(elevation, np.std, size=3, mode='nearest').astype(np.float32)
else:
    roughness = np.zeros_like(elevation)
    for dr in [-1, 0, 1]:
        for dc in [-1, 0, 1]:
            shifted = np.roll(np.roll(elevation, dr, axis=0), dc, axis=1)
            roughness += (elevation - shifted) ** 2
    roughness = np.sqrt(roughness / 9).astype(np.float32)

print(f"Roughness: min={roughness.min():.2f} m  max={roughness.max():.2f} m")

# ── Save .bin files ───────────────────────────────────────────────────────────

elevation.tofile(DATA_DIR / "elevation.bin")
slope.tofile(DATA_DIR / "slope.bin")
roughness.tofile(DATA_DIR / "roughness.bin")
print(f"\nSaved: elevation.bin  slope.bin  roughness.bin  ({GRID_H*GRID_W*4//1024} KB each)")

# ── Save aoi.json ─────────────────────────────────────────────────────────────

aoi = {
    "west":  AOI_WEST,
    "east":  AOI_EAST,
    "south": AOI_SOUTH,
    "north": AOI_NORTH,
    "cellSizeMeters":    CELL_M,
    "width":             GRID_W,
    "height":            GRID_H,
    "defaultHabitatLat": HAB_LAT,
    "defaultHabitatLon": HAB_LON,
    "elevationUnit":     "meters (above MOLA areoid — negative values normal for Gale Crater)",
    "slopeUnit":         "degrees",
    "roughnessUnit":     "meters",
    "elevationSource":   "MOLA MEGDR 128ppd — file megt00n090hb.img",
    "elevationCitation": "Smith, D.E. et al. (2001), JGR Planets 106(E10), doi:10.1029/2000JE001364",
    "elevationResolution": "~463 m/px native (128 ppd), bicubic-resampled to 20 m cells",
    "elevationNote":     "MOLA 128ppd cannot resolve features smaller than ~460 m. Individual ridges and boxwork formations are sub-resolution. Use HiRISE DTM (~1 m/px) for full fidelity.",
    "syntheticTerrain":  False,
    "source":            "NASA PDS Geosciences Node — https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/"
}

with open(DATA_DIR / "aoi.json", "w") as f:
    json.dump(aoi, f, indent=2)
print("Saved: aoi.json  (syntheticTerrain: false)")

# ── Slope overlay PNG ─────────────────────────────────────────────────────────

SLOPE_CLASSES = [
    (0,   5,  (46,  125, 91,  180)),   # 0–5°   very gentle  #2E7D5B
    (5,  10,  (143, 191, 77,  180)),   # 5–10°  gentle       #8FBF4D
    (10, 15,  (242, 177, 52,  200)),   # 10–15° moderate     #F2B134
    (15, 20,  (232, 116, 46,  210)),   # 15–20° steep        #E8742E
    (20, 999, (229, 72,  77,  220)),   # >20°   very steep   #E5484D
]

rgba_slope = np.zeros((GRID_H, GRID_W, 4), dtype=np.uint8)
for lo, hi, color in SLOPE_CLASSES:
    mask = (slope >= lo) & (slope < hi)
    rgba_slope[mask] = color

Image.fromarray(rgba_slope, "RGBA").save(DATA_DIR / "slope-overlay.png")
print(f"Saved: slope-overlay.png")

# ── Hillshade PNG ─────────────────────────────────────────────────────────────

elev_min  = float(elevation.min())
elev_max  = float(elevation.max())
elev_range = elev_max - elev_min
elev_norm = (elevation - elev_min) / (elev_range + 1e-6)

# Hillshade: NW light at azimuth 315°, altitude 40°
az_rad  = np.radians(360 - 315 + 90)   # convert map azimuth to math convention
alt_rad = np.radians(40)

hs_dy, hs_dx = np.gradient(elevation.astype(np.float64), CELL_M, CELL_M)
surf_slope = np.arctan(np.sqrt(hs_dx**2 + hs_dy**2))
surf_aspect = np.arctan2(-hs_dy, hs_dx)

hillshade = (np.sin(alt_rad) * np.cos(surf_slope) +
             np.cos(alt_rad) * np.sin(surf_slope) * np.cos(az_rad - surf_aspect))
hillshade = np.clip(hillshade, 0, 1)

# Color: dark reddish-brown (low crater floor) → sandy buff (upper slopes)
LOW_COLOR  = np.array([72,  48, 36],  dtype=np.float32)   # dark brownish
HIGH_COLOR = np.array([195, 165, 120], dtype=np.float32)  # sandy buff

color_rgb = (LOW_COLOR[None, None, :] * (1 - elev_norm[:, :, None]) +
             HIGH_COLOR[None, None, :] * elev_norm[:, :, None])
shade_factor = 0.35 + 0.65 * hillshade[:, :, None]
img_rgb = np.clip(color_rgb * shade_factor, 0, 255).astype(np.uint8)
alpha_ch = np.full((GRID_H, GRID_W, 1), 230, dtype=np.uint8)
rgba_hs = np.concatenate([img_rgb, alpha_ch], axis=2)

Image.fromarray(rgba_hs, "RGBA").save(DATA_DIR / "hillshade.png")
print(f"Saved: hillshade.png")

# ── LOS overlay PNG (from habitat cell) ───────────────────────────────────────

def latlon_to_cell(lat, lon):
    col = round((lon - AOI_WEST)  / (AOI_EAST  - AOI_WEST)  * (GRID_W - 1))
    row = round((AOI_NORTH - lat) / (AOI_NORTH - AOI_SOUTH) * (GRID_H - 1))
    return int(np.clip(row, 0, GRID_H-1)), int(np.clip(col, 0, GRID_W-1))

hab_row, hab_col = latlon_to_cell(HAB_LAT, HAB_LON)
hab_elev = elevation[hab_row, hab_col]
print(f"\nLOS: habitat at cell ({hab_row}, {hab_col})  elev={hab_elev:.0f} m")

ANTENNA_H = 2.0  # astronaut comm antenna height above ground (meters)

def bresenham_cells(r0, c0, r1, c1):
    """All cells along Bresenham line, excluding endpoints."""
    cells = []
    dr, dc = abs(r1-r0), abs(c1-c0)
    sr = 1 if r1 > r0 else -1
    sc = 1 if c1 > c0 else -1
    err = dr - dc
    r, c = r0, c0
    while True:
        if r == r1 and c == c1:
            break
        e2 = 2 * err
        if e2 > -dc: err -= dc; r += sr
        if e2 <  dr: err += dr; c += sc
        if r == r1 and c == c1:
            break
        cells.append((r, c))
    return cells

los_blocked = np.zeros((GRID_H, GRID_W), dtype=np.uint8)
tgt_elev = elevation[hab_row, hab_col] + ANTENNA_H

for r in range(GRID_H):
    for c in range(GRID_W):
        if r == hab_row and c == hab_col:
            continue
        t_e = elevation[r, c] + ANTENNA_H
        cells = bresenham_cells(hab_row, hab_col, r, c)
        n = len(cells) + 1
        max_excess = 0.0
        for i, (cr, cc) in enumerate(cells):
            t = (i + 1) / n
            interp = hab_elev + ANTENNA_H + t * (t_e - (hab_elev + ANTENNA_H))
            excess = elevation[cr, cc] - interp
            if excess > 0:
                max_excess = max(max_excess, excess)
        if max_excess > 0:
            los_blocked[r, c] = 2 if max_excess > 20 else 1

n_blocked = int((los_blocked > 0).sum())
print(f"LOS blocked: {n_blocked:,} cells ({100*n_blocked/los_blocked.size:.1f}%)")

rgba_los = np.zeros((GRID_H, GRID_W, 4), dtype=np.uint8)
rgba_los[los_blocked == 1] = [232, 116, 46, 160]   # amber shadow
rgba_los[los_blocked == 2] = [229,  72, 77, 180]   # red deep shadow

Image.fromarray(rgba_los, "RGBA").save(DATA_DIR / "los-overlay.png")
print("Saved: los-overlay.png")

# ── Radiation overlay PNG ──────────────────────────────────────────────────────

RAD_PER_100M = 0.015   # 1.5% per 100m elevation [OUR ASSUMPTION]

elev_min_r = float(elevation.min())
relative_dose = RAD_PER_100M * (elevation - elev_min_r) / 100.0
rel_min = float(relative_dose.min())
rel_max = float(relative_dose.max())
t_rad = np.clip((relative_dose - rel_min) / max(rel_max - rel_min, 1e-6), 0, 1)

GREEN_R = np.array([70, 195, 123], dtype=np.float32)
RED_R   = np.array([229, 72, 77],  dtype=np.float32)
t3_r    = t_rad[:, :, np.newaxis]
color_r = (1 - t3_r) * GREEN_R + t3_r * RED_R
alpha_r = (120 + 60 * t_rad).astype(np.uint8)
rgba_rad = np.zeros((GRID_H, GRID_W, 4), dtype=np.uint8)
rgba_rad[:, :, :3] = np.clip(color_r, 0, 255).astype(np.uint8)
rgba_rad[:, :,  3] = alpha_r

Image.fromarray(rgba_rad, "RGBA").save(DATA_DIR / "rad-overlay.png")
print("Saved: rad-overlay.png")

# ── Summary ───────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("SUCCESS — real MOLA data loaded")
print("=" * 60)
print(f"Source: {PDS_URL}")
print(f"Citation: Smith et al. (2001), JGR 106(E10), doi:10.1029/2000JE001364")
print(f"Resolution: 128 ppd native (~463 m/px) → resampled 20 m cells")
print(f"Elevation: {elevation.min():.0f} m – {elevation.max():.0f} m (MOLA areoid)")
print(f"Max slope: {slope.max():.1f}°")
print(f"syntheticTerrain: false (set in aoi.json)")
print()
print("Files written to src/data/:")
for f in ["elevation.bin","slope.bin","roughness.bin","aoi.json",
          "slope-overlay.png","hillshade.png","los-overlay.png","rad-overlay.png"]:
    p = DATA_DIR / f
    print(f"  {f:<25} {p.stat().st_size:>8,} bytes" if p.exists() else f"  {f} — MISSING")
print()
print("Add to docs/SOURCES.md:")
print("  Smith, D.E. et al. (2001). Mars Orbiter Laser Altimeter: Experiment summary")
print("  after the first year of global mapping of Mars.")
print("  Journal of Geophysical Research: Planets, 106(E10), 23689–23722.")
print("  doi:10.1029/2000JE001364")
print("  Data: NASA PDS Geosciences Node, MOLA MEGDR Level 3, megt00n090hb.img")
