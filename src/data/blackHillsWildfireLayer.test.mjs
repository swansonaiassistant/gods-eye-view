import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlackHillsWildfireLayer } from './blackHillsWildfireLayer.js';

const incident = {
  type: 'Feature', id: 4257,
  geometry: { type: 'Point', coordinates: [-104.11, 44.29] },
  properties: { OBJECTID: 4257, IncidentName: 'Moskee RX', IncidentTypeCategory: 'RX',
    FireDiscoveryDateTime: 1794327833000, ModifiedOnDateTime_dt: 1795121210000 },
};

function harness(fetchImpl) {
  const dataSources = { current: null, removed: false,
    add(source) { this.current = source; },
    remove(source) { assert.equal(source, this.current); this.removed = true; },
  };
  const viewer = { dataSources };
  const layer = createBlackHillsWildfireLayer({ fetchImpl });
  layer.init(viewer);
  layer.enable();
  return { layer, viewer, dataSources };
}

test('renders the bounded live point and clears it on a valid empty refresh', async () => {
  let features = [incident];
  const { layer, viewer, dataSources } = harness(async () => ({ ok: true,
    json: async () => ({ type: 'FeatureCollection', features }),
  }));
  assert.equal(await layer.update(), true);
  assert.equal(layer.getStats().count, 1);
  assert.equal(dataSources.current.entities.values.length, 1);
  assert.match(layer.getStats().loadingLabel, /source updated/);
  assert.match(layer.getStats().loadingLabel, /Moskee RX \(prescribed fire\)/);
  assert.equal(layer.getRowControls().legend[0].label, 'prescribed fire');
  features = [];
  assert.equal(await layer.update(), true);
  assert.equal(layer.getStats().count, 0);
  assert.equal(dataSources.current.entities.values.length, 0);
  assert.match(layer.getStats().loadingLabel, /No incidents currently reported/);
  layer.destroy(viewer);
  assert.equal(dataSources.removed, true);
});

test('retains prior points as stale on outage and reports cold outage unavailable', async () => {
  let fail = false;
  const fetchImpl = async () => fail ? { ok: false, status: 503 } : {
    ok: true, json: async () => ({ type: 'FeatureCollection', features: [incident] }),
  };
  const warm = harness(fetchImpl);
  assert.equal(await warm.layer.update(), true);
  fail = true;
  assert.equal(await warm.layer.update(), true);
  assert.equal(warm.layer.getStats().status, 'stale');
  assert.equal(warm.layer.getStats().count, 1);
  assert.equal(warm.dataSources.current.entities.values.length, 1);
  warm.layer.destroy(warm.viewer);
  const cold = harness(fetchImpl);
  assert.equal(await cold.layer.update(), true);
  assert.equal(cold.layer.getStats().status, 'unavailable');
  cold.layer.destroy(cold.viewer);
});

test('ignores a late source response after the layer is disabled', async () => {
  let resolveFetch;
  const pendingFetch = new Promise((resolve) => { resolveFetch = resolve; });
  const { layer, viewer, dataSources } = harness(() => pendingFetch);
  const refresh = layer.update();
  layer.disable();
  resolveFetch({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [incident] }) });
  assert.equal(await refresh, false);
  assert.equal(layer.getStats().count, 0);
  assert.equal(dataSources.current.entities.values.length, 0);
  layer.destroy(viewer);
});

test('escapes provider incident names before storing Cesium HTML descriptions', async () => {
  const unsafe = { ...incident, properties: {
    ...incident.properties, IncidentName: '<img src=x onerror=alert(1)>',
  } };
  const { layer, viewer, dataSources } = harness(async () => ({ ok: true,
    json: async () => ({ type: 'FeatureCollection', features: [unsafe] }),
  }));
  assert.equal(await layer.update(), true);
  const description = dataSources.current.entities.values[0].description.getValue();
  assert.doesNotMatch(description, /<img/);
  assert.match(description, /&lt;img/);
  layer.destroy(viewer);
});

test('does not present a potentially truncated 500-record page as complete', async () => {
  const { layer, viewer, dataSources } = harness(async () => ({ ok: true,
    json: async () => ({ type: 'FeatureCollection', features: Array(500).fill(incident) }),
  }));
  assert.equal(await layer.update(), true);
  assert.equal(layer.getStats().status, 'unavailable');
  assert.match(layer.getStats().error, /safe limit/);
  assert.equal(dataSources.current.entities.values.length, 0);
  layer.destroy(viewer);
});
