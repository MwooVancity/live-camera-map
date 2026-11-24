// Offline tests for the A22 Brenner importer (Open Data Hub tourism API, record licence CC0). Run: node --test tests/registry/a22.test.mjs
// Fixtures are real copies fetched 2026-11-24: the first 5 of the 13 records of the live answer (TotalResults and TotalPages set to match) and the article of the Open Data Hub licensing page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/a22.mjs';
import { parseFeed, normalizeA22, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, BOUNDS, ATTRIBUTION, LICENCE_PHRASES } from '../../ops/importers/lib/a22.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('a22-list.json');
const terms = fx('a22-terms.html');
const NOW = '2026-11-24T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'a22-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const recs = parseFeed(list).rows;
const rec = (o = {}) => ({ ...recs[0], ...o });
const row = (i, o = {}) => rec({ Id: `A22_${i}`, Shortname: `Km ${i}`, Webcamurl: `https://www.autobrennero.it/WebCamImg/km${i}.jpg`, ...o });
const feedOf = (rows, total = rows.length) => JSON.stringify({ TotalResults: total, TotalPages: 1, CurrentPage: 1, PreviousPage: null, NextPage: null, Items: rows });
const fetcher = (o = {}) => async (url) => {
  const v = url === TERMS_URL ? (o.terms ?? terms) : url === ROBOTS_URL ? (o.robots ?? 'ERR') : (o.feed ?? list);
  if (v === 'ERR' && url === ROBOTS_URL) throw new Error('HTTP 404');
  if (typeof v === 'function') return v(url);
  if (v instanceof Error) throw v;
  return v;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, minUsable: 3, ...o });
const many = (n) => Array.from({ length: n }, (_, i) => row(i + 1));

test('A22 normalize: id from the Hub Id, name and road, kilometre and side as text, link only on the Autobrennero picture path, no city', () => {
  const drop = {}, seen = new Set();
  const ok = recs.map((r) => normalizeA22(r, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, {});
  assert.equal(ok.length, 5);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'a22-brennero-a22-68');
  assert.equal(c.name, 'ADS Sciliar');
  assert.equal(c.road, 'A22');
  assert.equal(c.city, null);
  assert.equal(c.regionSlug, 'a22-brennero');
  assert.equal(c.feedType, 'still');
  assert.equal(c.lat, 46.53591);
  assert.equal(c.lon, 11.49772);
  assert.equal(c.locationText, 'A22 km 68. a destra carr. NORD (dir.Brennero).');
  assert.equal(c.officialUrl, 'https://www.autobrennero.it/WebCamImg/km68.jpg');
  assert.equal(REGION_COUNTRY['a22-brennero'].countrySlug, 'italy');
  assert.equal(REGION_COUNTRY['a22-brennero'].countryCode, 'IT');
  assert.equal(new Set(ok.map((x) => x.id)).size, 5);
  for (const x of ok) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('A22 normalize: bad rows are dropped and counted (not CC0, closed, inactive, foreign link, http link, bad id, no name, bad coords, out of bounds, malformed, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    rec({ LicenseInfo: { License: 'Proprietary', ClosedData: false } }), rec({ LicenseInfo: { License: 'CC0', ClosedData: true } }), rec({ LicenseInfo: null }), rec({ LicenseInfo: undefined }),
    rec({ Active: false }),
    rec({ Webcamurl: 'https://example.com/WebCamImg/km68.jpg' }), rec({ Webcamurl: 'http://www.autobrennero.it/WebCamImg/km68.jpg' }), rec({ Webcamurl: 'https://www.autobrennero.it.evil.example/WebCamImg/km68.jpg' }), rec({ Webcamurl: 'https://www.autobrennero.it/WebCamImg/km68.png' }), rec({ Webcamurl: null }),
    rec({ Id: 'X_1' }), rec({ Id: null }),
    rec({ Shortname: ' ', Detail: {} }),
    rec({ GpsInfo: [] }), rec({ GpsInfo: [{ Latitude: 'x', Longitude: 11 }] }), rec({ GpsInfo: null }),
    rec({ GpsInfo: [{ Latitude: 48.85, Longitude: 2.35 }] }),
    null, 'x', 5,
  ];
  for (const r of bad) assert.equal(normalizeA22(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { notCc0: 4, inactive: 1, noUrl: 5, noId: 2, noName: 1, badCoords: 3, outOfBounds: 1, malformed: 3 });
  assert.ok(normalizeA22(rec(), NOW, drop, seen));
  assert.equal(normalizeA22(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 44.67 && BOUNDS.latMax > 46.997 && BOUNDS.lonMin < 10.8 && BOUNDS.lonMax > 11.5);
  assert.equal(normalizeA22(rec({ Shortname: '  ADS   Sciliar ' }), NOW).name, 'ADS Sciliar');
  assert.ok(normalizeA22(rec({ Detail: { it: { Title: 'Only title', BaseText: null } }, Shortname: '' }), NOW).locationText === 'A22 km 68.');
});

test('A22 feed: HTML, an empty body, a cut-off body, a wrong shape and a second page are refused', () => {
  assert.equal(recs.length, 5);
  assert.equal(parseFeed(list).total, 5);
  assert.throws(() => parseFeed('<html><body>Service unavailable</body></html>'), /no JSON object/);
  assert.throws(() => parseFeed(''), /no JSON object/);
  assert.throws(() => parseFeed(list.slice(0, list.length - 40)), /cut off/);
  assert.throws(() => parseFeed('{"Items":[]}'), /no Items array/);
  assert.throws(() => parseFeed('{"Items":[],"TotalResults":"3"}'), /no Items array/);
  assert.throws(() => parseFeed('{"Items":[],"TotalResults":30,"TotalPages":2,"NextPage":"x"}'), /more than one page/);
});

test('A22 licence page: tags removed, every required sentence is in the fixture and in none of the broken pages', () => {
  const t = pageText(terms);
  for (const p of LICENCE_PHRASES) assert.ok(t.includes(p), p);
  assert.equal(LICENCE_PHRASES.length, 3);
  assert.ok(ATTRIBUTION.includes('Autostrada del Brennero') && ATTRIBUTION.includes('CC0'));
  assert.ok(!pageText('<html><body>Access denied</body></html>').includes(LICENCE_PHRASES[0]));
});

test('A22 robots: 404 or no file means no rules; a Disallow for the feed path stops', () => {
  const p = new URL(FEED_URL).pathname;
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('<html><title>404</title></html>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /v1', p), false);
});

test('A22 run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'a22-brennero').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'a22-brennero'), before);
  const src = read(dir, 'sources.json').find((s) => s.id === 'a22-brennero');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(r.report.total, 5);
  assert.equal(r.report.raw, 5);
  assert.ok(existsSync(join(dir, 'import-report-a22.json')));
});

