// Offline tests for the London importer (TfL JamCams list, OGL v2.0 with TfL amendments). Run: node --test tests/registry/tfl.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/tfl.mjs';
import { parseFeed, normalizeLn, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, BOUNDS, ATTRIBUTION, LICENCE_PHRASES } from '../../ops/importers/lib/tfl.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('tfl-list.json');
const terms = fx('tfl-terms.html');
const NOW = '2026-11-24T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'ln-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const fetcher = (o = {}) => async (url) => {
  const v = url === TERMS_URL ? (o.terms ?? terms) : url === ROBOTS_URL ? (o.robots ?? 'ERR') : (o.body ?? list);
  if (v === 'ERR' && url === ROBOTS_URL) throw new Error('HTTP 404');
  if (v instanceof Error) throw v;
  return v;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, ...o });
const recs = parseFeed(list);
const rec = (o = {}) => ({ ...recs[0], ...o });
const prop = (key, value) => ({ key, value });
const row = (stem, extra = {}) => ({ id: `JamCams_${stem}`, commonName: `A1 Road ${stem}`, lat: 51.5, lon: -0.1, additionalProperties: [prop('available', 'true'), prop('imageUrl', `https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/${stem}.jpg`), prop('view', 'North')], ...extra });
const wrap = (...items) => JSON.stringify(items);
const withProp = (r, key, value) => ({ ...r, additionalProperties: r.additionalProperties.map((p) => (p.key === key ? { ...p, value } : p)) });

test('London normalize: id, region and country from one place, link is the TfL picture bucket only, road only from a leading road token, city London', () => {
  const drop = {}, seen = new Set();
  const cams = recs.map((r) => normalizeLn(r, NOW, drop, seen));
  assert.deepEqual(drop, { unavailable: 1, badCoords: 1, outOfBounds: 1, dupKey: 1, noName: 1 });
  const ok = cams.filter(Boolean);
  assert.equal(ok.length, 8);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.match(c.id, /^tfl-jamcams-[0-9a-z-]+$/);
  assert.equal(c.name, 'A406 Billet Upass E');
  assert.equal(c.road, 'A406');
  assert.equal(ok[4].road, '', 'a name with no leading road token has no road');
  assert.equal(c.city, 'London');
  assert.equal(c.direction, '');
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'london');
  assert.equal(REGION_COUNTRY.london.countrySlug, 'united-kingdom');
  assert.equal(REGION_COUNTRY.london.countryCode, 'GB');
  assert.ok(c.officialUrl.startsWith('https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/') && c.officialUrl.endsWith('.jpg'));
  for (const x of ok) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('London normalize: bad rows are dropped and counted (unavailable, foreign link, no name, bad coords, out of bounds, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    withProp(rec(), 'available', 'false'), withProp(rec(), 'available', ''),
    withProp(rec(), 'imageUrl', 'https://example.com/jamcams.tfl.gov.uk/a.jpg'), withProp(rec(), 'imageUrl', 'http://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/a.jpg'),
    withProp(rec(), 'imageUrl', 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00865.mp4'), withProp(rec(), 'imageUrl', 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/../x.jpg'),
    rec({ additionalProperties: [] }),
    rec({ commonName: ' ' }), rec({ lat: null }), rec({ lon: '-0.1' }), rec({ lat: 48.85, lon: 2.35 }), rec({ lat: 52.5 }), rec({ lon: 0.9 }), null, 'x',
  ];
  for (const r of bad) assert.equal(normalizeLn(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { unavailable: 3, noUrl: 4, noName: 1, badCoords: 2, outOfBounds: 3, malformed: 2 });
  assert.ok(normalizeLn(rec(), NOW, drop, seen));
  assert.equal(normalizeLn(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 51.5 && BOUNDS.latMax > 51.5 && BOUNDS.lonMin < -0.1 && BOUNDS.lonMax > 0.1);
});

test('London feed: an HTML 200 page, an object, an error body, an empty body and a cut-off list are refused', () => {
  assert.equal(recs.length, 13);
  assert.throws(() => parseFeed('<html><body>Service unavailable</body></html>'), /no JSON array/);
  assert.throws(() => parseFeed('{"error":"nope"}'), /no JSON array/);
  assert.throws(() => parseFeed(''), /no JSON array/);
  assert.throws(() => parseFeed(list.slice(0, list.length - 60)), /cut off/);
});

test('London terms text: the Next.js payload is decoded and tags removed; every required phrase and both credit lines are in the fixture, none in the raw page', () => {
  const t = pageText(terms);
  for (const p of LICENCE_PHRASES) assert.ok(t.includes(p), p);
  assert.ok(t.includes('Contains OS data © Crown copyright and database rights 2016'));
  assert.ok(t.includes('Geomni UK Map data'), 'the terms also require the Geomni credit');
  assert.ok(ATTRIBUTION.includes('Geomni UK Map data'), 'the printed credit carries the Geomni line too');
  assert.ok(!t.includes('\\u003c') && !t.includes('self.__next_f'), 'payload fully decoded');
  assert.ok(ATTRIBUTION.includes('Powered by TfL Open Data') && ATTRIBUTION.includes('Contains OS data © Crown copyright and database rights 2016'));
  assert.ok(pageText('<p>Exploit the <b>Information</b> commercially and non-commercially</p>').includes('Exploit the Information commercially and non-commercially'), 'a plain page still works');
  assert.ok(pageText('<script>self.__next_f.push([1,"broken])</script><p>x</p>').includes('x'), 'an undecodable payload adds no text and breaks nothing');
});

test('London robots: no file (404 or an error body) means no rules; a Disallow for the feed path stops, an Allow of a longer path wins', () => {
  const p = new URL(FEED_URL).pathname;
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('<html><title>404 Not Found</title></html>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /Place', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /Place\nAllow: /Place/Type/JamCam', p), true);
});

test('London run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'tfl-jamcams').length, 8);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'tfl-jamcams'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'tfl-jamcams');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(r.report.total, 8);
  assert.equal(r.report.raw, 13);
  assert.ok(existsSync(join(dir, 'import-report-tfl.json')));
});

test('London run: only london rows are rewritten on a second run, other sources stay byte-equal', async () => {
  const dir = tmp(); seed(dir);
  await runCameras(opts(dir));
  const first = read(dir);
  const r = await runCameras(opts(dir, {}, { body: wrap(row('00001.00001'), row('00001.00002'), row('00001.00003'), row('00001.00004'), row('00001.00005'), row('00001.00006')) }));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'tfl-jamcams').length, 6);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'tfl-jamcams'), first.filter((c) => c.sourceId !== 'tfl-jamcams'));
});

