// Road (corridor) pages: driving order, nearest cameras, one number per count, health markers, escaped feed text.
// Unit tests use hand-computed fixtures; built-page tests write fresh feed and health fixtures (timestamps relative to now).
// Run from site/: node --test tests/roads.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { orderAlongRoad, relatedRoads, nearestCities } from '../src/lib/roads.mjs';
import { nearestCameras, roadBlocks, loadLive, NEAR_KM } from '../src/lib/live.mjs';
import { curatedRoads, pageList } from '../src/lib/pages.mjs';
import { roadSlug, countsBy } from '../../ops/importers/lib/registry.mjs';
import { cityHealth, STATUSES } from '../src/lib/health.mjs';
import { readPages, buildOutDir, isNoindex } from './helpers.mjs';
import { gate } from '../../ops/harness/page-gate.mjs';

const cameras = JSON.parse(readFileSync('../data/camera-registry/cameras.json', 'utf8'));
const cam = (id, lat, lon, direction = 'North', road = 'I-5') => ({ id, name: id, lat, lon, direction, road, city: 'X', regionSlug: 'california', feedType: 'still', officialUrl: `https://example.test/${id}` });
const ids = (g) => g.cams.map((x) => x.camera.id);

// ---- driving order ----
test('order: north-south road, northbound runs south to north, southbound the other way, ids all kept', () => {
  const road = [cam('n3', 34.3, -118.3), cam('n1', 34.1, -118.1), cam('n2', 34.2, -118.2), cam('s1', 34.15, -118.15, 'South'), cam('s2', 34.25, -118.25, 'South'), cam('s0', 34.05, -118.05, 'South')];
  const o = orderAlongRoad(road);
  assert.deepEqual(o.groups.map((g) => g.direction), ['North', 'South']);
  assert.deepEqual(ids(o.groups[0]), ['n1', 'n2', 'n3']);
  assert.deepEqual(ids(o.groups[1]), ['s2', 's1', 's0']);
  assert.equal(o.groups.reduce((s, g) => s + g.cams.length, 0), road.length);
});
test('order: east-west road, eastbound runs west to east, westbound the other way', () => {
  const road = [cam('e2', 34, -117.5, 'East'), cam('e1', 34.001, -118.5, 'East'), cam('e3', 34.002, -116.5, 'East'), cam('w2', 34, -117, 'West'), cam('w1', 34.001, -118, 'West')];
  const o = orderAlongRoad(road);
  assert.deepEqual(ids(o.groups.find((g) => g.direction === 'East')), ['e1', 'e2', 'e3']);
  assert.deepEqual(ids(o.groups.find((g) => g.direction === 'West')), ['w2', 'w1']);
  assert.equal(o.northish, false);
});
test('order: along values are monotonic in each group; missing direction is its own group, in axis order', () => {
  const road = [cam('a', 34.4, -118.4, ''), cam('b', 34.1, -118.1, ''), cam('c', 34.2, -118.2, 'Median'), cam('d', 34.3, -118.3, 'North'), cam('e', 34.0, -118.0, 'North')];
  const o = orderAlongRoad(road);
  for (const g of o.groups) for (let i = 1; i < g.cams.length; i++) assert.ok(g.cams[i].along >= g.cams[i - 1].along);
  assert.equal(o.groups.find((g) => g.direction === '').label, 'Direction not recorded');
  assert.deepEqual(ids(o.groups.find((g) => g.direction === '')), ['b', 'a']);
});
test('order: largest gap is the longest straight-line step between neighbours, in km', () => {
  const o = orderAlongRoad([cam('p', 34.0, -118), cam('q', 34.01, -118), cam('r', 34.05, -118)]);
  const g = o.groups[0].gap;
  assert.equal(g.from.id, 'q'); assert.equal(g.to.id, 'r');
  assert.ok(Math.abs(g.km - 0.04 * 111.195) < 0.05, `gap ${g.km}`); // 0.04 degrees of latitude
});
test('order: one camera has no gap; no cameras gives no groups', () => {
  assert.equal(orderAlongRoad([cam('only', 34, -118)]).groups[0].gap, null);
  assert.deepEqual(orderAlongRoad([]).groups, []);
});
test('order on the real registry: every curated road keeps all its cameras, once, and each group is monotonic', () => {
  for (const road of curatedRoads(cameras)) {
    const here = cameras.filter((c) => c.road === road);
    const o = orderAlongRoad(here);
    const seen = o.groups.flatMap(ids);
    assert.equal(seen.length, countsBy(cameras, 'road')[road], `${road}: count`);
    assert.equal(new Set(seen).size, seen.length, `${road}: a camera twice`);
    for (const g of o.groups) for (let i = 1; i < g.cams.length; i++) assert.ok(g.cams[i].along >= g.cams[i - 1].along, `${road} ${g.direction}`);
  }
});

