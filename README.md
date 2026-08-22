# Bay Area retreat venues

An interactive map of Northern California retreat and conference venues for a ~60-person gathering (Oct 16–18, 2026). Venue list on the left (with a weekend-availability filter), map with photo pins in the middle, and a detail panel with photos, capacity, approximate weekend cost, per-weekend availability evidence, and contact links on the right.

Live: https://raemon.github.io/bay-area-retreat-venues/

Static site — no build step needed to view. Open `index.html` or serve the folder (`node serve.mjs`).

## Where the data comes from

- **The Google Sheet is the source of truth for the venue table** (tier, capacity, contacts, "why it's on the list", "watch out for"). `python3 sync_sheet.py` downloads it as CSV and regenerates `research/venues-base.json`. Sheet rows map to venue ids via `research/sheet_map.json`; `research/overrides.json` holds corrections and site-only fields (subtitles, research notes, the NatureBridge re-pointing) that are applied on top of the sheet values.
- `research/<id>.json` — per-venue research: address, coordinates, image provenance.
- `research/<id>.pricing.json` — published rates, an approximate weekend cost for 60 people × 2 nights (linked to its source page), and weekend-by-weekend availability evidence.
- `research/raw/<id>/` — original downloaded photos (not committed).

Rebuild after changing any of the above:

```bash
python3 sync_sheet.py   # optional: pull the latest sheet
python3 build.py        # resize photos into images/, write data.js
```

Push to `main` and GitHub Pages redeploys.

Photos belong to the respective venues (or are Wikimedia Commons images) and are credited in each venue's panel. Map tiles © OpenStreetMap contributors, © CARTO.
