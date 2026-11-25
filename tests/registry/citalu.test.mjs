// Offline tests for the Luxembourg importer (CITA motorway webcams, KML, dataset CC0 on data.public.lu). Run: node --test tests/registry/citalu.test.mjs
// Fixtures are real trimmed copies fetched 2026-11-25: 5 Placemarks of the KML, the dataset record (data.public.lu API, trimmed to the fields we read) and the part of the CITA FAQ page with the licence sentence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras } from '../../ops/importers/citalu.mjs';
import { parseKml, normalizeCita, datasetProblems, robotsAllows, pageText, FEED_URL, DATASET_API_URL, ROBOTS_URL, TERMS_URL, BOUNDS, ATTRIBUTION, LICENCE_PHRASES } from '../../ops/importers/lib/citalu.mjs';
import { validateCamera, FORBIDDEN_FIELDS } from '../../ops/importers/lib/registry.mjs';
import { isEnabled } from '../licensing/gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const kml = fx('citalu-list.kml');
const dataset = fx('citalu-dataset.json');
const faq = fx('citalu-faq.html');
const NOW = '2026-11-25T12:00:00.000Z';
// the real licence row is added to the shared files by the merger (patch ops/importers/patches/citalu.patch.json) and stays mustNotShip until Mike confirms;
// these tests use an open synthetic row so the importer logic can be exercised offline
const openRow = { id: 'cita-lu-cameras', commercialStatus: 'allowed_per_doc', attribution: ATTRIBUTION, provenance: TERMS_URL, licence: 'CC0', reviewedAt: '2026-11-25', metadataPermission: { status: 'allowed' } };
const perms = [openRow];
const tmp = () => mkdtempSync(join(tmpdir(), 'citalu-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const recs = parseKml(kml);
const rec = (o = {}) => ({ ...recs[0], ...o });
const placemark = (n, o = {}) => `<Placemark id="camera_${n}"><name>${o.name ?? `A6 - Camera ${n}`}</name><description><![CDATA[<iframe class="cam-frame" src="${o.link ?? `https://www.cita.lu/webcam/map/${n}`}" height="245"></iframe>]]></description><Point><coordinates>${o.coords ?? `${5.9 + (n % 50) / 100},${49.6 + (n % 50) / 100},0`}</coordinates></Point></Placemark>`;
const kmlOf = (items) => `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Folder>${items.join('\n')}</Folder></Document></kml>\n`;
const many = (n) => kmlOf(Array.from({ length: n }, (_, i) => placemark(i + 1)));
const fetcher = (o = {}) => async (url) => {
  const v = url === DATASET_API_URL ? (o.item ?? dataset) : url === TERMS_URL ? (o.terms ?? faq) : url === ROBOTS_URL ? (o.robots ?? 'User-agent: *\n') : url === FEED_URL ? (o.feed ?? kml) : null;
  if (v === null) throw new Error('unexpected url ' + url);
  const r = typeof v === 'function' ? await v(url) : v;
  if (r instanceof Error) throw r;
  return r;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, minUsable: 3, ...o });

test('CITA normalize: id from the placemark number, name as CITA wrote it, motorway as road, link only on cita.lu/webcam/map/<same number>, no city', () => {
  const drop = {}, seen = new Set();
  const ok = recs.map((r) => normalizeCita(r, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, {});
  assert.equal(ok.length, 5);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'cita-lu-cameras-3');
  assert.equal(c.sourceId, 'cita-lu-cameras');
  assert.equal(c.name, 'A6 - Camera 3');
  assert.equal(c.road, 'A6');
  assert.equal(c.city, null);
  assert.equal(c.direction, '');
  assert.equal(c.feedType, 'still');
  assert.equal(c.regionSlug, 'luxembourg');
  assert.equal(c.lon, 5.921276000000001);
  assert.equal(c.lat, 49.63694099999999);
  assert.equal(c.officialUrl, 'https://www.cita.lu/webcam/map/3');
  assert.equal(new Set(ok.map((x) => x.id)).size, 5);
  for (const x of ok) { assert.ok(/^https:\/\/www\.cita\.lu\/webcam\/map\/\d+$/.test(x.officialUrl)); for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f); }
});

