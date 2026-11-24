// Pure helpers for the A22 Brenner motorway (Italy): Autostrada del Brennero webcams listed by the Open Data Hub tourism API (NOI Techpark). No network here.
// Feed: GET /v1/WebcamInfo?source=a22 answers { TotalResults, Items:[{Id "A22_68", Active, Shortname, Detail.it.{Title,BaseText}, GpsInfo[0].{Latitude,Longitude}, Mapping.a22.km, Webcamurl, LicenseInfo{License,ClosedData,LicenseHolder}}] }.
// We keep ONLY the link to Autobrennero's own still picture (Webcamurl), never the picture. The Hub licensing page (docs.opendatahub.com/licensing) is re-read before every run, and every record must itself say CC0, open data.
// Beats Argos by: all A22 webcams named as Autobrennero names them with the motorway kilometre mark and the side of the carriageway kept as text, the CC0 record licence and the Hub's own warning (it does not extend to the picture) printed, and the Hub licence page re-read in code before every run.
import { robotsAllows, pageText } from './iceland.mjs';
export { robotsAllows, pageText };

export const BOUNDS = { latMin: 44.4, latMax: 47.2, lonMin: 10.5, lonMax: 11.8 }; // the A22 from Brennero (46.997 N) to the A1 junction near Modena (44.67 N) plus a margin; sanity box only
export const FEED_URL = 'https://tourism.opendatahub.com/v1/WebcamInfo?pagesize=100&source=a22';
export const ROBOTS_URL = 'https://tourism.opendatahub.com/robots.txt'; // answers 404 (read 2026-11-24): no rules
export const TERMS_URL = 'https://docs.opendatahub.com/licensing'; // docs.opendatahub.com/robots.txt also answers 404 (no rules)
// All must still be in the licensing page text (read 2026-11-24, tags removed, spaces collapsed).
export const LICENCE_PHRASES = [
  'The Open Data Hub provides open, freely accessible data under permissive licenses',
  'CC0 : The data is in the public domain and can be freely reused without restrictions',
  'It does not extend to child nodes such as Streamurl or Webcamurl',
];
export const ATTRIBUTION = 'Source: Autostrada del Brennero S.p.A. (A22), via the Open Data Hub (NOI Techpark), CC0.';
// the link-out target must be Autobrennero's own picture path (www.autobrennero.it/WebCamImg/km<kilometre>.jpg)
export const IMAGE_RE = /^https:\/\/www\.autobrennero\.it\/WebCamImg\/km(\d{1,3})\.jpg$/;
export const A22_REGION = { slug: 'a22-brennero', name: 'A22 Brenner Motorway' };
export const A22_COUNTRY = { countryCode: 'IT', countrySlug: 'italy', countryName: 'Italy' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// JSON text -> { rows, total }. Throws when the body is not the camera list (HTML, an error body, a cut-off body).
export function parseFeed(body) {
  if (typeof body !== 'string' || !/^\s*\{/.test(body)) throw new Error('not the camera list (no JSON object)');
  let v;
  try { v = JSON.parse(body); } catch (e) { throw new Error(`camera list cut off or invalid JSON (${e.message})`); }
  if (!v || !Array.isArray(v.Items) || !Number.isInteger(v.TotalResults)) throw new Error('not the camera list (no Items array or TotalResults)');
  if (v.TotalPages > 1 || v.NextPage) throw new Error('more than one page of cameras (page size too small)');
  return { rows: v.Items, total: v.TotalResults };
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated Id.
export function normalizeA22(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const lic = r.LicenseInfo;
  if (!lic || lic.License !== 'CC0' || lic.ClosedData !== false) return bump('notCc0'); // the record itself must say CC0 and open
  if (r.Active === false) return bump('inactive');
  const link = s(r.Webcamurl);
  const m = IMAGE_RE.exec(link);
  if (!m) return bump('noUrl');
  const idRaw = s(r.Id);
  if (!/^A22_\d{1,3}$/.test(idRaw)) return bump('noId');
  const name = s(r.Shortname) || s(r.Detail?.it?.Title);
  if (!name) return bump('noName');
  const g = Array.isArray(r.GpsInfo) ? r.GpsInfo[0] : null;
  const lat = g?.Latitude, lon = g?.Longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const id = `a22-brennero-${idRaw.toLowerCase().replace(/_/g, '-')}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  const side = s(r.Detail?.it?.BaseText); // Autobrennero's own words, e.g. "a destra carr. NORD (dir.Brennero)"
  const text = [`A22 km ${m[1]}.`, side && `${side}.`].filter(Boolean).join(' ');
  return {
    id, sourceId: 'a22-brennero', name, road: 'A22', direction: '', city: null,
    regionSlug: A22_REGION.slug, regionName: A22_REGION.name,
    lat, lon, feedType: 'still', officialUrl: link, officialUrlLastVerified: null, lastSeen, locationText: text,
  };
}
