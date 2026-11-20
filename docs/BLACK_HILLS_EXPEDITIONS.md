# PR #5 — Black Hills expeditions and Great Sioux War research foundation

## Scope

Interactive, sourced historical reconstruction covering exploration, military
movements, mining-era surveys, Lakota and Cheyenne history, and engagements
associated with the Black Hills between roughly 1857 and 1877.

The initial panel provides a **documented research timeline**, not actual
track reconstruction. No invented routes, fort sites, skirmish locations,
or encampment coordinates may be added to the globe.

### Priority archival materials

1. William Ludlow's original 1874 Custer reconnaissance map, showing dated
   expedition paths and encampments:
   https://www.loc.gov/item/73697038/
2. USD historical map inventory (also references Warren 1857 and **William F.
   Raynolds 1859**): 
   https://readingroom.usd.edu/post/south-dakota-and-northern-great-plains-historical-maps
3. NPS Great Sioux War overview, timeline, and 1876 engagement sites:
   https://www.nps.gov/articles/000/fort-laramie-in-1876.htm
4. NPS indigenous perspectives:
   https://home.nps.gov/articles/000/fighting-for-the-black-hills-understanding-indigenous-perspectives-on-the-great-sioux-war-of-1876-1877.htm
5. National Archives Fort Laramie Treaty context:
   https://www.archives.gov/education/lessons/sioux-treaty

**Do not confuse** Captain William F. Raynolds' 1859–60 reconnaissance with
Colonel Joseph J. Reynolds' March 1876 campaign.

## Interpretation standards

- Black Hills are sacred to Lakota peoples; exploration by U.S. government
  parties occurred despite the Treaty of Fort Laramie (1868). Include Lakota
  and Cheyenne histories, named leaders and primary accounts where verifiable.
- The Little Bighorn and Rosebud battlefields are in **Montana**, not inside
  the Black Hills. Show regional context rather than mislabeling them as local.
- Differentiation: surveyed ground route / reconstructed from primary map /
  approximate corridor / unknown. Do not draw straight lines between camps.
- Distinguish event date, map publication date, original observer, modern
  interpretation and confidence. Allow conflicting sources and revisions.
- Sensitive cultural, burial or archaeological sites must never receive new
  precise public pins without authoritative publication and appropriate review.
- Public-domain provenance must be checked per artifact before reproducing a
  scan; avoid pulling modern copyrighted reconstructions into the repository.
- Never claim staged narrative animation is documented actual movement.

## Follow-up implementation

- Georeference Ludlow's original map with control points on established
  geographic features; record transformation and RMS error.
- Digitize dated route segments and camps to GeoJSON with source citation,
  map sheet, extraction method, date range, uncertainty polygon and review.
- Add a year/date scrubber and expedition selection on Cesium globe; render
  distinct lines for high-confidence versus inferred paths.
- Historic photographs then-versus-now comparison and viewpoint matching.
- Expand to 1857 Warren, 1859 Raynolds, 1875 Jenney/Newton/Dodge, 1876
  Crook/Terry/Custer/Reynolds, local settlement-era conflict if sources support.
- Investigate events in the hills versus the wider northern Plains separately.
- Connect with PR #2 railroads, PR #3 historic drone media and PR #4 private
  personal imagery only through reviewed location keys / permission boundaries.
- Before marking ready: tests, build, panel screen/mobile layout and source
  verification; then begin a separate route-georeferencing implementation PR.

Run `node --test src/history/blackHillsExpeditionsCatalog.test.mjs`,
`npm test`, and `npm run build`.
