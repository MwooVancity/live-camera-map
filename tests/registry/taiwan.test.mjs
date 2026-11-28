// Offline tests for the Taiwan importer (Highway Bureau, MOTC, provincial-road CCTV list; free public use, source must be stated). Run: node --test tests/registry/taiwan.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/taiwan.mjs';
import { parseCctvs, normalizeTw, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, BOUNDS, ATTRIBUTION, LICENCE_PHRASES } from '../../ops/importers/lib/taiwan.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('taiwan-list.xml');
const terms = fx('taiwan-terms.html');
const NOW = '2026-11-24T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'taiwan-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const fetcher = (o = {}) => async (url) => {
  const v = url === TERMS_URL ? (o.terms ?? terms) : url === ROBOTS_URL ? (o.robots ?? 'ERR') : (o.body ?? list);
  if (v === 'ERR' && url === ROBOTS_URL) throw new Error('HTTP 404');
  if (v instanceof Error) throw v;
  return v;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, ...o });
const recs = parseCctvs(list);
const rec = (o = {}) => ({ ...recs[0], ...o });
const item = (id, extra = '') => `<CCTV><CCTVID>CCTV-00-0000-000-00${id}</CCTVID><VideoImageURL>https://cctv-ss01.thb.gov.tw:443/T1-${id}K+000/snapshot</VideoImageURL><PositionLon>121.5</PositionLon><PositionLat>25.0</PositionLat><SurveillanceDescription>Road ${id}</SurveillanceDescription><RoadName>T1</RoadName><LocationMile>${id}K+000</LocationMile>${extra}</CCTV>`;
const wrap = (...items) => `<CCTVList xmlns="http://traffic.transportdata.tw/standard/traffic/schema/"><CCTVs>${items.join('')}</CCTVs></CCTVList>`;

test('Taiwan normalize: id from CCTVID lowercased, Chinese name kept, road code and kilometre mark as text, link only on the Bureau picture hosts, no city', () => {
  const drop = {}, seen = new Set();
  const ok = recs.map((r) => normalizeTw(r, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, {});
  assert.equal(ok.length, 5);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'taiwan-thb-cctv-14-0620-009-002');
  assert.equal(c.name, '快速公路62號(暖暖交流道到大華系統交流道)(W)');
  assert.equal(c.city, null);
  assert.equal(c.road, '');
  assert.equal(c.direction, '');
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'taiwan');
  assert.equal(c.lon, 121.7321);
  assert.equal(c.lat, 25.10529);
  assert.equal(c.locationText, 'Road: 台62線. Kilometre mark: 9K+020.');
  assert.equal(c.officialUrl, 'https://cctv-ss02.thb.gov.tw:443/T62-9K+020/snapshot');
  assert.equal(REGION_COUNTRY.taiwan.countrySlug, 'taiwan');
  assert.equal(REGION_COUNTRY.taiwan.countryCode, 'TW');
  assert.ok(ok[3].officialUrl.includes('(N)'), 'a picture name with a direction in brackets is kept as the Bureau wrote it');
  for (const x of ok) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('Taiwan normalize: bad rows are dropped and counted (foreign link, http link, no name, bad coords, out of bounds, no id, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    rec({ VideoImageURL: 'https://example.com/T1-1K+000/snapshot' }), rec({ VideoImageURL: 'http://cctv-ss01.thb.gov.tw/T1-1K+000/snapshot' }),
    rec({ VideoImageURL: 'https://cctv-ss09.thb.gov.tw:443/T1-1K+000/snapshot' }), rec({ VideoImageURL: 'https://cctv-ss01.thb.gov.tw:443/../x/snapshot' }), rec({ VideoImageURL: '' }),
    rec({ SurveillanceDescription: ' ' }),
    rec({ PositionLat: '' }), rec({ PositionLon: 'abc' }),
    rec({ PositionLat: '48.85', PositionLon: '2.35' }), rec({ PositionLat: '30', PositionLon: '121' }),
    rec({ CCTVID: '' }), rec({ CCTVID: undefined }), rec({ CCTVID: 'a b' }),
    null, 'x',
  ];
  for (const r of bad) assert.equal(normalizeTw(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { noUrl: 5, noName: 1, badCoords: 2, outOfBounds: 2, noId: 3, malformed: 2 });
  assert.ok(normalizeTw(rec(), NOW, drop, seen));
  assert.equal(normalizeTw(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 25.1 && BOUNDS.latMax > 25.1 && BOUNDS.lonMin < 121.7 && BOUNDS.lonMax > 121.7);
  assert.ok(!('locationText' in normalizeTw(rec({ CCTVID: 'CCTV-99-9999-999-999', RoadName: '', LocationMile: '' }), NOW)), 'no road and no mark: no locationText');
});

test('Taiwan feed: an HTML 200 page, an error body, an empty body and a cut-off list are refused; XML entities are decoded', () => {
  assert.equal(recs.length, 5);
  assert.throws(() => parseCctvs('<html><body>Service unavailable</body></html>'), /no <CCTVList> root/);
  assert.throws(() => parseCctvs(''), /no <CCTVList> root/);
  assert.throws(() => parseCctvs(list.slice(0, list.length - 40)), /cut off/);
  assert.equal(parseCctvs(wrap('<CCTV><SurveillanceDescription>A &amp; B</SurveillanceDescription></CCTV>'))[0].SurveillanceDescription, 'A & B');
});

test('Taiwan terms text: tags removed, every required Chinese sentence is in the fixture and in none of the broken pages', () => {
  const t = pageText(terms);
  for (const p of LICENCE_PHRASES) assert.ok(t.includes(p), p);
  assert.equal(LICENCE_PHRASES.length, 4);
  assert.ok(ATTRIBUTION.includes('Highway Bureau') && ATTRIBUTION.includes('thbapp.thb.gov.tw/opendata'));
  assert.ok(!pageText('<html><body>Access denied</body></html>').includes(LICENCE_PHRASES[0]));
});

test('Taiwan robots: 404 or no file means no rules; a Disallow for the feed path stops, an Allow of a longer path wins', () => {
  const p = new URL(FEED_URL).pathname;
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('<html><title>404 Not Found</title></html>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /opendata', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /opendata\nAllow: /opendataCCTVs.xml', p), true);
});

test('Taiwan run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'taiwan-thb').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'taiwan-thb'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'taiwan-thb');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(r.report.total, 5);
  assert.equal(r.report.raw, 5);
  assert.ok(existsSync(join(dir, 'import-report-taiwan.json')));
});

test('Taiwan run: only taiwan rows are rewritten on a second run, other sources stay byte-equal', async () => {
  const dir = tmp(); seed(dir);
  await runCameras(opts(dir));
  const first = read(dir);
  const r = await runCameras(opts(dir, {}, { body: wrap(item(1), item(2), item(3)) }));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'taiwan-thb').length, 3);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'taiwan-thb'), first.filter((c) => c.sourceId !== 'taiwan-thb'));
});

