// Live-conditions page blocks (plan section 12). Pure functions plus a cached loader; no network.
// Beats Argos by: every block names its source, links the feed doc, shows its own timestamp, and is OMITTED
// (never empty, never faked) when its licence row is closed, its data is past its max age, or nothing is near the city.
// Every number a block shows is items.length of the list the block renders, computed here once.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { isEnabled } from '../../../tests/licensing/gate.mjs';
import { usableItems, usableNws, SOURCE_IDS, MAX_AGE_MIN } from '../../../ops/importers/lib/conditions.mjs';

export const RADIUS_KM = 15; // a road item counts as "near" a city when within this of the city's camera centroid
export const MAX_ROWS = 15; // rows shown per list; the heading count is the full count

const condDir = () => process.env.CONDITIONS_DIR || resolve(process.cwd(), '../data/conditions');
const permFile = () => process.env.PERMISSIONS_FILE || resolve(process.cwd(), '../data/source-permissions.json');
const readOrNull = (f) => { try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { return null; } };

export const distKm = (aLat, aLon, bLat, bLon) => {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
export const nearby = (items, c, km = RADIUS_KM) => items.filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lon) && distKm(c.lat, c.lon, i.lat, i.lon) <= km)
  .map((i) => ({ ...i, km: distKm(c.lat, c.lon, i.lat, i.lon) })).sort((a, b) => a.km - b.km);

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
  const doc = nws ? null : live.doc(`ca-${feed}`);
  const asof = nws ? ((live.doc('nws-los-angeles') || {}).forecast || {}).fetchedAt : doc && doc.generatedAt;
  const items = nws ? null : usableItems(doc, feed, now);
  const state = !ok ? 'licence not enabled' : !asof ? 'no data' : (nws ? Boolean(usableNws(live.doc('nws-los-angeles'), now).periods.length) : items.length > 0) ? 'fresh' : 'older than its limit';
  return { feed, name: row ? row.name.replace(/ \(.*$/, '') : feed, asof: asof || null, maxAgeMin: MAX_AGE_MIN[feed], state, failed: (doc && doc.failedDistricts) || [] };
}
export const FEED_LIST = ['lcs', 'cc', 'cms', 'rwis', 'nws-forecast', 'nws-alerts'];

// Blocks for one city. c = {lat, lon, slug}. Returns only blocks that passed every gate, in display order.
export function cityBlocks(c, live = loadLive(), now = new Date()) {
  const out = [];
  const meta = (feeds, asofs) => {
    const rs = feeds.map((f) => src(live, f, now).row);
    return { source: rs.map((r) => r.name.replace(/ \(.*$/, '')).join('; '), attribution: [...new Set(rs.map((r) => r.attribution))].join(' | '), link: firstUrl(rs[0]), asof: asofs.sort()[0] };
  };
  const caItems = (feed) => (src(live, feed, now).ok ? usableItems(live.doc(`ca-${feed}`), feed, now) : []);
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
  return out;
}
