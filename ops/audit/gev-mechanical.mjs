// Mechanical completeness pass for the GEV parity audit (plan.md item 15, step a). Read-only on gev/.
// Extracts EVERY /api route literal and EVERY environment variable name used anywhere in gev/src, gev/server, gev/scripts, gev/tools,
// then makes sure each one is represented in data/gev-parity.json: a route is covered if its text appears in some row; if not, an explicit row is added
// (routes get their status from the proxy allowlist verdict; env flags are configuration, judged through the feature they switch).
// Idempotent: rows added here carry inventory "mechanical" and a stable key. Usage: node ops/audit/gev-mechanical.mjs [--check]
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verdict, routesIn, fileVerdict } from './gev-route-check.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const gev = join(root, 'gev');
const FILE = join(root, 'data', 'gev-parity.json');
const check = process.argv.includes('--check');

function* walk(d) {
  for (const n of readdirSync(d)) {
    if (['node_modules', '.git', 'dist', '.gev-cache', '.gev-logs'].includes(n)) continue;
    const p = join(d, n); const s = statSync(p);
    if (s.isDirectory()) yield* walk(p); else if (/\.(js|mjs|ts|vue|html|sh|json|yml|yaml)$/.test(n) && s.size < 2_000_000 && !/\.test\./.test(n) && n !== 'package-lock.json') yield p;
  }
}
const routes = new Map(); // route -> first file
const envs = new Map();
for (const top of ['src', 'server', 'scripts', 'tools', 'build', 'config', 'dev', 'public']) {
  const dir = join(gev, top); if (!existsSync(dir)) continue;
  for (const f of walk(dir)) {
    const text = readFileSync(f, 'utf8');
    const rel = relative(gev, f).replace(/\\/g, '/');
    if (/\.(js|mjs|ts|vue|html|sh)$/.test(f)) for (const r of routesIn(text)) if (!routes.has(r)) routes.set(r, rel);
    for (const m of text.matchAll(/(?:process\.env|import\.meta\.env|\benv)\.([A-Z][A-Z0-9_]{2,})/g)) if (!envs.has(m[1])) envs.set(m[1], rel);
    for (const m of text.matchAll(/\b((?:GEV|CCTV|VITE)_[A-Z0-9_]{2,})\b/g)) if (!envs.has(m[1])) envs.set(m[1], rel);
  }
}
// Named sets that must each appear in the audit: voice actions, query/MCP tools, control layer ids.
const named = new Map(); // key -> {kind,name,file}
const grab = (rel, re, kind) => { const f = join(gev, rel); if (!existsSync(f)) return; for (const m of readFileSync(f, 'utf8').matchAll(re)) if (!named.has(`${kind}|${m[1]}`)) named.set(`${kind}|${m[1]}`, { kind, name: m[1], file: rel }); };
grab('src/voice/actionSchemas.js', /^\s{2,6}name:\s*'([a-z][a-z0-9_]+)'/gm, 'voice-action');
if (existsSync(join(gev, 'src/tools'))) for (const f of walk(join(gev, 'src/tools'))) if (/\.js$/.test(f)) grab(relative(gev, f).replace(/\\/g, '/'), /defineTool\(\{\s*name:\s*'([a-z][a-z0-9_]+)'/g, 'tool');
grab('src/app/catalog.js', /:\s*'([a-z][a-z0-9-]+)',/g, 'layer-id');
const d = JSON.parse(readFileSync(FILE, 'utf8'));
const haystack = d.rows.map((r) => `${r.feature} ${r.reason || ''} ${r.evidence || ''}`).join('\n');
const clean = (r) => r.replace(/\$\{[^}]*\}/g, '*');
const have = new Set(d.rows.map((r) => r.key));
const missingRoutes = [...routes].filter(([r]) => !haystack.includes(clean(r)) && !haystack.includes(r));
const missingEnvs = [...envs].filter(([e]) => !haystack.includes(e));
const lc = haystack.toLowerCase();
const norm = (n) => [n, n.replace(/_/g, ' '), n.replace(/_/g, '-'), n.replace(/-/g, ' ')].map((x) => x.toLowerCase());
const missingNamed = [...named.values()].filter((n) => !norm(n.name).some((v) => lc.includes(v)));
console.log(`routes found ${routes.size}, not mentioned in any row ${missingRoutes.length}; env/flag names found ${envs.size}, not mentioned ${missingEnvs.length}; named items found ${named.size} (voice actions, tools, layer ids), not mentioned ${missingNamed.length}`);
if (check) process.exit(missingRoutes.length || missingEnvs.length || missingNamed.length ? 1 : 0);
let added = 0;
for (const [r, f] of missingRoutes) {
  const key = `mechanical|route|${r}`; if (have.has(key)) continue;
  const v = verdict(r);
  d.rows.push({ key, inventory: 'mechanical', feature: `route ${clean(r)}`, category: 'route', where: f, evidence: 'route literal found by the mechanical scan', status: v.verdict === 'allowed' ? 'in-map' : v.verdict === 'never' ? 'excluded' : 'gap', ourUrl: null, reason: v.verdict === 'allowed' ? `allowed by proxy route ${v.by}` : v.verdict === 'never' ? `on the proxy neverAllowed list (${v.by})` : 'not in the proxy allowlist (denied by default)', by: 'mechanical' });
  added++;
}
for (const [e, f] of missingEnvs) {
  const key = `mechanical|env|${e}`; if (have.has(key)) continue;
  d.rows.push({ key, inventory: 'mechanical', feature: `env/flag ${e}`, category: 'env-flag', where: f, evidence: 'name found by the mechanical scan', status: 'excluded', ourUrl: null, reason: 'configuration flag: the visitor feature it switches is judged in its own row; the proxy sets our values', by: 'mechanical' });
  added++;
}
for (const n of missingNamed) {
  const key = `mechanical|${n.kind}|${n.name}`; if (have.has(key)) continue;
  // Status comes from the file that defines it: its routes against the allowlist (voice and tools run through /api/openai, /api/gemini, /mcp which are never allowed).
  const text = readFileSync(join(gev, n.file), 'utf8'); const fv = fileVerdict(text);
  const aiBlocked = n.kind !== 'layer-id' && /openai|gemini|realtime|\/mcp/i.test(text);
  d.rows.push({ key, inventory: 'mechanical', feature: `${n.kind} ${n.name}`, category: n.kind, where: n.file, evidence: 'name found by the mechanical scan', status: aiBlocked || fv.status === 'blocked-never' ? 'excluded' : fv.status === 'blocked-denied' ? 'gap' : 'in-map', ourUrl: null, reason: aiBlocked ? 'needs the AI, voice or MCP routes, which the proxy never allows' : fv.status === 'blocked-never' ? 'its file calls a route on the proxy neverAllowed list' : fv.status === 'blocked-denied' ? 'its file calls a route that is not in the proxy allowlist' : 'no blocked route in its file: runs inside the /map/ embed', by: 'mechanical' });
  added++;
}
if (added) writeFileSync(FILE, JSON.stringify(d, null, 1) + '\n');
console.log(`added ${added} rows`);
