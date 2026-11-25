// Offline tests for the Maryland CHART importer (State of Maryland open data, dataset 4z3c-43ce, MDOT SHA). Run: node --test tests/registry/mdchart.test.mjs
// Fixtures are real copies fetched 2026-11-25: 4 of the 451 rows of the live list, the key fields of the dataset record, and the portal robots.txt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/mdchart.mjs';
import { parseFeed, normalizeMd, metaProblems, robotsAllows, FEED_URL, META_URL, ROBOTS_URL, BOUNDS, ATTRIBUTION, META_DESCRIPTION } from '../../ops/importers/lib/mdchart.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { isEnabled, loadApprovals } from '../licensing/gate.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('mdchart-list.json');
const meta = fx('mdchart-meta.json');
const robots = fx('mdchart-robots.txt');
const NOW = '2026-11-25T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'mdchart-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const recs = parseFeed(list);
const rec = (o = {}) => ({ ...recs[0], ...o });
const hex = (i) => i.toString(16).padStart(32, '0');
const row = (i, o = {}) => rec({ feedid: hex(i), url: `https://chart.maryland.gov/video/video.php?feed=${hex(i)}`, ...o });
const many = (n) => Array.from({ length: n }, (_, i) => row(i + 1));
const fetcher = (o = {}) => async (url) => {
  const v = url === META_URL ? (o.meta ?? meta) : url === ROBOTS_URL ? (o.robots ?? robots) : (o.feed ?? list);
  if (v instanceof Error) throw v;
  return typeof v === 'string' ? v : JSON.stringify(v);
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, minUsable: 3, pauseMs: 0, ...o });
const metaWith = (patch) => JSON.stringify({ ...JSON.parse(meta), ...patch });

