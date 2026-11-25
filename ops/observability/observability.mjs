// Road observability (plan item 36 P2-11, moat 2): what share of a country's main road network has a licensed, directory-eligible camera within a stated distance.
// Pure functions only (no network, no clock): the same OSM file and camera list always give the same bytes. The CLI is ops/observability/run.mjs.
// Camera eligibility and the licence gate are NOT re-implemented: eligibleCameras() calls buildRows() from ops/exports/camera-exports.mjs.
import { buildRows } from '../exports/camera-exports.mjs';

const R = 6371008.8; // mean Earth radius, metres
export const CLASSES = ['motorway', 'trunk', 'primary']; // precedence when two ways share a point
export const ICELAND_BOX = { minLat: 63.0, maxLat: 67.0, minLon: -25.0, maxLon: -12.5 }; // generous: Grimsey and the Westman Islands inside, Faroes and Greenland outside
const EPS_M = 0.001; // a camera at exactly the radius counts; 1 mm absorbs floating point error

export const METHOD = {
  denominator: 'Road network = OpenStreetMap ways tagged highway=motorway, highway=trunk or highway=primary inside Iceland. Ways with the same class and road number that meet end to end at a junction of exactly two ways are joined, then sampled every 1 km from their start (a line shorter than 1 km keeps its start point). Points that fall on the same spot (within about 10 m) are counted once. Kilometres are the summed length of the joined lines as drawn in OpenStreetMap; two carriageways of one road count twice.',
  observed: 'A point is observed when at least one directory-eligible camera whose source licence allows publishing its metadata lies within 5 km in a straight line (haversine). A camera is a camera view in our registry; no picture is used.',
  notClaimed: 'This measures where an official camera link exists near a road, not whether the road is open, clear or safe, and not whether a camera currently works.',
  osmLicence: '(c) OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). Derived counts and tables on this page are a Produced Work from that database and carry the same credit.',
};

const toPt = (p) => (Array.isArray(p) ? { lat: p[0], lon: p[1] } : { lat: p.lat, lon: p.lon });
const rad = (d) => (d * Math.PI) / 180;
export function haversineM(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Points every spacingM metres along a polyline, starting at its first vertex. Repeated vertices are ignored.
export function sampleChain(geometry, spacingM) {
  const g = [];
  for (const raw of geometry) { const p = toPt(raw); const l = g[g.length - 1]; if (!l || l.lat !== p.lat || l.lon !== p.lon) g.push(p); }
  if (g.length === 0) return [];
  const cum = [0];
  for (let i = 1; i < g.length; i++) cum.push(cum[i - 1] + haversineM(g[i - 1], g[i]));
  const total = cum[cum.length - 1], n = Math.floor(total / spacingM + 1e-6);
  const out = []; let seg = 1;
  for (let k = 0; k <= n; k++) {
    const d = k * spacingM;
    if (k === 0 || g.length === 1) { out.push(g[0]); continue; }
    while (seg < g.length - 1 && cum[seg] < d) seg++;
    const f = Math.min(1, Math.max(0, (d - cum[seg - 1]) / ((cum[seg] - cum[seg - 1]) || 1)));
    out.push({ lat: g[seg - 1].lat + f * (g[seg].lat - g[seg - 1].lat), lon: g[seg - 1].lon + f * (g[seg].lon - g[seg - 1].lon) });
  }
  return out;
}

const key6 = (p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
const label = (w) => (w.tags && (w.tags.ref || w.tags.name)) || '(unnumbered)';
const usable = (w) => w && w.type === 'way' && w.tags && CLASSES.includes(w.tags.highway) && Array.isArray(w.geometry) && w.geometry.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon)).length >= 2;

// Joins ways of one class and road number that meet end to end where exactly two ways meet. Returns [{highway, ref, firstId, geometry}] in a fixed order.
export function chainWays(ways) {
  const byId = new Map();
  for (const w of ways) if (usable(w) && !byId.has(w.id)) byId.set(w.id, { id: w.id, highway: w.tags.highway, ref: label(w), group: `${w.tags.highway}|${w.tags.ref || w.tags.name || ''}`, geometry: w.geometry.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon)).map((p) => ({ lat: p.lat, lon: p.lon })) });
  const groups = new Map();
  for (const w of [...byId.values()].sort((a, b) => a.id - b.id)) (groups.get(w.group) || groups.set(w.group, []).get(w.group)).push(w);
  const out = [];
  for (const g of groups.values()) {
    const ends = new Map();
    for (const w of g) for (const e of [key6(w.geometry[0]), key6(w.geometry.at(-1))]) (ends.get(e) || ends.set(e, new Set()).get(e)).add(w);
    const used = new Set();
    const next = (cur, k) => { const s = ends.get(k); if (!s || s.size !== 2 || !s.has(cur)) return undefined; const n = [...s].find((x) => x !== cur); return used.has(n) ? undefined : n; };
    for (const w of g) {
      if (used.has(w)) continue;
      used.add(w);
      let geo = [...w.geometry], cur = w, n;
      while ((n = next(cur, key6(geo.at(-1))))) { used.add(n); geo = geo.concat((key6(n.geometry[0]) === key6(geo.at(-1)) ? n.geometry : [...n.geometry].reverse()).slice(1)); cur = n; }
      cur = w;
      while ((n = next(cur, key6(geo[0])))) { used.add(n); geo = (key6(n.geometry.at(-1)) === key6(geo[0]) ? n.geometry : [...n.geometry].reverse()).slice(0, -1).concat(geo); cur = n; }
      out.push({ highway: w.highway, ref: w.ref, firstId: w.id, geometry: geo });
    }
  }
  return out;
}

