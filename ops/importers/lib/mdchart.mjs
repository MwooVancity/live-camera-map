// Pure helpers for Maryland CHART (MDOT SHA traffic camera list on the State of Maryland open data portal, Socrata dataset 4z3c-43ce). No network here.
// Feed: one Socrata JSON list [{ location, county, feedid, url, the_geom:{type:"Point",coordinates:[lon,lat]} }]; url is the per-camera chart.maryland.gov viewer page.
// We keep ONLY that link, never the picture. chart.maryland.gov is behind a Cloudflare challenge: this importer never contacts it, only opendata.maryland.gov (record, robots, one list request).
// LICENCE: the dataset carries NO licence field and no terms (read 2026-11-25). It is listed link-only on the owner's recorded approval (data/owner-approvals.json, sourceApprovals), removed the same day if the agency objects.
// Beats Argos by: every camera MDOT SHA publishes (451), each named by its CHART location text and county, from the agency's own list, with a plain note that the list has no licence.
import { robotsAllows, pageText } from './iceland.mjs';
export { robotsAllows, pageText };

export const BOUNDS = { latMin: 37.8, latMax: 39.8, lonMin: -79.6, lonMax: -75.0 }; // Maryland plus a margin (the 451 rows span 38.06-39.72 N, 79.46-75.07 W); sanity box only
export const LIMIT = 5000; // a Socrata list of exactly this size was cut off (451 rows today)
export const FEED_URL = `https://opendata.maryland.gov/resource/4z3c-43ce.json?$limit=${LIMIT}`;
export const META_URL = 'https://opendata.maryland.gov/api/views/4z3c-43ce.json';
export const PAGE_URL = 'https://opendata.maryland.gov/d/4z3c-43ce';
export const ROBOTS_URL = 'https://opendata.maryland.gov/robots.txt'; // read 2026-11-25: Crawl-delay 1; Disallow only /browse?..., /api/odata/, /api/collocate*; /resource/ and /api/views/ are open
export const META_ID = '4z3c-43ce';
export const META_DESCRIPTION = 'This dataset provides the locations of Traffic Cameras in Maryland from the Coordinated Highways Action Response Team (CHART).';
export const ATTRIBUTION = "Source: Maryland Department of Transportation State Highway Administration (CHART), Traffic Cameras list, via the State of Maryland open data portal (opendata.maryland.gov).";
// the link-out target must be a CHART viewer page with a 32-hex feed id
export const LINK_RE = /^https:\/\/chart\.maryland\.gov\/video\/video\.php\?feed=([0-9a-f]{32})$/;
export const MD_REGION = { slug: 'maryland', name: 'Maryland' };
export const MD_COUNTRY = { countryCode: 'US', countrySlug: 'united-states', countryName: 'United States' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// Dataset record JSON text -> list of problems (empty = id and description as read on 2026-11-25 and still no licence field).
// A licence or rights field appearing is a change a human must read, so the run stops.
export function metaProblems(body) {
  let m;
  try { m = JSON.parse(body); } catch (e) { return [`dataset record is not JSON (${e.message})`]; }
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['dataset record is not a dataset'];
  const p = [];
  if (m.id !== META_ID) p.push('dataset id changed');
  if (!pageText(m.description || '').includes(META_DESCRIPTION)) p.push('dataset description no longer says it lists CHART traffic cameras in Maryland');
  if (m.license || m.licenseId) p.push('the dataset now carries a licence field; read it before use');
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
export function normalizeMd(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const link = s(r.url);
  const m = LINK_RE.exec(link);
  if (!m || s(r.feedid) !== m[1]) return bump('noUrl'); // not https, not chart.maryland.gov, no 32-hex id, or the id disagrees with the link
  const g = r.the_geom;
  const co = g && g.type === 'Point' ? g.coordinates : null;
  if (!Array.isArray(co) || typeof co[0] !== 'number' || typeof co[1] !== 'number' || !Number.isFinite(co[0]) || !Number.isFinite(co[1])) return bump('badCoords');
  const [lon, lat] = co;
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const name = s(r.location);
  if (!name) return bump('noName');
  const id = `maryland-chart-cameras-${m[1]}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  const county = s(r.county);
  return {
    id,
    sourceId: 'maryland-chart-cameras',
    name,
    road: '',
    direction: '',
    city: null, // the list has a county, not a city, so no city is invented
    regionSlug: MD_REGION.slug,
    regionName: MD_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    locationText: county ? `${county}, Maryland.` : 'Maryland.',
  };
}