test('Maryland normalize: id from the feed id, name from the CHART location, link kept, position from the Point, county kept as text, no city', () => {
  const drop = {}, seen = new Set();
  const ok = recs.map((r) => normalizeMd(r, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, {});
  assert.equal(ok.length, 4);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'maryland-chart-cameras-3d010dec036a0075004d823633235daa');
  assert.equal(c.name, 'I-270 & Montgomery Village Ave (MD 124)');
  assert.equal(c.city, null);
  assert.equal(c.regionSlug, 'maryland');
  assert.equal(c.feedType, 'still');
  assert.equal(c.lat, 39.148937000167);
  assert.equal(c.lon, -77.217020000233);
  assert.equal(c.officialUrl, 'https://chart.maryland.gov/video/video.php?feed=3d010dec036a0075004d823633235daa');
  assert.equal(c.locationText, 'Montgomery County, Maryland.');
  assert.equal(REGION_COUNTRY.maryland.countrySlug, 'united-states');
  assert.equal(REGION_COUNTRY.maryland.countryCode, 'US');
  for (const x of ok) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('Maryland normalize: bad rows are dropped and counted (foreign host, http, wrong path, userinfo, short id, id and link disagree, bad coords, out of bounds, no name, malformed, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const f = recs[0].feedid;
  const link = (u) => rec({ url: u });
  const bad = [
    link(`https://example.com/video/video.php?feed=${f}`), link(`http://chart.maryland.gov/video/video.php?feed=${f}`), link(`https://chart.maryland.gov.evil.example/video/video.php?feed=${f}`),
    link(`https://chart.maryland.gov@evil.example/video/video.php?feed=${f}`), link(`https://chart.maryland.gov/video/video.php?feed=${f.slice(1)}`), link(`https://chart.maryland.gov/other.php?feed=${f}`),
    link(`https://chart.maryland.gov/video/video.php?feed=${f}&x=1`), link(`https://chart.maryland.gov/video/video.php?feed=${f.toUpperCase()}`), rec({ feedid: hex(9) }), rec({ url: null }), rec({ url: '' }),
    rec({ the_geom: null }), rec({ the_geom: { type: 'Point', coordinates: [] } }), rec({ the_geom: { type: 'Point', coordinates: ['x', 39] } }), rec({ the_geom: { type: 'LineString', coordinates: [-77, 39] } }),
    rec({ the_geom: { type: 'Point', coordinates: [2.35, 48.85] } }), rec({ the_geom: { type: 'Point', coordinates: [39.1, -77.2] } }),
    rec({ location: '  ' }), rec({ location: null }),
    null, 'x', 5,
  ];
  for (const r of bad) assert.equal(normalizeMd(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { noUrl: 11, badCoords: 4, outOfBounds: 2, noName: 2, malformed: 3 });
  assert.ok(normalizeMd(rec(), NOW, drop, seen));
  assert.equal(normalizeMd(rec({ objectid: '999' }), NOW, drop, seen), null, 'the same feed id twice is one camera');
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 38.06 && BOUNDS.latMax > 39.72 && BOUNDS.lonMin < -79.46 && BOUNDS.lonMax > -75.06);
});

test('Maryland feed: HTML, an empty body, a cut-off body and an object are refused', () => {
  assert.equal(recs.length, 4);
  assert.throws(() => parseFeed('<html><body>Service unavailable</body></html>'), /no JSON array/);
  assert.throws(() => parseFeed(''), /no JSON array/);
  assert.throws(() => parseFeed(list.slice(0, list.length - 30)), /cut off/);
  assert.throws(() => parseFeed('{"error":true}'), /no JSON array/);
});

test('Maryland dataset record: the fixture passes; a changed id or description, a NEW licence field, an HTML page or an error object each fail', () => {
  assert.deepEqual(metaProblems(meta), []);
  assert.ok(JSON.parse(meta).description.includes(META_DESCRIPTION));
  assert.match(metaProblems(metaWith({ license: { name: 'CC BY 4.0' } })).join(), /licence field/);
  assert.match(metaProblems(metaWith({ license: { name: 'CC BY-NC' } })).join(), /licence field/);
  assert.match(metaProblems(metaWith({ description: 'Parks' })).join(), /description/);
  assert.match(metaProblems(metaWith({ id: 'aaaa-bbbb' })).join(), /id changed/);
  assert.match(metaProblems('<html>x</html>').join(), /not JSON/);
  assert.match(metaProblems('[]').join(), /not a dataset/);
});

test('Maryland robots: the real portal file allows the list and record paths; a Disallow for either stops', () => {
  assert.equal(robotsAllows(robots, new URL(FEED_URL).pathname), true);
  assert.equal(robotsAllows(robots, new URL(META_URL).pathname), true);
  assert.equal(robotsAllows('', '/resource/x.json'), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /resource/', new URL(FEED_URL).pathname), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /api/views', new URL(META_URL).pathname), false);
});

test('Maryland run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'maryland-chart-cameras').length, 4);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'maryland-chart-cameras'), before);
  const src = read(dir, 'sources.json').find((s) => s.id === 'maryland-chart-cameras');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(r.report.total, 4);
  assert.equal(r.report.raw, 4);
  assert.ok(existsSync(join(dir, 'import-report-mdchart.json')));
});

test('Maryland run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const rows = [...many(12), row(1), row(2, { url: 'https://example.com/a' }), row(3, { the_geom: null })];
  const r = await runCameras(opts(dir, { minUsable: 10 }, { feed: rows }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, noUrl: 1, badCoords: 1 });
  assert.equal(r.report.total, 12);
});

