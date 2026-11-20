import test from 'node:test';
import assert from 'node:assert/strict';
import railroadsLayer from './blackHillsRailroads.js';
import { BLACK_HILLS_BBOX } from './blackHillsRailroadsData.js';

test('historic rail layer uses the bounded same-origin proxy and reports an outage without inventing lines', async () => {
  const priorFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (url, options) => {
    requests += 1;
    assert.equal(url, '/api/overpass');
    assert.equal(options.method, 'POST');
    const query = options.body.get('data');
    assert.ok(query.includes(BLACK_HILLS_BBOX));
    assert.ok(query.includes('abandoned|disused|razed'));
    return new Response(JSON.stringify({ error: 'Overpass proxy error' }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    railroadsLayer.init({});
    await railroadsLayer.enable();
    const stats = railroadsLayer.getStats();
    assert.equal(requests, 1);
    assert.equal(stats.status, 'unavailable');
    assert.equal(stats.count, 0);
    assert.match(stats.error, /HTTP 502/);
  } finally {
    railroadsLayer.destroy();
    globalThis.fetch = priorFetch;
  }
});
