# Rapid City / Pennington County calls-for-service (draft)

This is an **initial integration**, not yet a verified live deployment.

- Rapid City Police: [official department page](https://www.rcgov.org/departments/police-department.html), [public Baserow grid](https://baserow.io/public/grid/d9YEH8ejNFzMkpXo8SYjydyLrgx8kLD1u0Bh2C1O5iU). Published update cadence: about four hours. The layer requests public rows through Baserow's published public-grid API. Live CORS support, row field names and response structure **must be verified in a browser**; errors are surfaced instead of silently generating demo calls.
- Pennington County Sheriff: [official call log](https://www.pennco.org/law_public_safety/sheriffs_office/about/call_for_service_log.php). Published update cadence: five minutes. As of 2026-11-19, the county officially reports that its call log is unavailable following a cybersecurity incident. The county layer therefore reports unavailable; it does not invent incident rows.

## Privacy and map limitations

Calls-for-service are not confirmed crimes. Source location text is often just a street or approximate intersection. The adapter displays a globe marker **only when an explicit decimal latitude/longitude pair is actually published** in a field; it never assigns arbitrary coordinates or geocodes to a house. Most rows may therefore be absent from the globe, even if successfully retrieved. The full call count and the positioned count are available in layer statistics.

No login, scraped private dispatch, simulated incidents, or paid API is involved. Refresh timestamps are the time the app fetched a feed, **not** the time an incident occurred.

## Remaining acceptance work before ready-to-merge

1. Verify the Baserow public-grid JSON endpoint from the Windows app, including field names, CORS and pagination.
2. Confirm any official public county data endpoint when restored, then build and test its parser before enabling county records.
3. Build a visible list/inspection UI for non-geocoded rows with manual refresh and age filters; preserve source attribution.
4. Run `npm test` and `npm run build` in a real checkout; run the application with both layers toggled and check source failures.
