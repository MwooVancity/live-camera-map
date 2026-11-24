// Offline tests for the Iowa importer (Iowa DOT Traffic Cameras, ArcGIS FeatureServer, CC BY 4.0). Run: node --test tests/registry/iowa.test.mjs
// Fixtures are real trimmed copies fetched 2026-11-24: 5 features of the layer, its dataset record (ArcGIS item) and the part of the Iowa DOT terms page with the licence sentences.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/iowa.mjs';
import { parsePage, parseCount, normalizeIowa, itemProblems, robotsAllows, pageText, LAYER_URL, COUNT_URL, ITEM_URL, ROBOTS_URL, TERMS_URL, PAGE_SIZE, BOUNDS, ATTRIBUTION, LICENCE_PHRASES } from '../../ops/importers/lib/iowa.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('iowa-list.json');
const item = fx('iowa-item.json');
const terms = fx('iowa-terms.html');
const NOW = '2026-11-24T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'iowa-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const recs = parsePage(list).rows;
const rec = (o = {}) => ({ ...recs[0], ...o });
// a synthetic page of n cameras with distinct picture files, shaped like the real answer
const row = (i, o = {}) => ({ ...recs[0], FID: 1000 + i, Desc_: `I-35 @ MM ${i}`, ImageURL: `https://atmsqf.iowadot.gov/SNAPSHOTS/PUBLIC/Metro/t${i}.jpeg`, ...o });
const pageOf = (rows, more = false) => JSON.stringify({ features: rows.map((attributes) => ({ attributes })), ...(more ? { exceededTransferLimit: true } : {}) });
// serves the count and the pages of `rows` the way ArcGIS does: by resultOffset and resultRecordCount (capped at `cap`)
const server = (rows, { cap = 2000, count = rows.length, hits = [] } = {}) => async (url) => {
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
  const v = url === ITEM_URL ? (o.item ?? item) : url === TERMS_URL ? (o.terms ?? terms) : url === ROBOTS_URL ? (o.robots ?? 'ERR') : (o.feed ?? server(recs))(url);
  if (v === 'ERR' && url === ROBOTS_URL) throw new Error('HTTP 403');
  const r = await v;
  if (r instanceof Error) throw r;
  return r;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, ...o });
// enough rows to pass the importer's minimum of 300 usable cameras
const many = (n) => Array.from({ length: n }, (_, i) => row(i));

