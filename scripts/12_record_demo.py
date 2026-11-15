"""
12_record_demo.py — Records the 30-second demo video and the 5 submission screenshots from the REAL app.

Needs: the app served locally (python -m http.server 8080 --directory src), Google Chrome, `pip install playwright`, ffmpeg.
HOW TO RUN (repo root): python scripts/12_record_demo.py
Outputs (media/):
  marswalk-demo-30s.mp4   1920x1080, H.264, captions burned in by the app itself (they ARE the English subtitles)
  marswalk-demo-30s.srt   the same captions as a subtitle file (upload with the video to YouTube)
  shot-1-map.png .. shot-5-3d.png
"""
import json
import os
import shutil
import subprocess
import time
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8080/index.html'
W, H = 1920, 1080
VIDEO_SECONDS = 30
OUT = 'media'


def wait_ready(page):
    """Waits until grids, walk-back field and boot screen are done."""
    page.wait_for_function("() => typeof STATE !== 'undefined' && STATE.walkback && STATE.walkback.status === 'ready' && !document.getElementById('boot')", timeout=60000)
    page.wait_for_timeout(800)


def srt_time(sec):
    """Seconds -> SRT timestamp."""
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def record_video(p):
    """Plays the ?video=1 tour, saves the webm, cuts 30 s of mp4, writes the SRT."""
    tmp = os.path.join(OUT, '_raw')
    shutil.rmtree(tmp, ignore_errors=True)
    browser = p.chromium.launch(channel='chrome', headless=False, args=['--window-size=1920,1080'])
    ctx = browser.new_context(viewport={'width': W, 'height': H}, record_video_dir=tmp, record_video_size={'width': W, 'height': H})
    page = ctx.new_page()
    t_page = time.time()
    page.goto(URL + '?video=1')
    wait_ready(page)
    start_perf = page.evaluate('() => performance.now()')
    t_tour = time.time()
    page.evaluate('() => { window._tourDone = false; runTour().then(() => { window._tourDone = true; }); }')
    page.wait_for_function('() => window._tourDone === true', timeout=120000)
    log = page.evaluate('() => TOUR_LOG')
    ctx.close()
    browser.close()
    raw = [f for f in os.listdir(tmp) if f.endswith('.webm')][0]
    offset = t_tour - t_page
    mp4 = os.path.join(OUT, 'marswalk-demo-30s.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{offset:.2f}', '-i', os.path.join(tmp, raw), '-t', str(VIDEO_SECONDS),
                    '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', mp4], check=True)
    lines = []
    for i, c in enumerate(log):
        a = (c['tMs'] - start_perf) / 1000
        b = ((log[i + 1]['tMs'] - start_perf) / 1000) if i + 1 < len(log) else VIDEO_SECONDS
        a, b = max(0, a), min(VIDEO_SECONDS, b - 0.05)
        if a >= VIDEO_SECONDS:
            break
        lines.append(f"{len(lines) + 1}\n{srt_time(a)} --> {srt_time(b)}\n{c['main']}\n")
    with open(os.path.join(OUT, 'marswalk-demo-30s.srt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    shutil.rmtree(tmp, ignore_errors=True)
    print('[video]', mp4, f'offset {offset:.1f}s, {len(lines)} subtitles')


def screenshots(p):
    """Takes the 5 submission screenshots."""
    browser = p.chromium.launch(channel='chrome', headless=False, args=['--window-size=1920,1080'])
    ctx = browser.new_context(viewport={'width': W, 'height': H})
    page = ctx.new_page()
    page.goto(URL + '?video=1')
    wait_ready(page)
    shot = lambda n: page.screenshot(path=os.path.join(OUT, n))

    # 1. map + route + safety/suit/hazards card + Curiosity path
    page.evaluate("() => { toggleLayer('traverse', true); selectTarget(STATE.targets[1]); }")
    page.wait_for_function("() => STATE.route && STATE.route.status === 'ok'")
    page.wait_for_timeout(1800)
    shot('shot-1-map-route.png')
    # 2. EVA cue card
    page.evaluate('() => showBrief()')
    page.wait_for_timeout(600)
    shot('shot-2-cue-card.png')
    page.evaluate("() => document.getElementById('brief-modal').remove()")
    # 3. Multi-stop traverse + layers
    page.evaluate("""async () => { document.querySelectorAll('.trav-check').forEach(c => { c.checked = ['target-1','target-2','target-5'].includes(c.value); }); await planTraverse(); }""")
    page.wait_for_timeout(1500)
    shot('shot-3-traverse.png')
    # 4. Visor HUD mid-walk
    page.evaluate("""() => { selectTarget(STATE.targets[3]); }""")
    page.wait_for_function("() => STATE.route && STATE.route.status === 'ok'")
    page.wait_for_timeout(800)
    page.evaluate("""() => { document.querySelector('#top-bar .hud-toggle').click();
      const sel = document.querySelector('.hud-overlay select'); sel.value = sel.options[sel.options.length-1].value; sel.dispatchEvent(new Event('change'));
      [...document.querySelectorAll('.hud-overlay button')].find(b => b.textContent.trim() === 'Play').click(); }""")
    page.wait_for_timeout(5500)
    shot('shot-4-visor-hud.png')
    page.evaluate('() => hudClose()')
    # 5. 3D fly-through
    page.evaluate("() => [...document.querySelectorAll('#top-bar button')].find(b => /3D/.test(b.textContent)).click()")
    page.wait_for_function("() => { const f = document.querySelector('[data-t3d=\"fly\"]'); return f && !f.disabled; }", timeout=30000)
    page.evaluate("() => document.querySelector('[data-t3d=\"fly\"]').click()")
    page.wait_for_timeout(7000)
    shot('shot-5-3d-flythrough.png')
    ctx.close()
    browser.close()
    print('[shots] 5 screenshots saved')


def main():
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        record_video(p)
        screenshots(p)


if __name__ == '__main__':
    main()
