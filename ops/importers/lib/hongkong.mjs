// Pure helpers for Hong Kong (Transport Department "Traffic Snapshot Images" camera list on DATA.GOV.HK). No network here.
// Feed: one XML file, <image-list><image> rows (key, region, district, description, latitude, longitude, url). robots.txt of static.data.gov.hk: none published
// (it answers an S3 AccessDenied body); the importer still reads it and obeys any Disallow. We keep ONLY the link (a still picture address), never the picture.
// Beats Argos by: every Hong Kong camera named as the Transport Department names it, with its District and its camera key (for example [H429F]),
// the DATA.GOV.HK terms sentences re-read in code before every run, and an honest "last checked" per picture address.
export const HK_BOUNDS = { latMin: 22.1, latMax: 22.6, lonMin: 113.8, lonMax: 114.5 }; // Hong Kong SAR; sanity box only
export const FEED_URL = 'https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.xml';
export const ROBOTS_URL = 'https://static.data.gov.hk/robots.txt';
export const TERMS_URL = 'https://data.gov.hk/en/terms-and-conditions';
// Both must still be in the terms page text (read 2026-11-24).
export const LICENCE_PHRASES = ['for both commercial and non-commercial purposes', 'DATA.GOV.HK'];
export const ATTRIBUTION = 'Source: Transport Department, The Government of the Hong Kong Special Administrative Region, via DATA.GOV.HK.';
export const IMAGE_RE = /^https:\/\/tdcctv\.data\.one\.gov\.hk\/([A-Za-z0-9]{2,24})\.JPG$/; // the link-out target must be the Department's own picture address
export const HK_REGION = { slug: 'hong-kong', name: 'Hong Kong' };
export const HK_COUNTRY = { countryCode: 'HK', countrySlug: 'hong-kong', countryName: 'Hong Kong' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export const unescapeXml = (v) => v.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 31 && n < 0x110000 ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] ?? m;
});

// XML text -> list of plain { tag: text } records. Throws when the body is not the camera list (an HTML error page, an S3/XML error body).
export function parseImages(xml) {
  if (typeof xml !== 'string' || !/^\s*(<\?xml[^>]*\?>\s*)?<image-list[\s>]/.test(xml)) throw new Error('not the camera list (no <image-list> root)');
  if (!/<\/image-list>\s*$/.test(xml)) throw new Error('camera list cut off (no closing </image-list>)');
  return [...xml.matchAll(/<image>([\s\S]*?)<\/image>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/<([a-z]+)>([\s\S]*?)<\/\1>/g)].map((a) => [a[1], unescapeXml(a[2].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1'))])));
}

// robots.txt text -> true when `path` may be fetched by a generic robot (longest-prefix Disallow/Allow in the "*" group; no file or no rules = allowed).
export function robotsAllows(text, path) {
  if (typeof text !== 'string' || !/^\s*user-agent\s*:/im.test(text)) return true;
  let star = false, inGroup = false, best = { len: -1, allow: true };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim(); const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
    if (k === 'user-agent') { if (!inGroup) star = false; inGroup = true; if (v === '*') star = true; continue; }
    inGroup = false;
    if (!star || (k !== 'disallow' && k !== 'allow') || !v) continue;
    if (path.startsWith(v) && v.length >= best.len) best = { len: v.length, allow: k === 'allow' };
  }
  return best.allow;
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated key.
export function normalizeHk(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const link = s(r.url);
  const m = IMAGE_RE.exec(link);
  if (!m) return bump('noUrl');
  const key = s(r.key);
  if (!/^[A-Za-z0-9]{2,24}$/.test(key) || key.toUpperCase() !== m[1].toUpperCase()) return bump('noUrl'); // the key and the picture address must agree
  const name = s(r.description);
  if (!name) return bump('noName');
  const lat = Number(s(r.latitude)), lon = Number(s(r.longitude));
  if (!s(r.latitude) || !s(r.longitude) || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < HK_BOUNDS.latMin || lat > HK_BOUNDS.latMax || lon < HK_BOUNDS.lonMin || lon > HK_BOUNDS.lonMax) return bump('outOfBounds');
  const id = `hongkong-traffic-${key.toLowerCase()}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  const district = s(r.district), region = s(r.region);
  const where = [district && `District: ${district}`, region && `Area: ${region}`].filter(Boolean).join('. ');
  return {
    id,
    sourceId: 'hongkong-traffic',
    name, // the Department's own text, which already ends with the camera key, for example "Aberdeen Tunnel - Wan Chai Side [H210F]"
    road: s(name.replace(/\s*\[[^\]]*\]\s*$/, '').split(/ near | - /)[0]),
    direction: '',
    city: null, // District is the Department's own word for a part of Hong Kong; it is kept as text, no invented place pages
    regionSlug: HK_REGION.slug,
    regionName: HK_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    ...(where ? { locationText: `${where}.` } : {}),
  };
}
