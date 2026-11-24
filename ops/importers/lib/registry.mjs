// Shared registry helpers: normalize, validate, count, safe write.
import { writeFileSync, readFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { QC_REGIONS } from './quebec.mjs';
import { TOR_REGION } from './toronto.mjs';
import { CGY_REGION } from './calgary.mjs';
import { HK_REGION, HK_COUNTRY } from './hongkong.mjs';
import { IS_REGION, IS_COUNTRY } from './iceland.mjs';
import { TX_REGION, TX_COUNTRY } from './austin.mjs';
import { NSW_REGION, NSW_COUNTRY } from './nsw.mjs';
import { TW_REGION, TW_COUNTRY } from './taiwan.mjs';
import { IA_REGION, IA_COUNTRY } from './iowa.mjs';
import { A22_REGION, A22_COUNTRY } from './a22.mjs';
import { LA_REGION, LA_COUNTRY } from './brla.mjs';
import { MADRID_REGION, MADRID_COUNTRY } from './madrid.mjs';
import { LN_REGION, LN_COUNTRY } from './tfl.mjs';

export const CA_BOUNDS = { latMin: 32.3, latMax: 42.1, lonMin: -124.6, lonMax: -114.0 };
// Optional text field (one source gives it, another does not): the source's own words for where the camera is. Text only, never a picture.
export const OPTIONAL_FIELDS = ['locationText', 'firstSeen']; // firstSeen: ISO time this camera id first appeared in our registry (set by commitSource, never by an importer)
export const FORBIDDEN_FIELDS = ['thumbnail', 'imageUrl', 'image', 'imageData', 'streamUrl', 'previewUrl'];
export const CAMERA_FIELDS = ['id', 'sourceId', 'name', 'road', 'direction', 'city', 'regionSlug', 'regionName',
  'lat', 'lon', 'feedType', 'officialUrl', 'officialUrlLastVerified', 'lastSeen'];

const s = (v) => (typeof v === 'string' ? v.trim() : '');
// Caltrans types some places in lower case ("orange" next to "Orange"); that made two cities with one page address.
export const cleanCity = (v) => s(v).replace(/\s+/g, ' ').toLowerCase().replace(/(^|[ '-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

// The ONE road normalizer: 'I-405', 'i 405', 'SR-91', 'US-101', 'I-5' -> 'i-405', 'sr-91', 'us-101', 'i-5'. A trailing
// letter stays (Caltrans 'SR-99S' is kept apart from 'SR-99': what the suffix means is not documented in the feed).
// Returns '' for anything it cannot read; callers must skip '' (never build a page or match on it).
export const roadSlug = (road) => {
  const m = s(road).toUpperCase().match(/^(I|SR|US)[\s-]*0*(\d{1,3})([A-Z]?)$/);
  return m ? `${m[1].toLowerCase()}-${m[2]}${m[3].toLowerCase()}` : '';
};

// Returns a camera or null; drop reasons are counted into `drop`.
export function normalizeCaltrans(raw, district, lastSeen, drop = {}) {
  const c = raw && raw.cctv;
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!c || !c.location) return bump('malformed');
  if (String(c.inService).toLowerCase() !== 'true') return bump('notInService');
  const L = c.location;
  const lat = Number(L.latitude), lon = Number(L.longitude);
  if (!s(L.latitude) || !s(L.longitude) || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < CA_BOUNDS.latMin || lat > CA_BOUNDS.latMax || lon < CA_BOUNDS.lonMin || lon > CA_BOUNDS.lonMax) return bump('outOfBounds');
  const still = s(c.imageData?.static?.currentImageURL);
  const video = s(c.imageData?.streamingVideoURL);
  const officialUrl = still || video;
  if (!officialUrl || !s(c.index)) return bump('noUrlOrIndex');
  return {
    id: `caltrans-d${String(district).padStart(2, '0')}-${s(c.index)}`,
    sourceId: 'caltrans',
    name: s(L.locationName),
    road: s(L.route) + s(L.routeSuffix),
    direction: s(L.direction),
    city: cleanCity(L.nearbyPlace) || null, // county is NOT trusted; city only from nearbyPlace
    regionSlug: 'california',
    regionName: 'California',
    lat, lon,
    feedType: still ? 'still' : 'video',
    officialUrl,
    officialUrlLastVerified: null, // never HTTP-checked by the importer
    lastSeen,
  };
}

export function dedupe(cams, drop = {}) {
  const ids = new Set(), keys = new Set(), out = [];
  for (const c of cams) {
    const k = [c.lat.toFixed(4), c.lon.toFixed(4), c.road, c.direction].join('|');
    if (ids.has(c.id)) { drop.dupId = (drop.dupId || 0) + 1; continue; }
    if (keys.has(k)) { drop.dupLocation = (drop.dupLocation || 0) + 1; continue; }
    ids.add(c.id); keys.add(k); out.push(c);
  }
  return out;
}

// Returns list of problems (empty = valid).
export function validateCamera(c) {
  const p = [];
  for (const f of CAMERA_FIELDS) if (!(f in c)) p.push(`missing ${f}`);
  for (const f of FORBIDDEN_FIELDS) if (f in c) p.push(`forbidden field ${f}`);
  for (const f of Object.keys(c)) if (!CAMERA_FIELDS.includes(f) && !OPTIONAL_FIELDS.includes(f)) p.push(`unknown field ${f}`);
  if ('firstSeen' in c && !(typeof c.firstSeen === 'string' && Number.isFinite(Date.parse(c.firstSeen)))) p.push('bad firstSeen');
  if ('locationText' in c && (typeof c.locationText !== 'string' || !c.locationText || c.locationText.length > 300)) p.push('bad locationText');
  if (typeof c.id !== 'string' || !c.id.startsWith(`${c.sourceId}-`)) p.push('id not prefixed by sourceId');
  if (!Number.isFinite(c.lat) || c.lat < -90 || c.lat > 90) p.push('bad lat');
  if (!Number.isFinite(c.lon) || c.lon < -180 || c.lon > 180) p.push('bad lon');
  if (!['still', 'video'].includes(c.feedType)) p.push('bad feedType');
  if (typeof c.officialUrl !== 'string' || !/^https?:\/\//.test(c.officialUrl)) p.push('bad officialUrl');
  return p;
}

// The ONE region -> country table (keyed by regionSlug). A new region needs a row here before it gets any page; a region with no row
// is counted by region but has no country, so the site builds nothing for it (tests/registry fails if a registry region is missing).
const CANADA = { countryCode: 'CA', countrySlug: 'canada', countryName: 'Canada' };
export const REGION_COUNTRY = {
  california: { countryCode: 'US', countrySlug: 'united-states', countryName: 'United States' },
  'british-columbia': CANADA,
  finland: { countryCode: 'FI', countrySlug: 'finland', countryName: 'Finland' },
  ...Object.fromEntries(QC_REGIONS.map((r) => [r.slug, CANADA])), // Quebec: the 14 regions the ministry feed names
  [TOR_REGION.slug]: CANADA, // Toronto: one region, the City's own list (no place field, so no city pages)
  [CGY_REGION.slug]: CANADA, // Calgary: one region, the City's own list (no place field, so no city pages)
  [HK_REGION.slug]: HK_COUNTRY, // Hong Kong: one region, the Transport Department's own list (District kept as text, no city pages)
  [IS_REGION.slug]: IS_COUNTRY, // Iceland: one region, the Road and Coastal Administration's own list (no place field, so no city pages)
  [LN_REGION.slug]: LN_COUNTRY, // London: one region, TfL's own JamCam list (city is London for every row, but the region page lists them all, no city pages)
  [NSW_REGION.slug]: NSW_COUNTRY, // New South Wales: one region, Transport for NSW's own Live Traffic list (region code kept as text, no city field, so no city pages)
  [TW_REGION.slug]: TW_COUNTRY, // Taiwan: one region, the Highway Bureau provincial-road CCTV list (road code and kilometre mark kept as text, no city field, so no city pages)
  [IA_REGION.slug]: IA_COUNTRY, // Iowa: one region, the Iowa DOT's own camera list (route kept as road, DOT type and function kept as text, no city field, so no city pages)
  [A22_REGION.slug]: A22_COUNTRY, // A22 Brenner motorway (Italy): one region, Autobrennero's own webcams from the Open Data Hub (kilometre mark and carriageway side kept as text, no city field, so no city pages)
  [LA_REGION.slug]: LA_COUNTRY, // Louisiana: one source, LADOTD cameras in Greater Baton Rouge as listed by the City of Baton Rouge open data portal (511LA camera code kept as the name, no city field, so no city pages; the region page says it is Greater Baton Rouge only)
  [MADRID_REGION.slug]: MADRID_COUNTRY, // Madrid (Spain): one source, the City of Madrid's own traffic camera list (camera number kept in the name text, no city or road field, so no city pages; the region page says it is the city of Madrid only, not the DGT national feed)
  [TX_REGION.slug]: TX_COUNTRY,// Texas: one source, the City of Austin's own list (no city field, so no city pages; the region page says it is Austin only)
};
export const countryOf = (regionSlug) => REGION_COUNTRY[regionSlug] || null;

// The ONE place any page count comes from. by: 'country' | 'region' | 'city' | 'road' | 'feedType'.
// 'country' is derived from the region through REGION_COUNTRY (never stored on a camera row, so a country cannot disagree with its region).
const COUNT_KEYS = { region: 'regionSlug', city: 'city', road: 'road', feedType: 'feedType', direction: 'direction' };
export function countsBy(cams, by) {
  if (by !== 'country' && !COUNT_KEYS[by]) throw new Error("countsBy: by must be 'country', 'region', 'city', 'road', 'feedType' or 'direction'");
  const val = by === 'country' ? (c) => countryOf(c.regionSlug)?.countrySlug : (c) => c[COUNT_KEYS[by]];
  const m = {};
  for (const c of cams) { const v = val(c); if (v) m[v] = (m[v] || 0) + 1; }
  return m;
}

export function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 1) + '\n');
  renameSync(tmp, path);
}

export function readJsonOrNull(path) {
  try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null; } catch { return null; }
}

// Multi-source registry (cameras.json holds every source). One importer rewrites ONLY its own rows: the rows of every
// other source are kept exactly as they were. Rows stay grouped by sourceId (alphabetical), original order inside a source.
export const ownRows = (all, sourceId) => (Array.isArray(all) ? all.filter((c) => c && c.sourceId === sourceId) : []);
export function mergeSource(all, sourceId, mine) {
  const others = Array.isArray(all) ? all.filter((c) => !(c && c.sourceId === sourceId)) : [];
  const key = (c) => String((c && c.sourceId) || '');
  return [...others, ...mine].map((c, i) => [c, i]).sort((a, b) => key(a[0]).localeCompare(key(b[0])) || a[1] - b[1]).map(([c]) => c);
}
// sources.json: replace rows with the same id, keep every other row.
export function upsertSources(existing, mine) {
  const ids = new Set(mine.map((s) => s.id));
  return [...(Array.isArray(existing) ? existing.filter((s) => s && !ids.has(s.id)) : []), ...mine];
}
// A registry file that exists but is not a JSON array (cut off, hand-edited) must stop the import: merging into "null" would drop every other source's rows.
export const registryUnreadable = (path) => existsSync(path) && !Array.isArray(readJsonOrNull(path));
