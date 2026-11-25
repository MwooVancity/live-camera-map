// Pure helpers for Iceland (Icelandic Road and Coastal Administration, Vegagerðin, road camera list). No network here.
// Feed: one JSON array, one row per camera VIEW (Maelist_nr station, Myndavel station name, Vegheiti road name, NrVegur road number, Skyring view text, Slod picture address, Breidd lat, Lengd lon).
// We keep ONLY the link (a still picture address), never the picture. The terms page text is re-read before every run (see LICENCE_PHRASES).
// Beats Argos by: every Icelandic road camera view named as the Administration names it (station and view text) with its road name and number, the CC BY 4.0 credit the Administration requires printed on the page,
// the terms page sentences re-read in code before every run, and an honest "last checked" per picture address.
export const BOUNDS = { latMin: 63.2, latMax: 66.7, lonMin: -24.8, lonMax: -12.8 }; // Iceland; sanity box only
export const FEED_URL = 'https://gagnaveita.vegagerdin.is/api/vefmyndavelar2014_1';
export const ROBOTS_URL = 'https://gagnaveita.vegagerdin.is/robots.txt';
export const TERMS_URL = 'https://www.vegagerdin.is/vegagerdin/gagnasafn/vefthjonustur/terms-and-conditions';
// All must still be in the terms page text (read 2026-11-24, tags removed, spaces collapsed).
export const LICENCE_PHRASES = ['Creative Commons Attribution 4.0 International', 'CC BY 4.0', 'Act No. 45/2018', 'must acknowledge the source of the data', 'The name of the licensor'];
export const ATTRIBUTION = 'Source: Icelandic Road and Coastal Administration (Vegagerðin), road camera list, CC BY 4.0.';
export const IMAGE_RE = /^https:\/\/www\.vegagerdin\.is\/vgdata\/vefmyndavelar\/([A-Za-z0-9_-]{1,80})\.jpg$/; // the link-out target must be the Administration's own picture directory
export const IS_REGION = { slug: 'iceland', name: 'Iceland' };
export const IS_COUNTRY = { countryCode: 'IS', countrySlug: 'iceland', countryName: 'Iceland' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : typeof v === 'number' ? String(v) : '');
// terms page HTML -> plain text, so a phrase split by a tag or a line break is still found
export const pageText = (html) => String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

// JSON text -> array of rows. Throws when the body is not the camera list (an HTML error page, an object, a cut-off body).
export function parseFeed(body) {
  if (typeof body !== 'string' || !/^\s*\[/.test(body)) throw new Error('not the camera list (no JSON array)');
  let v;
  try { v = JSON.parse(body); } catch (e) { throw new Error(`camera list cut off or invalid JSON (${e.message})`); }
  if (!Array.isArray(v)) throw new Error('not the camera list (no JSON array)');
  return v;
}

// robots.txt text -> true when `path` (path plus query) may be fetched by a generic robot. Group "*" only; rules may use `*` (any run of characters) and a trailing `$`;
// the LONGEST matching rule wins and Allow wins a tie (RFC 9309); an empty Disallow allows everything; no file or no rules = allowed.
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
    const anchored = v.endsWith('$'), pat = (anchored ? v.slice(0, -1) : v).split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    if (!new RegExp('^' + pat + (anchored ? '$' : '')).test(path)) continue;
    const allow = k === 'allow';
    if (v.length > best.len || (v.length === best.len && allow)) best = { len: v.length, allow };
  }
  return best.allow;
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated picture address.
export function normalizeIs(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const link = s(r.Slod);
  const m = IMAGE_RE.exec(link);
  if (!m) return bump('noUrl');
  const view = s(r.Skyring) || s(r.Myndavel);
  if (!view) return bump('noName');
  if (typeof r.Breidd !== 'number' || typeof r.Lengd !== 'number' || !Number.isFinite(r.Breidd) || !Number.isFinite(r.Lengd)) return bump('badCoords');
  const lat = r.Breidd, lon = r.Lengd;
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const id = `iceland-vegagerdin-${m[1].toLowerCase().replace(/_/g, '-')}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  const road = s(r.Vegheiti), num = s(r.NrVegur);
  return {
    id,
    sourceId: 'iceland-vegagerdin',
    name: `${view} [${m[1]}]`, // the Administration's own view text plus the picture file name, because several views share one text
    road: road && num ? `${road} (${num})` : road,
    direction: '',
    city: null, // the feed has no place field; the station name is kept as text only
    regionSlug: IS_REGION.slug,
    regionName: IS_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    ...(s(r.Myndavel) ? { locationText: `Station: ${s(r.Myndavel)}.` } : {}),
  };
}
