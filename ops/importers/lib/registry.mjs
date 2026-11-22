// Shared registry helpers: normalize, validate, count, safe write.
import { writeFileSync, readFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const CA_BOUNDS = { latMin: 32.3, latMax: 42.1, lonMin: -124.6, lonMax: -114.0 };
export const FORBIDDEN_FIELDS = ['thumbnail', 'imageUrl', 'image', 'imageData', 'streamUrl', 'previewUrl'];
export const CAMERA_FIELDS = ['id', 'sourceId', 'name', 'road', 'direction', 'city', 'regionSlug', 'regionName',
  'lat', 'lon', 'feedType', 'officialUrl', 'officialUrlLastVerified', 'lastSeen'];

const s = (v) => (typeof v === 'string' ? v.trim() : '');
// Caltrans types some places in lower case ("orange" next to "Orange"); that made two cities with one page address.
export const cleanCity = (v) => s(v).replace(/\s+/g, ' ').toLowerCase().replace(/(^|[ '-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

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
  for (const f of Object.keys(c)) if (!CAMERA_FIELDS.includes(f)) p.push(`unknown field ${f}`);
  if (typeof c.id !== 'string' || !c.id.startsWith(`${c.sourceId}-`)) p.push('id not prefixed by sourceId');
  if (!Number.isFinite(c.lat) || c.lat < -90 || c.lat > 90) p.push('bad lat');
  if (!Number.isFinite(c.lon) || c.lon < -180 || c.lon > 180) p.push('bad lon');
  if (!['still', 'video'].includes(c.feedType)) p.push('bad feedType');
  if (typeof c.officialUrl !== 'string' || !/^https?:\/\//.test(c.officialUrl)) p.push('bad officialUrl');
  return p;
}

// The ONE place any page count comes from. by: 'region' | 'city' | 'road' | 'feedType'.
const COUNT_KEYS = { region: 'regionSlug', city: 'city', road: 'road', feedType: 'feedType', direction: 'direction' };
export function countsBy(cams, by) {
  const key = COUNT_KEYS[by];
  if (!key) throw new Error("countsBy: by must be 'region', 'city', 'road', 'feedType' or 'direction'");
  const m = {};
  for (const c of cams) if (c[key]) m[c[key]] = (m[c[key]] || 0) + 1;
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
