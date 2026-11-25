// Austin importer (City of Austin Open Data "Traffic Cameras", dataset b4k4-adkb, public domain; City of Austin Open Data Terms of Use). No key needed.
// Run: node ops/importers/austin.mjs
//   dataset metadata (licence and attribution checked every run) + terms story text (phrases checked every run) + robots.txt + one Socrata list
//   -> data/camera-registry/cameras.json (ONLY the austin-traffic rows are rewritten) + import-report-austin.json
// Link-out only: no camera picture is fetched, stored or shown. Generic User-Agent, no contact detail.
// Beats Argos by: every City of Austin traffic camera the City itself marks TURNED_ON, named as the City names it (camera number, street, cross street), from its own public-domain list whose terms sentences are re-read in code before every run.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseFeed, normalizeAustin, termsText, metaProblems, FEED_URL, META_URL, ROBOTS_URL, TERMS_URL, TERMS_PAGE_URL, LICENCE_PHRASES, ATTRIBUTION } from './lib/austin.mjs';
import { robotsAllows } from './lib/iceland.mjs'; // one robots.txt reader (longest-prefix Allow/Disallow in the "*" group)
import { fetchText as ft0, commitSource, readRobots, pathQuery } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const AUSTIN_SOURCE = {
  id: 'austin-traffic', name: 'Traffic Cameras (City of Austin Open Data, Austin Transportation & Public Works)', status: 'active',
  api: { auth: 'none', rateLimit: 'one request for the list per run (Socrata resource endpoint; portal robots.txt asks Crawl-delay 1); picture links are checked by the health checker at most 4 a second', docsUrl: 'https://data.austintexas.gov/d/b4k4-adkb' },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'Public Domain (dataset licence); City of Austin Open Data Terms of Use', licenseUrl: TERMS_PAGE_URL, reviewedAt: '2026-11-24',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ minUsable = 300, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`austin: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'austin-traffic-cameras'), new Date(now))) return fail('licence closed');
  let meta, terms, robots = '', body, rows;
  try { meta = await fetchText(META_URL, { Accept: 'application/json' }); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const mp = metaProblems(meta);
  if (mp.length) return fail(`licence wording changed (${mp.join('; ')}); review before use`);
  try { terms = termsText(await fetchText(TERMS_URL, { Accept: 'application/json' })); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { robots = await readRobots(fetchText, ROBOTS_URL); } catch (e) { return fail(`robots.txt unreadable: ${e.message}`); } // only a 4xx answer (no file) means no rules
  if (!robotsAllows(robots, pathQuery(FEED_URL))) return fail('robots.txt disallows the feed path');
  try { body = await fetchText(FEED_URL, { Accept: 'application/json' }); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  try { rows = parseFeed(body); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  if (rows.length >= 5000) return fail('feed cut off at the 5000 row limit');
  const drop = {}, seen = new Set(), cams = [];
  for (const r of rows) { const c = normalizeAustin(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: TERMS_PAGE_URL, raw: rows.length, dropped: drop, total: cams.length };
  if (cams.length < minUsable) return fail(`only ${cams.length} usable cameras (shape change?)`, report);
  return commitSource({ outDir, sourceId: 'austin-traffic', sourceRow: AUSTIN_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-austin.json', log, label: 'austin' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
