// Live-conditions blocks: source + as-of on every block, omitted when stale, omitted when the licence row is closed,
// no camera images. Fixtures are written fresh each run (timestamps relative to now), so no real feed is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { cityBlocks, loadLive } from '../src/lib/live.mjs';
import { readPages, CAMERA_HOSTS } from './helpers.mjs';

const cameras = JSON.parse(readFileSync('../data/camera-registry/cameras.json', 'utf8'));
const sd = cameras.filter((c) => c.city === 'San Diego');
const C = { lat: sd.reduce((s, c) => s + c.lat, 0) / sd.length, lon: sd.reduce((s, c) => s + c.lon, 0) / sd.length, slug: 'san-diego' };
const realPerms = JSON.parse(readFileSync('../data/source-permissions.json', 'utf8'));
const IDS = ['caltrans-lcs', 'caltrans-cc', 'caltrans-cms', 'caltrans-rwis', 'nws-forecast', 'nws-alerts'];
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

// Writes a fixture conditions dir + permissions file. ageMin = how old every feed is; closed = licence rows set to mustNotShip.
function fixture({ ageMin = 1, closed = false } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'live-'));
  const near = { lat: C.lat + 0.01, lon: C.lon + 0.01, district: '11', road: 'I-5', direction: 'North', place: 'San Diego', county: 'San Diego' };
  const w = (n, o) => writeFileSync(join(d, `${n}.json`), JSON.stringify(o));
  const base = (feed, items) => ({ feed, generatedAt: ago(ageMin), items });
  w('ca-lcs', base('lcs', [{ ...near, id: 'l1', active: true, text: 'Left lane closure; lanes 1 closed', estimatedDelay: '5', endIndefinite: false, end: ago(-600) }]));
  w('ca-cc', base('cc', [{ ...near, id: 'c1', inEffect: true, status: 'R-1', text: 'Chains required.', statusLocal: '2026-11-22 05:00:00' }]));
  w('ca-cms', base('cms', [{ ...near, id: 'm1', text: 'ACCIDENT AHEAD', messageLocal: '2026-11-22 05:00:00' }]));
  w('ca-rwis', base('rwis', [{ ...near, id: 'r1', recordedAt: ago(ageMin), airTemp: 55, surfaceTemp: null, windAvg: 4, windGust: 9, visibility: null, humidity: 60 }]));
  w('nws-san-diego', { forecast: { fetchedAt: ago(ageMin), periods: [{ name: 'Tonight', startTime: ago(-60), temperature: 50, temperatureUnit: 'F', windSpeed: '5 mph', windDirection: 'N', shortForecast: 'Clear', precipChance: 0 }] }, alerts: { fetchedAt: ago(ageMin), items: [{ id: 'a', event: 'High Surf Advisory', severity: 'Minor', urgency: 'Expected', headline: 'High Surf Advisory until tomorrow' }] } });
  const perms = { ...realPerms, sources: realPerms.sources.filter((s) => IDS.includes(s.id)).map((s) => ({ ...s, reviewedAt: new Date().toISOString().slice(0, 10), ...(closed ? { mustNotShip: true } : {}) })) };
  const pf = join(d, 'perms.json');
  writeFileSync(pf, JSON.stringify(perms));
  process.env.CONDITIONS_DIR = d; process.env.PERMISSIONS_FILE = pf;
  return { dir: d, env: { CONDITIONS_DIR: d, PERMISSIONS_FILE: pf } };
}
const ids = () => cityBlocks(C, loadLive()).map((b) => b.id);

test('fresh data, enabled licences: all five blocks, each with source, link, as-of and attribution', () => {
  fixture();
  const blocks = cityBlocks(C, loadLive());
  assert.deepEqual(blocks.map((b) => b.id), ['road-conditions', 'message-signs', 'road-weather', 'forecast', 'weather-alerts']);
  for (const b of blocks) { assert.ok(b.source && b.attribution && b.asof && b.link, `${b.id}: proof fields`); }
});

test('stale data: every block is omitted (not shown empty)', () => assert.deepEqual((fixture({ ageMin: 400 }), ids()), []));
test('licence row closed (mustNotShip): every block is omitted', () => assert.deepEqual((fixture({ closed: true }), ids()), []));
test('licence row missing: block omitted', () => {
  const { dir } = fixture();
  const p = JSON.parse(readFileSync(join(dir, 'perms.json'), 'utf8'));
  p.sources = p.sources.filter((s) => s.id !== 'caltrans-cms');
  writeFileSync(join(dir, 'perms.json'), JSON.stringify(p));
  assert.ok(!ids().includes('message-signs') && ids().includes('road-conditions'));
});
test('nothing near the city: road blocks omitted', () => {
  fixture();
  assert.deepEqual(cityBlocks({ ...C, lat: C.lat + 3 }, loadLive()).map((b) => b.id), ['forecast', 'weather-alerts']);
});

