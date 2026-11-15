"""
08_build_real_site.py — Build the study-area data from REAL NASA HiRISE data on Curiosity's 2025 boxwork route.

WHAT IT DOES
  1. Reads a 4 km x 4 km window of the USGS-controlled HiRISE Digital Terrain Model (1 m/pixel)
     straight from its cloud-optimized GeoTIFF (no huge download; only the window is fetched).
  2. Makes the 10 m route grids the app uses:
       elevation.bin  mean elevation of each 10 m cell (meters, Mars areoid)
       slope.bin      slope of each 10 m cell (degrees)
       roughness.bin  "rock & ridge relief": spread (standard deviation, meters) of the 1 m
                      elevations inside each 10 m cell after removing the smooth hill shape.
                      Boulder fields, boxwork ridges and scarps score high; smooth sand scores low.
  3. Makes hillshade.png (terrain shading) and relief-overlay.png (rock & ridge relief classes).
  4. Cuts HiRISE 25 cm orthoimage map tiles (zoom 13-17) into src/tiles/hirise/{z}/{x}/{y}.jpg
  5. Clips Curiosity's real traverse + waypoints (with sol numbers) to the study area.
  6. Writes aoi.json with bounds, sources and citations.

HOW TO RUN (from the repo root):
  python scripts/08_build_real_site.py            (everything)
  python scripts/08_build_real_site.py --no-tiles (skip map tiles; faster)
Then re-run: python scripts/04_make_overlays.py, scripts/generate_los_overlay.py

DATA SOURCES (all public; HiRISE DTM products are CC0 via USGS Astrogeology STAC):
  HiRISE DTM DTEEC_019698_1750_019988_1750_U01 (University of Arizona; USGS Astrogeology analysis-ready data)
    https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_socet_dtms/items/DTEEC_019698_1750_019988_1750_U01
  HiRISE orthoimage ESP_019988_1750_RED_A_01_ORTHO (0.25 m/pixel), same DTM product
  Curiosity traverse + waypoints: NASA/JPL MMGIS  https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/
"""

import argparse
import json
import math
import os
import sys
import urllib.request

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from scipy.ndimage import uniform_filter
from PIL import Image

# ── Study area ────────────────────────────────────────────────────────────────
# Centered on Curiosity's boxwork campaign (sols ~4500-5073, May 2025 onward).
# Our selection: the 4 km box contains the whole 2025 boxwork traverse.
CENTER_LAT     = -4.808     # degrees (areocentric)
CENTER_LON     = 137.372    # degrees east
SIZE_METERS    = 4000       # side of the square study area [OUR ASSUMPTION: one-EVA walkable range]
CELL_METERS    = 10         # route grid cell size [OUR ASSUMPTION]
FINE_METERS    = 1          # resolution used for the rock & ridge relief calculation (HiRISE DTM native ~1 m)
RELIEF_WINDOW_M = 11        # smoothing window (m) that defines "the hill shape" removed before measuring relief
# EVA base (habitat): flattest wide pad near the targets (300 m mean slope ~6 deg, low relief) [OUR SELECTION]
HABITAT_LAT    = -4.82276
HABITAT_LON    = 137.36447

MARS_RADIUS_M  = 3396190.0  # IAU Mars 2015 sphere, same as the DTM projection

DTM_ITEM  = 'DTEEC_019698_1750_019988_1750_U01'
DTM_BASE  = 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_019698_1750_ESP_019988_1750/'
DTM_URL   = DTM_BASE + 'DTEEC_019698_1750_019988_1750_U01.tif'
ORTHO_URL = DTM_BASE + 'ESP_019988_1750_RED_A_01_ORTHO.tif'
TRAVERSE_URL  = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json'
WAYPOINTS_URL = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json'

DATA_DIR  = 'src/data'
TILE_DIR  = 'src/tiles/hirise'
RAW_DIR   = 'data/raw'          # git-ignored cache
TILE_ZOOMS = range(13, 18)      # z17 ~ 0.6 m per pixel on Mars ground
TILE_JPEG_QUALITY = 78


