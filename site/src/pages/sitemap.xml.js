import { cameras, registryDate } from '../lib/data.mjs';
import { pageList, curatedCities, curatedRoads, buildSitemap } from '../lib/pages.mjs';
import { SITE_URL } from '../config.mjs';

export function GET() {
  const pages = pageList(cameras, curatedCities(cameras), registryDate, curatedRoads(cameras));
  return new Response(buildSitemap(pages, SITE_URL), { headers: { 'Content-Type': 'application/xml' } });
}
