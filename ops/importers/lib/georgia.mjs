// Pure helpers for Georgia (GDOT 511GA cameras, via the keyless ArcGIS copy published by the Georgia Emergency Management Agency). No network here.
// NO LICENCE OR TERMS PAGE WAS FOUND for this list (ArcGIS item licence empty, no 511GA terms page; read 2026-11-25). It ships only under the owner's recorded approval for this one source
// (data/owner-approvals.json, sources[] entry georgia-511-cameras, 2026-11-25): link-out only, names and links only, removed the same day if GDOT or GEMA objects.
// Feed: an ArcGIS REST query answers { features:[{attributes:{ObjectId, Id, Latitude, Longitude, Url, VideoUrl, Status, Description, Roadway, Direction}}], exceededTransferLimit? }.
// An ArcGIS error is an HTTP 200 body { error:{code,message} }, so every page is checked. We keep ONLY the link to 511ga.org's own camera page (https://511ga.org/map/Cctv/<Id>), never a picture,
// and never the HLS stream link (VideoUrl). 511ga.org is never requested by the importer.
// Beats Argos by: every enabled GDOT 511GA camera named as GDOT names it (camera code, road and cross street), each with a stable link to GDOT's own picture address, and an honest line that the list is a copy with no terms page found.
import { robotsAllows, pageText } from './iceland.mjs';
export { robotsAllows, pageText }; // one robots.txt reader and one page-text reader

export const BOUNDS = { latMin: 30.3, latMax: 35.1, lonMin: -85.7, lonMax: -80.7 }; // Georgia plus a small margin; sanity box only (the real list spans 30.68..34.99, -85.52..-80.84)
export const LAYER_URL = 'https://services1.arcgis.com/2iUE8l8JKrP2tygQ/arcgis/rest/services/GDOT_511_Cameras/FeatureServer/0';
export const PAGE_SIZE = 1000; // the layer's own limit is 1000 rows per answer (read 2026-11-25), so the list takes four pages; we page until every row is read
export const MAX_PAGES = 12;
export const pageUrl = (offset) => `${LAYER_URL}/query?where=1%3D1&outFields=*&returnGeometry=false&orderByFields=ObjectId&resultOffset=${offset}&resultRecordCount=${PAGE_SIZE}&f=json`;
export const COUNT_URL = `${LAYER_URL}/query?where=1%3D1&returnCountOnly=true&f=json`;
// services1.arcgis.com/robots.txt answers 403 (the ArcGIS REST host, read 2026-11-25): a 403 on a file nobody maintains is not a bot check, so it is read as "no rules", same as Iowa, Austin and NSW.
export const ROBOTS_URL = 'https://services1.arcgis.com/robots.txt';
// 511ga.org/robots.txt (read 2026-11-25) disallows /my511/, /map/map*/, /bundles/, /list/getdata/, /eventdetails/, /error/; /map/Cctv/ is not disallowed. This importer never requests 511ga.org; only a reader's click does.
export const ITEM_ID = '12c979ba84b54b83b834fdd2d861677d';
export const ITEM_URL = `https://www.arcgis.com/sharing/rest/content/items/${ITEM_ID}?f=json`;
export const ITEM_PAGE_URL = `https://www.arcgis.com/home/item.html?id=${ITEM_ID}`;
// Dataset record (ArcGIS item) must still be this list: same id, title, owner. (It has no licence text to re-read; that is the point of the owner approval.)
export const ITEM_TITLE = 'GDOT 511 Cameras';
export const ITEM_OWNER = 'rbagby_gema';
export const ATTRIBUTION = 'Georgia Department of Transportation (511GA)';
// the link-out target must be 511ga.org's own camera page for the same numeric id
export const LINK_RE = /^https:\/\/511ga\.org\/map\/Cctv\/([0-9]{1,9})$/;
export const GA_REGION = { slug: 'georgia', name: 'Georgia' };
export const GA_COUNTRY = { countryCode: 'US', countrySlug: 'united-states', countryName: 'United States' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : typeof v === 'number' ? String(v) : '');

// Dataset record (ArcGIS item JSON text) -> list of problems (empty = id, title and owner are still as read on 2026-11-25).
export function itemProblems(body) {
  let m;
  try { m = JSON.parse(body); } catch (e) { return [`dataset record is not JSON (${e.message})`]; }
  if (!m || typeof m !== 'object' || Array.isArray(m) || m.error) return ['dataset record is not an item'];
  const p = [];
  if (m.title !== ITEM_TITLE) p.push(`dataset title is "${m.title}", not "${ITEM_TITLE}"`);
  if (m.owner !== ITEM_OWNER) p.push(`dataset owner is "${m.owner}", not "${ITEM_OWNER}"`);
  if (m.id !== ITEM_ID) p.push('dataset id changed');
  return p;
}

// Count answer text -> number. Throws when it is not a count (an ArcGIS error body, HTML, a cut-off body).
export function parseCount(body) {
  let v;
  try { v = JSON.parse(body); } catch (e) { throw new Error(`count answer is not JSON (${e.message})`); }
  if (v && v.error) throw new Error(`ArcGIS error ${v.error.code}: ${v.error.message}`);
  if (!v || !Number.isInteger(v.count) || v.count < 0) throw new Error('not a count answer');
  return v.count;
}

// One query page (JSON text) -> { rows (the attribute objects), more (the server says there are more rows) }. Throws when the body is not a camera page.
export function parsePage(body) {
  if (typeof body !== 'string' || !/^\s*\{/.test(body)) throw new Error('not the camera list (no JSON object)');
  let v;
  try { v = JSON.parse(body); } catch (e) { throw new Error(`camera list cut off or invalid JSON (${e.message})`); }
  if (v && v.error) throw new Error(`ArcGIS error ${v.error.code}: ${v.error.message}`);
  if (!v || !Array.isArray(v.features)) throw new Error('not the camera list (no features array)');
  return { rows: v.features.map((f) => (f && typeof f === 'object' ? f.attributes : null)), more: v.exceededTransferLimit === true };
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated camera id.
export function normalizeGeorgia(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  if (s(r.Status) !== 'Enabled') return bump('notEnabled'); // the agency itself marks the camera Disabled: not listed
  const m = LINK_RE.exec(s(r.Url));
  if (!m || m[1] !== s(r.Id)) return bump('noUrl'); // the link must be the camera page of the same id; a VideoUrl alone is an HLS playlist, never used
  const name = s(r.Description);
  if (!name || name === 'N/A') return bump('noName');
  const lat = r.Latitude, lon = r.Longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return bump('badCoords');
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const id = `georgia-511-${m[1]}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  // GDOT's direction label is kept as text (the feed does not say whether it is traffic direction or camera view); 'Unknown' is left out.
  const dir = s(r.Direction);
  const text = dir && dir !== 'Unknown' ? `Direction: ${dir}.` : '';
  return {
    id,
    sourceId: 'georgia-511',
    name,
    road: s(r.Roadway),
    direction: '',
    city: null, // the parenthesis at the end of the name is sometimes a city and sometimes a county, so no place is invented
    regionSlug: GA_REGION.slug,
    regionName: GA_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: m[0],
    officialUrlLastVerified: null,
    lastSeen,
    ...(text ? { locationText: text } : {}),
  };
}
