import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeEntries } from '../src/lib/search-index.mjs';

const cams = (n, lat, lon, regionSlug) => Array.from({ length: n }, (_, i) => ({ id: `${regionSlug}-${i}`, regionSlug, regionName: regionSlug, lat, lon: lon + i / 1000 }));

test('a big place with no city field in the camera list is searchable, and only where cameras really are', () => {
  const usable = [...cams(5, 47.6, -122.33, 'washington-state'), ...cams(4, 40.71, -74.0, 'washington-state')];
  const out = placeEntries([['Seattle', 47.61, -122.33], ['Too Few', 40.71, -74.0], ['Nowhere', 0, 0]], usable, new Set());
  assert.deepEqual(out.map((e) => e.name), ['Seattle']);
  assert.match(out[0].url, /^\/map\/\?lat=47\.6100&lon=-122\.3300/);
});

test('a place already listed is not repeated, and a border place is skipped rather than mislabelled', () => {
  const usable = [...cams(5, 49.0, -122.75, 'british-columbia'), ...cams(5, 48.99, -122.75, 'washington-state')];
  assert.equal(placeEntries([['Border', 49.0, -122.75]], usable, new Set()).length, 0);
  assert.equal(placeEntries([['Seattle', 47.6, -122.33]], cams(5, 47.6, -122.33, 'washington-state'), new Set(['town:washington-state:seattle'])).length, 0);
});