// ---- nearest cameras, hand computed: 0.01 deg of latitude = 1.11195 km; 0.02 deg of longitude at 34 N = 0.02 * 111.195 * cos(34 deg) = 1.8437 km ----
test('nearestCameras: three nearest, nearest first, distance in km matches the hand computation', () => {
  const item = { lat: 34, lon: -118 };
  const cams = [cam('far', 34.5, -118), cam('c', 34.03, -118), cam('a', 34.01, -118), cam('b', 34, -118.02)];
  const n = nearestCameras(item, cams, 3);
  assert.deepEqual(n.map((x) => x.camera.id), ['a', 'b', 'c']);
  assert.ok(Math.abs(n[0].km - 1.11195) < 0.01, `a ${n[0].km}`);
  assert.ok(Math.abs(n[1].km - 1.8437) < 0.01, `b ${n[1].km}`);
  assert.ok(Math.abs(n[2].km - 3.33585) < 0.01, `c ${n[2].km}`);
});
test('nearestCameras: fewer cameras than k, a tie broken by id, an item with no position', () => {
  assert.equal(nearestCameras({ lat: 34, lon: -118 }, [cam('a', 34.01, -118)], 3).length, 1);
  const t = nearestCameras({ lat: 34, lon: -118 }, [cam('z', 34.01, -118), cam('m', 34.01, -118)], 2);
  assert.deepEqual(t.map((x) => x.camera.id), ['m', 'z']);
  assert.deepEqual(nearestCameras({ lat: null, lon: -118 }, [cam('a', 34, -118)]), []);
  assert.deepEqual(nearestCameras({ lat: 34, lon: -118 }, [{ id: 'x', lat: NaN, lon: 1 }]), []);
});

// ---- curated roads, related roads, near cities ----
test('curatedRoads: at least 3 cameras, biggest first, two spellings of one road count once', () => {
  const many = (road, n) => Array.from({ length: n }, (_, i) => cam(`${road}-${i}`, 34, -118, 'North', road));
  assert.deepEqual(curatedRoads([...many('I-5', 5), ...many('SR-1', 3), ...many('SR-2', 2), ...many('i 405', 1), ...many('I-405', 3), ...many('Main St', 9)]), ['I-5', 'I-405', 'SR-1']);
});
test('curatedRoads on the real registry: 10 roads, each with 3+ cameras and one slug', () => {
  const r = curatedRoads(cameras);
  assert.equal(r.length, 10);
  assert.equal(new Set(r.map(roadSlug)).size, 10);
  for (const x of r) assert.ok(countsBy(cameras, 'road')[x] >= 3);
});
test('relatedRoads: shared cities first, then the closest road; nearestCities by km', () => {
  const by = new Map([['A', [cam('a', 34, -118)]], ['B', [cam('b', 34.5, -118)]], ['C', [cam('c', 34.1, -118)]], ['D', [cam('d', 40, -118)]]]);
  const cityOf = new Map([['A', new Set(['X', 'Y'])], ['B', new Set(['Y'])], ['C', new Set()], ['D', new Set(['X', 'Y'])]]);
  const r = relatedRoads('A', ['A', 'B', 'C', 'D'], by, cityOf, 3);
  assert.deepEqual(r.map((x) => x.road), ['D', 'B', 'C']); // D shares 2, B shares 1, C shares 0
  const c = nearestCities([cam('a', 34, -118)], [{ city: 'Far', lat: 36, lon: -118 }, { city: 'Near', lat: 34.1, lon: -118 }], 1);
  assert.equal(c[0].city, 'Near');
});
test('pageList: roads hub and road pages are indexable pages with real lastmod; below 3 cameras is noindex', () => {
  const cams = [...Array.from({ length: 3 }, (_, i) => cam(`a${i}`, 34, -118, 'North', 'I-5')), cam('b0', 34, -118, 'North', 'SR-9')];
  const p = pageList(cams, [], '2026-11-22', ['I-5', 'SR-9']);
  assert.equal(p.find((x) => x.route === '/roads/').indexable, true);
  assert.equal(p.find((x) => x.route === '/roads/i-5/').indexable, true);
  assert.equal(p.find((x) => x.route === '/roads/sr-9/').indexable, false);
  assert.ok(!pageList(cams, [], '2026-11-22').some((x) => x.route.startsWith('/roads/')), 'no roads given, no road pages');
});

