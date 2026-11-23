// Offline tests for the Toronto importer (City of Toronto Open Data, Open Government Licence - Toronto). Run: node --test tests/registry/toronto.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/toronto.mjs';
import { normalizeToronto, numberSharedNames, streetCase, FEED_URL, PACKAGE_URL, TOR_BOUNDS } from '../../ops/importers/lib/toronto.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const pkg = JSON.parse(fx('toronto-package.json'));
const feed = JSON.parse(fx('toronto-records.json'));
const terms = fx('toronto-terms.html');
const NOW = '2026-11-23T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'tor-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }, { id: 'quebec-mtmd-1', sourceId: 'quebec-mtmd', n: 2 }]));
const opts = (dir, o = {}) => ({ fetchJson: async (u) => (/package_show/.test(u) ? pkg : feed), fetchText: async () => terms, outDir: dir, now: NOW, perms, log: () => {}, ...o });
const rec = (o = {}) => ({ ...feed.result.records[0], ...o });

test('streetCase: title case, street types in the City short form, one or two letter words kept (F G Gardiner XY E), no change to a number', () => {
  assert.equal(streetCase('YORK ST'), 'York St');
  assert.equal(streetCase('F G GARDINER XY E'), 'F G Gardiner XY E');
  assert.equal(streetCase('BREMNER BLVD / RAPTORS WAY'), 'Bremner Blvd / Raptors Way');
  assert.equal(streetCase('HIGHWAY 27'), 'Highway 27');
  assert.equal(streetCase("O'CONNOR DR"), "O'Connor Dr");
  assert.equal(streetCase('  '), '');
  assert.equal(streetCase(null), '');
});

test('Toronto normalize: id and region come from one place, link is the City picture address only, no city, no direction, drops are counted', () => {
  const drop = {};
  const cams = feed.result.records.map((r) => normalizeToronto(r, NOW, drop));
  assert.deepEqual(drop, {});
  const c = cams[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'toronto-traffic-8001');
  assert.equal(c.name, 'York St at Bremner Blvd / Raptors Way');
  assert.equal(c.road, 'York St');
  assert.equal(c.city, null);
  assert.equal(c.direction, '');
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'toronto');
  assert.equal(REGION_COUNTRY.toronto.countrySlug, 'canada');
  assert.equal(c.officialUrl, 'https://opendata.toronto.ca/transportation/tmc/rescucameraimages/CameraImages/loc8001.jpg');
  assert.equal(c.locationText, undefined, 'all four views is the normal case: said once on the page, not on the row');
  assert.ok(Math.abs(c.lon - -79.38138) < 1e-4 && Math.abs(c.lat - 43.64312) < 1e-4);
  for (const x of cams) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
  assert.equal(cams[4].locationText, 'Views listed by the City: North, East, South.', 'a view the City marks None is left out');
});

test('Toronto normalize: a camera with no compass view says so on its row (it must not read like the normal four-view case)', () => {
  const none = normalizeToronto(rec({ DIRECTION1: 'None', DIRECTION2: 'None', DIRECTION3: 'None', DIRECTION4: 'None' }), NOW, {});
  assert.equal(none.locationText, 'The City lists no compass view for this camera.');
  assert.equal(normalizeToronto(rec({ DIRECTION1: 'North', DIRECTION2: 'South', DIRECTION3: 'None', DIRECTION4: 'None' }), NOW, {}).locationText, 'Views listed by the City: North, South.');
});

test('Toronto normalize: bad rows are dropped and counted, never repaired or given a made-up place', () => {
  const drop = {};
  const bad = [
    rec({ REC_ID: 'abc' }), rec({ MAINROAD: '' }), rec({ geometry: 'not json' }), rec({ geometry: JSON.stringify({ type: 'MultiPoint', coordinates: [[-79.4, 43.7], [-79.5, 43.7]] }) }),
    rec({ geometry: JSON.stringify({ type: 'Point', coordinates: [2.35, 48.85] }) }), rec({ IMAGEURL: 'https://example.com/loc1.jpg' }), rec({ IMAGEURL: '' }), null, 'x',
    rec({ geometry: JSON.stringify({ type: 'Point', coordinates: [null, 43.7] }) }),
  ];
  for (const r of bad) assert.equal(normalizeToronto(r, NOW, drop), null);
  assert.deepEqual(drop, { noIdOrName: 2, badCoords: 3, outOfBounds: 1, noUrl: 2, malformed: 2 });
  assert.ok(TOR_BOUNDS.latMin < 43.7 && TOR_BOUNDS.latMax > 43.7);
  assert.ok(normalizeToronto(rec({ geometry: { type: 'Point', coordinates: [-79.4, 43.7] } }), NOW), 'a geometry that is already an object is accepted');
});

test('Toronto: two cameras with one intersection name each get the City camera number, a lone name is left alone', () => {
  const a = normalizeToronto(rec(), NOW), b = normalizeToronto(rec({ REC_ID: 8002, geometry: JSON.stringify({ type: 'Point', coordinates: [-79.3812, 43.6432] }) }), NOW), c = normalizeToronto(feed.result.records[1], NOW);
  const out = numberSharedNames([a, b, c]);
  assert.deepEqual(out.map((x) => x.name), ['York St at Bremner Blvd / Raptors Way (camera 8001)', 'York St at Bremner Blvd / Raptors Way (camera 8002)', 'Sheppard Ave E at Bayview Ave']);
  assert.equal(a.name, 'York St at Bremner Blvd / Raptors Way', 'the input is not changed');
  assert.equal(new Set(out.map((x) => x.name)).size, 3);
});

