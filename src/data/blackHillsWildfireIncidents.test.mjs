import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLACK_HILLS_FIRE_BBOX,
  WILDFIRE_INCIDENTS,
  wildfireIncidentsQuery,
  normalizeWildfireFeature,
} from './blackHillsWildfireIncidents.js';

test('uses bounded current public service fields and a GeoJSON GET query', () => {
  const url = new URL(wildfireIncidentsQuery(BLACK_HILLS_FIRE_BBOX));
  assert.equal(url.origin, new URL(WILDFIRE_INCIDENTS.url).origin);
  assert.equal(url.hostname, 'services3.arcgis.com');
  assert.match(url.pathname, /WFIGS_Incident_Locations_Current\/FeatureServer\/0\/query$/);
  assert.match(WILDFIRE_INCIDENTS.itemUrl, /id=4181a117dc9e43db8598533e29972015$/);
  assert.equal(url.searchParams.get('f'), 'geojson');
  assert.equal(url.searchParams.get('geometry'), BLACK_HILLS_FIRE_BBOX.join(','));
  assert.equal(url.searchParams.get('resultRecordCount'), '500');
  assert.equal(url.searchParams.get('outFields')?.includes('*'), false);
  assert.equal(url.searchParams.get('outFields')?.includes('IncidentName'), true);
  assert.equal(url.searchParams.get('outFields')?.includes('ModifiedOnDateTime_dt'), true);
  assert.throws(() => wildfireIncidentsQuery([-120, 40, -110, 50]));
});

test('classifies reported wildfire versus prescribed fire without claiming a fire front', () => {
  const base = { type: 'Feature', geometry: { type: 'Point', coordinates: [-104.1, 44.2] },
    properties: { OBJECTID: 4257, IncidentName: 'Moskee RX', IncidentTypeCategory: 'RX',
      FireDiscoveryDateTime: 1794327833000, ModifiedOnDateTime_dt: 1795121210000 } };
  const prescribed = normalizeWildfireFeature(base);
  assert.equal(prescribed.type, 'prescribed fire');
  assert.equal(prescribed.reportedAt, 1794327833000);
  assert.equal(prescribed.updatedAt, 1795121210000);
  assert.deepEqual(prescribed.position, [-104.1, 44.2]);
  assert.equal(normalizeWildfireFeature({ ...base, properties: { ...base.properties, IncidentTypeCategory: 'WF' } }).type, 'wildfire');
  assert.equal(normalizeWildfireFeature({ ...base, geometry: { type: 'Point', coordinates: [-74, 40] } }), null);
  assert.equal(normalizeWildfireFeature({ ...base, geometry: { type: 'Point', coordinates: { x: -104, y: 44 } } }), null);
  assert.equal(normalizeWildfireFeature({ ...base, properties: {} }), null);
});
