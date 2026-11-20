# historical maps — preliminary research and implementation

USGS historical topographic sheets cover *published maps* from 1884–2006, not necessarily the entire region in every year: https://www.usgs.gov/programs/national-geospatial-program/historical-topographic-maps-preserving-past . topoView: https://ngmdb.usgs.gov/topoview/ ; National Map API: https://apps.nationalmap.gov/datasets/ . `src/data/historicalTopoCatalog.js` creates an AOI-limited catalog search and normalizes products.

Next: verify exact endpoint and result pagination; discover quadrangle extents, editions and dates; transform downloadable georeferenced raster assets into Cesium imagery with opacity slider and timeline. Keep historic sheet date separate from the date of an event and distinguish documented railroad geometry from speculative reconstructions. Coordinate with existing railway/drone PRs.

## Merge acceptance

Verify actual data response, source reuse constraints, schema, error states, tests, and Cesium browser performance before marking this feature ready. This PR is deliberately draft and isolated from LifeOS.
