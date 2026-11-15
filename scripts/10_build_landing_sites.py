"""
10_build_landing_sites.py — Sharp orbital photo patch for every NASA Mars landing site.

WHAT IT DOES
  For each NASA lander / rover that reached the surface, this script:
    1. takes the published landing coordinates (sources below),
    2. marks a 4 km x 4 km box around the landing point (same size as our study area),
    3. downloads the HiRISE mosaic tiles that cover the box from NASA Mars Trek,
    4. stitches them into ONE image and saves it as src/data/sites/<id>.jpg,
    5. writes src/data/landing-sites.json (positions, box corners, sources) for the web app.
  The app draws each patch inside a labelled border so it is clear which parts of the map
  are explored sites with walking-scale imagery, and which are the coarse global basemap.

HOW TO RUN
  python3 scripts/10_build_landing_sites.py
  Needs: Pillow (pip3 install Pillow). Downloads about 2,000 small tiles (a few minutes).

IMAGERY SOURCE (all sites)
  NASA Mars Trek WMTS tiles, https://trek.nasa.gov/mars/ — HiRISE mosaics, Mars Reconnaissance
  Orbiter (NASA/JPL-Caltech/University of Arizona). Product name per site is in SITES below
  and is copied into landing-sites.json.
  Tile URL: https://trek.nasa.gov/tiles/Mars/EQ/<product>/1.0.0//default/default028mm/{z}/{row}/{col}.png
  Tile grid: simple latitude/longitude grid. Zoom z has 2^(z+1) columns x 2^z rows of 256 px
  tiles, starting at 180 W, 90 N.

LANDING COORDINATE SOURCES (planetocentric latitude, east longitude)
  [HORIZONS] NASA/JPL Horizons observing-site list for Mars (body 499), fetched Nov 14 2026:
             https://ssd.jpl.nasa.gov/api/horizons.api  (CENTER='*@499').
             Gives east longitude plus cylindrical rho and z in km. Latitude = atan2(z, rho).
             Used for Viking 1, Viking 2, Mars Pathfinder (values from Kuchynka et al. 2014,
             Icarus 229, 340-347, doi:10.1016/j.icarus.2013.11.015).
  [MARS24]   NASA GISS Mars24 "Mars Landers" page, https://www.giss.nasa.gov/tools/mars24/help/landers.html
             Published to 0.01 degree (about 600 m on Mars), so the pin is APPROXIMATE.
             Used for Spirit, Opportunity, Phoenix, InSight. Landing dates for all sites also
             come from this page.
  [MMGIS]    NASA/JPL-Caltech MMGIS rover waypoint files (first waypoint = landing point):
             https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json  (Curiosity)
             https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json  (Perseverance)

LIMITS (say so, never hide)
  - Every patch was checked: the landing point falls inside the NASA mosaic it is drawn on.
  - Pins from [MARS24] can be a few hundred meters from the real hardware.
  - Only NASA missions are included (the challenge asks for NASA data).
"""

import io
import json
import math
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not found. Run: pip3 install Pillow")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "src" / "data"
SITES_DIR = DATA_DIR / "sites"

MARS_RADIUS_METERS = 3396190.0                       # same value as src/js/config.js
METERS_PER_DEG_LAT = math.pi * MARS_RADIUS_METERS / 180.0   # about 59,275 m
BOX_SIZE_METERS = 4000.0                             # [OUR ASSUMPTION] same as the study area
TILE_ZOOM = 15                                       # 360 / (2^16 * 256) deg/px = about 1.3 m/px
TILE_PX = 256
OUTPUT_PX = 2048                                     # saved patch is 2048 x 2048 (about 2 m/px)
JPEG_QUALITY = 80
DOWNLOAD_THREADS = 6
TREK_TILE_URL = ("https://trek.nasa.gov/tiles/Mars/EQ/{product}/1.0.0//default/default028mm/"
                 "{z}/{row}/{col}.png")


def lat_from_cylindrical(rho_km, z_km):
    """Planetocentric latitude in degrees from Horizons cylindrical coordinates (rho, z in km)."""
    return math.degrees(math.atan2(z_km, rho_km))


def east360_to_180(lon_east_deg):
    """Turns a 0-360 east longitude into the -180..180 form the map uses."""
    return lon_east_deg - 360.0 if lon_east_deg > 180.0 else lon_east_deg


