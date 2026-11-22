// Unit tests for the noindex gate and sitemap, with fixtures (no build needed).
import test from 'node:test';
import assert from 'node:assert/strict';
import { isIndexable, pageList, buildSitemap, curatedCities, regionsWithPages } from '../src/lib/pages.mjs';

const cam = (id, city, region = 'california') => ({ id, city, regionSlug: region, regionName: region, road: 'I-5', direction: 'North', lat: 1, lon: 1, feedType: 'still' });
const many = (city, n, region) => Array.from({ length: n }, (_, i) => cam(`${city}-${i}`, city, region));
const fixture = [...many('Big', 5), ...many('Tiny', 2), ...many('Edge', 3), ...many('Ont', 2, 'ontario')];

test('isIndexable: 2 is noindex, 3 is indexable', () => {
  assert.equal(isIndexable(2), false);
  assert.equal(isIndexable(3), true);
});

test('curated cities only include cities with 3 or more cameras', () => {
  assert.deepEqual(curatedCities(fixture), ['Big', 'Edge']);
});

test('a region with fewer than 3 cameras gets no hub', () => {
  assert.deepEqual(regionsWithPages(fixture), ['california']);
});

test('a forced low-count city is noindex and left out of the sitemap', () => {
  const pages = pageList(fixture, ['Big', 'Tiny'], '2026-11-22');
  const tiny = pages.find((p) => p.route === '/cameras/california/tiny/');
  assert.equal(tiny.indexable, false);
  const xml = buildSitemap(pages, 'https://x.test');
  assert.ok(!xml.includes('/tiny/'));
  assert.ok(xml.includes('<loc>https://x.test/cameras/california/big/</loc><lastmod>2026-11-22</lastmod>'));
});

test('failing-fixture proof: with the gate off (min 1) the same page would be listed', () => {
  const pages = pageList(fixture, ['Tiny'], '2026-11-22').map((p) => ({ ...p, indexable: p.count === null || p.count >= 1 }));
  assert.ok(buildSitemap(pages, 'https://x.test').includes('/tiny/'), 'the gate is what keeps it out');
});
