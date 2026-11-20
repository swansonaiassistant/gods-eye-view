import test from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS_CATEGORIES, categorizeBusiness, normalizeBusinessPlace, businessViewportQuery } from './blackHillsBusinessCatalog.js';

test('supports broad categories and important trade specialties', () => {
  assert.ok(BUSINESS_CATEGORIES.length >= 12);
  assert.equal(categorizeBusiness(['hvac_contractor']), 'contractors-trades');
  assert.equal(categorizeBusiness(['electrician']), 'contractors-trades');
  assert.equal(categorizeBusiness(['medical_clinic']), 'healthcare-care');
});
test('accepts regional point and preserves uncertainty', () => {
  const item = normalizeBusinessPlace({
    id: 'abc123', geometry: { type: 'Point', coordinates: [-103.23, 44.08] },
    names: { primary: 'Example HVAC' }, categories: { primary: 'hvac_contractor' },
  });
  assert.equal(item.id, 'overture:abc123');
  assert.equal(item.category, 'contractors-trades');
  assert.equal(item.verification, 'unverified');
  assert.equal(item.openNow, undefined);
});
test('rejects out-of-region and malformed records', () => {
  assert.equal(normalizeBusinessPlace({ id:'a', names:{primary:'Test'}, geometry:{type:'Point',coordinates:[-74,40]} }), null);
  assert.equal(normalizeBusinessPlace({ id:'a', names:{primary:'Test'}, geometry:{type:'Polygon',coordinates:[]} }), null);
});
test('bounds search volume, rejects unsupported categories and invalid coordinates', () => {
  const bounds = { south: 43, north: 45, west: -105, east: -102 };
  assert.equal(businessViewportQuery(bounds, { limit: 900 }).limit, 300);
  assert.equal(businessViewportQuery(bounds, { category: 'unknown' }), null);
  assert.equal(businessViewportQuery({ ...bounds, south: 46 }), null);
});
