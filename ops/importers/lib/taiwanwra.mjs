// Pure helpers for Taiwan river cameras (Water Resources Agency, Ministry of Economic Affairs, JSON list from opendata.wra.gov.tw). No network here.
// Feed: one JSON array, one object per camera: cameraid, cameraname, videosurveillancestationname, basinname, tributary, countiesandcities..., administrativedistrict...,
// latitude_4326, longitude_4326, status ("1" = in use), imageurl (the camera's own picture address on fmg.wra.gov.tw). We keep ONLY that address as the link-out, never the picture.
// Licence (read 2026-11-25): data.gov.tw dataset 36687 (WRA water-disaster imagery, this very JSON resource) is under the Government Open Data License 1.0, whose clause 2.1 grants use
// "for any purpose" (Chinese text: 不限目的、時間及地域、非專屬、不可撤回、免授權金進行利用), with attribution (clause 3.2). The opendata.wra.gov.tw footer says all text and pictures are the agency's
// copyright, so image permission stays unverified and nothing from a picture is fetched, stored or shown. Dataset record and licence text are re-read in code before every run.
// Beats Argos by: every Water Resources Agency river camera named as the Agency names it, with its river basin, tributary, county and district, from the Agency's own open list whose licence record is re-read in code before every run, one link to the camera's own picture address.
import { robotsAllows, pageText } from './iceland.mjs';
export { robotsAllows, pageText }; // one robots.txt reader and one page-text reader

export const BOUNDS = { latMin: 21.5, latMax: 26.5, lonMin: 118.0, lonMax: 123.0 }; // Taiwan, Penghu, Kinmen side; sanity box only
export const FEED_ID = 'f71b74eb-cbe5-42c6-8be5-7500450e7db0';
export const FEED_URL = `https://opendata.wra.gov.tw/api/v2/${FEED_ID}?format=JSON`;
export const ROBOTS_URL = 'https://opendata.wra.gov.tw/robots.txt'; // answers 404 (read 2026-11-25): no rules
export const DATASET_NID = 36687;
export const DATASET_API_URL = `https://data.gov.tw/api/front/dataset/detail?nid=${DATASET_NID}`;
export const DATASET_URL = `https://data.gov.tw/dataset/${DATASET_NID}`;
export const DATASET_LICENCE = '政府資料開放授權條款-第1版';
export const TERMS_URL = 'https://data.gov.tw/license';
// Must still be in the licence page text (read 2026-11-25, tags removed, spaces collapsed): the Chinese grant sentence and its English version.
export const LICENCE_PHRASES = [
  '不限目的、時間及地域、非專屬、不可撤回、免授權金進行利用',
  'perpetual, worldwide, non-exclusive, irrevocable, royalty-free copyright license',
];
export const ATTRIBUTION = 'Source: Water Resources Agency, Ministry of Economic Affairs (Taiwan), river CCTV list, Government Open Data License 1.0 (https://data.gov.tw/license).';
// the link-out target must be the Agency's own picture host and path with a hex camera token
export const LINK_RE = /^https:\/\/fmg\.wra\.gov\.tw\/109wraweb\/getImage\.aspx\?mode=getNewImageS&CCTV_SN=0x[0-9A-Fa-f]{16,400}$/;
export const TWRA_REGION = { slug: 'taiwan-rivers', name: 'Taiwan rivers' };
export const TWRA_COUNTRY = { countryCode: 'TW', countrySlug: 'taiwan', countryName: 'Taiwan' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : typeof v === 'number' ? String(v) : '');

// data.gov.tw dataset record (JSON text) -> list of problems (empty = licence, id and the one JSON resource are still as read on 2026-11-25).
export function datasetProblems(body) {
  let j;
  try { j = JSON.parse(body); } catch (e) { return [`dataset record is not JSON (${e.message})`]; }
  const m = j && j.payload;
  if (!m || typeof m !== 'object' || Array.isArray(m) || m.nid !== DATASET_NID) return ['dataset record is not the expected dataset'];
  const p = [];
  if (m.license_name !== DATASET_LICENCE) p.push(`dataset licence is "${m.license_name}", not "${DATASET_LICENCE}"`);
  if (m.dataset_status !== 'c01') p.push(`dataset status is "${m.dataset_status}", not published`);
  if (!Array.isArray(m.resources) || !m.resources.some((r) => r && r.file_format === 'JSON' && typeof r.url === 'string' && r.url.includes(FEED_ID))) p.push('dataset no longer lists the camera JSON resource');
  return p;
}

// JSON text -> array of raw rows. Throws when the body is not the camera list (an HTML error page, an error object, a cut-off body).
export function parseFeed(body) {
  if (typeof body !== 'string' || !/^\s*\[/.test(body)) throw new Error('not the camera list (no JSON array)');
  let j;
  try { j = JSON.parse(body); } catch (e) { throw new Error(`camera list cut off or not JSON (${e.message})`); }
  if (!Array.isArray(j)) throw new Error('not the camera list (no JSON array)');
  return j;
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated camera id.
export function normalizeTwra(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object' || Array.isArray(r)) return bump('malformed');
  if (s(r.status) !== '1') return bump('notInUse'); // only status "1" is in use; anything else (or a missing status) is not listed
  const key = s(r.cameraid);
  if (!/^\d{1,8}$/.test(key)) return bump('noId');
  const link = s(r.imageurl);
  if (!LINK_RE.test(link)) return bump('noUrl');
  const name = s(r.cameraname) || s(r.videosurveillancestationname);
  if (!name) return bump('noName');
  const latS = s(r.latitude_4326), lonS = s(r.longitude_4326), lat = Number(latS), lon = Number(lonS);
  if (!latS || !lonS || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const id = `taiwan-wra-cameras-${Number(key)}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  const where = [s(r.countiesandcitieswherethemonitoringpointsarelocated), s(r.administrativedistrictwherethemonitoringpointislocated)].filter(Boolean).join('');
  const text = [s(r.basinname) && `River basin: ${s(r.basinname)}`, s(r.tributary) && `Tributary: ${s(r.tributary)}`, where && `Located in: ${where}`].filter(Boolean).join('. ');
  return {
    id,
    sourceId: 'taiwan-wra-cameras',
    name, // the Agency's own Chinese camera name
    road: '',
    direction: '',
    city: null,
    regionSlug: TWRA_REGION.slug,
    regionName: TWRA_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    ...(text ? { locationText: `${text}.` } : {}),
  };
}
