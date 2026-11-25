// Pure helpers for the British Columbia source (DriveBC). No network here.
// Camera list: BC Data Catalogue "DriveBC HighwayCams" (webcams.csv, Open Government Licence - BC, list only).
// Events: Open511 BC /events (Open Government Licence - BC). Camera pictures are NEVER fetched, stored or shown:
// the picture address is kept only as the link-out target (officialUrl).
// Beats Argos by: every BC camera is a licensed-list record with its own id, an honest place label (see bcPlace) and the
// same health check as California; BC road events carry their own source and timestamp and hide when stale.
export const BC_BOUNDS = { latMin: 48.2, latMax: 60.0, lonMin: -139.1, lonMax: -114.0 };
export const BC_LICENCE_TITLE = 'Open Government Licence - British Columbia'; // CKAN license_title the importer insists on
export const CKAN_PACKAGE_URL = 'https://catalogue.data.gov.bc.ca/api/3/action/package_show?id=bc-highwaycams';
export const OPEN511_EVENTS_URL = 'https://api.open511.gov.bc.ca/events';
export const OPEN511_PAGE = 500;

const s = (v) => (typeof v === 'string' ? v.trim() : '');
const WORD = { N: 'North', S: 'South', E: 'East', W: 'West', NE: 'Northeast', NW: 'Northwest', SE: 'Southeast', SW: 'Southwest', NNE: 'North-northeast', NNW: 'North-northwest', SSE: 'South-southeast', SSW: 'South-southwest', ENE: 'East-northeast', ESE: 'East-southeast', WNW: 'West-northwest', WSW: 'West-southwest' };

// RFC 4180 CSV -> array of objects keyed by the header row. A row with the wrong number of fields is counted, not guessed at.
export function parseCsv(text) {
  const t = String(text || '').replace(/^﻿/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f !== '' || row.length) { row.push(f.replace(/\r$/, '')); rows.push(row); }
  const head = rows.shift() || [];
  let badRows = 0;
  const objs = [];
  for (const r of rows) {
    if (r.length === 1 && r[0] === '') continue; // blank line
    if (r.length !== head.length) { badRows++; continue; }
    objs.push(Object.fromEntries(head.map((k, i) => [k, r[i]])));
  }
  return { head, rows: objs, badRows };
}