const r5 = (x) => Math.round(x * 1e5) / 1e5;
const pt6 = (p) => ({ lat: Math.round(p.lat * 1e6) / 1e6, lon: Math.round(p.lon * 1e6) / 1e6 });
const pt5 = (p) => ({ lat: r5(p.lat), lon: r5(p.lon) });
const pct = (o, n) => (n === 0 ? 0 : Math.round((o / n) * 1000) / 10);
const inBox = (p, b) => p.lat >= b.minLat && p.lat <= b.maxLat && p.lon >= b.minLon && p.lon <= b.maxLon;

// Joins and samples the road network. Output is small (about 1 point per km) and is what gets stored when the raw OSM answer is over the size cap.
export function sampleNetwork(osm, spacingM = 1000) {
  const elements = Array.isArray(osm && osm.elements) ? osm.elements : [];
  const ways = elements.filter((e) => e && e.type === 'way');
  const good = ways.filter(usable);
  const chains = chainWays(good).sort((a, b) => CLASSES.indexOf(a.highway) - CLASSES.indexOf(b.highway) || (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0) || a.firstId - b.firstId)
    .map((ch) => { let len = 0; for (let i = 1; i < ch.geometry.length; i++) len += haversineM(ch.geometry[i - 1], ch.geometry[i]); return { highway: ch.highway, ref: ch.ref, firstId: ch.firstId, lengthM: Math.round(len), points: sampleChain(ch.geometry, spacingM).map(pt6) }; });
  return { spacingM, ways: { inInput: ways.length, used: good.length, ignored: ways.length - good.length, joinedLines: chains.length }, chains };
}

// input = parsed Overpass JSON ({elements:[ways with geometry]}) or the sampleNetwork() output; cameras = [{id, lat, lon}] already filtered by eligibleCameras().
export function computeObservability(input, cameras, { spacingM = 1000, radiusM = 5000, box = ICELAND_BOX, maxStretches = 20 } = {}) {
  const net = input && Array.isArray(input.chains) ? input : sampleNetwork(input, spacingM);
  if (net.spacingM !== spacingM) throw new Error(`sampled at ${net.spacingM} m, asked for ${spacingM} m`);
  const cams = cameras.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon)).map((c) => ({ lat: c.lat, lon: c.lon })).sort((a, b) => a.lat - b.lat || a.lon - b.lon);
  const latWin = (radiusM / R) * (180 / Math.PI) + 1e-6; // cameras further than this in latitude alone cannot be within radius
  const isObserved = (p) => {
    for (const c of cams) { if (c.lat < p.lat - latWin) continue; if (c.lat > p.lat + latWin) break; if (haversineM(p, c) <= radiusM + EPS_M) return true; }
    return false;
  };
  const chains = net.chains;
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, { points: 0, observed: 0, percent: 0, km: 0 }]));
  const seen = new Map(); let dropped = 0; const stretches = [];
  for (const ch of chains) {
    byClass[ch.highway].km += ch.lengthM / 1000;
    let run = null;
    const close = () => { if (run) { stretches.push({ ref: ch.ref, highway: ch.highway, km: run.n, start: pt5(run.start), end: pt5(run.end) }); run = null; } };
    for (const p of ch.points) {
      if (!inBox(p, box)) { dropped++; close(); continue; }
      const k = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
      let obs = seen.get(k);
      if (obs === undefined) { obs = isObserved(p); seen.set(k, obs); byClass[ch.highway].points++; if (obs) byClass[ch.highway].observed++; }
      if (obs) close(); else if (run) { run.n++; run.end = p; } else run = { n: 1, start: p, end: p };
    }
    close();
  }
  const total = { points: 0, observed: 0, percent: 0, km: 0 };
  for (const c of CLASSES) { const b = byClass[c]; b.km = Math.round(b.km * 10) / 10; b.percent = pct(b.observed, b.points); total.points += b.points; total.observed += b.observed; total.km += b.km; }
  total.km = Math.round(total.km * 10) / 10; total.percent = pct(total.observed, total.points);
  stretches.sort((a, b) => b.km - a.km || a.start.lat - b.start.lat || a.start.lon - b.start.lon || (a.ref < b.ref ? -1 : 1));
  return { params: { spacingM, radiusM }, ways: net.ways, camerasUsed: cams.length, droppedOutsideBox: dropped, byClass, total, stretches: stretches.slice(0, maxStretches) };
}

// Same eligibility and permission gate as the CSV exports: buildRows() decides, this only adds the country and bounding-box checks.
export function eligibleCameras(cams, sources, health, perms, country = 'iceland', box = ICELAND_BOX) {
  const { rows, skipped } = buildRows(cams, sources, health, perms);
  const excluded = { ...skipped, otherCountry: 0, outsideCountryBox: 0 };
  const cameras = [];
  for (const r of rows) {
    if (r.country !== country) { excluded.otherCountry++; continue; }
    if (!inBox({ lat: r.lat, lon: r.lon }, box)) { excluded.outsideCountryBox++; continue; }
    cameras.push({ id: r.camera_id, lat: r.lat, lon: r.lon, lastSeen: r.last_seen });
  }
  const asOf = cameras.map((c) => c.lastSeen).filter(Boolean).sort().at(-1) || '';
  return { cameras, excluded, asOf: asOf.slice(0, 10) };
}

// Refuses anything that is not a complete Overpass answer with roads in it (HTML error page, cut-off JSON, timeout remark).
export function validateOverpass(text) {
  let j;
  try { j = JSON.parse(text); } catch { throw new Error('Overpass answer is not valid JSON (truncated or an error page); nothing written'); }
  if (j && j.remark) throw new Error(`Overpass remark: ${String(j.remark).slice(0, 200)}; nothing written`);
  if (!j || !Array.isArray(j.elements) || !j.elements.some(usable)) throw new Error('Overpass answer has no roads in it; nothing written');
  return j;
}