function build(env) {
  const out = mkdtempSync(join(tmpdir(), 'liveout-'));
  execFileSync(process.execPath, ['node_modules/astro/astro.js', 'build', '--outDir', out], { env: { ...process.env, ...env }, stdio: 'pipe' });
  return readPages(out);
}
const blocksOn = (html) => [...html.matchAll(/<section data-block="([a-z-]+)"[^>]*data-source="[^"]+"[^>]*data-asof="([^"]+)"/g)].map((m) => m[1]);
const LIVE = ['road-conditions', 'message-signs', 'road-weather', 'forecast', 'weather-alerts'];
const sdRoute = '/cameras/united-states/california/san-diego/';

test('built page: fresh fixture shows each block with source, as-of, Updated text, no camera images, count = list length', () => {
  const pages = build(fixture().env);
  const html = pages.get(sdRoute);
  for (const id of LIVE) {
    const sec = html.match(new RegExp(`<section data-block="${id}"[\\s\\S]*?</section>`));
    assert.ok(sec, `${id} missing`);
    assert.match(sec[0], /data-source="[^"]+"/); assert.match(sec[0], /data-asof="\d{4}-\d\d-\d\dT/);
    assert.match(sec[0], /Feed updated <time datetime="[^"]+">[^<]+<\/time>; page built <time datetime="\d{4}-\d\d-\d\dT[^"]+">[^<]+<\/time>; each item shows its own record time/);
    assert.ok(!/<img\b/i.test(sec[0]));
    const n = Number(sec[0].match(/data-rows="(\d+)"/)[1]);
    assert.equal(n, (sec[0].match(/<li>/g) || []).length, `${id}: count equals listed rows`);
  }
  for (const [route, h] of pages) for (const host of CAMERA_HOSTS) assert.ok(!new RegExp(`<img[^>]*${host}`).test(h), route);
  assert.ok(html.includes('/guides/what-live-road-conditions-mean/'));
  assert.ok(pages.has('/guides/what-live-road-conditions-mean/'));
  assert.ok(pages.get('/cameras/united-states/california/').includes('data-block="feed-freshness"'));
});

test('built page: stale fixture drops every live block; region page says so', () => {
  const pages = build(fixture({ ageMin: 400 }).env);
  for (const [route, html] of pages) for (const id of LIVE) assert.ok(!blocksOn(html).includes(id), `${route}: ${id} shown with stale data`);
  assert.match(pages.get('/cameras/united-states/california/'), /older than its limit/);
});

test('built page: closed licence drops every live block; region page says so', () => {
  const pages = build(fixture({ closed: true }).env);
  for (const [route, html] of pages) for (const id of LIVE) assert.ok(!blocksOn(html).includes(id), `${route}: ${id} shown with closed licence`);
  assert.match(pages.get('/cameras/united-states/california/'), /licence not enabled/);
});

test('built page: HTML in feed text is escaped, never rendered', () => {
  const { dir, env } = fixture();
  const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  for (const f of ['ca-cms', 'ca-lcs', 'ca-cc']) {
    const p = join(dir, `${f}.json`); const j = JSON.parse(readFileSync(p, 'utf8')); j.items[0].text = evil; writeFileSync(p, JSON.stringify(j));
  }
  const p = join(dir, 'nws-san-diego.json'); const j = JSON.parse(readFileSync(p, 'utf8')); j.alerts.items[0].headline = evil; writeFileSync(p, JSON.stringify(j));
  const html = build(env).get(sdRoute);
  assert.ok(!html.includes('<script>alert(1)'), 'raw script tag leaked');
  assert.ok(!/<img[^>]*onerror/i.test(html), 'raw img leaked');
  assert.ok(html.includes('&lt;script&gt;alert(1)'), 'escaped text should be present');
});

