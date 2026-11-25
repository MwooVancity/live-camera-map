// Road observability calculation (plan item 36 P2-11). Pure functions, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineM, sampleChain, chainWays, computeObservability, eligibleCameras, validateOverpass, METHOD } from '../../ops/observability/observability.mjs';

const R = 6371008.8;
const dLatFor = (m) => (m / R) * 180 / Math.PI; // degrees of latitude that make m metres
const way = (id, highway, geometry, ref = '1') => ({ type: 'way', id, tags: { highway, ref }, geometry: geometry.map(([lat, lon]) => ({ lat, lon })) });
const line = (n, lat0 = 64, lon = -20) => Array.from({ length: n }, (_, i) => [lat0 + dLatFor(1000 * i), lon]); // n vertices, 1 km apart, due north

test('haversine on known pairs', () => {
  assert.equal(haversineM({ lat: 64, lon: -20 }, { lat: 64, lon: -20 }), 0);
  assert.ok(Math.abs(haversineM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) - 111195) < 5, 'one degree of latitude is about 111.2 km');
  const rv = haversineM({ lat: 64.1466, lon: -21.9426 }, { lat: 65.6835, lon: -18.1105 }); // Reykjavik to Akureyri, straight line about 250 km
  assert.ok(rv > 245000 && rv < 255000, String(rv));
  assert.ok(Math.abs(haversineM({ lat: 10, lon: 20 }, { lat: 30, lon: 40 }) - haversineM({ lat: 30, lon: 40 }, { lat: 10, lon: 20 })) < 1e-6, 'symmetric');
});

test('sampling a straight 10 km way gives 11 points, 1 km apart', () => {
  const pts = sampleChain(line(11), 1000);
  assert.equal(pts.length, 11);
  for (let i = 1; i < pts.length; i++) assert.ok(Math.abs(haversineM(pts[i - 1], pts[i]) - 1000) < 1, `gap ${i}`);
  assert.equal(sampleChain(line(2), 1000).length, 2); // exactly 1 km: start and end
  assert.equal(sampleChain([[64, -20], [64.001, -20]], 1000).length, 1, 'a 111 m way still has its start point');
});

test('duplicate consecutive nodes add no length and no extra points', () => {
  const g = line(4); g.splice(2, 0, g[2], g[2]);
  assert.equal(sampleChain(g, 1000).length, 4);
});

test('ways that meet end to end are chained into one line; a third way at the junction stops the chain', () => {
  const a = way(1, 'primary', line(3)), b = way(2, 'primary', line(3, 64 + dLatFor(2000)));
  const c = chainWays([b, a]);
  assert.equal(c.length, 1); assert.equal(c[0].geometry.length, 5);
  const t = way(3, 'primary', [[64 + dLatFor(2000), -20], [64 + dLatFor(2000), -19.9]]);
  assert.equal(chainWays([a, b, t]).length, 3, 'a junction of three ways is not chained');
  assert.equal(chainWays([a, a, b]).length, 1, 'a way listed twice counts once');
});

const cam = (lat, lon, id = 'c') => ({ id, lat, lon });
const roads = (...w) => ({ elements: w });
const run = (osm, cams) => computeObservability(osm, cams, { spacingM: 1000, radiusM: 5000 });

test('a camera exactly 5 km away counts, 5.01 km does not', () => {
  const osm = roads(way(1, 'primary', [[64, -20], [64 + dLatFor(0.5), -20]])); // one point, the start
  const at = (m) => run(osm, [cam(64 + dLatFor(m), -20)]).byClass.primary.observed;
  assert.equal(at(5000), 1); assert.equal(at(5010), 0); assert.equal(at(4990), 1);
});

