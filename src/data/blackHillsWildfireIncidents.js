export const WILDFIRE_INCIDENTS = Object.freeze({
  url: 'https://services5.arcgis.com/b7cJ4YYc9GM63RSz/arcgis/rest/services/USA_Active_Wildfires___Current_Incidents/FeatureServer/1',
  publisher: 'Esri US wildfire aggregation · IRWIN / NIFC',
  refreshMs: 15 * 60 * 1000,
  advisory: 'Operational incident locations and perimeters may lag actual conditions',
});
export function wildfireIncidentsQuery(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite)) throw new Error('Invalid bbox');
  const [west,south,east,north] = bbox;
  if (!(west < east && south < north) || west < -106 || east > -101 || south < 42 || north > 46) throw new Error('Outside region');
  const url = new URL(WILDFIRE_INCIDENTS.url + '/query');
  for (const [key,value] of Object.entries({ f:'geojson', where:'1=1', geometry:bbox.join(','),
    geometryType:'esriGeometryEnvelope', inSR:'4326', outSR:'4326', spatialRel:'esriSpatialRelIntersects',
    outFields:'*', returnGeometry:'true' })) url.searchParams.set(key,value);
  return url.toString();
}
export function normalizeWildfireFeature(feature) {
  if (!feature || feature.type !== 'Feature' || feature.geometry?.type !== 'Point') return null;
  const [lon,lat] = feature.geometry.coordinates ?? [];
  if (![lon,lat].every(Number.isFinite)) return null;
  const p = feature.properties || {};
  return { id: String(p.OBJECTID ?? p.GlobalID ?? lon + ':' + lat), position:[lon,lat],
    incidentName: String(p.IncidentName ?? p.IncidentName1 ?? 'Reported fire'),
    properties: p, source: WILDFIRE_INCIDENTS.url };
}
