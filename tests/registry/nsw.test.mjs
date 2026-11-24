// Offline tests for the New South Wales importer (Transport for NSW Live Traffic cameras, CC BY 4.0). Run: node --test tests/registry/nsw.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/nsw.mjs';
import { parseFeed, normalizeNsw, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, BOUNDS, ATTRIBUTION, LICENCE_PHRASES } from '../../ops/importers/lib/nsw.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('nsw-list.json');
const terms = fx('nsw-terms.html');
const NOW = '2026-11-24T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'nsw-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const fetcher = (o = {}) => async (url) => {
  const v = url === TERMS_URL ? (o.terms ?? terms) : url === ROBOTS_URL ? (o.robots ?? 'ERR') : (o.body ?? list);
  if (v === 'ERR' && url === ROBOTS_URL) throw new Error('HTTP 403');
  if (v instanceof Error) throw v;
  return v;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, ...o });
const recs = parseFeed(list);
const rec = (o = {}) => ({ ...recs[0], ...o });
const feat = (id, extra = {}) => ({ type: 'Feature', id, geometry: { type: 'Point', coordinates: [151.1, -33.9] }, properties: { region: 'SYD_MET', title: `Road ${id}`, view: 'Looking north.', direction: 'N', href: `https://webcams.transport.nsw.gov.au/livetraffic-webcams/cameras/${id}.jpeg` }, ...extra });
const wrap = (...items) => JSON.stringify({ type: 'FeatureCollection', rights: { copyright: 'Transport for NSW' }, features: items });
const withProp = (r, k, v) => ({ ...r, properties: { ...r.properties, [k]: v } });
const UUID = (n) => `00000000-0000-4000-8000-00000000000${n}`;

test('NSW normalize: id from the feed UUID, region and country from one place, link only on the agency picture hosts, area code and view kept as text, no city', () => {
  const drop = {}, seen = new Set();
  const ok = recs.map((r) => normalizeNsw(r, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, {});
  assert.equal(ok.length, 5);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'nsw-live-traffic-023651ee-389c-4677-978e-d39b6c24c1e7');
  assert.equal(c.name, '5 Ways (Miranda)');
  assert.equal(c.city, null);
  assert.equal(c.road, '');
  assert.equal(c.direction, '');
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'new-south-wales');
  assert.equal(c.lon, 151.10533);
  assert.equal(c.lat, -34.02977);
  assert.match(c.locationText, /looking west towards Sutherland\. Agency area: SYD_SOUTH\.$/);
  assert.equal(REGION_COUNTRY['new-south-wales'].countrySlug, 'australia');
  assert.equal(REGION_COUNTRY['new-south-wales'].countryCode, 'AU');
  assert.ok(ok[2].officialUrl.includes('&'), 'a picture name with & is kept as the agency wrote it');
  assert.ok(ok[3].officialUrl.startsWith('https://data.livetraffic.com/cameras/'), 'the one picture on the second agency host is kept');
  assert.equal(ok[4].locationText.endsWith('Agency area: Regional North.'), true);
  for (const x of ok) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('NSW normalize: bad rows are dropped and counted (foreign link, no name, bad coords, out of bounds, no id, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    withProp(rec(), 'href', 'https://example.com/cameras/a.jpeg'), withProp(rec(), 'href', 'http://webcams.transport.nsw.gov.au/livetraffic-webcams/cameras/a.jpeg'),
    withProp(rec(), 'href', 'https://webcams.transport.nsw.gov.au/livetraffic-webcams/cameras/../x.jpeg'), withProp(rec(), 'href', ''),
    withProp(rec(), 'title', ' '),
    rec({ geometry: null }), rec({ geometry: { type: 'LineString', coordinates: [] } }), rec({ geometry: { type: 'Point', coordinates: ['151', -34] } }),
    rec({ geometry: { type: 'Point', coordinates: [2.35, 48.85] } }), rec({ geometry: { type: 'Point', coordinates: [151, -20] } }),
    rec({ id: '' }), rec({ id: undefined }), rec({ id: 'a b' }),
    null, 'x', { type: 'Feature' },
  ];
  for (const r of bad) assert.equal(normalizeNsw(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { noUrl: 4, noName: 1, badCoords: 3, outOfBounds: 2, noId: 3, malformed: 3 });
  assert.ok(normalizeNsw(rec(), NOW, drop, seen));
  assert.equal(normalizeNsw(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < -33.9 && BOUNDS.latMax > -33.9 && BOUNDS.lonMin < 151.1 && BOUNDS.lonMax > 151.1);
  assert.ok(normalizeNsw(withProp(rec({ id: UUID(1) }), 'view', ''), NOW), 'a camera with no view sentence still keeps its area code');
  assert.ok(!('locationText' in normalizeNsw(withProp(withProp(rec({ id: UUID(2) }), 'view', ''), 'region', ''), NOW)), 'no view and no area code: no locationText');
});

test('NSW feed: an HTML 200 page, a bare array, an error body, an empty body and a cut-off list are refused', () => {
  assert.equal(recs.length, 5);
  assert.throws(() => parseFeed('<html><body>Service unavailable</body></html>'), /no JSON object/);
  assert.throws(() => parseFeed('[]'), /no JSON object/);
  assert.throws(() => parseFeed(''), /no JSON object/);
  assert.throws(() => parseFeed('{"error":"nope"}'), /no features array/);
  assert.throws(() => parseFeed(list.slice(0, list.length - 60)), /cut off/);
});

test('NSW licence text: tags removed, every required phrase is in the fixture and in none of the broken pages', () => {
  const t = pageText(terms);
  for (const p of LICENCE_PHRASES) assert.ok(t.includes(p), p);
  assert.ok(t.includes('http://creativecommons.org/licenses/by/4.0/legalcode'));
  assert.ok(ATTRIBUTION.includes('Transport for NSW') && ATTRIBUTION.includes('CC BY 4.0'));
  assert.ok(pageText('<p>licensed under a <b>Creative Commons</b> Attribution 4.0 License</p>').includes('Creative Commons Attribution 4.0'), 'a phrase split by a tag is still found');
});

test('NSW robots: 403 or no file means no rules; a Disallow for the feed path stops, an Allow of a longer path wins', () => {
  const p = new URL(FEED_URL).pathname;
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('<html><title>403 Forbidden</title></html>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /cameras', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /cameras\nAllow: /cameras/traffic-cam.json', p), true);
});

test('NSW run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'nsw-live-traffic').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'nsw-live-traffic'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'nsw-live-traffic');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(r.report.total, 5);
  assert.equal(r.report.raw, 5);
  assert.ok(existsSync(join(dir, 'import-report-nsw.json')));
});

test('NSW run: only nsw rows are rewritten on a second run, other sources stay byte-equal', async () => {
  const dir = tmp(); seed(dir);
  await runCameras(opts(dir));
  const first = read(dir);
  const r = await runCameras(opts(dir, {}, { body: wrap(feat(UUID(1)), feat(UUID(2)), feat(UUID(3))) }));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'nsw-live-traffic').length, 3);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'nsw-live-traffic'), first.filter((c) => c.sourceId !== 'nsw-live-traffic'));
});

