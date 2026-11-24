// Offline tests for the Austin importer (City of Austin Open Data "Traffic Cameras", public domain). Run: node --test tests/registry/austin.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/austin.mjs';
import { parseFeed, normalizeAustin, termsText, metaProblems, FEED_URL, META_URL, ROBOTS_URL, TERMS_URL, AUSTIN_BOUNDS, ATTRIBUTION, LICENCE_PHRASES } from '../../ops/importers/lib/austin.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('austin-rows.json');
const terms = fx('austin-terms.json');
const meta = fx('austin-meta.json');
const NOW = '2026-11-24T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'atx-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const fetcher = (o = {}) => async (url) => {
  const v = url === META_URL ? (o.meta ?? meta) : url === TERMS_URL ? (o.terms ?? terms) : url === ROBOTS_URL ? (o.robots ?? 'Crawl-delay: 1\n') : (o.body ?? list);
  if (v instanceof Error) throw v;
  return v;
};
const opts = (dir, o = {}, f = {}) => ({ minUsable: 1, fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, ...o });
const recs = parseFeed(list);
const rec = (o = {}) => ({ ...recs[1], ...o });
const row = (id, extra = {}) => ({ camera_id: String(id), location_name: `PLACE ${id}`, camera_status: 'TURNED_ON', primary_st: 'MAIN ST', screenshot_address: `https://cctv.austinmobility.io/image/${id}.jpg`, location: { type: 'Point', coordinates: [-97.74, 30.27] }, ...extra });
const wrap = (...items) => JSON.stringify(items);

test('Austin normalize: id, region and country from one place, link is the City picture address only, name keeps the camera number, street and cross street, no city', () => {
  const drop = {}, seen = new Set();
  const cams = recs.map((r) => normalizeAustin(r, NOW, drop, seen));
  assert.deepEqual(drop, { notTurnedOn: 3 });
  const c = cams[1];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'austin-traffic-6');
  assert.equal(c.name, 'LAVACA ST / 3RD ST [6]');
  assert.equal(c.road, 'LAVACA ST');
  assert.equal(c.locationText, 'Cross street: 3RD ST. Signal area: Central.');
  assert.equal(cams[3].locationText, undefined, 'no cross street and no area: no text');
  assert.equal(c.city, null);
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'texas');
  assert.equal(REGION_COUNTRY.texas.countrySlug, 'united-states');
  assert.equal(c.lat, 30.26593);
  assert.equal(c.lon, -97.746246, 'the feed lists [lon, lat]');
  assert.equal(c.officialUrl, 'https://cctv.austinmobility.io/image/6.jpg');
  assert.notEqual(cams[1].name, cams[2].name, 'two places with one text still get two labels');
  for (const x of cams.filter(Boolean)) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('Austin normalize: only TURNED_ON is kept; foreign or http links, no name, bad coords, out of bounds, bad id, duplicate are dropped and counted, never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    rec({ camera_status: 'DESIRED' }), rec({ camera_status: 'turned_on' }), rec({ camera_status: undefined }),
    rec({ screenshot_address: 'https://example.com/image/6.jpg' }), rec({ screenshot_address: 'http://cctv.austinmobility.io/image/6.jpg' }), rec({ screenshot_address: 'https://cctv.austinmobility.io/image/../x.jpg' }), rec({ screenshot_address: '' }),
    rec({ location_name: ' ' }),
    rec({ location: null }), rec({ location: { coordinates: ['-97.7', '30.2'] } }),
    rec({ location: { coordinates: [-97.7, 29.5] } }), rec({ location: { coordinates: [-100.0, 30.2] } }), rec({ location: { coordinates: [0, 0] } }),
    rec({ camera_id: 'abc' }), rec({ camera_id: '' }), null, 'x',
  ];
  for (const r of bad) assert.equal(normalizeAustin(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { notTurnedOn: 3, noUrl: 4, noName: 1, badCoords: 2, outOfBounds: 3, malformed: 4 });
  assert.ok(normalizeAustin(rec(), NOW, drop, seen));
  assert.equal(normalizeAustin(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(AUSTIN_BOUNDS.latMin < 30.27 && AUSTIN_BOUNDS.latMax > 30.27 && AUSTIN_BOUNDS.lonMin < -97.7 && AUSTIN_BOUNDS.lonMax > -97.5);
});

test('Austin feed: an HTML 200 page, an object, an error body, an empty body and a cut-off list are refused', () => {
  assert.equal(recs.length, 7);
  assert.throws(() => parseFeed('<html><body>Service unavailable</body></html>'), /no JSON array/);
  assert.throws(() => parseFeed('{"error":true,"message":"Not found"}'), /no JSON array/);
  assert.throws(() => parseFeed(''), /no JSON array/);
  assert.throws(() => parseFeed(list.slice(0, list.length - 60)), /cut off/);
});

test('Austin terms text: tags are removed, every required phrase is in the fixture; an HTML page or a story with no text is refused', () => {
  const t = termsText(terms);
  for (const p of LICENCE_PHRASES) assert.ok(t.includes(p), p);
  assert.throws(() => termsText('<html><body>Not found</body></html>'), /not JSON/);
  assert.throws(() => termsText('{"blocks":[]}'), /no text blocks/);
});

test('Austin metadata: the Public Domain licence, the exact attribution and the department must all still be there', () => {
  assert.deepEqual(metaProblems(meta), []);
  const m = JSON.parse(meta);
  assert.match(metaProblems(JSON.stringify({ ...m, license: { name: 'CC BY-NC 4.0' } })).join(), /dataset licence is "CC BY-NC 4\.0"/);
  assert.match(metaProblems(JSON.stringify({ ...m, license: undefined })).join(), /dataset licence/);
  assert.match(metaProblems(JSON.stringify({ ...m, attribution: 'Someone else' })).join(), /attribution/);
  assert.match(metaProblems(JSON.stringify({ ...m, description: 'A list.' })).join(), /Austin Transportation/);
  assert.match(metaProblems('<html>error</html>').join(), /not JSON/);
  assert.match(metaProblems('[]').join(), /not a dataset record/);
});

test('Austin run: writes its own rows (TURNED_ON only), a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'austin-traffic').length, 4);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'austin-traffic'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'austin-traffic');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(r.report.total, 4);
  assert.deepEqual(r.report.dropped, { notTurnedOn: 3 });
  assert.ok(existsSync(join(dir, 'import-report-austin.json')));
});

