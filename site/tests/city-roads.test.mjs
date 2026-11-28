// Step 1 of docs/decisions/2026-11-28-four-way-plan-beat-competitors.md: city pages for regions with no city field (nearest Natural Earth place),
// I-5 as one road across WA/OR/CA plus Washington's numbered routes, search finds them, road weather units, Austin-only Texas wording.
// Run from site/ after npm run build: node --test tests/city-roads.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { enrich, roadOf, statePrefix, ASSIGN_KM, CITY_FROM_PLACES } from '../src/lib/places-assign.mjs';
import { curatedPlaces, curatedRoads } from '../src/lib/pages.mjs';
import { buildEntries } from '../src/lib/search-index.mjs';
import { search } from '../src/lib/search-core.mjs';
import { rwisVal } from '../src/lib/labels.mjs';
import { readPages, titleOf } from './helpers.mjs';

const raw = JSON.parse(readFileSync('../data/camera-registry/cameras.json', 'utf8'));
const places = JSON.parse(readFileSync('../data/places.json', 'utf8')).places;
const cams = enrich(raw, places);
const pages = readPages();

test('roadOf: I/SR/US prefixes become the Caltrans spelling; anything else is no road', () => {
  assert.equal(roadOf('I-5 at MP 165.4: 5th Ave'), 'I-5');
  assert.equal(roadOf('SR 520 @ MP 3'), 'SR-520');
  assert.equal(roadOf('US 395 NSC at x'), 'US-395');
  assert.equal(roadOf('i-84'), 'I-84');
  assert.equal(roadOf('OR217'), '');
  assert.equal(roadOf('WSF Seattle Terminal'), '');
  assert.equal(statePrefix('washington-state', 'SR-520'), 'WA SR-520');
  assert.equal(statePrefix('washington-state', 'I-405'), 'WA I-405');
  assert.equal(statePrefix('oregon', 'I-5'), 'I-5');
  assert.equal(statePrefix('washington-state', 'US-101'), 'US-101');
});

test('enrich: a camera gets the nearest place within the radius, never one further away, and never overrides a city the source gave', () => {
  const pl = [['Near', 47.6, -122.33], ['Far', 48.6, -122.33]];
  const c = (id, lat, extra = {}) => ({ id, regionSlug: 'washington-state', name: 'I-5 at x', road: '', city: null, lat, lon: -122.33, ...extra });
  const out = enrich([c('a', 47.62), c('b', 47.6 + (ASSIGN_KM + 5) / 111), c('c', 47.6, { regionSlug: 'california', city: 'Given', road: 'SR-1' })], pl);
  assert.equal(out[0].city, 'Near');
  assert.equal(out[0].road, 'I-5');
  assert.equal(out[1].city, null);
  assert.equal(out[2].city, 'Given');
  assert.equal(out[2].road, 'SR-1');
});

test('every target region gets at least one city page with 3 or more cameras; Seattle exists', () => {
  const ps = curatedPlaces(cams);
  for (const r of CITY_FROM_PLACES) assert.ok(ps.some((p) => p.region === r && p.n >= 3), `${r}: no city page`);
  assert.ok(ps.some((p) => p.region === 'washington-state' && p.city === 'Seattle'));
  assert.ok(pages.has('/cameras/united-states/washington-state/seattle/'), 'Seattle page not built');
  assert.match(pages.get('/cameras/united-states/washington-state/seattle/'), /Natural Earth/);
});

test('I-5 is one road page across California, Oregon and Washington, in south-to-north order', () => {
  assert.ok(curatedRoads(cams).includes('I-5'));
  const html = pages.get('/roads/i-5/');
  assert.ok(html, 'no /roads/i-5/');
  for (const s of ['California', 'Oregon', 'Washington']) assert.match(titleOf(html), new RegExp(s));
  const order = [...html.matchAll(/data-camera="([^"]+)"/g)].map((m) => m[1]);
  const lat = new Map(cams.map((c) => [c.id, c.lat]));
  // the no-direction group (all Oregon and Washington cameras) must run south to north
  const none = order.filter((id) => !id.startsWith('caltrans'));
  assert.ok(none.length > 100);
  assert.ok(lat.get(none[0]) < lat.get(none.at(-1)), 'not south to north');
});

test('Washington numbered routes get road pages, and a Washington state route never merges into the California one', () => {
  assert.ok(!/Washington/.test(titleOf(pages.get('/roads/i-405/'))), 'LA I-405 took Washington cameras');
  for (const r of ['/roads/i-90/', '/roads/wa-sr-520/', '/roads/wa-i-405/']) assert.ok(pages.has(r), `${r} missing`);
});

test('search: I-5, I5 and Interstate 5 find the road page; Seattle goes to its city page, not the map', () => {
  const rows = buildEntries(cams, places).map((e) => [e.id, e.kind, e.name, e.norm, e.region, e.road, e.lat, e.lon, e.url, e.country]);
  for (const q of ['I-5', 'I5', 'Interstate 5']) assert.equal(search([{ rows }], q)[0].url, '/roads/i-5/', q);
  assert.equal(search([{ rows }], 'Seattle')[0].url, '/cameras/united-states/washington-state/seattle/');
});

test('road weather: a raw reading never shows as a bare number', () => {
  assert.equal(rwisVal(154, 'air temperature'), 'air temperature 154 (unit not stated by Caltrans)');
  assert.equal(rwisVal(null, 'wind'), null);
  for (const [route, html] of pages) assert.ok(!/(air temperature|visibility|wind|gust) \d+[,.]/.test(html.replace(/<[^>]+>/g, '')), `${route}: bare weather number`);
});

test('Texas (Austin) page says City of Austin cameras only in its title and heading', () => {
  const html = pages.get('/cameras/united-states/texas/');
  assert.match(titleOf(html), /City of Austin/);
  assert.match(html.match(/<h1[^>]*>([^<]*)</)[1], /City of Austin/);
});
