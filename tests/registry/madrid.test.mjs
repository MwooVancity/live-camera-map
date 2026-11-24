// Offline tests for the Madrid importer (Ayuntamiento de Madrid open data, dataset 202088-0 "Tráfico. Cámaras", KML, CC BY 4.0). Run: node --test tests/registry/madrid.test.mjs
// Fixtures are real copies fetched 2026-11-24: 4 of the 357 placemarks of the live KML (06303, 10306, 05323, 08337), the lines of the dataset page, the general reuse conditions page and the legal notice that carry the quoted sentences, and the portal robots.txt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/madrid.mjs';
import { parseFeed, normalizeMadrid, robotsAllows, pageText, FEED_URL, KML_FINAL_URL, ROBOTS_URL, INFORMO_ROBOTS_URL, PAGE_URL, TERMS_URL, LEGAL_URL, BOUNDS, ATTRIBUTION, DATASET_PHRASES, TERMS_PHRASES, LEGAL_PHRASES, CRAWL_DELAY_MS } from '../../ops/importers/lib/madrid.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY } from '../../ops/importers/lib/registry.mjs';
import { CONFIG } from '../../ops/health/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const kml = fx('madrid-list.kml');
const dataset = fx('madrid-dataset.html');
const terms = fx('madrid-terms.html');
const legal = fx('madrid-legal.html');
const robots = fx('madrid-robots.txt');
const NOW = '2026-11-24T12:00:00.000Z';
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'madrid-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'calgary-traffic-1', sourceId: 'calgary-traffic', n: 2 }, { id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }]));
const pms = parseFeed(kml);
const first = pms[0];
// a placemark in the City's own shape, for any number and name
const pm = (num, o = {}) => `<Placemark>
      <description>&lt;div align=center&gt;&lt;img src=${o.img ?? `https://informo.madrid.es/cameras/Camara${num}.jpg?v=50001`}  width=300 height=220/&gt;&lt;br/&gt;${o.name ?? 'X'}&lt;/div&gt;</description>
      <ExtendedData>
        <Data name="Numero">
          <Value>${o.num ?? num}</Value>
        </Data>
        <Data name="Nombre">
          <Value>${o.name ?? `CAMARA ${num}`}</Value>
        </Data>
      </ExtendedData>
      <Point>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>${o.co ?? '-3.7,40.4,10 '}</coordinates>
      </Point>
    </Placemark>`;
const doc = (...p) => `﻿<kml xmlns="http://earth.google.com/kml/2.2">\r\n  <Document>\r\n    ${p.join('\r\n    ')}\r\n  </Document>\r\n</kml>\r\n`;
const num5 = (i) => String(i).padStart(5, '0');
const many = (n) => doc(...Array.from({ length: n }, (_, i) => pm(num5(i + 1))));
const fetcher = (o = {}) => async (url) => {
  const v = url === PAGE_URL ? (o.dataset ?? dataset) : url === TERMS_URL ? (o.terms ?? terms) : url === LEGAL_URL ? (o.legal ?? legal)
    : url === ROBOTS_URL ? (o.robots ?? robots) : url === INFORMO_ROBOTS_URL ? (o.robots2 ?? '<?xml version=\'1.0\' encoding=\'UTF-8\'?><Error><Code>NoSuchKey</Code></Error>') : (o.feed ?? kml);
  if (v instanceof Error) throw v;
  return v;
};
const opts = (dir, o = {}, f = {}) => ({ fetchText: fetcher(f), outDir: dir, now: NOW, perms, log: () => {}, minUsable: 3, pauseMs: 0, ...o });

test('Madrid normalize: id from the camera number, the City name kept, picture link without the cache number, position from the Point, no city, region Madrid in Spain', () => {
  const drop = {}, seen = new Set();
  const ok = pms.map((p) => normalizeMadrid(p, NOW, drop, seen)).filter(Boolean);
  assert.deepEqual(drop, {});
  assert.equal(ok.length, 4);
  const c = ok[0];
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'madrid-camaras-06303');
  assert.equal(c.name, 'PLAZA DE CASTILLA (NORTE)');
  assert.equal(c.city, null);
  assert.equal(c.regionSlug, 'madrid');
  assert.equal(c.feedType, 'still');
  assert.equal(c.lat, 40.466063829633);
  assert.equal(c.lon, -3.68894207537291);
  assert.equal(c.officialUrl, 'https://informo.madrid.es/cameras/Camara06303.jpg');
  assert.ok(!c.officialUrl.includes('?'), 'the ?v= cache number is dropped');
  assert.deepEqual(ok.map((x) => x.id), ['madrid-camaras-06303', 'madrid-camaras-10306', 'madrid-camaras-05323', 'madrid-camaras-08337']);
  assert.equal(ok[3].name, 'M607 PK10+600');
  assert.equal(REGION_COUNTRY.madrid.countrySlug, 'spain');
  assert.equal(REGION_COUNTRY.madrid.countryCode, 'ES');
  for (const x of ok) for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in x), f);
});

test('Madrid normalize: bad rows are dropped and counted (no number, foreign host, http, wrong path, other camera, userinfo, no name, bad coords, out of bounds, malformed, duplicate), never repaired', () => {
  const drop = {}, seen = new Set();
  const n = '06303';
  const bad = [
    pm(n, { num: '' }), pm(n, { num: '6303', img: 'https://informo.madrid.es/cameras/Camara6303.jpg' }), pm(n, { num: 'abcde' }),
    pm(n, { img: 'https://example.com/cameras/Camara06303.jpg' }), pm(n, { img: 'http://informo.madrid.es/cameras/Camara06303.jpg' }), pm(n, { img: 'https://informo.madrid.es.evil.example/cameras/Camara06303.jpg' }),
    pm(n, { img: 'https://informo.madrid.es@evil.example/cameras/Camara06303.jpg' }), pm(n, { img: 'https://informo.madrid.es/other/Camara06303.jpg' }), pm(n, { img: 'https://informo.madrid.es/cameras/Camara06304.jpg?v=50001' }),
    pm(n, { img: 'https://informo.madrid.es/cameras/Camara06303.jpg?x=1' }), pm(n, { img: '' }),
    pm(n, { name: '' }),
    pm(n, { co: '' }), pm(n, { co: 'x,y,0' }), pm(n, { co: '-3.7' }), pm(n, { co: ',,' }),
    pm(n, { co: '2.35,48.85,0' }), pm(n, { co: '40.4,-3.7,0' }), pm(n, { co: '0,0,0' }),
    null, 5, '<Placemark></Placemark>',
  ];
  for (const r of bad) assert.equal(normalizeMadrid(r, NOW, drop, seen), null, String(r).slice(0, 120));
  assert.deepEqual(drop, { noNumero: 3 + 1 /* empty placemark */, noUrl: 8, noName: 1, badCoords: 4, outOfBounds: 3, malformed: 2 });
  assert.ok(normalizeMadrid(first, NOW, drop, seen));
  assert.equal(normalizeMadrid(first, NOW, drop, seen), null, 'the same camera number twice is one camera');
  assert.equal(drop.dupKey, 1);
  assert.ok(BOUNDS.latMin < 40.33 && BOUNDS.latMax > 40.52 && BOUNDS.lonMin < -3.78 && BOUNDS.lonMax > -3.55);
});

test('Madrid normalize: markup in a name stays text and entities are decoded once', () => {
  const c = normalizeMadrid(pm('00001', { name: 'CALLE A &amp; B &lt;b&gt;' }), NOW);
  assert.equal(c.name, 'CALLE A & B <b>'); // kept as text; the site only ever writes names with textContent
});

test('Madrid feed: HTML, an empty body, a cut-off body and a JSON object are refused', () => {
  assert.equal(pms.length, 4);
  assert.throws(() => parseFeed('<html><body>Service unavailable</body></html>'), /no KML/);
  assert.throws(() => parseFeed(''), /no KML/);
  assert.throws(() => parseFeed('{"error":true}'), /no KML/);
  assert.throws(() => parseFeed(kml.slice(0, kml.length - 40)), /cut off/);
  assert.deepEqual(parseFeed(doc()), []);
});

test('Madrid licence pages: the real fixtures hold every phrase; the quoted sentences are present word for word', () => {
  const d = pageText(dataset), t = pageText(terms), l = pageText(legal);
  for (const p of DATASET_PHRASES) assert.ok(d.includes(p), p);
  for (const p of TERMS_PHRASES) assert.ok(t.includes(p), p);
  for (const p of LEGAL_PHRASES) assert.ok(l.includes(p), p);
  assert.ok(d.includes('Licencia Creative Commons Attribution 4.0 International (CC BY 4.0)'));
  assert.ok(t.includes('permiten la reutilización de los documentos y datos sometidos a ellas para fines comerciales y no comerciales'));
  assert.ok(t.includes('Origen de los datos: Ayuntamiento de Madrid'));
  assert.ok(l.includes('ni a imágenes, vídeos u otros contenidos multimedia'));
  assert.ok(!t.includes('sin fines comerciales') && !t.includes('uso no comercial'));
});

test('Madrid robots: the real portal file allows the KML, dataset and pages paths and asks a 10 second delay; a Disallow for any stops', () => {
  for (const u of [FEED_URL, PAGE_URL, TERMS_URL, LEGAL_URL]) assert.equal(robotsAllows(robots, new URL(u).pathname), true, u);
  assert.equal(robotsAllows(robots, '/api/3/action/package_show'), false, 'the API path the portal disallows');
  assert.equal(robotsAllows(robots, '/datastore/dump'), false);
  assert.match(robots, /Crawl-delay:\s*10/);
  assert.equal(CRAWL_DELAY_MS, 10000);
  assert.equal(robotsAllows('', '/egob/catalogo/x.kml'), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /egob/', new URL(FEED_URL).pathname), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /informo/', new URL(KML_FINAL_URL).pathname), false);
});

test('Madrid run: writes its own rows, a source row and a report; every other source is untouched', async () => {
  const dir = tmp(); seed(dir);
  const before = read(dir);
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'madrid-camaras').length, 4);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'madrid-camaras'), before);
  const src = read(dir, 'sources.json').find((s) => s.id === 'madrid-camaras');
  assert.equal(src.attribution, ATTRIBUTION);
  assert.equal(src.permissions.image_display, 'unverified');
  assert.equal(r.report.total, 4);
  assert.equal(r.report.raw, 4);
  assert.ok(existsSync(join(dir, 'import-report-madrid.json')));
});

test('Madrid run: bad and duplicate rows are dropped with counted reasons, the good ones are kept', async () => {
  const dir = tmp();
  const feed = doc(...Array.from({ length: 12 }, (_, i) => pm(num5(i + 1))), pm('00001'), pm('00002', { img: 'https://example.com/a.jpg' }), pm('00003', { co: '' }));
  const r = await runCameras(opts(dir, { minUsable: 10 }, { feed }));
  assert.equal(r.written, true, r.reason);
  assert.deepEqual(r.report.dropped, { dupKey: 1, noUrl: 1, badCoords: 1 });
  assert.equal(r.report.total, 12);
});

test('Madrid: licence row closed, a changed licence, reuse, credit or picture sentence, robots Disallow, HTML 200 body, cut-off list, unreadable, too few: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'madrid-camaras-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const big = many(13);
  const swap = (html, a, b) => { assert.ok(html.includes(a), a); return html.replace(a, b); };
  const cases = [
    [{ perms: closed }, {}, /licence closed/],
    [{ perms: perms.filter((s) => s.id !== 'madrid-camaras-cameras') }, {}, /licence closed/],
    [{}, { dataset: swap(dataset, 'Creative Commons Attribution 4.0 International (CC BY 4.0)', 'Creative Commons Attribution-NonCommercial 4.0') }, /licence wording changed on the dataset page/],
    [{}, { dataset: '<html><body>Access denied</body></html>' }, /licence wording changed on the dataset page/],
    [{}, { terms: swap(terms, 'para fines comerciales y no comerciales', 'para fines no comerciales') }, /licence wording changed on the terms page/],
    [{}, { terms: swap(terms, 'Debe citarse la fuente', 'Puede citarse la fuente') }, /licence wording changed on the terms page/],
    [{}, { legal: swap(legal, 'ni a im&#225;genes', 'ni a textos') }, /licence wording changed on the legal notice/],
    [{}, { legal: new Error('HTTP 503') }, /licence page unreadable \(legal notice\)/],
    [{}, { terms: new Error('HTTP 503') }, /licence page unreadable \(terms page\)/],
    [{}, { robots: 'User-agent: *\nDisallow: /egob/' }, /robots\.txt disallows/],
    [{}, { robots: 'User-agent: *\nDisallow: /pages/' }, /robots\.txt disallows/],
    [{}, { robots2: 'User-agent: *\nDisallow: /informo/' }, /informo\.madrid\.es disallows/],
    [{}, { feed: new Error('HTTP 503') }, /feed unreadable/],
    [{}, { feed: '<html><body>Maintenance</body></html>' }, /feed unreadable/],
    [{}, { feed: big.slice(0, 900) }, /feed unreadable/],
    [{}, { feed: doc() }, /only 0 usable/],
    [{}, { feed: many(4) }, /only 4 usable cameras/],
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

test('Madrid: a list under half the last good run never replaces it, and a damaged registry file is never overwritten', async () => {
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

test('Madrid: one KML request per run, two robots, three pages, no key, 10 second pauses between datos.madrid.es requests, and no picture is ever requested', async () => {
  assert.equal(new URL(FEED_URL).hostname, 'datos.madrid.es');
  assert.ok(!/key|token|@/i.test(new URL(FEED_URL).search));
  const hits = [];
  await runCameras(opts(tmp(), { fetchText: async (u) => { hits.push(u); return fetcher()(u); } }));
  assert.equal(hits.filter((u) => u === FEED_URL).length, 1, 'one KML request per run');
  assert.deepEqual([...hits].sort(), [FEED_URL, INFORMO_ROBOTS_URL, LEGAL_URL, PAGE_URL, ROBOTS_URL, TERMS_URL].sort());
  assert.ok(!hits.some((u) => /\/cameras\/Camara/.test(u)), 'no picture address is requested');
  const waits = [];
  const real = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...a) => { waits.push(ms); return real(fn, 0, ...a); };
  try { await runCameras(opts(tmp(), { pauseMs: CRAWL_DELAY_MS })); } finally { globalThis.setTimeout = real; }
  assert.equal(waits.filter((w) => w === CRAWL_DELAY_MS).length, 4, 'a pause before each of the three pages and the KML (robots asks Crawl-delay 10)');
});

test('licence row: madrid-camaras-cameras passes the gate, quotes the CC BY dataset line, the commercial-reuse and credit sentences and the picture warning, flags the owner, images stay unverified', () => {
  const r = perms.find((s) => s.id === 'madrid-camaras-cameras');
  assert.ok(r, 'row exists');
  assert.equal(r.enabled, true);
  assert.equal(r.commercialStatus, 'allowed_per_doc');
  assert.equal(r.needsHumanReview, true);
  assert.equal(r.reviewedAt, '2026-11-24');
  assert.ok(r.licence.includes('Licencia Creative Commons Attribution 4.0 International (CC BY 4.0)'));
  assert.ok(r.licence.includes('permiten la reutilización de los documentos y datos sometidos a ellas para fines comerciales y no comerciales'));
  assert.ok(r.licence.includes('Debe citarse la fuente de los documentos objeto de la reutilización'));
  assert.ok(r.licence.includes('ni a imágenes, vídeos u otros contenidos multimedia'));
  assert.ok(r.licence.includes('OWNER MUST SEE'));
  assert.ok(r.licence.includes('https://datos.madrid.es/dataset/202088-0-trafico-camaras'));
  assert.equal(r.attribution, ATTRIBUTION);
  assert.match(r.imageStatus, /^unverified/);
});

test('health config: informo.madrid.es is probed one worker, HEAD only, 250 ms apart (its robots.txt has no rules, a real picture and a made-up number answer differently)', () => {
  assert.deepEqual(CONFIG.perSource['madrid-camaras'], { concurrency: 1, hostDelayMs: 250, staleHours: 6 });
});

const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')).filter((c) => c.sourceId === 'madrid-camaras') : [];
test('real cameras.json (when it holds Madrid rows): valid, unique ids and picture links, only informo.madrid.es picture paths, no image field, a country for the region', () => {
  if (!real.length) return;
  assert.ok(real.length >= 150);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  assert.equal(new Set(real.map((c) => c.officialUrl)).size, real.length);
  for (const c of real) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.match(c.officialUrl, /^https:\/\/informo\.madrid\.es\/cameras\/Camara\d{5}\.jpg$/);
    assert.equal(c.id, `madrid-camaras-${c.officialUrl.match(/Camara(\d{5})/)[1]}`);
    assert.equal(REGION_COUNTRY[c.regionSlug].countrySlug, 'spain');
  }
});
