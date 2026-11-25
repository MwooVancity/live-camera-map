// Offline tests for the Taiwan river-camera importer (Water Resources Agency JSON list, Government Open Data License 1.0). Run: node --test tests/registry/taiwanwra.test.mjs
// Fixtures are real trimmed copies fetched 2026-11-25: 5 rows of the list, the data.gov.tw dataset record (trimmed to the fields we read) and the grant clause of the licence page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras } from '../../ops/importers/taiwanwra.mjs';
import { parseFeed, normalizeTwra, datasetProblems, robotsAllows, pageText, FEED_URL, DATASET_API_URL, ROBOTS_URL, TERMS_URL, BOUNDS, ATTRIBUTION, LICENCE_PHRASES } from '../../ops/importers/lib/taiwanwra.mjs';
import { validateCamera, FORBIDDEN_FIELDS } from '../../ops/importers/lib/registry.mjs';
import { isEnabled } from '../licensing/gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('taiwanwra-list.json');
const dataset = fx('taiwanwra-dataset.json');
const licence = fx('taiwanwra-licence.html');
const NOW = '2026-11-25T12:00:00.000Z';
// the real licence row is added to the shared files by the merger (patch ops/importers/patches/taiwanwra.patch.json) and stays mustNotShip until Mike confirms;
// these tests use an open synthetic row so the importer logic can be exercised offline
const openRow = { id: 'taiwan-wra-cameras', commercialStatus: 'allowed_per_doc', attribution: ATTRIBUTION, provenance: TERMS_URL, licence: 'Government Open Data License 1.0', reviewedAt: '2026-11-25', metadataPermission: { status: 'allowed' } };
const perms = [openRow];
const tmp = () => mkdtempSync(join(tmpdir(), 'taiwanwra-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const recs = parseFeed(list);
const rec = (o = {}) => ({ ...recs[0], ...o });
const row = (n, o = {}) => ({ ...recs[0], cameraid: String(n), cameraname: `camera ${n}`, imageurl: `https://fmg.wra.gov.tw/109wraweb/getImage.aspx?mode=getNewImageS&CCTV_SN=0x02000000AE14DA1430158EEE1F456DD9${String(n).padStart(8, '0')}`, ...o });
const many = (n) => JSON.stringify(Array.from({ length: n }, (_, i) => row(i + 1)));
const fetcher = (o = {}) => async (url) => {
  const v = url === DATASET_API_URL ? (o.item ?? dataset) : url === TERMS_URL ? (o.terms ?? licence) : url === ROBOTS_URL ? (o.robots ?? '{"error":true,"statusCode":404}') : url === FEED_URL ? (o.feed ?? list) : null;
  if (v === null) throw new Error('unexpected url ' + url);
  const r = typeof v === 'function' ? await v(url) : v;
  if (r instanceof Error) throw r;
  return r;
};
// the real robots.txt answer is HTTP 404 with a JSON body: runner.readRobots treats the thrown "HTTP 404" as no rules
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher({ robots: new Error('HTTP 404'), ...f }), outDir: dir, now: NOW, perms, log: () => {}, minUsable: 3, ...o });

