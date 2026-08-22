# Bay Area retreat venues

An interactive map of Northern California retreat and conference venues for a ~60-person gathering (Oct 16–18, 2026). Venue list on the left, map with photo pins in the middle, and a detail panel with photos, capacity, and contact links on the right.

Static site — no build step needed to view. Open `index.html` or serve the folder (`node serve.mjs`).

## Updating data

- `research/venues-base.json` — the venue table (from the source spreadsheet).
- `research/<id>.json` — per-venue research: address, coordinates, and image provenance.
- `research/raw/<id>/` — original downloaded photos (not committed).
- `python3 build.py` — merges the above, resizes photos into `images/`, and writes `data.js`.

Photos belong to the respective venues (or are Wikimedia Commons images) and are credited in each venue's panel. Map tiles © OpenStreetMap contributors, © CARTO.
