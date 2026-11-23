// Run: node --test tests/conditions/conditions.test.mjs
// Enforces rule `feed-fresh`: stale or wrong-shaped feed data never reaches a page block; a failed run never replaces a good file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isFresh, usableItems, usableNws, parseLcs, parseCc, parseCms, parseRwis, feedUrl, MAX_AGE_MIN, DISTRICTS } from '../../ops/importers/lib/conditions.mjs';
import { run } from '../../ops/importers/caltrans-conditions.mjs';
import { run as runNws, buildDoc, centroid } from '../../ops/importers/nws.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => JSON.parse(readFileSync(join(here, 'fixtures', f), 'utf8'));
const NOW = new Date('2026-11-22T22:50:00Z');
const perms = JSON.parse(readFileSync(resolve(here, '../../data/source-permissions.json'), 'utf8')).sources;
const tmp = () => mkdtempSync(join(tmpdir(), 'cond-'));
const quiet = () => {};

test('plan.md section 6 max ages', () => {
  assert.deepEqual(MAX_AGE_MIN, { lcs: 15, cc: 15, cms: 15, rwis: 60, 'nws-forecast': 180, 'nws-alerts': 180, 'bc-events': 15 });
});

test('url: unpadded district in the folder, padded in the file name', () => {
  assert.equal(feedUrl('lcs', '07'), 'https://cwwp2.dot.ca.gov/data/d7/lcs/lcsStatusD07.json');
  assert.equal(feedUrl('cc', '12'), 'https://cwwp2.dot.ca.gov/data/d12/cc/ccStatusD12.json');
  assert.equal(feedUrl('rwis', '1'), 'https://cwwp2.dot.ca.gov/data/d1/rwis/rwisStatusD01.json');
});

// ---- stale-timestamp helper
test('isFresh: inside the limit', () => assert.equal(isFresh('2026-11-22T22:40:00Z', 15, NOW), true));
test('isFresh: exactly at the limit', () => assert.equal(isFresh('2026-11-22T22:35:00Z', 15, NOW), true));
test('isFresh: one minute over the limit is stale', () => assert.equal(isFresh('2026-11-22T22:34:00Z', 15, NOW), false));
test('isFresh: garbage, empty, missing fail closed', () => {
  for (const v of ['soon', '', undefined, null]) assert.equal(isFresh(v, 15, NOW), false, String(v));
});
test('isFresh: far-future timestamp (clock wrong) fails closed', () => assert.equal(isFresh('2026-11-23T22:50:00Z', 15, NOW), false));
test('isFresh: bad max age fails closed', () => assert.equal(isFresh('2026-11-22T22:49:00Z', 0, NOW), false));

// ---- failing-fixture proof: stale or wrong-shaped docs give an empty block, not a crash and not old data
test('usableItems: fresh doc shows items', () => {
  assert.equal(usableItems({ generatedAt: '2026-11-22T22:45:00Z', items: [{ id: 1 }] }, 'lcs', NOW).length, 1);
});
test('usableItems: stale doc is empty (a week-old file is never shown as current)', () => {
  assert.deepEqual(usableItems({ generatedAt: '2026-11-15T22:45:00Z', items: [{ id: 1 }] }, 'lcs', NOW), []);
});
test('usableItems: rwis allows 60 min, lcs does not', () => {
  const d = { generatedAt: '2026-11-22T22:00:00Z', items: [{ id: 1 }] };
  assert.equal(usableItems(d, 'rwis', NOW).length, 1);
  assert.equal(usableItems(d, 'lcs', NOW).length, 0);
});
test('usableItems: bad shapes are empty, never throw', () => {
  for (const d of [null, undefined, 5, {}, { generatedAt: '2026-11-22T22:45:00Z' }, { generatedAt: '2026-11-22T22:45:00Z', items: 'x' }, { items: [1] }, fx('bad-shape.json')]) {
    assert.deepEqual(usableItems(d, 'cc', NOW), []);
  }
});
test('usableNws: each side hides on its own', () => {
  const d = { forecast: { fetchedAt: '2026-11-22T22:00:00Z', periods: [1] }, alerts: { fetchedAt: '2026-11-22T10:00:00Z', items: [2] } };
  assert.deepEqual(usableNws(d, NOW), { periods: [1], alerts: [] });
  assert.deepEqual(usableNws({}, NOW), { periods: [], alerts: [] });
  assert.deepEqual(usableNws(null, NOW), { periods: [], alerts: [] });
});

