// Pure helpers for the wildfire feed (NIFC WFIGS current interagency perimeters, US public domain row in data/source-permissions.json).
// No network here. Beats Argos by: each fire near a city or road carries its own distance from the nearest edge of the perimeter,
// acres, percent contained and update time, and the whole block hides itself when the file is older than 6 hours.
import { distKm } from '../../../site/src/lib/geo.mjs';
import { isFresh } from './conditions.mjs';

// ponytail: kept apart from SOURCE_IDS/MAX_AGE_MIN on purpose: the feed-licence test demands a quoted licence sentence for every
// SOURCE_IDS row, and NIFC publishes only a liability disclaimer (see plan.md item 19). Move in when Mike has confirmed the row.
export const WILDFIRE_SOURCE_ID = 'nifc-wfigs-wildland-fire-interagency-geospatial-services-arcgis-feature-service';
export const WILDFIRE_MAX_AGE_MIN = 360; // 6 hours
export const NEAR_FIRE_KM = 50; // a page lists a fire only when its perimeter edge is this close to the place
export const KEEP_KM = 175; // the importer keeps a fire within 150 km of any page place plus a 25 km buffer
export const RING_MAX = 20;
export const SOURCE_LABEL = 'NIFC WFIGS (US public domain)';
export const DATASET_URL = 'https://data-nifc.opendata.arcgis.com/';
export const INCIWEB_URL = 'https://inciweb.wildfire.gov/';
export const SERVICE = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query';
export const FIELDS = ['poly_IncidentName', 'attr_UniqueFireIdentifier', 'attr_IncidentSize', 'attr_PercentContained', 'attr_POOState', 'attr_IncidentTypeCategory', 'attr_FireDiscoveryDateTime', 'poly_DateCurrent'];
export const pageUrl = (offset = 0) => `${SERVICE}?${new URLSearchParams({ where: '1=1', outFields: FIELDS.join(','), maxAllowableOffset: '0.001', outSR: '4326', orderByFields: 'attr_UniqueFireIdentifier', resultOffset: String(offset), f: 'geojson' })}`;

const fin = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const iso = (ms) => (fin(ms) !== null && ms > 0 ? new Date(ms).toISOString() : null);
const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 80) : '');
const r4 = (n) => Number(n.toFixed(4));

// Outer rings of a Polygon or MultiPolygon as [lon, lat] points; [] for anything else or any bad coordinate.
export function outerPoints(g) {
  const polys = g && g.type === 'Polygon' ? [g.coordinates] : g && g.type === 'MultiPolygon' ? g.coordinates : null;
  if (!Array.isArray(polys)) return [];
  const pts = [];
  for (const p of polys) for (const pt of (Array.isArray(p) && Array.isArray(p[0]) ? p[0] : [])) {
    if (Array.isArray(pt) && Math.abs(pt[0]) <= 180 && Math.abs(pt[1]) <= 90 && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) pts.push(pt);
  }
  return pts;
}
// Evenly spaced pick, as [lat, lon]. ponytail: a big fire's nearest edge can be a few km off; the page says "about".
export function sampleRing(pts, n = RING_MAX) {
  const pick = pts.length <= n ? pts : Array.from({ length: n }, (_, i) => pts[Math.floor((i * pts.length) / n)]);
  return pick.map(([lon, lat]) => [r4(lat), r4(lon)]);
}

