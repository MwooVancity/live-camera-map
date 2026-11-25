// Corridor pages (plan item 36 P2-12): five driving-order pages outside California. Unit tests use synthetic corridors; built-page tests need `npm run build`.
// Run from site/: node --test tests/corridors.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CORRIDORS, GAP_KM, orderCorridor, buildCorridor, loadCorridors } from '../src/lib/corridors.mjs';
import { pageList } from '../src/lib/pages.mjs';
import { readPages } from './helpers.mjs';

const cam = (id, lat, lon, o = {}) => ({ id, name: o.name || `X - I-80 @ MM ${id}`, lat, lon, road: o.road ?? 'I-80', regionSlug: o.region || 'iowa', sourceId: 'iowa-dot', officialUrl: `https://example.test/${id}`, ...o });
const row = (c) => ({ camera_id: c.id, source_id: c.sourceId, source_name: 'Iowa DOT', attribution: 'Iowa DOT credit', licence: 'CC BY 4.0' });
const def = { slug: 'iowa-i-80', region: 'iowa', road: 'I-80', own: 'i80', tokens: 'us', place: 'Iowa, United States' };
const flat = (c) => c.segments.flatMap((s) => s.cams.map((x) => x.camera.id));

test('order: eastbound road sorted west to east whatever the input order, deterministic, along never decreases', () => {
  const cs = [cam('c', 41.6, -94.4), cam('a', 41.5, -95.0), cam('b', 41.55, -94.7), cam('d', 41.62, -94.1)];
  const a = orderCorridor(cs), b = orderCorridor([...cs].reverse());
  assert.deepEqual(a.segments[0].cams.map((x) => x.camera.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(b.segments[0].cams.map((x) => x.camera.id), ['a', 'b', 'c', 'd']);
  const al = a.segments[0].cams.map((x) => x.along);
  for (let i = 1; i < al.length; i++) assert.ok(al[i] >= al[i - 1]);
});
test('order: a north-south road runs south to north', () => {
  const cs = [cam('n2', 42.0, -93.5, { road: 'I-35' }), cam('n1', 41.0, -93.6, { road: 'I-35' }), cam('n3', 43.0, -93.4, { road: 'I-35' })];
  assert.deepEqual(flat(orderCorridor(cs)), ['n1', 'n2', 'n3']);
});
test('order: two cameras at the same position keep a stable order by id', () => {
  const cs = [cam('z', 41.5, -94), cam('m', 41.5, -94), cam('q', 41.5, -93)];
  assert.deepEqual(flat(orderCorridor(cs)), ['m', 'z', 'q']);
});
test('segments: a corridor split by a gap over GAP_KM becomes two segments, west one first, each ordered on its own', () => {
  const west = [cam('w2', 41.5, -96.0), cam('w1', 41.5, -96.3)], east = [cam('e1', 41.5, -91.0), cam('e2', 41.5, -90.8)];
  const o = orderCorridor([...east, ...west]);
  assert.equal(o.segments.length, 2);
  assert.deepEqual(flat(o), ['w1', 'w2', 'e1', 'e2']);
  assert.ok(GAP_KM > 0);
});

test('build: excluded counts are exact: name names another road, name carries no route, no-road camera next to the road', () => {
  const ok1 = cam('1', 41.5, -95), ok2 = cam('2', 41.5, -94.9, { name: 'DM - I-35/80 @ MM 130' });
  const bad1 = cam('3', 41.5, -94.8, { name: 'WWD - I-35 @ MM 131' }), bad2 = cam('4', 41.5, -94.7, { name: 'Nebraska Ave @ 35th St' });
  const noRoad = cam('5', 41.5005, -94.9, { road: '', name: 'Somewhere' }), farNoRoad = cam('6', 45, -80, { road: '' });
  const other = cam('7', 41.5, -94.9, { road: 'I-35', region: 'texas', name: 'Texas I-35' });
  const all = [ok1, ok2, bad1, bad2, noRoad, farNoRoad, other];
  const c = buildCorridor(def, all, all.map(row));
  assert.deepEqual(flat(c).sort(), ['1', '2']);
  assert.equal(c.left.ambiguous, 2);
  assert.equal(c.left.noRoad, 1);
  assert.equal(c.leftOut, 3);
  assert.equal(c.n, 2);
});
test('build: US I-35 in Texas never lands on the Iowa I-35 corridor (region is part of the key)', () => {
  const d = { ...def, slug: 'iowa-i-35', road: 'I-35', own: 'i35' };
  const ia = cam('ia', 42, -93.5, { road: 'I-35', name: 'I-35 @ MM 1' }), tx = cam('tx', 30.3, -97.7, { road: 'I-35', name: 'I-35 @ MM 2', region: 'texas' });
  assert.deepEqual(flat(buildCorridor(d, [ia, tx], [ia, tx].map(row))), ['ia']);
});
test('build: a camera whose source fails the metadata gate (not in the eligible rows) is never listed or counted', () => {
  const a = cam('a', 41.5, -95), b = cam('b', 41.5, -94);
  const c = buildCorridor(def, [a, b], [row(a)]);
  assert.deepEqual(flat(c), ['a']);
  assert.equal(c.leftOut, 0);
});
test('build: credit per source comes from the licence row', () => {
  const a = cam('a', 41.5, -95);
  const c = buildCorridor(def, [a], [row(a)]);
  assert.deepEqual(c.sources.map((s) => [s.name, s.attribution, s.n]), [['Iowa DOT', 'Iowa DOT credit', 1]]);
});

test('registry: exactly five corridors, each with at least 15 listed cameras, none in California, each with a unique slug', () => {
  const list = loadCorridors();
  assert.equal(CORRIDORS.length, 5);
  assert.equal(list.length, 5);
  assert.equal(new Set(list.map((c) => c.def.slug)).size, 5);
  for (const c of list) { assert.ok(c.n >= 15, `${c.def.slug}: ${c.n}`); assert.notEqual(c.def.region, 'california'); assert.equal(flat(c).length, c.n); }
  console.log(list.map((c) => `${c.def.slug}: ${c.n} listed, ${c.leftOut} left out (${c.left.ambiguous} name another road, ${c.left.noRoad} no road), ${c.segments.length} segment(s)`).join('\n'));
});
test('pageList: five corridor routes, nothing added when none are passed', () => {
  const list = loadCorridors();
  const pl = pageList([], [], '2026-11-24', [], {}, list.map((c) => ({ slug: c.def.slug, n: c.n, region: c.def.region })));
  const cr = pl.filter((p) => p.kind === 'corridor');
  assert.equal(cr.length, 5);
  assert.ok(cr.every((p) => /^\/corridors\/[a-z0-9-]+\/$/.test(p.route) && p.indexable));
  assert.equal(pageList([], [], '2026-11-24').filter((p) => p.kind === 'corridor').length, 0);
});

// ---- built pages (skipped when dist/ is not built) ----
const built = existsSync('dist/corridors');
test('built pages: five corridor pages, no picture elements, no competitor name, ordering note, three-tests line, left-out line', { skip: !built }, () => {
  const pages = [...readPages().entries()].filter(([r]) => /^\/corridors\/[^/]+\/$/.test(r));
  assert.equal(pages.length, 5);
  for (const [r, html] of pages) {
    assert.ok(!/<(img|video|source|iframe|picture|canvas)\b/i.test(html.replace(/<noscript[\s\S]*?<\/noscript>/gi, '')), `${r}: picture element`);
    assert.ok(!/argos/i.test(html), `${r}: competitor name`);
    assert.match(html, /How the order is worked out/, r);
    assert.match(html, /Helpful:.*Gain:.*HCU:/s, r);
    assert.match(html, /left out because the source does not say which road they are on/, r);
    assert.match(html, /says nothing about which way traffic runs/, r);
    assert.ok(!/road (is )?(clear|open)\b/i.test(html), `${r}: a road verdict`);
    assert.match(html, /Do not use this page while driving/i, r);
    assert.match(html, /data-block="cameras"[^>]*data-asof=/, r);
  }
});
test('built pages: a California road page is still the California-only road page and does not link corridors', { skip: !built }, () => {
  const html = readPages().get('/roads/i-5/');
  assert.ok(html && html.includes('California, United States'));
  assert.ok(!html.includes('/corridors/'));
});
