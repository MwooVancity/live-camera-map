// Pure helpers for New South Wales (Transport for NSW Live Traffic Cameras, GeoJSON list). No network here.
// Feed: one GeoJSON FeatureCollection ({type, rights:{copyright, licence}, features:[{id (UUID), geometry Point [lon,lat], properties {region, title, view, direction, href}}]}).
// We keep ONLY the link (TfL-style: the agency's own still picture address), never the picture. The licence page text is re-read before every run (see LICENCE_PHRASES).
// Beats Argos by: every NSW Live Traffic camera named as Transport for NSW names it, with its own view sentence, the CC BY 4.0 credit the licence page asks for printed on the page,
// the licence page sentences re-read in code before every run, and an honest "last checked" per picture address.
import { robotsAllows, pageText } from './iceland.mjs';
export { robotsAllows, pageText }; // one robots.txt reader and one page-text reader; data.livetraffic.com answers robots.txt with 403 (no rules read, same as Austin and Iceland: no file = no rules)

export const BOUNDS = { latMin: -37.6, latMax: -28.0, lonMin: 140.9, lonMax: 154.0 }; // New South Wales and its sea border; sanity box only
export const FEED_URL = 'https://data.livetraffic.com/cameras/traffic-cam.json';
export const ROBOTS_URL = 'https://data.livetraffic.com/robots.txt';
export const TERMS_URL = 'https://opendata.transport.nsw.gov.au/datalicence'; // the "Data Licence" page the dataset page links to; the dataset page is https://opendata.transport.nsw.gov.au/dataset/live-traffic-cameras
// All must still be in the licence page text (read 2026-11-24, tags removed, spaces collapsed).
export const LICENCE_PHRASES = ['licensed under a Creative Commons Attribution 4.0 License', 'on the condition that Transport for NSW is attributed as the source', 'Creative Commons Attribution 4.0'];
export const ATTRIBUTION = 'Source: Transport for NSW, Live Traffic Cameras, CC BY 4.0.';
// the link-out target must be Transport for NSW's own picture host (a few names contain "&"; one sits on data.livetraffic.com)
export const IMAGE_RE = /^https:\/\/(?:webcams\.transport\.nsw\.gov\.au\/livetraffic-webcams\/cameras|data\.livetraffic\.com\/cameras)\/([A-Za-z0-9_.&-]{1,120})\.jpe?g$/;
export const NSW_REGION = { slug: 'new-south-wales', name: 'New South Wales' };
export const NSW_COUNTRY = { countryCode: 'AU', countrySlug: 'australia', countryName: 'Australia' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// JSON text -> array of GeoJSON features. Throws when the body is not the camera list (an HTML error page, a bare array, a cut-off body).
export function parseFeed(body) {
  if (typeof body !== 'string' || !/^\s*\{/.test(body)) throw new Error('not the camera list (no JSON object)');
  let v;
  try { v = JSON.parse(body); } catch (e) { throw new Error(`camera list cut off or invalid JSON (${e.message})`); }
  if (!v || !Array.isArray(v.features)) throw new Error('not the camera list (no features array)');
  return v.features;
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated feature id.
export function normalizeNsw(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object' || !r.properties || typeof r.properties !== 'object') return bump('malformed');
  const p = r.properties;
  const link = s(p.href);
  if (!IMAGE_RE.test(link)) return bump('noUrl');
  const name = s(p.title);
  if (!name) return bump('noName');
  const xy = r.geometry && r.geometry.type === 'Point' ? r.geometry.coordinates : null;
  if (!Array.isArray(xy) || typeof xy[0] !== 'number' || typeof xy[1] !== 'number' || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) return bump('badCoords');
  const [lon, lat] = xy;
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const key = s(r.id);
  if (!/^[0-9A-Za-z-]{8,64}$/.test(key)) return bump('noId');
  const id = `nsw-live-traffic-${key.toLowerCase()}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  // The feed's own view sentence and region code are kept as text: its direction is where the camera looks, not the way traffic flows, and its region code is an agency area, not a place.
  const text = [s(p.view), s(p.region) ? `Agency area: ${s(p.region)}.` : ''].filter(Boolean).join(' ').slice(0, 300);
  return {
    id,
    sourceId: 'nsw-live-traffic',
    name,
    road: '',
    direction: '',
    city: null,
    regionSlug: NSW_REGION.slug,
    regionName: NSW_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    ...(text ? { locationText: text } : {}),
  };
}
