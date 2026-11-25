// Hong Kong importer (Transport Department traffic camera list on DATA.GOV.HK, DATA.GOV.HK Terms and Conditions v1.2). No key needed.
// Run: node ops/importers/hongkong.mjs
//   terms page text (phrases checked every run) + robots.txt + one XML list -> data/camera-registry/cameras.json (ONLY the hongkong-traffic rows
//   are rewritten) + import-report-hongkong.json
// Link-out only: no camera picture is fetched, stored or shown. Generic User-Agent, no contact detail.
// Beats Argos by: every Hong Kong camera named as the Transport Department names it (description, District, camera key), from the Department's own open list whose terms sentences are re-read in code before every run.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseImages, normalizeHk, robotsAllows, FEED_URL, ROBOTS_URL, TERMS_URL, LICENCE_PHRASES, ATTRIBUTION } from './lib/hongkong.mjs';
import { fetchText as ft0, commitSource, readRobots, pathQuery } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const HK_SOURCE = {
  id: 'hongkong-traffic', name: 'Traffic Snapshot Images (Transport Department, DATA.GOV.HK)', status: 'active',
  api: { auth: 'none', rateLimit: 'one request for the list per run; picture links are checked by the health checker at most 4 a second', docsUrl: 'https://data.gov.hk/en-data/dataset/hk-td-tis_2-traffic-snapshot-images' },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'DATA.GOV.HK Terms and Conditions Version 1.2', licenseUrl: TERMS_URL, reviewedAt: '2026-11-24',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`hongkong: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'hongkong-traffic-cameras'), new Date(now))) return fail('licence closed');
  let terms, robots = '', xml, rows;
  try { terms = await fetchText(TERMS_URL); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { robots = await readRobots(fetchText, ROBOTS_URL); } catch (e) { return fail(`robots.txt unreadable: ${e.message}`); } // only a 4xx answer (no file) means no rules
  if (!robotsAllows(robots, pathQuery(FEED_URL))) return fail('robots.txt disallows the feed path');
  try { xml = await fetchText(FEED_URL, { Accept: 'application/xml' }); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  try { rows = parseImages(xml); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const drop = {}, seen = new Set(), cams = [];
  for (const r of rows) { const c = normalizeHk(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: TERMS_URL, raw: rows.length, dropped: drop, total: cams.length };
  return commitSource({ outDir, sourceId: 'hongkong-traffic', sourceRow: HK_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-hongkong.json', log, label: 'hongkong' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
