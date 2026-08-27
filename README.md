# Retreat venues — Bay Area and the fly-in West

An interactive map of retreat and conference venues for a ~60-person gathering (Oct 16–18, 2026), in two lists: Northern California venues within driving range of San Francisco, and venues across the US West that sit close to an airport with a nonstop from SFO or OAK. Venue list on the left (with region, tier and weekend-availability filters), map with photo pins in the middle, and a detail panel with photos, capacity, approximate weekend cost, per-weekend availability evidence, and contact links on the right.

Live: https://lesswrong2.github.io/bay-area-retreat-venues/

Static site — no build step needed to view. Open `index.html` or serve the folder (`node serve.mjs`).

## Where the data comes from

- **The Google Sheet is the source of truth for the venue table** (tier, capacity, contacts, "why it's on the list", "watch out for"). `python3 sync_sheet.py` downloads it as CSV and regenerates `research/venues-base.json`. Sheet rows map to venue ids via `research/sheet_map.json`; `research/overrides.json` holds corrections and site-only fields (subtitles, research notes, the NatureBridge re-pointing) that are applied on top of the sheet values.
- `research/extra-venues.json` — venues that are not in the sheet at all (the fly-in West list). Same shape as a sheet row; `sync_sheet.py` appends them after the sheet rows, with `overrides.json` applied on top. These may also set `region` (`"west"` puts a venue in the fly-in list), `airport` (code, drive time and distance, measured with OSRM from the terminal to the property's coordinates) and `flights` (the nonstop from SFO or OAK).
- `research/<id>.json` — per-venue research: address, coordinates, image provenance.
- `research/<id>.pricing.json` — published rates, an approximate weekend cost for 60 people × 2 nights (linked to its source page), and weekend-by-weekend availability evidence.
- `research/raw/<id>/` — original downloaded photos (not committed). A venue with no raw directory keeps the images already listed in `data.js`, so `build.py` is safe to run on a fresh checkout.

Rebuild after changing any of the above:

```bash
python3 sync_sheet.py   # optional: pull the latest sheet
python3 build.py        # resize photos into images/, write data.js
```

Push to `main` and GitHub Pages redeploys.

Photos belong to the respective venues (or are Wikimedia Commons images) and are credited in each venue's panel. Map tiles © OpenStreetMap contributors, © CARTO.
