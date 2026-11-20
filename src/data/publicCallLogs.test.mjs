import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CALL_LOG_SOURCES, createPublicCallLogLayer, fetchRapidCitySnapshot,
  geocodePublicIntersection, nearestIntersection, normalizeRapidCityRow,
  parseReportedCoordinates, publicFieldMap, rapidCityPageUrl,
} from './publicCallLogs.js';

const info = { fields: [
  { id: 1079247, name: 'CFS Date/Time' }, { id: 1079248, name: 'Street Name' },
  { id: 1079249, name: 'Nearest Intersection' }, { id: 1079250, name: 'CFS #' },
  { id: 1079251, name: 'Call Type' }, { id: 1079252, name: 'Disposition' },
] };
const row = (id, time, street = 'MAIN ST') => ({
  id, field_1079247: time, field_1079248: street,
  field_1079249: 'MAIN ST and 6 ST (0.1 miles)',
  field_1079250: `26-${id}`, field_1079251: 'ALARM', field_1079252: 'LOG ENTRY ONLY',
});
const response = (data, status = 200) => ({ ok: status === 200, status, json: async () => data });

test('published agency cadences and county unavailable source are explicit', () => {
  assert.equal(CALL_LOG_SOURCES.rapidCity.updateInterval, 14_400_000);
  assert.equal(CALL_LOG_SOURCES.pennington.updateInterval, 300_000);
  assert.equal(CALL_LOG_SOURCES.pennington.rowsEndpoint, null);
});

test('maps the live public-view field IDs and orders recent pages over HTTPS', () => {
  const fields = publicFieldMap(info);
  assert.equal(fields.get('cfsdatetime'), 'field_1079247');
  const url = new URL(rapidCityPageUrl(fields, 2));
  assert.equal(url.protocol, 'https:');
  assert.equal(url.searchParams.get('order_by'), '-field_1079247');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('size'), '200');
  assert.throws(() => publicFieldMap({ fields: info.fields.slice(1) }), /CFS Date\/Time/);
});

test('normalizes actual public rows and never invents coordinates', () => {
  const item = normalizeRapidCityRow(row(123, '2026-11-19T21:59:29Z'), publicFieldMap(info));
  assert.equal(item.id, '26-123');
  assert.equal(item.reportedAt, Date.parse('2026-11-19T21:59:29Z'));
  assert.equal(item.street, 'MAIN ST');
  assert.equal(item.coords, null);
  assert.equal(nearestIntersection(item.intersection), 'MAIN ST & 6 ST');
  assert.equal(parseReportedCoordinates('MAIN ST and 6 ST (0.1 miles)'), null);
  assert.deepEqual(parseReportedCoordinates('44.082355820, -103.243491900'), {lat:44.08235582,lon:-103.2434919});
  assert.equal(parseReportedCoordinates('44.082, -120.245'), null);
});

test('fetches multiple descending pages, deduplicates call IDs, and retains source total', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.includes('/public/info/')) return response(info);
    const page = Number(new URL(url).searchParams.get('page'));
    if (page === 1) return response({ count: 401, next: 'http://api.baserow.io/page=2', results: [
      row(1, '2026-11-19T22:00:00Z'), row(2, '2026-11-19T21:00:00Z'),
    ] });
    if (page === 2) return response({ count: 401, next: null, results: [
      row(2, '2026-11-19T21:00:00Z'), row(3, '2026-11-18T21:00:00Z'),
    ] });
    throw new Error('Unexpected page');
  };
  const snapshot = await fetchRapidCitySnapshot(fetchImpl);
  assert.equal(urls.length, 3);
  assert.equal(urls[2].startsWith('https://api.baserow.io/'), true);
  assert.deepEqual(snapshot.records.map((item) => item.id), ['26-1','26-2','26-3']);
  assert.equal(snapshot.sourceTotal, 401);
});