def deg_per_meter_lat():
    """Degrees of latitude per meter of Mars ground."""
    return 180.0 / (math.pi * MARS_RADIUS_M)


def study_bounds():
    """Returns (west, east, south, north) in degrees for the square study area."""
    half = SIZE_METERS / 2.0
    dlat = half * deg_per_meter_lat()
    dlon = dlat / math.cos(math.radians(CENTER_LAT))
    return CENTER_LON - dlon, CENTER_LON + dlon, CENTER_LAT - dlat, CENTER_LAT + dlat


def proj_xy(lon, lat):
    """lon/lat degrees -> DTM projection meters (equirectangular, clon 0, standard parallel 0)."""
    return MARS_RADIUS_M * math.radians(lon), MARS_RADIUS_M * math.radians(lat)


def read_window(url, bounds, out_w, out_h, resampling):
    """Reads the study-area window from a remote COG, resampled to out_h x out_w. Returns float32 with NaN no-data."""
    west, east, south, north = bounds
    x0, y0 = proj_xy(west, south)
    x1, y1 = proj_xy(east, north)
    with rasterio.open('/vsicurl/' + url) as ds:
        win = from_bounds(x0, y0, x1, y1, ds.transform)
        arr = ds.read(1, window=win, out_shape=(out_h, out_w), resampling=resampling, boundless=True,
                      fill_value=ds.nodata if ds.nodata is not None else 0).astype(np.float32)
        nod = ds.nodata
    if nod is not None:
        arr[(arr == nod) | (arr < -1e30)] = np.nan
    return arr


def block_reduce(arr, k, fn):
    """Reduces an (H*k, W*k) array to (H, W) by applying fn (np.nanmean / np.nanstd) on k x k blocks."""
    h, w = arr.shape[0] // k, arr.shape[1] // k
    blocks = arr[:h * k, :w * k].reshape(h, k, w, k).swapaxes(1, 2).reshape(h, w, k * k)
    with np.errstate(all='ignore'):
        return fn(blocks, axis=2).astype(np.float32)


def fill_nan(arr):
    """Fills NaN cells with the nearest valid value (simple iterative 3x3 mean). Returns a copy."""
    out = arr.copy()
    for _ in range(50):
        bad = ~np.isfinite(out)
        if not bad.any():
            break
        padded = np.pad(out, 1, mode='edge')
        stack = np.stack([padded[r:r + out.shape[0], c:c + out.shape[1]] for r in range(3) for c in range(3)])
        with np.errstate(all='ignore'):
            mean = np.nanmean(stack, axis=0)
        out[bad] = mean[bad]
    return out


def slope_degrees(elev, cell_m):
    """Slope in degrees from an elevation grid with square cells of cell_m meters."""
    dy, dx = np.gradient(elev.astype(np.float64), cell_m, cell_m)
    return np.degrees(np.arctan(np.hypot(dx, dy))).astype(np.float32)


def hillshade_png(elev, cell_m, path):
    """Saves an elevation-tinted hillshade RGBA PNG (same look as 02_get_mola.py)."""
    dy, dx = np.gradient(elev.astype(np.float64), cell_m, cell_m)
    slope = np.arctan(np.hypot(dx, dy))
    aspect = np.arctan2(-dy, dx)
    az, alt = np.radians(360 - 315 + 90), np.radians(40)
    hs = np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)
    lo, hi = np.nanpercentile(elev, 1), np.nanpercentile(elev, 99)
    t = np.clip((elev - lo) / max(hi - lo, 1e-6), 0, 1)[..., None]
    rgb = np.array([72, 48, 36]) * (1 - t) + np.array([195, 165, 120]) * t
    rgb = np.clip(rgb * (0.35 + 0.65 * hs[..., None]), 0, 255).astype(np.uint8)
    alpha = np.where(np.isfinite(elev), 230, 0).astype(np.uint8)[..., None]
    Image.fromarray(np.concatenate([rgb, alpha], axis=2), 'RGBA').save(path, optimize=True)