# One entry per NASA surface mission. coverage = [west, south, east, north] of the Trek mosaic
# (from the Trek catalog), used to keep the box inside real imagery.
SITES = [
    dict(id="viking1", name="Viking 1", kind="Lander", landed="July 20, 1976",
         siteName="Thomas Mutch Memorial Station, Chryse Planitia",
         lon=east360_to_180(312.0486300), lat=lat_from_cylindrical(3136.51980, 1284.51264),
         coordSource="HORIZONS", product="PSP_001521_2025_RED",
         productTitle="MRO HiRISE, Viking 1 Landing Site Mosaic",
         coverage=[-48.032, 22.091, -47.863, 22.461]),
    dict(id="viking2", name="Viking 2", kind="Lander", landed="Sep. 3, 1976",
         siteName="Gerald Soffen Memorial Station, Utopia Planitia",
         lon=134.2803650, lat=lat_from_cylindrical(2277.37414, 2500.10258),
         coordSource="HORIZONS", product="PSP_001501_2280_RED",
         productTitle="MRO HiRISE, Viking 2 Landing Site Mosaic",
         coverage=[134.199, 47.563, 134.400, 47.784]),
    dict(id="pathfinder", name="Mars Pathfinder + Sojourner", kind="Lander + first rover", landed="July 4, 1997",
         siteName="Carl Sagan Memorial Station, Ares Vallis",
         lon=east360_to_180(326.7457031), lat=lat_from_cylindrical(3203.20556, 1109.27927),
         coordSource="HORIZONS", product="sojourner_hirise_mosaic",
         productTitle="MRO HiRISE, Sojourner Roving Site Mosaic",
         coverage=[-33.288, 19.023, -33.209, 19.160]),
    dict(id="spirit", name="Spirit", kind="Rover", landed="Jan. 4, 2004",
         siteName="Columbia Memorial Station, Gusev Crater",
         lon=175.48, lat=-14.57,
         coordSource="MARS24", product="spirit_hirise_mosaic",
         productTitle="MRO HiRISE, Spirit Roving Site Mosaic",
         coverage=[175.428, -14.693, 175.586, -14.536]),
    dict(id="opportunity", name="Opportunity", kind="Rover", landed="Jan. 25, 2004",
         siteName="Challenger Memorial Station, Meridiani Planum",
         lon=east360_to_180(354.47), lat=-1.95,
         coordSource="MARS24", product="opportunity_hirise_mosaic",
         productTitle="MRO HiRISE, Opportunity Roving Site Mosaic",
         coverage=[-5.596, -2.751, -4.995, -1.899]),
    dict(id="phoenix", name="Phoenix", kind="Lander", landed="May 25, 2008",
         siteName="Vastitas Borealis (Martian arctic)",
         lon=east360_to_180(234.25), lat=68.22,
         coordSource="MARS24", product="phoenix_hirise_mosaic",
         productTitle="MRO HiRISE, Phoenix Landing Site Mosaic",
         coverage=[-125.890, 68.166, -125.661, 68.250]),
    dict(id="curiosity", name="Curiosity", kind="Rover", landed="Aug. 6, 2012",
         siteName="Bradbury Landing, Gale Crater",
         lon=137.441633, lat=-4.589467,
         coordSource="MMGIS", product="curiosity_hirise_mosaic",
         productTitle="MRO HiRISE, Curiosity Roving Site Mosaic",
         coverage=[137.122, -4.925, 137.730, -4.249]),
    dict(id="insight", name="InSight", kind="Lander", landed="Nov. 26, 2018",
         siteName="Elysium Planitia",
         lon=135.62, lat=4.50,
         coordSource="MARS24", product="ESP_058005_1845_RED_spline_rect",
         productTitle="MRO HiRISE, Mosaic Insight Landing Site",
         coverage=[135.569, 4.330, 135.696, 4.668]),
    dict(id="perseverance", name="Perseverance + Ingenuity", kind="Rover + helicopter", landed="Feb. 18, 2021",
         siteName="Octavia E. Butler Landing, Jezero Crater",
         lon=77.45088572, lat=18.44462715,
         coordSource="MMGIS", product="JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd",
         productTitle="MRO HiRISE, Jezero Mosaic, Controlled",
         coverage=[77.223, 18.307, 77.584, 18.669]),
]

COORD_SOURCE_TEXT = {
    "HORIZONS": "NASA/JPL Horizons site list for Mars (Kuchynka et al. 2014); latitude = atan2(z, rho)",
    "MARS24": "NASA GISS Mars24 lander list; published to 0.01 degree, so the pin is approximate (within about 600 m)",
    "MMGIS": "NASA/JPL-Caltech MMGIS rover waypoints (first waypoint = landing point)",
}


def site_box(site):
    """Returns [west, south, east, north] of the 4 km box around the landing point,
    trimmed so it never leaves the NASA mosaic (coverage)."""
    half_lat = (BOX_SIZE_METERS / 2.0) / METERS_PER_DEG_LAT
    half_lon = half_lat / math.cos(math.radians(site["lat"]))   # degrees of longitude shrink toward the poles
    cov_w, cov_s, cov_e, cov_n = site["coverage"]
    return [max(site["lon"] - half_lon, cov_w), max(site["lat"] - half_lat, cov_s),
            min(site["lon"] + half_lon, cov_e), min(site["lat"] + half_lat, cov_n)]


def fetch_tile(product, row, col):
    """Downloads one Trek tile. Returns an RGBA image, or None if NASA has no tile there."""
    url = TREK_TILE_URL.format(product=product, z=TILE_ZOOM, row=row, col=col)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                return Image.open(io.BytesIO(resp.read())).convert("RGBA")
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return None          # outside the mosaic: no data, not an error
        except Exception:
            pass                      # network hiccup: try again
    print(f"  WARNING: gave up on tile {row}/{col} of {product}")
    return None


