// A22 Brenner motorway importer (Autostrada del Brennero webcams via the Open Data Hub tourism API; record licence CC0). No key needed.
// Run: node ops/importers/a22.mjs
//   Hub licensing page text (phrases checked every run) + robots.txt + one list request -> data/camera-registry/cameras.json (ONLY the a22-brennero rows are rewritten) + import-report-a22.json
// Link-out only: no camera picture is fetched, stored or shown. www.autobrennero.it answers automated requests with a Cloudflare challenge, so this importer never touches that host.
// Beats Argos by: all A22 webcams named as Autobrennero names them with the kilometre mark and carriageway side as text, from a list whose CC0 licence is re-read in code before every run, with the Hub's "does not cover the picture" warning kept.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseFeed, normalizeA22, robotsAllows, pageText, FEED_URL, ROBOTS_URL, TERMS_URL, LICENCE_PHRASES, ATTRIBUTION } from './lib/a22.mjs';
import { fetchText as ft0, commitSource, readRobots, pathQuery } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const A22_SOURCE = {
  id: 'a22-brennero', name: 'A22 Brenner motorway webcams (Autostrada del Brennero, via the Open Data Hub)', status: 'active',
  api: { auth: 'none', rateLimit: 'one list request per run; picture links are not requested by the health checker (www.autobrennero.it answers automated requests with a Cloudflare challenge)', docsUrl: TERMS_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'CC0 per record (Open Data Hub LicenseInfo, licence holder Autostrada del Brennero); the Hub says this does not extend to the picture behind Webcamurl', licenseUrl: TERMS_URL, reviewedAt: '2026-11-24',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ minUsable = 10, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`a22: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'a22-brennero-cameras'), new Date(now))) return fail('licence closed');
  let terms, robots = '', parsed;
  try { terms = pageText(await fetchText(TERMS_URL)); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { robots = await readRobots(fetchText, ROBOTS_URL); } catch (e) { return fail(`robots.txt unreadable: ${e.message}`); } // only a 4xx answer (no file) means no rules
  if (!robotsAllows(robots, pathQuery(FEED_URL))) return fail('robots.txt disallows the feed path');
  try { parsed = parseFeed(await fetchText(FEED_URL, { Accept: 'application/json' })); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const { rows, total } = parsed;
  if (rows.length !== total) return fail(`read ${rows.length} rows but the feed counts ${total}`);
  const drop = {}, seen = new Set(), cams = [];
  for (const r of rows) { const c = normalizeA22(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: TERMS_URL, raw: rows.length, dropped: drop, total: cams.length };
  if (cams.length < minUsable) return fail(`only ${cams.length} usable cameras (shape change?)`, report);
  return commitSource({ outDir, sourceId: 'a22-brennero', sourceRow: A22_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-a22.json', log, label: 'a22' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