test('CITA normalize: bad rows are dropped and counted (foreign or http link, wrong page number, bad id, no name, bad or swapped coords, out of bounds, malformed, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    rec({ link: 'https://example.com/webcam/map/3' }), rec({ link: 'http://www.cita.lu/webcam/map/3' }), rec({ link: 'https://www.cita.lu.evil.example/webcam/map/3' }),
    rec({ link: 'https://www.cita.lu/webcam/map/4' }), rec({ link: 'https://www.cita.lu/webcam/map/3/../x' }), rec({ link: '' }),
    rec({ id: 'x3' }), rec({ id: '' }),
    rec({ name: ' ' }),
    rec({ lat: NaN }), rec({ lon: 'abc' }),
    rec({ lat: 5.92, lon: 49.63 }), rec({ lat: 48.85, lon: 2.35 }),
    null, 'x', 5,
  ];
  for (const r of bad) assert.equal(normalizeCita(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { noUrl: 6, noId: 2, noName: 1, badCoords: 2, outOfBounds: 2, malformed: 3 });
  assert.ok(normalizeCita(rec(), NOW, drop, seen));
  assert.equal(normalizeCita(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 49.6 && BOUNDS.latMax > 49.8 && BOUNDS.lonMin < 5.92 && BOUNDS.lonMax > 6.44, 'the real extent (lat 49.478-49.818, lon 5.919-6.446) is inside the box');
  assert.equal(normalizeCita(rec({ name: 'Tunnel Markusberg' }), NOW).road, '', 'a name that does not start with a motorway number gives no road');
  assert.equal(normalizeCita(rec({ name: '  A6 -   Camera 3 ' }), NOW).name, 'A6 - Camera 3', 'name is trimmed and spaces collapsed');
});

test('CITA feed: an HTML 200 page, an empty body, a JSON error and a cut-off list are refused; a placemark with no coordinates is kept raw and dropped by the normalizer', () => {
  assert.equal(recs.length, 5);
  assert.throws(() => parseKml('<html><body>Service unavailable</body></html>'), /no KML document/);
  assert.throws(() => parseKml(''), /no KML document/);
  assert.throws(() => parseKml('{"error":"x"}'), /no KML document/);
  assert.throws(() => parseKml(kml.slice(0, kml.length - 40)), /cut off/);
  assert.throws(() => parseKml(undefined), /no KML document/);
  const raw = parseKml(kmlOf([placemark(7, { coords: '' })]));
  assert.equal(raw.length, 1);
  assert.equal(normalizeCita(raw[0], NOW), null);
  assert.equal(parseKml(kmlOf([])).length, 0);
});

test('CITA dataset record: the real one passes; a changed licence, slug, resource list or an error body is a problem', () => {
  assert.deepEqual(datasetProblems(dataset), []);
  assert.match(datasetProblems(dataset.replace('"cc-zero"', '"cc-by"'))[0], /dataset licence is "cc-by"/);
  assert.match(datasetProblems(dataset.replace('"cc-zero"', 'null'))[0], /dataset licence is "null"/);
  assert.match(datasetProblems(dataset.replace('cita-cameras-autoroute', 'other'))[0], /slug changed/);
  assert.match(datasetProblems(dataset.replace('https://www.cita.lu/kml/cameras.kml', 'https://www.cita.lu/kml/other.kml'))[0], /no longer lists/);
  assert.match(datasetProblems('{"message":"Not found"}')[0], /not a dataset/);
  assert.match(datasetProblems('<html>')[0], /not JSON/);
  assert.match(datasetProblems('[]')[0], /not a dataset/);
});

test('CITA FAQ text: tags and tabs removed, the licence sentence is in the fixture and in none of the broken pages', () => {
  const t = pageText(faq);
  for (const p of LICENCE_PHRASES) assert.ok(t.includes(p), p);
  assert.equal(LICENCE_PHRASES.length, 1);
  assert.ok(ATTRIBUTION.includes('CITA') && ATTRIBUTION.includes('CC0'));
  assert.ok(!pageText('<html><body>Access denied</body></html>').includes(LICENCE_PHRASES[0]));
  assert.ok(/All rights reserved/.test(t), 'the conflicting footer sentence is on the same page: it is why image permission stays unverified');
});

test('CITA robots: an empty file or a 403 body means no rules; a Disallow for the feed path stops, an Allow of a longer path wins', () => {
  const p = '/kml/cameras.kml';
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('User-agent: *\n', p), true);
  assert.equal(robotsAllows('<html><title>403 Forbidden</title></html>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /kml/', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /kml/\nAllow: /kml/cameras.kml', p), true);
});

test('CITA run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'cita-lu-cameras').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'cita-lu-cameras'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'cita-lu-cameras');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(src.permissions.image_display, 'unverified');
  assert.equal(r.report.total, 5);
  assert.equal(r.report.raw, 5);
  assert.ok(existsSync(join(dir, 'import-report-citalu.json')));
});

test('CITA run: 96 placemarks give 96 cameras; a second run with fewer rows rewrites only CITA rows', async () => {
  const dir = tmp(); seed(dir);
  const r = await runCameras(opts(dir, { minUsable: 60 }, { feed: many(96) }));
  assert.equal(r.written, true, r.reason);
  assert.equal(r.report.total, 96);
  const first = read(dir);
  const r2 = await runCameras(opts(dir, { minUsable: 3 }, { feed: many(90) }));
  assert.equal(r2.written, true, r2.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'cita-lu-cameras').length, 90);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'cita-lu-cameras'), first.filter((c) => c.sourceId !== 'cita-lu-cameras'));
});

test('CITA run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const items = [...Array.from({ length: 70 }, (_, i) => placemark(i + 1)), placemark(1), placemark(900, { link: 'https://example.com/a' }), placemark(901, { coords: '2.35,48.85,0' })];
  const r = await runCameras(opts(dir, { minUsable: 60 }, { feed: kmlOf(items) }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, noUrl: 1, outOfBounds: 1 });
  assert.equal(r.report.total, 70);
});

