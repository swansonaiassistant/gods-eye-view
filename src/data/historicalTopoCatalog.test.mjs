import assert from 'node:assert/strict';
import test from 'node:test';
import { historicalTopoSearch, normalizeHistoricalMap } from './historicalTopoCatalog.js';

const blackHillsBbox = [-103.3, 44.0, -103.2, 44.1];

// Metadata from a bounded TNMAccess Historical Topographic Maps query for Rapid City.
const mountRushmore1977 = {
  title: 'USGS 1:100000-scale Quadrangle for Mount Rushmore, SD 1977',
  sourceId: '5a8a239de4b00f54eb3bddda',
  publicationDate: '1977-01-01',
  dateCreated: '2018-02-18T18:08:45.794-07:00',
  downloadURL: 'https://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/HistoricalTopo/PDF/SD/100000/SD_Mount%20Rushmore_344702_1977_100000_geo.pdf',
};

test('historical topo search keeps discovery bounded and exposes explicit paging', () => {
  const url = new URL(historicalTopoSearch(blackHillsBbox, { max: 1, offset: 1 }));
  assert.equal(url.hostname, 'tnmaccess.nationalmap.gov');
  assert.equal(url.searchParams.get('datasets'), 'Historical Topographic Maps');
  assert.equal(url.searchParams.get('bbox'), blackHillsBbox.join(','));
  assert.equal(url.searchParams.get('max'), '1');
  assert.equal(url.searchParams.get('offset'), '1');
  assert.throws(() => historicalTopoSearch([-110, 44, -103, 45]), /Invalid Black Hills AOI/);
  assert.throws(() => historicalTopoSearch(blackHillsBbox, { max: 501 }), /Invalid page size/);
  assert.throws(() => historicalTopoSearch(blackHillsBbox, { offset: -1 }), /Invalid page offset/);
  assert.throws(() => historicalTopoSearch(blackHillsBbox, { offset: 10001 }), /Invalid page offset/);
});

test('historical topo year comes from map publication, not catalog creation', () => {
  const map = normalizeHistoricalMap(mountRushmore1977);
  assert.equal(map.year, 1977);
  assert.equal(map.id, mountRushmore1977.sourceId);
  assert.equal(map.downloadURL, mountRushmore1977.downloadURL);
  assert.equal(normalizeHistoricalMap({ ...mountRushmore1977, publicationDate: undefined }).year, null);
  assert.equal(normalizeHistoricalMap({ ...mountRushmore1977, publicationDate: '2018-01-01' }).year, null);
});

test('historical topo catalog rejects untrusted download locations', () => {
  assert.equal(normalizeHistoricalMap({ ...mountRushmore1977, downloadURL: 'http://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/HistoricalTopo/map.pdf' }), null);
  assert.equal(normalizeHistoricalMap({ ...mountRushmore1977, downloadURL: 'https://example.test/map.pdf' }), null);
  assert.equal(normalizeHistoricalMap({ ...mountRushmore1977, downloadURL: 'https://prd-tnm.s3.amazonaws.com/private/map.pdf' }), null);
  assert.equal(normalizeHistoricalMap({ ...mountRushmore1977, downloadURL: 'javascript:alert(1)' }), null);
});
