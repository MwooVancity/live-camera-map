// Shared helpers for tests over the built site (dist/).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const DIST = resolve(process.cwd(), 'dist');
export const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://nearbycams.example').replace(/\/$/, '');
export const CAMERA_HOSTS = ['cwwp2.dot.ca.gov', 'wzmedia.dot.ca.gov', 'drivebc.ca'];

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}

// Map of route -> html for every built page.
export function readPages(dist = DIST) {
  const pages = new Map();
  for (const f of walk(dist)) {
    const route = f.slice(dist.length).replace(/\\/g, '/').replace(/index\.html$/, '');
    const r = route.startsWith('/') ? route : '/' + route;
    pages.set(r === '/404.html' ? '/404/' : r, readFileSync(f, 'utf8'));
  }
  return pages;
}

export const isNoindex = (html) => /<meta[^>]+name="robots"[^>]+noindex/i.test(html);
export const titleOf = (html) => (html.match(/<title>([^<]*)<\/title>/) || [])[1];
export const sitemapRoutes = (dist = DIST) => {
  const f = join(dist, 'sitemap.xml');
  if (!existsSync(f)) return [];
  return [...readFileSync(f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE_URL, ''));
};

// Returns violations: a noindex page listed in the sitemap, or an indexable page missing from it.
export function sitemapViolations(dist = DIST) {
  const pages = readPages(dist);
  const listed = new Set(sitemapRoutes(dist));
  const v = [];
  for (const [route, html] of pages) {
    if (route === '/404/') { if (listed.has(route)) v.push(`${route} is in the sitemap`); continue; }
    if (isNoindex(html) && listed.has(route)) v.push(`noindex page ${route} is in the sitemap`);
    if (!isNoindex(html) && !listed.has(route)) v.push(`indexable page ${route} is missing from the sitemap`);
  }
  for (const r of listed) if (!pages.has(r)) v.push(`sitemap lists ${r} which was not built`);
  return v;
}
