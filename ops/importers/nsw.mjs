// New South Wales importer (Transport for NSW Live Traffic Cameras; licence: Creative Commons Attribution 4.0). No key needed.
// Run: node ops/importers/nsw.mjs
//   licence page text (phrases checked every run) + robots.txt + one GeoJSON list -> data/camera-registry/cameras.json (ONLY the nsw-live-traffic rows
//   are rewritten) + import-report-nsw.json
// Link-out only: no camera picture is fetched, stored or shown. Generic User-Agent, no contact detail.
// robots.txt: data.livetraffic.com answers it with 403 (read 2026-11-24), so no rules can be read; treated as no robots file (Austin and Iceland precedent).
// Beats Argos by: every Transport for NSW Live Traffic camera named as the agency names it with its own view sentence, from the agency's open list whose licence sentences are re-read in code before every run, with the credit line printed.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseFeed, normalizeNsw, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, LICENCE_PHRASES, ATTRIBUTION } from './lib/nsw.mjs';
import { fetchText as ft0, commitSource, readRobots, pathQuery } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const NSW_SOURCE = {
  id: 'nsw-live-traffic', name: 'Live Traffic Cameras (Transport for NSW)', status: 'active',
  api: { auth: 'none', rateLimit: 'one request for the list per run; picture links are not requested by the health checker (the picture host answers automated requests with a placeholder page)', docsUrl: 'https://opendata.transport.nsw.gov.au/dataset/live-traffic-cameras' },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'Creative Commons Attribution 4.0 (Transport for NSW Open Data Hub data licence)', licenseUrl: TERMS_URL, reviewedAt: '2026-11-24',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`nsw: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'nsw-live-traffic-cameras'), new Date(now))) return fail('licence closed');
  let terms, robots = '', body, rows;
  try { terms = pageText(await fetchText(TERMS_URL)); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { robots = await readRobots(fetchText, ROBOTS_URL); } catch (e) { return fail(`robots.txt unreadable: ${e.message}`); } // only a 4xx answer (no file) means no rules
  if (!robotsAllows(robots, pathQuery(FEED_URL))) return fail('robots.txt disallows the feed path');
  try { body = await fetchText(FEED_URL, { Accept: 'application/json' }); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  try { rows = parseFeed(body); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const drop = {}, seen = new Set(), cams = [];
  for (const r of rows) { const c = normalizeNsw(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: TERMS_URL, raw: rows.length, dropped: drop, total: cams.length };
  return commitSource({ outDir, sourceId: 'nsw-live-traffic', sourceRow: NSW_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-nsw.json', log, label: 'nsw' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
