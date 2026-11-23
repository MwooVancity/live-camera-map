// Search relevance: 40+ hand-written queries with hand-written expected URLs (rule 'search-relevance'). Run from site/: node --test tests/search.relevance.test.mjs
// Real registry for the real pages; a small fixture registry for the cases the real one lacks (same town name in two regions, accents, a road page for SR-91).
// NOT supported, and tested as such: typos ("Sacremento" finds nothing). Expected URLs are written by hand from the page address scheme, never copied from the output.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildEntries } from '../src/lib/search-index.mjs';
import { search, normalize, roadKeys } from '../src/lib/search-core.mjs';

const toSets = (entries) => [{ rows: entries.map((e) => [e.id, e.kind, e.name, e.norm, e.region, e.road, e.lat, e.lon, e.url, e.country]) }];
const real = toSets(buildEntries(JSON.parse(readFileSync('../data/camera-registry/cameras.json', 'utf8'))));
const US = '/cameras/united-states/california/', BC = '/cameras/canada/british-columbia/';

// [query, expected top-1 url]
const TOP1 = [
  ['Los Angeles', US + 'los-angeles/'], ['los angeles', US + 'los-angeles/'], ['  LOS   ANGELES ', US + 'los-angeles/'], ['los ang', US + 'los-angeles/'],
  ['san jose', US + 'san-jose/'], ['San José', US + 'san-jose/'], ['sacramento', US + 'sacramento/'], ['Anah', US + 'anaheim/'], ['oakland', US + 'oakland/'],
  ['Elkford', BC + 'elkford/'], ['fort st john', BC + 'fort-st-john/'], ['Fort St. John', BC + 'fort-st-john/'], ['fort st', BC + 'fort-st-john/'], ['campbell r', BC + 'campbell-river/'], ['dawson', BC + 'dawson-creek/'],
  ['I-405', '/roads/i-405/'], ['I 405', '/roads/i-405/'], ['Interstate 405', '/roads/i-405/'], ['i405', '/roads/i-405/'], ['i-5', '/roads/i-5/'], ['interstate 5', '/roads/i-5/'], ['I 80', '/roads/i-80/'],
  ['US-101', '/roads/us-101/'], ['us 101', '/roads/us-101/'], ['U.S. 101', '/roads/us-101/'], ['SR-99', '/roads/sr-99/'], ['State Route 99', '/roads/sr-99/'], ['Highway 1', '/roads/sr-1/'], ['hwy 1', '/roads/sr-1/'], ['i 10', '/roads/i-10/'],
  ['california', '/cameras/united-states/california/'], ['british columbia', '/cameras/canada/british-columbia/'], ['canada', '/cameras/canada/'], ['united states', '/cameras/united-states/'],
];
for (const [q, url] of TOP1) test(`top-1 "${q}" -> ${url}`, () => assert.equal(search(real, q)[0]?.url, url));

test('top-5: "interstate 4" (partial road number) still offers I-405', () => assert.ok(search(real, 'interstate 4', 5).some((r) => r.url === '/roads/i-405/')));
test('top-5: "i 40" offers I-405 and never I-5', () => { const r = search(real, 'i 40', 5).map((x) => x.url); assert.ok(r.includes('/roads/i-405/')); assert.ok(!r.includes('/roads/i-5/')); });
test('"i 80" never ranks an I-805 camera above the I-80 cameras (whole-road match)', () => assert.ok(search(real, 'i 80', 10).every((r) => r.kind === 'road' || /\bi-80\b/i.test(r.name))));

// a town with no page: its map position, and no page address
test('town with no page: "britannia" -> its map position first', () => { const r = search(real, 'britannia')[0]; assert.equal(r.kind, 'town'); assert.ok(r.url.startsWith('/map/?lat=49.6239&lon=-123.2062&z=11'), r.url); });
test('town with no page: "los gatos" is in the top 5 with a map position', () => assert.ok(search(real, 'los gatos', 5).some((r) => r.kind === 'town' && r.url.startsWith('/map/?lat=37.18'))));
test('a city with a page beats a town of a similar name ("los" -> Los Angeles first)', () => assert.equal(search(real, 'los')[0].url, US + 'los-angeles/'));

