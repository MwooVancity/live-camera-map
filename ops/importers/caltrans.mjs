// Caltrans CCTV importer. No key needed. Run: node ops/importers/caltrans.mjs [--allow-partial]
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { normalizeCaltrans, dedupe, validateCamera, countsBy, writeJsonAtomic, readJsonOrNull } from './lib/registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_DIR = join(ROOT, 'data', 'camera-registry');
const districts = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const url = (nn) => `https://cwwp2.dot.ca.gov/data/d${Number(nn)}/cctv/cctvStatusD${nn}.json`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Default fetcher: 4 tries, 30s timeout; HTML error pages fail JSON.parse and count as failures.
export async function fetchDistrict(nn, tries = 4) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url(nn), { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return JSON.parse(await r.text());
    } catch (e) { err = e; if (i < tries - 1) await sleep(2000 * (i + 1)); }
  }
  throw err;
}

// fetcher(nn) -> parsed JSON or throws. Returns {written, reason, report}.
export async function run({ fetcher = fetchDistrict, outDir = OUT_DIR, now = new Date().toISOString(), allowPartial = false, log = console.log } = {}) {
  const perDistrict = {}, drop = {}, all = [];
  for (const nn of districts) {
    try {
      const j = await fetcher(nn);
      if (!j || !Array.isArray(j.data)) throw new Error('no data array');
      const n0 = all.length;
      for (const raw of j.data) { const c = normalizeCaltrans(raw, nn, now, drop); if (c) all.push(c); }
      perDistrict[nn] = { ok: j.data.length > 0, raw: j.data.length, kept: all.length - n0 };
      if (j.data.length === 0) perDistrict[nn].error = 'empty';
    } catch (e) { perDistrict[nn] = { ok: false, error: String(e.message || e) }; }
    log(`d${nn}: ${JSON.stringify(perDistrict[nn])}`);
  }
  const cams = dedupe(all, drop);
  const bad = cams.filter((c) => validateCamera(c).length);
  const failed = districts.filter((nn) => !perDistrict[nn].ok);
  const report = { generatedAt: now, perDistrict, dropped: drop, total: cams.length, failedDistricts: failed, byCity: countsBy(cams, 'city') };
  const camPath = join(outDir, 'cameras.json');
  const old = readJsonOrNull(camPath);
  let reason = null;
  if (bad.length) reason = `${bad.length} cameras failed validation`;
  else if (cams.length === 0) reason = 'zero cameras';
  else if (failed.length && !allowPartial) reason = `incomplete: districts failed: ${failed.join(',')}`;
  else if (failed.length && old) reason = 'partial run will not replace an existing good file';
  else if (old && cams.length < old.length * 0.5) reason = `count fell from ${old.length} to ${cams.length}`;
  if (reason) { log(`NOT WRITTEN: ${reason}`); return { written: false, reason, report }; }
  writeJsonAtomic(camPath, cams);
  writeJsonAtomic(join(outDir, 'sources.json'), SOURCES);
  writeJsonAtomic(join(outDir, 'import-report.json'), report);
  return { written: true, reason: null, report };
}

const U = 'unverified';
const perms = () => ({ metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U });
export const SOURCES = [
  { id: 'caltrans', name: 'Caltrans CCTV (California DOT)', status: 'active',
    api: { auth: 'none', rateLimit: 'unknown; importer is sequential with retries', docsUrl: 'https://cwwp2.dot.ca.gov/documentation/cctv/cctv.htm' },
    permissions: perms(), attribution: 'Caltrans', license: U, licenseUrl: null, reviewedAt: '2026-11-22' },
  { id: 'ontario-511', name: 'Ontario 511', status: 'pending-key',
    api: { auth: 'key', rateLimit: U, docsUrl: null }, permissions: perms(),
    attribution: U, license: U, licenseUrl: null, reviewedAt: '2026-11-22' },
  { id: 'alberta-511', name: 'Alberta 511', status: 'pending-key',
    api: { auth: 'key', rateLimit: U, docsUrl: null }, permissions: perms(),
    attribution: U, license: U, licenseUrl: null, reviewedAt: '2026-11-22' },
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await run({ allowPartial: process.argv.includes('--allow-partial') });
  if (r.written) {
    console.log(`WROTE ${r.report.total} cameras`);
    const top = Object.entries(r.report.byCity).sort((a, b) => b[1] - a[1]).slice(0, 25);
    console.log('top cities:', JSON.stringify(top));
  }
  process.exit(r.written ? 0 : 1);
}
