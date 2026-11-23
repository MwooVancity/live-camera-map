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
  const tiny = pages.find((p) => p.route === '/cameras/united-states/california/tiny/');
  assert.equal(tiny.indexable, false);
  const xml = buildSitemap(pages, 'https://x.test');
  assert.ok(!xml.includes('/tiny/'));
  assert.ok(xml.includes('<loc>https://x.test/cameras/united-states/california/big/</loc><lastmod>2026-11-22</lastmod>'));
});

test('failing-fixture proof: with the gate off (min 1) the same page would be listed', () => {
  const pages = pageList(fixture, ['Tiny'], '2026-11-22').map((p) => ({ ...p, indexable: p.count === null || p.count >= 1 }));
  assert.ok(buildSitemap(pages, 'https://x.test').includes('/tiny/'), 'the gate is what keeps it out');
});

// ---- per-region curation (British Columbia added) ----
import { curatedPlaces } from '../src/lib/pages.mjs';
test('curatedPlaces: per region, each region has its own limit (California 10, British Columbia 5) and the 3-camera minimum', () => {
  const cams = [...Array.from({ length: 12 }, (_, i) => many(`CA${String(i).padStart(2, '0')}`, 3 + (i % 2), 'california')).flat(), ...Array.from({ length: 7 }, (_, i) => many(`BC${i}`, 3, 'british-columbia')).flat(), ...many('Small', 2, 'british-columbia')];
  const p = curatedPlaces(cams);
  assert.equal(p.filter((x) => x.region === 'california').length, 10);
  assert.equal(p.filter((x) => x.region === 'british-columbia').length, 5);
  assert.ok(!p.some((x) => x.city === 'Small'), 'two cameras is below the minimum');
  assert.deepEqual(p.slice(0, 3).map((x) => x.region), ['california', 'california', 'california'], 'the bigger region comes first');
  assert.deepEqual(curatedPlaces(cams, 2).filter((x) => x.region === 'british-columbia').length, 2, 'an explicit limit overrides the region default');
});
test('pageList: a region page and its city pages carry that region\'s own date, the hubs the newest', () => {
  const cams = [...many('A', 3, 'california'), ...many('B', 3, 'british-columbia')];
  const pl = pageList(cams, curatedPlaces(cams), '2026-11-23', [], { california: '2026-11-22', 'british-columbia': '2026-11-23' });
  const d = (route) => pl.find((p) => p.route === route).lastmod;
  assert.equal(d('/cameras/united-states/california/'), '2026-11-22'); assert.equal(d('/cameras/united-states/california/a/'), '2026-11-22');
  assert.equal(d('/cameras/canada/british-columbia/b/'), '2026-11-23'); assert.equal(d('/cameras/'), '2026-11-23');
});

// ---- country level ----
test('countriesWithPages and routes come from the one region->country table; a region with no country gets no page (failing fixture)', async () => {
  const { countriesWithPages, regionRoute, cityRoute, countryRoute } = await import('../src/lib/pages.mjs');
  const cams = [...many('A', 3, 'california'), ...many('B', 3, 'british-columbia'), ...many('Z', 5, 'atlantis')];
  assert.deepEqual(countriesWithPages(cams).sort(), ['canada', 'united-states']);
  assert.equal(regionRoute('atlantis'), null);
  assert.equal(cityRoute('atlantis', 'Z'), null);
  assert.equal(regionRoute('california'), '/cameras/united-states/california/');
  assert.equal(cityRoute('british-columbia', 'Fort St John'), '/cameras/canada/british-columbia/fort-st-john/');
  assert.equal(countryRoute('canada'), '/cameras/canada/');
  assert.deepEqual(regionsWithPages(cams).sort(), ['british-columbia', 'california'], 'atlantis has 5 cameras but no country row: no hub');
  const routes = pageList(cams, curatedPlaces(cams), '2026-11-22').map((p) => p.route);
  assert.ok(!routes.some((r) => r.includes('atlantis')));
  assert.ok(routes.includes('/cameras/united-states/') && routes.includes('/cameras/canada/'));
});
test('pageList: a country page carries the newest date of its own regions and the camera count of its regions', () => {
  const cams = [...many('A', 3, 'california'), ...many('B', 4, 'british-columbia')];
  const pl = pageList(cams, [], '2026-11-23', [], { california: '2026-11-22', 'british-columbia': '2026-11-20' });
  const row = (route) => pl.find((p) => p.route === route);
  assert.deepEqual([row('/cameras/united-states/').count, row('/cameras/united-states/').lastmod], [3, '2026-11-22']);
  assert.deepEqual([row('/cameras/canada/').count, row('/cameras/canada/').lastmod], [4, '2026-11-20']);
  assert.equal(row('/cameras/canada/').kind, 'country');
});

test('slugify drops accents instead of splitting the word (Finnish and Quebec place names)', async () => {
  const { slugify } = await import('../src/lib/pages.mjs');
  assert.equal(slugify('Hämeenlinna'), 'hameenlinna');
  assert.equal(slugify('Enontekiö'), 'enontekio');
  assert.equal(slugify('Québec (Capitale-Nationale)'), 'quebec-capitale-nationale');
  assert.equal(slugify('Saguenay—Lac-Saint-Jean'), 'saguenay-lac-saint-jean');
  assert.equal(slugify('Fort St. John'), 'fort-st-john');
});