// ---- parser per feed
test('parseLcs: closure fields, active flag, end coordinates', () => {
  const drop = {};
  const items = fx('lcs-d07.json').data.map((r) => parseLcs(r, '07', NOW, drop)).filter(Boolean);
  assert.equal(items.length, 2);
  assert.deepEqual(drop, { badCoords: 1, malformed: 1 });
  const [a, b] = items;
  assert.equal(a.road, 'SR-1'); assert.equal(a.direction, 'North'); assert.equal(a.place, 'Los Angeles');
  assert.equal(a.lat, 33.944099); assert.equal(a.endLat, 33.949111);
  assert.equal(a.start, '2026-11-22T20:00:00.000Z'); assert.equal(a.end, '2026-11-23T04:00:00.000Z');
  assert.equal(a.active, true);
  assert.equal(a.text, 'Lane closure; lanes 3, 4 closed; Utility Work');
  assert.equal(a.estimatedDelay, null); // "Not Reported" is null, not text
  assert.equal(b.active, false); // starts on 2026-11-28
  assert.equal(b.endLat, null); assert.equal(b.typeOfWork, null);
});
test('parseCc: status, inEffect, drops out-of-state and out-of-service', () => {
  const drop = {};
  const items = fx('cc-d03.json').data.map((r) => parseCc(r, '03', NOW, drop)).filter(Boolean);
  assert.equal(items.length, 2);
  assert.deepEqual(drop, { badCoords: 1, notInService: 1 });
  assert.equal(items[0].status, 'R-1'); assert.equal(items[0].inEffect, true); assert.equal(items[0].road, 'SR-89');
  assert.equal(items[0].statusLocal, '2026-11-20 19:25:34');
  assert.equal(items[1].inEffect, false);
});
test('parseCms: message lines kept, blank sign dropped and counted', () => {
  const drop = {};
  const items = fx('cms-d07.json').data.map((r) => parseCms(r, '07', NOW, drop)).filter(Boolean);
  assert.equal(items.length, 1);
  assert.deepEqual(drop, { blankSign: 1 });
  assert.deepEqual(items[0].phase1, ['VINCENT THOMAS', 'BRIDGE CLOSED', 'USE ALT ROUTES']);
  assert.equal(items[0].text, 'VINCENT THOMAS / BRIDGE CLOSED / USE ALT ROUTES');
});
test('parseRwis: readings, error values become null, stale and empty stations dropped', () => {
  const drop = {};
  const items = fx('rwis-d02.json').data.map((r) => parseRwis(r, '02', NOW, drop)).filter(Boolean);
  assert.equal(items.length, 1);
  assert.deepEqual(drop, { stale: 1, noReadings: 1 }); // 3rd record: only error values (65535, 361, 1001)
  const s = items[0];
  assert.equal(s.airTemp, 48); assert.equal(s.surfaceTemp, 101); assert.equal(s.windAvg, 8); assert.equal(s.windGust, 10);
  assert.equal(s.visibility, null); assert.equal(s.recordedAt, '2026-11-22T22:30:00.000Z');
  assert.ok(!('units' in s));
});
test('every parser returns null on a renamed-field record, never throws', () => {
  for (const p of [parseLcs, parseCc, parseCms, parseRwis]) {
    for (const raw of [null, {}, { cctv: { index: '1' } }, { lcs: null, cc: null, cms: null, rwis: null }, 'x']) {
      assert.equal(p(raw, '07', NOW, {}), null);
    }
  }
});

// ---- importer: fail closed, never overwrite good with incomplete
const fixtureFetcher = (map, calls = []) => async (feed, nn) => {
  calls.push(`${feed}${nn}`);
  const f = map[feed] && map[feed][nn];
  if (!f) throw new Error('HTTP 500');
  return typeof f === 'string' ? fx(f) : f;
};
const first = { lcs: { '07': 'lcs-d07.json', '04': 'lcs-d07.json' } };

