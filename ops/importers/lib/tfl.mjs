// Pure helpers for London (Transport for London JamCams, Place/Type/JamCam list). No network here.
// Feed: one JSON array of Place objects (id "JamCams_00002.00865", commonName, lat, lon, additionalProperties [{key,value}]: available, imageUrl, videoUrl, view).
// We keep ONLY the link (TfL's own still picture address), never the picture. The terms page text is re-read before every run (see LICENCE_PHRASES).
// Beats Argos by: every available London JamCam named as TfL names it with its road where the name starts with one, the two credit lines TfL's licence requires printed on the page,
// the terms sentences re-read in code before every run, and an honest "last checked" per picture address.
import { robotsAllows } from './iceland.mjs';
export { robotsAllows }; // one robots.txt reader (longest-prefix Allow/Disallow in the "*" group); api.tfl.gov.uk has none (404) = no rules

export const BOUNDS = { latMin: 51.2, latMax: 51.8, lonMin: -0.6, lonMax: 0.4 }; // Greater London; sanity box only
export const FEED_URL = 'https://api.tfl.gov.uk/Place/Type/JamCam';
export const ROBOTS_URL = 'https://api.tfl.gov.uk/robots.txt';
export const TERMS_URL = 'https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service';
// All must still be in the terms page text (read 2026-11-24, page payload decoded, tags removed, spaces collapsed).
export const LICENCE_PHRASES = ['Exploit the Information commercially and non-commercially', 'Powered by TfL Open Data', 'version 2.0 of the Open Government Licence'];
export const ATTRIBUTION = 'Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016.';
export const IMAGE_RE = /^https:\/\/s3-eu-west-1\.amazonaws\.com\/jamcams\.tfl\.gov\.uk\/([0-9A-Za-z._-]+)\.jpg$/; // the link-out target must be TfL's own picture bucket
export const LN_REGION = { slug: 'london', name: 'London' };
export const LN_COUNTRY = { countryCode: 'GB', countrySlug: 'united-kingdom', countryName: 'United Kingdom' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
const PUSH = /self\.__next_f\.push\(\[\d+,("(?:[^"\\]|\\.)*")\]\)/g;
// The TfL terms page is a Next.js page: its readable text sits inside self.__next_f.push([1,"..."]) script payloads (a JSON string holding HTML).
// Decode every payload, then remove tags, so a phrase split by a tag is still found. Falls back to the plain page when there is no payload.
export function pageText(html) {
  const h = String(html);
  let decoded = '';
  for (const m of h.matchAll(PUSH)) { try { decoded += ` ${JSON.parse(m[1])}`; } catch { /* a payload we cannot decode adds no text */ } }
  return `${decoded} ${h}`.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

// JSON text -> array of Place rows. Throws when the body is not the camera list (an HTML error page, an object, a cut-off body).
export function parseFeed(body) {
  if (typeof body !== 'string' || !/^\s*\[/.test(body)) throw new Error('not the camera list (no JSON array)');
  let v;
  try { v = JSON.parse(body); } catch (e) { throw new Error(`camera list cut off or invalid JSON (${e.message})`); }
  if (!Array.isArray(v)) throw new Error('not the camera list (no JSON array)');
  return v;
}

const prop = (r, key) => (Array.isArray(r.additionalProperties) ? r.additionalProperties.find((p) => p && p.key === key) : null)?.value;

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated picture address.
export function normalizeLn(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  if (String(prop(r, 'available')).toLowerCase() !== 'true') return bump('unavailable');
  const link = s(prop(r, 'imageUrl'));
  const m = IMAGE_RE.exec(link);
  if (!m) return bump('noUrl');
  const name = s(r.commonName);
  if (!name) return bump('noName');
  if (typeof r.lat !== 'number' || typeof r.lon !== 'number' || !Number.isFinite(r.lat) || !Number.isFinite(r.lon)) return bump('badCoords');
  const lat = r.lat, lon = r.lon;
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const id = `tfl-jamcams-${m[1].toLowerCase().replace(/[._]/g, '-')}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  const road = /^[A-Z]{1,2}\d{1,4}\b/.exec(name);
  return {
    id,
    sourceId: 'tfl-jamcams',
    name,
    road: road ? road[0] : '',
    direction: '',
    city: 'London',
    regionSlug: LN_REGION.slug,
    regionName: LN_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
  };
}
