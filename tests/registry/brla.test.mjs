// Offline tests for the Baton Rouge importer (City of Baton Rouge open data, dataset 6z6u-ts44, LADOTD cameras, portal tag Public Domain). Run: node --test tests/registry/brla.test.mjs
// Fixtures are real copies fetched 2026-11-24: 4 of the 118 rows of the live list (b24--1, 297.C1--1, b34.C3--1, 273--1), the key fields of the dataset record, and the portal robots.txt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/brla.mjs';
import { parseFeed, normalizeBrla, metaProblems, robotsAllows, FEED_URL, META_URL, ROBOTS_URL, BOUNDS, ATTRIBUTION, META_DESCRIPTION } from '../../ops/importers/lib/brla.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('brla-list.json');
const meta = fx('brla-meta.json');
const robots = fx('brla-robots.txt');
const NOW = '2026-11-24T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'brla-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const recs = parseFeed(list);
const rec = (o = {}) => ({ ...recs[0], ...o });
const row = (i, o = {}) => rec({ id: String(i), image_view: `https://511la.org/map/Cctv/x${i}--1`, ...o });
const many = (n) => Array.from({ length: n }, (_, i) => row(i + 1));
const fetcher = (o = {}) => async (url) => {
  const v = url === META_URL ? (o.meta ?? meta) : url === ROBOTS_URL ? (o.robots ?? robots) : (o.feed ?? list);
  if (v instanceof Error) throw v;
  return typeof v === 'string' ? v : JSON.stringify(v);
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, minUsable: 3, pauseMs: 0, ...o });
const metaWith = (patch) => JSON.stringify({ ...JSON.parse(meta), ...patch });

test('Baton Rouge normalize: id and name from the 511LA code, link kept, position from the Point, no city, region Louisiana in the US', () => {
  const drop = {}, seen = new Set();
  const ok = recs.map((r) => normalizeBrla(r, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, {});
  assert.equal(ok.length, 4);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'brla-dotd-b24-1');
  assert.equal(c.name, 'DOTD camera b24--1');
  assert.equal(c.city, null);
  assert.equal(c.regionSlug, 'louisiana');
  assert.equal(c.feedType, 'still');
  assert.equal(c.lat, 30.422827936122);
  assert.equal(c.lon, -91.139348420782);
  assert.equal(c.officialUrl, 'https://511la.org/map/Cctv/b24--1');
  assert.deepEqual(ok.map((x) => x.id), ['brla-dotd-b24-1', 'brla-dotd-297-c1-1', 'brla-dotd-b34-c3-1', 'brla-dotd-273-1']);
  assert.equal(REGION_COUNTRY.louisiana.countrySlug, 'united-states');
  assert.equal(REGION_COUNTRY.louisiana.countryCode, 'US');
  for (const x of ok) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('Baton Rouge normalize: bad rows are dropped and counted (foreign host, http, wrong path, userinfo, bad coords, out of bounds, malformed, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    rec({ image_view: 'https://example.com/map/Cctv/b24--1' }), rec({ image_view: 'http://511la.org/map/Cctv/b24--1' }), rec({ image_view: 'https://511la.org.evil.example/map/Cctv/b24--1' }),
    rec({ image_view: 'https://511la.org@evil.example/map/Cctv/b24--1' }), rec({ image_view: 'https://511la.org/map/Cctv/b24' }), rec({ image_view: 'https://511la.org/my511/b24--1' }),
    rec({ image_view: 'https://511la.org/map/Cctv/b24--1?x=1' }), rec({ image_view: null }), rec({ image_view: '' }),
    rec({ the_geom: null }), rec({ the_geom: { type: 'Point', coordinates: [] } }), rec({ the_geom: { type: 'Point', coordinates: ['x', 30] } }), rec({ the_geom: { type: 'LineString', coordinates: [-91, 30.4] } }),
    rec({ the_geom: { type: 'Point', coordinates: [2.35, 48.85] } }), rec({ the_geom: { type: 'Point', coordinates: [30.4, -91.1] } }),
    null, 'x', 5,
  ];
  for (const r of bad) assert.equal(normalizeBrla(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { noUrl: 9, badCoords: 4, outOfBounds: 2, malformed: 3 });
  assert.ok(normalizeBrla(rec(), NOW, drop, seen));
  assert.equal(normalizeBrla(rec({ id: '999' }), NOW, drop, seen), null, 'the same camera code twice is one camera');
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 30.15 && BOUNDS.latMax > 30.52 && BOUNDS.lonMin < -91.63 && BOUNDS.lonMax > -90.8);
});

