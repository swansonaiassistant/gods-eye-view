# Historical topographic map catalog foundation

USGS historical topographic sheets cover *published maps* from 1884–2006, not necessarily the entire region in every year: https://www.usgs.gov/programs/national-geospatial-program/historical-topographic-maps-preserving-past . topoView: https://ngmdb.usgs.gov/topoview/ ; National Map API: https://apps.nationalmap.gov/datasets/ . `src/data/historicalTopoCatalog.js` creates an AOI-limited, paged catalog search and normalizes products. The API's `publicationDate` supplies a sheet's year; `dateCreated` is the later catalog-record creation date and must never label a historical map.

The official TNMAccess endpoint returned 45 matching products for a bounded Rapid City area. Requests with `max=1` and offsets 0 and 1 returned different source IDs; the response allowed browser CORS. One published 1977 Mount Rushmore sheet had a 2018 `dateCreated`, which the regression test preserves as real metadata. All 45 sampled downloads used the public USGS `prd-tnm.s3.amazonaws.com/StagedProducts/Maps/HistoricalTopo/` path; the normalizer accepts only HTTPS links on that path. Paging is capped at 500 items per request and 10,000 offset; a future UI must report partial coverage if a catalog search reaches that limit. No map files are committed or rendered by this PR.

The [USGS copyright FAQ](https://www.usgs.gov/faqs/are-usgs-topographic-maps-copyrighted) says historical USGS topographic maps are public domain and requests source acknowledgement. Next: discover quadrangle extents, editions and dates; transform downloadable georeferenced raster assets into Cesium imagery with opacity slider and timeline. Keep historic sheet date separate from the date of an event and distinguish documented railroad geometry from speculative reconstructions. Coordinate with existing railway/drone PRs.

## Merge acceptance

For this catalog foundation: verify the bounded source response, pagination, publication-year handling, safe download links, source attribution, unit tests, and build. Browser imagery/timeline integration and Cesium performance are follow-up gates; do not claim an in-app historical map layer. This work is isolated from LifeOS.
