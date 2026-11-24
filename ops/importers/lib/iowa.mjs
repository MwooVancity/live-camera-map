// Pure helpers for Iowa (Iowa DOT Traffic Cameras, ArcGIS FeatureServer layer, CC BY 4.0). No network here.
// Feed: an ArcGIS REST query answers { features:[{attributes:{FID, Desc_, Route, ImageURL, VideoURL, latitude, longitude, COMMON_ID, Type, FUNCTION, REGION, UpdateDate, ...}}], exceededTransferLimit? }.
// An ArcGIS error is an HTTP 200 body { error:{code,message} }, so every page is checked, not only the status. We keep ONLY the link to the DOT's own still picture (ImageURL), never the picture,
// and never the HLS stream link (VideoURL is a .m3u8 playlist, not a page). The dataset record (ArcGIS item) and the Iowa DOT GIS Data Terms of Use page are re-read before every run.
// Beats Argos by: every Iowa DOT camera named as the DOT names it (route and mile marker), with its camera type kept as text, the CC BY 4.0 credit the dataset asks for printed on the page,
// the dataset record and the terms sentences re-read in code before every run, and an honest "last checked" per picture address.
import { robotsAllows, pageText } from './iceland.mjs';
export { robotsAllows, pageText }; // one robots.txt reader and one page-text reader

export const BOUNDS = { latMin: 40.3, latMax: 43.6, lonMin: -96.7, lonMax: -90.0 }; // Iowa plus a small margin; sanity box only
export const LAYER_URL = 'https://services.arcgis.com/8lRhdTsQyJpO52F1/arcgis/rest/services/Traffic_Cameras_View/FeatureServer/0';
export const PAGE_SIZE = 1000; // the layer's own limit is 2000 (maxRecordCount); a smaller page keeps each answer small, and we page until every row is read
export const MAX_PAGES = 20;
export const pageUrl = (offset) => `${LAYER_URL}/query?where=1%3D1&outFields=*&returnGeometry=false&orderByFields=FID&resultOffset=${offset}&resultRecordCount=${PAGE_SIZE}&f=json`;
export const COUNT_URL = `${LAYER_URL}/query?where=1%3D1&returnCountOnly=true&f=json`;
// services.arcgis.com/robots.txt answers 403 (the ArcGIS REST host, read 2026-11-24): a 403 on a file nobody maintains is not a bot check, so it is read as "no rules", same as Austin and NSW.
export const ROBOTS_URL = 'https://services.arcgis.com/robots.txt';
// the picture host atmsqf.iowadot.gov/robots.txt answers 404 (read 2026-11-24): no rules; this importer never requests a picture, only the health checker does (HEAD, 4 a second).
export const ITEM_ID = 'c4063f200a7b4da5826e2ac86c677cf5';
export const ITEM_URL = `https://www.arcgis.com/sharing/rest/content/items/${ITEM_ID}?f=json`;
export const ITEM_PAGE_URL = `https://www.arcgis.com/home/item.html?id=${ITEM_ID}`;
export const TERMS_URL = 'https://iowadot.gov/policies_and_statements/terms-of-use#gis'; // the link the dataset record gives; it redirects to /policies-statements/terms-use (the fetch follows redirects, the fragment is not sent)
// Dataset record (ArcGIS item) must still say all of these: licence text, title, owner and the terms link.
export const ITEM_LICENCE = 'This work is licensed under a Creative Commons Attribution 4.0 International License';
export const ITEM_TITLE = 'Traffic Cameras';
export const ITEM_OWNER = 'IowaDOT_OTO';
export const ITEM_TERMS_LINK = 'iowadot.gov/policies_and_statements/terms-of-use#gis';
// All must still be in the terms page text (read 2026-11-24, tags removed, spaces collapsed). The first two are the CC BY section's grant and credit condition,
// the third is the summary's indemnification clause (a change there must be seen by the owner before data keeps shipping).
export const LICENCE_PHRASES = [
  'under the Creative Commons Attribution 4.0 International Public License (CC BY 4.0)',
  'This license allows you to copy, share, adapt, transform, and build upon the Data for any purpose, including commercial use, provided that you give appropriate credit to the Iowa Department of Transportation as the Data source',
  'you agree to defend and indemnify Iowa DOT and the State of Iowa for claims arising from your use of the data',
];
export const ATTRIBUTION = 'Source: Iowa Department of Transportation, Traffic Cameras, CC BY 4.0.';
// the link-out target must be the DOT's own picture host (path case varies in the feed: SNAPSHOTS/PUBLIC and snapshots/Public both occur)
export const IMAGE_RE = /^https:\/\/atmsqf\.iowadot\.gov\/(?!.*\.\.)(snapshots\/[A-Za-z0-9_./-]{1,150}\.jpe?g)$/i;
export const IA_REGION = { slug: 'iowa', name: 'Iowa' };
export const IA_COUNTRY = { countryCode: 'US', countrySlug: 'united-states', countryName: 'United States' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : typeof v === 'number' ? String(v) : '');

// Dataset record (ArcGIS item JSON text) -> list of problems (empty = licence, title, owner and terms link are still as read on 2026-11-24).
export function itemProblems(body) {
  let m;
  try { m = JSON.parse(body); } catch (e) { return [`dataset record is not JSON (${e.message})`]; }
  if (!m || typeof m !== 'object' || Array.isArray(m) || m.error) return ['dataset record is not an item'];
  const p = [], lic = pageText(m.licenseInfo || '');
  if (!lic.includes(ITEM_LICENCE)) p.push(`dataset licence no longer says "${ITEM_LICENCE}"`);
  if (!String(m.licenseInfo || '').includes(ITEM_TERMS_LINK)) p.push('dataset record no longer links the Iowa DOT GIS Data Terms of Use');
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
export function normalizeIowa(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const link = s(r.ImageURL);
  const m = IMAGE_RE.exec(link);
  if (!m) return bump('noUrl'); // no picture link: a VideoURL alone is an HLS playlist, not a page, so it is never used as the link-out
  const name = s(r.Desc_);
  if (!name) return bump('noName');
  const lat = r.latitude, lon = r.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  // COMMON_ID repeats (851 values for 1,253 rows: one RWIS station has several views) and FID is a server row number, so the id comes from the picture file path, unique per row and lower-cased.
  const key = m[1].toLowerCase().replace(/^snapshots\//, '').replace(/\.jpe?g$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!key) return bump('noId');
  const id = `iowa-dot-${key}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  // The DOT's own type and function labels are kept as text (they are agency labels, not a place or a traffic direction).
  const text = [s(r.Type) && `Type: ${s(r.Type)}.`, s(r.FUNCTION) && `Function: ${s(r.FUNCTION)}.`].filter(Boolean).join(' ');
  return {
    id,
    sourceId: 'iowa-dot',
    name,
    road: s(r.Route),
    direction: '',
    city: null,
    regionSlug: IA_REGION.slug,
    regionName: IA_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    ...(text ? { locationText: text } : {}),
  };
}
