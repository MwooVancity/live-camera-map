// Iowa importer (Iowa DOT Traffic Cameras, ArcGIS FeatureServer, Creative Commons Attribution 4.0; Iowa DOT GIS Data Terms of Use). No key needed.
// Run: node ops/importers/iowa.mjs
//   dataset record (licence checked every run) + terms page text (phrases checked every run) + robots.txt + one count query + the list in pages
//   -> data/camera-registry/cameras.json (ONLY the iowa-dot rows are rewritten) + import-report-iowa.json
// Link-out only: no camera picture or stream is fetched, stored or shown. Generic User-Agent, no contact detail.
// Beats Argos by: every Iowa DOT camera named as the DOT names it (route and mile marker), from its own CC BY 4.0 list whose dataset record and terms sentences are re-read in code before every run, with the credit line printed.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parsePage, parseCount, normalizeIowa, itemProblems, robotsAllows, pageText, LAYER_URL, COUNT_URL, pageUrl, PAGE_SIZE, MAX_PAGES, ITEM_URL, ITEM_PAGE_URL, ROBOTS_URL, TERMS_URL, LICENCE_PHRASES, ATTRIBUTION } from './lib/iowa.mjs';
import { fetchText as ft0, commitSource, readRobots, pathQuery } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const IOWA_SOURCE = {
  id: 'iowa-dot', name: 'Traffic Cameras (Iowa Department of Transportation, ArcGIS)', status: 'active',
  api: { auth: 'none', rateLimit: 'a count query and two list pages per run; no limit stated by the host; picture links are checked by the health checker at most 4 a second', docsUrl: ITEM_PAGE_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'Creative Commons Attribution 4.0 International (dataset licence); Iowa DOT GIS Data Terms of Use', licenseUrl: TERMS_URL, reviewedAt: '2026-11-24',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ minUsable = 300, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`iowa: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'iowa-dot-cameras'), new Date(now))) return fail('licence closed');
  let item, terms, robots = '', count;
  try { item = await fetchText(ITEM_URL, { Accept: 'application/json' }); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const ip = itemProblems(item);
  if (ip.length) return fail(`licence wording changed (${ip.join('; ')}); review before use`);
  try { terms = pageText(await fetchText(TERMS_URL)); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { robots = await readRobots(fetchText, ROBOTS_URL); } catch (e) { return fail(`robots.txt unreadable: ${e.message}`); } // only a 4xx answer (no file) means no rules
  if (!robotsAllows(robots, new URL(LAYER_URL).pathname + '/query')) return fail('robots.txt disallows the feed path');
  try { count = parseCount(await fetchText(COUNT_URL, { Accept: 'application/json' })); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const rows = [];
  try {
    for (let n = 0; n < MAX_PAGES; n++) {
      const p = parsePage(await fetchText(pageUrl(rows.length), { Accept: 'application/json' }));
      rows.push(...p.rows);
      if (!p.rows.length || (!p.more && p.rows.length < PAGE_SIZE)) break; // a short page that the server does not mark as cut is the last one
    }
  } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  if (rows.length !== count) return fail(`read ${rows.length} rows but the layer counts ${count} (list changed while reading, or paging failed)`);
  const drop = {}, seen = new Set(), cams = [];
  for (const r of rows) { const c = normalizeIowa(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: LAYER_URL, licenceUrl: TERMS_URL, raw: rows.length, dropped: drop, total: cams.length };
  if (cams.length < minUsable) return fail(`only ${cams.length} usable cameras (shape change?)`, report);
  return commitSource({ outDir, sourceId: 'iowa-dot', sourceRow: IOWA_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-iowa.json', log, label: 'iowa' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
