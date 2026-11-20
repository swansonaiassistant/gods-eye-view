import test from 'node:test';
import assert from 'node:assert/strict';
import { npsQuery, normalizePublicProfile, normalizeNpsResponse } from './npsPeoplePlaces.js';
import { createNpsPeoplePlacesMiddleware } from './npsPeoplePlacesProxy.mjs';

const npsUrl = 'https://www.nps.gov/places/test-place.htm';
const place = { id: 'p1', title: 'Test Historic Place', listingDescription: '<b>Official</b> site', url: npsUrl, latitude: '43.8', longitude: '-103.4', isMapPinHidden: '0' };

function call(middleware, url, method = 'GET') {
  return new Promise((resolve) => {
    const result = { status: 0, headers: {}, body: null };
    middleware({ method, url }, {
      writeHead(status, headers) { result.status = status; result.headers = headers; },
      end(body) { result.body = JSON.parse(body); resolve(result); },
    });
  });
}

test('NPS URL builder allowlists resources and parks without putting a key in a URL', () => {
  const url = new URL(npsQuery('places', { parkCode: 'jeca' }));
  assert.equal(url.hostname, 'developer.nps.gov');
  assert.equal(url.searchParams.get('parkCode'), 'jeca');
  assert.equal(url.searchParams.has('api_key'), false);
  assert.throws(() => npsQuery('places', { parkCode: 'acad' }));
  assert.throws(() => npsQuery('webcams'));
});

test('People never become pins; hidden, closed, malformed and out-of-region places have no pins', () => {
  assert.equal(normalizePublicProfile(place, 'people').position, null);
  assert.deepEqual(normalizePublicProfile(place, 'places').position, [-103.4, 43.8]);
  assert.equal(normalizePublicProfile({ ...place, isMapPinHidden: 'true' }, 'places').position, null);
  assert.equal(normalizePublicProfile({ ...place, isOpenToPublic: '0' }, 'places').position, null);
  assert.equal(normalizePublicProfile({ ...place, latitude: '' }, 'places').position, null);
  assert.equal(normalizePublicProfile({ ...place, latitude: '38' }, 'places').position, null);
  assert.equal(normalizePublicProfile({ ...place, url: 'javascript:alert(1)' }, 'places'), null);
  assert.equal(normalizePublicProfile({ ...place, url: 'https://evil.example/item' }, 'places'), null);
});

test('NPS records contain minimal source-cited text and reject malformed envelopes', () => {
  const result = normalizeNpsResponse({ total: '1', data: [place] }, 'places');
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].summary, 'Official site');
  assert.equal(result.records[0].sourceUrl, npsUrl);
  assert.throws(() => normalizeNpsResponse({ total: 0 }, 'people'));
});

test('NPS proxy fails closed without a key and rejects unapproved requests', async () => {
  const middleware = createNpsPeoplePlacesMiddleware({ key: () => '' });
  assert.deepEqual((await call(middleware, '/status')).body, { configured: false });
  assert.equal((await call(middleware, '/places?parkCode=moru')).body.error, 'nps_key_required');
  assert.equal((await call(middleware, '/places?parkCode=evil')).status, 400);
  assert.equal((await call(middleware, '/places?parkCode=moru&api_key=leak')).status, 400);
  assert.equal((await call(middleware, '/places', 'POST')).status, 405);
});

test('NPS proxy sends key in header only, caches success, retains stale data during outage', async () => {
  let current = 1_000_000, calls = 0, outage = false;
  const middleware = createNpsPeoplePlacesMiddleware({
    key: () => 'test-secret', now: () => current,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(new URL(url).searchParams.has('api_key'), false);
      assert.equal(options.headers['X-Api-Key'], 'test-secret');
      if (outage) throw new Error('private upstream detail');
      return { ok: true, headers: { get: () => null }, text: async () => JSON.stringify({ total: '1', data: [place] }) };
    },
  });
  const first = await call(middleware, '/places?parkCode=moru');
  assert.equal(first.status, 200);
  assert.equal(first.body.state, 'ready');
  assert.equal(first.body.records[0].name, place.title);
  assert.equal(JSON.stringify(first.body).includes('test-secret'), false);
  assert.equal((await call(middleware, '/places?parkCode=moru')).body.state, 'cached');
  assert.equal(calls, 1);
  current += 16 * 60_000; outage = true;
  const stale = await call(middleware, '/places?parkCode=moru');
  assert.equal(stale.status, 200);
  assert.equal(stale.body.state, 'stale');
  assert.equal(JSON.stringify(stale.body).includes('private upstream detail'), false);
});
