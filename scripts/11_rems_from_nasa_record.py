"""
11_rems_from_nasa_record.py — Correct src/data/rems-temps.json using Curiosity's real daily weather record.

WHY THIS EXISTS
  The first version of rems-temps.json (scripts/05_prepare_rems.py) was typed in by eye from published
  figures, and it had the two halves of the Mars year the wrong way round: it called Ls 0-180 the "milder"
  season. Curiosity's own record says the opposite. Gale Crater is SOUTH of the equator, so Ls 0-180 is its
  autumn and winter (cooler days) and Ls 180-360 is its spring and summer (warmer days).

WHAT IT DOES
  1. Downloads the public daily weather record for Curiosity (one row per sol: lowest and highest air
     temperature measured by the REMS instrument).
  2. Averages the daily LOW and daily HIGH for each half of the Mars year.
  3. Keeps the hour-by-hour SHAPE already in rems-temps.json (coldest just before sunrise, warmest early
     afternoon) but stretches it so each season's low and high equal the measured averages.
  4. Writes src/data/rems-temps.json and the copy in data/.

WHAT IS MEASURED AND WHAT IS NOT (say so, never hide)
  - MEASURED: each season's daily low and daily high (averages over thousands of sols).
  - APPROXIMATE: the temperatures at the hours in between. The record has only the daily low and high,
    so the curve between them is a typical shape, not hourly measurements.

SOURCE
  NASA Mars / Centro de Astrobiologia (CSIC-INTA) REMS weather feed for Curiosity:
    https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json
  The feed says it is "intended for outreach purposes only"; the science archive is the NASA PDS REMS dataset.
  Instrument: REMS (Rover Environmental Monitoring Station) on Curiosity, air temperature sensor.

HOW TO RUN
  python3 scripts/11_rems_from_nasa_record.py            (downloads the record)
  python3 scripts/11_rems_from_nasa_record.py file.json  (uses a copy you already downloaded)
"""

import json
import sys
import urllib.request
from pathlib import Path

FEED_URL = "https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json"
ROOT = Path(__file__).parent.parent
TARGETS = [ROOT / "src" / "data" / "rems-temps.json", ROOT / "data" / "rems-temps.json"]
# App keys are kept so no other file has to change. Only the meaning written next to them is corrected.
SEASONS = {
    "northern_spring_summer": dict(lo=0, hi=180, label="Ls 0-180",
        description="Cooler half of the year at Gale Crater (southern autumn and winter; Mars is farthest from the Sun near Ls 71)."),
    "northern_autumn_winter": dict(lo=180, hi=360, label="Ls 180-360",
        description="Warmer half of the year at Gale Crater (southern spring and summer; Mars is closest to the Sun near Ls 251)."),
}


def number(text):
    """Turns a feed value into a number, or None when the rover reported nothing ('--')."""
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def load_record():
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as f:
            return json.load(f)
    request = urllib.request.Request(FEED_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    sols = load_record()["soles"]
    data = json.load(open(TARGETS[0], encoding="utf-8"))
    sol_numbers = [int(s["sol"]) for s in sols if str(s.get("sol", "")).isdigit()]
    print(f"Record: {len(sols)} sols (sol {min(sol_numbers)} to {max(sol_numbers)})")

    for key, season in SEASONS.items():
        highs, lows = [], []
        for s in sols:
            ls, high, low = number(s.get("ls")), number(s.get("max_temp")), number(s.get("min_temp"))
            if ls is None or high is None or low is None or not (season["lo"] <= ls < season["hi"]):
                continue
            highs.append(high)
            lows.append(low)
        mean_high, mean_low = sum(highs) / len(highs), sum(lows) / len(lows)

        # Stretch the existing hourly shape so its lowest point = measured mean low, highest = measured mean high
        old = data["seasons"][key]["airTempC"]
        old_low, old_high = min(old), max(old)
        new = [round(mean_low + (t - old_low) / (old_high - old_low) * (mean_high - mean_low)) for t in old]

        entry = data["seasons"][key]
        entry["lsSeason"] = season["label"]
        entry["description"] = season["description"]
        entry["airTempC"] = new
        entry["dailyHighMeanC"] = round(mean_high, 1)
        entry["dailyLowMeanC"] = round(mean_low, 1)
        entry["solsAveraged"] = len(highs)
        print(f"  {season['label']:10s} {len(highs):4d} sols | mean daily high {mean_high:6.1f} C, mean daily low {mean_low:6.1f} C"
              f" | was {old_high} / {old_low}, now {max(new)} / {min(new)}")

    data["source"] = ("Curiosity REMS daily air temperature record, NASA Mars / Centro de Astrobiologia (CSIC-INTA): "
                      "https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json "
                      f"(sols {min(sol_numbers)}-{max(sol_numbers)})")
    data["sensor"] = "REMS air temperature sensor on Curiosity's mast (about 1.6 m above the ground)"
    data["note"] = ("Each season's daily low and high are MEASURED averages from Curiosity's record. "
                    "The hours in between follow a typical daily shape and are approximate (the record has no hourly values). "
                    "Suit thermal limits are not modeled.")
    for target in TARGETS:
        with open(target, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print("wrote", target)


if __name__ == "__main__":
    main()
