// Taiwan river-camera importer (Water Resources Agency, MOEA; open list under the Government Open Data License 1.0). No key needed.
// Run: node ops/importers/taiwanwra.mjs
//   data.gov.tw dataset record (licence checked every run) + data.gov.tw licence page text (phrases checked every run) + robots.txt + the JSON list
//   -> data/camera-registry/cameras.json (ONLY the taiwan-wra-cameras rows are rewritten) + import-report-taiwanwra.json
// Link-out only: no camera picture is fetched, stored or shown (the opendata.wra.gov.tw footer claims all pictures, so image permission stays unverified). Generic User-Agent, no contact detail.
// robots.txt: opendata.wra.gov.tw answers 404 (read 2026-11-25): no rules, treated as no robots file.
// Beats Argos by: every Water Resources Agency river camera named as the Agency names it, with its river basin, tributary, county and district, from the Agency's own open list whose licence record and licence text are re-read in code before every run, with the credit line printed.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseFeed, normalizeTwra, datasetProblems, robotsAllows, pageText, FEED_URL, DATASET_API_URL, DATASET_URL, ROBOTS_URL, TERMS_URL, LICENCE_PHRASES, ATTRIBUTION } from './lib/taiwanwra.mjs';
import { fetchText as ft0, commitSource, readRobots, pathQuery } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const TWRA_SOURCE = {
  id: 'taiwan-wra-cameras', name: 'Water Resources Agency river cameras (Taiwan)', status: 'active',
  api: { auth: 'none', rateLimit: 'one list request per run; none stated by the host; picture links are not checked by the health checker', docsUrl: DATASET_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'Government Open Data License 1.0 (data.gov.tw dataset 36687): use for any purpose, royalty-free, with attribution', licenseUrl: TERMS_URL, reviewedAt: '2026-11-25',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ minUsable = 100, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`taiwanwra: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'taiwan-wra-cameras'), new Date(now))) return fail('licence closed');
  let item, terms, robots = '', raw;
  try { item = await fetchText(DATASET_API_URL, { Accept: 'application/json' }); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const ip = datasetProblems(item);
  if (ip.length) return fail(`licence wording changed (${ip.join('; ')}); review before use`);
  try { terms = pageText(await fetchText(TERMS_URL)); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { robots = await readRobots(fetchText, ROBOTS_URL); } catch (e) { return fail(`robots.txt unreadable: ${e.message}`); } // only a 3xx/4xx answer (no file) means no rules
  if (!robotsAllows(robots, pathQuery(FEED_URL))) return fail('robots.txt disallows the feed path');
  try { raw = parseFeed(await fetchText(FEED_URL, { Accept: 'application/json' })); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const drop = {}, seen = new Set(), cams = [];
  for (const r of raw) { const c = normalizeTwra(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: TERMS_URL, raw: raw.length, dropped: drop, total: cams.length };
  if (cams.length < minUsable) return fail(`only ${cams.length} usable cameras (shape change?)`, report);
  return commitSource({ outDir, sourceId: 'taiwan-wra-cameras', sourceRow: TWRA_SOURCE, cams, raw: raw.length, report, reportFile: 'import-report-taiwanwra.json', log, label: 'taiwanwra' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
