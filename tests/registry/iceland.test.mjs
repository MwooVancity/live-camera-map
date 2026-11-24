// Offline tests for the Iceland importer (Vegagerðin road camera list, CC BY 4.0). Run: node --test tests/registry/iceland.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/iceland.mjs';
import { parseFeed, normalizeIs, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, BOUNDS, ATTRIBUTION, LICENCE_PHRASES } from '../../ops/importers/lib/iceland.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('iceland-list.json');
const terms = fx('iceland-terms.html');
const NOW = '2026-11-24T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'is-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const fetcher = (o = {}) => async (url) => {
  const v = url === TERMS_URL ? (o.terms ?? terms) : url === ROBOTS_URL ? (o.robots ?? 'ERR') : (o.body ?? list);
  if (v === 'ERR' && url === ROBOTS_URL) throw new Error('HTTP 302');
  if (v instanceof Error) throw v;
  return v;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, ...o });
const recs = parseFeed(list);
const rec = (o = {}) => ({ ...recs[0], ...o });
const row = (stem, extra = {}) => ({ Maelist_nr: 1, Myndavel: 'Stod', Vegheiti: 'Hringvegur', NrVegur: '1', Skyring: `View ${stem}`, Slod: `https://www.vegagerdin.is/vgdata/vefmyndavelar/${stem}.jpg`, Breidd: 64.5, Lengd: -20.5, ...extra });
const wrap = (...items) => JSON.stringify(items);

test('Iceland normalize: id, region and country from one place, link is the Administration picture directory only, name keeps the file name, road with number, no city', () => {
  const drop = {}, seen = new Set();
  const cams = recs.map((r) => normalizeIs(r, NOW, drop, seen));
  assert.deepEqual(drop, {});
  const c = cams[1];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'iceland-vegagerdin-hellisheidi-2');
  assert.equal(c.name, 'Hellisheiði séð niður á veg [hellisheidi_2]');
  assert.equal(c.road, 'Hringvegur (1)');
  assert.equal(cams[3].road, '', 'a null road stays empty, never "null"');
  assert.equal(c.city, null);
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'iceland');
  assert.equal(REGION_COUNTRY.iceland.countrySlug, 'iceland');
  assert.equal(c.officialUrl, 'https://www.vegagerdin.is/vgdata/vefmyndavelar/hellisheidi_2.jpg');
  assert.equal(c.locationText, 'Station: Hellisheiði.');
  for (const x of cams) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('Iceland normalize: bad rows are dropped and counted (foreign link, no name, bad coords, out of bounds, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    rec({ Slod: 'https://example.com/vgdata/vefmyndavelar/a.jpg' }), rec({ Slod: 'http://www.vegagerdin.is/vgdata/vefmyndavelar/a.jpg' }), rec({ Slod: 'https://www.vegagerdin.is/vgdata/vefmyndavelar/../x.jpg' }), rec({ Slod: '' }),
    rec({ Skyring: ' ', Myndavel: '' }), rec({ Breidd: null }), rec({ Lengd: '-21.3' }), rec({ Breidd: 48.85, Lengd: 2.35 }), rec({ Breidd: 63.0 }), rec({ Lengd: -12.0 }), null, 'x',
  ];
  for (const r of bad) assert.equal(normalizeIs(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { noUrl: 4, noName: 1, badCoords: 2, outOfBounds: 3, malformed: 2 });
  assert.ok(normalizeIs(rec(), NOW, drop, seen));
  assert.equal(normalizeIs(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 64.5 && BOUNDS.latMax > 64.5 && BOUNDS.lonMin < -20 && BOUNDS.lonMax > -13);
});

test('Iceland feed: an HTML 200 page, an object, an error body, an empty body and a cut-off list are refused', () => {
  assert.equal(recs.length, 5);
  assert.throws(() => parseFeed('<html><body>Service unavailable</body></html>'), /no JSON array/);
  assert.throws(() => parseFeed('{"error":"nope"}'), /no JSON array/);
  assert.throws(() => parseFeed(''), /no JSON array/);
  assert.throws(() => parseFeed(list.slice(0, list.length - 60)), /cut off/);
});

test('Iceland terms text: tags are removed so a phrase split by a link is still found; all required phrases are in the fixture', () => {
  const t = pageText(terms);
  for (const p of LICENCE_PHRASES) assert.ok(t.includes(p), p);
  assert.ok(!terms.includes('Creative Commons Attribution 4.0 International licence (CC BY 4.0)'), 'the raw HTML splits the sentence with a tag');
});

