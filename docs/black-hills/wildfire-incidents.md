# wildfire incidents — preliminary research and implementation

Current wildfire point layer (IRWIN/NIFC aggregated): https://services5.arcgis.com/b7cJ4YYc9GM63RSz/arcgis/rest/services/USA_Active_Wildfires___Current_Incidents/FeatureServer/1 . The provider reports ~15-minute refresh and warns perimeters may lag actual conditions. `src/data/blackHillsWildfireIncidents.js` adds AOI-limited GeoJSON queries and a point normalizer.

This complements, **does not duplicate**, the existing NASA FIRMS heatmap. Next: test live feature fields, viewport cache, incident names and report age; separately verify the current perimeter layer and add polygon rendering/legend. Do not present report points as fire fronts or provide evacuation guidance.

## Merge acceptance

Verify actual data response, source reuse constraints, schema, error states, tests, and Cesium browser performance before marking this feature ready. This PR is deliberately draft and isolated from LifeOS.
