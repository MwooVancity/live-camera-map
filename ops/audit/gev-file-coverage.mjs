// File-coverage check for the GEV parity audit (plan.md item 15): every non-test source file under gev/src and gev/server
// must be the location of at least one row in data/gev-parity.json. Read-only on gev/.
// Usage: node ops/audit/gev-file-coverage.mjs [--check] [--list]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const gev = join(root, 'gev');
const d = JSON.parse(readFileSync(join(root, 'data', 'gev-parity.json'), 'utf8'));
const norm = (p) => String(p || '').replace(/^gev[\\/]/, '').replace(/\\/g, '/');
const where = new Set(d.rows.map((r) => norm(r.where)));
const dirsCovered = d.rows.map((r) => norm(r.where)).filter((w) => w && !/\.[a-z]+$/i.test(w)).map((w) => w.replace(/\/$/, ''));
function* walk(p) {
  for (const n of readdirSync(p)) {
    if (['node_modules', '.git', 'dist', '.gev-cache', '.gev-logs'].includes(n)) continue;
    const q = join(p, n);
    if (statSync(q).isDirectory()) yield* walk(q); else yield q;
  }
}
const missing = [];
let total = 0;
for (const top of ['src', 'server']) {
  for (const f of walk(join(gev, top))) {
    if (!/\.(js|mjs|ts|vue|css|html)$/.test(f) || /\.test\./.test(f)) continue;
    total++;
    const rel = relative(gev, f).replace(/\\/g, '/');
    const alt = rel.replace(/^(src|server)\//, '');
    const folderRow = dirsCovered.some((dir) => rel.startsWith(dir + '/') || alt.startsWith(dir + '/'));
    if (where.has(rel) || where.has(alt) || folderRow) continue;
    missing.push(rel);
  }
}
if (process.argv.includes('--add') && missing.length) {
  const { fileVerdict } = await import('./gev-route-check.mjs');
  const { writeFileSync } = await import('node:fs');
  const have = new Set(d.rows.map((r) => r.key));
  let added = 0;
  for (const rel of missing) {
    const key = `files|${rel}`; if (have.has(key)) continue;
    const machinery = /(^|\/)testSupport\/|(^|\/)local_data\/|(^|\/)fixtures\//.test(rel);
    const v = machinery ? null : fileVerdict(readFileSync(join(gev, rel), 'utf8'));
    const status = machinery ? 'excluded' : v.status === 'blocked-never' ? 'excluded' : v.status === 'blocked-denied' ? 'gap' : 'in-map';
    const route = v && v.routes.filter((x) => x.verdict !== 'allowed').map((x) => x.route.replace(/\$\{[^}]*\}/g, '*')).slice(0, 3).join(', ');
    const reason = machinery ? 'test support or local data file, not a visitor feature' : status === 'excluded' ? `calls ${route}: on the proxy neverAllowed list` : status === 'gap' ? `calls ${route}: not in the proxy allowlist` : 'UI or app file with no blocked route: runs inside the /map/ embed';
    d.rows.push({ key, inventory: 'files', feature: rel.split('/').pop().replace(/\.[a-z]+$/, ''), category: 'source-file', where: rel, evidence: 'found by the file-coverage scan (no earlier row)', status, ourUrl: null, reason, by: 'file-coverage' });
    added++;
  }
  writeFileSync(join(root, 'data', 'gev-parity.json'), JSON.stringify(d, null, 1) + '\n');
  console.log(`added ${added} rows`);
}
const byDir = {};
for (const m of missing) { const k = m.split('/').slice(0, 3).join('/'); byDir[k] = (byDir[k] || 0) + 1; }
console.log(`source files ${total}, with no row at their path or folder: ${missing.length}`);
if (process.argv.includes('--list')) console.log(Object.entries(byDir).sort((a, b) => b[1] - a[1]).slice(0, 15));
if (process.argv.includes('--check')) process.exit(missing.length ? 1 : 0);
