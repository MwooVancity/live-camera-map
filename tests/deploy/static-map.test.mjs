// Run: node --test tests/deploy/static-map.test.mjs
// The static map build (ops/deploy/build-static-map.mjs) on a tiny fake upstream checkout in a temp folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { buildStaticMap, CAMERA_CAP, cctvSources, RESTRICTED_SOURCES } from '../../ops/deploy/build-static-map.mjs';

const SECRET = Array.from({ length: 40 }, (_, i) => [85.123456 + i, 28.654321 + i]);
const put = (root, p, text) => { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), text); };
function fake(extra = {}) {
  const base = mkdtempSync(join(tmpdir(), 'staticmap-')), up = join(base, 'up'), out = join(base, 'out');
  for (const [i, dir] of RESTRICTED_SOURCES.entries()) put(up, `${dir}/data${i}.json`, JSON.stringify(SECRET.map(([a, b]) => [a + i * 100, b + i * 100])));
  const files = { 'index.html': '<title>x</title>', 'assets/index-AAAAAAAA.js': 'ok()', 'assets/cable-geo-AAAAAAAA.json': '{}', 'assets/imagingSensors-AAAAAAAA.js': 'x', 'events/e/event.json': '{}', ...extra };
  for (const [p, t] of Object.entries(files)) put(up, `dist/${p}`, t);
  return { base, up, out, done: () => rmSync(base, { recursive: true, force: true }) };
}
const row = (id, source = 's1', url = 'https://agency.example/cam') => ({ camera_id: id, name: id, city: '', region: 'R', source_id: source, source_name: 'N', lat: 1, lon: 2, official_url: url, licence: 'L', attribution: 'A' });
const build = (f, launch) => buildStaticMap({ gevDir: f.up, outDir: f.out, launch, rows: [row('s1-1')] });

test('restricted files and events/ are removed; headers, 404, robots and camera file are written', () => {
  const f = fake(); build(f, '');
  for (const p of ['assets/cable-geo-AAAAAAAA.json', 'assets/imagingSensors-AAAAAAAA.js', 'events']) assert.ok(!existsSync(join(f.out, p)), p);
  const h = readFileSync(join(f.out, '_headers'), 'utf8');
  assert.match(h, /X-Robots-Tag: noindex/);
  assert.match(h, /frame-ancestors https:\/\/worldtrafficcameras\.com https:\/\/www\.worldtrafficcameras\.com https:\/\/worldtrafficcameras\.pages\.dev/);
  const page = readFileSync(join(f.out, 'index.html'), 'utf8');
  assert.match(page, /<meta http-equiv="Content-Security-Policy" content="default-src 'self';[^"]*connect-src 'self'/);
  assert.doesNotMatch(page + h, /open-meteo|gbif|google\.com|news\./, 'restricted hosts are not in the CSP allowlist');
  assert.equal(JSON.parse(readFileSync(join(f.out, 'api/military-installations'), 'utf8')).unavailable, true);
  assert.ok(h.split('\n').every((l) => l.length <= 2000), 'Cloudflare Pages line limit');
  assert.match(h, /\/api\/cctv\/sources\n {2}Content-Type: application\/json/);
  assert.match(readFileSync(join(f.out, 'robots.txt'), 'utf8'), /Disallow: \//);
  assert.ok(existsSync(join(f.out, '404.html')));
  assert.equal(JSON.parse(readFileSync(join(f.out, 'api/cctv/sources'), 'utf8')).sources.length, 1);
  f.done();
});

test('only LAUNCH exactly "live" removes noindex', () => {
  const f = fake(); build(f, 'live');
  assert.doesNotMatch(readFileSync(join(f.out, '_headers'), 'utf8'), /noindex/);
  build(f, 'LIVE');
  assert.match(readFileSync(join(f.out, '_headers'), 'utf8'), /noindex/);
  f.done();
});

test('restricted content under another name fails the build (copy, or data inlined in a bundle)', () => {
  for (const extra of [{ 'assets/innocent.bin': JSON.stringify(SECRET) }, { 'assets/index-BBBBBBBB.js': `const p=${JSON.stringify(SECRET.slice(0, 30))};` }]) {
    const f = fake(extra);
    assert.throws(() => build(f, ''), /restricted content in output/);
    f.done();
  }
});

