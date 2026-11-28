// Offline tests for the Georgia importer (GDOT 511GA cameras, ArcGIS copy by Georgia Emergency Management; no licence found, owner-approved link-out only). Run: node --test tests/registry/georgia.test.mjs
// Fixtures are real trimmed copies fetched 2026-11-25: the first 5 features of the layer (one Disabled, four Enabled) and its dataset record (ArcGIS item).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/georgia.mjs';
import { parsePage, parseCount, normalizeGeorgia, itemProblems, robotsAllows, LAYER_URL, COUNT_URL, ITEM_URL, ROBOTS_URL, PAGE_SIZE, BOUNDS, ATTRIBUTION } from '../../ops/importers/lib/georgia.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { eligibility } from '../../ops/importers/lib/eligibility.mjs';
import { isEnabled } from '../licensing/gate.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('georgia-list.json');
const item = fx('georgia-item.json');
const NOW = '2026-11-25T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'georgia-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const recs = parsePage(list).rows;
const rec = (o = {}) => ({ ...recs[1], ...o });
// a synthetic row n, shaped like the real answer
const row = (i, o = {}) => ({ ...recs[1], ObjectId: 1000 + i, Id: String(20000 + i), Url: `https://511ga.org/map/Cctv/${20000 + i}`, Description: `ATL-${i}: SR 1 at Main St`, ...o });
const pageOf = (rows, more = false) => JSON.stringify({ features: rows.map((attributes) => ({ attributes })), ...(more ? { exceededTransferLimit: true } : {}) });
// serves the count and the pages of `rows` the way ArcGIS does: by resultOffset and resultRecordCount (capped at `cap`)
const server = (rows, { cap = 1000, count = rows.length, hits = [] } = {}) => async (url) => {
  hits.push(url);
  if (url === COUNT_URL) return JSON.stringify({ count });
  const u = new URL(url);
  if (u.pathname.endsWith('/query')) {
    const off = Number(u.searchParams.get('resultOffset')), n = Math.min(Number(u.searchParams.get('resultRecordCount')), cap);
    return pageOf(rows.slice(off, off + n), off + n < rows.length);
  }
  throw new Error('unexpected url ' + url);
};
const fetcher = (o = {}) => async (url) => {
  const v = url === ITEM_URL ? (o.item ?? item) : url === ROBOTS_URL ? (o.robots ?? 'ERR') : (o.feed ?? server(recs))(url);
  if (v === 'ERR' && url === ROBOTS_URL) throw new Error('HTTP 403');
  const r = await v;
  if (r instanceof Error) throw r;
  return r;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, ...o });
const many = (n) => Array.from({ length: n }, (_, i) => row(i));

test('Georgia normalize: id and link from the 511GA camera id, name and road as GDOT wrote them, direction as text, no city, no stream link', () => {
  const drop = {}, seen = new Set();
  const ok = recs.map((r) => normalizeGeorgia(r, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, { notEnabled: 1 }, 'the Disabled camera with zero coordinates is not listed');
  assert.equal(ok.length, 4);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'georgia-511-18549');
  assert.equal(c.sourceId, 'georgia-511');
  assert.equal(c.name, 'BARR-0003: SR 211 at Horton St (Barrow)');
  assert.equal(c.road, 'SR 211');
  assert.equal(c.city, null);
  assert.equal(c.direction, '');
  assert.equal(c.locationText, 'Direction: East.');
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'georgia');
  assert.equal(c.lat, 33.995518);
  assert.equal(c.lon, -83.733475);
  assert.equal(c.officialUrl, 'https://511ga.org/map/Cctv/18549');
  assert.ok(!JSON.stringify(c).includes('m3u8'), 'the HLS stream link is never kept');
  assert.equal(REGION_COUNTRY.georgia.countrySlug, 'united-states');
  assert.equal(new Set(ok.map((x) => x.id)).size, 4, 'ids are unique');
  for (const x of ok) { for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f); const e = eligibility(x); assert.equal(e.directory_eligible, true, x.id); assert.equal(e.link_class, 'stable'); }
});

