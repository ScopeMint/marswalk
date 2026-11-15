"""
13_prepare_rems_daily.py - Build src/data/rems-daily.json from the REMS team's daily weather report.

WHAT IT DOES (simple version):
  1. Downloads the Curiosity REMS daily report (one record per sol: air and ground temperature
     minimum and maximum, air pressure, a UV category). Cached in data/raw/rems_feed.json.
  2. Puts each sol into one of 12 "Mars months" by its solar longitude Ls (30 degrees each).
  3. For each month it stores the MEDIAN over all sols, plus the 10th and 90th percentile, for:
     air pressure, ground temperature (night minimum, day maximum), air temperature (minimum, maximum),
     and how often each UV category was reported.
  4. Also stores the latest sol in the report, and which quantities the report does NOT carry.

HOW TO RUN:
  python scripts/13_prepare_rems_daily.py          (add --refresh to download the report again)

SOURCE:
  REMS team daily summary (Centro de Astrobiologia, CAB/INTA-CSIC), the same feed behind NASA's
  "Mars weather" page: https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json
  Instrument: Gomez-Elvira, J. et al. (2012), Space Science Reviews 170, 583-640,
  doi:10.1007/s11214-012-9921-1
  The feed says it is "intended for outreach purposes". We use it as context on the Weather page,
  not in any route or safety calculation. The hourly air temperature the planner uses comes from the
  calibrated PDS product instead (scripts/05_prepare_rems.py).

NOTES:
  - Every number written is a median or percentile of real daily reports. Nothing is modelled.
  - Values outside a physically possible range are dropped (see VALID below) and counted.
"""

import json
import os
import sys
import urllib.request

FEED_URL = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json'
CACHE_FILE = os.path.join('data', 'raw', 'rems_feed.json')
OUT_FILE = os.path.join('src', 'data', 'rems-daily.json')
UA = {'User-Agent': 'marswalk-data-prep/1.0'}
MONTH_DEG = 30                                   # one "Mars month" = 30 degrees of Ls
MIN_SOLS_PER_MONTH = 30                          # need at least this many sols to report a month
VALID = {                                        # physically possible ranges at Gale (drop anything outside)
    'pressure': (500.0, 1200.0),                 # Pa
    'min_temp': (-140.0, 40.0), 'max_temp': (-140.0, 40.0),          # deg C, air
    'min_gts_temp': (-140.0, 40.0), 'max_gts_temp': (-140.0, 40.0),  # deg C, ground
}
UV_ORDER = ['Low', 'Moderate', 'High', 'Very_High']
FIELDS = [('pressure', 'pressurePa'), ('min_gts_temp', 'groundMinC'), ('max_gts_temp', 'groundMaxC'),
          ('min_temp', 'airMinC'), ('max_temp', 'airMaxC')]


def load_feed(refresh):
    """Returns the list of per-sol records, from the cache or freshly downloaded."""
    if refresh or not os.path.exists(CACHE_FILE):
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        print('[13] Downloading the REMS daily report...')
        req = urllib.request.Request(FEED_URL, headers=UA)
        with urllib.request.urlopen(req, timeout=180) as r:
            raw = r.read()
        with open(CACHE_FILE, 'wb') as f:
            f.write(raw)
    with open(CACHE_FILE, encoding='utf-8', errors='replace') as f:
        return json.load(f)['soles']


def number(record, key):
    """The value of one field as a float, or None if missing or outside the valid range."""
    try:
        v = float(record[key])
    except (KeyError, TypeError, ValueError):
        return None
    lo, hi = VALID[key]
    return v if lo <= v <= hi else None


