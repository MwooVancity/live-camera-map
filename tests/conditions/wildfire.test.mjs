// Wildfire feed (NIFC WFIGS perimeters): parsing, keep-near filter, never replacing a good file with a bad one, licence gate, freshness.
// Fixture tests/conditions/fixtures/wildfire-nifc.json is hand-made (near, multipolygon, prescribed burn, far, no shape).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outerPoints, sampleRing, parseFeature, buildDoc, usableWildfire, wildfiresNear, WILDFIRE_SOURCE_ID, WILDFIRE_MAX_AGE_MIN, pageUrl } from '../../ops/importers/lib/wildfire.mjs';
import { run, fetchAll, placesOf } from '../../ops/importers/wildfire.mjs';
import { isEnabled } from '../licensing/gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = () => JSON.parse(readFileSync(join(here, 'fixtures', 'wildfire-nifc.json'), 'utf8'));
const NOW = new Date('2026-11-22T22:50:00Z');
const perms = JSON.parse(readFileSync(resolve(here, '../../data/source-permissions.json'), 'utf8')).sources;
const cams = JSON.parse(readFileSync(resolve(here, '../../data/camera-registry/cameras.json'), 'utf8'));
const SD = { lat: 32.7866, lon: -117.1184 };
const quiet = () => {};
const outFile = () => join(mkdtempSync(join(tmpdir(), 'fire-')), 'wildfire.json');
const ok = async () => fx();

