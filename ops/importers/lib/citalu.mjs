// Pure helpers for Luxembourg (CITA motorway webcams, Administration des Ponts et Chaussees). No network here.
// Feed: one KML file (https://www.cita.lu/kml/cameras.kml), one Placemark per camera: id="camera_<n>", name "A6 - Camera 3", an iframe whose src is the camera's own page
// https://www.cita.lu/webcam/map/<n>, and a Point with "lon,lat,0". We keep ONLY that page address as the link-out, never the picture behind it.
// Licence (read 2026-11-25): the dataset is CC0 on data.public.lu and the CITA FAQ says the webcam information is "available without restrictions"; the page footer still says
// "All rights reserved", so image permission stays unverified and nothing from the picture is fetched, stored or shown. Both texts are re-read in code before every run.
// Beats Argos by: every CITA motorway camera named as CITA names it (motorway and camera number) from a CC0 list whose dataset record and FAQ sentence are re-read in code before every run, one link to the camera's own page.
import { robotsAllows, pageText } from './iceland.mjs';
export { robotsAllows, pageText }; // one robots.txt reader and one page-text reader

export const BOUNDS = { latMin: 49.4, latMax: 50.2, lonMin: 5.7, lonMax: 6.6 }; // Luxembourg plus a small margin; sanity box only
export const FEED_URL = 'https://www.cita.lu/kml/cameras.kml';
export const ROBOTS_URL = 'https://www.cita.lu/robots.txt';
export const DATASET_URL = 'https://data.public.lu/fr/datasets/cita-cameras-autoroute/';
export const DATASET_API_URL = 'https://data.public.lu/api/1/datasets/cita-cameras-autoroute/';
export const DATASET_SLUG = 'cita-cameras-autoroute';
export const DATASET_LICENCE = 'cc-zero';
export const DATASET_FEED = FEED_URL; // the dataset's one resource must still be this file
export const TERMS_URL = 'https://www.cita.lu/en/faq.html'; // the FAQ page that says the webcam information is available without restrictions
// Must still be in the FAQ page text (read 2026-11-25, tags removed, spaces collapsed).
export const LICENCE_PHRASES = ['Much of the information (webcam, travel time, etc.) is available without restrictions and can be easily integrated on intranet or internet sites.'];
export const ATTRIBUTION = 'Source: CITA, Administration des Ponts et Chaussees (Luxembourg), motorway webcam list, CC0.';
// the link-out target must be CITA's own camera page, and its number must be the Placemark's number
export const LINK_RE = /^https:\/\/www\.cita\.lu\/webcam\/map\/(\d{1,6})$/;
export const LU_REGION = { slug: 'luxembourg', name: 'Luxembourg' };
export const LU_COUNTRY = { countryCode: 'LU', countrySlug: 'luxembourg', countryName: 'Luxembourg' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : typeof v === 'number' ? String(v) : '');
const dec = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

// Dataset record (data.public.lu API JSON text) -> list of problems (empty = licence, slug and the one resource are still as read on 2026-11-25).
export function datasetProblems(body) {
  let m;
  try { m = JSON.parse(body); } catch (e) { return [`dataset record is not JSON (${e.message})`]; }
  if (!m || typeof m !== 'object' || Array.isArray(m) || m.errors || m.message) return ['dataset record is not a dataset'];
  const p = [];
  if (m.license !== DATASET_LICENCE) p.push(`dataset licence is "${m.license}", not "${DATASET_LICENCE}"`);
  if (m.slug !== DATASET_SLUG) p.push('dataset slug changed');
  if (!Array.isArray(m.resources) || !m.resources.some((r) => r && r.url === DATASET_FEED)) p.push('dataset no longer lists the camera KML file');
  return p;
}

// KML text -> array of { id, name, link, lon, lat } (raw strings/numbers, nothing validated). Throws when the body is not the camera list (HTML error page, cut-off body).
export function parseKml(body) {
  if (typeof body !== 'string' || !/^\s*(<\?xml[^>]*\?>\s*)?<kml[\s>]/.test(body)) throw new Error('not the camera list (no KML document)');
  if (!/<\/kml>\s*$/.test(body)) throw new Error('camera list cut off (no closing kml tag)');
  const out = [];
  for (const m of body.matchAll(/<Placemark\b([^>]*)>([\s\S]*?)<\/Placemark>/g)) {
    const id = (/\bid="([^"]*)"/.exec(m[1]) || [])[1] ?? '';
    const name = dec((/<name>([\s\S]*?)<\/name>/.exec(m[2]) || [])[1] ?? '');
    const link = (/<iframe\b[^>]*\bsrc="([^"]*)"/.exec(m[2]) || [])[1] ?? '';
    const c = (/<coordinates>\s*([^<]*?)\s*<\/coordinates>/.exec(m[2]) || [])[1] ?? '';
    const [lon, lat] = c.split(',').map((x) => (x.trim() === '' ? NaN : Number(x)));
    out.push({ id, name, link, lon, lat });
  }
  return out;
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated camera number.
export function normalizeCita(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const num = (/^camera_(\d{1,6})$/.exec(s(r.id)) || [])[1];
  if (!num) return bump('noId');
  const link = s(r.link);
  const lm = LINK_RE.exec(link);
  if (!lm || Number(lm[1]) !== Number(num)) return bump('noUrl'); // a foreign host, http, or a page number that is not this camera's number
  const name = s(r.name);
  if (!name) return bump('noName');
  const lat = r.lat, lon = r.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const id = `cita-lu-cameras-${Number(num)}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  const road = (/^([A-Z]\d{1,2})\s*-/.exec(name) || [])[1] || ''; // "A6 - Camera 3" -> A6; kept only when the name starts with a motorway number
  return {
    id,
    sourceId: 'cita-lu-cameras',
    name,
    road,
    direction: '',
    city: null,
    regionSlug: LU_REGION.slug,
    regionName: LU_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
  };
}