test('WRA normalize: id from the camera id, name as the Agency wrote it, link only on fmg.wra.gov.tw getImage, location text from basin, tributary, county and district, no city', () => {
  const drop = {}, seen = new Set();
  const ok = recs.map((r) => normalizeTwra(r, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, {});
  assert.equal(ok.length, 5);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'taiwan-wra-cameras-17457');
  assert.equal(c.sourceId, 'taiwan-wra-cameras');
  assert.equal(c.name, '羅莫溪匯流口');
  assert.equal(c.city, null);
  assert.equal(c.road, '');
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'taiwan-rivers');
  assert.equal(c.lat, 23.688806);
  assert.equal(c.lon, 121.484861);
  assert.equal(c.locationText, 'River basin: 花蓮溪. Tributary: 馬鞍溪. Located in: 花蓮縣光復鄉.');
  assert.ok(c.officialUrl.startsWith('https://fmg.wra.gov.tw/109wraweb/getImage.aspx?'));
  assert.equal(new Set(ok.map((x) => x.id)).size, 5);
  for (const x of ok) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('WRA normalize: bad rows are dropped and counted (foreign, http or lookalike link, bad id, status not 1, no name, bad or swapped coords, out of bounds, malformed, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const u = recs[0].imageurl;
  const bad = [
    rec({ imageurl: u.replace('https://fmg.wra.gov.tw', 'https://example.com') }), rec({ imageurl: u.replace('https:', 'http:') }), rec({ imageurl: u.replace('fmg.wra.gov.tw', 'fmg.wra.gov.tw.evil.example') }),
    rec({ imageurl: u + '&x=1' }), rec({ imageurl: '' }), rec({ imageurl: u.replace('0x0200', 'zz') }),
    rec({ cameraid: 'abc' }), rec({ cameraid: '' }),
    rec({ status: '0' }), rec({ status: undefined }),
    rec({ cameraname: ' ', videosurveillancestationname: '' }),
    rec({ latitude_4326: '' }), rec({ longitude_4326: 'abc' }),
    rec({ latitude_4326: '121.48', longitude_4326: '23.68' }), rec({ latitude_4326: '48.85', longitude_4326: '2.35' }),
    null, 'x', 5, [],
  ];
  for (const r of bad) assert.equal(normalizeTwra(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { noUrl: 6, noId: 2, notInUse: 2, noName: 1, badCoords: 2, outOfBounds: 2, malformed: 4 });
  assert.ok(normalizeTwra(rec(), NOW, drop, seen));
  assert.equal(normalizeTwra(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 21.9 && BOUNDS.latMax > 25.4 && BOUNDS.lonMin < 119 && BOUNDS.lonMax > 122, 'Taiwan, Penghu and Kinmen are inside the box');
  assert.equal(normalizeTwra(rec({ cameraname: '', videosurveillancestationname: '站名' }), NOW).name, '站名', 'falls back to the station name');
  assert.equal(normalizeTwra(rec({ cameraname: '  a   b ' }), NOW).name, 'a b', 'name is trimmed and spaces collapsed');
});

test('WRA feed: an HTML 200 page, an empty body, a JSON error object and a cut-off list are refused', () => {
  assert.equal(recs.length, 5);
  assert.throws(() => parseFeed('<html><body>Service unavailable</body></html>'), /no JSON array/);
  assert.throws(() => parseFeed(''), /no JSON array/);
  assert.throws(() => parseFeed('{"error":true,"statusCode":404}'), /no JSON array/);
  assert.throws(() => parseFeed(list.slice(0, list.length - 40)), /cut off/);
  assert.throws(() => parseFeed(undefined), /no JSON array/);
  assert.equal(parseFeed('[]').length, 0);
});

test('WRA dataset record: the real one passes; a changed licence, id, status, resource list or an error body is a problem', () => {
  assert.deepEqual(datasetProblems(dataset), []);
  assert.match(datasetProblems(dataset.replace('政府資料開放授權條款-第1版', '其他授權'))[0], /dataset licence is "其他授權"/);
  assert.match(datasetProblems(dataset.replace('"nid": 36687', '"nid": 1'))[0], /not the expected dataset/);
  assert.match(datasetProblems(dataset.replace('"c01"', '"c02"'))[0], /not published/);
  assert.match(datasetProblems(dataset.split('f71b74eb-cbe5-42c6-8be5-7500450e7db0').join('other'))[0], /no longer lists/);
  assert.match(datasetProblems('{"success":false}')[0], /not the expected dataset/);
  assert.match(datasetProblems('<html>')[0], /not JSON/);
  assert.match(datasetProblems('[]')[0], /not the expected dataset/);
});

test('WRA licence text: both grant sentences are in the fixture and in none of the broken pages; the attribution names the Agency and the licence', () => {
  const t = pageText(licence);
  for (const p of LICENCE_PHRASES) assert.ok(t.includes(p), p);
  assert.equal(LICENCE_PHRASES.length, 2);
  assert.ok(ATTRIBUTION.includes('Water Resources Agency') && ATTRIBUTION.includes('Government Open Data License 1.0'));
  assert.ok(!pageText('<html><body>Access denied</body></html>').includes(LICENCE_PHRASES[0]));
  assert.ok(!pageText(licence.replace('免授權金', '需授權金')).includes(LICENCE_PHRASES[0]));
});

test('WRA robots: an empty file or an HTML body means no rules; a Disallow for the feed path stops, an Allow of a longer path wins', () => {
  const p = '/api/v2/f71b74eb-cbe5-42c6-8be5-7500450e7db0?format=JSON';
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('User-agent: *\n', p), true);
  assert.equal(robotsAllows('<html><title>403 Forbidden</title></html>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /api/', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /api/\nAllow: /api/v2/f71b74eb', p), true);
});

test('WRA run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'taiwan-wra-cameras').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'taiwan-wra-cameras'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'taiwan-wra-cameras');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(src.permissions.image_display, 'unverified');
  assert.equal(r.report.total, 5);
  assert.equal(r.report.raw, 5);
  assert.ok(existsSync(join(dir, 'import-report-taiwanwra.json')));
});

test('WRA run: 132 rows give 132 cameras; a second run with fewer rows rewrites only WRA rows', async () => {
  const dir = tmp(); seed(dir);
  const r = await runCameras(opts(dir, { minUsable: 100 }, { feed: many(132) }));
  assert.equal(r.written, true, r.reason);
  assert.equal(r.report.total, 132);
  const first = read(dir);
  const r2 = await runCameras(opts(dir, { minUsable: 3 }, { feed: many(125) }));
  assert.equal(r2.written, true, r2.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'taiwan-wra-cameras').length, 125);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'taiwan-wra-cameras'), first.filter((c) => c.sourceId !== 'taiwan-wra-cameras'));
});

