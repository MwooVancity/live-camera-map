// Minnesota DOT work zones and detours (WZDx GeoJSON, CC0) -> data/conditions/mn-wzdx.json. No key, one request per run.
// Run: node ops/importers/mn-wzdx.mjs
// No pictures. The importer stops if the feed's own license field is no longer the CC0 URL we reviewed.
// Beats Argos by: every work zone keeps its own road, direction, lane impact and start/end time from the state's own feed.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { writeJsonAtomic, readJsonOrNull } from './lib/registry.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const COND_DIR = join(ROOT, 'data', 'conditions');
export const MN_URL = 'https://mn.carsprogram.org/carsapi_v1/api/wzdx';
export const MN_LICENCE = 'https://creativecommons.org/publicdomain/zero/1.0/';
export const MN_ID = 'mn-wzdx';
export const MN_BOUNDS = { latMin: 43.0, latMax: 49.6, lonMin: -97.5, lonMax: -89.0 };
const MAX_ITEMS = 3000;
const UA = 'WorldTrafficCameras-build (open-data importer; one request per run)';
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;

export async function fetchJson(url) {
  let err;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      const body = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      try { return JSON.parse(body); } catch (e) { throw new Error(`invalid JSON from source: ${e.message}`); }
    } catch (e) { err = e; if (i < 2) await new Promise((r) => setTimeout(r, 2000 * (i + 1))); }
  }
  throw err;
}

// All text is untrusted: strings only, control characters and angle brackets removed, length capped.
const s = (v, n = 300) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '');
const iso = (v) => { const t = Date.parse(v); return typeof v === 'string' && Number.isFinite(t) ? new Date(t).toISOString() : null; };
const pointsOf = (g) => {
  const c = g && g.coordinates;
  if (!Array.isArray(c)) return null;
  return g.type === 'Point' ? [c] : g.type === 'MultiPoint' || g.type === 'LineString' ? c : null;
};
const okPt = (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]);

// One WZDx feature -> item, or null with the reason counted in drop.
export function parseWzdx(f, now, drop = {}) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  const p = f && f.properties, d = p && p.core_details;
  if (!f || typeof f.id !== 'string' || !s(f.id, 80) || !d || typeof d !== 'object') return bump('malformed');
  const pts = pointsOf(f.geometry);
  if (!pts || !pts.length || !pts.every(okPt)) return bump('badGeometry');
  const [lon, lat] = pts[0];
  if (lat < MN_BOUNDS.latMin || lat > MN_BOUNDS.latMax || lon < MN_BOUNDS.lonMin || lon > MN_BOUNDS.lonMax) return bump('outOfBounds');
  const start = iso(p.start_date), end = iso(p.end_date), t = new Date(now).getTime();
  if (end && Date.parse(end) < t) return bump('expired');
  const last = pts[pts.length - 1];
  const road = Array.isArray(d.road_names) ? d.road_names.map((x) => s(x, 60)).filter(Boolean).join(', ') : '';
  return {
    id: `mn-wz-${s(f.id, 80).replace(/[^A-Za-z0-9_-]/g, '')}`,
    eventType: s(d.event_type, 40) || null, road, direction: s(d.direction, 30) || null,
    text: s(d.description) || null, vehicleImpact: s(p.vehicle_impact, 40) || null,
    lat, lon, endLat: pts.length > 1 ? last[1] : null, endLon: pts.length > 1 ? last[0] : null,
    start, end, updated: iso(d.update_date),
    active: Boolean(start && Date.parse(start) <= t),
    sourceUrl: MN_URL,
  };
}

// Returns { written, reason, report }. fj is injected so tests run offline.
export async function run({ fetchJson: fj = fetchJson, outDir = COND_DIR, now = new Date(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`mn-wzdx: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((x) => x.id === MN_ID), now)) return fail('licence closed');
  let j;
  try { j = await fj(MN_URL); } catch (e) { return fail(`feed unreadable: ${String(e.message || e)}`); }
  if (!j || !Array.isArray(j.features)) return fail('no features array');
  const info = j.road_event_feed_info;
  if (!info || info.license !== MN_LICENCE) return fail(`feed licence field is "${info && info.license}", not the reviewed CC0 URL; review before use`);
  const drop = {}, ids = new Set(), items = [];
  for (const f of j.features) {
    const it = parseWzdx(f, now, drop);
    if (!it) continue;
    if (ids.has(it.id)) { drop.dupId = (drop.dupId || 0) + 1; continue; }
    ids.add(it.id); items.push(it);
  }
  if (items.length > MAX_ITEMS) return fail(`${items.length} items is over the cap of ${MAX_ITEMS}`);
  const file = join(outDir, 'mn-wzdx.json');
  const old = readJsonOrNull(file);
  const report = { raw: j.features.length, count: items.length, dropped: drop };
  const usable = items.length + (drop.expired || 0); // expired zones are correctly dropped, not a shape problem
  let reason = null;
  if (j.features.length > 0 && usable < j.features.length * 0.5) reason = `only ${usable} of ${j.features.length} features usable (shape change?)`;
  else if (old && Array.isArray(old.items) && old.items.length >= 20 && items.length < old.items.length * 0.5) reason = `count fell from ${old.items.length} to ${items.length}`;
  else if (items.length === 0) reason = 'zero items'; // an empty feed never replaces a good file
  if (reason) return fail(reason, report);
  writeJsonAtomic(file, { feed: MN_ID, sourceId: MN_ID, generatedAt: new Date(now).toISOString(), feedUpdated: iso(info.update_date), timeNote: 'start/end/updated are UTC; position is the first point of the zone', licence: MN_LICENCE, ...report, items });
  return { written: true, reason: null, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await run();
  console.log(`mn-wzdx: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
