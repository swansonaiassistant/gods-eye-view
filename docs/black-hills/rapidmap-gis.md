# rapidmap gis — preliminary research and implementation

Official Rapid City/Pennington GIS ArcGIS REST: https://gis.rcgov.org/server/rest/services/PublicSites/PublicRapidMap/MapServer . Public layers verified from service listing: Roads=4, 2023 MPO 1-foot contours=10, Parcels=40, City Boundaries=47. `src/data/rapidMapSource.js` builds bounded GeoJSON queries requesting WGS84 output.

GIS disclaimer: geographic reference data, **not legal parcel boundaries**. Official RapidMap refreshes weekday mornings: https://www.rcgov.org/departments/public-works/geographic-information-system/rapidmap-214.html . Next: validate live GeoJSON, CORS and pagination; cache/simplify by camera extent, render the four layers, display source and boundary notices, test and honor data-use terms. Local city dataset information: https://www.rcgov.org/departments/public-works/geographic-information-system/gis-data-216.html .

## Merge acceptance

Verify actual data response, source reuse constraints, schema, error states, tests, and Cesium browser performance before marking this feature ready. This PR is deliberately draft and isolated from LifeOS.