test('A22 run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const rows = [...many(13), row(1), row(2, { Webcamurl: 'https://example.com/a.jpg' }), row(3, { LicenseInfo: { License: 'Proprietary', ClosedData: false } })];
  const r = await runCameras(opts(dir, { minUsable: 10 }, { feed: feedOf(rows) }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, noUrl: 1, notCc0: 1 });
  assert.equal(r.report.total, 13);
});

test('A22: licence row closed, wording gone, robots Disallow, HTML 200 body, count mismatch, unreadable, too few: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'a22-brennero-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const big = feedOf(many(13));
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'a22-brennero-cameras') }, {}, /licence closed/],
    [{}, { terms: pageText(terms).split('permissive licenses').join('restrictive licences') }, /licence wording changed/],
    [{}, { terms: pageText(terms).split('It does not extend to child nodes such as Streamurl or Webcamurl').join('It extends to everything') }, /licence wording changed/],
    [{}, { terms: '<html><body>Access denied</body></html>' }, /licence wording changed/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /v1' }, /robots\.txt disallows/],
    [{}, { feed: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { feed: '<html><body>Maintenance</body></html>' }, /feed unreadable/],
    [{}, { feed: feedOf(many(13), 14) }, /read 13 rows but the feed counts 14/],
    [{}, { feed: feedOf([]) }, /only 0 usable|zero cameras/],
    [{}, { feed: feedOf(many(4)) }, /only 4 usable cameras/],
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

test('A22: a list under half the last good run never replaces it, and a damaged registry file is never overwritten', async () => {
  const dir = tmp();
  const r0 = await runCameras(opts(dir, { minUsable: 1 }, { feed: feedOf(many(13)) }));
  assert.equal(r0.written, true, r0.reason);
  const r = await runCameras(opts(dir, { minUsable: 1 }, { feed: feedOf(many(6)) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 13 to 6/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2, { minUsable: 1 }, { feed: feedOf(many(13)) }));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('A22: only the Hub list, the Hub licensing page and the Hub robots.txt are requested, with no key; the picture host is never requested', async () => {
  assert.equal(new URL(FEED_URL).hostname, 'tourism.opendatahub.com');
  assert.ok(!/key|token|@/i.test(new URL(FEED_URL).search));
  assert.equal(new URL(TERMS_URL).hostname, 'docs.opendatahub.com');
  const hits = [];
  await runCameras(opts(tmp(), { fetchText: async (u) => { hits.push(u); return fetcher()(u); } }));
  assert.equal(hits.filter((u) => u === FEED_URL).length, 1, 'one list request per run');
  assert.ok(!hits.some((u) => /autobrennero/.test(u)));
  assert.ok(hits.every((u) => /^https:\/\/(tourism|docs)\.opendatahub\.com\//.test(u)));
});

test('licence row: a22-brennero-cameras passes the gate, quotes the CC0 and the stricter Hub sentence, flags the owner, images stay unverified', () => {
  const r = perms.find((s) => s.id === 'a22-brennero-cameras');
  assert.ok(r, 'row exists');
  assert.equal(r.enabled, true);
  assert.equal(r.commercialStatus, 'allowed_per_doc');
  assert.equal(r.needsHumanReview, true);
  assert.equal(r.reviewedAt, '2026-11-24');
  assert.ok(r.licence.includes('"CC0 : The data is in the public domain and can be freely reused without restrictions"'));
  assert.ok(r.licence.includes('It does not extend to child nodes such as Streamurl or Webcamurl'));
  assert.ok(r.licence.includes('OWNER MUST SEE'));
  assert.ok(r.licence.includes(TERMS_URL));
  assert.equal(r.attribution, ATTRIBUTION);
  assert.match(r.imageStatus, /^unverified/);
});

test('health config: the A22 picture host (Cloudflare challenge) is never requested; every A22 camera is unknown by design', () => {
  assert.deepEqual(CONFIG.perSource['a22-brennero'], { skip: 'host-blocks-automated-checks' });
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'a22-brennero') : [];
test('real cameras.json (when it holds A22 rows): valid, unique ids, only the Autobrennero picture path, no image field, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 10);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.match(c.officialUrl, /^https:\/\/www\.autobrennero\.it\/WebCamImg\/km\d{1,3}\.jpg$/);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'italy');
  }
});
