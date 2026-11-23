// Offline tests for the British Columbia camera importer (fixtures only). Run: node --test tests/registry/drivebc.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras, loadPerms } from '../../ops/importers/drivebc.mjs';
import { run as runCaltrans } from '../../ops/importers/caltrans.mjs';
import { parseCsv, normalizeDriveBc, bcPlace, BC_BOUNDS } from '../../ops/importers/lib/drivebc.mjs';
import { validateCamera, dedupe, FORBIDDEN_FIELDS, mergeSource, upsertSources } from '../../ops/importers/lib/registry.mjs';
import { isEnabled } from '../licensing/gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const csv = readFileSync(join(here, 'fixtures', 'drivebc-webcams.csv'), 'utf8');
const pkg = JSON.parse(readFileSync(join(here, 'fixtures', 'drivebc-package.json'), 'utf8'));
const caFixture = JSON.parse(readFileSync(join(here, 'fixtures', 'caltrans-small.json'), 'utf8'));
const NOW = '2026-11-22T12:00:00.000Z';
const quiet = () => {};
const perms = loadPerms();
const okJson = async () => pkg;
const okText = async () => csv;
const opts = (dir, o = {}) => ({ fetchJson: okJson, fetchText: okText, outDir: dir, now: NOW, perms, log: quiet, ...o });
const caOk = async () => caFixture; // every district answers with the same small file

test('parseCsv: quotes, commas inside fields, BOM, wrong-width rows are counted not guessed', () => {
  const r = parseCsv('﻿"a","b"\r\n"1","x, ""y"""\r\n"2"\r\n');
  assert.deepEqual(r.head, ['a', 'b']);
  assert.deepEqual(r.rows, [{ a: '1', b: 'x, "y"' }]);
  assert.equal(r.badRows, 1);
  assert.equal(parseCsv(csv).badRows, 0);
  assert.equal(parseCsv(csv).rows.length, 11);
});

test('bcPlace: a place is the camera name without its direction; roads, junctions and numbers are not places', () => {
  const t = [['Elkford - S', 'Highway 43 at Fording River Road in Elkford, looking south.', 'Elkford'],
    ["Hudson's Hope - NE", "Highway 29 about 1.5 km north of Hudson's Hope at Powell Road, looking northeast.", "Hudson's Hope"],
    ['Golden eastbound', 'Highway 1 near Golden.', 'Golden'],
    ['Fort St. John - W', 'Highway 97 at 100 Avenue in Fort St. John, looking west.', 'Fort St. John'],
    ['Mission - S', 'Highway 7 at Highway 11 approaching Mission, looking south.', 'Mission']];
  for (const [n, c, p] of t) assert.equal(bcPlace(n, c), p, n);
  // names that read as roads or junctions, and names the caption only uses inside a road name or not at all
  for (const [n, c] of [['Hwy 10 at 192 Street - W', 'Highway 10 at 192 Street in Surrey'], ['Mountain Highway - E', 'in Mountain Highway'], ['Admirals-McKenzie - N', 'in Admirals-McKenzie'],
    ['Departure Bay - Zorkin Road', 'in Departure Bay'], ['Needles Ferry Rest Area', 'near Needles Ferry Rest Area'], ['Function Junction - N', 'in Function Junction'],
    ['Lake Placid - S', 'Highway 99 at Lake Placid Road in Whistler, looking south.'], ['Ladner - W', 'Highway 17A at Highway 10 (Ladner Trunk Road), looking west.'],
    ['Albion - N', 'Highway 7 at 240 Street, looking north.'], ['Elkford - S', ''], ['Elkford - S', undefined], ['', 'in '], [null, 'in x']]) assert.equal(bcPlace(n, c), null, `${n} / ${c}`);
});

test('normalize: BC bounds, link-out url on drivebc.ca, no coordinates dropped; ids prefixed; honest fields', () => {
  const drop = {};
  const cams = parseCsv(csv).rows.map((r) => normalizeDriveBc(r, NOW, drop)).filter(Boolean);
  assert.deepEqual(drop, { outOfBounds: 1, badCoords: 1, noUrl: 1 });
  assert.deepEqual(cams.map((c) => c.id), ['drivebc-520', 'drivebc-521', 'drivebc-522', 'drivebc-987', 'drivebc-610', 'drivebc-611', 'drivebc-612', 'drivebc-703']);
  const by = Object.fromEntries(cams.map((c) => [c.id, c]));
  assert.equal(by['drivebc-520'].road, 'Highway 99');
  assert.equal(by['drivebc-520'].direction, 'Facing South'); // the way the camera looks, not traffic direction
  assert.equal(by['drivebc-522'].direction, 'Facing Northeast');
  assert.equal(by['drivebc-520'].city, 'Britannia');
  assert.equal(by['drivebc-987'].city, "Hudson's Hope");
  assert.equal(by['drivebc-610'].city, 'Golden');
  assert.equal(by['drivebc-611'].city, null); // a junction, not a place
  assert.equal(by['drivebc-612'].road, 'Cecil Lake Rd'); // a non-number highway field is kept as given
  assert.equal(by['drivebc-612'].city, null);
  for (const c of cams) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.equal(c.sourceId, 'drivebc'); assert.equal(c.regionSlug, 'british-columbia'); assert.equal(c.feedType, 'still');
    assert.ok(c.lat >= BC_BOUNDS.latMin && c.lat <= BC_BOUNDS.latMax && c.lon >= BC_BOUNDS.lonMin && c.lon <= BC_BOUNDS.lonMax);
    for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in c), f);
    assert.match(c.officialUrl, /^https:\/\/www\.drivebc\.ca\//);
  }
});

