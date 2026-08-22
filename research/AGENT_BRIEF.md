# Venue research brief

You are researching a set of retreat venues in Northern California for a map website. For EACH venue assigned to you, produce:

## 1. Location
- The street address of the venue (as published on its website or Google/Wikipedia).
- Precise lat/lng of the actual property (not the town center). Methods, in order of preference:
  a. Geocode the street address with Nominatim:  
     `curl -s -A "venue-map-research/1.0 (contact: raemon777@gmail.com)" "https://nominatim.openstreetmap.org/search?format=json&limit=3&q=<url-encoded address>"`
     (sleep 1 second between Nominatim calls — it is rate limited).
  b. Wikipedia / Wikidata coordinates if the venue has an article (e.g. Asilomar, Marconi, Mendocino Woodlands, Harbin, Wilbur, Hidden Villa, Green Gulch, Sea Ranch Lodge).
  c. A Google Maps link on the venue's own website (look for `maps.google.com/?q=` / `@lat,lng` / `!3d..!4d..` in the HTML).
  d. If all else fails, geocode the nearest road/landmark and note lower confidence.
- SANITY CHECK the result: it must be in the stated town/area (California, roughly lat 36.5–39.5, lng -123.9 to -121.0). If Nominatim returns a town centroid instead of the property, say so and try another method.

## 2. Photos (this is the important part — be thorough and CORRECT)
Find 4–6 high-quality photographs that genuinely show THIS venue (buildings, grounds, interiors, landscape). Prefer, in order:
  1. The venue's own official website (home page, gallery, "about", "facilities", "weddings/groups" pages). Fetch raw HTML with `curl -sL -A "Mozilla/5.0" <url>` and grep for image URLs: `grep -oE '(https?:)?//[^"'"'"' )]+\.(jpe?g|png|webp)[^"'"'"' )]*'`, also check `srcset`, `data-src`, `data-image`, `og:image`, and `background-image:` CSS. Squarespace sites: image URLs look like `images.squarespace-cdn.com/...`; strip `?format=...` and append `?format=2500w` for full size. Wix sites: `static.wixstatic.com/media/...` — take the part before `/v1/` for the original. WordPress: strip `-300x200` style suffixes for full size.
  2. Wikimedia Commons (search `https://commons.wikimedia.org/w/index.php?search=<name>&ns6=1`) for landmarks — note the license + author.
  3. Reputable third-party coverage (press, travel sites) only if the official site has nothing usable.
DO NOT use: logos, icons, maps, stock photos that are not of the venue, photos of a different venue with a similar name, tiny images (<700px wide), or heavily text-overlaid graphics.

Download each candidate to `research/raw/<venue-id>/NN.<ext>` (NN = 01, 02, ...) using `curl -sL -A "Mozilla/5.0" -o <file> <url>`. Then VERIFY each file:
  - `file <path>` must report an actual image (JPEG/PNG/WebP), not HTML.
  - `sips -g pixelWidth -g pixelHeight <path>` must show width >= 700px (ideally >= 1200px).
  - Use the Read tool on the image to LOOK AT IT and confirm it shows the venue (a building / landscape / interior that matches the venue's description). Delete anything that is a logo, a person-only portrait, a duplicate, or clearly not this venue.
Aim for a mix: one strong establishing/exterior shot first (this becomes the round pin thumbnail — it should have a clear central subject that survives a circular crop), then grounds, interiors, meeting spaces.

## 3. Output
Write `research/<venue-id>.json` (valid JSON, no comments) shaped like:
{
  "id": "<venue-id>",
  "address": "123 Road, Town, CA 95xxx",
  "lat": 38.4123, "lng": -122.9876,
  "geo_method": "nominatim address | wikipedia | site map link | approx",
  "geo_confidence": "high | medium | low",
  "geo_notes": "anything worth knowing",
  "thumb": "01.jpg",
  "images": [
    {"file": "01.jpg", "source_url": "https://...original image url", "page_url": "https://...page it came from", "credit": "Venue Name (official site)" , "caption": "short caption, e.g. 'Main lodge exterior'", "width": 2000, "height": 1333}
  ],
  "notes": "anything notable you learned (renovations, closures, name changes, that the site was down, etc.)"
}
Your final message should be a short plain-text summary per venue: how many images kept, geo confidence, and any problems. Do not paste JSON in the final message — it goes in the files.

Be persistent: if a site blocks curl (403), try the browser tools or WebFetch for the page, or try the site's sitemap.xml, or a Google search for `site:<domain> jpg`. If a venue's official site truly has no usable images, fall back to Wikimedia Commons / press coverage and say so in notes. Never fabricate URLs; every source_url must have been downloaded successfully.