test('Austin run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const body = wrap(row(1), row(1), row(2), row(3, { location: { coordinates: [-70, 30.2] } }), row(4, { screenshot_address: '' }), row(5), row(7), row(6, { camera_status: 'VOID' }));
  const r = await runCameras(opts(dir, {}, { body }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, outOfBounds: 1, noUrl: 1, notTurnedOn: 1 });
  assert.equal(r.report.total, 4);
});

test('Austin: licence row closed, metadata licence changed, terms wording gone, robots Disallow, HTML 200 body, empty list, unreadable, cut off, too few usable: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'austin-traffic-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const m = JSON.parse(meta);
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'austin-traffic-cameras') }, {}, /licence closed/],
    [{}, { meta: JSON.stringify({ ...m, license: { name: 'See Terms of Use' } }) }, /licence wording changed.*dataset licence/],
    [{}, { meta: JSON.stringify({ ...m, attribution: 'City of Austin' }) }, /licence wording changed.*attribution/],
    [{}, { meta: '<html>Maintenance</html>' }, /licence wording changed.*not JSON/],
    [{}, { meta: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { terms: terms.replace(/offered free and without restriction/g, 'offered for a fee') }, /licence wording changed \(missing "offered free and without restriction"/],
    [{}, { terms: terms.replace(/proper credit be given/g, 'a mention is welcome') }, /licence wording changed/],
    [{}, { terms: terms.replace(/do not, and should not, include controls over its end use/g, 'may be restricted by the City') }, /licence wording changed/],
    [{}, { terms: '<html><body>Not found</body></html>' }, /licence page unreadable.*not JSON/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /resource/' }, /robots\.txt disallows/],
    [{}, { body: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { body: '<html><body>Maintenance</body></html>' }, /feed unreadable.*no JSON array/],
    [{}, { body: list.slice(0, list.length - 60) }, /cut off/],
    [{}, { body: '[]' }, /only 0 usable cameras/],
    [{}, { body: wrap(row(1), {}, {}, {}, {}) }, /only 1 of 5/],
    [{ minUsable: 300 }, {}, /only 4 usable cameras/],
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

test('Austin: a list under half the size of the last good run never replaces it, and a cut-off cameras.json stops the import', async () => {
  const dir = tmp();
  assert.equal((await runCameras(opts(dir))).written, true);
  const r = await runCameras(opts(dir, {}, { body: wrap(row(1)) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 4 to 1/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Austin: the feed is the data.austintexas.gov Socrata /resource/ list, requested with no key', () => {
  const p = new URL(FEED_URL);
  assert.equal(p.hostname, 'data.austintexas.gov');
  assert.ok(p.pathname.startsWith('/resource/b4k4-adkb'));
  assert.ok(!/key|token|@/i.test(p.search.replace('$limit', '') + p.username));
  assert.equal(ATTRIBUTION, 'Source: City of Austin, Texas - data.austintexas.gov, Austin Transportation & Public Works, Traffic Cameras.');
});

test('licence row: austin-traffic-cameras passes the gate, quotes the City terms and the metadata and gives the URLs; images stay unverified', () => {
  const r = perms.find((s) => s.id === 'austin-traffic-cameras');
  assert.ok(r, 'row exists');
  assert.equal(r.enabled, true);
  assert.equal(r.commercialStatus, 'allowed_per_doc');
  assert.equal(r.needsHumanReview, true);
  assert.equal(r.reviewedAt, '2026-11-24');
  assert.match(r.licence, /offered free and without restriction/);
  assert.match(r.licence, /do not, and should not, include controls over its end use/);
  assert.match(r.licence, /"Public Domain"/);
  assert.match(r.licence, /https:\/\/data\.austintexas\.gov\/stories\/s\/ranj-cccq/);
  assert.equal(r.attribution, ATTRIBUTION);
  assert.match(r.imageStatus, /^unverified/);
});

test('health config: Austin has its own polite pace (one worker, 250 ms apart, HEAD only) and its whole list fits the time budget', () => {
  const c = CONFIG.perSource['austin-traffic'];
  assert.ok(c.hostDelayMs >= 250 && c.concurrency === 1);
  assert.ok(823 * c.hostDelayMs < CONFIG.budgetMs * 0.5);
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'austin-traffic') : [];
test('real cameras.json (when it holds Austin rows): valid, unique ids and names, only the City picture address, no image field, no city, inside the Austin box, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 300);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  assert.equal(new Set(real.map((c) => c.name)).size, real.length, 'no two links share one label');
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.match(c.officialUrl, /^https:\/\/cctv\.austinmobility\.io\/image\/\d+\.jpg$/, c.id);
    assert.equal(c.city, null);
    assert.ok(c.lat >= AUSTIN_BOUNDS.latMin && c.lat <= AUSTIN_BOUNDS.latMax && c.lon >= AUSTIN_BOUNDS.lonMin && c.lon <= AUSTIN_BOUNDS.lonMax, c.id);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'united-states');
  }
});
