// Search build and loader tests. Run from site/: node --test tests/search.test.mjs
// Rules: search-size-budget, search-manifest, search-lazy, search-country-region, search-no-camera-pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildEntries, validateEntries, pageRoutes } from '../src/lib/search-index.mjs';
import { packIndex, sizeGate, writeIndex, verifyIndex, BUDGET_BYTES } from '../scripts/build-search.mjs';
import { createLoader, MAX_FALLBACK_SHARDS } from '../src/lib/search-core.mjs';
import { parseMapParams, gevHash, nearest, altFromZoom } from '../src/lib/map-params.mjs';
import { nextIndex } from '../src/lib/search-ui.mjs';

const cams = JSON.parse(readFileSync('../data/camera-registry/cameras.json', 'utf8'));
const entries = buildEntries(cams);
const tmp = () => mkdtempSync(join(tmpdir(), 'srch-'));

// ---- entries ----
test('real entries are valid: unique ids, coordinates, country and region on every one, only built pages, never a per-camera page', () => {
  assert.deepEqual(validateEntries(entries, pageRoutes(cams)), []);
  for (const e of entries) assert.ok(e.country && e.region, e.id);
});
test('failing fixture: validateEntries catches a duplicate id, a missing region, a link to an unbuilt page and a per-camera page', () => {
  const ok = entries.find((e) => e.kind === 'city');
  const bad = [ok, { ...ok }, { ...ok, id: 'x1', region: '' }, { ...ok, id: 'x2', url: '/cameras/united-states/california/nowhere/' }, { ...ok, id: 'x3', url: '/cameras/united-states/california/anaheim/cam-1/' }];
  const p = validateEntries(bad, pageRoutes(cams)).join('\n');
  for (const re of [/duplicate id/, /missing country or region/, /not a built page/, /per-camera page/]) assert.match(p, re);
});
test('entries per kind add up to the registry: one camera entry per usable camera, a city or town for each named place', () => {
  const by = (k) => entries.filter((e) => e.kind === k).length;
  assert.equal(by('camera'), cams.length);
  assert.equal(by('city') + by('town'), new Set(cams.filter((c) => c.city).map((c) => `${c.regionSlug}|${c.city}`)).size);
});
test('town entries link to the map position only; cameras link to a city page, a road page or the official source', () => {
  for (const e of entries.filter((x) => x.kind === 'town')) assert.match(e.url, /^\/map\/\?lat=-?\d+\.\d+&lon=-?\d+\.\d+&z=11$/);
  for (const e of entries.filter((x) => x.kind === 'camera')) assert.ok(/^\/(cameras|roads)\//.test(e.url) || /^https:\/\//.test(e.url), e.url);
});

// ---- build output: manifest, hashes, determinism, atomic ----
test('build writes a manifest that points only to existing files with matching hashes and sizes, and nothing else sits in the folder', () => {
  const out = join(tmp(), 'search'); writeIndex(entries, out);
  assert.deepEqual(verifyIndex(out), []);
  const m = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
  assert.equal(m.shards.length, new Set(entries.map((e) => e.countrySlug)).size, 'one shard per country'); assert.match(m.global.file, /^global\.[0-9a-f]{12}\.json$/);
});
test('failing fixture: a missing file, a changed byte and a stray file are each reported by verifyIndex', () => {
  const out = join(tmp(), 'search'); writeIndex(entries, out);
  const m = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
  writeFileSync(join(out, 'stray.json'), '{}'); rmSync(join(out, m.shards[0].file)); writeFileSync(join(out, m.global.file), '{"rows":[]}');
  const p = verifyIndex(out).join('\n');
  for (const re of [/does not exist/, /hash does not match/, /stray\.json is in the folder but not in the manifest/]) assert.match(p, re);
  assert.deepEqual(verifyIndex(join(tmp(), 'nothing')), ['no manifest.json']);
});
test('build is deterministic: the same entries give byte-identical files and manifest', () => {
  const a = packIndex(entries), b = packIndex([...entries].reverse());
  assert.deepEqual([...a.files.keys()], [...b.files.keys()]); assert.deepEqual(a.manifest, b.manifest);
});
test('an over-budget build throws with the numbers and leaves the old folder and manifest untouched', () => {
  const out = join(tmp(), 'search'); writeIndex(entries, out);
  const before = readFileSync(join(out, 'manifest.json'), 'utf8'), names = readdirSync(out).sort();
  assert.throws(() => writeIndex(entries, out, (m) => ({ ...sizeGate(m), ok: false, budget: 1 })), /over budget: first search \d+ B gzip/);
  assert.equal(readFileSync(join(out, 'manifest.json'), 'utf8'), before); assert.deepEqual(readdirSync(out).sort(), names); assert.ok(!existsSync(out + '.tmp'));
});
test('size gate: real index is under the 300 KB first-search budget (measured numbers printed)', () => {
  const g = sizeGate(packIndex(entries).manifest);
  console.log(`REAL first search gzip: manifest ${g.manifestGzip} + global ${g.globalGzip} + largest shard ${g.largestShardGzip} = ${g.total} B of ${g.budget}`);
  assert.ok(g.ok); assert.equal(g.budget, BUDGET_BYTES);
});
test('failing fixture: sizeGate fails when the largest shard does not fit', () => {
  const m = { global: { gzip: 100 * 1024 }, shards: [{ gzip: 150 * 1024 }, { gzip: 260 * 1024 }] };
  const g = sizeGate(m); assert.equal(g.ok, false); assert.ok(g.total > BUDGET_BYTES);
});

// ---- synthetic 200,000 entries: MEASURED, not tuned. Only the gate's own arithmetic is asserted, never that it passes. ----
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const W = 'Main Oak Pine Cedar Elm Maple Harbor River Lake Hill Valley Ridge Mill Bridge Church Market Park Station Airport Mission Grand Union Central North South East West Old New First Second Third Fourth Spring Summer Fall Mountain Canyon Creek Ford Bay Point Beach Forest Meadow Orchard School College Hospital Plaza Square Junction Overpass Tunnel Ramp Exit Interchange'.split(' ');
function synthetic(total, nCountries, seed = 7) {
  const r = rng(seed), pick = () => W[Math.floor(r() * W.length)], out = [];
  for (let i = 0; i < total; i++) {
    const c = i % nCountries, slug = `country-${c}`, road = `${['I', 'SR', 'US'][Math.floor(r() * 3)]}-${1 + Math.floor(r() * 900)}`;
    const town = `${pick()} ${pick()}`, name = `${road} : (${Math.floor(r() * 999)}) ${pick()} ${pick()} - Looking ${['North', 'South', 'East', 'West'][Math.floor(r() * 4)]}`;
    const lat = Math.round((r() * 140 - 70) * 1e5) / 1e5, lon = Math.round((r() * 340 - 170) * 1e5) / 1e5;
    const kind = i % 100 === 0 ? 'city' : i % 10 === 0 ? 'town' : 'camera';
    out.push(kind === 'camera'
      ? { id: `src${c}-${i}`, kind, name, norm: name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), countrySlug: slug, country: `Country ${c}`, region: `Region ${i % 40}`, road, lat, lon, url: `https://cams.example.gov/c${c}/image/${i}/still.jpg` }
      : { id: `${kind}-${c}-${i}`, kind, name: town, norm: town.toLowerCase(), countrySlug: slug, country: `Country ${c}`, region: `Region ${i % 40}`, road: '', lat, lon, url: kind === 'city' ? `/cameras/${slug}/region-${i % 40}/${town.toLowerCase().replace(/ /g, '-')}-${i}/` : `/map/?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&z=11` });
  }
  return out;
}
for (const [label, countries] of [['all 200,000 in ONE country (worst case: one shard)', 1], ['200,000 spread over 20 countries (10,000 each)', 20]]) {
  test(`synthetic 200k, ${label}: measured gzip sizes`, { timeout: 300000 }, () => {
    const t0 = Date.now(), { manifest, files } = packIndex(synthetic(200000, countries)), g = sizeGate(manifest);
    const big = Math.max(...manifest.shards.map((s) => s.bytes));
    console.log(`SYNTHETIC 200k / ${countries} country shard(s): entries ${manifest.entries}; manifest ${g.manifestGzip} B gzip; global lookup ${manifest.global.bytes} B raw, ${manifest.global.gzip} B gzip; largest shard ${big} B raw, ${g.largestShardGzip} B gzip; first search ${g.total} B gzip vs budget ${g.budget}: ${g.ok ? 'WITHIN' : 'OVER'} budget; pack took ${Date.now() - t0} ms; files ${files.size}`);
    assert.equal(manifest.entries, 200000); assert.equal(g.ok, g.total <= BUDGET_BYTES); assert.equal(g.total, g.manifestGzip + g.globalGzip + g.largestShardGzip);
  });
}

