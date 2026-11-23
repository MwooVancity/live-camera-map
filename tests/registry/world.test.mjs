// Offline tests for the Finland (Digitraffic) and Quebec (MTMD) camera importers (fixtures only).
// Run: node --test tests/registry/world.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras as runFi, loadPerms } from '../../ops/importers/digitraffic.mjs';
import { runCameras as runQc } from '../../ops/importers/quebec.mjs';
import { runCameras as runBc } from '../../ops/importers/drivebc.mjs';
import { normalizeStation, parseName, FI_BOUNDS } from '../../ops/importers/lib/digitraffic.mjs';
import { normalizeQuebec, parseDescription, QC_REGIONS, QC_BOUNDS } from '../../ops/importers/lib/quebec.mjs';
import { validateCamera, FORBIDDEN_FIELDS, REGION_COUNTRY, countsBy, countryOf } from '../../ops/importers/lib/registry.mjs';
import { isEnabled } from '../licensing/gate.mjs';
import { slugify } from '../../site/src/lib/pages.mjs'; // the site's own slug function: a region slug must be what the site would make of the name

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');
const stations = JSON.parse(fx('digitraffic-stations.json'));
const terms = fx('digitraffic-terms.html');
const qPkg = JSON.parse(fx('quebec-package.json'));
const qFeed = JSON.parse(fx('quebec-features.json'));
const NOW = '2026-11-23T12:00:00.000Z';
const quiet = () => {};
const perms = loadPerms();
const tmp = () => mkdtempSync(join(tmpdir(), 'world-'));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const fiOpts = (dir, o = {}) => ({ fetchText: async () => terms, fetchJson: async () => stations, outDir: dir, now: NOW, perms, log: quiet, ...o });
const qcOpts = (dir, o = {}) => ({ fetchJson: async (u) => (/package_show/.test(u) ? qPkg : qFeed), outDir: dir, now: NOW, perms, log: quiet, ...o });
// A registry that already holds other sources' rows (shapes are enough: the importers only look at sourceId).
const seed = (dir) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify([{ id: 'caltrans-d07-1', sourceId: 'caltrans', n: 1 }, { id: 'drivebc-1', sourceId: 'drivebc', n: 2 }]));

// ---- Finland ----
test('parseName: road code then place; anything else gives no road and no city (no invented place)', () => {
  assert.deepEqual(parseName('kt51_Inkoo'), { road: 'kt51', city: 'Inkoo' });
  assert.deepEqual(parseName('vt2_Karkkila_Korpi'), { road: 'vt2', city: 'Karkkila' });
  assert.deepEqual(parseName(' vt22_Muhos_Kosulankylä'), { road: 'vt22', city: 'Muhos' });
  assert.deepEqual(parseName('yt18710_Oulu_Kuivasjärvi'), { road: 'yt18710', city: 'Oulu' });
  assert.deepEqual(parseName('VT7_hamina'), { road: 'vt7', city: 'Hamina' });
  for (const n of ['Tie 170 Vuosaari Itäväylä', 'vt12 Hollola Hämeenkoski', 'Åland_Eckerö', 'vt_21_Ylitornio_Aavasaksa', 'VUO_SAT', 'kt51_', 'kt51_1234', '', null, undefined]) assert.deepEqual(parseName(n), { road: '', city: null }, String(n));
});

test('Finland normalize: drops are counted by reason, picture link is built from the first preset that is in the collection, ids are prefixed', () => {
  const drop = {};
  const cams = stations.features.map((f) => normalizeStation(f, NOW, drop)).filter(Boolean);
  assert.deepEqual(drop, { malformed: 1, noIdOrName: 1, badCoords: 1, notGathering: 1, outOfBounds: 1, noPreset: 1, testStation: 1 });
  const by = Object.fromEntries(cams.map((c) => [c.id, c]));
  assert.equal(by['digitraffic-C01503'].officialUrl, 'https://weathercam.digitraffic.fi/C0150301.jpg');
  assert.equal(by['digitraffic-C01504'].officialUrl, 'https://weathercam.digitraffic.fi/C0150401.jpg', 'the preset that is not in the collection is skipped');
  assert.equal(by['digitraffic-C01504'].city, 'Karkkila');
  assert.equal(by['digitraffic-C00004'].city, null);
  assert.equal(by['digitraffic-C00004'].road, '');
  for (const c of cams) { assert.deepEqual(validateCamera(c), [], c.id); assert.equal(c.regionSlug, 'finland'); assert.equal(c.direction, ''); assert.equal(c.feedType, 'still'); for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in c)); }
  assert.ok(cams.every((c) => c.lat >= FI_BOUNDS.latMin && c.lat <= FI_BOUNDS.latMax && c.lon >= FI_BOUNDS.lonMin && c.lon <= FI_BOUNDS.lonMax));
});

