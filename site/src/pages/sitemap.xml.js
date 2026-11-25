import { cameras, registryDate, regionDates } from '../lib/data.mjs';
import { pageList, curatedPlaces, curatedRoads, buildSitemap } from '../lib/pages.mjs';
import { loadCorridors } from '../lib/corridors.mjs';
import { SITE_URL, NOINDEX_ALL } from '../config.mjs';

export function GET() {
  // Launch switch off: an empty sitemap, so no URL is offered to search engines.
  const xml = NOINDEX_ALL
    ? '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    : buildSitemap(pageList(cameras, curatedPlaces(cameras), registryDate, curatedRoads(cameras), regionDates, loadCorridors().map((c) => ({ slug: c.def.slug, n: c.n, region: c.def.region }))), SITE_URL);
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
