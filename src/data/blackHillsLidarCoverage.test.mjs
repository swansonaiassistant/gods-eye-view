import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLidarWorkUnits, workUnitBounds, workUnitsGeoJson } from './blackHillsLidarCoverage.js';
const geometry = { type: 'Polygon', coordinates: [[[-104, 44], [-103, 44], [-103, 45], [-104, 44]]] };
const record = (id) => ({ type: 'Feature', properties: { OBJECTID: id, workunit: `SD_${id}`, project: 'Official project', ql: 'QL 2', collect_start: 1700000000000, lpc_link: 'https://rockyweb.usgs.gov/public' }, geometry });
const response = (body) => ({ ok: true, json: async () => body });
test('queries official IDs then bounded geometry pages and preserves provenance', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const q = new URL(url).searchParams; calls.push(q);
    return response(q.has('returnIdsOnly') ? { objectIds: [1, 2] } : { type: 'FeatureCollection', features: [record(1), record(2)] });
  };
  const units = await fetchLidarWorkUnits({ fetchImpl });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].get('geometry'), '-105,43.35,-102.65,45.05');
  assert.equal(calls[1].get('objectIds'), '1,2');
  assert.equal(units[0].qualityLevel, 'QL 2');
  assert.equal(units[0].collectionStart, '2023-11-14');
  assert.equal(units[0].pointCloudUrl, 'https://rockyweb.usgs.gov/public');
  assert.equal(workUnitsGeoJson(units).features.length, 2);
});
test('rejects incomplete or unsafe upstream responses rather than inventing coverage', async () => {
  await assert.rejects(fetchLidarWorkUnits({ fetchImpl: async () => response({ objectIds: [1] }) }), /geometry unavailable/);
  await assert.rejects(fetchLidarWorkUnits({ fetchImpl: async () => response({ objectIds: Array.from({ length: 501 }, (_, i) => i) }) }), /safe display limit/);
  const units = await fetchLidarWorkUnits({ fetchImpl: async (url) => response(new URL(url).searchParams.has('returnIdsOnly') ? { objectIds: [1] } : { type: 'FeatureCollection', features: [{ ...record(1), properties: { ...record(1).properties, lpc_link: 'http://evil.example/data' } }] }) });
  assert.equal(units[0].pointCloudUrl, null);
});

test('pages beyond fifty IDs and rejects missing geometry before showing a partial catalog', async () => {
  const ids = Array.from({ length: 51 }, (_, i) => i + 1);
  const calls = [];
  const fetchImpl = async (url) => {
    const q = new URL(url).searchParams;
    if (q.has('returnIdsOnly')) return response({ objectIds: ids });
    calls.push(q.get('objectIds'));
    return response({ type: 'FeatureCollection', features: q.get('objectIds').split(',').map((id) => record(Number(id))) });
  };
  const units = await fetchLidarWorkUnits({ fetchImpl });
  assert.equal(units.length, 51);
  assert.equal(calls.length, 2);
  assert.equal(calls[1], '51');
  await assert.rejects(fetchLidarWorkUnits({ fetchImpl: async (url) => {
    const q = new URL(url).searchParams;
    return response(q.has('returnIdsOnly') ? { objectIds: [1, 2] } : { type: 'FeatureCollection', features: [record(1)] });
  } }), /incomplete work-unit geometry/);
});
test('network failures are surfaced to the UI caller with no fabricated rows', async () => {
  await assert.rejects(fetchLidarWorkUnits({ fetchImpl: async () => { throw new TypeError('network down'); } }), /network down/);
  await assert.rejects(fetchLidarWorkUnits({ fetchImpl: async () => ({ ok: false, status: 503 }) }), /503/);
});

test('camera bounds include all polygons of a multi-part work unit', () => {
  assert.deepEqual(workUnitBounds({ geometry: { type: 'MultiPolygon', coordinates: [
    [[[[-104, 44], [-103, 45], [-103.5, 44.5]]]],
    [[[[-106, 43], [-105, 44], [-105.5, 43.5]]]],
  ] } }), [-106, 43, -103, 45]);
});

test('times out a stalled query and bounds the caller to the declared study region', async () => {
  await assert.rejects(fetchLidarWorkUnits({ timeoutMs: 5, fetchImpl: () => new Promise(() => {}) }), /timed out/);
  await assert.rejects(fetchLidarWorkUnits({ extent: [-110, 43, -102, 45], fetchImpl: async () => response({ objectIds: [] }) }), /outside Black Hills study region/);
});
test('rejects oversized or malformed source geometry', async () => {
  await assert.rejects(fetchLidarWorkUnits({ fetchImpl: async () => ({ ok: true, headers: { get: () => '3000000' } }) }), /response too large/);
  const malformed = { ...record(1), geometry: { type: 'Polygon', coordinates: [[[-104, 44], [-103, 45], [999, 44], [-104, 44]]] } };
  await assert.rejects(fetchLidarWorkUnits({ fetchImpl: async (url) => response(new URL(url).searchParams.has('returnIdsOnly') ? { objectIds: [1] } : { type: 'FeatureCollection', features: [malformed] }) }), /incomplete work-unit geometry/);
});
