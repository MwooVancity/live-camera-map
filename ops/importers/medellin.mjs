// Medellin importer (SIMM CCTV camera points, GeoMedellin ArcGIS layer; catalogue record CC BY SA). No key needed.
// Run: node ops/importers/medellin.mjs
//   licence record (XML, checked every run) + robots.txt + the one ArcGIS geoJSON query
//   -> data/camera-registry/cameras.json (ONLY the medellin-simm-cameras rows are rewritten) + import-report-medellin.json
// Link-out only: no camera picture is fetched, stored or shown (no separate picture terms found, so image permission stays unverified). Generic User-Agent, no contact detail.
// Beats Argos by: every SIMM traffic-control camera of Medellin named by its place and street corner, from the city's own CC BY SA list whose licence record is re-read in code before every run.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseFeed, normalizeMedellin, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, RECORD_URL, LICENCE_PHRASES, ATTRIBUTION } from './lib/medellin.mjs';
import { fetchText as ft0, commitSource, readRobots, pathQuery } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const MEDELLIN_SOURCE = {
  id: 'medellin-simm-cameras', name: 'Medellín SIMM CCTV cameras (GeoMedellín)', status: 'active',
  api: { auth: 'none', rateLimit: 'one query per run (81 rows); none stated by the host; picture links are not checked by the health checker', docsUrl: RECORD_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'CC BY SA (CC BY-SA 4.0), GeoMedellín catalogue record; joint circular 202660000054 of 2026', licenseUrl: RECORD_URL, reviewedAt: '2026-11-25',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ minUsable = 40, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`medellin: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'medellin-simm-cameras'), new Date(now))) return fail('licence closed');
  let terms, robots = '', raw;
  try { terms = pageText(await fetchText(TERMS_URL)); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { robots = await readRobots(fetchText, ROBOTS_URL); } catch (e) { return fail(`robots.txt unreadable: ${e.message}`); } // only a 3xx/4xx answer (no file) means no rules
  if (!robotsAllows(robots, pathQuery(FEED_URL))) return fail('robots.txt disallows the feed path');
  try { raw = parseFeed(await fetchText(FEED_URL)); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const drop = {}, seen = new Set(), cams = [];
  for (const r of raw) { const c = normalizeMedellin(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: RECORD_URL, raw: raw.length, dropped: drop, total: cams.length };
  if (cams.length < minUsable) return fail(`only ${cams.length} usable cameras (shape change?)`, report);
  return commitSource({ outDir, sourceId: 'medellin-simm-cameras', sourceRow: MEDELLIN_SOURCE, cams, raw: raw.length, report, reportFile: 'import-report-medellin.json', log, label: 'medellin' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
