const BASE = 'https://gis.rcgov.org/server/rest/services/PublicSites/PublicRapidMap/MapServer';
export const RAPIDMAP_LAYERS = Object.freeze({
  roads: 4,
  contours2023: 10,
  parcels: 40,
  cityBoundaries: 47,
});
export const RAPIDMAP_SOURCE = Object.freeze({ base: BASE, attribution: 'City of Rapid City GIS Division', disclaimer: 'Reference only; not a legal survey' });

/** Create a bounded, paged ArcGIS REST WGS84 GeoJSON query for an explicit map extent. */
export function rapidMapQuery(kind, bbox, { limit = 500, offset = 0 } = {}) {
  if (!Object.hasOwn(RAPIDMAP_LAYERS, kind)) throw new Error('Unapproved GIS layer');
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite)) throw new Error('Invalid bbox');
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('Invalid page size');
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000) throw new Error('Invalid page offset');
  const [xmin,ymin,xmax,ymax] = bbox;
  if (xmin >= xmax || ymin >= ymax || xmin < -106 || xmax > -101 || ymin < 42 || ymax > 46) throw new Error('Outside regional extent');
  const url = new URL(BASE + '/' + RAPIDMAP_LAYERS[kind] + '/query');
  const query = { f:'geojson', where:'1=1', geometry: bbox.join(','), geometryType:'esriGeometryEnvelope',
    inSR:'4326', outSR:'4326', spatialRel:'esriSpatialRelIntersects', outFields:'OBJECTID',
    returnGeometry:'true', orderByFields:'OBJECTID ASC', resultRecordCount:String(limit), resultOffset:String(offset) };
  for(const [key,value] of Object.entries(query)) url.searchParams.set(key,value);
  return url.toString();
}