// no result, empty, typos
test('no result: gibberish returns nothing', () => assert.deepEqual(search(real, 'zzzzqq'), []));
test('no result: empty and blank queries return nothing', () => { assert.deepEqual(search(real, ''), []); assert.deepEqual(search(real, '   '), []); assert.deepEqual(search(real, '--'), []); });
test('typos are NOT supported: "Sacremento" does not find Sacramento', () => assert.ok(!search(real, 'Sacremento', 10).some((r) => r.url === US + 'sacramento/')));
test('a road with no page (SR-91) falls back to camera names, never a road page that does not exist', () => { const r = search(real, 'SR-91', 10); assert.ok(r.length && r.every((x) => x.kind === 'camera' && !x.url.startsWith('/roads/sr-91'))); });
test('word-start matching: "creek" finds only names with a word starting "creek"', () => { const r = search(real, 'creek', 10); assert.ok(r.length); assert.ok(r.every((x) => (' ' + x.norm).includes(' creek'))); });

// every result shows kind, region AND country; at most 10; never the same id twice
test('every result has a kind, region and country (200 mixed queries)', () => {
  for (const q of ['a', 'san', 'i', 'cal', 'hwy', 'creek', 'north', 'los', 'fort', 'sr', 'us', 'ca', 'b', 'mission', 'road', 'at', '1', '99', 'park', 'ave']) {
    const r = search(real, q); assert.ok(r.length <= 10);
    assert.equal(new Set(r.map((x) => x.id)).size, r.length);
    for (const x of r) { assert.ok(x.kind && x.region && x.country, `${q}: ${JSON.stringify(x)}`); }
  }
});