// One GeoJSON feature -> an incident, or null (with the reason counted in `drop`).
export function parseFeature(f, drop = {}) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  const p = f && f.properties;
  if (!p || typeof p !== 'object') return bump('malformed');
  const pts = outerPoints(f.geometry);
  if (!pts.length) return bump('noGeometry');
  if (clean(p.attr_IncidentTypeCategory).toUpperCase() === 'RX') return bump('prescribedBurn'); // a planned burn is not a wildfire
  const lons = pts.map((x) => x[0]), lats = pts.map((x) => x[1]);
  const pc = fin(p.attr_PercentContained);
  const id = clean(p.attr_UniqueFireIdentifier) || `${clean(p.poly_IncidentName)}-${r4(lats[0])}-${r4(lons[0])}`;
  return {
    id, name: clean(p.poly_IncidentName) || 'Unnamed fire', state: clean(p.attr_POOState).replace(/^US-/, '') || null,
    acres: fin(p.attr_IncidentSize), percentContained: pc !== null && pc >= 0 && pc <= 100 ? pc : null,
    discoveryDate: iso(p.attr_FireDiscoveryDateTime), updatedAt: iso(p.poly_DateCurrent),
    lat: r4((Math.min(...lats) + Math.max(...lats)) / 2), lon: r4((Math.min(...lons) + Math.max(...lons)) / 2), // middle of the bounding box
    ring: sampleRing(pts),
  };
}

// Nearest ring point of an incident to a point, km (null when the incident has no ring).
export const edgeKm = (inc, lat, lon) => (Array.isArray(inc.ring) && inc.ring.length ? Math.min(...inc.ring.map(([a, b]) => distKm(lat, lon, a, b))) : null);

// Incidents whose nearest ring point is within km of ANY of the points ([{lat, lon}]), nearest first. km on each = that distance.
export function wildfiresNear(items, points, km = NEAR_FIRE_KM) {
  const out = [];
  for (const i of Array.isArray(items) ? items : []) {
    let best = null;
    for (const p of points) { const d = edgeKm(i, p.lat, p.lon); if (d !== null && (best === null || d < best)) best = d; }
    if (best !== null && best <= km) out.push({ ...i, km: best });
  }
  return out.sort((a, b) => a.km - b.km || a.id.localeCompare(b.id));
}

// Whole answer -> file document, or throws (so nothing is written). prev = the last good document or null.
export function buildDoc({ collection, places, prev, now = new Date() }) {
  if (!collection || typeof collection !== 'object' || collection.error) throw new Error(`not a feature collection${collection && collection.error ? `: ${JSON.stringify(collection.error).slice(0, 120)}` : ''}`);
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('not a feature collection: no features array');
  const n = collection.features.length, before = prev && Number.isFinite(prev.fetchedCount) ? prev.fetchedCount : 0;
  if (before > 0 && n === 0) throw new Error('empty answer: keeping the old file');
  if (before > 0 && n < before / 2) throw new Error(`only ${n} perimeters against ${before} last time: keeping the old file`); // ponytail: a real drop that big hides the block after 6 h, which is the safe side
  const drop = {};
  const all = collection.features.map((f) => parseFeature(f, drop)).filter(Boolean);
  if (n > 0 && !all.length && !Object.keys(drop).every((k) => k === 'prescribedBurn')) throw new Error(`no feature had a usable shape (${JSON.stringify(drop)}): format changed?`);
  const items = all.filter((i) => places.some((p) => wildfiresNear([i], [p], KEEP_KM).length)).sort((a, b) => a.id.localeCompare(b.id));
  return {
    feed: 'wildfire', sourceId: WILDFIRE_SOURCE_ID, generatedAt: new Date(now).toISOString(),
    source: SOURCE_LABEL, sourceUrl: DATASET_URL, attribution: 'Wildfire perimeters: National Interagency Fire Center (WFIGS)',
    timeNote: 'discoveryDate and updatedAt are UTC; ring is [lat, lon] points, evenly spaced, at most 20 per fire; lat/lon is the middle of the bounding box',
    fetchedCount: n, keptWithin: KEEP_KM, drop, items,
  };
}

// The one gate for the page block: a file document -> incidents, [] when the shape is wrong or older than 6 hours.
export function usableWildfire(doc, now = new Date()) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.items) || typeof doc.generatedAt !== 'string') return [];
  return isFresh(doc.generatedAt, WILDFIRE_MAX_AGE_MIN, now) ? doc.items : [];
}