test('Baton Rouge feed: HTML, an empty body, a cut-off body and an object are refused', () => {
  assert.equal(recs.length, 4);
  assert.throws(() => parseFeed('<html><body>Service unavailable</body></html>'), /no JSON array/);
  assert.throws(() => parseFeed(''), /no JSON array/);
  assert.throws(() => parseFeed(list.slice(0, list.length - 30)), /cut off/);
  assert.throws(() => parseFeed('{"error":true}'), /no JSON array/);
});

test('Baton Rouge dataset record: the fixture passes; a changed licence, attribution, description, id, an HTML page or an error object each fail', () => {
  assert.deepEqual(metaProblems(meta), []);
  assert.ok(JSON.parse(meta).description.includes(META_DESCRIPTION));
  assert.equal(JSON.parse(meta).license.name, 'Public Domain');
  assert.equal(JSON.parse(meta).attribution, 'LA Department of Transportation and Development (DOTD)');
  assert.match(metaProblems(metaWith({ license: { name: 'CC BY-NC' } })).join(), /dataset licence is "CC BY-NC"/);
  assert.match(metaProblems(metaWith({ license: null })).join(), /dataset licence is "undefined"/);
  assert.match(metaProblems(metaWith({ attribution: 'Someone else' })).join(), /attribution/);
  assert.match(metaProblems(metaWith({ description: 'Parks' })).join(), /description/);
  assert.match(metaProblems(metaWith({ id: 'aaaa-bbbb' })).join(), /id changed/);
  assert.match(metaProblems('<html>x</html>').join(), /not JSON/);
  assert.match(metaProblems('[]').join(), /not a dataset/);
});

test('Baton Rouge robots: the real portal file allows the list and record paths; a Disallow for either stops', () => {
  assert.equal(robotsAllows(robots, new URL(FEED_URL).pathname), true);
  assert.equal(robotsAllows(robots, new URL(META_URL).pathname), true);
  assert.equal(robotsAllows('', '/resource/x.json'), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /resource/', new URL(FEED_URL).pathname), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /api/views', new URL(META_URL).pathname), false);
});

test('Baton Rouge run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'brla-dotd').length, 4);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'brla-dotd'), before);
  const src = read(dir, 'sources.json').find((s) => s.id === 'brla-dotd');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(r.report.total, 4);
  assert.equal(r.report.raw, 4);
  assert.ok(existsSync(join(dir, 'import-report-brla.json')));
});

test('Baton Rouge run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const rows = [...many(12), row(1), row(2, { image_view: 'https://example.com/a--1' }), row(3, { the_geom: null })];
  const r = await runCameras(opts(dir, { minUsable: 10 }, { feed: rows }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, noUrl: 1, badCoords: 1 });
  assert.equal(r.report.total, 12);
});