// DriveBC gives NO nearest-community or city field. A place is the camera's own name without its direction ("Elkford - S",
// "Golden eastbound"), kept only when BOTH hold: (1) it does not read as a road, junction or numbered location, and (2) DriveBC's
// own caption for that camera names it as a location ("... in Elkford", "... south of Campbell River", "approaching Mission",
// "near Golden"), not as part of a road name ("Lake Placid Road"). null otherwise. Ceiling: a real town whose cameras are all
// captioned only by road ("Highway 1 at Highway 95 interchange") gets no place, so it has no city page; the page says "named
// places", never municipalities.
const ORIENT = /\s+-\s+(?:N|S|E|W|NE|NW|SE|SW|NNE|NNW|SSE|SSW|ENE|ESE|WNW|WSW)$/i;
const BOUND = /\s+(?:north|south|east|west)bound$/i;
const ROAD_WORDS = 'hwy|highway|road|rd|street|avenue|ave|way|drive|dr|bypass|overpass|underpass|junction|interchange|exit|bridge|tunnel|rest|area|chain-up|summit|pass|crossing|connector|ramp|corridor|ferry|terminal|border|boulevard|blvd|trail|parkway';
const ROADISH = new RegExp(`\\b(?:${ROAD_WORDS}|at)\\b`, 'i'); // a name with "at" is an intersection ("Hwy 10 at 192 Street")
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function bcPlace(camName, caption) {
  const p = s(camName).replace(ORIENT, '').replace(BOUND, '').replace(/\s+/g, ' ').trim();
  if (!p || /[0-9]/.test(p) || / - /.test(p) || /[-/&"]/.test(p) || ROADISH.test(p)) return null;
  const named = new RegExp(`\\b(?:in|of|near|approaching|outside)\\s+${esc(p)}\\b(?!\\s+(?:${ROAD_WORDS})\\b)`, 'i');
  return named.test(s(caption)) ? p : null;
}

// Returns a camera or null; drop reasons are counted into `drop`.
export function normalizeDriveBc(raw, lastSeen, drop = {}) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!raw || typeof raw !== 'object') return bump('malformed');
  const id = s(raw.id), name = s(raw.camName);
  if (!/^\d{1,6}$/.test(id) || !name) return bump('noIdOrName');
  const latS = s(raw.latitude), lonS = s(raw.longitude);
  const lat = Number(latS), lon = Number(lonS);
  if (!latS || !lonS || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < BC_BOUNDS.latMin || lat > BC_BOUNDS.latMax || lon < BC_BOUNDS.lonMin || lon > BC_BOUNDS.lonMax) return bump('outOfBounds');
  const img = s(raw.links_imageURL);
  if (!/^https:\/\/www\.drivebc\.ca\//.test(img)) return bump('noUrl'); // link-out target must be on DriveBC itself
  const hwy = s(raw.highway_number);
  const o = s(raw.orientation).toUpperCase();
  return {
    id: `drivebc-${id}`,
    sourceId: 'drivebc',
    name,
    road: /^\d{1,3}[A-Z]?$/.test(hwy) ? `Highway ${hwy}` : hwy, // a non-number ("Cecil Lake Rd") is kept as given
    direction: WORD[o] ? `Facing ${WORD[o]}` : '', // the way the CAMERA looks, not the direction of traffic
    city: bcPlace(name, raw.caption),
    regionSlug: 'british-columbia',
    regionName: 'British Columbia',
    lat, lon,
    feedType: 'still',
    ...(s(raw.caption) ? { locationText: s(raw.caption).replace(/\s+/g, ' ').slice(0, 300) } : {}), // DriveBC's own caption: where the camera is
    officialUrl: img, // link-out target only; never fetched for its bytes beyond a header check by the health checker
    officialUrlLastVerified: null,
    lastSeen,
  };
}

// ---- Open511 events ----
const isoUtc = (v) => { // Open511 interval parts have no zone; they are UTC (checked against a description quoting "8:00 AM MST" = 15:00)
  const t = s(v); if (!t) return null;
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : t + 'Z');
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const DIR = { N: 'North', S: 'South', E: 'East', W: 'West', NORTHBOUND: 'North', SOUTHBOUND: 'South', EASTBOUND: 'East', WESTBOUND: 'West' };

// One Open511 event -> a stored item, or null (reason counted). Shape guard: fails closed on anything unexpected.
export function parseOpen511(e, now, drop = {}) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!e || typeof e !== 'object' || !s(e.id)) return bump('malformed');
  if (e.status !== 'ACTIVE') return bump('notActive');
  const g = e.geography;
  const pts = g && Array.isArray(g.coordinates) ? (g.type === 'Point' ? [g.coordinates] : g.type === 'LineString' ? g.coordinates : null) : null;
  if (!pts || !pts.length || !pts.every((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))) return bump('badGeometry');
  const [lon, lat] = pts[0];
  if (lat < BC_BOUNDS.latMin || lat > BC_BOUNDS.latMax || lon < BC_BOUNDS.lonMin || lon > BC_BOUNDS.lonMax) return bump('outOfBounds');
  const last = pts[pts.length - 1];
  const r = Array.isArray(e.roads) && e.roads[0] ? e.roads[0] : {};
  const iv = e.schedule && Array.isArray(e.schedule.intervals) ? e.schedule.intervals.map((x) => String(x).split('/')) : [];
  const spans = iv.map(([a, b]) => ({ start: isoUtc(a), end: isoUtc(b) })).filter((x) => x.start);
  if (!spans.length) return bump('noSchedule');
  const t = new Date(now).getTime();
  const live = spans.find((x) => Date.parse(x.start) <= t && (!x.end || Date.parse(x.end) >= t));
  // Bare web addresses in feed text are dropped: they are untrusted and name hosts the privacy page does not list.
  const noUrl = (v) => (v ? v.replace(/\s*(More info:?\s*)?https?:\/\/\S+/gi, '').trim() : v);
  const text = noUrl(s(e.description)) || noUrl(s(e.headline));
  if (!text) return bump('noText');
  return {
    id: `bc-evt-${s(e.id).replace(/^.*\//, '')}`,
    road: s(r.name), direction: DIR[s(r.direction).toUpperCase()] || null, roadState: s(r.state) || null,
    area: Array.isArray(e.areas) && e.areas[0] ? s(e.areas[0].name) || null : null,
    eventType: s(e.event_type) || null, severity: s(e.severity) || null, headline: s(e.headline) || null, text,
    lat, lon, endLat: pts.length > 1 ? last[1] : null, endLon: pts.length > 1 ? last[0] : null,
    start: spans[0].start, end: spans[0].end, endIndefinite: !spans[0].end, updated: isoUtc(e.updated),
    active: Boolean(live), closed: s(r.state) === 'CLOSED',
  };
}
