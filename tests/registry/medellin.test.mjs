// Offline tests for the Medellin importer (SIMM CCTV points, GeoMedellin ArcGIS geoJSON, catalogue record CC BY SA). Run: node --test tests/registry/medellin.test.mjs
// Fixtures are real trimmed copies fetched 2026-11-25: 5 features of the layer query and the resource-constraint part of the catalogue record (ISO 19139 XML).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras } from '../../ops/importers/medellin.mjs';
import { parseFeed, normalizeMedellin, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, BOUNDS, ATTRIBUTION, LICENCE_PHRASES } from '../../ops/importers/lib/medellin.mjs';
import { validateCamera, FORBIDDEN_FIELDS } from '../../ops/importers/lib/registry.mjs';
import { isEnabled } from '../licensing/gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const list = fx('medellin-list.json');
const record = fx('medellin-record.xml');
const NOW = '2026-11-25T12:00:00.000Z';
// the real licence row is added to the shared files by the merger (patch ops/importers/patches/medellin.patch.json) and stays mustNotShip until Mike confirms;
// these tests use an open synthetic row so the importer logic can be exercised offline
const openRow = { id: 'medellin-simm-cameras', commercialStatus: 'allowed_per_doc', attribution: ATTRIBUTION, provenance: TERMS_URL, licence: 'CC BY SA', reviewedAt: '2026-11-25', metadataPermission: { status: 'allowed' } };
const perms = [openRow];
const tmp = () => mkdtempSync(join(tmpdir(), 'medellin-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const recs = parseFeed(list);
const rec = (o = {}) => ({ ...recs[0], ...o });
const feat = (n, o = {}) => ({ type: 'Feature', id: n, geometry: { type: 'Point', coordinates: o.coords ?? [-75.6 + (n % 50) / 1000, 6.2 + (n % 50) / 1000] }, properties: { objectid: n, direccion: o.address ?? `Cr ${n} Cl 10`, localizacion: o.place ?? `Lugar ${n}`, link_foto: o.link === undefined ? `https://www.medellin.gov.co/simm/camaras-cctv/imagen${n}.jpg` : o.link } });
const fc = (items, extra = {}) => JSON.stringify({ type: 'FeatureCollection', features: items, ...extra });
const many = (n) => fc(Array.from({ length: n }, (_, i) => feat(i + 1)));
const fetcher = (o = {}) => async (url) => {
  const v = url === TERMS_URL ? (o.terms ?? record) : url === ROBOTS_URL ? (o.robots ?? 'User-agent: *\n') : url === FEED_URL ? (o.feed ?? list) : null;
  if (v === null) throw new Error('unexpected url ' + url);
  const r = typeof v === 'function' ? await v(url) : v;
  if (r instanceof Error) throw r;
  return r;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, minUsable: 3, ...o });

test('Medellin normalize: id from the picture number, name = place (street corner), link only on the city picture address, no road, no city', () => {
  const drop = {}, seen = new Set();
  const ok = recs.map((r) => normalizeMedellin(r, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, {});
  assert.equal(ok.length, 5);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'medellin-simm-cameras-77');
  assert.equal(c.sourceId, 'medellin-simm-cameras');
  assert.equal(c.name, 'El Castillo (Cr 83C Cl 33)');
  assert.equal(c.road, '');
  assert.equal(c.city, null);
  assert.equal(c.regionSlug, 'medellin');
  assert.equal(c.feedType, 'still');
  assert.equal(c.lon, -75.608013999162722);
  assert.equal(c.lat, 6.2386330006691146);
  assert.equal(c.officialUrl, 'https://www.medellin.gov.co/simm/camaras-cctv/imagen77.jpg');
  assert.equal(new Set(ok.map((x) => x.id)).size, 5);
  for (const x of ok) { assert.ok(/^https:\/\/www\.medellin\.gov\.co\/simm\/camaras-cctv\/imagen\d+\.jpg$/.test(x.officialUrl)); for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f); }
});

