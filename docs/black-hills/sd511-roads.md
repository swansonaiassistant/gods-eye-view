# sd511 roads — preliminary research and implementation

SD511 is the official source for South Dakota road conditions, travel weather, incidents, construction and selected cameras: https://www.sd511.org/ and https://www.sd511.org/static/help.html . The helper `src/data/sd511Source.js` captures source capabilities and normalizes candidate records safely.

**Not yet live:** a sanctioned public API and camera redistribution terms are unverified. Do not scrape undocumented/private endpoints or represent stale status as live. Next: confirm reuse permissions, verified endpoint and polling frequency, then render road *segments* and optional camera locations with separate incident/closure overlays; add caching, timestamps, viewport controls and source-specific tests.

## Merge acceptance

Verify actual data response, source reuse constraints, schema, error states, tests, and Cesium browser performance before marking this feature ready. This PR is deliberately draft and isolated from LifeOS.