test('Iowa normalize: id from the picture file path, name and route as the DOT wrote them, type and function as text, link only on the DOT picture host, no city', () => {
  const drop = {}, seen = new Set();
  const ok = recs.map((r) => normalizeIowa(r, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, {});
  assert.equal(ok.length, 5);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'iowa-dot-public-metro-80tv114hd');
  assert.equal(c.name, 'I-80 @ MM 114.2');
  assert.equal(c.road, 'I-80');
  assert.equal(c.city, null);
  assert.equal(c.direction, '');
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'iowa');
  assert.equal(c.lat, 41.553252);
  assert.equal(c.lon, -93.93048);
  assert.equal(c.locationText, 'Type: Iowa DOT. Function: General.');
  assert.equal(c.officialUrl, 'https://atmsqf.iowadot.gov/SNAPSHOTS/PUBLIC/Metro/80tv114hd.jpeg');
  assert.ok(!JSON.stringify(c).includes('m3u8'), 'the HLS stream link is never kept');
  assert.equal(REGION_COUNTRY.iowa.countrySlug, 'united-states');
  assert.equal(REGION_COUNTRY.iowa.countryCode, 'US');
  assert.equal(new Set(ok.map((x) => x.id)).size, 5, 'ids are unique');
  assert.ok(ok.every((x) => /^iowa-dot-[a-z0-9-]+$/.test(x.id)), 'ids are lower case whatever the path case in the feed');
  for (const x of ok) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('Iowa normalize: the same station with several views and mixed path case gives one camera per picture file', () => {
  const a = normalizeIowa(rec({ ImageURL: 'https://atmsqf.iowadot.gov/snapshots/public/RWIS/RWIS_53-00.jpg' }), NOW);
  const b = normalizeIowa(rec({ ImageURL: 'https://atmsqf.iowadot.gov/snapshots/Public/RWIS/RWIS_53-02.jpg' }), NOW);
  assert.equal(a.id, 'iowa-dot-public-rwis-rwis-53-00');
  assert.equal(b.id, 'iowa-dot-public-rwis-rwis-53-02');
  assert.equal(normalizeIowa(rec({ COMMON_ID: 'X', FID: 1 }), NOW).id, normalizeIowa(rec({ COMMON_ID: 'Y', FID: 2 }), NOW).id, 'the id does not depend on COMMON_ID or FID (COMMON_ID repeats, FID is a server row number)');
});

test('Iowa normalize: bad rows are dropped and counted (foreign link, http link, stream only, no name, bad coords, out of bounds, malformed, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    rec({ ImageURL: 'https://example.com/snapshots/public/a.jpg' }), rec({ ImageURL: 'http://atmsqf.iowadot.gov/snapshots/public/a.jpg' }),
    rec({ ImageURL: 'https://atmsqf.iowadot.gov/other/a.jpg' }), rec({ ImageURL: 'https://atmsqf.iowadot.gov/snapshots/../x.jpg' }), rec({ ImageURL: 'https://atmsqf.iowadot.gov.evil.example/snapshots/a.jpg' }),
    rec({ ImageURL: '' }), rec({ ImageURL: null }), rec({ ImageURL: undefined, VideoURL: 'https://video3.iowadot.gov:8888/ankeny/80tv114lb/playlist.m3u8' }),
    rec({ Desc_: ' ' }), rec({ Desc_: null }),
    rec({ latitude: null }), rec({ longitude: 'abc' }), rec({ latitude: NaN }),
    rec({ latitude: 48.85, longitude: 2.35 }), rec({ latitude: 41.5, longitude: -80 }),
    null, 'x', 5,
  ];
  for (const r of bad) assert.equal(normalizeIowa(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { noUrl: 8, noName: 2, badCoords: 3, outOfBounds: 2, malformed: 3 });
  assert.ok(normalizeIowa(rec(), NOW, drop, seen));
  assert.equal(normalizeIowa(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 41.5 && BOUNDS.latMax > 41.5 && BOUNDS.lonMin < -93.9 && BOUNDS.lonMax > -93.9);
  assert.ok(!('locationText' in normalizeIowa(rec({ Type: '', FUNCTION: null }), NOW)), 'no type and no function: no locationText');
  assert.equal(normalizeIowa(rec({ Desc_: '  I-80   @ MM 1 ' }), NOW).name, 'I-80 @ MM 1', 'name is trimmed and spaces collapsed');
});

test('Iowa feed: an HTML 200 page, an ArcGIS error body, an empty body and a cut-off page are refused; the count answer is checked the same way', () => {
  assert.equal(recs.length, 5);
  assert.throws(() => parsePage('<html><body>Service unavailable</body></html>'), /no JSON object/);
  assert.throws(() => parsePage(''), /no JSON object/);
  assert.throws(() => parsePage('{"error":{"code":400,"message":"Cannot perform query. Invalid query parameters."}}'), /ArcGIS error 400/);
  assert.throws(() => parsePage('{"objectIdFieldName":"FID"}'), /no features array/);
  assert.throws(() => parsePage(list.slice(0, list.length - 40)), /cut off/);
  assert.equal(parsePage(pageOf([row(1)], true)).more, true);
  assert.equal(parsePage(pageOf([row(1)])).more, false);
  assert.equal(parseCount('{"count":1253}'), 1253);
  assert.throws(() => parseCount('{"error":{"code":500,"message":"x"}}'), /ArcGIS error 500/);
  assert.throws(() => parseCount('<html></html>'), /not JSON/);
  assert.throws(() => parseCount('{"count":"12"}'), /not a count/);
});

test('Iowa dataset record: the real item passes; a changed licence, terms link, title, owner or an error body is a problem', () => {
  assert.deepEqual(itemProblems(item), []);
  assert.match(itemProblems(item.replace('Creative Commons Attribution 4.0 International License', 'Creative Commons Attribution-NonCommercial 4.0 International License'))[0], /dataset licence no longer says/);
  assert.match(itemProblems(item.replace('iowadot.gov/policies_and_statements/terms-of-use#gis', 'iowadot.gov/other'))[0], /no longer links/);
  assert.match(itemProblems(item.replace('"title":"Traffic Cameras"', '"title":"Cameras"'))[0], /dataset title/);
  assert.match(itemProblems(item.replace('"owner":"IowaDOT_OTO"', '"owner":"someone"'))[0], /dataset owner/);
  assert.match(itemProblems('{"error":{"code":400,"message":"Item does not exist or is inaccessible."}}')[0], /not an item/);
  assert.match(itemProblems('<html>')[0], /not JSON/);
  assert.match(itemProblems('[]')[0], /not an item/);
});

test('Iowa terms text: tags removed, every required sentence is in the fixture and in none of the broken pages', () => {
  const t = pageText(terms);
  for (const p of LICENCE_PHRASES) assert.ok(t.includes(p), p);
  assert.equal(LICENCE_PHRASES.length, 3);
  assert.ok(ATTRIBUTION.includes('Iowa Department of Transportation') && ATTRIBUTION.includes('CC BY 4.0'));
  assert.ok(!pageText('<html><body>Access denied</body></html>').includes(LICENCE_PHRASES[0]));
});

test('Iowa robots: a 403 or 404 or no file means no rules; a Disallow for the feed path stops, an Allow of a longer path wins', () => {
  const p = new URL(LAYER_URL).pathname + '/query';
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('<html><title>403 Forbidden</title></html>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /8lRhdTsQyJpO52F1', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /8lRhdTsQyJpO52F1\nAllow: /8lRhdTsQyJpO52F1/arcgis/rest', p), true);
});

test('Iowa run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir, { minUsable: 3 }));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'iowa-dot').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'iowa-dot'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'iowa-dot');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(r.report.total, 5);
  assert.equal(r.report.raw, 5);
  assert.ok(existsSync(join(dir, 'import-report-iowa.json')));
});

test('Iowa run: a list longer than one page is read to the end (page size 1000, server cap 400 forces more pages), and the total equals the layer count', async () => {
  const rows = many(1253);
  const hits = [];
  const dir = tmp();
  const r = await runCameras(opts(dir, {}, { feed: server(rows, { cap: 400, hits }) }));
  assert.equal(r.written, true, r.reason);
  assert.equal(r.report.raw, 1253);
  assert.equal(r.report.total, 1253);
  assert.equal(read(dir).length, 1253);
  const pages = hits.filter((u) => u.includes('/query') && !u.includes('returnCountOnly'));
  assert.equal(pages.length, 4, 'four pages of at most 400 rows');
  assert.ok(pages.every((u) => u.includes('orderByFields=FID')), 'paging needs a stable order');
  assert.equal(PAGE_SIZE, 1000);
  const hits2 = [];
  await runCameras(opts(tmp(), {}, { feed: server(rows, { hits: hits2 }) }));
  assert.equal(hits2.filter((u) => u.includes('resultOffset')).length, 2, 'with the real cap of 2000 and a page of 1000, 1,253 rows take two pages');
});

test('Iowa run: only iowa rows are rewritten on a second run, other sources stay byte-equal', async () => {
  const dir = tmp(); seed(dir);
  await runCameras(opts(dir, { minUsable: 3 }));
  const first = read(dir);
  const r = await runCameras(opts(dir, { minUsable: 3 }, { feed: server(recs.slice(0, 3)) }));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'iowa-dot').length, 3);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'iowa-dot'), first.filter((c) => c.sourceId !== 'iowa-dot'));
});