# Rock & ridge relief classes (meters of 1 m-scale relief inside a 10 m cell) [OUR ASSUMPTION thresholds]
RELIEF_CLASSES = [
    (0.00, 0.30, (0, 0, 0, 0)),             # smooth (at or near the DTM noise floor): transparent
    (0.30, 0.50, (242, 177, 52, 120)),      # some rocks / small ridges (amber)
    (0.50, 0.80, (232, 116, 46, 175)),      # rocky / ridged (matches router "rough ground" threshold 0.5 m)
    (0.80, 99.0, (229, 72, 77, 215)),       # very rocky, scarps, large blocks
]


def relief_png(rough, path):
    """Saves the rock & ridge relief classes as an RGBA PNG."""
    rgba = np.zeros(rough.shape + (4,), np.uint8)
    for lo, hi, col in RELIEF_CLASSES:
        m = (rough >= lo) & (rough < hi)
        rgba[m] = col
    Image.fromarray(rgba, 'RGBA').save(path, optimize=True)


def fetch_json(url, cache_name):
    """Downloads JSON once into the raw cache and returns it parsed."""
    os.makedirs(RAW_DIR, exist_ok=True)
    cache = os.path.join(RAW_DIR, cache_name)
    if not os.path.exists(cache):
        req = urllib.request.Request(url, headers={'User-Agent': 'marswalk-data-prep'})
        with urllib.request.urlopen(req, timeout=120) as r, open(cache, 'wb') as f:
            f.write(r.read())
    with open(cache, encoding='utf-8') as f:
        return json.load(f)


def clip_traverse(bounds):
    """Writes curiosity-traverse.geojson: traverse lines + waypoints (with sol) inside the study area."""
    west, east, south, north = bounds
    inside = lambda lon, lat: west <= lon <= east and south <= lat <= north
    trav = fetch_json(TRAVERSE_URL, 'MSL_traverse.json')
    wps = fetch_json(WAYPOINTS_URL, 'MSL_waypoints.json')
    feats = []
    for f in trav['features']:
        g = f['geometry']
        lines = [g['coordinates']] if g['type'] == 'LineString' else g['coordinates']
        for line in lines:
            pts = [[round(p[0], 6), round(p[1], 6)] for p in line if inside(p[0], p[1])]
            if len(pts) >= 2:
                feats.append({'type': 'Feature', 'properties': {'kind': 'traverse'},
                              'geometry': {'type': 'LineString', 'coordinates': pts}})
    for f in wps['features']:
        p = f['properties']
        if inside(p['lon'], p['lat']):
            feats.append({'type': 'Feature',
                          'properties': {'kind': 'waypoint', 'sol': p['sol'], 'site': p['site'],
                                         'drive': p['drive'], 'elevGeoidM': round(p['elev_geoid'], 1),
                                         'distTotalKm': p['dist_km']},
                          'geometry': {'type': 'Point', 'coordinates': [round(p['lon'], 6), round(p['lat'], 6)]}})
    out = {'type': 'FeatureCollection',
           'metadata': {'source': 'NASA/JPL-Caltech MSL MMGIS traverse and waypoint layers',
                        'url': 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/',
                        'note': 'Real Curiosity rover drive path and end-of-drive positions inside the study area.'},
           'features': feats}
    with open(os.path.join(DATA_DIR, 'curiosity-traverse.geojson'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    sols = [x['properties']['sol'] for x in feats if x['properties']['kind'] == 'waypoint']
    print(f'[traverse] {len(feats)} features; waypoint sols {min(sols) if sols else "-"}..{max(sols) if sols else "-"}')


def tile_bounds(z, x, y):
    """Web-mercator XYZ tile -> (west, east, south, north) degrees."""
    n = 2 ** z
    lon0, lon1 = x / n * 360 - 180, (x + 1) / n * 360 - 180
    lat_of = lambda yy: math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yy / n))))
    return lon0, lon1, lat_of(y + 1), lat_of(y)