test('Georgia normalize: bad rows are dropped and counted (disabled, foreign link, id and link disagree, http, stream only, N/A name, zero or missing coords, out of bounds, malformed, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    rec({ Status: 'Disabled' }), rec({ Status: '' }), rec({ Status: undefined }),
    rec({ Url: 'https://example.com/map/Cctv/18549' }), rec({ Url: 'http://511ga.org/map/Cctv/18549' }), rec({ Url: 'https://511ga.org/map/Cctv/99' }), rec({ Url: 'https://511ga.org/map/Cctv/18549/x' }),
    rec({ Url: 'https://511ga.org.evil.example/map/Cctv/18549' }), rec({ Url: null }), rec({ Url: undefined, VideoUrl: 'https://sfs.example/playlist.m3u8' }),
    rec({ Description: 'N/A' }), rec({ Description: ' ' }), rec({ Description: null }),
    rec({ Latitude: 0, Longitude: 0 }), rec({ Latitude: null }), rec({ Longitude: 'abc' }), rec({ Latitude: NaN }),
    rec({ Latitude: 48.85, Longitude: 2.35 }), rec({ Latitude: 33.9, Longitude: -70 }),
    null, 'x', 5,
  ];
  for (const r of bad) assert.equal(normalizeGeorgia(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { notEnabled: 3, noUrl: 7, noName: 3, badCoords: 4, outOfBounds: 2, malformed: 3 });
  assert.ok(normalizeGeorgia(rec(), NOW, drop, seen));
  assert.equal(normalizeGeorgia(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 33.9 && BOUNDS.latMax > 33.9 && BOUNDS.lonMin < -84 && BOUNDS.lonMax > -84);
  assert.ok(!('locationText' in normalizeGeorgia(rec({ Direction: 'Unknown', Id: '18549' }), NOW)), 'Unknown direction: no locationText');
  assert.equal(normalizeGeorgia(rec({ Description: '  SR 211   at Horton ' }), NOW).name, 'SR 211 at Horton', 'name is trimmed and spaces collapsed');
});

test('Georgia feed: an HTML 200 page, an ArcGIS error body, an empty body and a cut-off page are refused; the count answer is checked the same way', () => {
  assert.equal(recs.length, 5);
  assert.throws(() => parsePage('<html><body>Service unavailable</body></html>'), /no JSON object/);
  assert.throws(() => parsePage(''), /no JSON object/);
  assert.throws(() => parsePage('{"error":{"code":400,"message":"Cannot perform query. Invalid query parameters."}}'), /ArcGIS error 400/);
  assert.throws(() => parsePage('{"objectIdFieldName":"ObjectId"}'), /no features array/);
  assert.throws(() => parsePage(list.slice(0, list.length - 40)), /cut off/);
  assert.equal(parsePage(pageOf([row(1)], true)).more, true);
  assert.equal(parsePage(pageOf([row(1)])).more, false);
  assert.equal(parseCount('{"count":3830}'), 3830);
  assert.throws(() => parseCount('{"error":{"code":500,"message":"x"}}'), /ArcGIS error 500/);
  assert.throws(() => parseCount('<html></html>'), /not JSON/);
  assert.throws(() => parseCount('{"count":"12"}'), /not a count/);
});

test('Georgia dataset record: the real item passes; a changed title, owner, id or an error body is a problem', () => {
  assert.deepEqual(itemProblems(item), []);
  assert.match(itemProblems(item.replace('"title":"GDOT 511 Cameras"', '"title":"Cameras"'))[0], /dataset title/);
  assert.match(itemProblems(item.replace('"owner":"rbagby_gema"', '"owner":"someone"'))[0], /dataset owner/);
  assert.match(itemProblems(item.replace('"id":"12c979ba84b54b83b834fdd2d861677d"', '"id":"x"'))[0], /dataset id/);
  assert.match(itemProblems('{"error":{"code":400,"message":"Item does not exist or is inaccessible."}}')[0], /not an item/);
  assert.match(itemProblems('<html>')[0], /not JSON/);
  assert.match(itemProblems('[]')[0], /not an item/);
});