// ---- loader: no network before focus (stub fetch) ----
function stubFetch() {
  const dir = join(tmp(), 'search'); writeIndex(entries, dir);
  const calls = []; const f = async (u) => { calls.push(u); const p = join(dir, u.replace('/search/', '')); return existsSync(p) ? { ok: true, status: 200, json: async () => JSON.parse(readFileSync(p, 'utf8')) } : { ok: false, status: 404 }; };
  return { f, calls };
}
test('no network call before focus: creating the loader and even a query-less object fetch nothing', () => { const { f, calls } = stubFetch(); const l = createLoader(f); assert.deepEqual(calls, []); assert.deepEqual(l.loaded(), { manifest: false, shards: [] }); });
test('failing fixture of the guard: query() without focus first would fetch, so the first fetch must be the manifest and only after focus()', async () => {
  const { f, calls } = stubFetch(), l = createLoader(f);
  await l.focus();
  assert.deepEqual(calls.slice(0, 1), ['/search/manifest.json']); assert.equal(calls.length, 2); assert.match(calls[1], /^\/search\/global\./);
  assert.ok(!calls.some((c) => c.includes('shard-')), 'focus alone must not fetch a country shard');
  await l.focus(); assert.equal(calls.length, 2, 'a second focus fetches nothing');
});
test('a country shard is fetched only when a query needs it, and only once', async () => {
  const { f, calls } = stubFetch(), l = createLoader(f); await l.focus();
  const r = await l.query('i-405'); assert.equal(r[0].url, '/roads/i-405/');
  const shards = () => calls.filter((c) => c.includes('shard-'));
  assert.equal(shards().length, 1); assert.match(shards()[0], /shard-united-states/);
  await l.query('i-405'); await l.query('santa'); assert.equal(shards().length, 1);
});
test('a query with no country hint reads at most MAX_FALLBACK_SHARDS shards, and finds a town that has no page', async () => {
  const { f, calls } = stubFetch(), l = createLoader(f); await l.focus();
  const r = await l.query('britannia'); assert.equal(r[0].kind, 'town');
  assert.ok(calls.filter((c) => c.includes('shard-')).length <= MAX_FALLBACK_SHARDS);
});
test('loader results always carry country and region (global rows and shard rows)', async () => {
  const { f } = stubFetch(), l = createLoader(f); await l.focus();
  for (const q of ['california', 'canada', 'elkford', 'i-5', 'britannia', 'creek']) for (const r of await l.query(q)) assert.ok(r.country && r.region, `${q}: ${JSON.stringify(r)}`);
});
test('a failed fetch rejects, and the next focus tries again (no stuck state)', async () => {
  let fail = true; const { f } = stubFetch(), l = createLoader(async (u) => (fail ? { ok: false, status: 500 } : f(u)));
  await assert.rejects(l.focus(), /500/); fail = false; await l.focus(); assert.ok(l.loaded().manifest);
});
test('an unknown manifest version is refused', async () => assert.rejects(createLoader(async () => ({ ok: true, status: 200, json: async () => ({ version: 99 }) })).focus(), /unknown manifest version/));

