// Which blocked GEV routes are blocked only because OUR proxy has no route, even though GEV's own research marks the source allowed?
// (owner 2026-11-24: "flights, ships, satellites, fires... that is a lot of the traffic".) Read-only. Usage: node ops/audit/gev-unblock-candidates.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileVerdict } from './gev-route-check.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const gev = join(root, 'gev');
const perms = JSON.parse(readFileSync(join(root, 'data', 'source-permissions.json'), 'utf8'));
const rows = Array.isArray(perms) ? perms : perms.sources || perms.rows || Object.values(perms);
const routes = new Map();
const walk = (d) => { for (const n of readdirSync(d)) { if (n === 'node_modules' || n === 'dist') continue; const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(n) && !/\.test\./.test(n)) for (const x of fileVerdict(readFileSync(p, 'utf8')).routes) if (x.verdict !== 'allowed') routes.set(x.route.replace(/\$\{[^}]*\}/g, '*'), x); } };
for (const t of ['src', 'server']) walk(join(gev, t));
// Route family -> words that identify its source rows in source-permissions.json
const FAMILY = { '/api/flights': ['adsb', 'opensky', 'flight'], '/api/military': ['military', 'adsb'], '/api/vessels': ['ais', 'vessel', 'ship'], '/api/celestrak': ['celestrak', 'satellite'], '/api/firms': ['firms', 'nasa'], '/api/fire-perimeters': ['nifc', 'wfigs', 'inciweb', 'fire'], '/api/tomtom': ['tomtom'], '/api/transit': ['transit', 'gtfs'], '/api/rail': ['rail'], '/api/gbfs': ['bike', 'gbfs'], '/api/launches': ['launch'], '/api/radio': ['radio'], '/api/cyclones': ['cyclone', 'nhc', 'jtwc'], '/api/news': ['gdelt', 'news'], '/api/acartia': ['acartia'], '/api/mapillary': ['mapillary'], '/api/overpass': ['openstreetmap', 'overpass'], '/api/terrain': ['terrain', 'mapterhorn'], '/api/shipwrecks': ['shipwreck', 'emodnet', 'wikidata'], '/api/route': ['osrm', 'route'] };
const out = [];
for (const [fam, words] of Object.entries(FAMILY)) {
  const rs = [...routes.keys()].filter((r) => r.startsWith(fam));
  if (!rs.length) continue;
  const rel = rows.filter((r) => words.some((w) => `${r.name} ${r.id}`.toLowerCase().includes(w)));
  const ok = rel.filter((r) => r.enabled && r.commercialStatus === 'allowed_per_doc');
  const blocked = rel.filter((r) => !r.enabled);
  out.push({ fam, routes: rs.length, allowedSources: ok.map((r) => r.name.slice(0, 44)), blockedSources: blocked.map((r) => `${r.name.slice(0, 36)} (${r.commercialStatus})`) });
}
for (const o of out) {
  console.log(`\n${o.fam}  (${o.routes} route literals in GEV code)`);
  console.log('  sources GEV documents as ALLOWED :', o.allowedSources.length ? o.allowedSources.join(' | ') : 'none');
  console.log('  sources unknown or restricted     :', o.blockedSources.length ? o.blockedSources.slice(0, 5).join(' | ') : 'none');
}
