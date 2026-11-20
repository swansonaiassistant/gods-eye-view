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
  assert.throws(()=>validateHistoricalCatalog([],[],[{id:'private-site',sources:['https://example.com'],geometry:{}}]),/Unverified geographic placement/);
});

test('reviewed source rows retain the correct campaign identities and engagement spans',()=>{
  const raynolds=EXPEDITIONS.find(e=>e.id==='raynolds-1859');
  const reynolds=EXPEDITIONS.find(e=>e.id==='reynolds-1876');
  assert.equal(raynolds.end,'1860');
  assert.match(raynolds.sources[0],/nps\.gov\/deto\/learn\/historyculture\/early-exploration/);
  assert.match(reynolds.sources[0],/history\.sd\.gov\/archives/);
  assert.deepEqual(ENGAGEMENTS.filter(e=>['little-bighorn-1876','slim-buttes-1876'].includes(e.id))
    .map(({start,end})=>[start,end]),[['1876-06-25','1876-06-26'],['1876-09-08','1876-09-09']]);
  assert.ok([...EXPEDITIONS,...ENGAGEMENTS,...HISTORICAL_CONTEXT]
    .flatMap(e=>e.sources).every(u=>!u.includes('/B-01.pdf')));
});
