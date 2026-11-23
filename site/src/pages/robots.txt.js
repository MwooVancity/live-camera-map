import { SITE_URL, NOINDEX_ALL } from '../config.mjs';

export function GET() {
  const body = NOINDEX_ALL ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
