// Big-picture round 2 items 1, 3, 4, 5 (docs/decisions/2026-11-28-big-picture-round2.md).
// Unit tests on the pure functions, then built-page checks (run after npm run build). Run from site/: node --test tests/round2.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cameras, isRiver, splitCount } from '../src/lib/data.mjs';
import { statusWords, alternatives } from '../src/lib/health.mjs';
import { roadCoverage } from '../src/lib/roads.mjs';
import { readPages, DIST } from './helpers.mjs';

// ---- 1. river cameras counted apart ----
test('river: MLIT and Taiwan WRA cameras are river cameras, nothing else is', () => {
  const ids = new Set(cameras.filter(isRiver).map((c) => c.sourceId));
  assert.deepEqual([...ids].sort(), ['mlit-river', 'taiwan-wra-cameras']);
  const s = splitCount(cameras);
  assert.equal(s.traffic + s.river, cameras.length);
  assert.ok(s.river > 1000);
});

// ---- 3. status words say what the checker cannot see ----
test('status words: every status named, plus wrong view and frozen scene', () => {
  const t = statusWords();
  for (const w of ['Reachable', 'Stale', 'Unavailable', 'Unknown', 'placeholder', 'wrong view', 'frozen']) assert.match(t, new RegExp(w));
});

// ---- 4. nearest working cameras on the same road and direction ----
const cam = (id, lat, road = 'I-5', direction = 'North') => ({ id, lat, lon: -118, road, direction });
test('alternatives: up to 3 nearest reachable on the same road and direction, nearest first', () => {
  const down = cam('d', 34.0);
  const pool = [down, cam('a', 34.3), cam('b', 34.1), cam('c', 34.2), cam('e', 34.4), cam('x', 34.01, 'I-10'), cam('s', 34.02, 'I-5', 'South'), cam('u', 34.05)];
  const st = { u: 'unavailable' };
  const got = alternatives(down, pool, (id) => st[id] || 'reachable');
  assert.deepEqual(got.map((x) => x.camera.id), ['b', 'c', 'a']);
  assert.ok(got[0].km > 10 && got[0].km < 12);
});
test('alternatives: no road = none; no direction = any direction on the road', () => {
  assert.deepEqual(alternatives(cam('d', 34, ''), [cam('a', 34.1, '')], () => 'reachable'), []);
  const got = alternatives(cam('d', 34, 'I-5', ''), [cam('s', 34.1, 'I-5', 'South')], () => 'reachable');
  assert.deepEqual(got.map((x) => x.camera.id), ['s']);
});

// ---- 5. road coverage ----
test('road coverage: count, length covered, longest stretch', () => {
  const r = roadCoverage([cam('a', 34.0), cam('c', 34.3), cam('b', 34.1), cam('s', 34.1, 'I-5', 'South')]);
  assert.equal(r.n, 4);
  assert.ok(Math.abs(r.lengthKm - 33.36) < 0.1, String(r.lengthKm));
  assert.ok(Math.abs(r.longest.km - 22.24) < 0.1, String(r.longest.km));
  assert.deepEqual([r.longest.from.id, r.longest.to.id].sort(), ['c', 's']);
  assert.equal(roadCoverage([cam('a', 34)]).longest, null);
});

// ---- built pages ----
const built = existsSync(DIST);
test('pages: homepage, /cameras/, /map/, Japan and Taiwan say river cameras apart', { skip: !built && 'no dist' }, () => {
  const p = readPages();
  const { traffic, river } = splitCount(cameras);
  for (const r of ['/', '/cameras/', '/map/', '/cameras/japan/', '/cameras/taiwan/']) {
    const h = p.get(r);
    assert.ok(h, r);
    assert.match(h, /river cameras/, r);
  }
  assert.match(p.get('/'), new RegExp(`<strong[^>]*>${traffic}</strong> official traffic camera links`));
  assert.match(p.get('/'), new RegExp(`${river} river cameras`));
  assert.doesNotMatch(p.get('/cameras/japan/'), /Japan traffic cameras|0 official links/);
});
test('pages: road page shows length covered and longest stretch', { skip: !built && 'no dist' }, () => {
  const h = readPages().get('/roads/i-5/');
  assert.ok(h);
  assert.match(h, /cover about [\d.]+ km of road/);
  assert.match(h, /longest stretch with no camera is [\d.]+ km/);
});
