# Black Hills regional business and service providers — foundation

## Objective

A generally useful places layer for *every* business/service category in and
around Rapid City and the wider Black Hills. A user can zoom in, search by
name/trade/provider specialty, filter categories and see places on God's Eye
View's existing Cesium map. This is **not** limited to contractors.

The first stage is the source-agnostic normalization/search contract and
architecture only. No businesses were downloaded or imported in this PR, and
no live layer or commercial API has been activated.

## Initial region

Research envelope: W 105.05°, E 102.65° W, S 43.25°, N 45.00°.
It deliberately includes nearby western South Dakota and Sundance, WY.
**This is a query envelope, not an administrative or cultural boundary.**
Filter extracted data by a reviewed regional polygon later if appropriate.

## Recommended source strategy

1. **Overture Maps Places**: base bulk place catalog. Fetch specific published
   release from the official dataset, regional spatial-filtered extraction,
   license assessment for each imported dataset and attribution. Inspect actual
   schema and confidence/category availability before implementing import.
2. **OpenStreetMap**: supplemental places, especially small settlements and
   mapped amenities. If combining/mixing with Overture, assess ODbL share-alike
   obligations and preserve independent source attribution.
3. **Google Places API (optional, later)**: user-initiated fresh details or
   lookup ONLY after cost controls, Maps/Places platform terms, attribution,
   map compatibility, and cache/storage restrictions are reviewed. Do not use
   Google to build a permanent independent stored business database. No API
   key or billed calls are introduced by this PR.
4. **Government portals**: official license/registration checks where provided
   and legally reusable. Merely appearing in a directory must never imply
   an active contractor license or medical credential.

Official docs:
- https://docs.overturemaps.org/guides/places/
- https://docs.overturemaps.org/getting-data/
- https://wiki.openstreetmap.org/wiki/Overpass_API
- https://developers.google.com/maps/documentation/places/web-service/policies

## Index and UI plan

- Incremental release-pinned ingest to a local DuckDB/SQLite spatial index;
  country/region clip, record counts, duplicates and source provenance reports.
- Normalization of stable source IDs, names, typed categories, locality,
  address (when licensed), phone/website (when available), and coordinates.
- Do not fabricate hours, phone numbers, ratings or open/closed status.
  Clearly label stale, incomplete and unverified records.
- Resolve duplicates conservatively: proximity plus name/address and source IDs;
  never conflate unrelated contractors sharing an office address.
- Add a viewport-bounded, paginated provider endpoint; return only results in
  the requested bbox; support limits, category/subcategory and text queries.
- DataLayerManager registration and layerState token only when a real tested
  source is available. Group thousands of businesses with clustering/LOD,
  zoom thresholds, user search and detail panels. Default OFF for performance.
- Mobile-friendly search; category filters include trades, healthcare, retail,
  dining, lodging, automotive, industry, agriculture, government and more.
- Track imported release date, last checked, confidence and source attribution.
- Check terms of individual source datasets before redistribution, especially
  if God’s Eye View is used commercially.

## Acceptance tests for implementation

- Measure actual coverage for Rapid City, Spearfish, Deadwood, Custer,
  Hill City, Sturgis, Belle Fourche, Hot Springs, Box Elder and Sundance.
- Hand-check representative HVAC, electrical, plumbing and excavation firms
  against independently available listings. Record missing and duplicate rates.
- Verify page sizes and map frame times at dense Rapid City downtown zoom.
- Never exceed optional Google budget caps or persist prohibited provider data.
- Test fail-closed API and clean layer teardown; do not expose private notes
  or personal contact information on public views.
- Run `node --test src/data/blackHillsBusinessCatalog.test.mjs`,
  full tests and build before ready-to-merge.

## Related drafts

PR #2 historic rail alignments; PR #3 historic drone archive; PR #4 private
media index; PR #5 expeditions; later regional GIS and topo work.