def build_patch(site):
    """Downloads and stitches the tiles for one site. Saves the JPEG. Returns info for the JSON."""
    west, south, east, north = site_box(site)
    deg_per_px = 360.0 / (2 ** (TILE_ZOOM + 1) * TILE_PX)
    # Pixel position of the box in the whole-planet image at this zoom (x from 180 W, y from 90 N)
    x0, x1 = (west + 180.0) / deg_per_px, (east + 180.0) / deg_per_px
    y0, y1 = (90.0 - north) / deg_per_px, (90.0 - south) / deg_per_px
    col0, col1 = int(x0 // TILE_PX), int((x1 - 1e-9) // TILE_PX)
    row0, row1 = int(y0 // TILE_PX), int((y1 - 1e-9) // TILE_PX)

    jobs = [(r, c) for r in range(row0, row1 + 1) for c in range(col0, col1 + 1)]
    with ThreadPoolExecutor(max_workers=DOWNLOAD_THREADS) as pool:
        tiles = list(pool.map(lambda rc: fetch_tile(site["product"], rc[0], rc[1]), jobs))

    canvas = Image.new("RGBA", ((col1 - col0 + 1) * TILE_PX, (row1 - row0 + 1) * TILE_PX), (0, 0, 0, 0))
    for (r, c), tile in zip(jobs, tiles):
        if tile is not None:
            canvas.paste(tile, ((c - col0) * TILE_PX, (r - row0) * TILE_PX))

    crop = canvas.crop((round(x0 - col0 * TILE_PX), round(y0 - row0 * TILE_PX),
                        round(x1 - col0 * TILE_PX), round(y1 - row0 * TILE_PX)))
    patch = crop.resize((OUTPUT_PX, OUTPUT_PX), Image.LANCZOS)

    # Share of the box that really has NASA imagery (transparent = no data)
    alpha = patch.getchannel("A")
    covered = 1.0 - alpha.histogram()[0] / float(OUTPUT_PX * OUTPUT_PX)   # histogram()[0] = see-through pixels

    # HiRISE RED mosaics are grey; save as greyscale on black to keep the file small
    flat = Image.new("RGB", patch.size, (0, 0, 0))
    flat.paste(patch, mask=alpha)
    out_path = SITES_DIR / f"{site['id']}.jpg"
    flat.convert("L").save(out_path, "JPEG", quality=JPEG_QUALITY, optimize=True)

    width_m = (east - west) * METERS_PER_DEG_LAT * math.cos(math.radians(site["lat"]))
    height_m = (north - south) * METERS_PER_DEG_LAT
    print(f"  {site['id']:13s} {len(jobs):4d} tiles  box {width_m:5.0f} x {height_m:5.0f} m  "
          f"imagery {covered * 100:5.1f}%  {out_path.stat().st_size / 1024:5.0f} KB")
    return dict(
        id=site["id"], name=site["name"], kind=site["kind"], landed=site["landed"],
        siteName=site["siteName"],
        lat=round(site["lat"], 6), lon=round(site["lon"], 6),
        coordSource=COORD_SOURCE_TEXT[site["coordSource"]],
        coordApproximate=(site["coordSource"] == "MARS24"),
        bounds=dict(west=round(west, 6), south=round(south, 6), east=round(east, 6), north=round(north, 6)),
        boxWidthMeters=round(width_m), boxHeightMeters=round(height_m),
        image=f"./data/sites/{site['id']}.jpg",
        imageryCoveredFraction=round(covered, 3),
        imageryProduct=site["product"], imageryTitle=site["productTitle"],
        imageryMetersPerPixel=round(height_m / OUTPUT_PX, 2),
    )


def main():
    SITES_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Building {len(SITES)} landing-site patches (Trek zoom {TILE_ZOOM})...")
    results = []
    for site in SITES:
        cov_w, cov_s, cov_e, cov_n = site["coverage"]
        if not (cov_w <= site["lon"] <= cov_e and cov_s <= site["lat"] <= cov_n):
            print(f"  FAIL {site['id']}: landing point is outside the NASA mosaic; skipped")
            continue
        results.append(build_patch(site))

    out = dict(
        note=("NASA landers and rovers that reached the Mars surface. Each has a HiRISE photo patch "
              "(4 km box, trimmed to the NASA mosaic) cut by scripts/10_build_landing_sites.py."),
        imagerySource="NASA Mars Trek (trek.nasa.gov) HiRISE mosaics; NASA/JPL-Caltech/University of Arizona",
        landedDateSource="NASA GISS Mars24 lander list, https://www.giss.nasa.gov/tools/mars24/help/landers.html",
        boxSizeNote="4 km x 4 km box is OUR ASSUMPTION (same size as the study area)",
        sites=results,
    )
    with open(DATA_DIR / "landing-sites.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(f"Wrote {DATA_DIR / 'landing-sites.json'} with {len(results)} sites")


if __name__ == "__main__":
    main()
