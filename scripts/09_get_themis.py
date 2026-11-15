"""
09_get_themis.py — Cut THEMIS day and night infrared mosaics (Mars Odyssey, ~100 m/px) to the study area.

Mars Trek serves these as equirectangular (not web-mercator) tiles, so instead of a live tile layer we
download the few tiles that cover the study box and save exact image overlays:
  src/data/themis-day.png, src/data/themis-night.png  (grayscale; brighter = warmer / higher thermal inertia)

HOW TO RUN (repo root): python scripts/09_get_themis.py
SOURCE: NASA Mars Trek, THEMIS Day/Night IR Controlled Mosaics 100 m v2 (Oct 2018), NASA/JPL-Caltech/Arizona State University
  https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm/{z}/{row}/{col}.png
Citation: Edwards, C. S. et al. (2011), JGR 116, E10008, doi:10.1029/2010JE003755 (THEMIS controlled mosaics)
"""
import io, json, math, urllib.request
import numpy as np
from PIL import Image

LAYERS = {'themis-day': 'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018',
          'themis-night': 'THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018'}
URL = 'https://trek.nasa.gov/tiles/Mars/EQ/{name}/1.0.0/default/default028mm/{z}/{row}/{col}.png'
ZOOM = 9            # 180/2^9 deg per 256 px tile = ~82 m/px at Mars equator (native data ~100 m)
OUT_PX = 400        # output overlay size (smoothly upsampled; the data stays ~100 m)


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'marswalk-data-prep'})
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert('L')


def main():
    aoi = json.load(open('src/data/aoi.json'))
    size = 180.0 / 2 ** ZOOM
    c0, c1 = int((aoi['west'] + 180) // size), int((aoi['east'] + 180) // size)
    r0, r1 = int((90 - aoi['north']) // size), int((90 - aoi['south']) // size)
    for out, name in LAYERS.items():
        mosaic = Image.new('L', ((c1 - c0 + 1) * 256, (r1 - r0 + 1) * 256))
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1):
                mosaic.paste(fetch(URL.format(name=name, z=ZOOM, row=r, col=c)), ((c - c0) * 256, (r - r0) * 256))
        west0, north0 = c0 * size - 180, 90 - r0 * size
        px = lambda lon: (lon - west0) / size * 256
        py = lambda lat: (north0 - lat) / size * 256
        box = (px(aoi['west']), py(aoi['north']), px(aoi['east']), py(aoi['south']))
        crop = mosaic.resize((OUT_PX, OUT_PX), Image.BICUBIC, box=box)
        a = np.asarray(crop, dtype=np.float32)
        lo, hi = np.percentile(a, 1), np.percentile(a, 99)
        a = np.clip((a - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)
        Image.fromarray(a, 'L').save(f'src/data/{out}.png', optimize=True)
        print(f'[themis] {out}: tiles r{r0}-{r1} c{c0}-{c1}, source px box {tuple(round(v,1) for v in box)}')


if __name__ == '__main__':
    main()
