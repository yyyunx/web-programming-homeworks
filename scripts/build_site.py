#!/usr/bin/env python3
"""Build static Pages files and fetch the MOENV public dataset preview (no API key)."""
import argparse
import datetime as dt
import json
import pathlib
import shutil
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
PROJECTS = ["cow-game", "cow-run", "to-do-list", "sticky-notes", "information-board",
            "real-time-aqi-map", "english-listening-speaking"]
SOURCE = "https://data.moenv.gov.tw/dataset/detail/AQX_P_432"
PREVIEW = "https://data.moenv.gov.tw/api/frontstage/datastore.search"
RESOURCE_ID = "8ff027dc-2da2-42e8-85de-78ac3faf470e"


def fetch_aqi():
    # This is the same public read-only POST used by the official dataset preview.
    request = urllib.request.Request(
        PREVIEW,
        data=json.dumps({"resource_id": RESOURCE_ID, "limit": 1000, "offset": 0}).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "web-programming-homeworks/1.0"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        result = json.load(response)
    if result.get("success") is not True:
        raise ValueError("MOENV dataset preview did not succeed")
    records = result.get("payload", {}).get("records", [])
    # The dataset has both Chinese and English versions of each station.
    chinese = [r for r in records if any("\u4e00" <= c <= "\u9fff" for c in r.get("county", ""))]
    if not chinese:
        raise ValueError("MOENV preview has no Chinese station records")
    unique = {}
    for record in chinese:
        lat, lon = float(record["latitude"]), float(record["longitude"])
        if not (18 < lat < 28 and 115 < lon < 125) or not record.get("publishtime"):
            raise ValueError("Invalid station location or publication time")
        unique[str(record.get("siteid") or record["sitename"])] = record
    if len(unique) < 50:
        raise ValueError("MOENV dataset is unexpectedly incomplete")
    records = list(unique.values())
    return {"source": SOURCE, "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
            "publishedAt": max(r["publishtime"] for r in records), "records": records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=pathlib.Path, default=ROOT / "_site")
    args = parser.parse_args()
    # Fetch before touching the output, so a failed upstream request cannot publish mock data.
    aqi = fetch_aqi()
    output = args.output.resolve()
    if output == ROOT or ROOT not in output.parents:
        raise ValueError("Build output must be a subdirectory of this repository")
    output.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "index.html", output / "index.html")
    shutil.copy2(ROOT / ".nojekyll", output / ".nojekyll")
    for project in PROJECTS:
        shutil.copytree(ROOT / project, output / project, dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns("data"))
    data_dir = output / "real-time-aqi-map" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "aqi.json").write_text(json.dumps(aqi, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Built {output}: {len(aqi['records'])} official AQI stations, published {aqi['publishedAt']} (Taipei)")


if __name__ == "__main__":
    main()