test('WRA run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const rows = [...Array.from({ length: 110 }, (_, i) => row(i + 1)), row(1), row(900, { status: '0' }), row(901, { latitude_4326: '48.85', longitude_4326: '2.35' }), row(902, { imageurl: 'https://example.com/a.jpg' })];
  const r = await runCameras(opts(dir, { minUsable: 100 }, { feed: JSON.stringify(rows) }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, notInUse: 1, outOfBounds: 1, noUrl: 1 });
  assert.equal(r.report.total, 110);
});

test('WRA: licence row closed, wording gone, dataset record changed, robots Disallow, HTML 200 body, cut-off list, unreadable, too few cameras: nothing written (failing fixtures)', async () => {
  const closed = [{ ...openRow, commercialStatus: 'unknown' }];
  const mustNot = [{ ...openRow, mustNotShip: true }];
  const unverifiedMeta = [{ ...openRow, metadataPermission: { status: 'unverified' } }];
  const good = many(120);
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: mustNot }, {}, /licence closed/],
    [{ perms: unverifiedMeta }, {}, /licence closed/],
    [{ perms: [] }, {}, /licence closed/],
    [{ perms: [{ ...openRow, reviewedAt: '2026-01-01' }] }, {}, /licence closed/],
    [{}, { terms: licence.replace('免授權金', '需授權金') }, /licence wording changed/],
    [{}, { terms: '<html><body>Access denied</body></html>' }, /licence wording changed/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { item: dataset.replace('政府資料開放授權條款-第1版', '其他授權') }, /licence wording changed/],
    [{}, { item: new Error('HTTP 500') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /api/' }, /robots\.txt disallows/],
    [{}, { robots: new Error('HTTP 503') }, /robots\.txt unreadable/],
    [{}, { feed: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { feed: '<html><body>Maintenance</body></html>' }, /feed unreadable/],
    [{}, { feed: good.slice(0, good.length - 30) }, /feed unreadable.*cut off/],
    [{}, { feed: '[]' }, /only 0 usable/],
    [{}, { feed: many(10) }, /only 10 usable cameras/],
  ];
  for (const [o, f, re] of cases) {
    const dir = tmp(); seed(dir);
    const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
    const r = await runCameras(opts(dir, { minUsable: 100, ...o }, { feed: good, ...f })); // a healthy 120-row list unless the case replaces it
    assert.equal(r.written, false, String(re));
    assert.match(r.reason, re);
    assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before, 'the registry is left as it was');
    assert.ok(!existsSync(join(dir, 'sources.json')));
  }
});

test('WRA: a list under half the last good run never replaces it; an unreadable registry is not overwritten', async () => {
  const dir = tmp();
  const r0 = await runCameras(opts(dir, { minUsable: 100 }, { feed: many(132) }));
  assert.equal(r0.written, true, r0.reason);
  const r = await runCameras(opts(dir, { minUsable: 1 }, { feed: many(50) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 132 to 50/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2, { minUsable: 100 }, { feed: many(132) }));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('WRA: only the dataset record, the licence page, robots.txt and the list are requested; no picture address is ever fetched', async () => {
  assert.equal(new URL(FEED_URL).hostname, 'opendata.wra.gov.tw');
  assert.equal(new URL(DATASET_API_URL).hostname, 'data.gov.tw');
  assert.equal(new URL(TERMS_URL).hostname, 'data.gov.tw');
  assert.ok(!/key|token|@/i.test(new URL(FEED_URL).search + new URL(FEED_URL).username));
  const hits = [];
  const dir = tmp();
  await runCameras(opts(dir, { minUsable: 100, fetchText: async (u) => { hits.push(u); return fetcher({ feed: many(120) })(u); } }));
  assert.deepEqual(hits.sort(), [DATASET_API_URL, FEED_URL, ROBOTS_URL, TERMS_URL].sort());
  assert.ok(!hits.some((u) => /fmg\.wra\.gov\.tw|getImage/.test(u)));
});

test('licence patch: the generated row stays mustNotShip, unverified, needs review; image permission is never allowed; the gate keeps the source closed', () => {
  const p = JSON.parse(readFileSync(join(here, '..', '..', 'ops', 'importers', 'patches', 'taiwanwra.patch.json'), 'utf8'));
  const row = p.edits.find((e) => e.file === 'data/source-permissions.manual.json').value;
  assert.equal(row.id, 'taiwan-wra-cameras');
  assert.equal(row.mustNotShip, true);
  assert.equal(row.needsHumanReview, true);
  assert.equal(row.commercialStatus, 'unverified');
  assert.equal(row.imagePermission.status, 'unverified');
  assert.equal(row.metadataPermission.status, 'unverified');
  assert.ok(row.licence.includes('不限目的、時間及地域、非專屬、不可撤回、免授權金進行利用'));
  assert.ok(row.licence.includes('本網站全部圖文版權係屬本署所有'), 'the conflicting footer sentence is quoted for the owner');
  assert.equal(isEnabled({ ...row, attribution: ATTRIBUTION }, new Date(NOW)), false);
});
