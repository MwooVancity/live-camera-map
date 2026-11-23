// Quebec importer (MTMD "Camera de circulation", Donnees Quebec). No key needed.
// Run: node ops/importers/quebec.mjs
//   Dataset record (license_id cc-by checked every run) + GeoJSON feed -> data/camera-registry/cameras.json
//   (ONLY the quebec-mtmd rows are rewritten) + import-report-quebec.json
// Link-out only: nothing is fetched from quebec511.info (it answers automated requests with a bot-check page; we do not work around it).
// Beats Argos by: Quebec cameras come from the ministry's licensed list, grouped by the ministry's own 14 regions, with the licence id re-read in code before every run.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { dedupe, countsBy } from './lib/registry.mjs';
import { normalizeQuebec, PACKAGE_URL, FEED_URL, LICENCE_ID } from './lib/quebec.mjs';
import { fetchJson as fj0, commitSource } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const QC_SOURCE = {
  id: 'quebec-mtmd', name: 'Camera de circulation (Ministere des Transports et de la Mobilite durable du Quebec, via Donnees Quebec)', status: 'active',
  api: { auth: 'none', rateLimit: 'one request for the list per run; the camera links are never requested', docsUrl: 'https://www.donneesquebec.ca/recherche/dataset/camera-de-circulation' },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: 'Contains data from the Ministere des Transports et de la Mobilite durable du Quebec, Donnees Quebec, licence CC-BY 4.0',
  license: 'Attribution (CC-BY 4.0)', licenseUrl: 'https://www.donneesquebec.ca/licence/#cc-by', reviewedAt: '2026-11-23',
};

// fetchJson(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ fetchJson = fj0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`quebec: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'quebec-cameras'), new Date(now))) return fail('licence closed');
  let pkg, doc;
  try { pkg = await fetchJson(PACKAGE_URL); } catch (e) { return fail(`dataset record unreadable: ${e.message}`); }
  const rec = pkg && pkg.success === true && pkg.result;
  if (!rec) return fail('dataset record has no result');
  if (rec.license_id !== LICENCE_ID) return fail(`licence changed to "${rec.license_id}"; review before use`);
  try { doc = await fetchJson(FEED_URL, { Accept: 'application/geo+json, application/json' }); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  if (!doc || !Array.isArray(doc.features)) return fail('feed has no features array');
  if (Number.isFinite(doc.numberMatched) && doc.numberMatched > doc.features.length) return fail(`feed cut off: ${doc.features.length} of ${doc.numberMatched} features`);
  const drop = {}, all = [];
  for (const f of doc.features) { const c = normalizeQuebec(f, now, drop); if (c) all.push(c); }
  const cams = dedupe(all, drop);
  const report = { generatedAt: now, source: FEED_URL, datasetModified: rec.metadata_modified || null, licence: rec.license_title || rec.license_id, raw: doc.features.length, dropped: drop, total: cams.length, byRegion: countsBy(cams, 'region') };
  return commitSource({ outDir, sourceId: 'quebec-mtmd', sourceRow: QC_SOURCE, cams, raw: doc.features.length, report, reportFile: 'import-report-quebec.json', log, label: 'quebec' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