test('Taiwan run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const body = wrap(item(1), item(1), item(2), item(3).replace('<PositionLat>25.0', '<PositionLat>40.0'), item(4));
  const r = await runCameras(opts(dir, {}, { body }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, outOfBounds: 1 });
  assert.equal(r.report.total, 3);
});

test('Taiwan: licence row closed, wording gone, robots Disallow, HTML 200 body, empty list, unreadable, cut off: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'taiwan-thb-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'taiwan-thb-cameras') }, {}, /licence closed/],
    [{}, { terms: terms.replace('應說明原始資料來源為本局', '無須說明') }, /licence wording changed/],
    [{}, { terms: terms.replace('交通資訊內容免費對外開放使用', '交通資訊內容須付費') }, /licence wording changed/],
    [{}, { terms: terms.replace('不得小於60秒', '不得小於10秒') }, /licence wording changed/],
    [{}, { terms: '<html><body>Access denied</body></html>' }, /licence wording changed/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /opendataCCTVs' }, /robots\.txt disallows/],
    [{}, { body: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { body: '<html><body>Maintenance</body></html>' }, /feed unreadable.*no <CCTVList> root/],
    [{}, { body: list.slice(0, list.length - 40) }, /cut off/],
    [{}, { body: wrap() }, /zero cameras/],
    [{}, { body: wrap(item(1), '<CCTV></CCTV>', '<CCTV></CCTV>', '<CCTV></CCTV>', '<CCTV></CCTV>') }, /only 1 of 5/],
  ];
  for (const [o, f, re] of cases) {
    const dir = tmp(); seed(dir);
    const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
    const r = await runCameras(opts(dir, o, f));
    assert.equal(r.written, false, String(re));
    assert.match(r.reason, re);
    assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before, 'the registry is left as it was');
    assert.ok(!existsSync(join(dir, 'sources.json')));
  }
});

test('Taiwan: a list under half the size of the last good run never replaces it, and a cut-off cameras.json stops the import', async () => {
  const dir = tmp();
  assert.equal((await runCameras(opts(dir))).written, true);
  const r = await runCameras(opts(dir, {}, { body: wrap(item(1)) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 5 to 1/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Taiwan: the feed is the Bureau XML list, requested with no key, once per run (terms: not more often than every 60 seconds)', async () => {
  const p = new URL(FEED_URL);
  assert.equal(p.hostname, 'cctv-maintain.thb.gov.tw');
  assert.ok(!/key|token|@/i.test(p.search + p.username));
  assert.equal(new URL(TERMS_URL).hostname, 'thbapp.thb.gov.tw');
  assert.equal(ATTRIBUTION, 'Source: Highway Bureau, MOTC, Taiwan (thbapp.thb.gov.tw/opendata), provincial road CCTV list.');
  const hits = [];
  const dir = tmp();
  await runCameras(opts(dir, { fetchText: async (u) => { hits.push(u); return fetcher()(u); } }));
  assert.equal(hits.filter((u) => u === FEED_URL).length, 1);
  assert.ok(!hits.some((u) => /snapshot/.test(u)), 'no picture address is ever requested');
});

test('licence row: taiwan-thb-cameras passes the gate, quotes the Chinese terms and gives the URL; images stay unverified', () => {
  const r = perms.find((s) => s.id === 'taiwan-thb-cameras');
  assert.ok(r, 'row exists');
  assert.equal(r.enabled, true);
  assert.equal(r.commercialStatus, 'allowed_per_doc');
  assert.equal(r.needsHumanReview, true);
  assert.equal(r.reviewedAt, '2026-11-24');
  for (const p of LICENCE_PHRASES) assert.ok(r.licence.includes(p), p);
  assert.ok(r.licence.includes(TERMS_URL));
  assert.equal(r.attribution, ATTRIBUTION);
  assert.match(r.imageStatus, /^unverified/);
});

test('health config: the Taiwan picture host is never requested (HEAD answers 404, Range is ignored so a GET is a whole picture), every camera unknown by design', () => {
  assert.equal(CONFIG.perSource['taiwan-thb'].skip, 'host-ignores-range-and-head');
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'taiwan-thb') : [];
test('real cameras.json (when it holds Taiwan rows): valid, unique ids, only the Bureau picture hosts, no image field, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 2000);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.ok(/^https:\/\/cctv-ss0[1-8]\.thb\.gov\.tw(:443)?\/[^/]+\/snapshot$/.test(c.officialUrl), c.id);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'taiwan');
  }
});