test('Baton Rouge: licence row closed, record wording changed, robots Disallow, HTML 200 body, cut-off list, unreadable, too few: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'brla-dotd-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const big = many(13);
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'brla-dotd-cameras') }, {}, /licence closed/],
    [{}, { meta: metaWith({ license: { name: 'Copyrighted' } }) }, /licence wording changed/],
    [{}, { meta: metaWith({ attribution: 'x' }) }, /licence wording changed/],
    [{}, { meta: '<html><body>Access denied</body></html>' }, /licence wording changed/],
    [{}, { meta: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /resource/' }, /robots\.txt disallows/],
    [{}, { feed: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { feed: '<html><body>Maintenance</body></html>' }, /feed unreadable/],
    [{}, { feed: JSON.stringify(big).slice(0, 500) }, /feed unreadable/],
    [{}, { feed: [] }, /only 0 usable/],
    [{}, { feed: many(4) }, /only 4 usable cameras/],
    [{}, { feed: many(5000) }, /cut off at the 5000 row limit/],
  ];
  for (const [o, f, re] of cases) {
    const dir = tmp(); seed(dir);
    const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
    const r = await runCameras(opts(dir, { minUsable: 10, ...o }, { feed: big, ...f }));
    assert.equal(r.written, false, String(re));
    assert.match(r.reason, re);
    assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before, 'the registry is left as it was');
    assert.ok(!existsSync(join(dir, 'sources.json')));
  }
});

test('Baton Rouge: a list under half the last good run never replaces it, and a damaged registry file is never overwritten', async () => {
  const dir = tmp();
  const r0 = await runCameras(opts(dir, { minUsable: 1 }, { feed: many(13) }));
  assert.equal(r0.written, true, r0.reason);
  const r = await runCameras(opts(dir, { minUsable: 1 }, { feed: many(6) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 13 to 6/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2, { minUsable: 1 }, { feed: many(13) }));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Baton Rouge: only data.brla.gov is requested (record, robots, one list request), with no key; 511la.org is never requested', async () => {
  assert.equal(new URL(FEED_URL).hostname, 'data.brla.gov');
  assert.equal(new URL(META_URL).hostname, 'data.brla.gov');
  assert.ok(!/key|token|@/i.test(new URL(FEED_URL).search));
  const hits = [];
  await runCameras(opts(tmp(), { fetchText: async (u) => { hits.push(u); return fetcher()(u); } }));
  assert.equal(hits.filter((u) => u === FEED_URL).length, 1, 'one list request per run');
  assert.ok(!hits.some((u) => /511la/.test(u)));
  assert.ok(hits.every((u) => new URL(u).hostname === 'data.brla.gov'));
});

test('licence row: brla-dotd-cameras passes the gate, quotes the portal tag and the 511LA disclaimer, says it is the city portal\'s tag, flags the owner, images stay unverified', () => {
  const r = perms.find((s) => s.id === 'brla-dotd-cameras');
  assert.ok(r, 'row exists');
  assert.equal(r.enabled, true);
  assert.equal(r.commercialStatus, 'allowed_per_doc');
  assert.equal(r.needsHumanReview, true);
  assert.equal(r.reviewedAt, '2026-11-24');
  assert.ok(r.licence.includes('license {"name":"Public Domain"}'));
  assert.ok(r.licence.includes('LA Department of Transportation and Development (DOTD)'));
  assert.ok(r.licence.includes('NOT a licence read from LADOTD'));
  assert.ok(r.licence.includes('OWNER MUST SEE'));
  assert.ok(r.licence.includes('does not warrant the accuracy, completeness, or timeliness'));
  assert.ok(r.licence.includes('https://data.brla.gov/api/views/6z6u-ts44.json'));
  assert.equal(r.attribution, ATTRIBUTION);
  assert.match(r.imageStatus, /^unverified/);
});

test('health config: 511la.org gets HEAD only, one worker, and an undated answer (made-up id) counts as unavailable', () => {
  assert.deepEqual(CONFIG.perSource['brla-dotd'], { concurrency: 1, hostDelayMs: 250, staleHours: 6, zeroLengthHead: true, needValidators: true });
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'brla-dotd') : [];
test('real cameras.json (when it holds Baton Rouge rows): valid, unique ids, only 511la.org camera paths, no image field, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 60);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.match(c.officialUrl, /^https:\/\/511la\.org\/map\/Cctv\/[A-Za-z0-9._-]+--\d{1,3}$/);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'united-states');
  }
});
