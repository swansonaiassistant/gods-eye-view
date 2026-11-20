import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMediaLocation, normalizeMediaMapRecord, personalMediaViewportQuery, MAX_MEDIA_PAGE_SIZE,
} from './personalMediaIndex.js';

test('GPS-less or invalid records never produce map pins', () => {
  assert.equal(normalizeMediaMapRecord({ id: 'abcdefghi', kind: 'photo', location: null }), null);
  assert.equal(normalizeMediaLocation({ latitude: 91, longitude: -103, source: 'exif-gps', confidence: 'precise' }), null);
  assert.equal(normalizeMediaLocation({ latitude: 44, longitude: -103, source: 'guessed', confidence: 'precise' }), null);
});
test('viewer record minimizes private metadata and accepts validated location', () => {
  const record = normalizeMediaMapRecord({
    id: 'media_12345678', kind: 'video', capturedAt: '2020-07-01T12:00:00-06:00',
    durationSeconds: 23, sourcePath: '/private/nas/DCIM/secret.mov', cameraSerial: 'SECRET',
    thumbnailId: 'thumb_12345678',
    location: { latitude: 44.07, longitude: -103.25, source: 'exif-gps', confidence: 'precise' },
  });
  assert.equal(record.kind, 'video');
  assert.equal(record.location.latitude, 44.07);
  assert.equal(record.capturedAt, '2020-07-01T18:00:00.000Z');
  assert.equal('sourcePath' in record, false);
  assert.equal('cameraSerial' in record, false);
});
test('viewport queries enforce finite bounds and a bounded page size', () => {
  const query = personalMediaViewportQuery({ south: 43.9, north: 44.3, west: -103.7, east: -103.1 }, { limit: 999999 });
  assert.equal(Number(query.get('limit')), MAX_MEDIA_PAGE_SIZE);
  assert.equal(query.has('cursor'), false);
  assert.equal(personalMediaViewportQuery({ south: 44, north: 43, west: -103.7, east: -103.1 }), null);
});
