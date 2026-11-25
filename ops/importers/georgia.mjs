// Georgia importer (GDOT 511GA cameras, the keyless ArcGIS copy published by the Georgia Emergency Management Agency). No key needed.
// Run: node ops/importers/georgia.mjs
//   dataset record (id, title, owner checked every run) + robots.txt + one count query + the list in pages
//   -> data/camera-registry/cameras.json (ONLY the georgia-511 rows are rewritten) + import-report-georgia.json
// NO LICENCE FOUND for the list: it ships only under the owner's approval recorded for this one source (data/owner-approvals.json); the gate (isEnabled) is checked every run.
// Link-out only: no camera picture or stream is fetched, stored or shown, and 511ga.org is never contacted. Generic User-Agent, no contact detail.
// Beats Argos by: every enabled GDOT 511GA camera named as GDOT names it, each with a stable link to GDOT's own camera page, and an honest statement that no terms page was found.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parsePage, parseCount, normalizeGeorgia, itemProblems, robotsAllows, LAYER_URL, COUNT_URL, pageUrl, MAX_PAGES, ITEM_URL, ITEM_PAGE_URL, ROBOTS_URL, ATTRIBUTION } from './lib/georgia.mjs';
import { fetchText as ft0, commitSource, readRobots } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const GEORGIA_SOURCE = {
  id: 'georgia-511', name: 'GDOT 511 Cameras (Georgia DOT 511GA, copy published by Georgia Emergency Management, ArcGIS)', status: 'active',
  api: { auth: 'none', rateLimit: 'a count query and four list pages per run; no limit stated by the host; 511ga.org is never requested by us', docsUrl: ITEM_PAGE_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'No licence or terms page found; shown under the owner approval of 2026-11-25 (link-out only)', licenseUrl: ITEM_PAGE_URL, reviewedAt: '2026-11-25',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ minUsable = 1500, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`georgia: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'georgia-511-cameras'), new Date(now))) return fail('licence closed');
  let item, robots = '', count;
  try { item = await fetchText(ITEM_URL, { Accept: 'application/json' }); } catch (e) { return fail(`dataset record unreadable: ${e.message}`); }
  const ip = itemProblems(item);
  if (ip.length) return fail(`dataset record changed (${ip.join('; ')}); review before use`);
  try { robots = await readRobots(fetchText, ROBOTS_URL); } catch (e) { return fail(`robots.txt unreadable: ${e.message}`); } // only a 4xx answer (no file) means no rules
  if (!robotsAllows(robots, new URL(LAYER_URL).pathname + '/query')) return fail('robots.txt disallows the feed path');
  try { count = parseCount(await fetchText(COUNT_URL, { Accept: 'application/json' })); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const rows = [];
  try {
    for (let n = 0; n < MAX_PAGES; n++) {
      const p = parsePage(await fetchText(pageUrl(rows.length), { Accept: 'application/json' }));
      rows.push(...p.rows);
      if (!p.rows.length || rows.length >= count) break; // the server may cap a page below the size asked, so the count (not the page length) says when the list is complete
    }
  } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  if (rows.length !== count) return fail(`read ${rows.length} rows but the layer counts ${count} (list changed while reading, or paging failed)`);
  const drop = {}, seen = new Set(), cams = [];
  for (const r of rows) { const c = normalizeGeorgia(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: LAYER_URL, datasetRecord: ITEM_PAGE_URL, raw: rows.length, dropped: drop, total: cams.length };
  if (cams.length < minUsable) return fail(`only ${cams.length} usable cameras (shape change?)`, report);
  return commitSource({ outDir, sourceId: 'georgia-511', sourceRow: GEORGIA_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-georgia.json', log, label: 'georgia' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