test('CITA: licence row closed, wording gone, dataset record changed, robots Disallow, HTML 200 body, cut-off list, unreadable, too few cameras: nothing written (failing fixtures)', async () => {
  const closed = [{ ...openRow, commercialStatus: 'unknown' }];
  const mustNot = [{ ...openRow, mustNotShip: true }];
  const unverifiedMeta = [{ ...openRow, metadataPermission: { status: 'unverified' } }];
  const good = many(70);
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: mustNot }, {}, /licence closed/],
    [{ perms: unverifiedMeta }, {}, /licence closed/],
    [{ perms: [] }, {}, /licence closed/],
    [{ perms: [{ ...openRow, reviewedAt: '2026-01-01' }] }, {}, /licence closed/],
    [{}, { terms: faq.replace('is available without restrictions', 'is available for personal use only') }, /licence wording changed/],
    [{}, { terms: '<html><body>Access denied</body></html>' }, /licence wording changed/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable/],
    [{}, { item: dataset.replace('"cc-zero"', '"cc-by-nc"') }, /licence wording changed/],
    [{}, { item: new Error('HTTP 500') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /kml/' }, /robots\.txt disallows/],
    [{}, { robots: new Error('HTTP 503') }, /robots\.txt unreadable/],
    [{}, { feed: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { feed: '<html><body>Maintenance</body></html>' }, /feed unreadable/],
    [{}, { feed: good.slice(0, good.length - 30) }, /feed unreadable.*cut off/],
    [{}, { feed: kmlOf([]) }, /only 0 usable/],
    [{}, { feed: many(10) }, /only 10 usable cameras/],
  ];
  for (const [o, f, re] of cases) {
    const dir = tmp(); seed(dir);
    const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
    const r = await runCameras(opts(dir, { minUsable: 60, ...o }, { feed: good, ...f })); // a healthy 70-row list unless the case replaces it
    assert.equal(r.written, false, String(re));
    assert.match(r.reason, re);
    assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before, 'the registry is left as it was');
    assert.ok(!existsSync(join(dir, 'sources.json')));
  }
});

test('CITA: a list under half the last good run never replaces it; an unreadable registry is not overwritten', async () => {
  const dir = tmp();
  const r0 = await runCameras(opts(dir, { minUsable: 60 }, { feed: many(96) }));
  assert.equal(r0.written, true, r0.reason);
  const r = await runCameras(opts(dir, { minUsable: 1 }, { feed: many(40) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 96 to 40/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2, { minUsable: 60 }, { feed: many(96) }));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('CITA: only the dataset record, the FAQ page, robots.txt and the KML are requested; no camera page or picture address is ever fetched', async () => {
  assert.equal(new URL(FEED_URL).hostname, 'www.cita.lu');
  assert.equal(new URL(DATASET_API_URL).hostname, 'data.public.lu');
  assert.equal(new URL(TERMS_URL).hostname, 'www.cita.lu');
  assert.ok(!/key|token|@/i.test(new URL(FEED_URL).search + new URL(FEED_URL).username));
  assert.equal(ATTRIBUTION, 'Source: CITA, Administration des Ponts et Chaussees (Luxembourg), motorway webcam list, CC0.');
  const hits = [];
  const dir = tmp();
  await runCameras(opts(dir, { minUsable: 60, fetchText: async (u) => { hits.push(u); return fetcher({ feed: many(70) })(u); } }));
  assert.deepEqual(hits.sort(), [DATASET_API_URL, FEED_URL, ROBOTS_URL, TERMS_URL].sort());
  assert.ok(!hits.some((u) => /webcam\/map|info_trafic|\.jpg/.test(u)));
});

test('licence patch: the generated row stays mustNotShip, unverified, needs review; image permission is never allowed; the gate keeps the source closed', () => {
  const p = JSON.parse(readFileSync(join(here, '..', '..', 'ops', 'importers', 'patches', 'citalu.patch.json'), 'utf8'));
  const row = p.edits.find((e) => e.file === 'data/source-permissions.manual.json').value;
  assert.equal(row.id, 'cita-lu-cameras');
  assert.equal(row.mustNotShip, true);
  assert.equal(row.needsHumanReview, true);
  assert.equal(row.commercialStatus, 'unverified');
  assert.equal(row.imagePermission.status, 'unverified');
  assert.equal(row.metadataPermission.status, 'unverified');
  assert.ok(row.licence.includes('Creative Commons Zero (CC0)'));
  assert.ok(row.licence.includes('Much of the information (webcam, travel time, etc.) is available without restrictions and can be easily integrated on intranet or internet sites.'));
  assert.ok(row.licence.includes('All rights reserved'), 'the conflicting footer sentence is quoted for the owner');
  assert.equal(isEnabled({ ...row, attribution: ATTRIBUTION }, new Date(NOW)), false);
});
