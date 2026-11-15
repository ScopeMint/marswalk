"""
14_check_slope.py - Test that src/data/slope.bin really is the slope of src/data/elevation.bin.

WHAT IT DOES (simple version):
  1. Loads the 10 m elevation grid and the slope grid the app uses.
  2. Picks 500 random cells away from the edge (fixed seed, so the test gives the same answer every run).
  3. Recomputes the slope of each one BY HAND from its four neighbours:
       east-west change  = (elevation east  - elevation west)  / (2 x 10 m)
       north-south change = (elevation south - elevation north) / (2 x 10 m)
       slope = arctan( sqrt(ew^2 + ns^2) )   in degrees
     This is the same "simple gradient" (central difference) that scripts/03_make_grids.py uses through
     numpy.gradient, written out step by step so a mistake in either one would show up.
  4. Also computes Horn's 3x3 method (Horn 1981), which most GIS tools use, to show how much the
     choice of method changes the answer. This part is information only; it does not pass or fail.

HOW TO RUN:
  python scripts/14_check_slope.py
  Prints PASS when every recomputed cell matches slope.bin within 0.01 degrees, FAIL otherwise.

REFERENCE:
  Horn, B. K. P. (1981), Hill shading and the reflectance map, Proceedings of the IEEE 69(1), 14-47,
  doi:10.1109/PROC.1981.11918
"""

import json
import math
import os
import random
import sys

import numpy as np

DATA = os.path.join('src', 'data')
SAMPLES = 500
TOLERANCE_DEG = 0.01


def load(name, w, h):
    """Reads one Float32 grid file and returns it as a (h, w) array."""
    return np.fromfile(os.path.join(DATA, name), dtype='<f4').reshape(h, w).astype(np.float64)


def by_hand(z, r, c, cell):
    """Slope in degrees at row r, column c from the four direct neighbours."""
    ew = (z[r, c + 1] - z[r, c - 1]) / (2 * cell)
    ns = (z[r + 1, c] - z[r - 1, c]) / (2 * cell)
    return math.degrees(math.atan(math.sqrt(ew * ew + ns * ns)))


def horn(z, r, c, cell):
    """Slope in degrees at row r, column c with Horn's weighted 3x3 method."""
    a, b, cc = z[r - 1, c - 1], z[r - 1, c], z[r - 1, c + 1]
    d, f = z[r, c - 1], z[r, c + 1]
    g, hh, i = z[r + 1, c - 1], z[r + 1, c], z[r + 1, c + 1]
    ew = ((cc + 2 * f + i) - (a + 2 * d + g)) / (8 * cell)
    ns = ((g + 2 * hh + i) - (a + 2 * b + cc)) / (8 * cell)
    return math.degrees(math.atan(math.sqrt(ew * ew + ns * ns)))


def main():
    with open(os.path.join(DATA, 'aoi.json'), encoding='utf-8') as f:
        aoi = json.load(f)
    w, h, cell = aoi['width'], aoi['height'], aoi['cellSizeMeters']
    z = load('elevation.bin', w, h)
    s = load('slope.bin', w, h)

    rng = random.Random(14)
    worst, checked, horn_diff = 0.0, 0, []
    while checked < SAMPLES:
        r, c = rng.randrange(1, h - 1), rng.randrange(1, w - 1)
        block = z[r - 1:r + 2, c - 1:c + 2]
        if not np.all(np.isfinite(block)) or not math.isfinite(s[r, c]):
            continue
        mine = by_hand(z, r, c, cell)
        worst = max(worst, abs(mine - s[r, c]))
        horn_diff.append(horn(z, r, c, cell) - mine)
        checked += 1

    horn_abs = sorted(abs(x) for x in horn_diff)
    print(f'[14] Checked {checked} random cells of a {w} x {h} grid, {cell} m cells')
    print(f'     Largest difference, by-hand slope vs slope.bin: {worst:.4f} deg (allowed {TOLERANCE_DEG})')
    print(f'     Horn 3x3 vs simple gradient (information only): median {horn_abs[len(horn_abs) // 2]:.2f} deg, '
          f'90th percentile {horn_abs[int(0.9 * len(horn_abs))]:.2f} deg, largest {horn_abs[-1]:.2f} deg')
    if worst <= TOLERANCE_DEG:
        print('PASS  slope.bin matches the elevation grid')
        return 0
    print('FAIL  slope.bin does not match the elevation grid')
    return 1


if __name__ == '__main__':
    sys.exit(main())