// ---- fixture registry: ambiguity, accents, road page that exists ----
const mk = (id, region, city, road, name, lat, lon) => ({ id, sourceId: region === 'california' ? 'caltrans' : 'drivebc', name, road, direction: '', city, regionSlug: region, regionName: region === 'california' ? 'California' : 'British Columbia', lat, lon, feedType: 'still', officialUrl: `https://example.gov/${id}.jpg`, officialUrlLastVerified: null, lastSeen: '2026-11-23T00:00:00Z' });
const three = (pre, region, city, road, lat, lon) => [1, 2, 3].map((i) => mk(`${pre}-${i}`, region, city, road, `${city} cam ${i}`, lat + i / 1000, lon));
const fx = toSets(buildEntries([
  ...three('ca-spr', 'california', 'Springfield', 'SR-91', 36.1, -120.1), ...three('bc-spr', 'british-columbia', 'Springfield', 'Highway 7', 49.1, -122.1),
  ...three('bc-vic', 'british-columbia', 'Victoria', 'Highway 1', 48.4, -123.3), mk('ca-vic-1', 'california', 'Victoria', 'I-405', 'Victoria Ave - N', 33.9, -117.9),
  ...three('ca-sjo', 'california', 'San José', 'I-405', 37.3, -121.9), ...three('ca-i405', 'california', 'Westwood', 'I-405', 34.0, -118.4),
  ...three('ca-us101', 'california', 'Salinas', 'US-101', 36.6, -121.6), ...three('ca-sr1', 'california', 'Monterey', 'SR-1', 36.6, -121.9),
  mk('bc-lp-1', 'british-columbia', 'Lonely Pine', 'Highway 3', 'Lonely Pine - N', 49.5, -120.5), mk('ca-lp-1', 'california', 'Quiet Gulch', 'SR-299', 'Quiet Gulch Rd - E', 40.5, -122.5),
]));
const urlsOf = (q, n = 10) => search(fx, q, n).map((r) => r.url);
const SPR_CA = US + 'springfield/', SPR_BC = BC + 'springfield/';
test('fixture: same town name in two regions and two countries gives two results with their own page, region and country', () => {
  const r = search(fx, 'springfield', 2);
  assert.deepEqual(r.map((x) => x.url).sort(), [SPR_BC, SPR_CA].sort());
  assert.deepEqual(r.map((x) => `${x.region}, ${x.country}`).sort(), ['British Columbia, Canada', 'California, United States']);
});
test('fixture: "springfield" with a region word is not supported as a filter, both stay in the top 2', () => assert.equal(new Set(urlsOf('springfield', 2)).size, 2));
test('fixture: Victoria in BC has a page and ranks first; Victoria in California (no page) is a map link in the top 5', () => {
  assert.equal(urlsOf('victoria')[0], BC + 'victoria/');
  assert.ok(search(fx, 'victoria', 5).some((r) => r.kind === 'town' && r.region === 'California' && r.url.startsWith('/map/?lat=33.9')));
});
test('fixture: accents both ways: "san jose" and "san josé" and "SAN JOSÉ" -> the same page', () => { for (const q of ['san jose', 'san josé', 'SAN JOSÉ']) assert.equal(urlsOf(q)[0], US + 'san-jose/', q); });
test('fixture: road aliases reach the same road page', () => { for (const q of ['SR-91', 'sr 91', 'State Route 91', 'ca 91', 'sr91']) assert.equal(urlsOf(q)[0], '/roads/sr-91/', q); });
test('fixture: "Highway 1" finds SR-1 (road page) first', () => assert.equal(urlsOf('Highway 1')[0], '/roads/sr-1/'));
test('fixture: US-101 aliases', () => { for (const q of ['US-101', 'US 101', 'us101', 'US Highway 101']) assert.equal(urlsOf(q)[0], '/roads/us-101/', q); });
test('fixture: exact name beats kind order (a camera named exactly "springfield cam 1" is not outranked by prefix matches)', () => assert.equal(search(fx, 'springfield cam 1')[0].kind, 'camera'));
test('fixture: a camera in a town with no page and a California road page links to the road page; a BC camera with no page links out to the official source', () => {
  assert.equal(search(fx, 'quiet gulch rd')[0].url, 'https://example.gov/ca-lp-1.jpg'); // SR-299 has only 1 camera: no road page, so the official source
  const lone = search(fx, 'lonely pine', 5);
  assert.equal(lone[0].kind, 'town'); assert.ok(lone[0].url.startsWith('/map/?lat=49.5'));
  assert.equal(lone.find((r) => r.kind === 'camera').url, 'https://example.gov/bc-lp-1.jpg');
});
test('fixture: no result in any query points at a per-camera page', () => {
  for (const q of ['springfield', 'victoria', 'lonely', 'cam', 'sr 91', 'i 405', 'a']) for (const u of urlsOf(q)) assert.ok(!/^\/cameras\/[^/]+\/[^/]+\/[^/]+\/[^/]+\//.test(u), u);
});

// ---- the alias and normalize functions themselves ----
test('normalize: case, accents, punctuation, spacing', () => { assert.equal(normalize('  Montréal-Nord, QC. '), 'montreal nord qc'); assert.equal(normalize("O'Brien"), 'obrien'); });
test('roadKeys: aliases, partial digits, and non-roads', () => {
  assert.deepEqual(roadKeys('interstate 405'), ['i 405']); assert.deepEqual(roadKeys('i405'), ['i 405']); assert.deepEqual(roadKeys('u s 101'), ['us 101']);
  assert.deepEqual(roadKeys('highway 1'), ['sr 1', 'us 1', 'hwy 1', 'highway 1']); assert.deepEqual(roadKeys('i 4'), ['i 4']); assert.deepEqual(roadKeys('irvine'), []); assert.deepEqual(roadKeys('i 4050'), []);
});