test('a partial page failure does not replace the last good layer snapshot', async () => {
  let fail = false;
  const fetchImpl = async (url) => {
    if (url.includes('/public/info/')) return response(info);
    const page = Number(new URL(url).searchParams.get('page'));
    if (page === 1) return response({ count: 201, next: 'next', results: [row(1,'2026-11-19T22:00:00Z')] });
    return fail ? response({}, 503) : response({ count: 201, next: null, results: [row(2,'2026-11-19T21:00:00Z')] });
  };
  const layer = createPublicCallLogLayer(CALL_LOG_SOURCES.rapidCity, { fetchImpl });
  const sources = [];
  const viewer = { dataSources: { add: (item) => sources.push(item), remove: () => true } };
  layer.init(viewer);
  assert.equal(await layer.update(), true);
  assert.equal(layer.getRecords().length, 2);
  const previous = layer.getStats().lastUpdate;
  fail = true;
  assert.equal(await layer.update(), false);
  assert.equal(layer.getRecords().length, 2);
  assert.equal(layer.getStats().lastUpdate, previous);
  assert.equal(layer.getStats().stale, true);
  layer.destroy(viewer);
});

test('county layer is selectable but never returns fabricated incidents', async () => {
  const layer = createPublicCallLogLayer(CALL_LOG_SOURCES.pennington);
  const viewer = { dataSources: { add: () => {}, remove: () => true } };
  layer.init(viewer);
  assert.equal(await layer.update(), true);
  assert.deepEqual(layer.getRecords(), []);
  assert.equal(layer.getStats().unavailable, true);
  layer.destroy(viewer);
});

test('a requested intersection lookup rejects vague or out-of-area geocodes', async () => {
  const result = await geocodePublicIntersection('MAIN ST and 6 ST (0.1 miles)', 'test-key', async () => response({
    status:'OK', results:[{ types:['intersection'], formatted_address:'Main St & 6th St, Rapid City, SD', geometry:{ location:{lat:44.08,lng:-103.23} } }],
  }));
  assert.equal(result.lat, 44.08);
  assert.match(result.note, /not the call site/);
  await assert.rejects(geocodePublicIntersection('MAIN ST', 'test-key', async () => response({})), /No defensible/);
  await assert.rejects(geocodePublicIntersection('MAIN ST and 6 ST', 'test-key', async () => response({
    status:'OK', results:[{ types:['route'], geometry:{ location:{lat:44.08,lng:-103.23} } }],
  })), /could not be located/);
  await assert.rejects(geocodePublicIntersection('MAIN ST and 6 ST', 'test-key', async () => response({
    status:'OK', results:[{ types:['intersection'], formatted_address:'Main St & 7th St, Rapid City, SD', geometry:{ location:{lat:44.08,lng:-103.23} } }],
  })), /could not be located/);
  await assert.rejects(geocodePublicIntersection('MAIN ST and 6 ST', 'test-key', async () => response({
    status:'OK', results:[{ types:['intersection'], formatted_address:'Main St & 16th St, Rapid City, SD', geometry:{ location:{lat:44.08,lng:-103.23} } }],
  })), /could not be located/);
});

test('user-located proxy survives refresh only while the published intersection is unchanged', async () => {
  let intersection = 'MAIN ST and 6 ST (0.1 miles)';
  const fetchImpl = async (url) => url.includes('/public/info/') ? response(info) : response({
    count: 1, next: null, results: [{ ...row(9, '2026-11-19T22:00:00Z'), field_1079249: intersection }],
  });
  const layer = createPublicCallLogLayer(CALL_LOG_SOURCES.rapidCity, {
    fetchImpl, geocodeImpl: async () => ({lat:44.08, lon:-103.23, note:'Nearest intersection proxy; not the call site'}),
  });
  const viewer = { dataSources: { add: () => {}, remove: () => true }, camera: { flyTo: () => {} } };
  layer.init(viewer);
  assert.equal(await layer.update(), true);
  assert.equal(layer.getStats().count, 1); // toggle count is loaded calls, not map pins
  await layer.locateApprox('26-9', 'test-key');
  assert.equal(layer.getStats().mappedCount, 1);
  assert.equal(await layer.update(), true);
  assert.equal(layer.getStats().mappedCount, 1);
  intersection = 'MAIN ST and 7 ST (0.2 miles)';
  assert.equal(await layer.update(), true);
  assert.equal(layer.getStats().mappedCount, 0);
  layer.destroy(viewer);
});