test('dedupe keeps the 3 cameras at one site (different directions) and drops a repeated id', () => {
  const cams = parseCsv(csv).rows.map((r) => normalizeDriveBc(r, NOW)).filter(Boolean);
  assert.equal(dedupe(cams).length, cams.length);
  assert.equal(dedupe([...cams, cams[0]]).length, cams.length);
});

test('run: writes cameras.json (BC rows), a BC source row and a BC report; city counts come from the same rows', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bc-'));
  const r = await runCameras(opts(dir));
  assert.equal(r.written, true, r.reason);
  const cams = JSON.parse(readFileSync(join(dir, 'cameras.json'), 'utf8'));
  assert.equal(cams.length, 8);
  assert.equal(r.report.total, 8);
  assert.equal(r.report.byCity.Britannia, 3);
  const src = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8'));
  assert.deepEqual(src.map((s) => s.id), ['drivebc']);
  assert.equal(src[0].permissions.image_display, 'unverified');
  assert.equal(JSON.parse(readFileSync(join(dir, 'import-report-drivebc.json'), 'utf8')).total, 8);
});

test('licence closed: nothing is fetched or written (failing fixture)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bc-'));
  const closed = perms.map((s) => (s.id === 'drivebc-cameras' ? { ...s, commercialStatus: 'unknown' } : s));
  const boom = async () => { throw new Error('must not be fetched'); };
  const r = await runCameras(opts(dir, { perms: closed, fetchJson: boom, fetchText: boom }));
  assert.equal(r.written, false); assert.equal(r.reason, 'licence closed');
});

test('licence title changed on the dataset record: refuses to run (failing fixture)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bc-'));
  const changed = { ...pkg, result: { ...pkg.result, license_title: 'Some Other Licence' } };
  const r = await runCameras(opts(dir, { fetchJson: async () => changed }));
  assert.equal(r.written, false); assert.match(r.reason, /licence title changed/);
});

test('CSV with a renamed column: parser fails closed (failing fixture)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bc-'));
  const r = await runCameras(opts(dir, { fetchText: async () => csv.replace('"latitude"', '"lat"') }));
  assert.equal(r.written, false); assert.match(r.reason, /CSV shape changed.*latitude/);
});

test('HTML error page instead of CSV, empty CSV, unreadable dataset: nothing written', async () => {
  for (const text of ['<html><body>Service unavailable</body></html>', '']) {
    const dir = mkdtempSync(join(tmpdir(), 'bc-'));
    const r = await runCameras(opts(dir, { fetchText: async () => text }));
    assert.equal(r.written, false, text.slice(0, 10));
  }
  const dir = mkdtempSync(join(tmpdir(), 'bc-'));
  const r = await runCameras(opts(dir, { fetchJson: async () => { throw new Error('HTTP 503'); } }));
  assert.equal(r.written, false); assert.match(r.reason, /unreadable/);
});

test('a run with a big drop never replaces a good BC file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bc-'));
  assert.equal((await runCameras(opts(dir))).written, true);
  const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
  const head = csv.split('\n')[0];
  const small = head + '\n' + csv.split('\n')[1] + '\n';
  const r = await runCameras(opts(dir, { fetchText: async () => small }));
  assert.equal(r.written, false); assert.match(r.reason, /count fell/);
  assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before);
});

