// Live-conditions page blocks (plan.md section 6). Pure functions plus a cached loader; no network.
// Beats Argos by: every block names its source, links the feed doc, shows its own timestamp, and is OMITTED
// (never empty, never faked) when its licence row is closed, its data is past its max age, or nothing is near the city.
// Every number a block shows is items.length of the list the block renders, computed here once.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { isEnabled } from '../../../tests/licensing/gate.mjs';
import { usableItems, usableNws, SOURCE_IDS, MAX_AGE_MIN } from '../../../ops/importers/lib/conditions.mjs';
import { roadSlug } from '../../../ops/importers/lib/registry.mjs';
import { WILDFIRE_SOURCE_ID, WILDFIRE_MAX_AGE_MIN, SOURCE_LABEL, DATASET_URL, usableWildfire, wildfiresNear } from '../../../ops/importers/lib/wildfire.mjs';

export const BUILT_AT = new Date().toISOString(); // when this build started: the 'page built' time on every live block
export const RADIUS_KM = 15; // a road item counts as "near" a city when within this of the city's camera centroid
export const MAX_ROWS = 15; // rows shown per list; the heading count is the full count

const condDir = () => process.env.CONDITIONS_DIR || resolve(process.cwd(), '../data/conditions');
const permFile = () => process.env.PERMISSIONS_FILE || resolve(process.cwd(), '../data/source-permissions.json');
const readOrNull = (f) => { try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { return null; } };

import { distKm } from './geo.mjs'; // the one distance function lives in geo.mjs (browser-safe); re-exported here for existing callers
export { distKm };
export const nearby = (items, c, km = RADIUS_KM) => items.filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lon) && distKm(c.lat, c.lon, i.lat, i.lon) <= km)
  .map((i) => ({ ...i, km: distKm(c.lat, c.lon, i.lat, i.lon) })).sort((a, b) => a.km - b.km);

// The k cameras closest to an item (great-circle km), nearest first, ties by camera id. [] when the item has no position.
export const NEAR_KM = 25; // a road page lists a closure or sign only if one of its cameras is within this
export function nearestCameras(item, cams, k = 3) {
  if (!item || !Number.isFinite(item.lat) || !Number.isFinite(item.lon)) return [];
  return cams.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon))
    .map((camera) => ({ camera, km: distKm(item.lat, item.lon, camera.lat, camera.lon) }))
    .sort((a, b) => a.km - b.km || a.camera.id.localeCompare(b.camera.id)).slice(0, k);
}

export function loadLive() {
  const perms = readOrNull(permFile());
  const rows = new Map(((perms && perms.sources) || []).map((s) => [s.id, s]));
  return { rows, doc: (name) => readOrNull(resolve(condDir(), `${name}.json`)) };
}

const firstUrl = (row) => (String((row && row.provenance) || '').match(/https?:\/\/[^\s,)]+/) || [null])[0];
const src = (live, feed, now) => { const row = live.rows.get(SOURCE_IDS[feed]); return { row, ok: isEnabled(row, now) }; };