test('Iowa run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const rows = [...many(400), row(1), row(2, { ImageURL: 'https://example.com/a.jpg' }), row(3, { latitude: 10 })];
  const r = await runCameras(opts(dir, {}, { feed: server(rows) }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, noUrl: 1, outOfBounds: 1 });
  assert.equal(r.report.total, 400);
});

test('Iowa: licence row closed, wording gone, dataset record changed, robots Disallow, HTML 200 body, ArcGIS error, short or long read, unreadable: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'iowa-dot-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const big = many(400);
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'iowa-dot-cameras') }, {}, /licence closed/],
    [{}, { terms: terms.split('for any purpose, including commercial use').join('for non-commercial purposes only') }, /licence wording changed/],
    [{}, { terms: terms.replace('you agree to defend and indemnify', 'you may rely on') }, /licence wording changed/],
    [{}, { terms: terms.split('Creative Commons Attribution 4.0 International Public License (CC BY 4.0)').join('a new licence') }, /licence wording changed/],
    [{}, { terms: '<html><body>Access denied</body></html>' }, /licence wording changed/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { item: item.replace('Creative Commons Attribution 4.0 International License', 'All rights reserved') }, /licence wording changed/],
    [{}, { item: new Error('HTTP 500') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /8lRhdTsQyJpO52F1' }, /robots\.txt disallows/],
    [{}, { feed: async () => { throw new Error('HTTP 503'); } }, /feed unreadable/],
    [{}, { feed: async () => '<html><body>Maintenance</body></html>' }, /feed unreadable/],
    [{}, { feed: async (u) => (u === COUNT_URL ? '{"count":400}' : '{"error":{"code":400,"message":"Invalid query"}}') }, /feed unreadable.*ArcGIS error 400/],
    [{}, { feed: server(big, { count: 401 }) }, /read 400 rows but the layer counts 401/],
    [{}, { feed: server(big, { count: 399 }) }, /read 400 rows but the layer counts 399/],
    [{}, { feed: server([]) }, /read 0 rows but|zero cameras|only 0 usable/],
    [{}, { feed: server(many(10)) }, /only 10 usable cameras/],
  ];
  for (const [o, f, re] of cases) {
    const dir = tmp(); seed(dir);
    const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
    const r = await runCameras(opts(dir, o, { feed: server(big), ...f })); // a healthy 400-row list unless the case replaces it
    assert.equal(r.written, false, String(re));
    assert.match(r.reason, re);
    assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before, 'the registry is left as it was');
    assert.ok(!existsSync(join(dir, 'sources.json')));
  }
});

