// Tests over the built site. Run `npm run build` first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DIST, SITE_URL, CAMERA_HOSTS, readPages, titleOf, isNoindex, sitemapViolations } from './helpers.mjs';
import { countsBy } from '../../ops/importers/lib/registry.mjs';

const pages = readPages();
const cameras = JSON.parse(readFileSync('../data/camera-registry/cameras.json', 'utf8'));
const cityRoutes = [...pages.keys()].filter((r) => r.split('/').filter(Boolean).length === 3 && r.startsWith('/cameras/'));

test('page count is 16-20', () => {
  const n = [...pages.keys()].filter((r) => r !== '/404/').length;
  assert.ok(n >= 16 && n <= 20, `built ${n} pages`);
});

test('every page: one h1, unique title, canonical, breadcrumb JSON-LD', () => {
  const titles = new Map();
  for (const [route, html] of pages) {
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${route}: h1 count`);
    const t = titleOf(html);
    assert.ok(t && t.length > 5, `${route}: title`);
    assert.ok(!titles.has(t), `${route}: duplicate title with ${titles.get(t)}`);
    titles.set(t, route);
    assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}${route}">`), `${route}: canonical`);
    assert.ok(html.includes('"@type":"BreadcrumbList"'), `${route}: breadcrumb`);
  }
});

test('descriptions are unique', () => {
  const seen = new Map();
  for (const [route, html] of pages) {
    const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    assert.ok(d, `${route}: description`);
    assert.ok(!seen.has(d), `${route}: same description as ${seen.get(d)}`);
    seen.set(d, route);
  }
});

test('no camera image or media on any page (link-out only)', () => {
  for (const [route, html] of pages) {
    assert.ok(!/<img\b/i.test(html), `${route}: has an <img>`);
    assert.ok(!/<(video|source|embed|object)\b/i.test(html), `${route}: has a media tag`);
    for (const m of html.matchAll(/<(?:img|iframe|script|link)\b[^>]*?(?:src|href)="([^"]+)"/gi)) {
      if (/<a\b/i.test(m[0])) continue;
      assert.ok(!CAMERA_HOSTS.some((h) => m[1].includes(h)), `${route}: loads ${m[1]}`);
    }
  }
});

test('no third-party scripts or fonts', () => {
  for (const [route, html] of pages) {
    for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)) assert.ok(m[1].startsWith('/'), `${route}: external script ${m[1]}`);
    assert.ok(!/fonts\.(googleapis|gstatic)/.test(html), `${route}: external fonts`);
  }
});

