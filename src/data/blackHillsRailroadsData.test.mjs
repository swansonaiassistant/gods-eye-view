import test from 'node:test';
import assert from 'node:assert/strict';
import { overpassWaysToRailGeoJSON } from './blackHillsRailroadsData.js';

test('renders only historic railway ways with usable coordinates and source attribution', () => {
  const input = { elements: [
    { type: 'way', id: 123, tags: { railway: 'abandoned', name: 'Old spur' },
      geometry: [{ lat: 44.1, lon: -103.5 }, { lat: 44.2, lon: -103.4 }] },
    { type: 'way', id: 124, tags: { railway: 'rail' },
      geometry: [{ lat: 44.1, lon: -103.5 }, { lat: 44.2, lon: -103.4 }] },
    { type: 'node', id: 125, tags: { railway: 'disused' } },
  ] };
  const result = overpassWaysToRailGeoJSON(input);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.railway, 'abandoned');
  assert.match(result.features[0].properties.source_url, /123$/);
  assert.deepEqual(result.features[0].geometry.coordinates[0], [-103.5, 44.1]);
});
test('rejects malformed upstream responses', () => {
  assert.throws(() => overpassWaysToRailGeoJSON(null), /Invalid railway response/);
});
