"""
11_make_3d_texture.py — Builds the 3D terrain texture: HiRISE orthoimage resampled exactly onto the study-area
grid (same lon/lat bounds as elevation.bin), so it drapes 1:1 over the terrain mesh.

HOW TO RUN (repo root): python scripts/11_make_3d_texture.py
Output: src/data/hirise-texture.jpg (2048 x 2048, north up, west left)
Source: HiRISE ESP_019988_1750_RED_A_01_ORTHO (NASA/JPL/University of Arizona; USGS Astrogeology, CC0)
"""
import json
import importlib.util
import numpy as np
from PIL import Image
from rasterio.enums import Resampling

SIZE_PX = 2048

spec = importlib.util.spec_from_file_location('site', 'scripts/08_build_real_site.py')
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


def main():
    aoi = json.load(open('src/data/aoi.json'))
    bounds = (aoi['west'], aoi['east'], aoi['south'], aoi['north'])
    img = site.read_window(site.ORTHO_URL, bounds, SIZE_PX, SIZE_PX, Resampling.average)
    v = img[np.isfinite(img) & (img > 0)]
    lo, hi = np.percentile(v, 0.5), np.percentile(v, 99.5)
    out = np.clip((img - lo) / (hi - lo) * 255, 0, 255)
    out[~np.isfinite(img) | (img <= 0)] = 0
    # warm Mars tint so the 3D view reads as Mars, not the Moon (tint only; brightness = HiRISE RED band)
    g = out.astype(np.float32) / 255
    rgb = np.stack([g ** 0.9 * 255, g ** 1.05 * 200, g ** 1.25 * 160], axis=-1)
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB').save('src/data/hirise-texture.jpg', quality=82, optimize=True)
    print('texture ok')


if __name__ == '__main__':
    main()
