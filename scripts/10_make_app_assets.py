"""
10_make_app_assets.py — Draws the app icons (simple vector shapes, no AI imagery) and writes the offline
tile index used by the service worker's "Download offline pack" feature.

HOW TO RUN (repo root): python scripts/10_make_app_assets.py
Outputs: src/icons/*.png, src/tiles/hirise/index.json
"""
import json
import os
from PIL import Image, ImageDraw

BG = (15, 17, 21, 255)         # --bg
MARS = (217, 98, 43, 255)      # --accent
SHADE = (150, 60, 28, 255)
ROUTE = (63, 208, 201, 255)    # --route
TEXT = (232, 230, 227, 255)


def draw_icon(size, maskable=False):
    """Returns an RGBA icon: Mars disc with a cyan route from base (white dot) to target (cyan dot)."""
    s = size
    im = Image.new('RGBA', (s, s), BG)
    d = ImageDraw.Draw(im)
    pad = s * (0.18 if maskable else 0.08)   # maskable icons need a safe zone
    r0, r1 = pad, s - pad
    d.ellipse([r0, r0, r1, r1], fill=MARS)
    d.pieslice([r0, r0, r1, r1], 100, 260, fill=SHADE)
    for k in range(3):
        o = (r1 - r0) * (0.18 + 0.12 * k)
        d.arc([r0 + o * 0.2, r0 + o, r1 - o * 0.2, r1 + o * 0.6], 200, 340, fill=(255, 180, 120, 160), width=max(1, s // 96))
    pts = [(0.30, 0.70), (0.42, 0.58), (0.40, 0.47), (0.55, 0.42), (0.66, 0.30)]
    P = [(r0 + (r1 - r0) * x, r0 + (r1 - r0) * y) for x, y in pts]
    d.line(P, fill=ROUTE, width=max(2, s // 28), joint='curve')
    for (x, y), c in ((P[0], TEXT), (P[-1], ROUTE)):
        rr = s * 0.035
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=c, outline=BG, width=max(1, s // 128))
    if not maskable:
        mask = Image.new('L', (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 0.22, fill=255)
        im.putalpha(mask)
    return im


def main():
    os.makedirs('src/icons', exist_ok=True)
    for sz in (192, 512):
        draw_icon(sz).save(f'src/icons/icon-{sz}.png', optimize=True)
    draw_icon(512, True).save('src/icons/icon-maskable-512.png', optimize=True)
    draw_icon(180).save('src/icons/apple-touch-icon.png', optimize=True)
    draw_icon(64).save('src/icons/favicon-64.png', optimize=True)

    tiles = []
    for root, _, files in os.walk('src/tiles/hirise'):
        for f in files:
            if f.endswith('.jpg'):
                rel = os.path.relpath(os.path.join(root, f), 'src').replace(os.sep, '/')
                tiles.append('./' + rel)
    tiles.sort()
    with open('src/tiles/hirise/index.json', 'w') as fh:
        json.dump({'count': len(tiles), 'tiles': tiles}, fh)
    print('icons ok; tiles indexed:', len(tiles))


if __name__ == '__main__':
    main()