test('a missing restricted source folder fails closed (upstream moved it: the content check would be blind)', () => {
  const f = fake(); rmSync(join(f.up, RESTRICTED_SOURCES[0]), { recursive: true });
  assert.throws(() => build(f, ''), /cannot check content/);
  f.done();
});

test('camera file: metadata and an https link only, nothing the map would fetch a picture for; the cap keeps every source', () => {
  const rows = [row('a-1', 'a'), row('a-2', 'a'), row('a-3', 'a'), row('b-1', 'b'), row('c-1', 'c', 'http://agency.example/x')];
  const { sources } = cctvSources(rows, 3);
  assert.deepEqual(sources.map((s) => s.id), ['a-1', 'b-1', 'a-2']);
  for (const s of sources) {
    assert.ok(s.sourceKind.startsWith('quebec-'), 'the client asks for no frame only for this prefix');
    assert.equal(s.browserMediaUrl, '');
    assert.ok(!('url' in s) && !('snapshotUrl' in s));
    assert.match(s.sourceUrl, /^https:/);
  }
});

test('real registry: rows come from the CSV licence gate and stay under the cap', () => {
  const f = fake(); const r = buildStaticMap({ gevDir: f.up, outDir: f.out });
  assert.ok(r.cameras > 8000, JSON.stringify(r));
  assert.ok(r.cameras >= r.eligible * 0.95 && r.eligible < CAMERA_CAP, `the map drops cameras: ${JSON.stringify(r)}`);
  f.done();
});

