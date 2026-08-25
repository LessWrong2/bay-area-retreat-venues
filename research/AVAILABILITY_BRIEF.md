# Independent weekend-availability verification brief (Aug 25, 2026)

You are INDEPENDENTLY re-verifying weekend availability for Northern California retreat
venues. A previous pass produced numbers the user does not trust.

## HARD RULE — do not contaminate yourself

You must NOT read any existing availability data. Specifically:
- Do NOT open, cat, grep, or otherwise read any `research/*.pricing.json` file.
- Do NOT open `data.js`, `app.js`, or the built site.
- Do NOT read `research/PRICING_BRIEF.md`.

You MAY read `research/venues-base.json` and `research/<venue-id>.json` (address,
website, phone, capacity, coordinates) — those contain no availability claims.
Everything else must come from the live web, found by you.

## The group

~60 people, Friday-to-Sunday, whole-site or near-whole-site use, on-site lodging.
The question for each weekend is: **could a 60-person group book this venue Fri-Sun?**

## The ten weekends (Fri-Sun), all 2026

2026-08-28, 2026-09-04 (Labor Day weekend), 2026-09-11, 2026-09-18, 2026-09-25,
2026-10-02, 2026-10-09, 2026-10-16, 2026-10-23, 2026-10-30 (Halloween weekend).

Use the Friday date as the weekend's id. Produce exactly ten entries per venue, in this
order.

## Five-point status scale

- `definitely_available` — direct, dated public evidence the site is open and bookable
  for a group that weekend: a group/rental availability calendar showing the dates open,
  a booking engine returning enough rooms for both Fri and Sat nights, or an explicit
  published statement. Quote it.
- `probably_available` — strong indirect evidence: the venue's own event calendar covers
  that period and shows nothing that weekend; the season is open; individual rooms
  bookable but a 60-person buyout is unconfirmed. Say why it is only "probably".
- `unknown` — the public web does not say. This is the CORRECT and expected answer for
  most venues most weekends. Never infer availability from absence of information.
- `probably_not_available` — indirect evidence against: a program or event that likely
  occupies much of the site, "limited availability", a weekend inside a busy season with
  a partial hold, a policy that likely excludes it.
- `definitely_not_available` — direct dated evidence: a published event/festival/wedding/
  program occupying the site, "sold out", seasonal closure, booking engine empty for both
  nights, or a policy that flatly excludes the date (e.g. school-year-only bookings).

## Evidence requirements (this is the point of the exercise)

Every weekend entry needs:
- `evidence_quote` — the **verbatim text from the source page** that supports the status,
  copied exactly, 5-40 words, no ellipsis in the middle, no paraphrase. It must appear
  literally in the page you fetched, because the UI will use it to scroll the page to
  that spot. If the evidence is a calendar widget with no quotable prose, use the nearest
  literal on-page string (e.g. a heading, a date label, an event title) and say so in
  `evidence`. If there is genuinely no quotable text, set `evidence_quote` to null.
- `evidence` — one sentence in your own words explaining what the quote shows.
- `source_url` — a page you actually fetched with HTTP 200. Never construct or guess a URL.

For `unknown` entries the quote may be null and `source_url` should be the venue page you
checked (e.g. their calendar or booking page) so the user can see you looked.

## Where to look

Venue events/calendar/programs pages; "book now" / reservation engines (query Fri->Sun,
2 adults, both nights); rental/group-availability pages and PDFs; wedding and event
listings; festival and third-party retreat-leader sites that name the venue; Google
`site:<domain> 2026 October`, `"<venue name>" retreat October 2026`; Facebook/Instagram
event posts. UCCR, YMCA/NatureBridge, church camps and Zen centers often publish group
availability calendars or PDFs.

## Tools

- `curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"` — several sites 403 short user-agents. WebFetch and WebSearch are fine too.
- Booking engines are JavaScript. If you need a real browser, create YOUR OWN tab with
  `mcp__Claude_Browser__tabs_create` and pass that `tabId` on every call; other agents
  share the browser, so never act on a tab you did not create, and close it when done.
  Prefer `get_page_text` / `read_page` over screenshots.
- Do not enter personal data, do not complete a reservation, do not phone anyone, do not
  submit any form beyond a date search, and do not accept cookie banners beyond what is
  needed to read availability.
- Keep scratch files under the session scratchpad, not in the repo.

## Output

Write `research/<venue-id>.availability.json` — valid JSON, no comments, no trailing commas:

{
  "id": "<venue-id>",
  "checked_on": "2026-08-25",
  "method": "one paragraph: which pages and searches you actually used, and what the venue does or does not publish",
  "booking_policy": "season, minimums, guest-type restrictions, buyout rules, anything that constrains a 60-person Fri-Sun booking",
  "weekends": [
    {
      "weekend": "2026-08-28",
      "status": "unknown",
      "evidence": "one sentence in your words",
      "evidence_quote": "verbatim text from the page, or null",
      "source_url": "https://...",
      "source_label": "short human label for the page"
    }
  ],
  "sources": ["every URL you relied on"]
}

`status` must be one of the five values above. `weekends` must have exactly ten entries,
in the date order listed above.

Be thorough and honest. A file that is mostly `unknown` with real evidence of having
looked is far more valuable than confident guesses. Your final message: 3-6 plain-text
lines per venue — status distribution, the strongest piece of evidence found, and
anything surprising. Do not paste JSON into the final message.
