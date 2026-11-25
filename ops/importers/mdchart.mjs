// Maryland CHART importer (State of Maryland open data portal, dataset 4z3c-43ce "Traffic Cameras", MDOT SHA / CHART). No key needed.
// Run: node ops/importers/mdchart.mjs
//   dataset record (id, description, no licence field, checked every run) + robots.txt + one list request -> data/camera-registry/cameras.json (ONLY the maryland-chart-cameras rows are rewritten) + import-report-mdchart.json
// Link-out only: no camera picture is fetched, stored or shown, and chart.maryland.gov (Cloudflare challenge) is never contacted by this importer or by the health checker.
// Beats Argos by: every camera MDOT SHA publishes, named by its CHART location and county, from the agency's own list, with the missing licence stated plainly.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseFeed, normalizeMd, metaProblems, robotsAllows, FEED_URL, META_URL, ROBOTS_URL, PAGE_URL, ATTRIBUTION, LIMIT } from './lib/mdchart.mjs';
import { fetchText as ft0, commitSource, readRobots, pathQuery } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const MD_SOURCE = {
  id: 'maryland-chart-cameras', name: 'Traffic Cameras (Maryland DOT State Highway Administration, CHART, via State of Maryland open data)', status: 'active',
  api: { auth: 'none', rateLimit: 'one dataset-record request and one list request per run, 1.1 s apart (portal robots.txt asks Crawl-delay 1); chart.maryland.gov is never requested by us', docsUrl: PAGE_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: "No licence or terms found on the dataset or the portal pages read (2026-11-25); listed link-only on the owner's recorded approval (data/owner-approvals.json)", licenseUrl: PAGE_URL, reviewedAt: '2026-11-25',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ minUsable = 300, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log, pauseMs = 1100 } = {}) {
  const fail = (reason, report = null) => { log(`maryland-chart: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'maryland-chart-cameras'), new Date(now))) return fail('licence closed');
  let meta, robots = '', rows;
  try { meta = await fetchText(META_URL, { Accept: 'application/json' }); } catch (e) { return fail(`dataset record unreadable: ${e.message}`); }
  const mp = metaProblems(meta);
  if (mp.length) return fail(`dataset record changed (${mp.join('; ')}); review before use`);
  try { robots = await readRobots(fetchText, ROBOTS_URL); } catch (e) { return fail(`robots.txt unreadable: ${e.message}`); } // only a 4xx answer (no file) means no rules
  for (const u of [FEED_URL, META_URL]) if (!robotsAllows(robots, pathQuery(u))) return fail('robots.txt disallows a path we read');
  if (pauseMs) await sleep(pauseMs); // Crawl-delay 1
  try { rows = parseFeed(await fetchText(FEED_URL, { Accept: 'application/json' })); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  if (rows.length >= LIMIT) return fail(`feed cut off at the ${LIMIT} row limit`);
  const drop = {}, seen = new Set(), cams = [];
  for (const r of rows) { const c = normalizeMd(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, recordUrl: PAGE_URL, raw: rows.length, dropped: drop, total: cams.length };
  if (cams.length < minUsable) return fail(`only ${cams.length} usable cameras (shape change?)`, report);
  return commitSource({ outDir, sourceId: 'maryland-chart-cameras', sourceRow: MD_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-mdchart.json', log, label: 'maryland-chart' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
