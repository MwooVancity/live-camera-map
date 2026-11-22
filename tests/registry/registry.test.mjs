// Offline registry tests. Run: node --test tests/registry/registry.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../../ops/importers/caltrans.mjs';
import { normalizeCaltrans, dedupe, validateCamera, countsBy, CA_BOUNDS, FORBIDDEN_FIELDS } from '../../ops/importers/lib/registry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, 'fixtures', 'caltrans-small.json'), 'utf8'));
const REAL = join(here, '..', '..', 'data', 'camera-registry');
const quiet = () => {};
const okFetcher = async (nn) => (nn === '07' ? fixture : { data: [] });

test('normalize: drops not-in-service, out-of-bounds, bad coords; keeps null city', () => {
  const drop = {};
  const cams = fixture.data.map((r) => normalizeCaltrans(r, '07', 'T', drop)).filter(Boolean);
  assert.deepEqual(cams.map((c) => c.id), ['caltrans-d07-1', 'caltrans-d07-2', 'caltrans-d07-5']);
  assert.deepEqual(drop, { notInService: 1, outOfBounds: 1, badCoords: 1 });
  assert.equal(cams[2].city, null);
  assert.equal(cams[2].feedType, 'video');
  assert.equal(cams[0].city, 'Los Angeles'); // county 'Alameda' ignored
  cams.forEach((c) => assert.deepEqual(validateCamera(c), []));
});

test('dedupe: same id and same rounded location+road+direction', () => {
  const a = normalizeCaltrans(fixture.data[0], '07', 'T');
  const same = { ...a, id: 'caltrans-d07-99', lat: a.lat + 0.00001 };
  const sameId = { ...a, lat: 35 };
  const drop = {};
  assert.equal(dedupe([a, same, sameId], drop).length, 1);
  assert.deepEqual(drop, { dupLocation: 1, dupId: 1 });
});

test('validateCamera rejects image fields, bad coords, unknown fields (failing fixtures)', () => {
  const good = normalizeCaltrans(fixture.data[0], '07', 'T');
  for (const f of FORBIDDEN_FIELDS) assert.ok(validateCamera({ ...good, [f]: 'x' }).length, f);
  assert.ok(validateCamera({ ...good, lat: 'a' }).length);
  assert.ok(validateCamera({ ...good, lon: 200 }).length);
  assert.ok(validateCamera({ ...good, extra: 1 }).length);
  assert.ok(validateCamera({ ...good, id: 'x-1' }).length);
});

test('countsBy is the single count source and rejects unknown keys', () => {
  const cams = [{ city: 'A', regionSlug: 'r' }, { city: 'A', regionSlug: 'r' }, { city: null, regionSlug: 'r' }];
  assert.deepEqual(countsBy(cams, 'city'), { A: 2 });
  assert.deepEqual(countsBy(cams, 'region'), { r: 3 });
  assert.throws(() => countsBy(cams, 'county'));
});

test('incomplete run (one district fails) does not write, even with no old file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'reg-'));
  const f = async (nn) => { if (nn === '03') throw new Error('HTTP 500'); return okFetcher(nn); };
  const r = await run({ fetcher: f, outDir: dir, log: quiet });
  assert.equal(r.written, false);
  assert.match(r.reason, /incomplete/);
  assert.equal(existsSync(join(dir, 'cameras.json')), false);
});

test('empty district counts as failed; all-fail writes nothing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'reg-'));
  const r = await run({ fetcher: async () => { throw new Error('down'); }, outDir: dir, log: quiet });
  assert.equal(r.written, false);
  assert.equal(r.report.failedDistricts.length, 12);
});

test('failing run never overwrites a good file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'reg-'));
  const full = async () => fixture;
  const first = await run({ fetcher: full, outDir: dir, log: quiet });
  assert.equal(first.written, true);
  const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
  const half = async (nn) => { if (Number(nn) > 6) throw new Error('500'); return fixture; };
  for (const allowPartial of [false, true]) {
    const r = await run({ fetcher: half, outDir: dir, allowPartial, log: quiet });
    assert.equal(r.written, false);
  }
  assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before);
});

test('allowPartial may create the first file only', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'reg-'));
  const f = async (nn) => { if (nn === '12') throw new Error('500'); return okFetcher(nn); };
  const r = await run({ fetcher: f, outDir: dir, allowPartial: true, log: quiet });
  assert.equal(r.written, true);
});

test('large drop in count vs old file is refused', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'reg-'));
  writeFileSync(join(dir, 'cameras.json'), JSON.stringify(new Array(100).fill({})));
  const r = await run({ fetcher: async () => fixture, outDir: dir, log: quiet });
  assert.equal(r.written, false);
  assert.match(r.reason, /count fell/);
});

// ---- real output file ----
const cams = JSON.parse(readFileSync(join(REAL, 'cameras.json'), 'utf8'));
const sources = JSON.parse(readFileSync(join(REAL, 'sources.json'), 'utf8'));

test('real cameras.json: schema valid, in California bounds, unique ids', () => {
  assert.ok(cams.length > 100);
  const ids = new Set();
  for (const c of cams) {
    assert.deepEqual(validateCamera(c), [], c.id);
    assert.ok(c.lat >= CA_BOUNDS.latMin && c.lat <= CA_BOUNDS.latMax && c.lon >= CA_BOUNDS.lonMin && c.lon <= CA_BOUNDS.lonMax, c.id);
    assert.ok(!ids.has(c.id), `duplicate ${c.id}`);
    ids.add(c.id);
  }
});

test('real data: no image fields while image_display is not allowed', () => {
  const byId = Object.fromEntries(sources.map((s) => [s.id, s]));
  for (const c of cams) {
    assert.ok(byId[c.sourceId], `unknown source ${c.sourceId}`);
    if (byId[c.sourceId].permissions.image_display !== 'allowed') {
      for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in c), `${c.id} has ${f}`);
    }
  }
});

test('real sources.json: every source has all four permissions, none set to allowed', () => {
  assert.deepEqual(sources.map((s) => s.id).sort(), ['alberta-511', 'caltrans', 'ontario-511']);
  for (const s of sources) {
    for (const k of ['metadata_commercial', 'image_display', 'image_caching', 'image_redistribution']) {
      assert.equal(s.permissions[k], 'unverified', `${s.id}.${k}`);
    }
  }
  assert.equal(sources.find((s) => s.id === 'ontario-511').status, 'pending-key');
});

test('real data: region count equals camera count', () => {
  assert.equal(countsBy(cams, 'region').california, cams.length);
});

test('cleanCity: lower-case place names are capitalised so "orange" and "Orange" are one city', async () => {
  const { cleanCity } = await import('../../ops/importers/lib/registry.mjs');
  assert.equal(cleanCity('orange'), 'Orange');
  assert.equal(cleanCity(' El cojon '), 'El Cojon');
  assert.equal(cleanCity('Cardiff By The Sea'), 'Cardiff By The Sea');
  assert.equal(cleanCity(undefined), '');
});

test('real data: no two city names differ only by case or spacing', () => {
  const seen = new Map();
  for (const c of cams) {
    if (!c.city) continue;
    const k = c.city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    assert.ok(!seen.has(k) || seen.get(k) === c.city, `"${c.city}" and "${seen.get(k)}" are the same city`);
    seen.set(k, c.city);
  }
});
