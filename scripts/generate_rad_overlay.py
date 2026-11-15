"""
generate_rad_overlay.py — Relative radiation zones overlay
Loads elevation.bin + aoi.json, computes a relative radiation level for every
cell based on elevation (higher elevation = thinner atmosphere = slightly more
cosmic ray exposure).

Model: relative_dose = 1.0 + 0.015 * (elevation_m - min_elevation_m) / 100
This is OUR ASSUMPTION: 1.5% increase per 100m of altitude.
Base dose: 233 μGy/day (Hassler et al. 2014, Science 343(6169))

Color scale:
  Low (baseline)  → green  rgba(70, 195, 123, 160)
  High (elevated) → red    rgba(229, 72, 77, 180)

Output: src/data/rad-overlay.png  (300 x 300 RGBA PNG)
"""

import json
import numpy as np
from PIL import Image
from pathlib import Path

BASE = Path(__file__).parent.parent / "src" / "data"

# ── Load data ────────────────────────────────────────────────────────────────

with open(BASE / "aoi.json") as f:
    aoi = json.load(f)

W = aoi["width"]
H = aoi["height"]

raw = (BASE / "elevation.bin").read_bytes()
elevation = np.frombuffer(raw, dtype=np.float32).reshape((H, W)).copy()

# ── Relative radiation model [OUR ASSUMPTION] ────────────────────────────────

RAD_PER_100M = 0.015   # 1.5% per 100m elevation [OUR ASSUMPTION]

elev_min = float(np.nanmin(elevation))
elev_range = float(np.nanmax(elevation)) - elev_min

# Normalize 0–1
relative_dose = RAD_PER_100M * (elevation - elev_min) / 100.0
rel_min = float(np.nanmin(relative_dose))
rel_max = float(np.nanmax(relative_dose))
print(f"Elevation range: {elev_min:.1f} – {elev_min+elev_range:.1f} m")
print(f"Relative dose range: {rel_min:.3f} – {rel_max:.3f} (fraction above baseline)")

# Normalize relative_dose to 0–1 for color mapping
t = (relative_dose - rel_min) / max(rel_max - rel_min, 1e-6)
t = np.clip(t, 0, 1)

# ── Color interpolation: green (baseline) → red (elevated) ───────────────────

GREEN = np.array([70, 195, 123], dtype=np.float32)
RED   = np.array([229, 72, 77],  dtype=np.float32)

# Blend per cell
t3    = t[:, :, np.newaxis]
color = (1 - t3) * GREEN + t3 * RED

alpha = (120 + 60 * t).astype(np.uint8)   # 120–180 alpha

RGBA = np.zeros((H, W, 4), dtype=np.uint8)
RGBA[:, :, :3] = np.clip(color, 0, 255).astype(np.uint8)
RGBA[:, :,  3] = alpha

img = Image.fromarray(RGBA, mode="RGBA")
out_path = BASE / "rad-overlay.png"
img.save(out_path)
print(f"Saved: {out_path}  ({out_path.stat().st_size:,} bytes)")
print("NOTE: This is an APPROXIMATE model [OUR ASSUMPTION: 1.5% per 100m].")
print("      Base dose 233 µGy/day from Hassler et al. (2014), Science 343(6169).")
