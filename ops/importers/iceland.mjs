// Iceland importer (Icelandic Road and Coastal Administration, Vegagerðin, road camera list; terms: CC BY 4.0, Act No. 45/2018). No key needed.
// Run: node ops/importers/iceland.mjs
//   terms page text (phrases checked every run) + robots.txt + one JSON list -> data/camera-registry/cameras.json (ONLY the iceland-vegagerdin rows
//   are rewritten) + import-report-iceland.json
// Link-out only: no camera picture is fetched, stored or shown. Generic User-Agent, no contact detail.
// Beats Argos by: every Icelandic road camera view named as the Administration names it (station, view text, road name and number) from its own open list whose terms sentences are re-read in code before every run, with the CC BY 4.0 credit printed.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseFeed, normalizeIs, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, LICENCE_PHRASES, ATTRIBUTION } from './lib/iceland.mjs';
import { fetchText as ft0, commitSource } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const IS_SOURCE = {
  id: 'iceland-vegagerdin', name: 'Road cameras (Icelandic Road and Coastal Administration, Vegagerðin)', status: 'active',
  api: { auth: 'none', rateLimit: 'one request for the list per run; picture links are checked by the health checker at most 4 a second', docsUrl: TERMS_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'CC BY 4.0 (Icelandic Road and Coastal Administration terms of use, Act No. 45/2018)', licenseUrl: TERMS_URL, reviewedAt: '2026-11-24',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`iceland: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'iceland-road-cameras'), new Date(now))) return fail('licence closed');
  let terms, robots = '', body, rows;
  try { terms = pageText(await fetchText(TERMS_URL)); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { robots = await fetchText(ROBOTS_URL, {}, 1); } catch { robots = ''; } // no robots.txt (the host answers a redirect or an error body) = no rules
  if (!robotsAllows(robots, new URL(FEED_URL).pathname)) return fail('robots.txt disallows the feed path');
  try { body = await fetchText(FEED_URL, { Accept: 'application/json' }); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  try { rows = parseFeed(body); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const drop = {}, seen = new Set(), cams = [];
  for (const r of rows) { const c = normalizeIs(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: TERMS_URL, raw: rows.length, dropped: drop, total: cams.length };
  return commitSource({ outDir, sourceId: 'iceland-vegagerdin', sourceRow: IS_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-iceland.json', log, label: 'iceland' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
