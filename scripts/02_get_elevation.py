"""
02_get_elevation.py — Clip the NASA elevation source file to the study area bounds.
Outputs: data/raw/elevation_clip.tif

HOW TO RUN:
  python3 scripts/02_get_elevation.py

BEFORE RUNNING:
  1. Download an elevation file (HiRISE DTM, CTX DTM, or MOLA — see DATA_PLAN.md)
  2. Place it at the path specified in ELEVATION_SOURCE_PATH below
  3. Update STUDY_AREA bounds if you moved the box from the default

WHAT IT DOES:
  Reads the elevation file, clips it to the study area bounds, prints min/max elevation,
  and saves a clipped GeoTIFF to data/raw/.
"""

import os
import sys
import numpy as np

# ── Study area bounds (must match 01_pick_area.txt and config.js) ──────────────
STUDY_AREA = {
    'west':  137.699,
    'east':  137.801,
    'south': -5.151,
    'north': -5.049,
}

# ── Put your elevation file path here before running ───────────────────────────
ELEVATION_SOURCE_PATH = 'data/raw/source_elevation.tif'   # adjust as needed

OUT_DIR = 'data/raw'
OUT_FILE = os.path.join(OUT_DIR, 'elevation_clip.tif')


def main():
    if not os.path.exists(ELEVATION_SOURCE_PATH):
        print(f'ERROR: Elevation file not found at: {ELEVATION_SOURCE_PATH}')
        print('Download an elevation file and update ELEVATION_SOURCE_PATH in this script.')
        print('See DATA_PLAN.md for download sources.')
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)

    # Try rasterio first
    try:
        import rasterio
        from rasterio.mask import mask
        from shapely.geometry import box
        import json

        print(f'[02] Using rasterio to clip {ELEVATION_SOURCE_PATH}')

        with rasterio.open(ELEVATION_SOURCE_PATH) as src:
            print(f'     Source CRS: {src.crs}')
            print(f'     Source bounds: {src.bounds}')
            print(f'     Source resolution: {src.res}')
            print(f'     Source dtype: {src.dtypes[0]}')

            geom = box(STUDY_AREA['west'], STUDY_AREA['south'],
                       STUDY_AREA['east'], STUDY_AREA['north'])

            clipped, transform = mask(src, [geom.__geo_interface__], crop=True)
            clipped_meta = src.meta.copy()
            clipped_meta.update({
                'driver': 'GTiff',
                'height': clipped.shape[1],
                'width': clipped.shape[2],
                'transform': transform,
                'dtype': 'float32'
            })

            data = clipped[0].astype(np.float32)
            # Replace nodata value with NaN
            nodata = src.nodata
            if nodata is not None:
                data[data == nodata] = np.nan

            # Print sanity check
            valid = data[np.isfinite(data)]
            if len(valid) == 0:
                print('ERROR: No valid elevation data in this area. Check that the source file covers the study area.')
                sys.exit(1)

            print(f'\n[02] Clip result:')
            print(f'     Grid size: {data.shape[1]} x {data.shape[0]} pixels')
            print(f'     Elevation range: {valid.min():.1f} m to {valid.max():.1f} m')
            print(f'     NaN (no data) cells: {np.sum(~np.isfinite(data))} / {data.size}')

            expected_min, expected_max = -5500, -1000
            if valid.min() < expected_min - 1000 or valid.max() > expected_max + 2000:
                print(f'WARNING: Elevation range looks unusual for Gale Crater / Mount Sharp.')
                print(f'         Expected roughly {expected_min} to {expected_max} m.')
                print(f'         Check that the file is in meters and covers the right area.')

            with rasterio.open(OUT_FILE, 'w', **clipped_meta) as dst:
                dst.write(data, 1)

            print(f'\n[02] Saved: {OUT_FILE}')
            print('     NEXT STEP: run scripts/03_make_grids.py')

    except ImportError:
        print('rasterio not found. Trying gdal_translate command-line fallback...')
        _clip_with_gdal()


def _clip_with_gdal():
    """Fallback: use gdal_translate (part of GDAL command-line tools)."""
    import subprocess
    w, e, s, n = STUDY_AREA['west'], STUDY_AREA['east'], STUDY_AREA['south'], STUDY_AREA['north']
    cmd = [
        'gdal_translate',
        '-projwin', str(w), str(n), str(e), str(s),
        '-ot', 'Float32',
        ELEVATION_SOURCE_PATH,
        OUT_FILE
    ]
    print(f'[02] Running: {" ".join(cmd)}')
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f'gdal_translate failed:\n{result.stderr}')
        print('\nFallback options:')
        print('  1. pip3 install rasterio')
        print('  2. conda install -c conda-forge rasterio')
        print('  3. Install GDAL: brew install gdal (Mac)')
        sys.exit(1)
    print(f'[02] Saved: {OUT_FILE}')
    print('     NEXT STEP: run scripts/03_make_grids.py')


if __name__ == '__main__':
    main()
