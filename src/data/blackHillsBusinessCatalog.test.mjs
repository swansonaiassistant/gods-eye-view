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
  assert.equal(normalizeBusinessPlace({ id:'a', names:{primary:'Test'}, geometry:{type:'Point',coordinates:{x:-103,y:44}} }), null);
});
test('classifies the current Overture taxonomy without legacy categories', () => {
  const item = normalizeBusinessPlace({
    id: 'modern123', geometry: { type: 'Point', coordinates: [-103.23, 44.08] },
    names: { primary: 'Example Electrical' },
    taxonomy: { primary: 'electrical_contractor', hierarchy: ['services', 'contractor', 'electrical_contractor'], alternates: [] },
    basic_category: 'contractor',
  });
  assert.equal(item.category, 'contractors-trades');
  assert.ok(item.originalCategories.includes('electrical_contractor'));
});
test('bounds search volume, rejects unsupported categories and invalid coordinates', () => {
  const bounds = { south: 43, north: 45, west: -105, east: -102 };
  assert.equal(businessViewportQuery(bounds, { limit: 900 }).limit, 300);
  assert.equal(businessViewportQuery(bounds, { category: 'unknown' }), null);
  assert.equal(businessViewportQuery({ ...bounds, south: 46 }), null);
  assert.equal(businessViewportQuery({ south: 40, north: 41, west: -105, east: -103 }), null);
  const clipped = businessViewportQuery({ ...bounds, privateNote: 'do not forward' });
  assert.equal(clipped.south, 43.25);
  assert.equal(clipped.east, -102.65);
  assert.equal(Object.hasOwn(clipped, 'privateNote'), false);
});
