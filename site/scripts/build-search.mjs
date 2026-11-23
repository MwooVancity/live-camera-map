// Builds the static search index into site/public/search/ BEFORE astro build. Usage (from site/): node scripts/build-search.mjs
// Files: manifest.json (entry point), global.<hash>.json (country, region, city, road names: the only file read on first focus besides the manifest),
// shard-<country>.<hash>.json (everything of one country). Deterministic (no clock, sorted rows). Written to a temp folder, verified, then swapped in:
// a failed or over-budget build throws and leaves the old folder untouched (never a half-written manifest).
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, renameSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIND_RANK } from '../src/lib/search-core.mjs';

export const BUDGET_BYTES = 300 * 1024; // first search = manifest + global lookup + one country shard, gzip (design: day4-search-design.md)
const GLOBAL_KINDS = new Set(['country', 'region', 'city', 'road']);
const sha = (s) => createHash('sha256').update(s).digest('hex');
const gz = (s) => gzipSync(s, { level: 9 }).length;
const row = (e) => [e.id, e.kind, e.name, e.norm, e.region, e.road, e.lat, e.lon, e.url];
const byOrder = (a, b) => (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// entries -> { files: Map(name -> text), manifest }. Pure.
export function packIndex(entries) {
  const files = new Map();
  const put = (name, obj) => { const text = JSON.stringify(obj); const hash = sha(text); const file = name.replace('.json', `.${hash.slice(0, 12)}.json`); files.set(file, text); return { file, bytes: Buffer.byteLength(text), gzip: gz(text), sha256: hash }; };
  const sorted = [...entries].sort(byOrder);
  const global = put('global.json', { rows: sorted.filter((e) => GLOBAL_KINDS.has(e.kind)).map((e) => [...row(e), e.country]) });
  const countries = [...new Map(sorted.map((e) => [e.country, e.countrySlug])).entries()].sort((a, b) => (a[1] < b[1] ? -1 : 1));
  const shards = countries.map(([country, slug]) => {
    const mine = sorted.filter((e) => e.country === country);
    return { country, slug, entries: mine.length, ...put(`shard-${slug}.json`, { country, rows: mine.map(row) }) };
  });
  const kinds = {};
  for (const e of entries) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  return { files, manifest: { version: 1, entries: entries.length, kinds, global, shards } };
}

// First-search payload (gzip): manifest + global lookup + the largest shard (worst case for the shard a query needs).
export function sizeGate(manifest) {
  const manifestGzip = gz(JSON.stringify(manifest));
  const shard = Math.max(0, ...manifest.shards.map((s) => s.gzip));
  const total = manifestGzip + manifest.global.gzip + shard;
  return { ok: total <= BUDGET_BYTES, total, manifestGzip, globalGzip: manifest.global.gzip, largestShardGzip: shard, budget: BUDGET_BYTES };
}

// Writes the index to outDir. Throws (and keeps the old outDir) when over budget, a hash does not match or a file is missing.
export function writeIndex(entries, outDir, budgetCheck = sizeGate) {
  const { files, manifest } = packIndex(entries);
  const gate = budgetCheck(manifest);
  if (!gate.ok) throw new Error(`search index over budget: first search ${gate.total} B gzip (manifest ${gate.manifestGzip} + global ${gate.globalGzip} + largest shard ${gate.largestShardGzip}) > ${gate.budget} B. Shard by region or adopt a library.`);
  const tmp = `${outDir}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  for (const [name, text] of files) writeFileSync(join(tmp, name), text);
  writeFileSync(join(tmp, 'manifest.json'), JSON.stringify(manifest)); // last
  const bad = verifyIndex(tmp);
  if (bad.length) { rmSync(tmp, { recursive: true, force: true }); throw new Error('search index failed verification: ' + bad.join('; ')); }
  rmSync(outDir, { recursive: true, force: true });
  renameSync(tmp, outDir);
  return { manifest, gate, files: [...files].map(([n, t]) => ({ name: n, bytes: Buffer.byteLength(t), gzip: gz(t) })) };
}

// Manifest points only to files that exist and whose hash and size match; no unlisted file sits beside them. Returns problems.
export function verifyIndex(dir) {
  const p = [];
  const mf = join(dir, 'manifest.json');
  if (!existsSync(mf)) return ['no manifest.json'];
  let m; try { m = JSON.parse(readFileSync(mf, 'utf8')); } catch { return ['manifest.json is not valid JSON']; }
  const listed = [m.global, ...(m.shards || [])];
  for (const f of listed) {
    const fp = join(dir, f?.file || '?');
    if (!f?.file || !existsSync(fp)) { p.push(`manifest lists ${f?.file} which does not exist`); continue; }
    const text = readFileSync(fp, 'utf8');
    if (sha(text) !== f.sha256) p.push(`${f.file}: hash does not match the manifest`);
    if (Buffer.byteLength(text) !== f.bytes) p.push(`${f.file}: size does not match the manifest`);
  }
  const names = new Set(listed.map((f) => f?.file).concat('manifest.json'));
  for (const f of readdirSync(dir)) if (!names.has(f)) p.push(`${f} is in the folder but not in the manifest`);
  return p;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const { cameras } = await import('../src/lib/data.mjs');
    const { buildEntries, validateEntries, pageRoutes } = await import('../src/lib/search-index.mjs');
    const entries = buildEntries(cameras);
    const problems = validateEntries(entries, pageRoutes(cameras));
    if (problems.length) throw new Error(`search entries invalid (${problems.length}): ${problems.slice(0, 10).join('; ')}`);
    const r = writeIndex(entries, resolve('public/search'));
    console.log(`search index: ${entries.length} entries ${JSON.stringify(r.manifest.kinds)}`);
    for (const f of r.files) console.log(`  ${f.name}: ${f.bytes} B, ${f.gzip} B gzip`);
    console.log(`  first search (manifest + global + largest shard): ${r.gate.total} B gzip of ${r.gate.budget} B budget`);
  } catch (e) { console.error('SEARCH BUILD FAIL: ' + e.message); process.exit(1); }
}
