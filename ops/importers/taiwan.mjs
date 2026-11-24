// Taiwan importer (Highway Bureau, MOTC, provincial-road CCTV list; terms: free public use, original source must be stated as the Bureau). No key needed.
// Run: node ops/importers/taiwan.mjs
//   terms page text (Chinese, phrases checked every run) + robots.txt + one XML list -> data/camera-registry/cameras.json (ONLY the taiwan-thb rows
//   are rewritten) + import-report-taiwan.json
// Link-out only: no camera picture is fetched, stored or shown. Generic User-Agent, no contact detail. One list request per run (terms item 5: not more often than every 60 seconds).
// robots.txt: cctv-maintain.thb.gov.tw answers 404 (read 2026-11-24): no rules, treated as no robots file.
// Beats Argos by: every Highway Bureau provincial-road camera named as the Bureau names it, with its road code and kilometre mark, from the Bureau's open list whose terms sentences are re-read in code before every run, with the credit line printed.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseCctvs, normalizeTw, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, LICENCE_PHRASES, ATTRIBUTION } from './lib/taiwan.mjs';
import { fetchText as ft0, commitSource } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const TW_SOURCE = {
  id: 'taiwan-thb', name: 'Provincial road CCTV list (Highway Bureau, MOTC, Taiwan)', status: 'active',
  api: { auth: 'none', rateLimit: 'one request for the list per run (terms: not more often than every 60 seconds); picture links are never requested by the health checker (a HEAD request to the picture host answers 404, and one GET per camera is too heavy)', docsUrl: TERMS_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'Highway Bureau, MOTC open traffic data notice: free public use, original source must be stated as the Bureau', licenseUrl: TERMS_URL, reviewedAt: '2026-11-24',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`taiwan: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'taiwan-thb-cameras'), new Date(now))) return fail('licence closed');
  let terms, robots = '', body, rows;
  try { terms = pageText(await fetchText(TERMS_URL)); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { robots = await fetchText(ROBOTS_URL, {}, 1); } catch { robots = ''; } // 404 or no file = no rules to read
  if (!robotsAllows(robots, new URL(FEED_URL).pathname)) return fail('robots.txt disallows the feed path');
  try { body = await fetchText(FEED_URL, { Accept: 'application/xml' }); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  try { rows = parseCctvs(body); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const drop = {}, seen = new Set(), cams = [];
  for (const r of rows) { const c = normalizeTw(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: TERMS_URL, raw: rows.length, dropped: drop, total: cams.length };
  return commitSource({ outDir, sourceId: 'taiwan-thb', sourceRow: TW_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-taiwan.json', log, label: 'taiwan' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
