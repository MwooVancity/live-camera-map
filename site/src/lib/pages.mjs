// Pure helpers (no Astro): page list, noindex gate, sitemap. Tested with fixtures in tests/gate.test.mjs.
import { countsBy, roadSlug } from '../../../ops/importers/lib/registry.mjs';
import { MIN_CAMERAS } from '../config.mjs';

export const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The one noindex rule.
export const isIndexable = (count) => count >= MIN_CAMERAS;

export const GUIDES = [
  { slug: 'how-to-read-last-checked-status', title: 'How to read "last checked" status', date: '2026-11-22' },
  { slug: 'what-link-out-only-means', title: 'What "link-out only" means on this site', date: '2026-11-22' },
  { slug: 'how-caltrans-cameras-work', title: 'How Caltrans traffic cameras work', date: '2026-11-22' },
  { slug: 'what-live-road-conditions-mean', title: 'What the live road conditions mean', date: '2026-11-22' },
  { slug: 'how-to-read-a-road-page', title: 'How to read a road page (driving order, nearest cameras)', date: '2026-11-22' },
  { slug: 'camera-link-is-dead', title: 'What to do if a camera link is dead', date: '2026-11-22' },
];

// Curated cities: the ten biggest by real coverage, each with at least MIN_CAMERAS cameras. Provisional.
export function curatedCities(cams, limit = 10) {
  const counts = countsBy(cams, 'city');
  return Object.entries(counts).filter(([, n]) => n >= MIN_CAMERAS)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([city]) => city);
}

// Curated roads: the ten with the most cameras, each with at least MIN_CAMERAS. Provisional, like the cities.
// Counted by roadSlug so two spellings of one road would count once; returns the display spelling (most common).
export function curatedRoads(cams, limit = 10) {
  const by = new Map();
  for (const c of cams) {
    const k = roadSlug(c.road);
    if (!k) continue;
    const e = by.get(k) || { n: 0, spell: {} };
    e.n++; e.spell[c.road] = (e.spell[c.road] || 0) + 1;
    by.set(k, e);
  }
  return [...by.values()].filter((e) => e.n >= MIN_CAMERAS)
    .map((e) => ({ n: e.n, road: Object.entries(e.spell).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0] }))
    .sort((a, b) => b.n - a.n || a.road.localeCompare(b.road)).slice(0, limit).map((e) => e.road);
}

// Regions that get a hub: only with enough cameras (an empty hub is never generated).
export function regionsWithPages(cams) {
  return Object.entries(countsBy(cams, 'region')).filter(([, n]) => n >= MIN_CAMERAS).map(([slug]) => slug);
}

// Every page: { route, kind, count, indexable, lastmod }. cities are passed in so tests can use fixtures.
export function pageList(cams, cities, registryDate, roads = []) {
  const byRegion = countsBy(cams, 'region');
  const byCity = countsBy(cams, 'city');
  const out = [
    { route: '/', kind: 'home', count: cams.length, indexable: true, lastmod: registryDate },
    { route: '/map/', kind: 'map', count: cams.length, indexable: true, lastmod: registryDate },
    { route: '/cameras/', kind: 'hub', count: cams.length, indexable: isIndexable(cams.length), lastmod: registryDate },
  ];
  for (const r of regionsWithPages(cams)) out.push({ route: `/cameras/${r}/`, kind: 'region', count: byRegion[r], indexable: isIndexable(byRegion[r]), lastmod: registryDate });
  for (const city of cities) {
    const rs = [...new Set(cams.filter((c) => c.city === city).map((c) => c.regionSlug))];
    if (rs.length !== 1) continue;
    const n = byCity[city] || 0;
    out.push({ route: `/cameras/${rs[0]}/${slugify(city)}/`, kind: 'city', count: n, indexable: isIndexable(n), lastmod: registryDate });
  }
  if (roads.length) out.push({ route: '/roads/', kind: 'roads-hub', count: roads.length, indexable: true, lastmod: registryDate });
  const byRoad = countsBy(cams, 'road');
  for (const r of roads) out.push({ route: `/roads/${roadSlug(r)}/`, kind: 'road', count: byRoad[r] || 0, indexable: isIndexable(byRoad[r] || 0), lastmod: registryDate });
  for (const g of GUIDES) out.push({ route: `/guides/${g.slug}/`, kind: 'guide', count: null, indexable: true, lastmod: g.date });
  return out;
}

export function buildSitemap(pages, siteUrl) {
  const rows = pages.filter((p) => p.indexable).map((p) => `<url><loc>${siteUrl}${p.route}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}
