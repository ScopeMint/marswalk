"""
generate_los_overlay.py — Line-of-sight (communication shadow) overlay
Loads elevation.bin + aoi.json, traces a line of sight from the EVA Base habitat
to every cell in the grid. Cells where terrain blocks the line of sight are
colored amber/red; cells with clear signal are transparent.

Output: src/data/los-overlay.png  (300 x 300 RGBA PNG)

Science basis: radio line-of-sight is a real EVA risk — astronauts out of
radio contact from the base are in a dangerous situation.
NOTE: This uses SYNTHETIC terrain. Results must be verified with real DTM data.
"""

import json
import struct
import numpy as np
from PIL import Image
from pathlib import Path

BASE = Path(__file__).parent.parent / "src" / "data"

# ── Load data ────────────────────────────────────────────────────────────────

with open(BASE / "aoi.json") as f:
    aoi = json.load(f)

W = aoi["width"]
H = aoi["height"]
CELL_M = aoi["cellSizeMeters"]

raw = (BASE / "elevation.bin").read_bytes()
elevation = np.frombuffer(raw, dtype=np.float32).reshape((H, W)).copy()

# ── Habitat cell ─────────────────────────────────────────────────────────────

hab_lat = aoi["defaultHabitatLat"]
hab_lon = aoi["defaultHabitatLon"]

# Convert lat/lon to grid row/col (top-left origin)
def latlon_to_cell(lat, lon):
    col = round((lon - aoi["west"])  / (aoi["east"]  - aoi["west"])  * (W - 1))
    row = round((aoi["north"] - lat) / (aoi["north"] - aoi["south"]) * (H - 1))
    return int(row), int(col)

hab_row, hab_col = latlon_to_cell(hab_lat, hab_lon)
hab_elev = elevation[hab_row, hab_col]
print(f"Habitat cell: row={hab_row} col={hab_col}  elevation={hab_elev:.1f} m")

# ── LOS computation — Bresenham line ─────────────────────────────────────────

def line_cells(r0, c0, r1, c1):
    """Yield all (row, col) cells along the line from (r0,c0) to (r1,c1),
    excluding the start and end cells."""
    cells = []
    dr = abs(r1 - r0); dc = abs(c1 - c0)
    sr = 1 if r1 > r0 else -1
    sc = 1 if c1 > c0 else -1
    err = dr - dc
    r, c = r0, c0
    while True:
        if r == r1 and c == c1:
            break
        e2 = 2 * err
        if e2 > -dc:
            err -= dc; r += sr
        if e2 < dr:
            err += dr; c += sc
        if r == r1 and c == c1:
            break
        cells.append((r, c))
    return cells

# For each target cell, trace a line and check if any intermediate cell's
# elevation exceeds the straight-line height between habitat and target.
# Height at step fraction t: h = hab_elev + t * (target_elev - hab_elev)

los_blocked = np.zeros((H, W), dtype=np.uint8)  # 0=clear, 1=shadow, 2=deep shadow

ANTENNA_HEIGHT = 2.0   # meters (height of astronaut suit antenna above ground) [OUR ASSUMPTION]
HAB_MAST_HEIGHT = 10.0 # meters (radio mast on the habitat) [OUR ASSUMPTION]

for r in range(H):
    for c in range(W):
        if r == hab_row and c == hab_col:
            continue
        tgt_elev = elevation[r, c]
        cells = line_cells(hab_row, hab_col, r, c)
        n_steps = len(cells) + 1  # total steps from hab to target
        blocked = False
        max_excess = 0.0
        for i, (cr, cc) in enumerate(cells):
            t = (i + 1) / n_steps
            start_h = hab_elev + HAB_MAST_HEIGHT
            interp_height = start_h + t * ((tgt_elev + ANTENNA_HEIGHT) - start_h)
            terrain_height = elevation[cr, cc]
            excess = terrain_height - interp_height
            if excess > 0:
                blocked = True
                max_excess = max(max_excess, excess)
        if blocked:
            los_blocked[r, c] = 2 if max_excess > 20 else 1

print(f"LOS blocked cells: {np.sum(los_blocked > 0):,}  "
      f"({100*np.mean(los_blocked > 0):.1f}% of grid)")

# ── Build RGBA image ──────────────────────────────────────────────────────────

RGBA = np.zeros((H, W, 4), dtype=np.uint8)

# Clear signal = fully transparent
# Shadow (mild, excess < 20m) = amber at 160 alpha
# Deep shadow (excess >= 20m) = red at 180 alpha
RGBA[los_blocked == 1] = [232, 116, 46, 160]   # amber
RGBA[los_blocked == 2] = [229,  72, 77, 180]   # red

img = Image.fromarray(RGBA, mode="RGBA")
out_path = BASE / "los-overlay.png"
img.save(out_path)
print(f"Saved: {out_path}  ({out_path.stat().st_size:,} bytes)")
