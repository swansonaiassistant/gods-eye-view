# Black Hills historic railway overlay — first phase

Enable **Black Hills Historic Railroads** in the Data panel. The first use
queries OpenStreetMap historic railway ways (abandoned, disused, razed) across
the Black Hills and overlays their mapped geometries on the Cesium terrain.
Turn it off to hide the routes. No user account or paid API is needed.

## Evidence and interpretation

The first phase is **not** the custom researcher-created map. Those maps can
include logging spurs, temporary roads, and mining track that OSM has not mapped.
OpenStreetMap coverage is incomplete and community-mapped geometries are not
survey-verified. Do not infer that an empty area has no historic track, that a
route remains passable, or that a highlighted line is publicly accessible.

The overlay is opt-in, uses the existing bounded same-origin Overpass proxy
with mirror failover and cache on enable, is also cached for the current page
session, and does not poll continuously. If Overpass is
unavailable, the layer must report UNAVAILABLE, not invent a route. Historical
overlay lines are visual context, not driving/hiking directions.

### High-priority research / next import

- Black Hills & Fort Pierre Railroad: Lead–Roubaix–Nemo–Merritt–Piedmont,
  including temporary timber/industrial spurs
- Northern approach: Black Hawk and Piedmont
- Galena-area mining branches, Englewood and Deadwood Central
- Crouch Line: Rapid City–Hisega–Pactola–Mystic

Candidate research sources to assess **before copying geometries**:
- Researcher-created Google My Maps "Black Hills Abandoned Railroads" (confirm
  author and permission / licensing, export KML only with authorization)
- Forgotten Lands, Places & Transit (CC BY-NC 4.0 noncommercial; identify
  exact selected lines and maintain attribution):
  https://map.frrandp.com/
- Library of Congress HAER Black Hills & Ft. Pierre railroad historic map:
  https://tile.loc.gov/storage-services/master/pnp/habshaer/sd/sd0000/sd0067/data/sd0067data.pdf
- OpenStreetMap South Dakota railroad mapping notes:
  https://wiki.openstreetmap.org/wiki/South_Dakota/Railroads

## Next PR

Implement a **curated archival routes** layer independent of the OSM
historical layer. Ingest explicit, licensed KML/KMZ/GeoJSON into versioned local
GeoJSON; preserve original geometry, author, license, dates, railroad, segment
type (mainline / logging spur / mining / temporary grade), confidence
(georeferenced map / aerial trace / approximate), feature-level provenance and
source links. Add a detail popup, period filtering and compare-mode against
modern aerial terrain. Never draw a straight-line shortcut between communities
or conflate logging roads with railroads. Review data rights before committing
reproductions of someone else's custom map.

## Verification

`node --test src/data/blackHillsRailroadsData.test.mjs`; `npm test`;
`npm run build`; enable/disable and watch the status chip in the app. Confirm
the selected Cesium map stack renders ground polyline and attribution.