test('run: writes the file with a per-district report; failed districts are named, not hidden', async () => {
  const dir = tmp();
  const r = await run({ feeds: ['lcs'], fetcher: fixtureFetcher(first), outDir: dir, now: NOW, perms, log: quiet, pauseMs: 0 });
  assert.equal(r.lcs.written, true);
  const doc = JSON.parse(readFileSync(join(dir, 'ca-lcs.json'), 'utf8'));
  assert.equal(doc.generatedAt, NOW.toISOString());
  assert.equal(doc.perDistrict['07'].ok, true);
  assert.equal(doc.perDistrict['01'].ok, false); assert.match(doc.perDistrict['01'].error, /HTTP 500/);
  assert.equal(doc.failedDistricts.length, 10);
  assert.equal(doc.items.length, 4); // 2 kept from d07 + 2 from d04; ids carry the district so they stay distinct
});
test('run: a district that worked last time and fails now does NOT replace the good file', async () => {
  const dir = tmp();
  await run({ feeds: ['lcs'], fetcher: fixtureFetcher(first), outDir: dir, now: NOW, perms, log: quiet, pauseMs: 0 });
  const before = readFileSync(join(dir, 'ca-lcs.json'), 'utf8');
  const r = await run({ feeds: ['lcs'], fetcher: fixtureFetcher({ lcs: { '07': 'lcs-d07.json' } }), outDir: dir, now: new Date(NOW.getTime() + 600000), perms, log: quiet, pauseMs: 0 });
  assert.equal(r.lcs.written, false); assert.match(r.lcs.reason, /worked last run/);
  assert.equal(readFileSync(join(dir, 'ca-lcs.json'), 'utf8'), before);
});
test('run: every district failing writes nothing (first run, no old copy)', async () => {
  const dir = tmp();
  const r = await run({ feeds: ['cc'], fetcher: fixtureFetcher({}), outDir: dir, now: NOW, perms, log: quiet, pauseMs: 0 });
  assert.equal(r.cc.written, false); assert.equal(existsSync(join(dir, 'ca-cc.json')), false);
});
test('run: bad-shape answer from every district fails closed: nothing written, no crash', async () => {
  const dir = tmp();
  const bad = { rwis: Object.fromEntries(DISTRICTS.map((d) => [d, 'bad-shape.json'])) };
  const r = await run({ feeds: ['rwis'], fetcher: fixtureFetcher(bad), outDir: dir, now: NOW, perms, log: quiet, pauseMs: 0 });
  assert.equal(r.rwis.written, false); assert.equal(existsSync(join(dir, 'ca-rwis.json')), false);
  assert.match(r.rwis.report.perDistrict['07'].error, /no data array/);
});
test('run: a renamed field in a good district yields zero items and writes nothing', async () => {
  const dir = tmp();
  const renamed = { data: [{ closure: { index: '1' } }, { lcs: { idx: '1' } }] };
  const r = await run({ feeds: ['lcs'], fetcher: fixtureFetcher({ lcs: { '07': renamed } }), outDir: dir, now: NOW, perms, log: quiet, pauseMs: 0 });
  assert.equal(r.lcs.written, false); assert.equal(r.lcs.reason, 'zero items'); assert.equal(r.lcs.report.dropped.malformed, 2);
});
test('run: feed-licence guard: a disabled licence row means no fetch and no file', async () => {
  const dir = tmp(), calls = [];
  const closed = perms.map((s) => (s.id === 'caltrans-cms' ? { ...s, commercialStatus: 'unknown' } : s));
  const r = await run({ feeds: ['cms'], fetcher: fixtureFetcher({ cms: { '07': 'cms-d07.json' } }, calls), outDir: dir, now: NOW, perms: closed, log: quiet, pauseMs: 0 });
  assert.equal(r.cms.written, false); assert.equal(r.cms.reason, 'licence closed');
  assert.equal(calls.length, 0); assert.equal(existsSync(join(dir, 'ca-cms.json')), false);
});
test('run: a missing licence row is closed too', async () => {
  const r = await run({ feeds: ['cc'], fetcher: fixtureFetcher({}), outDir: tmp(), now: NOW, perms: [], log: quiet, pauseMs: 0 });
  assert.equal(r.cc.reason, 'licence closed');
});