test('London run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const body = wrap(row('a1'), row('a1'), row('b2'), row('c3', { lat: 40.0 }), withProp(row('d4'), 'available', 'false'), row('e5'));
  const r = await runCameras(opts(dir, {}, { body }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, outOfBounds: 1, unavailable: 1 });
  assert.equal(r.report.total, 3);
});

test('London: licence row closed, wording gone, robots Disallow, HTML 200 body, empty list, unreadable, cut off: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'tfl-jamcam-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'tfl-jamcam-cameras') }, {}, /licence closed/],
    [{}, { terms: terms.replace(/Exploit the Information commercially and non-commercially/g, 'Use the Information') }, /licence wording changed/],
    [{}, { terms: terms.replace(/Powered by TfL Open Data/g, 'Mention TfL') }, /licence wording changed/],
    [{}, { terms: terms.replace(/version 2\.0 of the Open Government Licence/g, 'a licence') }, /licence wording changed/],
    [{}, { terms: '<html><body>Access denied</body></html>' }, /licence wording changed/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /Place' }, /robots\.txt disallows/],
    [{}, { body: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { body: '<html><body>Maintenance</body></html>' }, /feed unreadable.*no JSON array/],
    [{}, { body: list.slice(0, list.length - 60) }, /cut off/],
    [{}, { body: '[]' }, /zero cameras/],
    [{}, { body: wrap(row('a1'), {}, {}, {}, {}) }, /only 1 of 5/],
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

test('London: a list under half the size of the last good run never replaces it, and a cut-off cameras.json stops the import', async () => {
  const dir = tmp();
  assert.equal((await runCameras(opts(dir))).written, true);
  const r = await runCameras(opts(dir, {}, { body: wrap(row('a1')) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 8 to 1/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('London: the feed is the api.tfl.gov.uk JSON list, requested with no key', () => {
  const p = new URL(FEED_URL);
  assert.equal(p.hostname, 'api.tfl.gov.uk');
  assert.ok(!/key|token|@/i.test(p.search + p.username));
  assert.equal(new URL(TERMS_URL).hostname, 'tfl.gov.uk');
  assert.equal(ATTRIBUTION, 'Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016 and Geomni UK Map data © and database rights 2019.');
});

test('licence row: tfl-jamcam-cameras passes the gate, quotes the licence text and gives the URL; images stay unverified', () => {
  const r = perms.find((s) => s.id === 'tfl-jamcam-cameras');
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

test('health config: London has its own polite pace (one worker, 250 ms apart, HEAD only) and its whole list fits the time budget', () => {
  const c = CONFIG.perSource['tfl-jamcams'];
  assert.ok(c.hostDelayMs >= 250 && c.concurrency === 1);
  assert.ok(800 * c.hostDelayMs < CONFIG.budgetMs * 0.5);
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'tfl-jamcams') : [];
test('real cameras.json (when it holds London rows): valid, unique ids, only the TfL picture bucket, no image field, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 400);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.ok(c.officialUrl.startsWith('https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/'), c.id);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'united-kingdom');
  }
});
