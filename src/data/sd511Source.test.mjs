import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoadEvent, SD511_SOURCE } from './sd511Source.js';
const valid = { id: '12907881:0', categories: ['closure', 'construction'], route: 'US-16A',
  direction: 'both', start: [-103.4254, 43.8936], end: [-103.4253, 43.8939],
  description: 'road closed', reportedAt: 1795100000000, updatedAt: 1795100100000 };
test('keeps official route endpoints and distinct report/update times', () => {
  const result = normalizeRoadEvent(valid);
  assert.deepEqual(result.start, valid.start);
  assert.deepEqual(result.end, valid.end);
  assert.equal(result.updatedAt, valid.updatedAt);
  assert.equal(result.reportedAt, valid.reportedAt);
  assert.match(result.locationNote, /no road-path geometry/);
  assert.equal(SD511_SOURCE.camerasAvailableInFeed, false);
});
test('rejects missing route, invalid positions, unsupported categories and fake IDs', () => {
  assert.equal(normalizeRoadEvent({ ...valid, route: '' }), null);
  assert.equal(normalizeRoadEvent({ ...valid, start: [-105, 44], end: null }), null);
  assert.equal(normalizeRoadEvent({ ...valid, categories: ['camera'] }), null);
  assert.equal(normalizeRoadEvent({ ...valid, id: '<script>' }), null);
});