test('Medellin normalize: bad rows are dropped and counted (no, bare, foreign or http picture link, no name, bad or swapped coords, out of bounds, malformed, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const bad = [
    rec({ link: null }), rec({ link: '' }), rec({ link: 'https://www.medellin.gov.co/simm/camaras-cctv/imagen.jpg' }),
    rec({ link: 'https://example.com/simm/camaras-cctv/imagen7.jpg' }), rec({ link: 'http://www.medellin.gov.co/simm/camaras-cctv/imagen7.jpg' }),
    rec({ link: 'https://www.medellin.gov.co.evil.example/simm/camaras-cctv/imagen7.jpg' }),
    rec({ place: ' ', address: '' }),
    rec({ lat: NaN }), rec({ lon: 'abc' }),
    rec({ lat: -75.6, lon: 6.2 }), rec({ lat: 4.7, lon: -74.07 }),
    null, 'x', 5,
  ];
  for (const r of bad) assert.equal(normalizeMedellin(r, NOW, drop, seen), null);
  assert.deepEqual(drop, { noUrl: 6, noName: 1, badCoords: 2, outOfBounds: 2, malformed: 3 });
  assert.ok(normalizeMedellin(rec(), NOW, drop, seen));
  assert.equal(normalizeMedellin(rec(), NOW, drop, seen), null);
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 6.19 && BOUNDS.latMax > 6.31 && BOUNDS.lonMin < -75.64 && BOUNDS.lonMax > -75.54, 'the real extent (lat 6.189-6.309, lon -75.641 to -75.547) is inside the box');
});

test('Medellin normalize: names are trimmed and collapsed, a place written twice on two lines is collapsed, place or street alone is used when the other is empty', () => {
  assert.equal(normalizeMedellin(rec({ place: 'Avenida Paralela\r\nAvenida Paralela', address: 'Carrera 63 No. 111 EE-04' }), NOW).name, 'Avenida Paralela (Carrera 63 No. 111 EE-04)');
  assert.equal(normalizeMedellin(rec({ place: '  Quebrada   Tinajas ', address: ' Cr 63A Cl 103 ' }), NOW).name, 'Quebrada Tinajas (Cr 63A Cl 103)');
  assert.equal(normalizeMedellin(rec({ place: '', address: 'Cr 1 Cl 2' }), NOW).name, 'Cr 1 Cl 2');
  assert.equal(normalizeMedellin(rec({ place: 'Everest', address: 'Everest' }), NOW).name, 'Everest');
  assert.equal(normalizeMedellin(rec({ place: 'Av. Regional Av. Regional', address: '' }), NOW).name, 'Av. Regional', 'equal halves collapse even without a line break');
});

test('Medellin feed: an HTML 200 page, an empty body, an ArcGIS error, a truncated list and an over-limit answer are refused; a feature with no point is kept raw and dropped by the normalizer', () => {
  assert.equal(recs.length, 5);
  assert.throws(() => parseFeed('<html><body>Service unavailable</body></html>'), /not JSON/);
  assert.throws(() => parseFeed(''), /not JSON/);
  assert.throws(() => parseFeed('{"error":{"code":500,"message":"x"}}'), /error object/);
  assert.throws(() => parseFeed('[]'), /error object|no FeatureCollection/);
  assert.throws(() => parseFeed('{"type":"Other"}'), /no FeatureCollection/);
  assert.throws(() => parseFeed(list.slice(0, list.length - 30)), /not JSON/);
  assert.throws(() => parseFeed(fc([feat(1)], { exceededTransferLimit: true })), /incomplete/);
  assert.throws(() => parseFeed(undefined), /not JSON/);
  const raw = parseFeed(fc([{ type: 'Feature', geometry: null, properties: { objectid: 9, direccion: 'a', localizacion: 'b', link_foto: 'https://www.medellin.gov.co/simm/camaras-cctv/imagen9.jpg' } }]));
  assert.equal(raw.length, 1);
  assert.equal(normalizeMedellin(raw[0], NOW), null);
  assert.equal(parseFeed(fc([])).length, 0);
});

