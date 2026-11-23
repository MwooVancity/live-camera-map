import { cameras, registryDate, regionDates } from '../lib/data.mjs';
import { pageList, curatedPlaces, curatedRoads, buildSitemap } from '../lib/pages.mjs';
import { SITE_URL } from '../config.mjs';

export function GET() {
  const pages = pageList(cameras, curatedPlaces(cameras), registryDate, curatedRoads(cameras), regionDates);
  return new Response(buildSitemap(pages, SITE_URL), { headers: { 'Content-Type': 'application/xml' } });
}
