// Toronto importer (City of Toronto Open Data "Traffic Cameras", Open Government Licence - Toronto). No key needed.
// Run: node ops/importers/toronto.mjs
//   Dataset record (license_id checked every run) + licence page (two phrases checked every run) + CKAN datastore list
//   -> data/camera-registry/cameras.json (ONLY the toronto-traffic rows are rewritten) + import-report-toronto.json
// Link-out only: no camera picture is fetched, stored or shown. Generic User-Agent, no contact detail.
// Beats Argos by: up to four compass views per Toronto intersection, from the City's own open list whose licence id and licence sentence are re-read in code before every run.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { dedupe } from './lib/registry.mjs';
import { normalizeToronto, numberSharedNames, PACKAGE_URL, FEED_URL, TERMS_URL, LICENCE_ID, LICENCE_PHRASES, ATTRIBUTION } from './lib/toronto.mjs';
import { fetchJson as fj0, fetchText as ft0, commitSource } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const TOR_SOURCE = {
  id: 'toronto-traffic', name: 'Traffic Cameras (City of Toronto Open Data)', status: 'active',
  api: { auth: 'none', rateLimit: 'one request for the list per run (CKAN datastore_search, allowed by the portal robots.txt); picture links are checked by the health checker at most 2 a second', docsUrl: 'https://open.toronto.ca/dataset/traffic-cameras/' },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'Open Government Licence - Toronto', licenseUrl: TERMS_URL, reviewedAt: '2026-11-23',
};

// fetchJson(url, headers) / fetchText(url, headers) are injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ fetchJson = fj0, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`toronto: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'toronto-traffic-cameras'), new Date(now))) return fail('licence closed');
  let pkg, terms, doc;
  try { pkg = await fetchJson(PACKAGE_URL); } catch (e) { return fail(`dataset record unreadable: ${e.message}`); }
  const rec = pkg && pkg.success === true && pkg.result;
  if (!rec) return fail('dataset record has no result');
  if (rec.license_id !== LICENCE_ID) return fail(`licence changed to "${rec.license_id}"; review before use`);
  try { terms = await fetchText(TERMS_URL); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { doc = await fetchJson(FEED_URL); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const res = doc && doc.success === true && doc.result;
  if (!res || !Array.isArray(res.records)) return fail('feed has no records array');
  if (Number.isFinite(res.total) && res.total > res.records.length) return fail(`feed cut off: ${res.records.length} of ${res.total} records`);
  const drop = {}, all = [];
  for (const r of res.records) { const c = normalizeToronto(r, now, drop); if (c) all.push(c); }
  const cams = numberSharedNames(dedupe(all, drop));
  const report = { generatedAt: now, source: FEED_URL, datasetModified: rec.metadata_modified || null, listRefreshed: rec.last_refreshed || null, licence: rec.license_id, raw: res.records.length, dropped: drop, total: cams.length };
  return commitSource({ outDir, sourceId: 'toronto-traffic', sourceRow: TOR_SOURCE, cams, raw: res.records.length, report, reportFile: 'import-report-toronto.json', log, label: 'toronto' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