test('multi-source: the BC importer never deletes Caltrans cameras, and Caltrans never deletes BC cameras', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bc-'));
  const ca = await runCaltrans({ fetcher: caOk, outDir: dir, now: NOW, log: quiet });
  assert.equal(ca.written, true);
  const caRows = JSON.parse(readFileSync(join(dir, 'cameras.json'), 'utf8'));
  assert.ok(caRows.length > 0 && caRows.every((c) => c.sourceId === 'caltrans'));
  assert.equal((await runCameras(opts(dir))).written, true);
  let all = JSON.parse(readFileSync(join(dir, 'cameras.json'), 'utf8'));
  assert.deepEqual(all.filter((c) => c.sourceId === 'caltrans'), caRows, 'Caltrans rows byte-for-byte the same after a BC run');
  assert.equal(all.filter((c) => c.sourceId === 'drivebc').length, 8);
  const bcRows = all.filter((c) => c.sourceId === 'drivebc');
  assert.equal((await runCaltrans({ fetcher: caOk, outDir: dir, now: NOW, log: quiet })).written, true);
  all = JSON.parse(readFileSync(join(dir, 'cameras.json'), 'utf8'));
  assert.deepEqual(all.filter((c) => c.sourceId === 'drivebc'), bcRows, 'BC rows the same after a Caltrans run');
  assert.equal(new Set(all.map((c) => c.id)).size, all.length, 'ids unique across sources');
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8')).map((s) => s.id).sort(), ['alberta-511', 'caltrans', 'drivebc', 'ontario-511']);
});

test('the Caltrans "count fell" guard counts only Caltrans rows (BC rows cannot mask a Caltrans collapse)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bc-'));
  const many = Array.from({ length: 100 }, (_, i) => ({ sourceId: 'caltrans', id: `caltrans-d01-${i}` }));
  const bc = Array.from({ length: 500 }, (_, i) => ({ sourceId: 'drivebc', id: `drivebc-${i}` }));
  writeFileSync(join(dir, 'cameras.json'), JSON.stringify([...many, ...bc]));
  const r = await runCaltrans({ fetcher: async () => caFixture, outDir: dir, now: NOW, log: quiet });
  assert.equal(r.written, false); assert.match(r.reason, /count fell from 100/);
});

test('mergeSource / upsertSources keep every other source and are stable', () => {
  const all = [{ sourceId: 'drivebc', id: 'd1' }, { sourceId: 'caltrans', id: 'c1' }, { sourceId: 'caltrans', id: 'c2' }];
  assert.deepEqual(mergeSource(all, 'caltrans', [{ sourceId: 'caltrans', id: 'c9' }]).map((c) => c.id), ['c9', 'd1']);
  assert.deepEqual(mergeSource(null, 'drivebc', [{ sourceId: 'drivebc', id: 'x' }]).map((c) => c.id), ['x']);
  assert.deepEqual(upsertSources([{ id: 'a', v: 1 }, { id: 'b', v: 1 }], [{ id: 'a', v: 2 }]), [{ id: 'b', v: 1 }, { id: 'a', v: 2 }]);
});

test('licence rows: drivebc-cameras and drivebc-events pass the gate, quote the licence and give the URL; images stay unverified', () => {
  for (const id of ['drivebc-cameras', 'drivebc-events']) {
    const row = perms.find((s) => s.id === id);
    assert.ok(row, id);
    assert.equal(isEnabled(row, new Date(NOW)), true, id);
    assert.match(row.licence, /"[^"]{15,}"/);
    assert.match(row.licence, /Open Government Licence/);
    assert.match(row.provenance + row.licence, /https:\/\//);
    assert.equal(row.needsHumanReview, true);
  }
  assert.match(perms.find((s) => s.id === 'drivebc-cameras').imageStatus, /^unverified/);
});

test('real cameras.json (when it holds BC rows): every BC row valid, inside BC, ids unique, no image field', () => {
  const real = JSON.parse(readFileSync(join(here, '..', '..', 'data', 'camera-registry', 'cameras.json'), 'utf8'));
  const bc = real.filter((c) => c.sourceId === 'drivebc');
  assert.ok(bc.length > 500, `only ${bc.length} BC cameras in the real registry`);
  assert.equal(new Set(real.map((c) => c.id)).size, real.length);
  for (const c of bc) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.equal(c.regionSlug, 'british-columbia');
    assert.ok(c.lat >= BC_BOUNDS.latMin && c.lat <= BC_BOUNDS.latMax && c.lon >= BC_BOUNDS.lonMin && c.lon <= BC_BOUNDS.lonMax, c.id);
    assert.match(c.officialUrl, /^https:\/\/www\.drivebc\.ca\//);
  }
});

test('a cut-off cameras.json stops the BC import and is left as it was (failing fixture: used to wipe other sources)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bc-'));
  writeFileSync(join(dir, 'cameras.json'), '[{"id":"caltrans-d01-1","sourceId":"cal');
  const r = await runCameras(opts(dir));
  assert.equal(r.written, false); assert.match(r.reason, /not a readable list/);
  assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), '[{"id":"caltrans-d01-1","sourceId":"cal');
});
