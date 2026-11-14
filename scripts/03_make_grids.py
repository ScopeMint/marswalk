"""
03_make_grids.py — Resample elevation, compute slope and roughness, save .bin grids + aoi.json.
Outputs: data/elevation.bin, data/slope.bin, data/roughness.bin, data/aoi.json

HOW TO RUN:
  python3 scripts/03_make_grids.py

REQUIRES: data/raw/elevation_clip.tif (run 02_get_elevation.py first)

OUTPUTS:
  data/aoi.json         — bounds, cell size, grid dimensions, default habitat
  data/elevation.bin    — Float32 elevation in meters, row-major, NaN for no-data
  data/slope.bin        — Float32 slope in degrees (0 = flat, 90 = vertical)
  data/roughness.bin    — Float32 roughness in meters (spread of elevation in 3x3 neighborhood)
"""

import os
import sys
import json
import numpy as np

CELL_SIZE_M = 20       # meters per cell [OUR ASSUMPTION — matches config.js]
IN_FILE     = 'data/raw/elevation_clip.tif'
DATA_DIR    = 'src/data'  # web app fetches from src/data/

# Default habitat location (flattest area near Murray formation base)
# Update this after choosing the best spot in Mars Trek imagery on Saturday morning
DEFAULT_HABITAT_LAT = -5.08
DEFAULT_HABITAT_LON = 137.68


def fill_holes(arr):
    """Replace NaN cells with the mean of valid neighbors in a 3x3 window."""
    from scipy.ndimage import generic_filter
    def _fill(vals):
        center = vals[4]  # center of 3x3 = index 4
        if np.isnan(center):
            valid = vals[np.isfinite(vals)]
            return float(valid.mean()) if len(valid) > 0 else 0.0
        return center
    filled = generic_filter(arr, _fill, size=3, mode='nearest')
    return filled.astype(np.float32)


def compute_slope(elev, cell_size_m):
    """
    Compute slope in degrees for every cell.
    Uses numpy.gradient to get dz/dx and dz/dy, then arctan of the magnitude.
    cell_size_m: meters per cell (same in x and y).
    """
    dz_dy, dz_dx = np.gradient(elev, cell_size_m, cell_size_m)
    slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
    slope_deg = np.degrees(slope_rad)
    return slope_deg.astype(np.float32)


def compute_roughness(elev):
    """
    Roughness = standard deviation of elevation in a 3x3 neighborhood.
    High roughness = bumpy ground. Low = smooth.
    """
    from scipy.ndimage import generic_filter
    roughness = generic_filter(elev, np.std, size=3, mode='nearest')
    return roughness.astype(np.float32)


