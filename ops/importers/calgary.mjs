// Calgary importer (City of Calgary Open Data "Traffic Cameras", Open Government Licence - City of Calgary). No key needed.
// Run: node ops/importers/calgary.mjs
//   Licence page text (phrases checked every run) + Socrata resource list -> data/camera-registry/cameras.json (ONLY the calgary-traffic rows
//   are rewritten) + import-report-calgary.json
// Link-out only: no camera picture is fetched, stored or shown. Generic User-Agent, no contact detail.
// Beats Argos by: every Calgary camera named as the City names it (road / cross road, quadrant), from the City's own open list whose licence sentences are re-read in code before every run.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { dedupe } from './lib/registry.mjs';
import { normalizeCalgary, numberSharedNames, FEED_URL, TERMS_URL, LIMIT, LICENCE_PHRASES, ATTRIBUTION } from './lib/calgary.mjs';
import { fetchJson as fj0, fetchText as ft0, commitSource } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const CGY_SOURCE = {
  id: 'calgary-traffic', name: 'Traffic Cameras (City of Calgary Open Data)', status: 'active',
  api: { auth: 'none', rateLimit: 'one request for the list per run (Socrata resource endpoint, allowed by the portal robots.txt, Crawl-delay 1); picture links are checked by the health checker at most 2 a second', docsUrl: 'https://data.calgary.ca/resource/k7p9-kppz.json' },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'Open Government Licence - City of Calgary', licenseUrl: TERMS_URL, reviewedAt: '2026-11-23',
};

// fetchJson(url, headers) / fetchText(url, headers) are injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ fetchJson = fj0, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`calgary: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'calgary-traffic-cameras'), new Date(now))) return fail('licence closed');
  let terms, rows;
  try { terms = await fetchText(TERMS_URL); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { rows = await fetchJson(FEED_URL); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  if (!Array.isArray(rows)) return fail('feed is not a list');
  if (rows.length >= LIMIT) return fail(`feed cut off at the ${LIMIT} row limit`);
  const drop = {}, all = [];
  for (const r of rows) { const c = normalizeCalgary(r, now, drop); if (c) all.push(c); }
  const cams = numberSharedNames(dedupe(all, drop));
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: TERMS_URL, raw: rows.length, dropped: drop, total: cams.length };
  return commitSource({ outDir, sourceId: 'calgary-traffic', sourceRow: CGY_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-calgary.json', log, label: 'calgary' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
