// Code review 2026-11-25 batch C: site findings C1, C2, C3, C7, C8. Built-page tests need `npm run build` first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPages } from './helpers.mjs';
import { REGION_COUNTRY, countsBy } from '../../ops/importers/lib/registry.mjs';
import { REGIONS, regionInfo } from '../src/lib/pages.mjs';
import { neverChecked } from '../src/lib/health.mjs';

const cameras = JSON.parse(readFileSync('../data/camera-registry/cameras.json', 'utf8'));
const pages = readPages();

test('C1: every "on the whole road" count on a built city page equals the California count the road page uses', () => {
  const ca = countsBy(cameras.filter((c) => c.regionSlug === 'california'), 'road');
  let checked = 0;
  for (const [route, html] of pages) {
    if (!route.startsWith('/cameras/united-states/california/')) continue;
    for (const m of html.matchAll(/href="\/roads\/[^"]+\/">([^<]+) traffic cameras<\/a>: \d+ in [^<]*?, (\d+) on the whole road/g)) {
      assert.equal(Number(m[2]), ca[m[1]], `${route} ${m[1]}`);
      checked++;
    }
  }
  assert.ok(checked > 0, 'at least one road line was checked');
  const oak = pages.get('/cameras/united-states/california/oakland/');
  if (oak && ca['I-80']) assert.ok(!oak.includes(`${countsBy(cameras, 'road')['I-80']} on the whole road`) || countsBy(cameras, 'road')['I-80'] === ca['I-80']);
});

test('C3: every REGION_COUNTRY slug has a REGIONS row, and an unknown region still gets safe text (no build crash)', () => {
  for (const slug of Object.keys(REGION_COUNTRY)) assert.ok(REGIONS[slug], `REGIONS has no row for ${slug}`);
  const i = regionInfo('no-such-region');
  assert.equal(typeof i.placeText, 'function');
  assert.equal(typeof i.cityText, 'function');
  assert.equal(i.placeText({ total: 3 }), '');
  assert.ok(Array.isArray(i.caveats));
});

test('C2: the home page does not say every camera is checked while some sources are never requested', () => {
  const n = neverChecked(cameras);
  assert.ok(n > 0, 'quebec, nsw, taiwan, a22, louisiana are skipped by the checker');
  const home = pages.get('/');
  assert.ok(!/each one checked by us/.test(home));
  assert.ok(home.includes(`${n} cannot be checked`));
});

test('C7: a saved entry without savedAt or place does not blank the list', async () => {
  const store = { 'wtc-saved-cameras-v1': JSON.stringify([{ url: 'https://example.test/a', label: 'A' }, { url: 'https://example.test/b', label: 'B', place: 'X', savedAt: '2026-11-01T00:00:00Z' }]) };
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
  const { readSaved } = await import('../src/scripts/saved.ts');
  const list = readSaved();
  assert.equal(list.length, 2);
  for (const s of list) { assert.equal(typeof s.savedAt, 'string'); assert.equal(typeof s.place, 'string'); s.savedAt.slice(0, 10); }
});

test('C8: the /map/ footer does not claim no third-party fonts; other pages keep the claim', () => {
  const foot = (h) => (h.match(/<footer[\s\S]*<\/footer>/) || [''])[0];
  assert.ok(!/no third-party scripts or fonts/.test(foot(pages.get('/map/'))));
  assert.ok(/fonts/.test(foot(pages.get('/map/'))));
  assert.ok(/no third-party scripts or fonts/.test(foot(pages.get('/status/'))));
  assert.ok(!/Camera data: Caltrans \(California Department of Transportation\) for California and DriveBC/.test(foot(pages.get('/cameras/united-states/finland/') || pages.get('/'))));
});
