import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPEDITIONS, ENGAGEMENTS, HISTORICAL_CONTEXT, validateHistoricalCatalog } from './blackHillsExpeditionsCatalog.js';
test('expeditions contain distinct Raynolds 1859 and Reynolds 1876 records',()=>{
  assert.notEqual(EXPEDITIONS.find(e=>e.id==='raynolds-1859')?.title,EXPEDITIONS.find(e=>e.id==='reynolds-1876')?.title);
  assert.equal(validateHistoricalCatalog(),true);
});
test('historical candidates have no invented routes or site coordinates',()=>{
  assert.ok(EXPEDITIONS.every(e=>!('geometry' in e) && !('latitude' in e)));
  assert.ok(ENGAGEMENTS.length>=3);
  assert.ok(HISTORICAL_CONTEXT.some(x=>x.id==='indigenous-perspectives'));
  assert.throws(()=>validateHistoricalCatalog([{id:'foo',sources:['https://example.com'],latitude:44}],[]),/Unverified geographic placement/);
});