// ---- UI helper, map params ----
test('keyboard: arrows wrap, other keys keep the index, no results = -1', () => {
  assert.equal(nextIndex(-1, 'ArrowDown', 3), 0); assert.equal(nextIndex(2, 'ArrowDown', 3), 0); assert.equal(nextIndex(0, 'ArrowUp', 3), 2); assert.equal(nextIndex(-1, 'ArrowUp', 3), 2);
  assert.equal(nextIndex(1, 'a', 3), 1); assert.equal(nextIndex(1, 'ArrowDown', 0), -1);
});
test('map params: valid values parse; out-of-range, text and injection are refused', () => {
  assert.deepEqual(parseMapParams('?lat=49.6239&lon=-123.2062&z=11'), { lat: 49.6239, lon: -123.2062, z: 11 });
  assert.deepEqual(parseMapParams('?lat=1&lon=2'), { lat: 1, lon: 2, z: 11 });
  for (const bad of ['', '?lat=91&lon=0', '?lat=0&lon=181', '?lat=abc&lon=0', '?lat=1&lon=2&z=99', '?lat=1&lon=2&z=0', '?lat=1e3&lon=2', '?lat=1&lon=2&z=<script>', '?lat=1&lat=2']) assert.equal(parseMapParams(bad), null, bad);
});
test('GEV hash: the verified form #v=2&lat=&lon=&alt= (format read in gev/scripts/qa-stories.mjs)', () => {
  const h = gevHash({ lat: 49.6239, lon: -123.2062, z: 11 }); assert.match(h, /^#v=2&lat=49\.6239&lon=-123\.2062&alt=\d+$/);
  assert.ok(altFromZoom(49, 5) > altFromZoom(49, 11)); assert.ok(altFromZoom(0, 20) >= 200);
});
test('nearest: closest first, at most n', () => {
  const items = [['Far', '/f/', 10, 10, 'city'], ['Near', '/n/', 1.01, 1.01, 'city'], ['Mid', '/m/', 2, 2, 'road']];
  assert.deepEqual(nearest(items, { lat: 1, lon: 1 }, 2).map((x) => x.i[0]), ['Near', 'Mid']);
});

// ---- the built site (only when dist/ exists: npm run build first) ----
test('built site: every page has the search box and the index files are in dist/search', { skip: !existsSync('dist/search/manifest.json') }, () => {
  assert.deepEqual(verifyIndex('dist/search'), []);
  const home = readFileSync('dist/index.html', 'utf8');
  assert.match(home, /role="search"/); assert.match(home, /type="search"/); assert.match(home, /<noscript>[^]*href="\/cameras\/"[^]*href="\/roads\/"[^]*<\/noscript>/);
});

test('search box and result rows are at least 44px tall (phone tap target)', () => {
  const css = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');
  assert.match(css, /#site-search input \{[^}]*min-height:44px/);
  assert.match(css, /#site-search li a \{[^}]*min-height:44px/);
});

test('hostile map parameters are rejected, never passed on', () => {
  for (const s of ['?lat=NaN&lon=1', '?lat=1e5&lon=1', '?lat=<script>&lon=1', '?lat=1&lon=2&z=99', '?lat=Infinity&lon=2', '?lat=0x10&lon=2', '?lat=%201&lon=2']) assert.equal(parseMapParams(s), null, s);
});

// ---- sub-folder hosting (staging on GitHub Pages): the live test in Chrome found root-relative fetches 404 under /live-camera-map/ ----
import { withBase, cleanBase } from '../src/lib/search-ui.mjs';
test('withBase prefixes root-relative paths only', () => {
  assert.equal(withBase('/live-camera-map', '/cameras/'), '/live-camera-map/cameras/');
  assert.equal(withBase('', '/cameras/'), '/cameras/');
  assert.equal(withBase('/live-camera-map', 'https://example.org/x'), 'https://example.org/x');
  assert.equal(withBase('/live-camera-map', '//evil.example/x'), '//evil.example/x');
});
test('cleanBase accepts one simple folder name and nothing else', () => {
  assert.equal(cleanBase('/live-camera-map'), '/live-camera-map');
  for (const bad of ['', undefined, 'live', '/a/b', 'javascript:alert(1)', '//evil.example', '/"><script>']) assert.equal(cleanBase(bad), '');
});
test('the loader fetches under the declared base, nothing before focus', async () => {
  const seen = [];
  const f = async (u) => { seen.push(u); return { ok: true, json: async () => ({ version: 1, global: { file: 'g.json' }, shards: [], rows: [] }) }; };
  const l = createLoader(f, '/live-camera-map/search/');
  assert.deepEqual(seen, []);
  await l.focus().catch(() => {});
  assert.ok(seen.length && seen.every((u) => String(u).startsWith('/live-camera-map/search/')), JSON.stringify(seen));
});