// ---- NWS
const nwsFetcher = (over = {}, calls = []) => async (url) => {
  calls.push(url);
  if (over[url] instanceof Error) throw over[url];
  if (/\/points\//.test(url)) return fx('nws-points.json');
  if (/forecast$/.test(url)) return over.forecast ?? fx('nws-forecast.json');
  if (/alerts\/active/.test(url)) return over.alerts ?? fx('nws-alerts.json');
  throw new Error('unexpected url ' + url);
};
const cams = [
  { city: 'Anaheim', lat: 33.8, lon: -117.9 }, { city: 'Anaheim', lat: 33.84, lon: -117.94 }, { city: 'Anaheim', lat: 33.82, lon: -117.92 },
  { city: 'Elsewhere', lat: 38, lon: -121 },
];

test('nws centroid: mean of the city cameras, 4 decimals, null for unknown city', () => {
  assert.deepEqual(centroid(cams, 'Anaheim'), { lat: 33.82, lon: -117.92, cameras: 3 });
  assert.equal(centroid(cams, 'Nowhere'), null);
});
test('nws buildDoc: 48 h window, alerts mapped, office and grid kept, no icon image', () => {
  const doc = buildDoc({ city: 'Anaheim', slug: 'anaheim', c: centroid(cams, 'Anaheim'), points: fx('nws-points.json'), forecast: fx('nws-forecast.json'), alerts: fx('nws-alerts.json'), now: NOW });
  assert.deepEqual(doc.forecast.periods.map((p) => p.name), ['This Afternoon', 'Tonight']); // Thursday is beyond 48 h
  assert.equal(doc.forecast.periods[0].precipChance, 34); assert.equal(doc.forecast.periods[1].precipChance, null);
  assert.equal(doc.office, 'LOX'); assert.deepEqual(doc.grid, { gridId: 'LOX', gridX: 155, gridY: 45 });
  assert.equal(doc.alerts.items.length, 1); assert.equal(doc.alerts.items[0].event, 'Wind Advisory');
  assert.ok(!JSON.stringify(doc).includes('icons/'));
  assert.deepEqual(usableNws(doc, NOW).periods.length, 2);
  assert.deepEqual(usableNws(doc, new Date(NOW.getTime() + 4 * 3600000)), { periods: [], alerts: [] }); // 4 h later: stale, hidden
});
test('nws buildDoc: wrong shapes throw (so nothing is written)', () => {
  const ok = { city: 'A', slug: 'a', c: { lat: 1, lon: 2, cameras: 3 }, points: fx('nws-points.json'), forecast: fx('nws-forecast.json'), alerts: fx('nws-alerts.json'), now: NOW };
  assert.throws(() => buildDoc({ ...ok, points: { properties: {} } }), /points/);
  assert.throws(() => buildDoc({ ...ok, forecast: { properties: { periods: [] } } }), /forecast/);
  assert.throws(() => buildDoc({ ...ok, alerts: { features: 'x' } }), /alerts/);
  assert.throws(() => buildDoc({ ...ok, now: new Date('2026-11-23T22:50:00Z') }), /old|48 h/); // NWS forecast itself a day old
});
test('nws run: writes nws-<slug>.json; an alerts failure writes nothing and keeps the old file', async () => {
  const dir = tmp();
  const a = await runNws({ fetcher: nwsFetcher(), outDir: dir, now: NOW, cams, cities: ['Anaheim'], perms, log: quiet, pauseMs: 0 });
  assert.equal(a.anaheim.written, true); assert.equal(a.anaheim.periods, 2); assert.equal(a.anaheim.alerts, 1);
  const before = readFileSync(join(dir, 'nws-anaheim.json'), 'utf8');
  const alertsUrl = 'https://api.weather.gov/alerts/active?point=33.82,-117.92';
  const b = await runNws({ fetcher: nwsFetcher({ [alertsUrl]: new Error('HTTP 503') }), outDir: dir, now: new Date(NOW.getTime() + 60000), cams, cities: ['Anaheim'], perms, log: quiet, pauseMs: 0 });
  assert.equal(b.anaheim.written, false); assert.equal(b.anaheim.keptOld, true); assert.match(b.anaheim.reason, /503/);
  assert.equal(readFileSync(join(dir, 'nws-anaheim.json'), 'utf8'), before);
});
test('nws run: feed-licence guard: closed row means no call and no file', async () => {
  const dir = tmp(), calls = [];
  const closed = perms.map((s) => (s.id === 'nws-alerts' ? { ...s, mustNotShip: true } : s));
  const r = await runNws({ fetcher: nwsFetcher({}, calls), outDir: dir, now: NOW, cams, cities: ['Anaheim'], perms: closed, log: quiet, pauseMs: 0 });
  assert.equal(r.anaheim.written, false); assert.match(r.anaheim.reason, /licence closed/);
  assert.equal(calls.length, 0); assert.equal(existsSync(join(dir, 'nws-anaheim.json')), false);
});
test('the User-Agent is the generic string only', () => {
  const src = ['ops/importers/lib/conditions.mjs', 'ops/importers/caltrans-conditions.mjs', 'ops/importers/nws.mjs'].map((f) => readFileSync(resolve(here, '../..', f), 'utf8')).join('\n');
  assert.match(src, /UA = 'NearbyCams-build'/);
  assert.doesNotMatch(src, /@[a-z0-9-]+\.[a-z]{2,}/i); // no email anywhere in the importer code
});