def make_tiles(bounds):
    """Cuts HiRISE orthoimage tiles for TILE_ZOOMS inside the study area."""
    west, east, south, north = bounds
    # One contrast stretch for all zooms, from a coarse read
    preview = read_window(ORTHO_URL, bounds, 1000, 1000, Resampling.average)
    v = preview[np.isfinite(preview) & (preview > 0)]
    lo, hi = np.percentile(v, 0.5), np.percentile(v, 99.5)
    total = 0
    for z in TILE_ZOOMS:
        n = 2 ** z
        deg_per_px = 360.0 / (256 * n)
        out_w = int(math.ceil((east - west) / deg_per_px))
        out_h = int(math.ceil((north - south) / deg_per_px))
        src = read_window(ORTHO_URL, bounds, out_w, out_h, Resampling.average)
        img8 = np.clip((src - lo) / (hi - lo) * 255, 0, 255)
        img8[~np.isfinite(src) | (src <= 0)] = 0
        img8 = img8.astype(np.uint8)
        x0 = int((west + 180) / 360 * n)
        x1 = int((east + 180) / 360 * n)
        merc_y = lambda lat: (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
        y0, y1 = int(merc_y(north)), int(merc_y(south))
        for tx in range(x0, x1 + 1):
            for ty in range(y0, y1 + 1):
                tw, te, ts, tn = tile_bounds(z, tx, ty)
                lons = tw + (np.arange(256) + 0.5) / 256 * (te - tw)
                # per-row latitude through inverse mercator
                yy = ty + (np.arange(256) + 0.5) / 256
                lats = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * yy / n))))
                cols = ((lons - west) / (east - west) * out_w).astype(int)
                rows = ((north - lats) / (north - south) * out_h).astype(int)
                okc = (cols >= 0) & (cols < out_w)
                okr = (rows >= 0) & (rows < out_h)
                if not okc.any() or not okr.any():
                    continue
                tile = np.zeros((256, 256), np.uint8)
                rr, cc = np.meshgrid(np.clip(rows, 0, out_h - 1), np.clip(cols, 0, out_w - 1), indexing='ij')
                tile[:] = img8[rr, cc]
                tile[~okr, :] = 0
                tile[:, ~okc] = 0
                if tile.max() == 0:
                    continue
                d = os.path.join(TILE_DIR, str(z), str(tx))
                os.makedirs(d, exist_ok=True)
                Image.fromarray(tile, 'L').save(os.path.join(d, f'{ty}.jpg'), quality=TILE_JPEG_QUALITY, optimize=True)
                total += 1
        print(f'[tiles] z{z}: source {out_w}x{out_h}px, tiles so far {total}')
    return int(min(TILE_ZOOMS)), int(max(TILE_ZOOMS))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-tiles', action='store_true')
    args = ap.parse_args()
    os.makedirs(DATA_DIR, exist_ok=True)

    bounds = study_bounds()
    west, east, south, north = bounds
    n_cells = SIZE_METERS // CELL_METERS
    n_fine = SIZE_METERS // FINE_METERS
    print(f'[aoi] W {west:.6f} E {east:.6f} S {south:.6f} N {north:.6f}; grid {n_cells}x{n_cells} @ {CELL_METERS} m')

    print('[dtm] reading 1 m window from HiRISE DTM COG ...')
    fine = read_window(DTM_URL, bounds, n_fine, n_fine, Resampling.bilinear)
    valid_frac = float(np.isfinite(fine).mean())
    print(f'[dtm] {fine.shape}, valid {valid_frac:.3f}, elev {np.nanmin(fine):.1f}..{np.nanmax(fine):.1f} m')

    k = CELL_METERS // FINE_METERS
    elev = block_reduce(fine, k, np.nanmean)
    hole_mask = ~np.isfinite(elev)
    elev_filled = fill_nan(elev)
    slope = slope_degrees(elev_filled, CELL_METERS)

    # Rock & ridge relief: remove the smooth hill shape, measure leftover 1 m-scale bumps
    fine_filled = np.where(np.isfinite(fine), fine, np.repeat(np.repeat(elev_filled, k, 0), k, 1))
    smooth = uniform_filter(fine_filled.astype(np.float64), size=RELIEF_WINDOW_M, mode='nearest')
    resid = (fine_filled - smooth).astype(np.float32)
    resid[~np.isfinite(fine)] = np.nan
    rough = block_reduce(resid, k, np.nanstd)
    rough = np.where(np.isfinite(rough), rough, 0).astype(np.float32)

    # Cells with no DTM data stay NaN in elevation (router treats them as blocked)
    elev_out = elev_filled.copy()
    elev_out[hole_mask] = np.nan
    slope[hole_mask] = np.nan

    for name, arr in (('elevation', elev_out), ('slope', slope), ('roughness', rough)):
        arr.astype('<f4').tofile(os.path.join(DATA_DIR, f'{name}.bin'))
    pct = lambda a, q: float(np.nanpercentile(a, q))
    print(f'[grids] slope p50 {pct(slope,50):.1f} p90 {pct(slope,90):.1f} max {np.nanmax(slope):.1f} deg; '
          f'relief p50 {pct(rough,50):.2f} p90 {pct(rough,90):.2f} p99 {pct(rough,99):.2f} m; holes {hole_mask.mean():.3%}')

    # Hillshade at 4 m for a crisper picture than the 10 m grid
    hs_k = 4
    hs = block_reduce(fine, hs_k, np.nanmean)
    hillshade_png(hs, hs_k, os.path.join(DATA_DIR, 'hillshade.png'))
    relief_png(rough, os.path.join(DATA_DIR, 'relief-overlay.png'))

    clip_traverse(bounds)

    tile_info = None
    if not args.no_tiles:
        zmin, zmax = make_tiles(bounds)
        tile_info = {'urlTemplate': './tiles/hirise/{z}/{x}/{y}.jpg', 'minZoom': zmin, 'maxNativeZoom': zmax,
                     'source': 'HiRISE ESP_019988_1750_RED_A_01_ORTHO (0.25 m/px), NASA/JPL/University of Arizona'}

    aoi_path = os.path.join(DATA_DIR, 'aoi.json')
    old = {}
    if os.path.exists(aoi_path):
        with open(aoi_path) as f:
            old = json.load(f)
    aoi = {
        'west': round(west, 6), 'east': round(east, 6), 'south': round(south, 6), 'north': round(north, 6),
        'cellSizeMeters': CELL_METERS, 'width': n_cells, 'height': n_cells,
        'defaultHabitatLat': HABITAT_LAT, 'defaultHabitatLon': HABITAT_LON,
        'elevationUnit': 'meters above the Mars areoid (negative values are normal inside Gale Crater)',
        'slopeUnit': 'degrees', 'roughnessUnit': 'meters (std. dev. of 1 m HiRISE relief inside each 10 m cell)',
        'elevationSource': f'HiRISE DTM {DTM_ITEM} (1 m/px), block-averaged to {CELL_METERS} m cells',
        'elevationCitation': 'HiRISE DTM produced by the University of Arizona HiRISE team (McEwen et al. 2007, JGR 112, E05S02, doi:10.1029/2005JE002605); '
                             'analysis-ready COG by USGS Astrogeology (CC0)',
        'elevationResolution': '1 m/px native; 10 m route cells; relief measured at 1 m',
        'elevationNote': 'HiRISE DTM resolves features ~3-5 m across. Single boulders under ~2 m are not resolved; they show up only as extra relief.',
        'dtmValidFraction': round(valid_frac, 4),
        'syntheticTerrain': False,
        'source': 'https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_socet_dtms/items/' + DTM_ITEM,
        'hiriseTiles': tile_info or old.get('hiriseTiles'),
        'studyAreaNote': "Our selection: 4 km x 4 km box containing Curiosity's 2025 boxwork traverse on Mount Sharp, Gale Crater.",
    }
    with open(aoi_path, 'w') as f:
        json.dump(aoi, f, indent=2)
    print('[done] wrote', aoi_path)


if __name__ == '__main__':
    sys.exit(main())
