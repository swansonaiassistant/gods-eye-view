# Rapid City and Pennington County public calls for service

Verified against the public sources on 2026-11-19. These are public call-log entries, **not confirmed crimes or live dispatch**. The reported street and nearest intersection do not establish an exact call site.

## Rapid City Police

- [Official department](https://www.rcgov.org/departments/police-department.html) · [public Baserow call log](https://baserow.io/public/grid/d9YEH8ejNFzMkpXo8SYjydyLrgx8kLD1u0Bh2C1O5iU)
- Public metadata: `https://api.baserow.io/api/database/views/d9YEH8ejNFzMkpXo8SYjydyLrgx8kLD1u0Bh2C1O5iU/public/info/`. Its six field labels are CFS Date/Time, Street Name, Nearest Intersection, CFS #, Call Type, and Disposition. The public rows API returns `field_<id>` keys despite `user_field_names=true`; the adapter maps IDs from the public metadata at refresh time.
- Public rows: `https://api.baserow.io/api/database/views/grid/d9YEH8ejNFzMkpXo8SYjydyLrgx8kLD1u0Bh2C1O5iU/public/rows/`. `order_by=-field_1079247` returned newest reported times first during verification. The endpoint paginates at 200 rows; the app deliberately loads at most five pages (1,000 recent rows) per refresh and shows both loaded count and source total. It constructs HTTPS page URLs locally rather than following Baserow's HTTP `next` URL.
- GET and OPTIONS with `Origin: http://localhost:4173` returned `Access-Control-Allow-Origin: *`. The app refreshes automatically on its four-hour layer cadence, and the list has manual refresh. A failed page or changed schema leaves the last good snapshot visible as stale, with an error.

## Pennington County Sheriff

The [official call-log page](https://www.pennco.org/law_public_safety/sheriffs_office/about/call_for_service_log.php) says its log is unavailable because of a cybersecurity incident. Its iframe also timed out during verification. The county layer is independently selectable and explicitly unavailable; it publishes **no incident records**. The page describes a five-minute publication cadence for when its service returns, but that cadence does not mean current data is available. Public ingestion requires a restored, verified source and parser before it can be enabled.

## List, map, and time limitations

The public call-log panel lists all loaded calls, including unlocated rows. It has source tabs, text search, reported-age filters, manual Rapid City refresh, independent layer controls, source links, and a location caveat. Each row shows its **reported time** in Mountain Time; the panel separately shows **retrieval time**. The list renders at most 80 matching entries at once; narrow filters to see others in the loaded window. Older archive entries beyond the newest 1,000 are not ingested.

A map pin appears automatically only for an explicit published decimal coordinate in the local area. A user may request a Google Maps lookup for a published nearest intersection; this is a potentially billable lookup, never automatic. A result is accepted only when Google classifies it as an intersection within the local area. The pin is marked as a **nearest-intersection proxy**, not the incident location; the call may be some distance away. If a lookup is unavailable or ambiguous, the call remains list-only. No private dispatch, simulated incidents, or invented coordinates are used.