test('Finland run: writes its own rows, a source row and a report; the same position and road is one camera; other sources are untouched', async () => {
  const dir = tmp(); seed(dir);
  const r = await runFi(fiOpts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'digitraffic').length, 9);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'digitraffic').map((c) => c.id), ['caltrans-d07-1', 'drivebc-1']);
  assert.deepEqual(r.report.dropped.dupLocation, 1);
  assert.equal(read(dir, 'sources.json').find((s) => s.id === 'digitraffic').permissions.image_display, 'unverified');
  assert.equal(read(dir, 'import-report-digitraffic.json').total, 9);
  assert.equal(countsBy(all, 'country').finland, 9);
});

test('Finland: licence row closed -> nothing is fetched or written (failing fixture)', async () => {
  const dir = tmp(); let calls = 0;
  const closed = perms.map((s) => (s.id === 'digitraffic-weathercam' ? { ...s, mustNotShip: true } : s));
  const r = await runFi(fiOpts(dir, { perms: closed, fetchText: async () => { calls++; return terms; }, fetchJson: async () => { calls++; return stations; } }));
  assert.equal(r.written, false); assert.match(r.reason, /licence closed/); assert.equal(calls, 0); assert.ok(!existsSync(join(dir, 'cameras.json')));
});

test('Finland: terms page without the CC 4.0 BY or "even commercially" wording stops the run (failing fixture: a changed licence)', async () => {
  for (const text of [terms.replace('Creative Commons 4.0 By', 'All rights reserved'), terms.replace('even commercially', 'for personal use'), '<html>Access denied</html>']) {
    const dir = tmp(); let feed = 0;
    const r = await runFi(fiOpts(dir, { fetchText: async () => text, fetchJson: async () => { feed++; return stations; } }));
    assert.equal(r.written, false); assert.match(r.reason, /licence wording changed/); assert.equal(feed, 0, 'the feed is not even requested'); assert.ok(!existsSync(join(dir, 'cameras.json')));
  }
});

test('Finland: terms unreadable, HTTP 406, HTML instead of JSON, empty list, big drop: nothing written', async () => {
  const bad = [
    { fetchText: async () => { throw new Error('HTTP 500'); } },
    { fetchJson: async () => { throw new Error('HTTP 406'); } },
    { fetchJson: async () => { throw new Error('invalid JSON from source: <html>'); } },
    { fetchJson: async () => ({ features: [] }) },
    { fetchJson: async () => ({ features: stations.features.slice(-4) }) }, // 4 raw, 0 or 1 kept
    { fetchJson: async () => ({ nope: true }) },
  ];
  for (const o of bad) { const dir = tmp(); seed(dir); const before = readFileSync(join(dir, 'cameras.json'), 'utf8'); const r = await runFi(fiOpts(dir, o)); assert.equal(r.written, false, r.reason); assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before); }
});

test('Finland: a run that finds half as many cameras as the last good run never replaces it', async () => {
  const dir = tmp(); seed(dir);
  assert.equal((await runFi(fiOpts(dir))).written, true);
  const small = { ...stations, features: stations.features.filter((f) => ['C01503', 'C01504', 'C01505', 'C01506'].includes(f.id)) };
  const r = await runFi(fiOpts(dir, { fetchJson: async () => small }));
  assert.equal(r.written, false); assert.match(r.reason, /count fell/);
  assert.equal(read(dir).filter((c) => c.sourceId === 'digitraffic').length, 9);
});

test('Finland: a cut-off cameras.json stops the import and is left as it was', async () => {
  const dir = tmp(); writeFileSync(join(dir, 'cameras.json'), '[{"id":"caltrans-1","sourceId":"caltr');
  const r = await runFi(fiOpts(dir));
  assert.equal(r.written, false); assert.match(r.reason, /not a readable list/);
  assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), '[{"id":"caltrans-1","sourceId":"caltr');
});