test('NSW run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const body = wrap(feat(UUID(1)), feat(UUID(1)), feat(UUID(2)), feat(UUID(3), { geometry: { type: 'Point', coordinates: [10, 10] } }), feat(UUID(4)));
  const r = await runCameras(opts(dir, {}, { body }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, outOfBounds: 1 });
  assert.equal(r.report.total, 3);
});

test('NSW: licence row closed, wording gone, robots Disallow, HTML 200 body, empty list, unreadable, cut off: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'nsw-live-traffic-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'nsw-live-traffic-cameras') }, {}, /licence closed/],
    [{}, { terms: terms.replace(/licensed under a Creative Commons Attribution 4\.0 License/g, 'licensed under a different licence') }, /licence wording changed/],
    [{}, { terms: terms.replace(/on the condition that Transport for NSW is attributed as the source/g, 'freely') }, /licence wording changed/],
    [{}, { terms: '<html><body>Access denied</body></html>' }, /licence wording changed/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /cameras' }, /robots\.txt disallows/],
    [{}, { body: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { body: '<html><body>Maintenance</body></html>' }, /feed unreadable.*no JSON object/],
    [{}, { body: list.slice(0, list.length - 60) }, /cut off/],
    [{}, { body: wrap() }, /zero cameras/],
    [{}, { body: wrap(feat(UUID(1)), {}, {}, {}, {}) }, /only 1 of 5/],
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

test('NSW: a list under half the size of the last good run never replaces it, and a cut-off cameras.json stops the import', async () => {
  const dir = tmp();
  assert.equal((await runCameras(opts(dir))).written, true);
  const r = await runCameras(opts(dir, {}, { body: wrap(feat(UUID(1))) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 5 to 1/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('NSW: the feed is the data.livetraffic.com GeoJSON list, requested with no key', () => {
  const p = new URL(FEED_URL);
  assert.equal(p.hostname, 'data.livetraffic.com');
  assert.ok(!/key|token|@/i.test(p.search + p.username));
  assert.equal(new URL(TERMS_URL).hostname, 'opendata.transport.nsw.gov.au');
  assert.equal(ATTRIBUTION, 'Source: Transport for NSW, Live Traffic Cameras, CC BY 4.0.');
});

test('licence row: nsw-live-traffic-cameras passes the gate, quotes the licence text and gives the URL; images stay unverified', () => {
  const r = perms.find((s) => s.id === 'nsw-live-traffic-cameras');
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

test('health config: the NSW picture host is never requested (it answers automated requests with a placeholder page), every camera unknown by design', () => {
  assert.equal(CONFIG.perSource['nsw-live-traffic'].skip, 'host-blocks-automated-checks');
  assert.equal(CONFIG.perSource['quebec-mtmd'].skip, CONFIG.perSource['nsw-live-traffic'].skip);
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'nsw-live-traffic') : [];
test('real cameras.json (when it holds NSW rows): valid, unique ids, only the agency picture hosts, no image field, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 150);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.ok(/^https:\/\/(webcams\.transport\.nsw\.gov\.au\/livetraffic-webcams\/cameras|data\.livetraffic\.com\/cameras)\//.test(c.officialUrl), c.id);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'australia');
  }
});
