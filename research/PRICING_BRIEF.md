# Pricing + availability research brief

Context: a ~60-person gathering wants a venue for a Friday–Sunday weekend. Target weekend is **Fri Oct 16 – Sun Oct 18, 2026**, but they also want to know about every weekend between now (Aug 21, 2026) and then. For EACH venue assigned to you, research two things and write `research/<venue-id>.pricing.json`. Base venue data (website, booking page, phone, capacity) is in `research/venues-base.json`; earlier research notes are in `research/<venue-id>.json`.

## 1. Approximate cost of a weekend reservation
Find the venue's PUBLISHED pricing: per-person per-night lodging rates, meal plans, day-use / meeting-room / facility fees, exclusive-use minimums, site-rental flat fees, taxes/service charges, deposits. Look on the official site (rates / pricing / host-your-group / weddings / FAQ / PDF rate sheets — search `site:<domain> rates`, `site:<domain> pricing`, `site:<domain> pdf`), then reputable third parties only if the venue publishes nothing (wedding directories' "starting at", Peerspace/Giggster listings, recent press, past event tickets that reveal per-person venue cost).

Then compute an approximate total for **60 people, 2 nights (Fri+Sat), with meals when the venue serves them**. Be explicit about the arithmetic in `basis`. Give a low and high estimate in USD. If the venue only quotes on request, set `"mode": "quote"` and still record any hint you find (with its own source and low confidence).

**The cost must link to the page where the numbers come from.** `source_url` must be a page you actually fetched (HTTP 200) and saw the rates on. Never construct or guess URLs. If the rates are in a PDF, link the PDF.

## 2. Weekend-by-weekend availability
The nine weekends (Fri–Sun): 2026-08-21, 2026-08-28, 2026-09-04 (Labor Day weekend), 2026-09-11, 2026-09-18, 2026-09-25, 2026-10-02, 2026-10-09, 2026-10-16.

For each weekend record a status:
- `available` — public evidence shows the dates open/bookable (an availability calendar with the dates open, a booking engine returning rooms for both Fri and Sat night, a group-booking calendar, or an explicit statement). Say in `evidence` WHAT is available (e.g. "individual hotel rooms bookable" vs "group buyout calendar shows open"); individual-room availability is NOT the same as a 60-person buyout — say so.
- `booked` — public evidence the venue is occupied or closed that weekend (event calendar shows a festival/wedding/program that uses the whole site, "sold out", seasonal closure, booking engine shows nothing for either night, school-year policy excludes it).
- `partial` — something is available but clearly not enough for 60 (a few rooms, one building, a program occupying part of the site).
- `unknown` — no public evidence either way.
Each status needs `evidence` (one sentence) and `source_url` (a page you fetched). Also capture general booking policy in `availability_notes` (e.g. "only books Fri–Sun during the school year", "rental season starts mid-October", "2-night minimum", "requires nonprofit status", "no group bookings for 2026").

Where to look: the venue's events/calendar/programs page (a retreat center running its own program that weekend is booked), "book now"/reservation engines (try querying Fri→Sun for 2 adults to see whether rooms exist), wedding/event listings, festival sites that name the venue, Google "site:<domain> 2026 October", and social posts. UCCR, YMCA/NatureBridge, church camps and Zen centers often publish group calendars or availability PDFs.

### Tools
- Fetch pages with `curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"` (several of these sites 403 a short User-Agent). WebFetch is also fine for reading.
- Booking engines are usually JavaScript. If you need a real browser, create YOUR OWN tab with `mcp__Claude_Browser__tabs_create` and pass that `tabId` on every call; other agents share the browser, so never act on a tab you did not create, and close it when done. Do not enter any personal data, do not complete a reservation, do not accept cookie banners beyond what is needed to read availability. Note the pane sometimes renders hidden; prefer `get_page_text`/`read_page` over screenshots.
- Nominatim is not needed. Keep scratch files in a subfolder named after your venue ids to avoid collisions with other agents.

## Output: `research/<venue-id>.pricing.json`
{
  "id": "<venue-id>",
  "checked_on": "2026-08-21",
  "cost": {
    "mode": "published" | "quote",
    "low": 24000, "high": 31000,            // USD totals for 60 people x 2 nights (omit if mode=quote and no hint)
    "summary": "$24k–31k",                   // short label for the UI
    "basis": "60 × $135–270/person/night × 2 nights + $22 × 6 meals … + 14% occupancy tax",
    "per_person": "$400–520 per person for the weekend incl. meals",   // optional
    "source_url": "https://…",               // REQUIRED: page showing the numbers (or the RFP page if mode=quote)
    "source_label": "Westerbeke rates page",
    "confidence": "high" | "medium" | "low",
    "hint": "Third-party listing says corporate retreats start at $X",   // optional, mode=quote only
    "hint_url": "https://…"                  // optional
  },
  "availability_notes": "general policy / season / minimums",
  "availability": [
    {"weekend": "2026-08-21", "status": "unknown", "evidence": "…", "source_url": "https://…"},
    … one entry for each of the nine weekends, in order …
  ],
  "sources": ["every URL you relied on"]
}
Valid JSON, no comments, no trailing commas. Your final message: a short plain-text summary per venue (cost found or not, how many weekends have real evidence, anything surprising). Do not paste JSON into the final message.

Be thorough but honest: `unknown` is the correct answer when the public web does not say. Never infer availability from the absence of information.