// A feed's state for the region page: one line per feed, from the same gate the blocks use.
export function feedStatus(feed, live = loadLive(), now = new Date()) {
  const nws = feed.startsWith('nws-');
  const { row, ok } = src(live, feed, now);
  const doc = nws ? null : live.doc(feed === 'bc-events' ? 'bc-events' : `ca-${feed}`);
  const asof = nws ? ((live.doc('nws-los-angeles') || {}).forecast || {}).fetchedAt : doc && doc.generatedAt;
  const items = nws ? null : usableItems(doc, feed, now);
  const state = !ok ? 'licence not enabled' : !asof ? 'no data' : (nws ? Boolean(usableNws(live.doc('nws-los-angeles'), now).periods.length) : items.length > 0) ? 'fresh' : 'older than its limit';
  return { feed, name: row ? row.name.replace(/ \(.*$/, '') : feed, asof: asof || null, maxAgeMin: MAX_AGE_MIN[feed], state, failed: (doc && doc.failedDistricts) || [] };
}
export const FEED_LIST = ['lcs', 'cc', 'cms', 'rwis', 'nws-forecast', 'nws-alerts'];
// Live feeds per region (the region hub lists exactly these). British Columbia has road events only: no US weather source is used there.
export const FEEDS_BY_REGION = { california: FEED_LIST, 'british-columbia': ['bc-events'] };

const metaOf = (live, now, feeds, asofs) => {
  const rs = feeds.map((f) => src(live, f, now).row);
  return { source: rs.map((r) => r.name.replace(/ \(.*$/, '')).join('; '), attribution: [...new Set(rs.map((r) => r.attribution))].join(' | '), link: firstUrl(rs[0]), asof: [...asofs].sort()[0] };
};
const caItemsOf = (live, now, feed) => (src(live, feed, now).ok ? usableItems(live.doc(`ca-${feed}`), feed, now) : []);

// British Columbia city blocks: DriveBC Open511 events in effect now within RADIUS_KM of the city's camera centre.
// Same gates as the California blocks (licence row enabled, shape valid, newer than its max age at build); no NWS, no Caltrans.
function bcBlocks(c, live, now) {
  const items = nearby(src(live, 'bc-events', now).ok ? usableItems(live.doc('bc-events'), 'bc-events', now).filter((i) => i.active) : [], c);
  return items.length ? [{ id: 'bc-events', title: 'Road events near here', items, ...metaOf(live, now, ['bc-events'], [live.doc('bc-events').generatedAt]), maxAgeMin: MAX_AGE_MIN['bc-events'] }] : [];
}

// 'Wildfires near' block for a city (points = [centre]) or a road (points = its cameras): NIFC WFIGS perimeters whose nearest edge is within
// NEAR_FIRE_KM, nearest first, at most WILDFIRE_ROWS shown. Omitted when the licence row is closed, the file is older than 6 h, or no fire is that near.
export const WILDFIRE_ROWS = 5;
function wildfireBlocks(live, now, points, title, onRoad = false) {
  const row = live.rows.get(WILDFIRE_SOURCE_ID);
  if (!isEnabled(row, now)) return [];
  const doc = live.doc('wildfire');
  const all = wildfiresNear(usableWildfire(doc, now), points);
  if (!all.length) return [];
  return [{ id: 'wildfires', title, onRoad, items: all.slice(0, WILDFIRE_ROWS), more: Math.max(0, all.length - WILDFIRE_ROWS), source: SOURCE_LABEL, attribution: String(row.attribution || '').replace(/^"|"$/g, ''), link: DATASET_URL, asof: doc.generatedAt, maxAgeMin: WILDFIRE_MAX_AGE_MIN }];
}

// Blocks for one city. c = {lat, lon, slug, region?}. Returns only blocks that passed every gate, in display order.
export function cityBlocks(c, live = loadLive(), now = new Date()) {
  if (c.region && c.region !== 'california') return c.region === 'british-columbia' ? bcBlocks(c, live, now) : [];
  const out = [];
  const meta = (feeds, asofs) => metaOf(live, now, feeds, asofs);
  const caItems = (feed) => caItemsOf(live, now, feed);
  const caAsof = (feed) => live.doc(`ca-${feed}`).generatedAt;

  const lcs = nearby(caItems('lcs').filter((i) => i.active), c);
  const cc = nearby(caItems('cc').filter((i) => i.inEffect), c);
  const rc = [['lcs', lcs], ['cc', cc]].filter(([, l]) => l.length);
  if (rc.length) out.push({ id: 'road-conditions', title: 'Lane closures and chain controls near here', lcs, cc, ...meta(rc.map(([f]) => f), rc.map(([f]) => caAsof(f))), maxAgeMin: 15 });

  const cms = nearby(caItems('cms'), c);
  if (cms.length) out.push({ id: 'message-signs', title: 'Message signs near here', items: cms, ...meta(['cms'], [caAsof('cms')]), maxAgeMin: 15 });

  const rwis = nearby(caItems('rwis'), c);
  if (rwis.length) out.push({ id: 'road-weather', title: 'Road weather stations near here', items: rwis, ...meta(['rwis'], [caAsof('rwis')]), maxAgeMin: 60 });

  const nwsDoc = live.doc(`nws-${c.slug}`);
  const nws = usableNws(nwsDoc, now);
  const horizon = new Date(now).getTime() + 48 * 3600000;
  const periods = src(live, 'nws-forecast', now).ok ? nws.periods.filter((p) => Date.parse(p.startTime) < horizon) : [];
  if (periods.length) out.push({ id: 'forecast', title: 'Forecast for the next 48 hours', items: periods, ...meta(['nws-forecast'], [nwsDoc.forecast.fetchedAt]), maxAgeMin: 180 });
  const alerts = src(live, 'nws-alerts', now).ok ? nws.alerts : [];
  if (alerts.length) out.push({ id: 'weather-alerts', title: 'Active weather alerts', items: alerts, ...meta(['nws-alerts'], [nwsDoc.alerts.fetchedAt]), maxAgeMin: 180 });
  out.push(...wildfireBlocks(live, now, [c], `Wildfires near ${c.name || 'here'}`));
  return out;
}

// Blocks for one road page (same licence and freshness gates as the city blocks). slug = roadSlug; cams = that road's cameras;
// cities = [{city, slug}] with a page along the road; opts.road = display name, opts.along(item) = position along the road
// (events are listed in that order). Every closure, chain control and sign carries its 3 nearest road cameras, all within
// NEAR_KM; an item with none that close is not listed and is counted in `far`, never shown without a camera.
export function roadBlocks(slug, cams, cities, live = loadLive(), now = new Date(), opts = {}) {
  const out = [];
  const road = opts.road || slug;
  const along = opts.along || (() => 0);
  const feedAsof = (feed) => live.doc(`ca-${feed}`).generatedAt;
  const onRoad = (feed, keep = () => true) => caItemsOf(live, now, feed).filter((i) => roadSlug(i.road) === slug && keep(i));
  const withCams = (list) => {
    const shown = [], far = [];
    for (const i of list) {
      const nearest = nearestCameras(i, cams).filter((n) => n.km <= NEAR_KM);
      (nearest.length ? shown : far).push({ ...i, nearest });
    }
    shown.sort((a, b) => along(a) - along(b) || a.id.localeCompare(b.id));
    return { shown, far: far.length };
  };

  const lcs = withCams(onRoad('lcs', (i) => i.active)), cc = withCams(onRoad('cc', (i) => i.inEffect));
  const rc = [['lcs', lcs], ['cc', cc]].filter(([, l]) => l.shown.length);
  if (rc.length) out.push({ id: 'road-conditions', title: `Lane closures and chain controls on ${road}`, lcs: lcs.shown, cc: cc.shown, far: lcs.far + cc.far, ...metaOf(live, now, rc.map(([f]) => f), rc.map(([f]) => feedAsof(f))), maxAgeMin: 15 });

  const cms = withCams(onRoad('cms'));
  if (cms.shown.length) out.push({ id: 'message-signs', title: `Message signs on ${road}`, items: cms.shown, far: cms.far, ...metaOf(live, now, ['cms'], [feedAsof('cms')]), maxAgeMin: 15 });

  const rwis = onRoad('rwis').sort((a, b) => along(a) - along(b) || a.id.localeCompare(b.id));
  if (rwis.length) out.push({ id: 'road-weather', title: `Road weather stations on ${road}`, items: rwis, ...metaOf(live, now, ['rwis'], [feedAsof('rwis')]), maxAgeMin: 60 });

  // NWS alerts are per city point, so these are the alerts for the cities listed on this page, not for the whole road.
  if (src(live, 'nws-alerts', now).ok) {
    const byKey = new Map(), asofs = [];
    for (const c of cities) {
      const doc = live.doc(`nws-${c.slug}`);
      const alerts = usableNws(doc, now).alerts;
      if (!alerts.length) continue;
      asofs.push(doc.alerts.fetchedAt);
      for (const a of alerts) { const k = `${a.event}|${a.headline}`; if (!byKey.has(k)) byKey.set(k, { ...a, cities: [] }); byKey.get(k).cities.push(c.city); }
    }
    if (byKey.size) out.push({ id: 'weather-alerts', title: `Weather alerts for cities on ${road}`, items: [...byKey.values()], ...metaOf(live, now, ['nws-alerts'], asofs), maxAgeMin: 180 });
  }
  out.push(...wildfireBlocks(live, now, cams, `Wildfires near ${road}`, true));
  return out;
}