def main():
    if not os.path.exists(IN_FILE):
        print(f'ERROR: {IN_FILE} not found. Run scripts/02_get_elevation.py first.')
        sys.exit(1)

    try:
        from scipy.ndimage import generic_filter
    except ImportError:
        print('scipy not found. Install it: pip3 install scipy')
        sys.exit(1)

    try:
        import rasterio
        from rasterio.enums import Resampling
        from rasterio.transform import from_bounds

        print(f'[03] Loading {IN_FILE}...')

        with rasterio.open(IN_FILE) as src:
            # Read the original data
            orig_data = src.read(1).astype(np.float32)
            orig_bounds = src.bounds
            orig_crs = src.crs
            nodata = src.nodata
            if nodata is not None:
                orig_data[orig_data == nodata] = np.nan

            # Study area extent in degrees
            west   = orig_bounds.left
            east   = orig_bounds.right
            south  = orig_bounds.bottom
            north  = orig_bounds.top

            # Cell size in degrees (Mars: ~59 km per degree)
            mars_km_per_deg = 59.274  # km per degree (Mars mean radius 3389.5 km)
            cell_deg = CELL_SIZE_M / (mars_km_per_deg * 1000)

            # Target grid dimensions
            width  = max(1, int(round((east - west) / cell_deg)))
            height = max(1, int(round((north - south) / cell_deg)))

            print(f'[03] Original grid: {src.width} x {src.height} pixels')
            print(f'[03] Target grid: {width} x {height} cells at {CELL_SIZE_M} m/cell')
            print(f'     Bounds: W={west:.4f} E={east:.4f} S={south:.4f} N={north:.4f}')

            # Resample to target grid size using average resampling
            target_transform = from_bounds(west, south, east, north, width, height)
            elev = np.empty((height, width), dtype=np.float32)
            rasterio.reproject(
                source=orig_data,
                destination=elev,
                src_transform=src.transform,
                src_crs=orig_crs,
                dst_transform=target_transform,
                dst_crs=orig_crs,
                resampling=Resampling.average
            )

    except ImportError:
        print('rasterio not found. Trying fallback with PIL/numpy...')
        west, east, south, north, elev = _load_with_pil_fallback(IN_FILE)
        mars_km_per_deg = 59.274
        cell_deg = CELL_SIZE_M / (mars_km_per_deg * 1000)
        width  = max(1, int(round((east - west) / cell_deg)))
        height = max(1, int(round((north - south) / cell_deg)))

    # Mark true nodata as NaN
    elev[elev < -9000] = np.nan
    elev[elev > 25000] = np.nan

    # Fill holes
    print('[03] Filling elevation holes...')
    elev_filled = fill_holes(elev)

    # Sanity check: elevation
    valid = elev_filled[np.isfinite(elev_filled)]
    if len(valid) == 0:
        print('ERROR: All elevation cells are NaN after fill. Check source file.')
        sys.exit(1)
    print(f'[03] Elevation: min={valid.min():.1f} m  max={valid.max():.1f} m  NaN={(elev.size-len(valid))} cells')

    # Compute slope
    print('[03] Computing slope...')
    slope = compute_slope(elev_filled, CELL_SIZE_M)
    slope = np.clip(slope, 0, 90)  # max 90 degrees (vertical cliff)
    print(f'[03] Slope:     min={slope.min():.2f}°  max={slope.max():.2f}°')
    if slope.max() < 0.1:
        print('WARNING: All slopes are near 0°. Elevation data may be flat/wrong.')

    # Compute roughness
    print('[03] Computing roughness...')
    roughness = compute_roughness(elev_filled)
    print(f'[03] Roughness: min={roughness.min():.2f} m  max={roughness.max():.2f} m')

    # Save .bin files (Float32, row-major)
    os.makedirs(DATA_DIR, exist_ok=True)
    elev_filled.tofile(os.path.join(DATA_DIR, 'elevation.bin'))
    slope.tofile(os.path.join(DATA_DIR, 'slope.bin'))
    roughness.tofile(os.path.join(DATA_DIR, 'roughness.bin'))
    print(f'[03] Saved: elevation.bin  slope.bin  roughness.bin')
    print(f'     Each file: {height * width * 4 / 1024:.1f} KB  ({height} rows x {width} cols x 4 bytes)')

    # Save aoi.json
    aoi = {
        'west':  round(west, 6),
        'east':  round(east, 6),
        'south': round(south, 6),
        'north': round(north, 6),
        'cellSizeMeters': CELL_SIZE_M,
        'width':  width,
        'height': height,
        'defaultHabitatLat': DEFAULT_HABITAT_LAT,
        'defaultHabitatLon': DEFAULT_HABITAT_LON,
        'elevationUnit': 'meters',
        'slopeUnit': 'degrees',
        'roughnessUnit': 'meters',
        'source': 'See docs/SOURCES.md',
        'assumption': 'Cell size 20 m is our planning assumption — see CLAUDE.md section 10'
    }
    with open(os.path.join(DATA_DIR, 'aoi.json'), 'w') as f:
        json.dump(aoi, f, indent=2)
    print(f'[03] Saved: aoi.json')
    print(f'\n[03] DONE. Run scripts/07_check_data.py to verify.')
    print('     Then run scripts/04_make_overlays.py to create the slope image.')


def _load_with_pil_fallback(filepath):
    """
    Emergency fallback for GeoTIFF loading without rasterio.
    Returns: (west, east, south, north, elev_array)
    Assumes the file covers the study area bounds from 01_pick_area.txt.
    """
    try:
        from PIL import Image
        import struct

        # Read the GeoTIFF as an image
        img = Image.open(filepath)
        arr = np.array(img, dtype=np.float32)
        if arr.ndim == 3:
            arr = arr[:, :, 0]  # take first band

        # Use default bounds from 01_pick_area.txt
        west, east, south, north = 137.699, 137.801, -5.151, -5.049
        print(f'[03] Fallback: assuming bounds W={west} E={east} S={south} N={north}')
        print('     If this is wrong, update bounds in this script.')
        return west, east, south, north, arr

    except Exception as e:
        print(f'PIL fallback also failed: {e}')
        print('Install rasterio: pip3 install rasterio  or  conda install -c conda-forge rasterio')
        sys.exit(1)


if __name__ == '__main__':
    main()