test('a camera that is not eligible or whose source has no metadata permission is not counted', () => {
  const mk = (o) => ({ id: 'iceland-vegagerdin-1', sourceId: 'iceland-vegagerdin', name: 'N', road: 'R', direction: '', city: null, regionSlug: 'iceland', regionName: 'Iceland', lat: 64.1, lon: -21.9, feedType: 'still', officialUrl: 'https://x.is/1.jpg', lastSeen: '2026-11-24T00:00:00Z', ...o });
  const srcs = [{ id: 'iceland-vegagerdin', name: 'V', license: 'CC BY 4.0', attribution: 'Source: V' }];
  const perm = (st) => [{ id: 'iceland-road-cameras', metadataPermission: { status: st } }];
  const cams = [mk(), mk({ id: 'iceland-vegagerdin-2', officialUrl: 'https://x.is/2026/11/a.jpg' }), mk({ id: 'iceland-vegagerdin-3', lat: 0, lon: 0 }), mk({ id: 'iceland-vegagerdin-4', lat: -21.9, lon: 64.1 })];
  const ok = eligibleCameras(cams, srcs, {}, perm('allowed'));
  assert.equal(ok.cameras.length, 1);
  assert.deepEqual([ok.excluded.notEligible, ok.excluded.outsideCountryBox], [2, 1], 'temporary link and zero coordinates are not eligible; swapped lat/lon falls outside the Iceland box');
  const closed = eligibleCameras(cams, srcs, {}, perm('restricted'));
  assert.equal(closed.cameras.length, 0); assert.equal(closed.excluded.noMetadata, 2, 'the two eligible cameras (the swapped one is eligible by the shared rule) are closed by the permission row');
  assert.equal(eligibleCameras(cams, [{ ...srcs[0], license: 'unverified' }], {}, []).cameras.length, 0, 'no licence label, no count');
});

test('no roads or no cameras: zero percent, no divide by zero, no NaN', () => {
  const none = run(roads(), []);
  assert.equal(none.total.points, 0); assert.equal(none.total.percent, 0);
  assert.ok(!JSON.stringify(none).includes('NaN') && !JSON.stringify(none).includes('null'));
  const noCam = run(roads(way(1, 'primary', line(5))), []);
  assert.equal(noCam.total.points, 5); assert.equal(noCam.total.observed, 0); assert.equal(noCam.total.percent, 0);
  assert.equal(noCam.stretches[0].km, 5);
});

test('per-class numbers add up to the totals; stretches come from runs of unobserved points; wrong class and bad geometry are ignored', () => {
  const m = way(1, 'motorway', line(11, 64, -20), 'M'), p = way(2, 'primary', line(11, 64, -19.9), 'P'), junk = way(3, 'residential', line(5, 64, -19.8));
  const bad = { type: 'way', id: 9, tags: { highway: 'trunk', ref: 'X' }, geometry: [{ lat: 64, lon: -20 }] }; // one node: not a line
  const r = run(roads(m, p, junk, bad, { type: 'node', id: 5 }), [cam(64, -20), cam(64 + dLatFor(10000), -19.9)]);
  const sum = (k) => Object.values(r.byClass).reduce((n, c) => n + c[k], 0);
  assert.equal(sum('points'), r.total.points); assert.equal(sum('observed'), r.total.observed);
  assert.equal(r.total.points, 22); assert.equal(r.byClass.trunk.points, 0);
  assert.equal(r.total.percent, Math.round((r.total.observed / r.total.points) * 1000) / 10);
  assert.ok(r.stretches.every((s) => s.km >= 1 && s.ref && s.start && s.end));
  assert.ok(r.stretches.every((s, i, a) => i === 0 || a[i - 1].km >= s.km), 'longest first');
});

test('ways crossing the Iceland box edge: points outside are dropped and counted', () => {
  const r = run(roads(way(1, 'primary', [[66.9, -20], [67.1, -20]])), []);
  assert.ok(r.droppedOutsideBox > 0 && r.total.points > 0 && r.total.points < 25);
});

test('the same inputs give the same bytes', () => {
  const o = roads(way(2, 'primary', line(8)), way(1, 'motorway', line(6, 64, -19.5)));
  const c = [cam(64.02, -20), cam(64.01, -19.5)];
  assert.equal(JSON.stringify(run(o, c)), JSON.stringify(run({ elements: [...o.elements].reverse() }, [...c].reverse())));
});

test('Overpass failure, truncated or empty answers are refused, never written as a result', () => {
  const good = JSON.stringify({ version: 0.6, osm3s: { timestamp_osm_base: '2026-11-24T00:00:00Z', copyright: 'x' }, elements: [way(1, 'primary', line(3))] });
  assert.equal(validateOverpass(good).elements.length, 1);
  assert.throws(() => validateOverpass(good.slice(0, good.length - 20)), /not valid JSON/i);
  assert.throws(() => validateOverpass('<html>Too many requests</html>'), /not valid JSON/i);
  assert.throws(() => validateOverpass(JSON.stringify({ elements: [] })), /no roads/i);
  assert.throws(() => validateOverpass(JSON.stringify({ remark: 'runtime error: Query timed out', elements: [way(1, 'primary', line(3))] })), /remark/i);
});

test('the method text states the denominator and the licence', () => {
  assert.match(METHOD.denominator, /motorway.*trunk.*primary/);
  assert.match(METHOD.osmLicence, /OpenStreetMap contributors, ODbL/);
});
