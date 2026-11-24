// Offline tests for the Hong Kong importer (Transport Department list on DATA.GOV.HK, DATA.GOV.HK Terms and Conditions v1.2). Run: node --test tests/registry/hongkong.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/hongkong.mjs';
import { parseImages, normalizeHk, robotsAllows, unescapeXml, FEED_URL, ROBOTS_URL, TERMS_URL, HK_BOUNDS, ATTRIBUTION } from '../../ops/importers/lib/hongkong.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const xml = fx('hongkong-list.xml');
const terms = fx('hongkong-terms.html');
const NOW = '2026-11-24T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'hk-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
// one injected fetchText for all three URLs; `o` overrides per URL
const fetcher = (o = {}) => async (url) => {
  const v = url === TERMS_URL ? (o.terms ?? terms) : url === ROBOTS_URL ? (o.robots ?? 'ERR') : (o.xml ?? xml);
  if (v === 'ERR' && url === ROBOTS_URL) throw new Error('HTTP 403');
  if (v instanceof Error) throw v;
  return v;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, ...o });
const recs = parseImages(xml);
const rec = (o = {}) => ({ ...recs[0], ...o });
const wrap = (...items) => `<?xml version="1.0"?><image-list>${items.join('')}</image-list>`;
const item = (key, extra = '') => `<image><key>${key}</key><region>Kowloon</region><district>Sham Shui Po</district><description>Road [${key}]</description><latitude>22.33</latitude><longitude>114.16</longitude><url>https://tdcctv.data.one.gov.hk/${key}.JPG</url>${extra}</image>`;

