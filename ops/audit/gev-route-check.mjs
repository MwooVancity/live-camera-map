// Deterministic route check for the GEV parity audit (plan.md item 15). Read-only on gev/.
// For every GEV source file it extracts each /api/... route literal and tests it against data/proxy-allowlist.json
// (the same anchored patterns the proxy uses; anything not listed is denied; neverAllowed prefixes are excluded outright).
// Usage: node ops/audit/gev-route-check.mjs [--files a.js,b.js] [--json]   (default: every file under gev/src and gev/server)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const gev = join(root, 'gev');
const allow = JSON.parse(readFileSync(join(root, 'data', 'proxy-allowlist.json'), 'utf8'));
const patterns = allow.routes.map((r) => ({ id: r.id, re: new RegExp(r.pattern) }));
const never = allow.neverAllowed || [];

export function verdict(route) {
  const raw = route.replace(/\$\{[^}]*\}/g, '1');
  if (never.some((n) => raw.startsWith(n))) return { verdict: 'never', by: never.find((n) => raw.startsWith(n)) };
  const hit = patterns.find((p) => p.re.test(raw) || p.re.test(raw + '?x=1') || p.re.test(raw.replace(/\/$/, '')));
  return hit ? { verdict: 'allowed', by: hit.id } : { verdict: 'denied', by: 'not in allowlist' };
}
export function routesIn(text) {
  const out = new Set();
  for (const m of text.matchAll(/['"`](\/api\/[A-Za-z0-9_\-\/.${}]*)/g)) out.add(m[1].replace(/[.,;]+$/, ''));
  return [...out];
}
export function fileVerdict(text) {
  const rs = routesIn(text).map((r) => ({ route: r, ...verdict(r) }));
  const bad = rs.filter((r) => r.verdict !== 'allowed');
  return { routes: rs, status: !rs.length ? 'no-route' : bad.length ? (bad.some((r) => r.verdict === 'never') ? 'blocked-never' : 'blocked-denied') : 'allowed' };
}
function* walk(d) {
  for (const n of readdirSync(d)) {
    if (n === 'node_modules' || n === '.git' || n === 'dist') continue;
    const p = join(d, n); const s = statSync(p);
    if (s.isDirectory()) yield* walk(p); else if (/\.(js|mjs|ts|vue|html)$/.test(n) && !/\.test\./.test(n)) yield p;
  }
}
if (process.argv[1] && process.argv[1].endsWith('gev-route-check.mjs')) {
  const only = process.argv.includes('--files') ? process.argv[process.argv.indexOf('--files') + 1].split(',') : null;
  const files = only ? only.map((f) => join(gev, f)) : ['src', 'server'].filter((d) => existsSync(join(gev, d))).flatMap((d) => [...walk(join(gev, d))]);
  const res = {};
  for (const f of files) { if (!existsSync(f)) continue; const v = fileVerdict(readFileSync(f, 'utf8')); if (v.status !== 'no-route') res[relative(gev, f).replace(/\\/g, '/')] = v; }
  if (process.argv.includes('--json')) console.log(JSON.stringify(res));
  else {
    const c = {}; for (const v of Object.values(res)) c[v.status] = (c[v.status] || 0) + 1;
    console.log(`${Object.keys(res).length} files call /api routes`, c);
  }
}
