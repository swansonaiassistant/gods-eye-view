export const WILDFIRE_INCIDENTS = Object.freeze({
  url: 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0',
  itemUrl: 'https://www.arcgis.com/home/item.html?id=4181a117dc9e43db8598533e29972015',
  publisher: 'NIFC · US DOI Office of Wildland Fire / IRWIN',
  refreshMs: 15 * 60 * 1000,
  advisory: 'Reported points are approximate locations within incident areas, not fire fronts or evacuation guidance',
});
export const BLACK_HILLS_FIRE_BBOX = Object.freeze([-105, 43.35, -102.65, 45.05]);
const PUBLIC_FIELDS = 'OBJECTID,IncidentName,IncidentTypeCategory,ModifiedOnDateTime_dt,FireDiscoveryDateTime,UniqueFireIdentifier';
export function wildfireIncidentsQuery(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite)) throw new Error('Invalid bbox');
  const [west,south,east,north] = bbox;
  if (!(west < east && south < north) || west < -106 || east > -101 || south < 42 || north > 46) throw new Error('Outside region');
  const url = new URL(WILDFIRE_INCIDENTS.url + '/query');
  for (const [key,value] of Object.entries({ f:'geojson', where:'1=1', geometry:bbox.join(','),
    geometryType:'esriGeometryEnvelope', inSR:'4326', outSR:'4326', spatialRel:'esriSpatialRelIntersects',
    outFields:PUBLIC_FIELDS, returnGeometry:'true', resultRecordCount:'500' })) url.searchParams.set(key,value);
  return url.toString();
}
export function normalizeWildfireFeature(feature) {
  if (!feature || feature.type !== 'Feature' || feature.geometry?.type !== 'Point') return null;
  if (!Array.isArray(feature.geometry.coordinates) || feature.geometry.coordinates.length < 2) return null;
  const [lon,lat] = feature.geometry.coordinates;
  if (![lon,lat].every(Number.isFinite) || lon < -106 || lon > -101 || lat < 42 || lat > 46) return null;
  const p = feature.properties || {};
  if (!Number.isInteger(p.OBJECTID) && !p.UniqueFireIdentifier) return null;
  const type = p.IncidentTypeCategory === 'WF' ? 'wildfire'
    : p.IncidentTypeCategory === 'RX' ? 'prescribed fire'
      : p.IncidentTypeCategory === 'CX' ? 'incident complex' : 'reported fire';
  const timestamp = (value) => Number.isFinite(value) && value > 0 ? value : null;
  return {
    id: String(p.UniqueFireIdentifier ?? p.OBJECTID), position: [lon, lat],
    incidentName: String(p.IncidentName || 'Unnamed incident').slice(0, 120),
    type, reportedAt: timestamp(p.FireDiscoveryDateTime),
    updatedAt: timestamp(p.ModifiedOnDateTime_dt),
    source: WILDFIRE_INCIDENTS.itemUrl,
  };
}