test('Georgia robots: a 403 or 404 or no file means no rules; a Disallow for the feed path stops, an Allow of a longer path wins', () => {
  const p = new URL(LAYER_URL).pathname + '/query';
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('<html><title>403 Forbidden</title></html>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /2iUE8l8JKrP2tygQ', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /2iUE8l8JKrP2tygQ\nAllow: /2iUE8l8JKrP2tygQ/arcgis/rest', p), true);
});

test('Georgia run: writes its own rows, a source row and a report; every other source is untouched; the disabled camera is not written', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir, { minUsable: 3 }));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'georgia-511').length, 4);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'georgia-511'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'georgia-511');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.deepEqual(r.report.dropped, { notEnabled: 1 });
  assert.equal(r.report.raw, 5);
  assert.ok(existsSync(join(dir, 'import-report-georgia.json')));
});

test('Georgia run: a list longer than one page is read to the end (server cap 1000, so 3,830 rows take four pages) and the total equals the layer count', async () => {
  const rows = many(3830);
  const hits = [];
  const dir = tmp();
  const r = await runCameras(opts(dir, {}, { feed: server(rows, { hits }) }));
  assert.equal(r.written, true, r.reason);
  assert.equal(r.report.raw, 3830);
  assert.equal(r.report.total, 3830);
  assert.equal(read(dir).length, 3830);
  const pages = hits.filter((u) => u.includes('/query') && !u.includes('returnCountOnly'));
  assert.equal(pages.length, 4);
  assert.ok(pages.every((u) => u.includes('orderByFields=ObjectId')), 'paging needs a stable order');
  assert.equal(PAGE_SIZE, 1000);
  const hits2 = [];
  await runCameras(opts(tmp(), {}, { feed: server(rows, { cap: 400, hits: hits2 }) }));
  assert.equal(hits2.filter((u) => u.includes('resultOffset')).length, 10, 'a server that gives less than asked is paged on by the count');
});

test('Georgia run: only georgia rows are rewritten on a second run, other sources stay byte-equal', async () => {
  const dir = tmp(); seed(dir);
  await runCameras(opts(dir, { minUsable: 3 }));
  const first = read(dir);
  const r = await runCameras(opts(dir, { minUsable: 3 }, { feed: server(recs.slice(0, 4)) }));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'georgia-511').length, 3);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'georgia-511'), first.filter((c) => c.sourceId !== 'georgia-511'));
});

test('Georgia run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const rows = [...many(1600), row(1), row(2, { Url: 'https://example.com/a' }), row(3, { Latitude: 10 }), row(4, { Status: 'Disabled' })];
  const r = await runCameras(opts(dir, {}, { feed: server(rows) }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, noUrl: 1, outOfBounds: 1, notEnabled: 1 });
  assert.equal(r.report.total, 1600);
});

test('Georgia: licence closed, dataset record changed, robots Disallow, HTML 200 body, ArcGIS error, short or long read, empty, unreadable: nothing written and the old file is kept (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'georgia-511-cameras' ? { ...s, ownerApprovedAt: '2026-11-20' } : s));
  const big = many(1600);
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.map((s) => (s.id === 'georgia-511-cameras' ? { ...s, commercialStatus: 'unknown' } : s)) }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'georgia-511-cameras') }, {}, /licence closed/],
    [{}, { item: item.replace('"title":"GDOT 511 Cameras"', '"title":"Other"') }, /dataset record changed/],
    [{}, { item: new Error('HTTP 500') }, /dataset record unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /2iUE8l8JKrP2tygQ' }, /robots\.txt disallows/],
    [{}, { feed: async () => { throw new Error('HTTP 503'); } }, /feed unreadable/],
    [{}, { feed: async () => '<html><body>Maintenance</body></html>' }, /feed unreadable/],
    [{}, { feed: async (u) => (u === COUNT_URL ? '{"count":1600}' : '{"error":{"code":400,"message":"Invalid query"}}') }, /feed unreadable.*ArcGIS error 400/],
    [{}, { feed: server(big, { count: 1601 }) }, /read 1600 rows but the layer counts 1601/],
    [{}, { feed: server(big, { count: 1599 }) }, /read 1599 rows but the layer counts 1599|read 1600 rows but the layer counts 1599/],
    [{}, { feed: server([]) }, /only 0 usable/],
    [{}, { feed: server(many(10)) }, /only 10 usable cameras/],
  ];
  for (const [o, f, re] of cases) {
    const dir = tmp(); seed(dir);
    const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
    const r = await runCameras(opts(dir, o, { feed: server(big), ...f }));
    assert.equal(r.written, false, String(re));
    assert.match(r.reason, re);
    assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before, 'the registry is left as it was');
    assert.ok(!existsSync(join(dir, 'sources.json')));
  }
});

