// Corridor pages (plan item 36 P2-12): the cameras of one road OUTSIDE California in order along the road. Pure functions plus one loader; no network.
// Beats Argos by: a driving-order, health-stamped, official-link corridor list with a stated ordering method and a count of what was left out.
// Eligible set = the rows of ops/exports/camera-exports.mjs buildRows (the same licence and metadata gate as the CSV downloads), so a camera whose source fails the gate cannot appear.
// Order: each camera is projected onto the corridor's main axis (roadAxis, shared with the California road pages). Cameras more than GAP_KM from every other camera of the road
// form separate segments (an island stretch, a split road); segments are ordered by position, each segment on its own axis. No direction of travel is ever claimed.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildRows } from '../../../ops/exports/camera-exports.mjs';
import { roadAxis } from './roads.mjs';
import { distKm } from './live.mjs';

export const GAP_KM = 40; // cameras of one road farther apart than this (single linkage) start a new segment
export const NEAR_KM = 1; // a camera with no road field this close to a listed camera is "near this road" and left out

// Picked from the registry 2026-11-24 by quality: >= 15 eligible cameras with the road field AND (Iowa, Finland) the route in the camera's own name, one region, one source.
// Rejected: Iceland Ring Road (a loop: projection mixes the north and south coast), Texas I-35 and I-10 (the Texas source is Austin city streets only), NSW and Madrid (no road field),
// Iowa I-29 and US 30, Finland vt1, BC Highway 97 (good data, ranked below these five; add by one line here).
export const CORRIDORS = [
  { slug: 'iowa-i-80', region: 'iowa', road: 'I-80', title: 'I-80', own: 'i80', tokens: 'us', place: 'Iowa, United States' },
  { slug: 'iowa-i-35', region: 'iowa', road: 'I-35', title: 'I-35', own: 'i35', tokens: 'us', place: 'Iowa, United States' },
  { slug: 'finland-highway-4', region: 'finland', road: 'vt4', title: 'Highway 4 (vt4)', own: 'vt4', tokens: 'fi', place: 'Finland' },
  { slug: 'british-columbia-highway-1', region: 'british-columbia', road: 'Highway 1', title: 'Highway 1', own: null, tokens: null, place: 'British Columbia, Canada' },
  { slug: 'british-columbia-highway-99', region: 'british-columbia', road: 'Highway 99', title: 'Highway 99', own: null, tokens: null, place: 'British Columbia, Canada' },
];

// Route references written in a camera's own name, normalised ("I-35/80" gives i35 and i80, "vt4_Mantsala" gives vt4). Names are never parsed for anything else.
const TOKEN_RE = { us: /\b(I|US|IA)[- ]?(\d{1,3})((?:\/\d{1,3})*)/gi, fi: /(?<![a-z])(vt|kt|st|mt)(\d+)(?!\d)/gi };
export function routeRefs(name, kind) {
  const out = new Set();
  for (const m of String(name || '').matchAll(TOKEN_RE[kind])) {
    out.add(m[1].toLowerCase() + m[2]);
    for (const x of (m[3] || '').split('/').filter(Boolean)) out.add(m[1].toLowerCase() + x);
  }
  return out;
}

// Cameras of one road in order. Returns { axis, segments: [{ cams: [{ camera, along }] }] }; along is km along the segment's axis (never decreasing within a segment).
export function orderCorridor(cams) {
  if (!cams.length) return { axis: null, segments: [] };
  const axis = roadAxis(cams);
  const p = cams.map((_, i) => i);
  const find = (i) => (p[i] === i ? i : (p[i] = find(p[i])));
  for (let i = 0; i < cams.length; i++) for (let k = i + 1; k < cams.length; k++) if (distKm(cams[i].lat, cams[i].lon, cams[k].lat, cams[k].lon) <= GAP_KM) p[find(i)] = find(k);
  const groups = new Map();
  cams.forEach((c, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c); });
  const segments = [...groups.values()].map((g) => {
    const own = roadAxis(g);
    const flip = own.ax * axis.ax + own.ay * axis.ay < 0 ? -1 : 1;
    const along = (c) => flip * own.along(c);
    const list = g.map((camera) => ({ camera, along: along(camera) })).sort((a, b) => a.along - b.along || a.camera.id.localeCompare(b.camera.id));
    return { cams: list, key: g.reduce((s, c) => s + axis.along(c), 0) / g.length };
  }).sort((a, b) => a.key - b.key || a.cams[0].camera.id.localeCompare(b.cams[0].camera.id));
  return { axis, segments: segments.map(({ cams: c }) => ({ cams: c })) };
}

// One corridor from the registry cameras and the ELIGIBLE rows (buildRows output). Region is part of the key, so US I-35 in Texas is not Iowa I-35.
export function buildCorridor(def, cams, rows) {
  const elig = new Map(rows.map((r) => [r.camera_id, r]));
  const mine = cams.filter((c) => c.regionSlug === def.region && c.road === def.road && elig.has(c.id));
  const refsOk = (c) => !def.tokens || routeRefs(c.name, def.tokens).has(def.own);
  const listed = mine.filter(refsOk);
  const ambiguous = mine.length - listed.length;
  const noRoad = cams.filter((c) => c.regionSlug === def.region && !c.road && elig.has(c.id) && listed.some((l) => distKm(c.lat, c.lon, l.lat, l.lon) <= NEAR_KM)).length;
  const ord = orderCorridor(listed);
  const bySrc = new Map();
  for (const c of listed) {
    const r = elig.get(c.id);
    const s = bySrc.get(r.source_id) || { id: r.source_id, name: r.source_name, attribution: r.attribution, licence: r.licence, n: 0 };
    s.n++; bySrc.set(r.source_id, s);
  }
  const asof = listed.map((c) => c.lastSeen).filter(Boolean).sort().at(-1)?.slice(0, 10) || null;
  return { def, n: listed.length, segments: ord.segments, northish: ord.axis ? ord.axis.northish : true, left: { ambiguous, noRoad }, leftOut: ambiguous + noRoad, sources: [...bySrc.values()], asof };
}

let memo = null;
// All five corridors from the files on disk (site build runs from site/, so the data root is one folder up).
export function loadCorridors(root = resolve(process.cwd(), '..')) {
  if (memo && memo.root === root) return memo.list;
  const j = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
  const cams = j('data/camera-registry/cameras.json'), srcs = j('data/camera-registry/sources.json');
  const { rows } = buildRows(Array.isArray(cams) ? cams : cams.cameras, Array.isArray(srcs) ? srcs : srcs.sources, {}, j('data/source-permissions.json').sources);
  const list = CORRIDORS.map((d) => buildCorridor(d, cams, rows));
  memo = { root, list };
  return list;
}
export const corridorsOfRegion = (region) => loadCorridors().filter((c) => c.def.region === region);
