// Pure helpers for Calgary (City of Calgary Open Data "Traffic Cameras", Open Government Licence - City of Calgary v2.1). No network here.
// Feed: the Socrata resource endpoint on data.calgary.ca (robots.txt read 2026-11-23: Crawl-delay 1, /resource/ and /stories/ not Disallowed).
// Each row is one camera: a live picture address (loc<number>.jpg), a place text "Road / Cross road", a quadrant word and a point. We keep ONLY the link.
// Beats Argos by: every Calgary camera named as the City names it (road / cross road, quadrant), from the City's own open list whose licence
// sentences are re-read in code before every run, with an honest "last checked" per picture address.
export const CGY_BOUNDS = { latMin: 50.8, latMax: 51.3, lonMin: -114.4, lonMax: -113.8 }; // Calgary; sanity box only
export const LIMIT = 5000; // a Socrata list of exactly this size was cut off (222 rows today)
export const FEED_URL = `https://data.calgary.ca/resource/k7p9-kppz.json?$limit=${LIMIT}`;
export const TERMS_URL = 'https://data.calgary.ca/stories/s/Open-Data-Terms/u45n-7awa';
// All must still be in the licence page text (read 2026-11-23). The en dash in the licence name is left out of the phrases on purpose.
export const LICENCE_PHRASES = ['including for commercial purposes', 'Contains information licensed under the Open Government Licence', 'City of Calgary'];
export const ATTRIBUTION = 'Contains information licensed under the Open Government Licence – City of Calgary.';
export const IMAGE_RE = /^https:\/\/trafficcam\.calgary\.ca\/loc(\d{1,6})\.jpg$/; // the link-out target must be the City's own picture address
export const CGY_REGION = { slug: 'calgary', name: 'Calgary' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// Two cameras with one place text would read as the same link twice: each gets the City's own camera number (the loc number) added.
export function numberSharedNames(cams) {
  const n = {};
  for (const c of cams) n[c.name] = (n[c.name] || 0) + 1;
  return cams.map((c) => (n[c.name] > 1 ? { ...c, name: `${c.name} (camera ${c.id.replace('calgary-traffic-', '')})` } : c));
}

// Returns a camera or null; drop reasons are counted into `drop`.
export function normalizeCalgary(r, lastSeen, drop = {}) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const link = s(r.camera_url && r.camera_url.url);
  const m = IMAGE_RE.exec(link);
  if (!m) return bump('noUrl');
  const name = s(r.camera_location);
  if (!name) return bump('noName');
  const g = r.point;
  const p = g && g.type === 'Point' ? g.coordinates : null;
  if (!Array.isArray(p) || typeof p[0] !== 'number' || typeof p[1] !== 'number' || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return bump('badCoords');
  const [lon, lat] = p;
  if (lat < CGY_BOUNDS.latMin || lat > CGY_BOUNDS.latMax || lon < CGY_BOUNDS.lonMin || lon > CGY_BOUNDS.lonMax) return bump('outOfBounds');
  const road = s(name.split('/')[0]);
  const quadrant = s(r.quadrant);
  return {
    id: `calgary-traffic-${m[1]}`,
    sourceId: 'calgary-traffic',
    name,
    road,
    direction: '', // the feed has no traffic direction; the quadrant is a part of the city, kept in locationText
    city: null, // the feed has no neighbourhood field: the quadrant is not a place name, so no invented places
    regionSlug: CGY_REGION.slug,
    regionName: CGY_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    ...(quadrant ? { locationText: `City quadrant: ${quadrant}.` } : {}),
  };
}
