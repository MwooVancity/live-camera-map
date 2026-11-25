// Offline tests for the Minnesota WZDx feed (mn-wzdx). Run: node --test tests/conditions/mn-wzdx.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, parseWzdx, loadPerms, MN_LICENCE } from '../../ops/importers/mn-wzdx.mjs';

const NOW = new Date('2026-11-25T20:00:00.000Z');
const perms = loadPerms();
const feat = (id, o = {}) => ({
  id, type: 'Feature',
  properties: { core_details: { event_type: 'work-zone', road_names: ['I-94'], direction: 'eastbound', description: 'Construction <b>Work</b>', update_date: '2026-11-25T10:00:00Z' }, start_date: '2026-11-01T00:00:00Z', end_date: '2027-04-15T21:00:00Z', vehicle_impact: 'some-lanes-closed', ...o.props },
  geometry: 'geometry' in o ? o.geometry : { type: 'LineString', coordinates: [[-94.06, 45.41], [-94.0, 45.42]] },
});
const doc = (features, license = MN_LICENCE) => ({ road_event_feed_info: { license, update_date: '2026-11-25T19:59:00Z' }, type: 'FeatureCollection', features });
const fx = doc([
  feat('CARSx-1'),
  feat('CARSx-2', { geometry: { type: 'MultiPoint', coordinates: [[-93.2, 44.9]] } }),
  feat('CARSx-3', { geometry: { type: 'LineString', coordinates: [] } }), // no coordinates
  feat('CARSx-4', { geometry: null }),
  feat('CARSx-5', { props: { end_date: '2026-11-01T00:00:00Z' } }), // expired
  feat('CARSx-1'), // duplicate
  feat('CARSx-6', { geometry: { type: 'Point', coordinates: [10, 10] } }), // outside Minnesota
  { id: 5 }, // malformed
  feat('CARSx-7'), feat('CARSx-8'), feat('CARSx-9'),
]);
const opts = (dir, j = fx, o = {}) => ({ fetchJson: async () => j, outDir: dir, now: NOW, perms, log: () => {}, ...o });
const read = (dir) => JSON.parse(readFileSync(join(dir, 'mn-wzdx.json'), 'utf8'));

test('parse: good record keeps road, direction, times, impact, first and last point; text is cleaned', () => {
  const it = parseWzdx(fx.features[0], NOW);
  assert.equal(it.id, 'mn-wz-CARSx-1'); assert.equal(it.road, 'I-94'); assert.equal(it.direction, 'eastbound');
  assert.deepEqual([it.lat, it.lon, it.endLat, it.endLon], [45.41, -94.06, 45.42, -94.0]);
  assert.equal(it.vehicleImpact, 'some-lanes-closed'); assert.equal(it.active, true); assert.ok(!/[<>]/.test(it.text));
  assert.equal(it.end, '2027-04-15T21:00:00.000Z');
});

test('run: drops missing coordinates, expired, duplicate, out of state, malformed; writes the rest with its source id', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mnwz-'));
  const r = await run(opts(dir));
  assert.equal(r.written, true, r.reason);
  const d = read(dir);
  assert.deepEqual(d.items.map((i) => i.id), ['mn-wz-CARSx-1', 'mn-wz-CARSx-2', 'mn-wz-CARSx-7', 'mn-wz-CARSx-8', 'mn-wz-CARSx-9']);
  assert.deepEqual(d.dropped, { badGeometry: 2, expired: 1, dupId: 1, outOfBounds: 1, malformed: 1 });
  assert.equal(d.sourceId, 'mn-wzdx'); assert.equal(d.generatedAt, NOW.toISOString());
});

test('bad JSON, wrong shape, changed licence field: nothing written', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mnwz-'));
  const bad = async () => { throw new Error('invalid JSON from source: x'); };
  assert.equal((await run(opts(dir, fx, { fetchJson: bad }))).written, false);
  assert.equal((await run(opts(dir, { features: 'no' }))).written, false);
  const r = await run(opts(dir, doc(fx.features, 'https://example.com/proprietary')));
  assert.equal(r.written, false); assert.match(r.reason, /licence/);
  assert.equal((await run(opts(dir, { features: fx.features }))).written, false); // licence field absent
});

test('empty or collapsed feed keeps the old good file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mnwz-'));
  await run(opts(dir));
  const before = readFileSync(join(dir, 'mn-wzdx.json'), 'utf8');
  assert.equal((await run(opts(dir, doc([])))).written, false);
  assert.equal((await run(opts(dir, doc([{ id: 5 }, { id: 6 }])))).written, false);
  assert.equal(readFileSync(join(dir, 'mn-wzdx.json'), 'utf8'), before);
  const many = Array.from({ length: 30 }, (_, i) => feat(`M-${i}`));
  await run(opts(dir, doc(many)));
  const r = await run(opts(dir, doc(many.slice(0, 5))));
  assert.equal(r.written, false); assert.match(r.reason, /count fell/);
});

test('a closed licence row stops the run before any fetch', async () => {
  let called = false;
  const r = await run(opts(mkdtempSync(join(tmpdir(), 'mnwz-')), fx, { perms: [], fetchJson: async () => { called = true; return fx; } }));
  assert.equal(r.written, false); assert.equal(called, false);
});
