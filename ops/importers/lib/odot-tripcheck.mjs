// Pure helpers for Oregon cameras (ODOT TripCheck camera inventory). No network here.
// Feed (read 2026-11-26): JSON despite the .js name, features[].attributes {cameraId, publishedImageId, filename, iconType, latitude, longitude, route, title, videoId}.
// The link-out is https://tripcheck.com/RoadCams/cams/<filename> (path casing answered 200 image/jpeg to one HEAD request on 2026-11-26). The importer never requests it.
// The list also carries cameras titled as being in Idaho, Washington state or California: they are left out of the Oregon page and counted.
// Used by ops/importers/gevpacks.mjs (the ODOT pack): GEV bundles an older copy of this list, so we read ODOT's current one under the same licence row.
// Beats Argos by: every Oregon camera named as ODOT TripCheck names it, with its route and own coordinates, from the official current list, with the credit line printed.
import { robotsAllows } from './iceland.mjs';
export { robotsAllows }; // one robots.txt reader

export const FEED_URL = 'https://tripcheck.com/Scripts/map/data/cctvinventory.js';
export const ROBOTS_URL = 'https://tripcheck.com/robots.txt'; // 404 on 2026-11-26: no rules
export const LINK_BASE = 'https://tripcheck.com/RoadCams/cams/';
export const OR_REGION = { slug: 'oregon', name: 'Oregon' };
export const OR_COUNTRY = { countryCode: 'US', countrySlug: 'united-states', countryName: 'United States' };
export const BOUNDS = { latMin: 41.9, latMax: 46.35, lonMin: -124.7, lonMax: -116.4 }; // sanity box only
// titles that say the camera is in a neighbouring state ("Washington County - ..." and "... at Washington St" are Oregon and do not match)
export const OUT_OF_STATE_RE = /^Idaho\b|\bWashington (-|at) |\bCalifornia\b|- WA\b/;
const FILE_RE = /^[A-Za-z0-9 _.@()&-]{1,200}\.jpe?g$/i;

const s = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ') : '');

// Body text -> array of attribute objects. Throws on an HTML page, an error object, a cut-off body or a truncated query result.
export function parseFeed(body) {
  const t = typeof body === 'string' ? body.replace(/^﻿/, '') : '';
  if (!/^\s*\{/.test(t)) throw new Error('not the camera list (no JSON object)');
  let j;
  try { j = JSON.parse(t); } catch (e) { throw new Error(`camera list cut off or not JSON (${e.message})`); }
  if (!Array.isArray(j.features)) throw new Error('not the camera list (no features array)');
  if (j.exceededTransferLimit) throw new Error('camera list cut off (exceededTransferLimit)');
  return j.features.map((f) => f && f.attributes);
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated camera id or picture file.
export function normalizeOdot(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object' || Array.isArray(r)) return bump('malformed');
  if (![r.cameraId, r.publishedImageId].every((n) => Number.isInteger(n) && n > 0)) return bump('noId');
  const file = typeof r.filename === 'string' ? r.filename : '';
  if (!FILE_RE.test(file) || file !== file.trim() || file.startsWith('.')) return bump('badFile');
  const name = s(r.title);
  if (!name) return bump('noName');
  if (name.length > 150 || /[<>]/.test(name)) return bump('badName');
  if (OUT_OF_STATE_RE.test(name)) return bump('outOfState');
  const { latitude: lat, longitude: lon } = r;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  // cameraId repeats in the real list (two views of one pole), so the published image id is part of the id
  const id = `odot-tripcheck-${r.cameraId}-${r.publishedImageId}`;
  if (seen.has(id)) return bump('dupKey');
  if (seen.has(file.toLowerCase())) return bump('dupFile'); // the host is IIS: file names are not case sensitive
  seen.add(id); seen.add(file.toLowerCase());
  const route = s(r.route);
  const road = /^(city|cnty)$/i.test(route) || !/^[A-Za-z0-9 -]{1,12}$/.test(route) ? '' : route; // "City" and "CNTY" are the list's labels for local streets, not roads
  return {
    id,
    sourceId: 'odot-tripcheck',
    name,
    road: '', // not `road`: the site's road pages are California-only and count every source's road field, so the route is kept as text
    ...(road ? { locationText: `Route: ${road}.` } : {}),
    direction: '',
    city: null, // the list has no place field
    regionSlug: OR_REGION.slug,
    regionName: OR_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: LINK_BASE + encodeURIComponent(file),
    officialUrlLastVerified: null,
    lastSeen,
  };
}
