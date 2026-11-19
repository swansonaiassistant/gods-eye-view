import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CALL_LOG_SOURCES,
  normalizeRapidCityRow,
  normalizeRapidCityResponse,
  parseReportedCoordinates,
} from '../src/data/publicCallLogs.js';

test('agency polling follows published refresh periods', () => {
  assert.equal(CALL_LOG_SOURCES.rapidCity.updateInterval, 14_400_000);
  assert.equal(CALL_LOG_SOURCES.pennington.updateInterval, 300_000);
});

test('only explicitly published local coordinates are mapped', () => {
  assert.deepEqual(parseReportedCoordinates('44.082355820, -103.243491900'), {
    lat: 44.08235582, lon: -103.2434919,
  });
  assert.equal(parseReportedCoordinates('HAINES AVE and KNOLLWOOD DR (154.5 feet)'), null);
  assert.equal(parseReportedCoordinates('44.082, -120.245'), null);
  assert.equal(parseReportedCoordinates('44, -103'), null);
});

test('city rows retain call metadata without fabricating a position', () => {
  assert.deepEqual(normalizeRapidCityRow({
    id: 123,
    'CFS Date/Time': '2026-11-19 14:00',
    'Street Name': 'MAIN ST',
    'Nearest Intersection': 'MAIN ST and 6 ST (0.1 miles)',
    'CFS #': '26-376252',
    'Call Type': 'ALARM- PANIC / DURESS',
    Disposition: 'FALSE ALARM',
  }), {
    id: '26-376252',
    time: '2026-11-19 14:00',
    street: 'MAIN ST',
    intersection: 'MAIN ST and 6 ST (0.1 miles)',
    callType: 'ALARM- PANIC / DURESS',
    disposition: 'FALSE ALARM',
    coords: null,
  });
});

test('deduplicates city call IDs and rejects malformed response', () => {
  const record = { id: 123, 'CFS #': '26-376252', 'Street Name': 'MAIN ST' };
  assert.equal(normalizeRapidCityResponse({ results: [record, record] }).length, 1);
  assert.throws(() => normalizeRapidCityResponse({ results: null }));
});
