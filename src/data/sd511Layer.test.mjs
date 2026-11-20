import test from 'node:test';
import assert from 'node:assert/strict';
import { createSd511Layer } from './sd511Layer.js';
const report = { id: '1:0', categories: ['closure'], route: 'US-16A', start: [-103.42, 43.89],
  end: [-103.41, 43.9], description: 'road closed', source: 'https://www.sd511.org/',
  locationNote: 'Official route endpoints only; no road-path geometry supplied.', updatedAt: 1795100000000 };
function harness(fetchImpl) {
  const sources = { current: null, add(source) { this.current = source; }, remove() {} };
  const viewer = { dataSources: sources, scene: { requestRender() {} } };
  const layer = createSd511Layer({ fetchImpl, parseXml: () => [report] });
  layer.init(viewer); layer.enable();
  return { viewer, layer, sources };
}
test('renders source endpoints, never an inferred road line', async () => {
  const { layer, sources } = harness(async () => ({ ok: true, text: async () => '<SDDOT/>',
    headers: { get: () => null } }));
  assert.equal(await layer.update(), true);
  assert.equal(layer.getStats().count, 1);
  assert.equal(sources.current.entities.values.length, 2);
  assert.ok(sources.current.entities.values.every((entity) => !entity.polyline));
  layer.disable();
  assert.equal(sources.current.show, false);
});
test('reports cold outage and preserves warm records as stale', async () => {
  let fail = false;
  const fetchImpl = async () => fail ? { ok: false, status: 503 } : { ok: true,
    text: async () => '<SDDOT/>', headers: { get: () => null } };
  const { layer } = harness(fetchImpl);
  assert.equal(await layer.update(), true);
  fail = true;
  assert.equal(await layer.update(), true);
  assert.equal(layer.getStats().status, 'stale');
  assert.equal(layer.getStats().count, 1);
  const cold = harness(fetchImpl);
  assert.equal(await cold.layer.update(), true);
  assert.equal(cold.layer.getStats().status, 'unavailable');
});
test('ignores a late response after disable', async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const { layer } = harness(() => pending);
  const update = layer.update(); layer.disable();
  resolve({ ok: true, text: async () => '<SDDOT/>', headers: { get: () => null } });
  assert.equal(await update, false);
  assert.equal(layer.getStats().count, 0);
});