test('Iowa: a server that keeps saying "more" with empty pages stops (no endless loop), and a list under half the last good run never replaces it', async () => {
  const dir = tmp();
  const endless = async (u) => (u === COUNT_URL ? '{"count":400}' : pageOf(u.includes('resultOffset=0') ? many(400) : [], true));
  const r0 = await runCameras(opts(dir, {}, { feed: endless }));
  assert.equal(r0.written, true, r0.reason);
  const r = await runCameras(opts(dir, { minUsable: 1 }, { feed: server(many(150)) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 400 to 150/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2, {}, { feed: server(many(400)) }));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Iowa: the feed is the ArcGIS layer, requested with no key, a count query and pages only; no picture or stream address is ever requested', async () => {
  const p = new URL(LAYER_URL);
  assert.equal(p.hostname, 'services.arcgis.com');
  assert.ok(!/key|token|@/i.test(p.search + p.username));
  assert.equal(new URL(TERMS_URL).hostname, 'iowadot.gov');
  assert.equal(ATTRIBUTION, 'Source: Iowa Department of Transportation, Traffic Cameras, CC BY 4.0.');
  const hits = [];
  const dir = tmp();
  await runCameras(opts(dir, { fetchText: async (u) => { hits.push(u); return fetcher({ feed: server(many(400)) })(u); } }));
  assert.equal(hits.filter((u) => u === COUNT_URL).length, 1);
  assert.ok(!hits.some((u) => /atmsqf|m3u8|video\d/.test(u)), 'no picture or stream address is requested');
  assert.ok(hits.every((u) => /^https:\/\/(services\.arcgis\.com|www\.arcgis\.com|iowadot\.gov)\//.test(u)));
});

test('licence row: iowa-dot-cameras passes the gate, quotes the CC BY sentences, names the indemnification clause and gives the URL; images stay unverified', () => {
  const r = perms.find((s) => s.id === 'iowa-dot-cameras');
  assert.ok(r, 'row exists');
  assert.equal(r.enabled, true);
  assert.equal(r.commercialStatus, 'allowed_per_doc');
  assert.equal(r.needsHumanReview, true);
  assert.equal(r.reviewedAt, '2026-11-24');
  assert.ok(r.licence.includes('This work is licensed under a Creative Commons Attribution 4.0 International License'));
  assert.ok(r.licence.includes('This license allows you to copy, share, adapt, transform, and build upon the Data for any purpose, including commercial use, provided that you give appropriate credit to the Iowa Department of Transportation as the Data source'));
  assert.ok(r.licence.includes('you agree to defend and indemnify Iowa DOT and the State of Iowa for claims arising from your use of the data'), 'the indemnification clause is quoted for the owner');
  assert.ok(r.licence.includes('OWNER MUST SEE'));
  assert.ok(r.licence.includes(TERMS_URL) && r.licence.includes('c4063f200a7b4da5826e2ac86c677cf5'));
  assert.equal(r.attribution, ATTRIBUTION);
  assert.match(r.imageStatus, /^unverified/);
});

test('health config: the Iowa picture host gets the normal polite pace (one worker, 250 ms apart, HEAD), 1,253 pictures take about 5 minutes', () => {
  const c = CONFIG.perSource['iowa-dot'];
  assert.deepEqual(c, { concurrency: 1, hostDelayMs: 250, staleHours: 6 });
  assert.ok(1253 * c.hostDelayMs < CONFIG.budgetMs * 0.5, 'the whole list fits well inside the time budget on its own');
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'iowa-dot') : [];
test('real cameras.json (when it holds Iowa rows): valid, unique ids, only the DOT picture host, no image field, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 1000);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.ok(/^https:\/\/atmsqf\.iowadot\.gov\/snapshots\//i.test(c.officialUrl), c.id);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'united-states');
  }
});
