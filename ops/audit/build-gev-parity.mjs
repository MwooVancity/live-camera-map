// Builds the skeleton of data/gev-parity.json from the inventory files (plan.md item 15).
// Usage: node ops/audit/build-gev-parity.mjs <inventory-dir> [--out data/gev-parity.json]
// Reads gev-inv-*.json, keeps every row, adds status "unreviewed" (never overwrites a reviewed row), fails if an input is not valid JSON.
// Row statuses: in-map | in-site | gap | excluded | unreviewed. The test (tests/parity/gev-parity.test.mjs) fails on unreviewed rows once the audit is declared complete.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'data/gev-parity.json';
if (!dir) { console.error('usage: node ops/audit/build-gev-parity.mjs <inventory-dir> [--out file]'); process.exit(2); }

const previous = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : { rows: [] };
const reviewed = new Map(previous.rows.filter((r) => r.status !== 'unreviewed').map((r) => [r.key, r]));

const rows = [];
const seen = new Set();
for (const f of readdirSync(dir).filter((n) => /^gev-inv-.*\.json$/.test(n)).sort()) {
  const list = JSON.parse(readFileSync(join(dir, f), 'utf8')); // throws on bad JSON: that is the point
  if (!Array.isArray(list)) throw new Error(`${f}: not an array`);
  for (const r of list) {
    const name = String(r.feature ?? r.name ?? '').trim();
    const where = String(r.file ?? r.readmeLine ?? r.line ?? '').trim();
    if (!name) continue;
    const key = `${f.replace(/^gev-inv-|\.json$/g, '')}|${name.toLowerCase()}|${where}`;
    if (seen.has(key)) continue; // exact duplicate inside one inventory
    seen.add(key);
    const base = { key, inventory: f.replace(/^gev-inv-|\.json$/g, ''), feature: name, category: r.category ?? r.kind ?? 'other', where, evidence: r.evidence ?? r.quote ?? r.usedFor ?? '' };
    rows.push(reviewed.get(key) ?? { ...base, status: 'unreviewed', ourUrl: null, reason: null });
  }
}
writeFileSync(out, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), pin: 'aac6be77735f6bcad583204724a43302227abc4d', complete: false, confirmedBy: [], rows }, null, 1) + '\n');
const by = rows.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
console.log(`${rows.length} rows written to ${out}`, by);
