// Offline tests for the Calgary importer (City of Calgary Open Data, Open Government Licence - City of Calgary). Run: node --test tests/registry/calgary.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/calgary.mjs';
import { normalizeCalgary, numberSharedNames, FEED_URL, TERMS_URL, LIMIT, CGY_BOUNDS, ATTRIBUTION } from '../../ops/importers/lib/calgary.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const rows = JSON.parse(fx('calgary-rows.json'));
const terms = fx('calgary-terms.html');
const NOW = '2026-11-23T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'cgy-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }, { id: 'toronto-traffic-1', sourceId: 'toronto-traffic', n: 2 }]));
const opts = (dir, o = {}) => ({ fetchJson: async () => rows, fetchText: async () => terms, outDir: dir, now: NOW, perms, log: () => {}, ...o });
const rec = (o = {}) => ({ ...rows[0], ...o });

test('Calgary normalize: id and region come from one place, link is the City picture address only, no city, no direction, quadrant kept as text', () => {
  const drop = {};
  const cams = rows.map((r) => normalizeCalgary(r, NOW, drop));
  assert.deepEqual(drop, {});
  const c = cams[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'calgary-traffic-0');
  assert.equal(c.name, 'Glenmore Trail / Macleod Trail S');
  assert.equal(c.road, 'Glenmore Trail');
  assert.equal(c.city, null);
  assert.equal(c.direction, '');
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'calgary');
  assert.equal(REGION_COUNTRY.calgary.countrySlug, 'canada');
  assert.equal(c.officialUrl, 'https://trafficcam.calgary.ca/loc0.jpg');
  assert.equal(c.locationText, 'City quadrant: SW/SE.');
  assert.ok(Math.abs(c.lat - 50.993989) < 1e-6 && Math.abs(c.lon - -114.0715855) < 1e-6);
  for (const x of cams) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
  assert.equal(normalizeCalgary(rec({ quadrant: '' }), NOW).locationText, undefined, 'no quadrant in the feed: nothing invented');
});

test('Calgary normalize: bad rows are dropped and counted, never repaired or given a made-up place', () => {
  const drop = {};
  const bad = [
    rec({ camera_url: { url: 'https://example.com/loc1.jpg' } }), rec({ camera_url: null }), rec({ camera_url: { url: 'https://trafficcam.calgary.ca/loc1.jpg?x=1' } }),
    rec({ camera_location: '  ' }), rec({ point: null }), rec({ point: { type: 'Point', coordinates: [null, 51] } }),
    rec({ point: { type: 'Point', coordinates: [2.35, 48.85] } }), rec({ point: { type: 'Point', coordinates: ['-114.0', '51.0'] } }), null, 'x',
  ];
  for (const r of bad) assert.equal(normalizeCalgary(r, NOW, drop), null);
  assert.deepEqual(drop, { noUrl: 3, noName: 1, badCoords: 3, outOfBounds: 1, malformed: 2 });
  assert.ok(CGY_BOUNDS.latMin < 51 && CGY_BOUNDS.latMax > 51);
});

test('Calgary: two cameras with one place text each get the City camera number, a lone name is left alone', () => {
  const cams = rows.map((r) => normalizeCalgary(r, NOW));
  const out = numberSharedNames(cams);
  const shared = out.filter((c) => /Riverfront/.test(c.name));
  assert.equal(shared.length, 2);
  assert.ok(shared.every((c) => /\(camera \d+\)$/.test(c.name)));
  assert.equal(new Set(out.map((c) => c.name)).size, out.length);
  assert.equal(out[0].name, 'Glenmore Trail / Macleod Trail S');
});

test('Calgary run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'calgary-traffic').length, rows.length);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'calgary-traffic'), before, 'rows of other sources are exactly as they were');
  assert.equal(read(dir, 'sources.json').find((s) => s.id === 'calgary-traffic').attribution, 'Contains information licensed under the Open Government Licence – City of Calgary.');
  assert.equal(r.report.total, rows.length);
  assert.ok(existsSync(join(dir, 'import-report-calgary.json')));
});