// ---- live blocks on a road: fixtures ----
const realPerms = JSON.parse(readFileSync('../data/source-permissions.json', 'utf8'));
const IDS = ['caltrans-lcs', 'caltrans-cc', 'caltrans-cms', 'caltrans-rwis', 'nws-forecast', 'nws-alerts'];
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const i405 = cameras.filter((c) => c.road === 'I-405');
const at = i405[10];
function fixture({ ageMin = 1, evil = '' } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'road-'));
  const w = (n, o) => writeFileSync(join(d, `${n}.json`), JSON.stringify(o));
  const base = (feed, items) => ({ feed, generatedAt: ago(ageMin), items });
  const on = { lat: at.lat + 0.004, lon: at.lon, road: 'I-405', direction: 'North', place: 'Irvine', county: 'Orange', district: '12' };
  w('ca-lcs', base('lcs', [
    { ...on, id: 'l-near', active: true, text: `Left lane closure${evil}`, estimatedDelay: '5', endIndefinite: false, end: ago(-600) },
    { ...on, lat: at.lat + 4, id: 'l-far', active: true, text: 'Far closure', endIndefinite: true },
    { ...on, road: 'I-5', id: 'l-other', active: true, text: 'Other road closure', endIndefinite: true },
    { ...on, id: 'l-inactive', active: false, text: 'Not in effect', endIndefinite: false },
  ]));
  w('ca-cc', base('cc', [{ ...on, id: 'c1', inEffect: true, status: 'R-1', text: `Chains required${evil}`, statusLocal: '2026-11-22 05:00:00' }]));
  w('ca-cms', base('cms', [{ ...on, id: 'm1', text: `ACCIDENT AHEAD${evil}`, messageLocal: '2026-11-22 05:00:00' }]));
  w('ca-rwis', base('rwis', [{ ...on, id: 'r1', recordedAt: ago(ageMin), airTemp: 55, surfaceTemp: null, windAvg: 4, windGust: 9, visibility: null, humidity: 60 }]));
  const perms = { ...realPerms, sources: realPerms.sources.filter((s) => IDS.includes(s.id)).map((s) => ({ ...s, reviewedAt: new Date().toISOString().slice(0, 10) })) };
  const pf = join(d, 'perms.json');
  writeFileSync(pf, JSON.stringify(perms));
  process.env.CONDITIONS_DIR = d; process.env.PERMISSIONS_FILE = pf;
  return { dir: d, env: { CONDITIONS_DIR: d, PERMISSIONS_FILE: pf } };
}