test('Iceland robots: no file, a redirect page or an error body means no rules; a Disallow for the feed path stops, an Allow of a longer path wins', () => {
  const p = new URL(FEED_URL).pathname;
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('<html><title>302 Found</title></html>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /api/', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /api/\nAllow: /api/vefmyndavelar2014_1', p), true);
  assert.equal(robotsAllows('User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /private/', p), true);
});

test('Iceland run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'iceland-vegagerdin').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'iceland-vegagerdin'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'iceland-vegagerdin');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(r.report.total, 5);
  assert.ok(existsSync(join(dir, 'import-report-iceland.json')));
});

test('Iceland run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const body = wrap(row('a1'), row('a1'), row('b2'), row('c3', { Breidd: 40.0 }), row('d4', { Slod: '' }), row('e5'));
  const r = await runCameras(opts(dir, {}, { body }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, outOfBounds: 1, noUrl: 1 });
  assert.equal(r.report.total, 3);
});

test('Iceland: licence row closed, wording gone, robots Disallow, HTML 200 body, empty list, unreadable, cut off: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'iceland-road-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'iceland-road-cameras') }, {}, /licence closed/],
    [{}, { terms: terms.replace(/CC BY 4\.0/g, 'a licence') }, /licence wording changed/],
    [{}, { terms: terms.replace(/must acknowledge the source of the data/g, 'may mention the source') }, /licence wording changed/],
    [{}, { terms: terms.replace(/Act No\. 45\/2018/g, 'an Act') }, /licence wording changed/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /api/' }, /robots\.txt disallows/],
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

test('Iceland: a list under half the size of the last good run never replaces it, and a cut-off cameras.json stops the import', async () => {
  const dir = tmp();
  assert.equal((await runCameras(opts(dir))).written, true);
  const r = await runCameras(opts(dir, {}, { body: wrap(row('a1')) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 5 to 1/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Iceland: the feed is the gagnaveita.vegagerdin.is JSON list, requested with no key', () => {
  const p = new URL(FEED_URL);
  assert.equal(p.hostname, 'gagnaveita.vegagerdin.is');
  assert.ok(!/key|token|@/i.test(p.search + p.username));
  assert.equal(new URL(TERMS_URL).hostname, 'www.vegagerdin.is');
  assert.equal(ATTRIBUTION, 'Source: Icelandic Road and Coastal Administration (Vegagerðin), road camera list, CC BY 4.0.');
});

test('licence row: iceland-road-cameras passes the gate, quotes the licence text and gives the URL; images stay unverified', () => {
  const r = perms.find((s) => s.id === 'iceland-road-cameras');
  assert.ok(r, 'row exists');
  assert.equal(r.enabled, true);
  assert.equal(r.commercialStatus, 'allowed_per_doc');
  assert.equal(r.needsHumanReview, true);
  assert.equal(r.reviewedAt, '2026-11-24');
  assert.match(r.licence, /Creative Commons Attribution 4\.0 International licence \(CC BY 4\.0\)/);
  assert.match(r.licence, /must acknowledge the source of the data/);
  assert.match(r.licence, /https:\/\/www\.vegagerdin\.is\/vegagerdin\/gagnasafn\/vefthjonustur\/terms-and-conditions/);
  assert.equal(r.attribution, ATTRIBUTION);
  assert.match(r.imageStatus, /^unverified/);
});

test('health config: Iceland has its own polite pace (one worker, 250 ms apart, HEAD only) and its whole list fits the time budget', () => {
  const c = CONFIG.perSource['iceland-vegagerdin'];
  assert.ok(c.hostDelayMs >= 250 && c.concurrency === 1);
  assert.ok(500 * c.hostDelayMs < CONFIG.budgetMs * 0.5);
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'iceland-vegagerdin') : [];
test('real cameras.json (when it holds Iceland rows): valid, unique ids and names, only the Administration picture directory, no image field, no city, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 400);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  assert.equal(new Set(real.map((c) => c.name)).size, real.length, 'no two links share one label');
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.ok(c.officialUrl.startsWith('https://www.vegagerdin.is/vgdata/vefmyndavelar/'), c.id);
    assert.equal(c.city, null);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'iceland');
  }
});
