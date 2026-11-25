// Pins every claim on /privacy/ to the code and the built site. Run `npm run build` first. If one of these fails, the facts changed: update the page (and its date), not the test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DIST, SITE_URL } from './helpers.mjs';
import { MAP_BROWSER_HOSTS } from '../src/lib/privacy-facts.mjs';

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const privacy = readFileSync(join(DIST, 'privacy', 'index.html'), 'utf8');
const OWN = new URL(SITE_URL).hostname;
// Format identifiers, not requests.
const NAMESPACES = ['schema.org', 'www.w3.org', 'www.sitemaps.org'];
// Hosts inside the built site, excluding <a> tags (links the visitor clicks are not requests) and the CSV downloads (they list official camera links as data).
export function externalHosts(dist) {
  const found = new Map();
  for (const f of walk(dist)) {
    if (!/\.(html|js|mjs|css|xml|txt|svg|webmanifest)$/i.test(f)) continue; // .json and .csv are data: search shards and downloads hold official camera links, which a visitor only follows by clicking
    let t = readFileSync(f, 'utf8');
    if (f.endsWith('.html')) t = t.replace(/<a\s[^>]*>/gi, '');
    for (const m of t.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
      const h = m[1].toLowerCase();
      if (h !== OWN && !NAMESPACES.includes(h)) found.set(h, f);
    }
  }
  return found;
}

test('no cookie is written by any built page or script', () => {
  for (const f of walk(DIST)) {
    if (!/\.(html|js|mjs)$/i.test(f)) continue;
    const t = readFileSync(f, 'utf8');
    assert.ok(!/document\s*\.\s*cookie\s*=/.test(t) && !/set-cookie/i.test(t), `${f}: writes a cookie`);
  }
});

test('no external script, stylesheet, font, image, frame or media request outside the map frame', () => {
  for (const f of walk(DIST).filter((x) => x.endsWith('.html'))) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/<(script|link|img|source|video|audio|embed|object|iframe)\b[^>]*?\b(?:src|href|data)="(https?:)?\/\/([^"/]+)[^"]*"/gi)) {
      if (m[1].toLowerCase() === 'link' && /rel="(canonical|alternate)"/i.test(m[0])) continue;
      if (m[1].toLowerCase() === 'iframe') continue; // the map frame: its host is set by PUBLIC_GEV_EMBED_URL and is covered by the map-engine section (see the next test)
      assert.fail(`${f}: ${m[1]} loads from ${m[3]}`);
    }
    assert.ok(!/@import\s+url\(\s*['"]?https?:/i.test(t) && !/url\(\s*['"]?https?:/i.test(t), `${f}: CSS loads an outside url`);
  }
});

test('every external host found anywhere in the built site is named on the privacy page (today: none)', () => {
  const hosts = externalHosts(DIST);
  const missing = [...hosts].filter(([h]) => !privacy.includes(h));
  assert.deepEqual(missing.map(([h, f]) => `${h} in ${f}`), []);
  assert.ok(privacy.includes('We set no cookies on our own pages today'));
});

test('the iframe on /map/, if built, is the only frame and takes its host from PUBLIC_GEV_EMBED_URL', () => {
  const src = readFileSync(resolve('src/pages/map/index.astro'), 'utf8');
  assert.equal((src.match(/<iframe/g) || []).length, 1);
  assert.ok(/PUBLIC_GEV_EMBED_URL/.test(src));
  for (const f of walk(DIST).filter((x) => x.endsWith('.html') && !/[\\/]map[\\/]index\.html$/.test(x))) assert.ok(!/<iframe/i.test(readFileSync(f, 'utf8')), `${f}: a frame outside /map/`);
});

test('the privacy page lists every map-engine host, and the engine files still name them (when gev/ is present)', () => {
  for (const h of MAP_BROWSER_HOSTS) assert.ok(privacy.includes(`<code>${h.host}</code>`), `page lacks ${h.host}`);
  const gev = resolve('../gev');
  if (!existsSync(join(gev, 'index.html'))) return; // gev/ is a separate clone, absent in some CI checkouts: the page-side checks above still run
  for (const h of MAP_BROWSER_HOSTS) assert.ok(readFileSync(join(gev, h.file), 'utf8').includes(h.host), `${h.file} no longer names ${h.host}: the page may be wrong`);
});

test('near-me and saved cameras: no network call; only the search loader fetches, from our own files', () => {
  const home = readFileSync(resolve('src/pages/index.astro'), 'utf8');
  const near = home.slice(home.indexOf('navigator.geolocation'), home.indexOf('</script>', home.indexOf('navigator.geolocation')));
  assert.ok(near.includes('getCurrentPosition'));
  assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|Image\s*\(|localStorage|sessionStorage|\.cookie/.test(near), 'the near-me code sends or stores something');
  const saved = readFileSync(resolve('src/scripts/saved.ts'), 'utf8');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/.test(saved) && /const KEY = 'wtc-saved-cameras-v1'/.test(saved), 'saved cameras are local only, one key');
  const users = [];
  for (const f of walk(resolve('src')).filter((x) => /\.(astro|mjs|ts|js)$/.test(x))) if (/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(readFileSync(f, 'utf8').replace(/\/\/.*$/gm, ''))) users.push(f.split(/[\\/]src[\\/]/)[1].replace(/\\/g, '/'));
  assert.deepEqual(users.sort(), ['lib/search-ui.mjs'], 'a new file makes network requests: say so on /privacy/');
});

test('the page is built, linked from the footer of every page, in the sitemap, and does not name the competitor', () => {
  assert.ok(!/argos/i.test(privacy));
  for (const f of walk(DIST).filter((x) => x.endsWith('.html'))) assert.ok(/<a href="\/privacy\/"[^>]*>Privacy<\/a>/.test(readFileSync(f, 'utf8')), `${f}: no footer link`);
  assert.ok(readFileSync(join(DIST, 'sitemap.xml'), 'utf8').includes(`${SITE_URL}/privacy/`), 'in the sitemap');
  assert.ok(/A contact address will be published here/.test(privacy) && !/@[a-z0-9-]+\.[a-z]{2,}/i.test(privacy.replace(/<[^>]*>/g, ' ')), 'no invented address');
});