test('roadBlocks: matches by road slug, each listed item has nearest cameras within the limit, far items are counted not listed', () => {
  fixture();
  const blocks = roadBlocks('i-405', i405, [], loadLive(), new Date(), { road: 'I-405' });
  const rc = blocks.find((b) => b.id === 'road-conditions');
  assert.deepEqual(rc.lcs.map((i) => i.id), ['l-near']); // l-other is another road, l-inactive not active, l-far has no camera close
  assert.equal(rc.far, 1);
  assert.deepEqual(rc.cc.map((i) => i.id), ['c1']);
  for (const i of [...rc.lcs, ...rc.cc, ...blocks.find((b) => b.id === 'message-signs').items]) {
    assert.ok(i.nearest.length >= 1 && i.nearest.length <= 3);
    assert.deepEqual(i.nearest, nearestCameras(i, i405, 3).filter((n) => n.km <= NEAR_KM));
  }
  assert.ok(blocks.find((b) => b.id === 'road-weather').items.length === 1);
  for (const b of blocks) assert.ok(b.source && b.attribution && b.asof && b.link, `${b.id}: proof fields`);
});
test('roadBlocks: stale feeds give no blocks; a road with no matching items gives none', () => {
  fixture({ ageMin: 400 });
  assert.deepEqual(roadBlocks('i-405', i405, [], loadLive(), new Date(), {}), []);
  fixture();
  assert.deepEqual(roadBlocks('sr-99', cameras.filter((c) => c.road === 'SR-99'), [], loadLive(), new Date(), {}), []);
});

// ---- built pages ----
function build(env) {
  const out = buildOutDir('roadout-');
  execFileSync(process.execPath, ['node_modules/astro/astro.js', 'build', '--outDir', out], { env: { ...process.env, ...env }, stdio: 'pipe' });
  return { out, pages: readPages(out) };
}
function healthFile() {
  const cams = {};
  cameras.forEach((c, i) => { cams[c.id] = { status: STATUSES[i % 3], httpStatus: 200, lastChecked: ago(1), feedKind: 'still' }; });
  delete cams[i405.at(-1).id];
  const f = join(mkdtempSync(join(tmpdir(), 'rhf-')), 'health.json');
  writeFileSync(f, JSON.stringify({ generatedAt: ago(1), runOk: true, perSource: {}, cameras: cams }));
  return f;
}
const section = (html, id) => (html.match(new RegExp(`<section data-block="${id}"[\\s\\S]*?</section>`)) || [''])[0];