// ---- Quebec ----
test('parseDescription: the road is kept only when it agrees with the feed route number; direction only from a lone direction word', () => {
  assert.deepEqual(parseDescription('Aut. 540 (westward) at boul. Wilfrid-Hamel', '00540'), { road: 'Autoroute 540', direction: 'Westward' });
  assert.deepEqual(parseDescription('Route 289 at chemin du Mont-Bleu (Pohenegamook)', '00289'), { road: 'Route 289', direction: '' });
  assert.deepEqual(parseDescription('Route 138 at Côte du Nadeau in Baie-Trinité (km 849)', '00138'), { road: 'Route 138', direction: '' });
  assert.deepEqual(parseDescription('Aut. 15 (Henri-IV, southward) at aut. 40', '00999'), { road: '', direction: '' }, 'wrong route number and a mixed parenthesis');
  assert.deepEqual(parseDescription('Aut. 73 (southward) at aut. 40 (northward)', '00073'), { road: 'Autoroute 73', direction: '' }, 'two direction words: none');
  assert.deepEqual(parseDescription('Route 155 at La Tuque (km 151) (southward)', '00155').direction, 'Southward');
  assert.deepEqual(parseDescription('', ''), { road: '', direction: '' });
  assert.deepEqual(parseDescription(null, undefined), { road: '', direction: '' });
});

test('Quebec normalize: region from the feed field only, no invented city, link must be on quebec511.info, drops counted', () => {
  const drop = {};
  const cams = qFeed.features.map((f) => normalizeQuebec(f, NOW, drop)).filter(Boolean);
  assert.deepEqual(drop, { unknownRegion: 1, noUrl: 1, outOfBounds: 1, noIdOrName: 1 });
  assert.deepEqual(cams.map((c) => c.id), ['quebec-mtmd-3998', 'quebec-mtmd-3887', 'quebec-mtmd-3941', 'quebec-mtmd-3500', 'quebec-mtmd-3501', 'quebec-mtmd-3502']);
  for (const c of cams) { assert.deepEqual(validateCamera(c), [], c.id); assert.equal(c.city, null); assert.equal(c.feedType, 'video'); assert.ok(c.officialUrl.startsWith('https://www.quebec511.info/')); assert.ok(countryOf(c.regionSlug), `${c.regionSlug} has a country`); for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in c)); assert.ok(c.lat >= QC_BOUNDS.latMin && c.lon >= QC_BOUNDS.lonMin); }
  assert.equal(cams[0].regionSlug, 'quebec-capitale-nationale');
  assert.equal(cams[0].regionName, 'Québec (Capitale-Nationale)');
  assert.equal(cams[1].regionSlug, 'bas-saint-laurent-gaspesie-iles-de-la-madeleine');
});

test('Quebec regions: 14 of them, slugs are the plain-letter form of the name, every one has Canada as its country, none collides with another region', () => {
  assert.equal(QC_REGIONS.length, 14);
  for (const r of QC_REGIONS) { assert.equal(r.slug, slugify(r.name)); assert.equal(REGION_COUNTRY[r.slug].countrySlug, 'canada'); }
  assert.equal(new Set([...Object.keys(REGION_COUNTRY)]).size, Object.keys(REGION_COUNTRY).length);
  assert.equal(REGION_COUNTRY.finland.countrySlug, 'finland');
  assert.ok(!QC_REGIONS.some((r) => ['california', 'british-columbia', 'finland'].includes(r.slug)));
});

test('Quebec run: writes its own rows and leaves every other source untouched; duplicates of one position are dropped and counted', async () => {
  const dir = tmp(); seed(dir);
  const r = await runQc(qcOpts(dir));
  assert.equal(r.written, true, r.reason);
  const all = read(dir);
  assert.equal(all.filter((c) => c.sourceId === 'quebec-mtmd').length, 5);
  assert.deepEqual(all.filter((c) => c.sourceId !== 'quebec-mtmd').map((c) => c.id), ['caltrans-d07-1', 'drivebc-1']);
  assert.equal(r.report.dropped.dupLocation, 1);
  assert.equal(r.report.byRegion.montreal, 2);
  assert.equal(read(dir, 'sources.json').find((s) => s.id === 'quebec-mtmd').status, 'active');
});

test('Quebec: licence row closed, licence id changed, feed cut off, empty, unreadable: nothing written (failing fixtures)', async () => {
  const closed = perms.map((s) => (s.id === 'quebec-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const cases = [
    [{ perms: closed }, /licence closed/],
    [{ fetchJson: async (u) => (/package_show/.test(u) ? { ...qPkg, result: { ...qPkg.result, license_id: 'cc-by-nc' } } : qFeed) }, /licence changed/],
    [{ fetchJson: async (u) => (/package_show/.test(u) ? { success: false } : qFeed) }, /no result/],
    [{ fetchJson: async (u) => { if (/package_show/.test(u)) return qPkg; throw new Error('HTTP 503'); } }, /feed unreadable/],
    [{ fetchJson: async (u) => (/package_show/.test(u) ? qPkg : { ...qFeed, numberMatched: 683 }) }, /feed cut off/],
    [{ fetchJson: async (u) => (/package_show/.test(u) ? qPkg : { type: 'FeatureCollection', features: [] }) }, /zero cameras/],
    [{ fetchJson: async (u) => (/package_show/.test(u) ? qPkg : '<html>blocked</html>') }, /no features array/],
  ];
  for (const [o, re] of cases) { const dir = tmp(); seed(dir); const before = readFileSync(join(dir, 'cameras.json'), 'utf8'); const r = await runQc(qcOpts(dir, o)); assert.equal(r.written, false); assert.match(r.reason, re); assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before); }
});

