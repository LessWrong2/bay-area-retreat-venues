#!/usr/bin/env python3
"""Pull the venue table from the Google Sheet and regenerate research/venues-base.json.

Usage: python3 sync_sheet.py            # downloads the sheet as CSV
       python3 sync_sheet.py file.csv   # or use a local CSV export

Sheet rows are matched to venue ids via research/sheet_map.json; per-venue
corrections and site-only fields (subtitle, note, ...) come from
research/overrides.json and are applied on top of the sheet values.
Venues that are not in the sheet at all live in research/extra-venues.json and
are appended after the sheet rows.
"""
import csv, io, json, os, sys, urllib.request

SHEET_ID = "1Dt9hQCk9xlYLqkk8gv1psWohAWBdsSlAJM2Nk_k589I"
GID = "607008533"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"

ROOT = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.join(ROOT, "research")

COLUMNS = {
    "Tier": "tier", "Venue": "sheet_name", "City / Area": "area", "Drive from SF": "drive",
    "Sleeps on-site": "sleeps", "Meeting capacity": "meeting", "Exclusive buyout?": "buyout",
    "Why it's on the list": "why", "Watch out for": "watch", "Phone": "phone", "Email": "email",
    "Website": "website", "Booking / inquiry page": "booking",
}


def fetch_csv(path=None):
    if path:
        return open(path, newline="", encoding="utf-8").read()
    req = urllib.request.Request(CSV_URL, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8")


def main():
    text = fetch_csv(sys.argv[1] if len(sys.argv) > 1 else None)
    rows = list(csv.DictReader(io.StringIO(text)))
    sheet_map = json.load(open(os.path.join(RESEARCH, "sheet_map.json")))
    overrides = json.load(open(os.path.join(RESEARCH, "overrides.json")))
    out, seen = [], set()
    for row in rows:
        name = (row.get("Venue") or "").strip()
        if not name:
            continue
        ids = sheet_map.get(name)
        if ids is None:
            print(f"! unmapped sheet row: {name!r} — add it to research/sheet_map.json", file=sys.stderr)
            continue
        for vid in ([ids] if isinstance(ids, str) else ids):
            v = {"id": vid, "name": name}
            for col, key in COLUMNS.items():
                val = (row.get(col) or "").strip()
                if key == "sheet_name":
                    continue
                v[key] = "" if val.lower() in ("see site contact form",) else val
            v.update(overrides.get(vid, {}))
            out.append(v)
            seen.add(vid)
    extras_path = os.path.join(RESEARCH, "extra-venues.json")
    extras = json.load(open(extras_path)) if os.path.exists(extras_path) else []
    for v in extras:
        v = dict(v)
        v.update(overrides.get(v["id"], {}))
        out.append(v)
        seen.add(v["id"])

    missing = [vid for vid in overrides if vid not in seen]
    if missing:
        print(f"! overrides exist for ids not in the sheet: {missing}", file=sys.stderr)
    with open(os.path.join(RESEARCH, "venues-base.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"wrote {len(out)} venues from {len(rows)} sheet rows + {len(extras)} extras")


if __name__ == "__main__":
    main()