test('Georgia: a server that keeps saying "more" with empty pages stops (no endless loop), an empty feed after a good run keeps the old file, and a list under half the last good run never replaces it', async () => {
  const dir = tmp();
  const endless = async (u) => (u === COUNT_URL ? '{"count":1600}' : pageOf(u.includes('resultOffset=0') ? many(1000) : [], true));
  const r0 = await runCameras(opts(dir, {}, { feed: endless }));
  assert.equal(r0.written, false, 'count 1600 but only 1000 rows readable: refused');
  const good = await runCameras(opts(dir, {}, { feed: server(many(1600)) }));
  assert.equal(good.written, true, good.reason);
  const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
  const empty = await runCameras(opts(dir, { minUsable: 0 }, { feed: server([]) }));
  assert.equal(empty.written, false);
  assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before, 'an empty feed keeps the old file');
  const r = await runCameras(opts(dir, { minUsable: 1 }, { feed: server(many(500)) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 1600 to 500/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2, {}, { feed: server(many(1600)) }));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Georgia: the feed is the ArcGIS layer, requested with no key, a count query and pages only; 511ga.org is never requested', async () => {
  const p = new URL(LAYER_URL);
  assert.equal(p.hostname, 'services1.arcgis.com');
  assert.ok(!/key|token|@/i.test(p.search + p.username));
  assert.equal(ATTRIBUTION, 'Georgia Department of Transportation (511GA)');
  const hits = [];
  const dir = tmp();
  await runCameras(opts(dir, { fetchText: async (u) => { hits.push(u); return fetcher({ feed: server(many(1600)) })(u); } }));
  assert.equal(hits.filter((u) => u === COUNT_URL).length, 1);
  assert.ok(!hits.some((u) => /511ga|m3u8|navigator\.dot\.ga/.test(u)), 'no 511ga.org, picture or stream address is requested');
  assert.ok(hits.every((u) => /^https:\/\/(services1|www)\.arcgis\.com\//.test(u)));
});

test('licence row: georgia-511-cameras is open only through the owner approval for this source, says no licence was found, and keeps metadata and images unverified', () => {
  const r = perms.find((s) => s.id === 'georgia-511-cameras');
  assert.ok(r, 'row exists');
  assert.equal(r.commercialStatus, 'allowed_per_owner');
  assert.equal(r.ownerApprovedAt, '2026-11-25');
  assert.equal(r.enabled, true);
  assert.equal(r.needsHumanReview, true);
  assert.equal(r.reviewedAt, '2026-11-25');
  assert.equal(r.attribution, ATTRIBUTION);
  assert.equal(r.metadataPermission.status, 'unverified');
  assert.equal(r.imagePermission.status, 'unverified');
  assert.match(r.licence, /No licence or terms page was found/);
  assert.match(r.imageStatus, /^unverified/);
  assert.equal(isEnabled(r, new Date('2026-11-26')), true);
});

test('health config: 511ga.org answers every HEAD 200 image/png with length 0; only a dated answer (never a made-up id) counts, HEAD only, at most 2 a second', () => {
  const c = CONFIG.perSource['georgia-511'];
  assert.deepEqual(c, { concurrency: 1, hostDelayMs: 500, staleHours: 6, zeroLengthHead: true, needValidators: true });
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'georgia-511') : [];
test('real cameras.json (when it holds Georgia rows): valid, unique ids, only the 511GA camera page link, no image field, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 3000);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.equal(c.officialUrl, `https://511ga.org/map/Cctv/${c.id.replace('georgia-511-', '')}`);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'united-states');
  }
});
