// Read-only catalogue audit of data/camera-registry/cameras.json (round 2 item 2). Changes no data.
// Reports: duplicate ids, cameras of one source within 10 m of another camera, missing name / coordinates / official URL,
// coordinates outside the country the camera's region belongs to (rough boxes below).
// Run from the repo root: node ops/audit/catalogue-audit.mjs > docs/decisions/2026-11-28-catalogue-audit.md
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countryOf } from '../importers/lib/registry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cams = JSON.parse(readFileSync(resolve(root, 'data/camera-registry/cameras.json'), 'utf8'));
const SAMPLE = 10, NEAR_M = 10;

// Rough country boxes [minLat, maxLat, minLon, maxLon], several per country where it has far-off parts.
// ponytail: boxes, not borders; a camera near a border inside a neighbour's corner of the box passes. Upgrade: Natural Earth polygons.
const BOX = {
  'united-states': [[24.3, 49.5, -125, -66.8], [51, 71.5, -180, -129.9], [18.8, 22.4, -160.3, -154.7]],
  canada: [[41.6, 83.2, -141.1, -52.5]],
  italy: [[35.4, 47.1, 6.6, 18.6]],
  spain: [[35.9, 43.8, -9.4, 4.4], [27.6, 29.5, -18.2, -13.4]],
  luxembourg: [[49.44, 50.19, 5.73, 6.54]],
  finland: [[59.7, 70.1, 19.1, 31.6]],
  'hong-kong': [[22.15, 22.57, 113.83, 114.45]],
  iceland: [[63.2, 66.6, -24.6, -13.4]],
  colombia: [[-4.3, 12.5, -79.1, -66.8]],
  japan: [[24, 45.6, 122.9, 146]],
  australia: [[-43.7, -10.6, 113.1, 153.7]],
  taiwan: [[21.8, 26.4, 118.1, 122.1]],
  estonia: [[57.5, 59.7, 21.7, 28.3]],
  'united-kingdom': [[49.8, 60.9, -8.7, 1.8]],
  norway: [[57.9, 71.3, 4.4, 31.3]],
};
const inBox = (c, boxes) => boxes.some(([a, b, x, y]) => c.lat >= a && c.lat <= b && c.lon >= x && c.lon <= y);
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const hasCoords = (c) => num(c.lat) && num(c.lon) && !(c.lat === 0 && c.lon === 0);
const m = (aLat, aLon, bLat, bLon) => { const r = Math.PI / 180, R = 6371000; const h = Math.sin((bLat - aLat) * r / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin((bLon - aLon) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

const issues = { 'Duplicate id': [], 'Within 10 m of another camera': [], 'Missing name': [], 'Missing coordinates': [], 'Missing official URL': [], 'Outside its country': [] };
const row = (c, note = '') => `| ${c.id ?? '(none)'} | ${c.sourceId} | ${(c.name ?? '').toString().replace(/\|/g, '/').slice(0, 50)} | ${c.lat}, ${c.lon} | ${note} |`;

const seen = new Map();
for (const c of cams) { if (seen.has(c.id)) issues['Duplicate id'].push(row(c, 'same id as an earlier record')); else seen.set(c.id, c); }
for (const c of cams) {
  if (!String(c.name ?? '').trim()) issues['Missing name'].push(row(c));
  if (!hasCoords(c)) issues['Missing coordinates'].push(row(c));
  if (!String(c.officialUrl ?? '').trim()) issues['Missing official URL'].push(row(c));
  const k = countryOf(c.regionSlug)?.countrySlug;
  if (hasCoords(c) && k && BOX[k] && !inBox(c, BOX[k])) issues['Outside its country'].push(row(c, `region ${c.regionSlug} is in ${k}`));
  if (hasCoords(c) && !BOX[k]) issues['Outside its country'].push(row(c, `no country box for region ${c.regionSlug}`));
}
// 10 m pairs: grid of ~0.0002 degree cells, compare with neighbouring cells. One row per pair.
const cell = (v) => Math.floor(v / 0.0002);
const grid = new Map();
const pts = cams.filter(hasCoords);
for (const c of pts) { const k = `${cell(c.lat)},${cell(c.lon)}`; (grid.get(k) || grid.set(k, []).get(k)).push(c); }
let pairs = 0;
for (const c of pts) {
  const [i, j] = [cell(c.lat), cell(c.lon)];
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const o of grid.get(`${i + di},${j + dj}`) || []) {
    if (o.id <= c.id) continue;
    const d = m(c.lat, c.lon, o.lat, o.lon);
    if (d <= NEAR_M) { pairs++; issues['Within 10 m of another camera'].push(row(c, `${d.toFixed(1)} m from ${o.id}${o.sourceId === c.sourceId ? ' (same source)' : ` (${o.sourceId})`}${o.direction !== c.direction ? `, directions ${c.direction || '-'} / ${o.direction || '-'}` : ', same direction'}`)); }
  }
}

const date = new Date().toISOString().slice(0, 10);
const out = [`# Catalogue audit (${date})`, '', `Read-only run of \`node ops/audit/catalogue-audit.mjs\` over data/camera-registry/cameras.json (${cams.length} records). No data was changed. Country check uses rough boxes, not borders.`, '', '| Issue | Count |', '|---|---|',
  ...Object.entries(issues).map(([k, v]) => `| ${k} | ${v.length} |`), ''];
for (const [k, v] of Object.entries(issues)) {
  out.push(`## ${k} (${v.length})`, '');
  if (!v.length) { out.push('None.', ''); continue; }
  out.push(`First ${Math.min(SAMPLE, v.length)} rows:`, '', '| id | source | name | lat, lon | note |', '|---|---|---|---|---|', ...v.slice(0, SAMPLE), '');
}
if (pairs) {
  const bySrc = {};
  for (const r of issues['Within 10 m of another camera']) { const s = r.split(' | ')[1]; bySrc[s] = (bySrc[s] || 0) + 1; }
  const L = issues['Within 10 m of another camera'];
  const same = L.filter((r) => r.includes('same direction')).length, exact = L.filter((r) => / 0\.0 m from/.test(r)).length;
  out.push('Pairs within 10 m by source of the first camera: ' + Object.entries(bySrc).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(', ') + '.', '',
    `Of ${L.length} pairs, ${exact} sit at exactly the same point and ${same} record the same direction (empty counts as same): those are the likeliest true duplicates. The rest are mostly several views on one pole.`, '');
}
process.stdout.write(out.join('\n'));