test('licence row: enabled by the gate (feed-licence); max age is 6 hours', () => {
  const row = perms.find((s) => s.id === WILDFIRE_SOURCE_ID);
  assert.ok(row && isEnabled(row, NOW));
  assert.equal(WILDFIRE_MAX_AGE_MIN, 360);
});
test('request: only the fields needed, geojson, simplified server side, stable paging order', () => {
  const u = new URL(pageUrl(2000));
  assert.equal(u.searchParams.get('f'), 'geojson'); assert.equal(u.searchParams.get('maxAllowableOffset'), '0.001');
  assert.equal(u.searchParams.get('resultOffset'), '2000'); assert.ok(u.searchParams.get('orderByFields'));
  assert.ok(!/\*/.test(u.searchParams.get('outFields')));
});
test('outerPoints / sampleRing: polygons and multipolygons, bad coordinates dropped, ring capped at 20 as [lat, lon]', () => {
  assert.equal(outerPoints({ type: 'Point', coordinates: [1, 2] }).length, 0);
  assert.equal(outerPoints({ type: 'Polygon', coordinates: [[[-117, 32], [999, 32], [-117.1, 32.1]]] }).length, 2);
  const many = Array.from({ length: 500 }, (_, i) => [-117 + i / 1000, 32 + i / 1000]);
  const r = sampleRing(many);
  assert.equal(r.length, 20); assert.deepEqual(r[0], [32, -117]);
});
test('parseFeature: name cleaned, state trimmed, dates ISO, centre = bbox middle; prescribed burn and no-shape dropped and counted', () => {
  const drop = {};
  const all = fx().features.map((f) => parseFeature(f, drop));
  assert.equal(all[0].name, 'Near Fire'); assert.equal(all[0].state, 'CA'); assert.equal(all[0].updatedAt, '2026-11-22T20:00:00.000Z');
  assert.equal(all[0].lat, 32.9); assert.equal(all[0].lon, -117);
  assert.equal(all[1].percentContained, null); assert.equal(all[1].acres, null);
  assert.equal(all[2], null); assert.deepEqual(drop, { prescribedBurn: 1, noGeometry: 1 });
});
test('buildDoc: keeps fires within 175 km of a place only; fields, source, attribution, generatedAt, fetchedCount', () => {
  const d = buildDoc({ collection: fx(), places: [SD], prev: null, now: NOW });
  assert.deepEqual(d.items.map((i) => i.name), ['Near Fire', 'Spot Complex']); // Maine, a fire 330 km away and the burn are out
  assert.equal(d.generatedAt, NOW.toISOString()); assert.equal(d.fetchedCount, 6);
  assert.match(d.attribution, /National Interagency Fire Center/); assert.equal(d.source, 'NIFC WFIGS (US public domain)');
  for (const i of d.items) assert.ok(i.ring.length >= 1 && i.ring.length <= 20);
});
test('buildDoc refuses: error body, wrong type, no features array, empty after a good run, under half the previous count, unusable shapes', () => {
  const prev = { fetchedCount: 10 };
  for (const bad of [{ error: { code: 500, message: 'x' } }, { type: 'Feature' }, { type: 'FeatureCollection' }, null, 'text']) assert.throws(() => buildDoc({ collection: bad, places: [SD], prev: null, now: NOW }), /feature collection/);
  assert.throws(() => buildDoc({ collection: { type: 'FeatureCollection', features: [] }, places: [SD], prev, now: NOW }), /empty answer/);
  assert.throws(() => buildDoc({ collection: { type: 'FeatureCollection', features: fx().features.slice(0, 4) }, places: [SD], prev, now: NOW }), /only 4 perimeters/);
  assert.throws(() => buildDoc({ collection: { type: 'FeatureCollection', features: [{ properties: { a: 1 }, geometry: { type: 'Polygon', coordinates: [] } }] }, places: [SD], prev: null, now: NOW }), /usable shape/);
});
test('buildDoc: a first run with a genuinely empty list is a valid file (nothing to compare against)', () => {
  assert.deepEqual(buildDoc({ collection: { type: 'FeatureCollection', features: [] }, places: [SD], prev: null, now: NOW }).items, []);
});
test('usableWildfire: fresh shows, 6 h 1 min old, garbage and wrong shape are empty (feed-fresh)', () => {
  const d = buildDoc({ collection: fx(), places: [SD], prev: null, now: NOW });
  assert.equal(usableWildfire(d, new Date(NOW.getTime() + 359 * 60000)).length, 2);
  assert.deepEqual(usableWildfire(d, new Date(NOW.getTime() + 361 * 60000)), []);
  assert.deepEqual(usableWildfire({ ...d, generatedAt: 'x' }, NOW), []); assert.deepEqual(usableWildfire({ items: 'x' }, NOW), []); assert.deepEqual(usableWildfire(null, NOW), []);
});
test('wildfiresNear: nearest first, beyond 50 km not listed, measured to the nearest ring point', () => {
  const d = buildDoc({ collection: fx(), places: [SD], prev: null, now: NOW });
  const near = wildfiresNear(d.items, [SD]);
  assert.deepEqual(near.map((i) => i.name), ['Near Fire', 'Spot Complex']);
  assert.ok(near[0].km < near[1].km && near[1].km < 50);
  assert.deepEqual(wildfiresNear(d.items, [{ lat: 36, lon: -117 }]), []);
});
test('run: writes data, report counts; a later error body, HTML 200 and empty list each keep the first file byte for byte', async () => {
  const f = outFile();
  const a = await run({ fetcher: ok, outFile: f, now: NOW, cams, perms, log: quiet });
  assert.equal(a.written, true); assert.equal(a.fetched, 6);
  const before = readFileSync(f, 'utf8');
  const later = new Date(NOW.getTime() + 60000);
  for (const fetcher of [async () => ({ error: { code: 400, message: 'Invalid query' } }), async () => { throw new Error('invalid JSON (HTML or cut-off body?)'); }, async () => ({ type: 'FeatureCollection', features: [] })]) {
    const r = await run({ fetcher, outFile: f, now: later, cams, perms, log: quiet });
    assert.equal(r.written, false); assert.equal(r.keptOld, true);
    assert.equal(readFileSync(f, 'utf8'), before);
  }
});
test('run: first run with a failing source writes nothing', async () => {
  const f = outFile();
  const r = await run({ fetcher: async () => { throw new Error('HTTP 503'); }, outFile: f, now: NOW, cams, perms, log: quiet });
  assert.equal(r.written, false); assert.equal(existsSync(f), false);
});
test('run: feed-licence guard: closed row (mustNotShip) or missing row means no request and no file', async () => {
  for (const p of [perms.map((s) => (s.id === WILDFIRE_SOURCE_ID ? { ...s, mustNotShip: true } : s)), perms.filter((s) => s.id !== WILDFIRE_SOURCE_ID)]) {
    const f = outFile(); let calls = 0;
    const r = await run({ fetcher: async () => { calls++; return fx(); }, outFile: f, now: NOW, cams, perms: p, log: quiet });
    assert.equal(r.written, false); assert.equal(calls, 0); assert.equal(existsSync(f), false);
  }
});
test('fetchAll: follows exceededTransferLimit with offset pages; endless paging is refused as partial', async () => {
  const urls = [];
  const two = async (u) => { urls.push(u); const off = Number(new URL(u).searchParams.get('resultOffset')); return { type: 'FeatureCollection', features: off === 0 ? [{ n: 1 }, { n: 2 }] : [{ n: 3 }], ...(off === 0 ? { properties: { exceededTransferLimit: true } } : {}) }; };
  const all = await fetchAll(two);
  assert.equal(all.features.length, 3); assert.match(urls[1], /resultOffset=2\b/);
  await assert.rejects(fetchAll(async () => ({ type: 'FeatureCollection', features: [{ n: 1 }], exceededTransferLimit: true })), /partial/);
});
test('placesOf: California only, city centres plus road cameras on a 0.1 degree grid (small, not one per camera)', () => {
  const p = placesOf(cams);
  assert.ok(p.length > 10 && p.length < cams.length / 5, `${p.length} places`);
  assert.ok(p.every((x) => x.lat > 32 && x.lat < 42.2 && x.lon < -114 && x.lon > -124.7));
});
test('the importer sends the generic User-Agent only', () => {
  const src = readFileSync(resolve(here, '../../ops/importers/wildfire.mjs'), 'utf8');
  assert.match(src, /'User-Agent': UA/); assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(src));
});
