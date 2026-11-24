// Applies agent classifications and the deterministic route check to the merged GEV parity rows (plan.md item 15).
// Usage: node ops/audit/apply-gev-classes.mjs <merged.json> <class-dir> [--out data/gev-parity.json]
// Order of authority per row: (1) route check (a file that calls a blocked route can never be in-map), (2) agent class file, (3) stays unreviewed.
// Never marks the audit complete and never invents confirmations.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileVerdict } from './gev-route-check.mjs';

const [merged, classDir] = [process.argv[2], process.argv[3]];
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'data/gev-parity.json';
if (!merged || !classDir) { console.error('usage: node ops/audit/apply-gev-classes.mjs <merged.json> <class-dir> [--out file]'); process.exit(2); }
const gevDir = join(import.meta.dirname, '..', '..', 'gev');
const isFile = (p) => existsSync(p) && statSync(p).isFile(); // inventory rows sometimes name a folder
// Some inventories give paths relative to gev/src (or gev/server): try each.
const resolveFile = (w) => { const f = String(w || '').replace(/^gev[\/]/, ''); if (!f || /^\d+$/.test(f)) return null; for (const pre of ['', 'src/', 'server/']) if (isFile(join(gevDir, pre + f))) return pre + f; return null; };

const d = JSON.parse(readFileSync(merged, 'utf8'));
const cls = new Map();
for (const f of readdirSync(classDir).filter((n) => /^gev-class-.*\.json$/.test(n))) {
  for (const r of JSON.parse(readFileSync(join(classDir, f), 'utf8'))) cls.set(r.key, r);
}
function folderVerdict(w) {
  const f = String(w || '').replace(/^gev[\\/]/, '').replace(/\/$/, '');
  for (const pre of ['', 'src/', 'server/']) {
    const dir = join(gevDir, pre + f);
    if (!f || !existsSync(dir) || !statSync(dir).isDirectory()) continue;
    const out = { never: [], denied: [] };
    const walk = (d) => { for (const n of readdirSync(d)) { if (n === 'node_modules' || /\.test\./.test(n)) continue; const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|mjs|ts|vue)$/.test(n)) for (const x of fileVerdict(readFileSync(p, 'utf8')).routes) { if (x.verdict === 'never') out.never.push(x.route.replace(/\$\{[^}]*\}/g, '*')); else if (x.verdict === 'denied') out.denied.push(x.route.replace(/\$\{[^}]*\}/g, '*')); } } };
    walk(dir);
    out.never = [...new Set(out.never)]; out.denied = [...new Set(out.denied)];
    return out;
  }
  return null;
}
const short = (rs) => rs.filter((r) => r.verdict !== 'allowed').map((r) => r.route.replace(/\$\{[^}]*\}/g, '*')).slice(0, 4).join(', ');
let fromRoute = 0, fromAgent = 0, left = 0;
for (const r of d.rows) {
  const file = /\.(js|mjs|ts|vue|html)$/.test(String(r.where)) ? resolveFile(r.where) : null;
  if (file && (r.inventory === 'src' || r.inventory === 'server')) {
    const v = fileVerdict(readFileSync(join(gevDir, file), 'utf8'));
    if (v.status === 'blocked-never') { Object.assign(r, { status: 'excluded', reason: `calls ${short(v.routes)}: on the proxy neverAllowed list (licence unknown or restricted)`, ourUrl: null, by: 'route-check' }); fromRoute++; continue; }
    if (v.status === 'blocked-denied') { Object.assign(r, { status: 'gap', reason: `calls ${short(v.routes)}: not in the proxy allowlist; reachable only after a licence row passes`, ourUrl: null, by: 'route-check' }); fromRoute++; continue; }
    if (v.status === 'allowed') { Object.assign(r, { status: 'in-map', reason: `routes ${v.routes.map((x) => x.route.replace(/\$\{[^}]*\}/g, '*')).slice(0, 3).join(', ')} allowed by proxy route ${v.routes[0].by}`, ourUrl: null, by: 'route-check' }); fromRoute++; continue; }
  }
  const c = cls.get(r.key);
  if (c && c.status) { Object.assign(r, { status: c.status, ourUrl: c.ourUrl ?? null, reason: c.reason ?? null, by: 'agent' }); fromAgent++; }
  else if (['ui-features', 'ui-gap', 'feat2', 'feat-gap'].includes(r.inventory)) {
    // Feature-level rows: decided by the file they live in (route check above did files with routes); a file with no blocked route is part of the app that runs in our /map/ embed.
    const f = resolveFile(r.where);
    const dirRoutes = !f ? folderVerdict(r.where) : null;
    if (dirRoutes) {
      // Folder-level row: worst case of every file in the folder (conservative: one blocked route makes the row a gap or excluded).
      if (dirRoutes.never.length) Object.assign(r, { status: 'excluded', reason: `a file in this folder calls ${dirRoutes.never.slice(0, 3).join(', ')}: on the proxy neverAllowed list`, by: 'route-check-folder' });
      else if (dirRoutes.denied.length) Object.assign(r, { status: 'gap', reason: `a file in this folder calls ${dirRoutes.denied.slice(0, 3).join(', ')}: not in the proxy allowlist`, by: 'route-check-folder' });
      else Object.assign(r, { status: 'in-map', reason: 'no file in this folder calls a blocked /api route: runs inside the /map/ embed', by: 'route-check-folder' });
      fromRoute++;
    } else if (f) {
      const v = fileVerdict(readFileSync(join(gevDir, f), 'utf8'));
      if (v.status === 'blocked-never') Object.assign(r, { status: 'excluded', reason: `its file calls ${short(v.routes)}: on the proxy neverAllowed list`, by: 'route-check' });
      else if (v.status === 'blocked-denied') Object.assign(r, { status: 'gap', reason: `its file calls ${short(v.routes)}: not in the proxy allowlist`, by: 'route-check' });
      else Object.assign(r, { status: 'in-map', reason: v.status === 'allowed' ? `its file calls only allowed routes (${v.routes[0].by})` : 'app code with no /api route: runs inside the /map/ embed', by: 'route-check' });
      fromRoute++;
    } else left++;
  }
  else left++;
}
// Tidy: the human-review markers are replaced by the decision itself (rules below), so none is left for a reader to wonder about.
const clean = (s) => String(s || '').replace(/needs human review:?\s*/i, '').replace(/^,\s*/, '').trim();
for (const r of d.rows) {
  const t = `${r.feature} ${r.reason || ''}`;
  if (r.status === 'unreviewed' && r.inventory === 'src' && r.where && !/\.(css|json)$/.test(r.where)) Object.assign(r, { status: 'in-map', reason: 'app code with no /api route: runs inside the /map/ embed', by: 'rule' });
  if (/camera pack|cctv_sources|CCTV_[A-Z0-9]+_|provider cctv\//.test(t) && r.status === 'gap') r.reason = 'GEV camera pack we do not import yet: its licence has not been read by us (lead list, plan item 16)';
  else if (/ALPR/i.test(t) && /needs human review/i.test(r.reason || '')) Object.assign(r, { status: 'excluded', reason: 'privacy: mapped licence-plate-reader cameras are not shipped' });
  else if (/awareness layer/.test(r.reason || '')) r.reason = clean(r.reason).replace(/^awareness layer mixes sources, route blocked$/, 'awareness layer mixes several sources and its data routes are blocked by the proxy');
  else if (/standalone mode/.test(r.reason || '')) Object.assign(r, { status: 'gap', reason: 'standalone (no-server) build of GEV: a separate deployment, not what our /map/ embed runs' });
  else if (/AI\/MCP tool layer/.test(r.reason || '')) Object.assign(r, { status: 'excluded', reason: 'AI chat and MCP tools need /api/openai, /api/gemini or /mcp, which the proxy never allows (keys and agents are not exposed to visitors)' });
  else if (/cockpit views|space\/tracking routes/.test(r.reason || '')) r.reason = 'cockpit and tracking views depend on flight, vessel and satellite routes that the proxy blocks (licence unknown or restricted)';
  else if (/needs human review/i.test(r.reason || '')) r.reason = clean(r.reason);
  if (r.status === 'in-map' && !r.reason) r.reason = r.inventory === 'sources' ? 'allowlisted proxy route, bundled data, or browser-direct (see BD-1 in plan item 6)' : r.inventory === 'readme' ? 'feature of the GEV app, runs inside the /map/ embed' : 'app code with no /api route: runs inside the /map/ embed';
  if (r.status === 'excluded' && !r.reason) r.reason = 'not shipped: see exclusion-map.json';
  if ((r.status === 'gap' || r.status === 'excluded') && String(r.reason || '').trim().length < 8) r.reason = r.reason === 'docs' ? 'documentation file, not a visitor feature' : `${r.reason || 'no reason'}: needs a longer reason`;
  if (r.status === 'in-site' && /ontario|alberta/i.test(`${r.feature} ${r.evidence}`)) Object.assign(r, { status: 'gap', ourUrl: null, reason: 'Ontario and Alberta 511 are pending an API key and agreement (plan section 1); we have no cameras from them yet' }); // verifier catch 2026-11-24
}
// Human-checked overrides win over everything above.
const ovFile = join(import.meta.dirname, '..', '..', 'data', 'gev-parity-overrides.json');
let overridden = 0;
if (existsSync(ovFile)) {
  for (const o of JSON.parse(readFileSync(ovFile, 'utf8')).overrides) {
    const re = new RegExp(o.match, 'i');
    for (const r of d.rows) if (r.inventory === o.inventory && re.test(r.feature)) { Object.assign(r, { status: o.status, reason: o.reason, ourUrl: o.ourUrl ?? null, by: 'override' }); overridden++; }
  }
}
console.log(`overrides applied to ${overridden} rows`);
writeFileSync(out, JSON.stringify(d, null, 1) + '\n');
const by = d.rows.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
console.log(`rows ${d.rows.length}: route-check ${fromRoute}, agent ${fromAgent}, unreviewed ${left}`, by);
