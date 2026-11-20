# people places — preliminary research and implementation

The NPS public API offers People and Places content: https://www.nps.gov/subjects/digital/nps-data-api.htm . `src/data/npsPeoplePlaces.js` adds typed API URL and public profile normalization for nearby park-code candidates, requiring an API key.

Next: verify NPS coverage and key handling, add a server-side read-only proxy and profiles linked to documented sites/dates, then integrate source-cited people/site panels. No tracking private persons, no inferred homes or current movements, no invented exact positions. Historical figures, community historians and named public roles should be linked only through public source evidence.

## Merge acceptance

Verify actual data response, source reuse constraints, schema, error states, tests, and Cesium browser performance before marking this feature ready. This PR is deliberately draft and isolated from LifeOS.
