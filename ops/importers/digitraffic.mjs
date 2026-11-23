// Finland importer (Fintraffic Digitraffic weather cameras). No key needed.
// Run: node ops/importers/digitraffic.mjs
//   Terms page (CC 4.0 BY sentence checked every run) + station list -> data/camera-registry/cameras.json
//   (ONLY the digitraffic rows are rewritten) + import-report-digitraffic.json
// Link-out only: no camera picture is fetched, stored or shown. Generic User-Agent, no contact detail.
// Beats Argos by: Finnish cameras come from a licensed official feed whose licence sentence is re-read in code before every run.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { dedupe, countsBy } from './lib/registry.mjs';
import { normalizeStation, STATIONS_URL, TERMS_URL, LICENCE_PHRASES, FI_HEADERS } from './lib/digitraffic.mjs';
import { fetchJson as fj0, fetchText as ft0, commitSource } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const FI_SOURCE = {
  id: 'digitraffic', name: 'Fintraffic Digitraffic weather cameras (Finland)', status: 'active',
  api: { auth: 'none', rateLimit: 'one request for the list per run; picture links are checked by the health checker at under 60 requests a minute (Digitraffic image limit without the Digitraffic-User header)', docsUrl: 'https://www.digitraffic.fi/en/road-traffic/' },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: 'Source: Fintraffic / digitraffic.fi, license CC 4.0 BY',
  license: 'Creative Commons 4.0 BY', licenseUrl: TERMS_URL, reviewedAt: '2026-11-23',
};

// fetchJson(url, headers) / fetchText(url, headers) are injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ fetchJson = fj0, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`digitraffic: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'digitraffic-weathercam'), new Date(now))) return fail('licence closed');
  let terms, doc;
  try { terms = await fetchText(TERMS_URL); } catch (e) { return fail(`terms page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { doc = await fetchJson(STATIONS_URL, FI_HEADERS); } catch (e) { return fail(`station list unreadable: ${e.message}`); }
  if (!doc || !Array.isArray(doc.features)) return fail('station list has no features array');
  const drop = {}, all = [];
  for (const f of doc.features) { const c = normalizeStation(f, now, drop); if (c) all.push(c); }
  const cams = dedupe(all, drop);
  const report = { generatedAt: now, source: STATIONS_URL, feedUpdated: doc.dataUpdatedTime || null, licence: 'Creative Commons 4.0 BY (phrases found on the terms page)', raw: doc.features.length, dropped: drop, total: cams.length, byCity: countsBy(cams, 'city') };
  return commitSource({ outDir, sourceId: 'digitraffic', sourceRow: FI_SOURCE, cams, raw: doc.features.length, report, reportFile: 'import-report-digitraffic.json', log, label: 'digitraffic' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify({ ...v.report, byCity: undefined }) : ''}`);
  if (v.report && v.report.byCity) console.log('top places:', JSON.stringify(Object.entries(v.report.byCity).sort((a, b) => b[1] - a[1]).slice(0, 15)));
  process.exit(v.written ? 0 : 1);
}