test('Medellin record text: the real record passes; tags are removed; the title and licence sentence are in the fixture and in none of the broken pages', () => {
  const t = pageText(record);
  for (const p of LICENCE_PHRASES) assert.ok(t.includes(p), p);
  assert.equal(LICENCE_PHRASES.length, 2);
  assert.ok(ATTRIBUTION.includes('GeoMedellín') && ATTRIBUTION.includes('CC BY-SA 4.0') && ATTRIBUTION.includes('same licence'), 'the ShareAlike sentence travels with our list');
  assert.ok(!pageText('<html><body>Access denied</body></html>').includes(LICENCE_PHRASES[1]));
  assert.ok(!pageText(record.replace('CC BY SA https://creativecommons.org/licenses/by-sa/4.0/deed.es', 'CC BY NC SA https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es')).includes(LICENCE_PHRASES[1]));
  assert.ok(/Para publicaciones por favor citar/.test(t), 'the record carries its own citation sentence');
});

test('Medellin robots: an empty file or a 403 body means no rules; a Disallow for the query path stops, an Allow of a longer path wins; the real robots.txt rules do not touch the feed', () => {
  const p = '/servidormapas/rest/services/transporte/VC_Infraest_Gestion_Transito/MapServer/2/query?where=1=1&outFields=*&outSR=4326&f=geojson';
  assert.equal(robotsAllows('', p), true);
  assert.equal(robotsAllows('User-agent: *\n', p), true);
  assert.equal(robotsAllows('<html><title>403 Forbidden</title></html>', p), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /servidormapas/', p), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /servidormapas/\nAllow: /servidormapas/rest/', p), true);
  assert.equal(robotsAllows('User-agent: *\nUser-agent: AdsBot-Google\nDisallow:/normograma/*\nDisallow:/test/*\nDisallow:/satmed/nuevo-caso', p), true);
});

test('Medellin run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'medellin-simm-cameras').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'medellin-simm-cameras'), before, 'rows of other sources are exactly as they were');
  const src = read(dir, 'sources.json').find((s) => s.id === 'medellin-simm-cameras');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(src.permissions.image_display, 'unverified');
  assert.equal(r.report.total, 5);
  assert.equal(r.report.raw, 5);
  assert.ok(existsSync(join(dir, 'import-report-medellin.json')));
});

test('Medellin run: 81 rows with 11 lacking a numbered picture give 70 cameras; a second run with fewer rows rewrites only Medellin rows', async () => {
  const dir = tmp(); seed(dir);
  const items = [...Array.from({ length: 70 }, (_, i) => feat(i + 1)), ...Array.from({ length: 10 }, (_, i) => feat(200 + i, { link: 'https://www.medellin.gov.co/simm/camaras-cctv/imagen.jpg' })), feat(300, { link: null })];
  const r = await runCameras(opts(dir, { minUsable: 40 }, { feed: fc(items) }));
  assert.equal(r.written, true, r.reason);
  assert.equal(r.report.raw, 81);
  assert.equal(r.report.total, 70);
  assert.deepEqual(r.report.dropped, { noUrl: 11 });
  const first = read(dir);
  const r2 = await runCameras(opts(dir, { minUsable: 3 }, { feed: many(65) }));
  assert.equal(r2.written, true, r2.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'medellin-simm-cameras').length, 65);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'medellin-simm-cameras'), first.filter((c) => c.sourceId !== 'medellin-simm-cameras'));
});

test('Medellin run: duplicate and out-of-bounds rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const items = [...Array.from({ length: 50 }, (_, i) => feat(i + 1)), feat(1), feat(900, { link: 'https://example.com/a/imagen9.jpg' }), feat(901, { coords: [-74.07, 4.71] })];
  const r = await runCameras(opts(dir, { minUsable: 40 }, { feed: fc(items) }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, noUrl: 1, outOfBounds: 1 });
  assert.equal(r.report.total, 50);
});