test('Toronto run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'toronto-traffic').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'toronto-traffic').map((c) => c.id), ['caltrans-d07-1', 'quebec-mtmd-1']);
  assert.equal(read(dir, 'sources.json').find((s) => s.id === 'toronto-traffic').attribution, 'Contains information licensed under the Open Government Licence – Toronto');
  assert.equal(r.report.total, 5);
  assert.ok(existsSync(join(dir, 'import-report-toronto.json')));
});

test('Toronto: licence row closed, licence id changed, wording gone, feed cut off, empty, unreadable: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'toronto-traffic-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const cases = [
    [{ perms: closed }, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'toronto-traffic-cameras') }, /licence closed/],
    [{ fetchJson: async (u) => (/package_show/.test(u) ? { ...pkg, result: { ...pkg.result, license_id: 'cc-by-nc' } } : feed) }, /licence changed/],
    [{ fetchJson: async (u) => (/package_show/.test(u) ? { success: false } : feed) }, /no result/],
    [{ fetchText: async () => terms.replace(/including for commercial purposes/g, 'for personal use only') }, /licence wording changed/],
    [{ fetchText: async () => { throw new Error('HTTP 503'); } }, /licence page unreadable/],
    [{ fetchJson: async (u) => { if (/package_show/.test(u)) return pkg; throw new Error('HTTP 503'); } }, /feed unreadable/],
    [{ fetchJson: async (u) => (/package_show/.test(u) ? pkg : { ...feed, result: { ...feed.result, total: 336 } }) }, /feed cut off/],
    [{ fetchJson: async (u) => (/package_show/.test(u) ? pkg : { success: true, result: { total: 0, records: [] } }) }, /zero cameras/],
    [{ fetchJson: async (u) => (/package_show/.test(u) ? pkg : '<html>blocked</html>') }, /no records array/],
  ];
  for (const [o, re] of cases) {
    const dir = tmp(); seed(dir);
    const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
    const r = await runCameras(opts(dir, o));
    assert.equal(r.written, false, String(re));
    assert.match(r.reason, re);
    assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before, 'the registry is left as it was');
    assert.ok(!existsSync(join(dir, 'sources.json')));
  }
});

test('Toronto: a list under half the size of the last good run never replaces it, and a cut-off cameras.json stops the import', async () => {
  const dir = tmp();
  const many = { ...feed, result: { ...feed.result, total: 5, records: feed.result.records } };
  assert.equal((await runCameras(opts(dir, { fetchJson: async (u) => (/package_show/.test(u) ? pkg : many) }))).written, true);
  const one = { ...feed, result: { total: 1, records: feed.result.records.slice(0, 1) } };
  const r = await runCameras(opts(dir, { fetchJson: async (u) => (/package_show/.test(u) ? pkg : one) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 5 to 1/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Toronto: the feed is read through the CKAN API path (robots.txt Allows /api/ and Disallows /download/), with a generic request and no key', () => {
  for (const u of [FEED_URL, PACKAGE_URL]) { const p = new URL(u); assert.ok(p.pathname.startsWith('/api/'), u); assert.ok(!/download/.test(p.pathname), u); assert.ok(!/key|token|@/i.test(p.search + p.username), u); }
  assert.ok(!/\/dataset\/.+\/resource\/.+\/download\//.test(FEED_URL));
});

test('licence row: toronto-traffic-cameras passes the gate, quotes the licence text and gives the URL; images stay unverified', () => {
  const row = perms.find((s) => s.id === 'toronto-traffic-cameras');
  assert.ok(row, 'row exists');
  assert.equal(row.enabled, true);
  assert.equal(row.commercialStatus, 'allowed_per_doc');
  assert.equal(row.needsHumanReview, true);
  assert.match(row.licence, /including for commercial purposes/);
  assert.match(row.licence, /https:\/\/open\.toronto\.ca\/open-data-licence\//);
  assert.match(row.attribution, /Contains information licensed under the Open Government Licence/);
  assert.match(row.imageStatus, /^unverified/);
  assert.match(row.reviewedAt, /^\d{4}-\d\d-\d\d$/);
});

test('health config: Toronto has its own polite pace (at most 2 a second, HEAD only) and its whole list fits the time budget', () => {
  const c = CONFIG.perSource['toronto-traffic'];
  assert.ok(c.hostDelayMs >= 500 && c.concurrency <= 2);
  assert.ok(336 * c.hostDelayMs < CONFIG.budgetMs * 0.5);
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'toronto-traffic') : [];
test('real cameras.json (when it holds Toronto rows): valid, unique ids, only opendata.toronto.ca links, no image field, no city, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 100);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.ok(c.officialUrl.startsWith('https://opendata.toronto.ca/'), c.id);
    assert.equal(c.city, null);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'canada');
  }
});
