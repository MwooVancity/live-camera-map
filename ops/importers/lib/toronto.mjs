// Pure helpers for Toronto (City of Toronto Open Data "Traffic Cameras", Open Government Licence - Toronto). No network here.
// Feed: CKAN datastore_search (under /api/, which the portal's robots.txt allows; the /download/ file path is Disallowed for robots, so it is not used).
// Each row is one intersection with a live picture address (IMAGEURL, a jpg) and up to four compass views. We keep ONLY the link, never the picture.
// Beats Argos by: every Toronto camera is an intersection from the City's own open list with the compass views it offers, the licence id and
// licence sentence re-read in code before every run, and an honest "last checked" per picture address.
export const TOR_BOUNDS = { latMin: 43.4, latMax: 44.0, lonMin: -79.9, lonMax: -79.0 }; // Toronto; sanity box only
export const PACKAGE_URL = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=traffic-cameras';
export const RESOURCE_ID = '824d2986-2fe0-4513-bdfb-e37e2499e7a9'; // "Traffic Camera List GeoJSON", the one datastore-active resource of the dataset
export const FEED_URL = `https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&limit=1000`;
export const LICENCE_ID = 'open-government-licence-toronto'; // CKAN license_id the importer insists on
export const TERMS_URL = 'https://open.toronto.ca/open-data-licence/';
// Both must still be on the licence page (read 2026-11-23). The en dash in the licence name is left out of the phrase on purpose.
export const LICENCE_PHRASES = ['including for commercial purposes', 'Contains information licensed under the Open Government Licence'];
export const ATTRIBUTION = 'Contains information licensed under the Open Government Licence – Toronto';
export const IMAGE_PREFIX = 'https://opendata.toronto.ca/transportation/tmc/rescucameraimages/CameraImages/';
export const TOR_REGION = { slug: 'toronto', name: 'Toronto' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
// Official street text is upper case ("YORK ST", "F G GARDINER XY E"). Title case for reading; one or two letter words stay as they are
// (F, G, XY, E, W), and the usual street-type words are spelt in the short form the City uses.
const SHORT = new Set(['ST', 'AVE', 'BLVD', 'RD', 'DR', 'CRES', 'PKWY', 'HWY', 'CT', 'TRL']);
export const streetCase = (v) => s(v).split(' ').map((w) => (SHORT.has(w) ? w[0] + w.slice(1).toLowerCase()
  : w.length <= 2 || /[^A-Za-z'.-]/.test(w) ? w
    : w.toLowerCase().replace(/(^|[-'])([a-z])/g, (m, a, b) => a + b.toUpperCase()))).join(' ');

// Two cameras at one intersection (different City camera numbers, a few metres apart) would read as the same link twice:
// when a name is shared, each one gets the City's own camera number (the loc####.jpg number) added, so no two labels are alike.
export function numberSharedNames(cams) {
  const n = {};
  for (const c of cams) n[c.name] = (n[c.name] || 0) + 1;
  return cams.map((c) => (n[c.name] > 1 ? { ...c, name: `${c.name} (camera ${c.id.replace('toronto-traffic-', '')})` } : c));
}

const VIEWS = ['North', 'East', 'South', 'West'];
// Returns a camera or null; drop reasons are counted into `drop`.
export function normalizeToronto(r, lastSeen, drop = {}) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const id = String(r.REC_ID ?? '').trim();
  const main = streetCase(r.MAINROAD), cross = streetCase(r.CROSSROAD);
  if (!/^\d{1,6}$/.test(id) || !main) return bump('noIdOrName');
  let g;
  try { g = typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry; } catch { return bump('badCoords'); }
  const pts = g && g.type === 'Point' ? [g.coordinates] : g && g.type === 'MultiPoint' ? g.coordinates : null;
  if (!Array.isArray(pts) || pts.length !== 1 || !Array.isArray(pts[0]) || !Number.isFinite(pts[0][0]) || !Number.isFinite(pts[0][1])) return bump('badCoords');
  const [lon, lat] = pts[0];
  if (lat < TOR_BOUNDS.latMin || lat > TOR_BOUNDS.latMax || lon < TOR_BOUNDS.lonMin || lon > TOR_BOUNDS.lonMax) return bump('outOfBounds');
  const link = s(r.IMAGEURL);
  if (!link.startsWith(IMAGE_PREFIX) || /\s/.test(link)) return bump('noUrl'); // the link-out target must be the City's own picture address
  const views = [r.DIRECTION1, r.DIRECTION2, r.DIRECTION3, r.DIRECTION4].map(s).filter((d) => VIEWS.includes(d));
  return {
    id: `toronto-traffic-${id}`,
    sourceId: 'toronto-traffic',
    name: cross ? `${main} at ${cross}` : main,
    road: main,
    direction: '', // the compass words are views the site offers, not the direction of traffic: kept in locationText
    city: null, // the feed has no neighbourhood or place field: no invented places
    regionSlug: TOR_REGION.slug,
    regionName: TOR_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    // All four views is the normal case and is said once on the page; only an exception is written on the row (so 240 rows do not repeat one sentence).
    ...(views.length === 4 ? {} : { locationText: views.length ? `Views listed by the City: ${views.join(', ')}.` : 'The City lists no compass view for this camera.' }),
  };
}