test('Maryland: licence row closed, record changed, robots Disallow, HTML 200 body, cut-off list, unreadable, too few: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'maryland-chart-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const big = many(13);
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'maryland-chart-cameras') }, {}, /licence closed/],
    [{}, { meta: metaWith({ license: { name: 'Copyrighted' } }) }, /dataset record changed/],
    [{}, { meta: metaWith({ description: 'x' }) }, /dataset record changed/],
    [{}, { meta: '<html><body>Access denied</body></html>' }, /dataset record changed/],
    [{}, { meta: new Error('HTTP 503') }, /dataset record unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /resource/' }, /robots\.txt disallows/],
    [{}, { feed: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { feed: '<html><body>Maintenance</body></html>' }, /feed unreadable/],
    [{}, { feed: JSON.stringify(big).slice(0, 500) }, /feed unreadable/],
    [{}, { feed: [] }, /only 0 usable/],
    [{}, { feed: many(4) }, /only 4 usable cameras/],
    [{}, { feed: many(5000) }, /cut off at the 5000 row limit/],
  ];
  for (const [o, f, re] of cases) {
    const dir = tmp(); seed(dir);
    const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
    const r = await runCameras(opts(dir, { minUsable: 10, ...o }, { feed: big, ...f }));
    assert.equal(r.written, false, String(re));
    assert.match(r.reason, re);
    assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before, 'the registry is left as it was');
    assert.ok(!existsSync(join(dir, 'sources.json')));
  }
});

test('Maryland: a list under half the last good run never replaces it, and a damaged registry file is never overwritten', async () => {
  const dir = tmp();
  const r0 = await runCameras(opts(dir, { minUsable: 1 }, { feed: many(13) }));
  assert.equal(r0.written, true, r0.reason);
  const r = await runCameras(opts(dir, { minUsable: 1 }, { feed: many(6) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 13 to 6/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2, { minUsable: 1 }, { feed: many(13) }));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Maryland: only opendata.maryland.gov is requested (record, robots, one list request), with no key; chart.maryland.gov is never requested', async () => {
  assert.equal(new URL(FEED_URL).hostname, 'opendata.maryland.gov');
  assert.equal(new URL(META_URL).hostname, 'opendata.maryland.gov');
  assert.ok(!/key|token|@/i.test(new URL(FEED_URL).search));
  const hits = [];
  await runCameras(opts(tmp(), { fetchText: async (u) => { hits.push(u); return fetcher()(u); } }));
  assert.equal(hits.filter((u) => u === FEED_URL).length, 1, 'one list request per run');
  assert.ok(!hits.some((u) => /chart\.maryland/.test(u)));
  assert.ok(hits.every((u) => new URL(u).hostname === 'opendata.maryland.gov'));
});

test('licence row: owner-approved for this id only, says plainly there is no licence, images unverified, closes if the approval or its id entry goes', () => {
  const r = perms.find((s) => s.id === 'maryland-chart-cameras');
  assert.ok(r, 'row exists');
  const ap = loadApprovals();
  assert.equal(r.commercialStatus, 'allowed_per_owner');
  assert.equal(r.ownerApprovedAt, '2026-11-25');
  assert.equal(r.enabled, true);
  assert.equal(r.needsHumanReview, true);
  assert.equal(r.reviewedAt, '2026-11-25');
  assert.equal(r.metadataPermission.status, 'unverified');
  assert.ok(r.metadataGrandfather.reason.includes('owner approval'));
  assert.ok(r.licence.startsWith('No licence or terms found'));
  assert.ok(r.licence.includes('opendata.maryland.gov/api/views/4z3c-43ce.json'));
  assert.equal(r.attribution, ATTRIBUTION);
  assert.match(r.imageStatus, /^unverified/);
  assert.equal(r.imagePermission.status, 'unverified');
  assert.equal(isEnabled(r, new Date(NOW), ap), true);
  assert.equal(isEnabled(r, new Date(NOW), { ...ap, sourceApprovals: [] }), false, 'without its own entry the all-rows date does not open it');
  assert.equal(isEnabled(r, new Date(NOW), { ...ap, sourceApprovals: [{ ...ap.sourceApprovals[0], id: 'other-source' }] }), false, 'an approval for another id does not open it');
  assert.equal(isEnabled(r, new Date(NOW), null), false);
  assert.deepEqual(ap.sourceApprovals.filter((a) => a.id === 'maryland-chart-cameras').map((a) => a.approvedAt), ['2026-11-25']);
});

test('health config: chart.maryland.gov is skipped (Cloudflare challenge); every Maryland camera is unknown by design', () => {
  assert.deepEqual(CONFIG.perSource['maryland-chart-cameras'], { skip: 'host-blocks-automated-checks' });
});
