import test from 'node:test';
import assert from 'node:assert/strict';
import { BLACK_HILLS_DRONE_VIDEOS, youtubeWatchUrl, catalogEntryForLocation } from './blackHillsVideoCatalog.js';

test('archive starts with four research candidates, not fabricated geotags', () => {
  assert.equal(BLACK_HILLS_DRONE_VIDEOS.length, 4);
  assert.ok(BLACK_HILLS_DRONE_VIDEOS.every((entry) => !('latitude' in entry) && !('longitude' in entry)));
  assert.equal(catalogEntryForLocation('signal-rock')?.verification, 'link-and-uploader-verified');
  assert.equal(catalogEntryForLocation('signal-rock')?.uploader, 'Black Hills Industrial History');
  assert.match(catalogEntryForLocation('signal-rock')?.corridor, /unverified/);
  assert.equal(BLACK_HILLS_DRONE_VIDEOS.filter((entry) => entry.youtubeId).length, 1);
});
test('only safe canonical YouTube watch links are accepted', () => {
  assert.equal(youtubeWatchUrl('NdKwv8Nmaw0'), 'https://www.youtube.com/watch?v=NdKwv8Nmaw0');
  assert.equal(youtubeWatchUrl('javascript:'), null);
  assert.equal(youtubeWatchUrl(null), null);
});
