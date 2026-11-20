# Black Hills reported fire incidents

The opt-in layer reads [NIFC Current Wildland Fire Incident Locations](https://www.arcgis.com/home/item.html?id=4181a117dc9e43db8598533e29972015), a public item owned by `NIFC_Authoritative` and listed in [NIFC Open Data](https://data-nifc.opendata.arcgis.com/datasets/4181a117dc9e43db8598533e29972015_0/explore). Its published item terms warn that incident data are dynamic, incomplete, and not legal documents. ArcGIS Online's general terms describe public content as typically available for personal/noncommercial use, subject to item constraints. Applicability to this personal use is an inference, not a blanket license. The app uses a bounded runtime GET with attribution; it does not bundle, mirror, or redistribute the feed. Commercial or broader reuse needs separate terms review.

The current NIFC service returned two points in the Black Hills study box during verification on 2026-11-19: one wildfire (`WF`) and one prescribed fire (`RX`). This count changes with the source. CORS allowed the local browser origin. The query requests six explicit fields with a 500-record cap; any response at the cap is treated as potentially incomplete, never as a complete regional inventory. `ModifiedOnDateTime_dt` is the source update time; retrieval time is tracked separately.

Points are reported positions within incident areas, not fire fronts, perimeters, or evacuation guidance. A valid empty source response shows zero. A fetch failure shows unavailable when cold or retains the last good points labeled stale. The layer is separate from NASA FIRMS heat detections.

The prior Esri-owned Living Atlas item is no longer used because its item license points to the Esri Master License and Esri's published FAQ imposes additional use conditions for Esri-owned ArcGIS Online content. This PR does not claim those rights for a Cesium integration.

## Merge acceptance

Verify exact live source fields, source terms and credit, CORS, bounded query, type labels, time semantics, empty/stale/unavailable states, unit/build/track gates, and the actual Cesium browser layer before marking ready. No production deployment or LifeOS change is involved.
