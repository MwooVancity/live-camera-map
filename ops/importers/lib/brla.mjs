// Pure helpers for Baton Rouge (City of Baton Rouge open data, dataset 6z6u-ts44 "Traffic Camera": Louisiana DOTD cameras in the Greater Baton Rouge area). No network here.
// Feed: one Socrata JSON list [{ id, image_view, the_geom:{type:"Point",coordinates:[lon,lat]} }]; image_view is the per-camera 511la.org link, which is itself the still-picture address.
// We keep ONLY that link, never the picture. This importer never contacts 511la.org: only data.brla.gov is read, twice per run (dataset record, list) plus its robots.txt.
// The licence is the city portal's own tag on state-owned data; the dataset record (licence name, attribution, description) is re-read before every run.
// Beats Argos by: every DOTD camera the City lists for Greater Baton Rouge, named by its 511LA camera code, from an open list whose "Public Domain" tag, DOTD attribution and description are re-read in code before every run, with the plain warning that the tag is the city portal's and not a LADOTD licence.
import { robotsAllows, pageText } from './iceland.mjs';
export { robotsAllows, pageText };

export const BOUNDS = { latMin: 29.9, latMax: 31.0, lonMin: -92.0, lonMax: -90.5 }; // Greater Baton Rouge plus a margin (the 118 rows span 30.15-30.52 N, 91.63-90.80 W); sanity box only
export const LIMIT = 5000; // a Socrata list of exactly this size was cut off (118 rows today)
export const FEED_URL = `https://data.brla.gov/resource/6z6u-ts44.json?$limit=${LIMIT}`;
export const META_URL = 'https://data.brla.gov/api/views/6z6u-ts44.json';
export const PAGE_URL = 'https://data.brla.gov/d/6z6u-ts44';
export const ROBOTS_URL = 'https://data.brla.gov/robots.txt'; // read 2026-11-24: Crawl-delay 1; Disallow only /browse?..., /api/odata/, /api/collocate*, one /views/INLINE path; /resource/ and /api/views/ are open
export const META_ID = '6z6u-ts44';
export const META_LICENCE = 'Public Domain';
export const META_ATTRIBUTION = 'LA Department of Transportation and Development (DOTD)';
export const META_DESCRIPTION = 'Louisiana Department of Transportation and Development traffic cameras in the Greater Baton Rouge, Louisiana area';
export const ATTRIBUTION = 'Source: LA Department of Transportation and Development (DOTD), Traffic Camera dataset, via City of Baton Rouge open data (data.brla.gov), tagged Public Domain by the City portal.';
// the link-out target must be a 511la.org camera path: /map/Cctv/<code>--<view>, code like b24, 297.C1 or b34.C3
export const LINK_RE = /^https:\/\/511la\.org\/map\/Cctv\/([A-Za-z0-9][A-Za-z0-9._-]{0,30})--(\d{1,3})$/;
export const LA_REGION = { slug: 'louisiana', name: 'Louisiana' };
export const LA_COUNTRY = { countryCode: 'US', countrySlug: 'united-states', countryName: 'United States' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// Dataset record JSON text -> list of problems (empty = id, licence name, attribution and description are still as read on 2026-11-24).
export function metaProblems(body) {
  let m;
  try { m = JSON.parse(body); } catch (e) { return [`dataset record is not JSON (${e.message})`]; }
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['dataset record is not a dataset'];
  const p = [];
  if (m.id !== META_ID) p.push('dataset id changed');
  if (m.license?.name !== META_LICENCE) p.push(`dataset licence is "${m.license?.name}", not "${META_LICENCE}"`);
  if (m.attribution !== META_ATTRIBUTION) p.push(`dataset attribution is "${m.attribution}", not "${META_ATTRIBUTION}"`);
  if (!pageText(m.description || '').includes(META_DESCRIPTION)) p.push('dataset description no longer says it lists LADOTD traffic cameras in the Greater Baton Rouge area');
  return p;
}

// JSON text -> array of rows. Throws when the body is not the camera list (an HTML error page, an object, a cut-off body).
export function parseFeed(body) {
  if (typeof body !== 'string' || !/^\s*\[/.test(body)) throw new Error('not the camera list (no JSON array)');
  let v;
  try { v = JSON.parse(body); } catch (e) { throw new Error(`camera list cut off or invalid JSON (${e.message})`); }
  if (!Array.isArray(v)) throw new Error('not the camera list (no JSON array)');
  return v;
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated camera.
export function normalizeBrla(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const link = s(r.image_view);
  const m = LINK_RE.exec(link);
  if (!m) return bump('noUrl'); // not https, not 511la.org, or not a camera path
  const g = r.the_geom;
  const co = g && g.type === 'Point' ? g.coordinates : null;
  if (!Array.isArray(co) || typeof co[0] !== 'number' || typeof co[1] !== 'number' || !Number.isFinite(co[0]) || !Number.isFinite(co[1])) return bump('badCoords');
  const [lon, lat] = co;
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const code = `${m[1]}--${m[2]}`;
  const key = code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const id = `brla-dotd-${key}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  return {
    id,
    sourceId: 'brla-dotd',
    name: `DOTD camera ${code}`, // the list has no name field: the 511LA camera code is the only label it gives
    road: '',
    direction: '',
    city: null, // no city field in the list (it covers the Greater Baton Rouge area), so no city is invented
    regionSlug: LA_REGION.slug,
    regionName: LA_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    locationText: `511LA camera ${code}, Greater Baton Rouge area.`,
  };
}