test('real registry: no camera credit shows internal approval wording to visitors', () => {
  const sources = JSON.parse(readFileSync(new URL('../../data/camera-registry/sources.json', import.meta.url), 'utf8'));
  for (const s of sources.sources || sources) assert.doesNotMatch(s.attribution || '', /site owner|owner's approval/i, s.id || s.source_id);
});

test('every layer host in the content policy has an enabled licence row', async () => {
  const { MAP_LAYER_HOSTS } = await import('../../site/src/lib/privacy-facts.mjs');
  const { isEnabled } = await import('../licensing/gate.mjs');
  const { CSP } = await import('../../ops/deploy/build-static-map.mjs');
  const rows = JSON.parse(readFileSync(new URL('../../data/source-permissions.json', import.meta.url), 'utf8')).sources;
  for (const h of MAP_LAYER_HOSTS) {
    assert.ok(isEnabled(rows.find((r) => r.id === h.permId), new Date()), `${h.host}: row ${h.permId} is not enabled`);
    assert.ok(CSP.includes(`https://${h.host}`), h.host);
  }
});

test('layer snapshots: only a good, fresh answer is written; a bad one never stops the others', async () => {
  const { writeSnapshots, SNAPSHOTS } = await import('../../ops/deploy/gev-snapshots.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'snap-'));
  const plugin = (route, body, status = 200) => () => ({ configurePreviewServer: ({ middlewares }) => middlewares.use(route, async (req, res) => { res.writeHead(status); res.end(JSON.stringify(body)); }) });
  const bodies = { '/api/cyclones': { storms: [], unavailable: true }, '/api/fire-perimeters': { fetchedAt: 1, rows: [] } };
  const load = async (s) => ({ [s.factory]: bodies[s.route] ? plugin(s.route, bodies[s.route]) : plugin(s.mount || s.route, {}, 502) });
  const r = await writeSnapshots('unused', dir, { load });
  assert.deepEqual(r.written, ['/api/fire-perimeters']);
  assert.equal(r.skipped.length, SNAPSHOTS.length - 1);
  assert.ok(!existsSync(join(dir, 'api', 'cyclones')));
  const closed = await writeSnapshots('unused', dir, { load, rows: [] });
  assert.equal(closed.written.length, 0, 'no licence row, no file');
  assert.equal(closed.skipped.length, SNAPSHOTS.length);
  rmSync(dir, { recursive: true, force: true });
});

test('layer snapshots: an old cached copy or an empty answer is refused', async () => {
  const { problemWith } = await import('../../ops/deploy/gev-snapshots.mjs');
  assert.ok(problemWith({ status: 200, body: '1 x', headers: { 'x-tle-cache': 'STALE-ERROR' } }, true));
  assert.ok(problemWith({ status: 200, body: '' }, true));
  assert.equal(problemWith({ status: 200, body: '1 x' }, true), '');
});

test('the built map carries our name; GEV licence ships beside it', async () => {
  const { rebrand } = await import('../../ops/deploy/build-static-map.mjs');
  assert.equal(rebrand(`[ee("GOD'S EYE "),Z("span",{class:"title-accent"},"VIEW")]`), `[ee("WORLD TRAFFIC "),Z("span",{class:"title-accent"},"CAMERAS")]`);
  assert.equal(rebrand(`[r("GOD'S EYE "),t("b",null,"VIEW")]`), `[r("WORLD TRAFFIC "),t("b",null,"CAMERAS")]`);
  assert.equal(rebrand('<title>God\'s Eye View</title>'), '<title>World Traffic Cameras</title>');
});

test('Data Library: only browser-direct, non-opt-in entries with an enabled row open their hosts', async () => {
  const { libraryHosts } = await import('../../ops/deploy/build-static-map.mjs');
  const base = mkdtempSync(join(tmpdir(), 'lib-'));
  const e = (id, extra) => put(base, `src/library/entries/${id}.json`, JSON.stringify({ id, kind: 'tiles', source: { url: `https://${id}.example/{z}/{x}/{y}.png`, fetch: 'browser-direct' }, licence: { url: 'https://licence.example/' }, ...extra }));
  e('ok'); e('nrow'); e('optin', { licence: { operatorOptIn: true } }); e('proxied', { source: { url: 'https://proxied.example/', fetch: 'proxy' } });
  const rows = ['ok', 'optin', 'proxied'].map((id) => ({ id, name: `X (${id}, host)`, enabled: true, commercialStatus: 'allowed_per_doc', attribution: 'Credit line', provenance: 'p', licence: 'L', reviewedAt: new Date().toISOString() }));
  const r = libraryHosts(base, rows);
  assert.deepEqual(r.open, ['ok']);
  assert.deepEqual(r.closed, ['nrow']);
  assert.ok(r.hosts.includes('https://ok.example') && !r.hosts.some((h) => /licence|nrow|optin|proxied/.test(h)), r.hosts.join(' '));
  rmSync(base, { recursive: true, force: true });
});

test('share links resolve, "no server" probes answer, and the Nepal story is stubbed out', async () => {
  const { REDIRECTS, STATIC_ANSWERS, rebrand } = await import('../../ops/deploy/build-static-map.mjs');
  const { STUBS } = await import('../../ops/deploy/gev-static.vite.config.mjs');
  assert.match(REDIRECTS, /^\/share\/\* \/ 200/);
  assert.equal(STATIC_ANSWERS['/api/geocode/status'].configured, false);
  assert.match(STUBS['/src/scenes/nepalEvidencePack.js'], /return null/);
  assert.equal(rebrand('ENTER GOD MODE'), 'EXPLORE THE MAP');
});

test('Mapillary: no token, no redirects; with one, z11-13 go to Mapillary and z14 is answered empty', async () => {
  const { mapillaryRedirects, STATIC_ANSWERS } = await import('../../ops/deploy/build-static-map.mjs');
  assert.equal(mapillaryRedirects(''), '');
  const r = mapillaryRedirects('MLY|1|a');
  assert.match(r, /^\/api\/mapillary\/tiles\/coverage\/11\/:x\/:y https:\/\/tiles\.mapillary\.com\/maps\/vtp\/mly1_public\/2\/11\/:x\/:y\?access_token=MLY%7C1%7Ca 302$/m);
  assert.match(r, /coverage\/14\/\* \/api\/mapillary\/empty 200/);
  assert.doesNotMatch(r, /\/2\/14\//, 'untrimmed z14 tiles are never sent');
  assert.equal(STATIC_ANSWERS['/api/mapillary/status'].configured, false);
});
