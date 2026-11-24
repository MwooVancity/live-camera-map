// Pure helpers for Austin (City of Austin Open Data, dataset b4k4-adkb "Traffic Cameras", Austin Transportation & Public Works). No network here.
// Feed: one Socrata JSON list (camera_id, location_name, camera_status, primary_st, cross_st, signal_eng_area, screenshot_address, location.coordinates [lon, lat]).
// We keep ONLY the link (a still picture address) of cameras the City marks TURNED_ON, never the picture. The licence is read three ways before every run:
// the dataset metadata (licence name and attribution), the City's Open Data Terms of Use story text, and robots.txt of the portal (see LICENCE_PHRASES, META_*).
// Beats Argos by: every City of Austin traffic camera that the City itself marks TURNED_ON, named as the City names it with its camera number, street and cross street, from the City's own open list whose public-domain licence and terms sentences are re-read in code before every run.
export const AUSTIN_BOUNDS = { latMin: 30.0, latMax: 30.7, lonMin: -98.1, lonMax: -97.4 }; // Austin metro; sanity box only
export const LIMIT = 5000; // a Socrata list of exactly this size was cut off (1,009 rows today)
export const FEED_URL = `https://data.austintexas.gov/resource/b4k4-adkb.json?$limit=${LIMIT}`;
export const META_URL = 'https://data.austintexas.gov/api/views/b4k4-adkb.json';
export const ROBOTS_URL = 'https://data.austintexas.gov/robots.txt';
export const TERMS_PAGE_URL = 'https://data.austintexas.gov/stories/s/ranj-cccq'; // the human page (shown in the licence row); the importer reads its JSON form below
export const TERMS_URL = 'https://data.austintexas.gov/stories/s/ranj-cccq.json';
export const META_LICENCE = 'Public Domain';
export const META_ATTRIBUTION = 'City of Austin, Texas - data.austintexas.gov';
export const META_OWNER = 'Austin Transportation & Public Works'; // the department named in the dataset description (the terms ask for credit to both the City and the department)
// All must still be in the terms story text (read 2026-11-24, tags removed, spaces collapsed).
export const LICENCE_PHRASES = ['offered free and without restriction', 'are in the public domain', 'do not, and should not, include controls over its end use', 'proper credit be given'];
export const ATTRIBUTION = 'Source: City of Austin, Texas - data.austintexas.gov, Austin Transportation & Public Works, Traffic Cameras.';
export const IMAGE_RE = /^https:\/\/cctv\.austinmobility\.io\/image\/(\d{1,6})\.jpg$/; // the link-out target must be the City's own picture address
export const TX_REGION = { slug: 'texas', name: 'Texas' };
export const TX_COUNTRY = { countryCode: 'US', countrySlug: 'united-states', countryName: 'United States' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : typeof v === 'number' ? String(v) : '');
const tags = (h) => String(h).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// Terms story JSON text -> plain text of every html block. Throws when the body is not a story (an HTML error page, a cut-off body).
export function termsText(body) {
  let v;
  try { v = JSON.parse(body); } catch (e) { throw new Error(`terms story is not JSON (${e.message})`); }
  const out = [];
  (function walk(o) { if (!o || typeof o !== 'object') return; if (o.type === 'html' && typeof o.value === 'string') out.push(o.value); for (const k in o) walk(o[k]); })(v);
  if (!out.length) throw new Error('terms story has no text blocks');
  return tags(out.join(' '));
}

// Dataset metadata JSON text -> list of problems (empty = licence and attribution are still as read on 2026-11-24).
export function metaProblems(body) {
  let m;
  try { m = JSON.parse(body); } catch (e) { return [`metadata is not JSON (${e.message})`]; }
  const p = [];
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['metadata is not a dataset record'];
  if (m.license?.name !== META_LICENCE) p.push(`dataset licence is "${m.license?.name}", not "${META_LICENCE}"`);
  if (m.attribution !== META_ATTRIBUTION) p.push(`dataset attribution is "${m.attribution}", not "${META_ATTRIBUTION}"`);
  if (!tags(m.description || '').includes(META_OWNER)) p.push(`description no longer names ${META_OWNER}`);
  return p;
}

// JSON text -> array of rows. Throws when the body is not the camera list (an HTML error page, an object, a cut-off body).
export function parseFeed(body) {
  if (typeof body !== 'string' || !/^\s*\[/.test(body)) throw new Error('not the camera list (no JSON array)');
  let v;
  try { v = JSON.parse(body); } catch (e) { throw new Error(`camera list cut off or invalid JSON (${e.message})`); }
  if (!Array.isArray(v)) throw new Error('not the camera list (no JSON array)');
  return v;
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated camera id.
export function normalizeAustin(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  if (s(r.camera_status) !== 'TURNED_ON') return bump('notTurnedOn'); // DESIRED, VOID, REMOVED and anything new are not working cameras
  const cid = s(r.camera_id);
  if (!/^\d{1,6}$/.test(cid)) return bump('malformed');
  const link = s(r.screenshot_address);
  if (!IMAGE_RE.test(link)) return bump('noUrl');
  const place = s(r.location_name);
  if (!place) return bump('noName');
  const co = r.location && r.location.coordinates;
  if (!Array.isArray(co) || typeof co[0] !== 'number' || typeof co[1] !== 'number' || !Number.isFinite(co[0]) || !Number.isFinite(co[1])) return bump('badCoords');
  const [lon, lat] = co;
  if (lat < AUSTIN_BOUNDS.latMin || lat > AUSTIN_BOUNDS.latMax || lon < AUSTIN_BOUNDS.lonMin || lon > AUSTIN_BOUNDS.lonMax) return bump('outOfBounds');
  const id = `austin-traffic-${cid}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  const cross = s(r.cross_st), area = s(r.signal_eng_area);
  const text = [cross && `Cross street: ${cross}.`, area && `Signal area: ${area.charAt(0)}${area.slice(1).toLowerCase()}.`].filter(Boolean).join(' ');
  return {
    id,
    sourceId: 'austin-traffic',
    name: `${place} [${cid}]`, // the City's own location text plus its camera number, because 24 places share one text
    road: s(r.primary_st),
    direction: '',
    city: null, // the feed has no city field (it also lists cameras in the extra-territorial jurisdiction), so no city is invented
    regionSlug: TX_REGION.slug,
    regionName: TX_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    ...(text ? { locationText: text } : {}),
  };
}
