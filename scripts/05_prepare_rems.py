"""
05_prepare_rems.py - Build src/data/rems-temps.json from REAL Curiosity REMS measurements.

WHAT IT DOES (simple version):
  1. Downloads Curiosity REMS "MODRDR" files (the REMS team's best-estimate, calibrated product)
     from NASA's Planetary Data System (PDS) Atmospheres Node, one sol about every SOL_STEP sols.
  2. From each file it takes AMBIENT_TEMP (estimated ambient air temperature, ~1.6 m above the
     ground, Kelvin) and groups it by Local True Solar Time hour (LTST, 0-23).
  3. Each sol is put in one of two halves of the Mars year by its solar longitude (Ls):
       Ls 0-180   (aphelion half: Mars farther from the Sun)  -> cooler at Gale
       Ls 180-360 (perihelion half: Mars closer to the Sun)   -> warmer at Gale
     Ls per sol comes from the REMS team's daily weather feed (same source as the NASA
     "Mars weather" page), downloaded once.
  4. For each half and each hour it stores the MEDIAN over all sampled sols, plus the 10th and 90th
     percentile so the app can show how much it varies.

HOW TO RUN:
  python scripts/05_prepare_rems.py            (downloads; per-sol results are cached in data/raw/)
  Takes ~20-40 minutes the first time (each sol file is 5-12 MB). Re-runs use the cache.

SOURCES:
  Data:  Gómez-Elvira, J. et al., MSL REMS Modeled Data (MODRDR), NASA PDS Atmospheres Node,
         dataset MSL-M-REMS-5-MODRDR-V1.0, https://atmos.nmsu.edu/PDS/data/mslrem_1001/
  Ls:    REMS team daily summary feed (Centro de Astrobiologia, CAB/INTA-CSIC),
         https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json
  Instrument paper: Gómez-Elvira, J. et al. (2012), "REMS: The Environmental Sensor Suite for the
         Mars Science Laboratory Rover", Space Science Reviews 170, 583-640,
         doi:10.1007/s11214-012-9921-1
  Context review (not the data source): Martínez, G. M. et al. (2017), "The Modern Near-Surface
         Martian Climate: A Review of In-situ Meteorological Data from Viking to Curiosity",
         Space Science Reviews 212, 295-338, doi:10.1007/s11214-017-0360-x

NOTES:
  - Air temperature, not ground temperature (ground swings wider) and not inside a suit.
  - Hours are LTST (sun-based local time), the clock REMS uses for its local-time column.
"""

import json
import os
import re
import statistics
import sys
import time
import urllib.request

PDS_ROOT = 'https://atmos.nmsu.edu/PDS/data/mslrem_1001/DATA/'
FEED_URL = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json'
SOL_STEP = 25                 # sample one sol about every 25 sols (keeps download size sane)
MIN_HOURS_PER_SOL = 20        # use a sol only if REMS covered at least 20 of the 24 hours
MIN_SAMPLES_PER_HOUR = 30     # REMS samples at 1 Hz; need >= 30 readings to trust an hour
AMBIENT_TEMP_COL = 15         # 0-based column index of AMBIENT_TEMP in MODRDR (MODRDR6.FMT col 16)
LTST_COL = 2                  # 0-based column index of LTST ("SSSSS HH:MM:SS")
VALID_K = (120.0, 320.0)      # physically possible air temperature range at Gale, Kelvin

CACHE_DIR = os.path.join('data', 'raw', 'rems_cache')
OUT_FILE = os.path.join('src', 'data', 'rems-temps.json')
UA = {'User-Agent': 'marswalk-data-prep/1.0'}


def fetch(url, timeout=180, tries=4):
    """Downloads a URL and returns bytes. Retries a few times on network errors."""
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except Exception as err:  # network hiccups are common on the PDS server
            if attempt == tries - 1:
                raise
            print(f'   retry {attempt + 1} for {url}: {err}')
            time.sleep(5 * (attempt + 1))


def list_links(url, pattern):
    """Returns the href values in a PDS directory listing that match a regex."""
    html = fetch(url, timeout=60).decode('utf-8', 'replace')
    return sorted(set(re.findall(r'href="(' + pattern + r')"', html)))


def ls_by_sol():
    """Returns {sol: Ls in degrees} from the REMS daily feed."""
    data = json.loads(fetch(FEED_URL))
    out = {}
    for row in data['soles']:
        try:
            out[int(row['sol'])] = float(row['ls'])
        except (KeyError, ValueError):
            pass
    return out


def hourly_medians_for_sol(text):
    """Parses one MODRDR table. Returns {LTST hour: median air temp in C} for well-covered hours."""
    buckets = {}
    for line in text.splitlines():
        parts = line.split(',')
        if len(parts) <= AMBIENT_TEMP_COL:
            continue
        try:
            kelvin = float(parts[AMBIENT_TEMP_COL])
            hour = int(parts[LTST_COL].strip().strip('"').split()[1].split(':')[0])
        except (ValueError, IndexError):
            continue
        if VALID_K[0] < kelvin < VALID_K[1] and 0 <= hour <= 23:
            buckets.setdefault(hour, []).append(kelvin - 273.15)
    return {h: statistics.median(v) for h, v in buckets.items() if len(v) >= MIN_SAMPLES_PER_HOUR}