test('built road pages: one per curated road plus the hub, counts equal countsBy, list lengths match, gate passes', () => {
  const evil = '<script>alert(1)</script>';
  const { dir, env } = fixture({ evil });
  const hf = healthFile();
  const { out, pages } = build({ ...env, HEALTH_FILE: hf });
  const roads = curatedRoads(cameras);
  const byRoad = countsBy(cameras.filter((c) => c.regionSlug === 'california'), 'road'); // road pages are California-only; Iowa also has an I-80 and an I-35
  assert.ok(pages.has('/roads/'));
  const hub = pages.get('/roads/');
  for (const road of roads) {
    const route = `/roads/${roadSlug(road)}/`;
    const html = pages.get(route);
    assert.ok(html, `${route} not built`);
    assert.ok(hub.includes(`href="${route}"`), `hub does not link ${route}`);
    assert.ok(!isNoindex(html), `${route} should be indexable`);
    const n = byRoad[road];
    assert.ok(html.includes(`${road} traffic cameras in driving order, California, United States: ${n} official links`), `${route}: title count`);
    assert.ok(html.includes(`<p>${n} Caltrans cameras are listed on ${road} in California, United States:`), `${route}: intro count`);
    const cams = section(html, 'cameras');
    assert.ok(cams.includes(`data-count="${n}"`), `${route}: data-count`);
    assert.equal((cams.match(/<li data-camera=/g) || []).length, n, `${route}: list length`);
    const headSum = [...cams.matchAll(/<h3[^>]*>[^<]*\((\d+)\)<\/h3>/g)].reduce((s, m) => s + Number(m[1]), 0);
    assert.equal(headSum, n, `${route}: direction headings add up`);
    assert.ok(!/<img\b|<video\b/i.test(html), `${route}: media tag`);
  }
  // the evidence-bearing page: I-405 with all live blocks
  const html = pages.get('/roads/i-405/');
  for (const id of ['road-conditions', 'message-signs', 'road-weather']) assert.ok(section(html, id), `${id} missing`);
  const events = [...html.matchAll(/<li data-event="[a-z-]+">[\s\S]*?<\/li>/g)].map((m) => m[0]);
  assert.equal(events.length, 3); // one closure, one chain control, one sign; the far, other-road and inactive items are not listed
  for (const e of events) assert.ok(/data-nearest href="https:\/\/cwwp2\.dot\.ca\.gov\//.test(e) && /\d\.\d km\)|under 0\.1 km\)/.test(e), 'nearest camera link with km');
  assert.ok(!html.includes('Other road closure') && !html.includes('Far closure') && !html.includes('Not in effect'));
  assert.match(html, /1 more item is not listed because none of this road's cameras is within 25 km of it/);
  // escaped feed text
  assert.ok(!html.includes('<script>alert(1)'), 'raw script leaked');
  assert.ok(html.includes('&lt;script&gt;alert(1)'), 'escaped text should be present');
  // health markers match the file
  const h = JSON.parse(readFileSync(hf, 'utf8'));
  const { block } = cityHealth(cameras.filter((c) => c.road === 'I-405'), h);
  for (const c of i405) {
    const m = html.match(new RegExp(`<li data-camera="${c.id}">[\\s\\S]*?data-status="([a-z]+)"`));
    assert.ok(m, `${c.id}: no status marker`);
    assert.equal(m[1], block.statusOf(c.id), c.id);
  }
  assert.ok(html.includes(`out of ${i405.length} cameras`), 'health total equals the road count');
  // silo and PAGES.md checks on the whole built fixture site
  assert.deepEqual(gate(out, readFileSync('PAGES.md', 'utf8')), []);
  // sitemap lists the road pages
  const xml = readFileSync(join(out, 'sitemap.xml'), 'utf8');
  for (const road of roads) assert.ok(xml.includes(`/roads/${roadSlug(road)}/</loc>`));
  assert.ok(xml.includes('/roads/</loc>'));
  // a closure with its camera links removed fails the gate
  const broken = html.replace(/<a data-nearest [^>]*>[^<]*<\/a>/g, 'none');
  writeFileSync(join(out, 'roads', 'i-405', 'index.html'), broken);
  assert.ok(gate(out, readFileSync('PAGES.md', 'utf8')).some((e) => /lists no nearest camera/.test(e)));
});

test('built road pages: without a health file the page says not checked and shows no status marker; no live blocks with stale feeds', () => {
  const { env } = fixture({ ageMin: 400 });
  const { pages } = build({ ...env, HEALTH_FILE: join(tmpdir(), 'no-such-health.json') });
  const html = pages.get('/roads/i-405/');
  assert.ok(section(html, 'health').includes('Not checked yet'));
  assert.ok(!html.includes('data-status='));
  for (const id of ['road-conditions', 'message-signs', 'road-weather', 'weather-alerts']) assert.ok(!section(html, id), `${id} shown with stale data`);
});

test('city pages link the road pages that pass their cameras; the guide, home, region hub and map link the roads hub', () => {
  const { pages } = build({});
  const la = pages.get('/cameras/united-states/california/los-angeles/');
  assert.ok(la.includes('Roads in Los Angeles') && la.includes('href="/roads/i-405/"'));
  for (const r of ['/', '/cameras/united-states/california/', '/map/', '/guides/how-to-read-a-road-page/']) assert.ok(pages.get(r).includes('href="/roads/"'), `${r} does not link /roads/`);
  for (const [route, html] of pages) if (route.startsWith('/roads/') && route !== '/roads/') assert.ok(html.includes('href="/guides/how-to-read-a-road-page/"'), `${route}: guide`);
});