// ---- British Columbia: DriveBC Open511 events (bc-events) ----
const mission = cameras.filter((c) => c.regionSlug === 'british-columbia' && c.city === 'Mission');
const M = { lat: mission.reduce((s, c) => s + c.lat, 0) / mission.length, lon: mission.reduce((s, c) => s + c.lon, 0) / mission.length, slug: 'mission', region: 'british-columbia' };
const missionRoute = '/cameras/canada/british-columbia/mission/';
function bcFixture({ ageMin = 1, closed = false, withCa = false } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'bclive-'));
  const ev = (id, dLat, o = {}) => ({ id, road: 'Highway 7', direction: null, roadState: 'ALL_LANES_OPEN', area: 'Lower Mainland District', eventType: 'CONSTRUCTION', severity: 'MINOR', headline: 'CONSTRUCTION', text: `Work on Highway 7 ${id}`, lat: M.lat + dLat, lon: M.lon, endLat: null, endLon: null, start: ago(60 * 24), end: null, endIndefinite: true, updated: ago(60), active: true, closed: false, ...o });
  const items = [ev('far', 0.2), ev('near', 0.01), ev('expired', 0.02, { active: false }), ev('mid', 0.05, { closed: true, roadState: 'CLOSED' })];
  writeFileSync(join(d, 'bc-events.json'), JSON.stringify({ feed: 'bc-events', sourceId: 'drivebc-events', generatedAt: ago(ageMin), items }));
  if (withCa) writeFileSync(join(d, 'ca-lcs.json'), JSON.stringify({ feed: 'lcs', generatedAt: ago(1), items: [{ id: 'x', active: true, road: 'I-5', lat: M.lat, lon: M.lon, text: 'closure' }] }));
  const rows = realPerms.sources.filter((s) => ['drivebc-events', 'caltrans-lcs'].includes(s.id)).map((s) => ({ ...s, reviewedAt: new Date().toISOString().slice(0, 10), ...(closed ? { mustNotShip: true } : {}) }));
  const pf = join(d, 'perms.json');
  writeFileSync(pf, JSON.stringify({ ...realPerms, sources: rows }));
  process.env.CONDITIONS_DIR = d; process.env.PERMISSIONS_FILE = pf;
  return { dir: d, env: { CONDITIONS_DIR: d, PERMISSIONS_FILE: pf } };
}

test('BC fresh data, enabled licence: one bc-events block with source, link, as-of, attribution; active events only, nearest first', () => {
  bcFixture();
  const blocks = cityBlocks(M, loadLive());
  assert.deepEqual(blocks.map((b) => b.id), ['bc-events']);
  const b = blocks[0];
  assert.ok(b.source && b.attribution && b.asof && b.link, 'proof fields');
  assert.match(b.attribution, /Open Government Licence - British Columbia/);
  assert.deepEqual(b.items.map((i) => i.id), ['near', 'mid'], 'far (over 15 km) and expired are left out; nearest first');
});
test('BC stale data: the block is omitted (not shown empty)', () => { bcFixture({ ageMin: 400 }); assert.deepEqual(cityBlocks(M, loadLive()), []); });
test('BC licence row closed: the block is omitted', () => { bcFixture({ closed: true }); assert.deepEqual(cityBlocks(M, loadLive()), []); });
test('BC nothing near the city: block omitted', () => { bcFixture(); assert.deepEqual(cityBlocks({ ...M, lat: M.lat + 3 }, loadLive()), []); });
test('BC never gets Caltrans or NWS blocks, and California never gets bc-events, even when both files exist', () => {
  bcFixture({ withCa: true });
  assert.deepEqual(cityBlocks(M, loadLive()).map((b) => b.id), ['bc-events']);
  assert.ok(!cityBlocks({ ...M, region: 'california' }, loadLive()).some((b) => b.id === 'bc-events'));
  assert.deepEqual(cityBlocks({ ...M, region: 'ontario' }, loadLive()), [], 'an unknown region gets no live block');
});

test('built BC page: bc-events block has source, as-of, Updated text, count = list length, text escaped, no images; stale build drops it', () => {
  const { dir, env } = bcFixture();
  const p = join(dir, 'bc-events.json'); const j = JSON.parse(readFileSync(p, 'utf8'));
  j.items[1].text = '<script>alert(1)</script><img src=x onerror=alert(2)>'; writeFileSync(p, JSON.stringify(j));
  const html = build(env).get(missionRoute);
  const sec = html.match(/<section data-block="bc-events"[\s\S]*?<\/section>/);
  assert.ok(sec, 'block missing');
  assert.match(sec[0], /data-source="DriveBC Open511/); assert.match(sec[0], /data-asof="\d{4}-\d\d-\d\dT/); assert.match(sec[0], /Feed updated <time datetime="[^"]+">[^<]+<\/time>; page built <time datetime="\d{4}-\d\d-\d\dT[^"]+">[^<]+<\/time>; each item shows its own record time/);
  assert.equal(Number(sec[0].match(/data-rows="(\d+)"/)[1]), (sec[0].match(/<li>/g) || []).length);
  assert.ok(!html.includes('<script>alert(1)') && !/<img[^>]*onerror/i.test(html) && html.includes('&lt;script&gt;alert(1)'));
  assert.ok(sec[0].includes('/guides/how-drivebc-cameras-work/'));
  const stale = build(bcFixture({ ageMin: 400 }).env);
  for (const [route, h] of stale) assert.ok(!blocksOn(h).includes('bc-events'), `${route}: bc-events shown with stale data`);
  assert.match(stale.get('/cameras/canada/british-columbia/'), /older than its limit/);
});