test('Calgary: licence row closed, wording gone, feed cut off, empty, unreadable: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'calgary-traffic-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const cases = [
    [{ perms: closed }, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'calgary-traffic-cameras') }, /licence closed/],
    [{ fetchText: async () => terms.replace(/including for commercial purposes/g, 'for personal use only') }, /licence wording changed/],
    [{ fetchText: async () => terms.replace(/Contains information licensed under the Open Government Licence/g, 'Credit the City') }, /licence wording changed/],
    [{ fetchText: async () => terms.replace(/City of Calgary/g, 'the City') }, /licence wording changed/],
    [{ fetchText: async () => { throw new Error('HTTP 503'); } }, /licence page unreadable/],
    [{ fetchJson: async () => { throw new Error('HTTP 503'); } }, /feed unreadable/],
    [{ fetchJson: async () => ({ error: true }) }, /not a list/],
    [{ fetchJson: async () => Array.from({ length: LIMIT }, () => rows[0]) }, /cut off/],
    [{ fetchJson: async () => [] }, /zero cameras/],
    [{ fetchJson: async () => [rows[0], null, null, null, null] }, /only 1 of 5/],
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

test('Calgary: a list under half the size of the last good run never replaces it, and a cut-off cameras.json stops the import', async () => {
  const dir = tmp();
  assert.equal((await runCameras(opts(dir))).written, true);
  const r = await runCameras(opts(dir, { fetchJson: async () => rows.slice(0, 1) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 5 to 1/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Calgary: the feed is the Socrata resource path (robots.txt Disallows only browse, odata, login and similar), with a generic request and no key', () => {
  const p = new URL(FEED_URL);
  assert.equal(p.hostname, 'data.calgary.ca');
  assert.ok(p.pathname.startsWith('/resource/'));
  assert.ok(!/key|token|@/i.test(p.search + p.username));
  assert.equal(new URL(TERMS_URL).pathname.split('/')[1], 'stories');
  assert.equal(ATTRIBUTION, 'Contains information licensed under the Open Government Licence – City of Calgary.');
});

test('licence row: calgary-traffic-cameras passes the gate, quotes the licence text and gives the URL; images stay unverified', () => {
  const row = perms.find((s) => s.id === 'calgary-traffic-cameras');
  assert.ok(row, 'row exists');
  assert.equal(row.enabled, true);
  assert.equal(row.commercialStatus, 'allowed_per_doc');
  assert.equal(row.needsHumanReview, true);
  assert.equal(row.reviewedAt, '2026-11-23');
  assert.match(row.licence, /including for commercial purposes/);
  assert.match(row.licence, /https:\/\/data\.calgary\.ca\/stories\/s\/Open-Data-Terms\/u45n-7awa/);
  assert.equal(row.attribution, 'Contains information licensed under the Open Government Licence – City of Calgary.');
  assert.match(row.licence, /third party rights/);
  assert.match(row.imageStatus, /^unverified/);
});

test('health config: Calgary has its own polite pace (at most 2 a second, HEAD only) and its whole list fits the time budget', () => {
  const c = CONFIG.perSource['calgary-traffic'];
  assert.ok(c.hostDelayMs >= 500 && c.concurrency <= 2);
  assert.ok(222 * c.hostDelayMs < CONFIG.budgetMs * 0.5);
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'calgary-traffic') : [];
test('real cameras.json (when it holds Calgary rows): valid, unique ids and names, only trafficcam.calgary.ca links, no image field, no city, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 100);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  assert.equal(new Set(real.map((c) => c.name)).size, real.length, 'no two links share one label');
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.ok(c.officialUrl.startsWith('https://trafficcam.calgary.ca/'), c.id);
    assert.equal(c.city, null);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'canada');
  }
});