def process_sol(range_dir, sol_dir):
    """Downloads one sol (or reads the cache) and returns its hourly medians, or None."""
    sol = int(sol_dir[3:8])
    cache = os.path.join(CACHE_DIR, f'{sol:05d}.json')
    if os.path.exists(cache):
        with open(cache) as f:
            return sol, {int(k): v for k, v in json.load(f).items()}
    files = list_links(PDS_ROOT + range_dir + sol_dir, r'RME_[0-9A-Z_]*RMD[0-9A-Z_]*\.TAB')
    if not files:
        return sol, None
    text = fetch(PDS_ROOT + range_dir + sol_dir + files[-1]).decode('ascii', 'replace')
    med = hourly_medians_for_sol(text)
    with open(cache, 'w') as f:
        json.dump(med, f)
    return sol, med


def pct(values, p):
    """Simple percentile (nearest-rank) of a list."""
    s = sorted(values)
    return s[max(0, min(len(s) - 1, round(p / 100 * (len(s) - 1))))]


def main():
    os.makedirs(CACHE_DIR, exist_ok=True)
    print('[05] Loading Ls for every sol from the REMS daily feed...')
    ls_of = ls_by_sol()
    print(f'[05] {len(ls_of)} sols with Ls')

    ranges = list_links(PDS_ROOT, r'SOL_\d{5}_\d{5}/')
    halves = {'northern_spring_summer': {}, 'northern_autumn_winter': {}}
    used = {'northern_spring_summer': [], 'northern_autumn_winter': []}
    next_sol = 0
    for rng in ranges:
        sol_dirs = list_links(PDS_ROOT + rng, r'SOL\d{5}/')
        for sd in sol_dirs:
            sol = int(sd[3:8])
            if sol < next_sol or sol not in ls_of:
                continue
            # Prefer a sol that is already in the cache anywhere in this 25-sol window (fast re-runs).
            cached = sorted(int(f[:5]) for f in os.listdir(CACHE_DIR) if f.endswith('.json'))
            in_window = [c for c in cached if sol <= c < next_sol + SOL_STEP and c in ls_of]
            if in_window and in_window[0] != sol:
                c = in_window[0]
                if c not in [int(d[3:8]) for d in sol_dirs]:
                    in_window = []
                else:
                    sd, sol = f'SOL{c:05d}/', c
            try:
                sol, med = process_sol(rng, sd)
            except Exception as err:
                print(f'   sol {sol}: skipped ({err})')
                continue
            if not med or len(med) < MIN_HOURS_PER_SOL:
                continue  # partial day: try the next sol
            key = 'northern_spring_summer' if ls_of[sol] < 180 else 'northern_autumn_winter'
            for h, t in med.items():
                halves[key].setdefault(h, []).append(t)
            used[key].append(sol)
            next_sol = sol + SOL_STEP
            print(f'   sol {sol:5d}  Ls {ls_of[sol]:5.1f}  -> {key}  ({len(med)} h)')

    seasons_out = {}
    meta = {
        'northern_spring_summer': ('Ls 0-180', 'Aphelion half of the Mars year (Mars farther from the Sun). '
                                   'At Gale (4.6 deg S) this is the COOLER half: southern autumn and winter.'),
        'northern_autumn_winter': ('Ls 180-360', 'Perihelion half of the Mars year (Mars closer to the Sun, '
                                   'perihelion at Ls ~251). At Gale this is the WARMER half: southern spring and summer.'),
    }
    for key, hours in halves.items():
        if len(hours) < 24:
            sys.exit(f'[05] FAIL: {key} only has {len(hours)} hours of data')
        med = [round(statistics.median(hours[h]), 1) for h in range(24)]
        p10 = [round(pct(hours[h], 10), 1) for h in range(24)]
        p90 = [round(pct(hours[h], 90), 1) for h in range(24)]
        sols = sorted(used[key])
        seasons_out[key] = {
            'lsSeason': meta[key][0],
            'description': meta[key][1],
            'localHours': list(range(24)),
            'clock': 'LTST',
            'airTempC': med,
            'airTempP10C': p10,
            'airTempP90C': p90,
            'solsUsed': len(sols),
            'solRange': [sols[0], sols[-1]],
        }
        peak = max(range(24), key=lambda h: med[h])
        low = min(range(24), key=lambda h: med[h])
        print(f'[05] {key}: {len(sols)} sols, peak {med[peak]} C at {peak}:00 LTST, '
              f'low {med[low]} C at {low}:00 LTST')

    out = {
        'source': 'Curiosity REMS ambient air temperature, MODRDR product (NASA PDS Atmospheres Node, '
                  'MSL-M-REMS-5-MODRDR-V1.0; Gomez-Elvira et al. 2012, Space Sci. Rev. 170)',
        'sourceUrl': 'https://atmos.nmsu.edu/PDS/data/mslrem_1001/',
        'unit': 'Celsius',
        'clock': 'LTST (local true solar time at Gale)',
        'sensor': 'REMS air temperature, ~1.6 m above the ground, Curiosity rover',
        'method': f'Median of hourly medians over {sum(len(v) for v in used.values())} full sols '
                  f'(one sol about every {SOL_STEP}), split by Ls. P10/P90 show sol-to-sol spread.',
        'note': 'Measured air temperature at Gale (median by hour). Ground swings wider. '
                'Inside-suit temperatures are not modeled.',
        'seasons': seasons_out,
    }
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)
    print(f'[05] Saved {OUT_FILE}')


if __name__ == '__main__':
    main()