test('all internal links resolve to a built page', () => {
  for (const [route, html] of pages) {
    for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"/gi)) {
      const h = m[1];
      if (/^(https?:|mailto:|#)/.test(h)) continue;
      const target = h.split('#')[0].split('?')[0];
      assert.ok(pages.has(target), `${route}: broken link ${h}`);
    }
  }
});

test('city pages: title, intro, data-count and list all equal countsBy', () => {
  assert.equal(cityRoutes.length, 10);
  const byCity = countsBy(cameras, 'city');
  for (const route of cityRoutes) {
    const html = pages.get(route);
    const city = html.match(/<h1>([^<]*) traffic cameras<\/h1>/)[1];
    const n = byCity[city];
    assert.ok(n >= 3, `${route}: curated city needs 3 or more cameras`);
    assert.ok(titleOf(html).includes(`${city} traffic cameras: ${n} official links`), `${route}: title count`);
    assert.ok(html.includes(`<p>${n} Caltrans cameras are listed near`), `${route}: intro count`);
    assert.ok(html.includes(`data-count="${n}"`), `${route}: data-count`);
    assert.ok(html.includes(`All ${n} cameras`), `${route}: list heading`);
    const block = html.match(/<section data-block="cameras"[\s\S]*?<\/section>/)[0];
    assert.equal((block.match(/<li>/g) || []).length, n, `${route}: list length`);
    assert.ok(!isNoindex(html), `${route}: should be indexable`);
  }
});

test('road counts on a city page add up to the camera count', () => {
  for (const route of cityRoutes) {
    const html = pages.get(route);
    const n = Number(html.match(/data-count="(\d+)"/)[1]);
    const cov = html.match(/<section data-block="coverage"[\s\S]*?<\/section>/)[0];
    const sum = [...cov.matchAll(/: (\d+) cameras?[ (]/g)].reduce((s, m) => s + Number(m[1]), 0);
    const none = Number((cov.match(/>(\d+) cameras? ha(?:s|ve) no road/) || [0, 0])[1]);
    assert.equal(sum + none, n, `${route}: road counts`);
  }
});

test('health is honest when health.json is missing', () => {
  if (existsSync('../data/camera-registry/health.json')) return;
  for (const route of cityRoutes) assert.ok(pages.get(route).includes('Not checked yet'), `${route}: health text`);
});

test('no hub for a region with fewer than 3 cameras (Ontario, Alberta)', () => {
  const byRegion = countsBy(cameras, 'region');
  for (const slug of ['ontario', 'alberta']) {
    if ((byRegion[slug] || 0) < 3) assert.ok(!pages.has(`/cameras/${slug}/`), `${slug} hub built empty`);
  }
});

test('sitemap: only indexable pages, none noindex, real lastmod', () => {
  assert.deepEqual(sitemapViolations(), []);
  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  for (const m of xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) assert.match(m[1], /^\d{4}-\d{2}-\d{2}$/);
  const registryDate = cameras.map((c) => c.lastSeen).sort().at(-1).slice(0, 10);
  assert.ok(xml.includes(`<loc>${SITE_URL}/cameras/</loc><lastmod>${registryDate}</lastmod>`));
  assert.ok(readFileSync(join(DIST, 'robots.txt'), 'utf8').includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
});

test('failing fixture: the sitemap check catches a noindex page that is listed', () => {
  const d = mkdtempSync(join(tmpdir(), 'fx-'));
  mkdirSync(join(d, 'tiny'));
  writeFileSync(join(d, 'index.html'), '<title>a</title><h1>a</h1>');
  writeFileSync(join(d, 'tiny', 'index.html'), '<meta name="robots" content="noindex,follow"><title>b</title>');
  writeFileSync(join(d, 'sitemap.xml'), `<urlset><url><loc>${SITE_URL}/</loc></url><url><loc>${SITE_URL}/tiny/</loc></url></urlset>`);
  const v = sitemapViolations(d);
  assert.equal(v.length, 1);
  assert.match(v[0], /noindex page \/tiny\/ is in the sitemap/);
});

test('map page: works without JS, fallback when no engine, iframe src ends ?embed=1', () => {
  const map = pages.get('/map/');
  assert.ok(!/<iframe/.test(map) && map.includes('The map engine is not deployed yet'));
  assert.ok(!/<script\b(?![^>]*ld\+json)/.test(map), 'map page needs no JS');
  const out = mkdtempSync(join(tmpdir(), 'embed-'));
  execFileSync(process.execPath, ['node_modules/astro/astro.js', 'build', '--outDir', out], { env: { ...process.env, PUBLIC_GEV_EMBED_URL: 'https://gev.example/app?x=1#h' }, stdio: 'pipe' });
  const built = readFileSync(join(out, 'map', 'index.html'), 'utf8');
  const src = built.match(/<iframe[^>]*\bsrc="([^"]+)"/)[1];
  assert.equal(src, 'https://gev.example/app?embed=1');
  assert.match(built, /<iframe[^>]*sandbox="allow-scripts allow-same-origin"/);
});

test('map page links to every region hub and city page', () => {
  const map = pages.get('/map/');
  for (const r of pages.keys()) {
    if (r === '/map/' || r === '/' || r === '/404/' || r === '/cameras/') continue;
    if (r.startsWith('/cameras/')) assert.ok(map.includes(`href="${r}"`), `/map/ does not link ${r}`);
  }
});
