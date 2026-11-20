# lidar coverage — preliminary research and implementation

USGS 3DEP LidarExplorer https://apps.nationalmap.gov/lidar-explorer/ and National Map Downloader https://apps.nationalmap.gov/downloader/ show point-cloud and DEM products with acquisition footprints, dates and quality metadata. Rapid City MPO also has local LiDAR, separate from a Black Hills-wide survey: https://www.rcgov.org/departments/public-works/geographic-information-system/gis-data-216.html .

`src/data/blackHillsLidarCoverage.js` establishes a provisional regional bounding box and grid-based coverage inventory; **every cell begins unassessed**, so no blanket coverage is claimed. Next: define authoritative Black Hills polygon including WY, query project acquisition footprints, intersect/area-weight coverage, distinguish high-resolution LiDAR from DEM-only and missing regions, and assess tile quality and dates. Use streaming/LOD and cloud point tiles; never automatically download an entire region's point clouds. Future viewer: hillshade, slope, bare-earth terrain, controlled point cloud detail, source/date legend. Current work is groundwork only.

## Merge acceptance

Verify actual data response, source reuse constraints, schema, error states, tests, and Cesium browser performance before marking this feature ready. This PR is deliberately draft and isolated from LifeOS.
