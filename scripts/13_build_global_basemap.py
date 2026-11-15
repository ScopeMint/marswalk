"""
13_build_global_basemap.py - Saves ONE whole-Mars picture inside the app, so the map is never black.

WHY: the global basemap arrives from the internet in small square tiles. While a tile is still loading
(or if the link is slow or absent), that square used to show black. This script stitches the 64 tiles of
zoom level 3 into one 2048 x 2048 px image. The app draws it under everything else, so a tile that is
late shows a slightly blurry Mars instead of a black square. It also gives the offline app a global view.

SOURCE (same basemap the app already uses and cites in docs/SOURCES.md):
  OpenPlanetaryMap "opm-mars-basemap-v0-1" tiles: NASA Viking MDIM 2.1 imagery + MGS MOLA colour.
  https://www.openplanetary.org/opm-basemaps/opm-mars-basemap-v0-1
The picture keeps the tiles' own map projection (Web Mercator, latitude +/-85.0511 deg), which is what
the Leaflet map uses, so it lines up exactly. Nothing is drawn, recoloured or generated.

HOW TO RUN (repo root):  python scripts/13_build_global_basemap.py
OUTPUT: src/data/mars-global.jpg  (+ prints its size)
Needs: pip install pillow
"""
import io
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

URL = 'https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-1/all/{z}/{x}/{y}.png'
ZOOM = 3                      # 8 x 8 tiles = 2048 px: about 10 km per pixel at the equator
TILE = 256
OUT = os.path.join('src', 'data', 'mars-global.jpg')


def fetch(xy):
    """Downloads one tile. Returns (x, y, image)."""
    x, y = xy
    req = urllib.request.Request(URL.format(z=ZOOM, x=x, y=y), headers={'User-Agent': 'basemap-stitcher'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return x, y, Image.open(io.BytesIO(resp.read())).convert('RGB')


def main():
    n = 2 ** ZOOM
    canvas = Image.new('RGB', (n * TILE, n * TILE))
    with ThreadPoolExecutor(max_workers=8) as pool:
        for x, y, tile in pool.map(fetch, [(x, y) for x in range(n) for y in range(n)]):
            canvas.paste(tile, (x * TILE, y * TILE))
    canvas.save(OUT, 'JPEG', quality=82, optimize=True)
    print(f'wrote {OUT}: {canvas.size[0]} x {canvas.size[1]} px, {os.path.getsize(OUT) / 1024:.0f} KB, {n * n} tiles')


if __name__ == '__main__':
    main()
