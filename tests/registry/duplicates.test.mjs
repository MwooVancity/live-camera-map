import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findSuspects, metres } from '../../ops/importers/lib/duplicates.mjs';

test('metres: 0.001 degree of latitude is about 111 m', () => assert.ok(Math.abs(metres({ lat: 10, lon: 10 }, { lat: 10.001, lon: 10 }) - 111.2) < 1));

test('suspects: close cameras from different sources are marked once; same source, far, and missing coordinates are not', () => {
  const cams = [
    { id: 'a-1', sourceId: 'a', lat: 51.5, lon: -0.1 }, { id: 'b-1', sourceId: 'b', lat: 51.50005, lon: -0.1 },
    { id: 'a-2', sourceId: 'a', lat: 51.5, lon: -0.10005 }, // same source as a-1: ignored
    { id: 'b-2', sourceId: 'b', lat: 51.6, lon: -0.1 }, { id: 'c-1', sourceId: 'c', lat: null, lon: null },
  ];
  const s = findSuspects(cams, 30);
  assert.deepEqual(s.map((p) => [p.a, p.b]), [['a-1', 'b-1'], ['a-2', 'b-1']]);
});

test('the real registry: report cross-source suspects (informational today, a hard cap catches a bad import)', () => {
  const j = JSON.parse(readFileSync(new URL('../../data/camera-registry/cameras.json', import.meta.url), 'utf8'));
  const cams = Array.isArray(j) ? j : j.cameras;
  const s = findSuspects(cams, 30);
  console.log(`cross-source suspects within 30 m: ${s.length}`);
  assert.ok(s.length <= Math.ceil(cams.length * 0.01), 'more than 1 percent of cameras sit on another source\'s camera: a wrong-coordinate import?');
});