test('Quebec: a feed that names a new region drops those cameras (counted) instead of inventing a region; too many drops stop the run', async () => {
  const one = { ...qFeed, numberMatched: 10, features: qFeed.features.map((f) => (f.id === 3998 ? { ...f, properties: { ...f.properties, NomRegionDiffusion: 'Nouvelle région' } } : f)) };
  const dir = tmp(); const r = await runQc(qcOpts(dir, { fetchJson: async (u) => (/package_show/.test(u) ? qPkg : one) }));
  assert.equal(r.report.dropped.unknownRegion, 2);
  assert.equal(r.written, false, '4 of 10 kept is under half');
  assert.match(r.reason, /only 4 of 10/);
});

// ---- all three importers share one registry ----
test('multi-source: Finland, Quebec and BC importers each keep the others\' rows; running them in any order gives the same registry', async () => {
  const fiRows = (d) => read(d).filter((c) => c.sourceId === 'digitraffic').map((c) => c.id);
  const a = tmp(), b = tmp(); seed(a); seed(b);
  await runFi(fiOpts(a)); await runQc(qcOpts(a));
  await runQc(qcOpts(b)); await runFi(fiOpts(b));
  assert.deepEqual(read(a), read(b));
  assert.equal(fiRows(a).length, 9);
  assert.equal(read(a).filter((c) => c.sourceId === 'quebec-mtmd').length, 5);
  assert.deepEqual(read(a).filter((c) => ['caltrans', 'drivebc'].includes(c.sourceId)).map((c) => c.id), ['caltrans-d07-1', 'drivebc-1']);
  assert.equal(typeof runBc, 'function');
});

// ---- licence rows ----
test('licence rows: digitraffic-weathercam and quebec-cameras pass the gate, quote the licence text and give the URL; images stay unverified; review date is today or earlier', () => {
  for (const [id, quote, url] of [['digitraffic-weathercam', 'even commercially', 'https://www.digitraffic.fi/en/terms-of-service/'], ['quebec-cameras', 'même à des fins commerciales', 'https://www.donneesquebec.ca/licence/']]) {
    const row = perms.find((s) => s.id === id);
    assert.ok(row, id);
    assert.equal(isEnabled(row, new Date('2026-11-23')), true, id);
    assert.ok(row.licence.includes(quote), `${id} quotes its licence sentence`);
    assert.ok(row.licence.includes(url) && row.provenance.includes(url), `${id} gives the URL`);
    assert.match(row.imageStatus, /^unverified/);
    assert.equal(row.needsHumanReview, true);
    assert.equal(row.commercialStatus, 'allowed_per_doc');
    assert.equal(isEnabled({ ...row, mustNotShip: true }, new Date('2026-11-23')), false);
    assert.equal(isEnabled({ ...row, reviewedAt: '2026-01-01' }, new Date('2026-11-23')), false, 'a review older than 180 days closes it');
  }
});

// ---- the real registry ----
const REAL = join(here, '..', '..', 'data', 'camera-registry');
const real = existsSync(join(REAL, 'cameras.json')) ? JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8')) : [];
test('real cameras.json (when it holds Finland or Quebec rows): valid, unique ids, link-out hosts only, no image field, every region has a country', () => {
  for (const [src, host, min] of [['digitraffic', 'https://weathercam.digitraffic.fi/', 100], ['quebec-mtmd', 'https://www.quebec511.info/', 100]]) {
    const rows = real.filter((c) => c.sourceId === src);
    if (!rows.length) continue;
    assert.ok(rows.length >= min, `${src} has ${rows.length}`);
    const ids = new Set();
    for (const c of rows) { assert.deepEqual(validateCamera(c), [], c.id); assert.ok(c.officialUrl.startsWith(host), c.id); assert.ok(!ids.has(c.id)); ids.add(c.id); assert.ok(countryOf(c.regionSlug), c.regionSlug); }
  }
  assert.ok(real.filter((c) => c.sourceId === 'quebec-mtmd').every((c) => c.city === null), 'no invented Quebec cities');
});