test('Hong Kong normalize: id, region and country from one place, link is the Department picture address only, name keeps the camera key, District kept as text, no city', () => {
  const drop = {}, seen = new Set();
  const cams = recs.map((r) => normalizeHk(r, NOW, drop, seen));
  assert.deepEqual(drop, {});
  const c = cams[1];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'hongkong-traffic-h106f');
  assert.equal(c.name, 'Connaught Road Central near Exchange Square [H106F]');
  assert.equal(c.road, 'Connaught Road Central');
  assert.equal(c.city, null);
  assert.equal(c.direction, '');
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'hong-kong');
  assert.equal(REGION_COUNTRY['hong-kong'].countrySlug, 'hong-kong');
  assert.equal(c.officialUrl, 'https://tdcctv.data.one.gov.hk/H106F.JPG');
  assert.equal(c.locationText, 'District: Central & Western. Area: Hong Kong Island.', '&amp; is decoded once');
  assert.equal(cams[3].road, 'Tolo Highway');
  for (const x of cams) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('Hong Kong normalize: bad rows are dropped and counted (no url, bad coords, out of bounds, duplicate key), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    rec({ url: 'https://example.com/H429F.JPG' }), rec({ url: '' }), rec({ key: 'K999F' }), rec({ description: ' ' }),
    rec({ latitude: '' }), rec({ longitude: 'abc' }), rec({ latitude: '48.85', longitude: '2.35' }), rec({ latitude: '22.0' }), null, 'x',
  ];
  for (const r of bad) assert.equal(normalizeHk(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { noUrl: 3, noName: 1, badCoords: 2, outOfBounds: 2, malformed: 2 });
  assert.ok(normalizeHk(rec(), NOW, drop, seen));
  assert.equal(normalizeHk(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(HK_BOUNDS.latMin < 22.3 && HK_BOUNDS.latMax > 22.3);
});

test('Hong Kong XML: entities decoded, an HTML 200 page, an error body, an empty body and a cut-off list are refused', () => {
  assert.equal(unescapeXml('A &amp; B &lt;&#65;&#x42;&gt; &bogus;'), 'A & B <AB> &bogus;');
  assert.equal(recs.length, 5);
  assert.throws(() => parseImages('<html><body>Service unavailable</body></html>'), /no <image-list> root/);
  assert.throws(() => parseImages('<?xml version="1.0"?><Error><Code>AccessDenied</Code></Error>'), /no <image-list> root/);
  assert.throws(() => parseImages(''), /no <image-list> root/);
  assert.throws(() => parseImages(xml.slice(0, xml.length - 40)), /cut off/);
});

test('Hong Kong robots: no file or an error body means no rules; a Disallow for the feed path stops, an Allow of a longer path wins', () => {
  const p = new URL(FEED_URL).pathname;
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('<Error><Code>AccessDenied</Code></Error>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /td/', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /td/\nAllow: /td/traffic-snapshot-images/', p), true);
  assert.equal(robotsAllows('User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /private/', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow:', p), true);
});

test('Hong Kong run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'hongkong-traffic').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'hongkong-traffic'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'hongkong-traffic');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(r.report.total, 5);
  assert.ok(existsSync(join(dir, 'import-report-hongkong.json')));
});

test('Hong Kong run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const body = wrap(item('A1'), item('A1'), item('B2'), item('C3').replace('22.33', '40.0'), item('D4').replace('https://tdcctv.data.one.gov.hk/D4.JPG', ''), item('E5'));
  const r = await runCameras(opts(dir, {}, { xml: body }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, outOfBounds: 1, noUrl: 1 });
  assert.equal(r.report.total, 3);
});

test('Hong Kong: licence row closed, wording gone, robots Disallow, HTML 200 body, empty list, unreadable, cut off: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'hongkong-traffic-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'hongkong-traffic-cameras') }, {}, /licence closed/],
    [{}, { terms: terms.replace(/for both commercial and non-commercial purposes/g, 'for non-commercial purposes only') }, /licence wording changed/],
    [{}, { terms: terms.replace(/DATA\.GOV\.HK/g, 'the portal') }, /licence wording changed/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /td/' }, /robots\.txt disallows/],
    [{}, { xml: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { xml: '<html><body>Maintenance</body></html>' }, /feed unreadable.*image-list/],
    [{}, { xml: '<?xml version="1.0"?><Error><Code>AccessDenied</Code></Error>' }, /feed unreadable/],
    [{}, { xml: xml.slice(0, xml.length - 40) }, /cut off/],
    [{}, { xml: wrap() }, /zero cameras/],
    [{}, { xml: wrap(item('A1'), '<image></image>', '<image></image>', '<image></image>', '<image></image>') }, /only 1 of 5/],
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

test('Hong Kong: a list under half the size of the last good run never replaces it, and a cut-off cameras.json stops the import', async () => {
  const dir = tmp();
  assert.equal((await runCameras(opts(dir))).written, true);
  const r = await runCameras(opts(dir, {}, { xml: wrap(item('A1')) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 5 to 1/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Hong Kong: the feed is the static.data.gov.hk XML file, requested with no key', () => {
  const p = new URL(FEED_URL);
  assert.equal(p.hostname, 'static.data.gov.hk');
  assert.ok(!/key|token|@/i.test(p.search + p.username));
  assert.equal(new URL(TERMS_URL).hostname, 'data.gov.hk');
  assert.equal(ATTRIBUTION, 'Source: Transport Department, The Government of the Hong Kong Special Administrative Region, via DATA.GOV.HK.');
});

test('licence row: hongkong-traffic-cameras passes the gate, quotes the licence text and gives the URL; images stay unverified', () => {
  const row = perms.find((s) => s.id === 'hongkong-traffic-cameras');
  assert.ok(row, 'row exists');
  assert.equal(row.enabled, true);
  assert.equal(row.commercialStatus, 'allowed_per_doc');
  assert.equal(row.needsHumanReview, true);
  assert.equal(row.reviewedAt, '2026-11-24');
  assert.match(row.licence, /for both commercial and non-commercial purposes/);
  assert.match(row.licence, /https:\/\/data\.gov\.hk\/en\/terms-and-conditions/);
  assert.equal(row.attribution, ATTRIBUTION);
  assert.match(row.imageStatus, /^unverified/);
});

test('health config: Hong Kong has its own polite pace (one worker, 250 ms apart, HEAD only) and its whole list fits the time budget', () => {
  const c = CONFIG.perSource['hongkong-traffic'];
  assert.ok(c.hostDelayMs >= 250 && c.concurrency === 1);
  assert.ok(1013 * c.hostDelayMs < CONFIG.budgetMs * 0.5);
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'hongkong-traffic') : [];
test('real cameras.json (when it holds Hong Kong rows): valid, unique ids and names, only tdcctv.data.one.gov.hk links, no image field, no city, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 900);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  assert.equal(new Set(real.map((c) => c.name)).size, real.length, 'no two links share one label');
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.ok(c.officialUrl.startsWith('https://tdcctv.data.one.gov.hk/'), c.id);
    assert.equal(c.city, null);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'hong-kong');
  }
});
