import assert from 'node:assert/strict';
import test from 'node:test';
import { rapidMapQuery, RAPIDMAP_LAYERS } from './rapidMapSource.js';

const rapidCityBbox = [-103.3, 44.0, -103.2, 44.1];

test('RapidMap query requests only minimum identifiers and deterministic bounded pages', () => {
  const url = new URL(rapidMapQuery('roads', rapidCityBbox, { limit: 1, offset: 1 }));
  assert.match(url.origin, /^https:\/\/gis\.rcgov\.org$/);
  assert.equal(url.pathname.endsWith(`/${RAPIDMAP_LAYERS.roads}/query`), true);
  assert.equal(url.searchParams.get('f'), 'geojson');
  assert.equal(url.searchParams.get('geometry'), rapidCityBbox.join(','));
  assert.equal(url.searchParams.get('inSR'), '4326');
  assert.equal(url.searchParams.get('outSR'), '4326');
  assert.equal(url.searchParams.get('outFields'), 'OBJECTID');
  assert.equal(url.searchParams.get('orderByFields'), 'OBJECTID ASC');
  assert.equal(url.searchParams.get('resultRecordCount'), '1');
  assert.equal(url.searchParams.get('resultOffset'), '1');
  assert.doesNotMatch(url.href, /outFields=\*/);
});

test('RapidMap query refuses broad extents and invalid pagination', () => {
  assert.throws(() => rapidMapQuery('unknown', rapidCityBbox), /Unapproved GIS layer/);
  assert.throws(() => rapidMapQuery('roads', [-104, 44, -103, 47]), /Outside regional extent/);
  assert.throws(() => rapidMapQuery('roads', [0, 0, 0, 0]), /Outside regional extent/);
  assert.throws(() => rapidMapQuery('roads', rapidCityBbox, { limit: 0 }), /Invalid page size/);
  assert.throws(() => rapidMapQuery('roads', rapidCityBbox, { limit: 501 }), /Invalid page size/);
  assert.throws(() => rapidMapQuery('roads', rapidCityBbox, { offset: -1 }), /Invalid page offset/);
  assert.throws(() => rapidMapQuery('roads', rapidCityBbox, { offset: 1.5 }), /Invalid page offset/);
  assert.throws(() => rapidMapQuery('roads', rapidCityBbox, { offset: 10001 }), /Invalid page offset/);
});