def pct(values, p):
    """p-th percentile (0-100) of a list, with linear interpolation between neighbours."""
    s = sorted(values)
    if not s:
        return None
    k = (len(s) - 1) * p / 100.0
    lo = int(k)
    hi = min(lo + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def summary(values, digits):
    """{ p10, median, p90, n } for a list of numbers, or None if the list is too short."""
    if len(values) < MIN_SOLS_PER_MONTH:
        return None
    return {'p10': round(pct(values, 10), digits), 'median': round(pct(values, 50), digits),
            'p90': round(pct(values, 90), digits), 'n': len(values)}


def main():
    sols = load_feed('--refresh' in sys.argv)
    print(f'[13] {len(sols)} sols in the report')

    months = [{'lsFrom': m * MONTH_DEG, 'lsTo': (m + 1) * MONTH_DEG, 'values': {out: [] for _, out in FIELDS},
               'uv': {u: 0 for u in UV_ORDER}} for m in range(360 // MONTH_DEG)]
    dropped = 0
    not_available = {k: 0 for k in ('abs_humidity', 'wind_speed', 'wind_direction')}
    for rec in sols:
        for k in not_available:
            if rec.get(k, '--') not in ('--', '', None):
                not_available[k] += 1
        try:
            ls = float(rec['ls'])
        except (KeyError, TypeError, ValueError):
            continue
        month = months[int(ls % 360) // MONTH_DEG]
        for key, out in FIELDS:
            v = number(rec, key)
            if v is None:
                if rec.get(key, '--') not in ('--', '', None):
                    dropped += 1
                continue
            month['values'][out].append(v)
        uv = rec.get('local_uv_irradiance_index')
        if uv in month['uv']:
            month['uv'][uv] += 1

    out_months = []
    for m in months:
        entry = {'lsFrom': m['lsFrom'], 'lsTo': m['lsTo']}
        for _, out in FIELDS:
            entry[out] = summary(m['values'][out], 0)
        uv_total = sum(m['uv'].values())
        entry['uvSols'] = m['uv'] if uv_total >= MIN_SOLS_PER_MONTH else None
        out_months.append(entry)

    latest = max((r for r in sols if number(r, 'pressure') is not None), key=lambda r: int(r['sol']))
    sol_numbers = [int(r['sol']) for r in sols]
    result = {
        'source': 'REMS team daily weather report for Curiosity at Gale Crater (Centro de Astrobiologia, CAB/INTA-CSIC), '
                  'the feed behind NASA\'s Mars weather page; instrument: Gomez-Elvira et al. 2012, Space Sci. Rev. 170',
        'sourceUrl': FEED_URL,
        'note': 'Medians of the daily reports for each 30-degree Ls "Mars month", with the 10th and 90th percentile. '
                'The feed is an outreach product: shown as context only, not used in any route or safety calculation.',
        'units': {'pressurePa': 'Pa', 'groundMinC': 'deg C (ground, daily minimum)', 'groundMaxC': 'deg C (ground, daily maximum)',
                  'airMinC': 'deg C (air, daily minimum)', 'airMaxC': 'deg C (air, daily maximum)',
                  'uvSols': 'number of sols reported in each UV category'},
        'solRange': [min(sol_numbers), max(sol_numbers)],
        'solsInReport': len(sols),
        'valuesDroppedOutOfRange': dropped,
        'months': out_months,
        'latest': {'sol': int(latest['sol']), 'earthDate': latest['terrestrial_date'], 'ls': float(latest['ls']),
                   'pressurePa': number(latest, 'pressure'), 'groundMinC': number(latest, 'min_gts_temp'),
                   'groundMaxC': number(latest, 'max_gts_temp'), 'uv': latest.get('local_uv_irradiance_index')},
        'notInReport': {'humidity': not_available['abs_humidity'] == 0,
                        'wind': not_available['wind_speed'] == 0 and not_available['wind_direction'] == 0,
                        'solsChecked': len(sols)},
    }

    # Sanity checks before writing (the script stops with a clear message if the data looks wrong)
    full = [m for m in out_months if m['pressurePa'] and m['groundMinC'] and m['groundMaxC']]
    assert len(full) == 12, f'expected 12 months with data, got {len(full)}'
    for m in full:
        assert m['groundMinC']['median'] < m['groundMaxC']['median'], 'ground: night must be colder than day'
        assert m['groundMinC']['median'] <= m['airMinC']['median'] + 5, 'ground night minimum should not be far above air minimum'
        assert 600 <= m['pressurePa']['median'] <= 1000, 'pressure median outside the range REMS reports at Gale'

    with open(OUT_FILE, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(result, f, indent=1)
    lo = min(full, key=lambda m: m['pressurePa']['median'])
    hi = max(full, key=lambda m: m['pressurePa']['median'])
    print(f'[13] Wrote {OUT_FILE} ({os.path.getsize(OUT_FILE) // 1024} KB), sols {result["solRange"][0]}-{result["solRange"][1]}')
    print(f'     Pressure: lowest month Ls {lo["lsFrom"]}-{lo["lsTo"]} = {lo["pressurePa"]["median"]:.0f} Pa, '
          f'highest Ls {hi["lsFrom"]}-{hi["lsTo"]} = {hi["pressurePa"]["median"]:.0f} Pa')
    print(f'     Humidity in report: {not result["notInReport"]["humidity"]} | wind in report: {not result["notInReport"]["wind"]} '
          f'| out-of-range values dropped: {dropped}')


if __name__ == '__main__':
    main()