test('Medellin: licence row closed, wording gone, record page unreadable, robots Disallow, HTML 200 body, ArcGIS error, unreadable, too few cameras: nothing written (failing fixtures)', async () => {
  const closed = [{ ...openRow, commercialStatus: 'unknown' }];
  const mustNot = [{ ...openRow, mustNotShip: true }];
  const unverifiedMeta = [{ ...openRow, metadataPermission: { status: 'unverified' } }];
  const good = many(60);
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: mustNot }, {}, /licence closed/],
    [{ perms: unverifiedMeta }, {}, /licence closed/],
    [{ perms: [] }, {}, /licence closed/],
    [{ perms: [{ ...openRow, reviewedAt: '2026-01-01' }] }, {}, /licence closed/],
    [{}, { terms: record.replace('CC BY SA https://creativecommons.org/licenses/by-sa/4.0/deed.es', 'CC BY NC SA https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es') }, /licence wording changed/],
    [{}, { terms: record.replace('Cámaras CCTV (SIMM)', 'Otra capa') }, /licence wording changed/],
    [{}, { terms: '<html><body>Access denied</body></html>' }, /licence wording changed/],
    [{}, { terms: new Error('HTTP 403') }, /licence page unreadable/],
    [{}, { robots: 'User-agent: *\nDisallow: /servidormapas/' }, /robots\.txt disallows/],
    [{}, { robots: new Error('HTTP 503') }, /robots\.txt unreadable/],
    [{}, { feed: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { feed: '<html><body>Maintenance</body></html>' }, /feed unreadable/],
    [{}, { feed: '{"error":{"code":400,"message":"Invalid query"}}' }, /feed unreadable.*error object/],
    [{}, { feed: good.slice(0, good.length - 30) }, /feed unreadable/],
    [{}, { feed: fc([]) }, /only 0 usable/],
    [{}, { feed: many(10) }, /only 10 usable cameras/],
  ];
  for (const [o, f, re] of cases) {
    const dir = tmp(); seed(dir);
    const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
    const r = await runCameras(opts(dir, { minUsable: 40, ...o }, { feed: good, ...f })); // a healthy 60-row list unless the case replaces it
    assert.equal(r.written, false, String(re));
    assert.match(r.reason, re);
    assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before, 'the registry is left as it was');
    assert.ok(!existsSync(join(dir, 'sources.json')));
  }
});

test('Medellin: a list under half the last good run never replaces it; an unreadable registry is not overwritten', async () => {
  const dir = tmp();
  const r0 = await runCameras(opts(dir, { minUsable: 40 }, { feed: many(70) }));
  assert.equal(r0.written, true, r0.reason);
  const r = await runCameras(opts(dir, { minUsable: 1 }, { feed: many(30) }));
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell from 70 to 30/);
  const dir2 = tmp(); writeFileSync(join(dir2, 'cameras.json'), '[{"id":"x"');
  const r2 = await runCameras(opts(dir2, { minUsable: 40 }, { feed: many(70) }));
  assert.equal(r2.written, false);
  assert.match(r2.reason, /not a readable list/);
});

test('Medellin: only the licence record, robots.txt and the one layer query are requested; no picture address is ever fetched', async () => {
  assert.equal(new URL(FEED_URL).hostname, 'www.medellin.gov.co');
  assert.equal(new URL(TERMS_URL).hostname, 'www.medellin.gov.co');
  assert.ok(!/key|token|@/i.test(new URL(FEED_URL).search + new URL(FEED_URL).username));
  const hits = [];
  const dir = tmp();
  await runCameras(opts(dir, { minUsable: 40, fetchText: async (u) => { hits.push(u); return fetcher({ feed: many(60) })(u); } }));
  assert.deepEqual(hits.sort(), [FEED_URL, ROBOTS_URL, TERMS_URL].sort());
  assert.ok(!hits.some((u) => /\.jpg|\/simm\//.test(u)));
});

test('licence patch: the generated row stays mustNotShip, unverified, needs review; image permission is never allowed; the gate keeps the source closed', () => {
  const p = JSON.parse(readFileSync(join(here, '..', '..', 'ops', 'importers', 'patches', 'medellin.patch.json'), 'utf8'));
  const row = p.edits.find((e) => e.file === 'data/source-permissions.manual.json').value;
  assert.equal(row.id, 'medellin-simm-cameras');
  assert.equal(row.mustNotShip, true);
  assert.equal(row.needsHumanReview, true);
  assert.equal(row.commercialStatus, 'unverified');
  assert.equal(row.imagePermission.status, 'unverified');
  assert.equal(row.metadataPermission.status, 'unverified');
  assert.ok(row.licence.includes('CC BY SA https://creativecommons.org/licenses/by-sa/4.0/deed.es'));
  assert.ok(row.licence.includes('Creative Commons'));
  assert.equal(isEnabled({ ...row, attribution: ATTRIBUTION }, new Date(NOW)), false);
});
