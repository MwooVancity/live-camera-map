// Baton Rouge importer (City of Baton Rouge open data, dataset 6z6u-ts44 "Traffic Camera", LADOTD cameras; portal tag Public Domain). No key needed.
// Run: node ops/importers/brla.mjs
//   dataset record (licence name, attribution, description checked every run) + robots.txt + one list request -> data/camera-registry/cameras.json (ONLY the brla-dotd rows are rewritten) + import-report-brla.json
// Link-out only: no camera picture is fetched, stored or shown, and 511la.org is never contacted by this importer or by the health checker.
// Beats Argos by: every LADOTD camera the City lists for Greater Baton Rouge, with the portal's Public Domain tag, DOTD attribution and description re-read in code before every run.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseFeed, normalizeBrla, metaProblems, robotsAllows, FEED_URL, META_URL, ROBOTS_URL, PAGE_URL, ATTRIBUTION, LIMIT } from './lib/brla.mjs';
import { fetchText as ft0, commitSource } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const BRLA_SOURCE = {
  id: 'brla-dotd', name: 'Traffic Camera (Louisiana DOTD cameras in Greater Baton Rouge, via City of Baton Rouge open data)', status: 'active',
  api: { auth: 'none', rateLimit: 'one dataset-record request and one list request per run, 1.1 s apart (portal robots.txt asks Crawl-delay 1); 511la.org is never requested by us', docsUrl: PAGE_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'Public Domain (a tag set by the City of Baton Rouge open data portal on LADOTD-owned data; not a licence read from LADOTD)', licenseUrl: PAGE_URL, reviewedAt: '2026-11-24',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ minUsable = 60, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log, pauseMs = 1100 } = {}) {
  const fail = (reason, report = null) => { log(`brla: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'brla-dotd-cameras'), new Date(now))) return fail('licence closed');
  let meta, robots = '', rows;
  try { meta = await fetchText(META_URL, { Accept: 'application/json' }); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const mp = metaProblems(meta);
  if (mp.length) return fail(`licence wording changed (${mp.join('; ')}); review before use`);
  try { robots = await fetchText(ROBOTS_URL, {}, 1); } catch { robots = ''; } // no robots.txt (an error body) = no rules
  for (const u of [FEED_URL, META_URL]) if (!robotsAllows(robots, new URL(u).pathname)) return fail('robots.txt disallows a path we read');
  if (pauseMs) await sleep(pauseMs); // Crawl-delay 1
  try { rows = parseFeed(await fetchText(FEED_URL, { Accept: 'application/json' })); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  if (rows.length >= LIMIT) return fail(`feed cut off at the ${LIMIT} row limit`);
  const drop = {}, seen = new Set(), cams = [];
  for (const r of rows) { const c = normalizeBrla(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: PAGE_URL, raw: rows.length, dropped: drop, total: cams.length };
  if (cams.length < minUsable) return fail(`only ${cams.length} usable cameras (shape change?)`, report);
  return commitSource({ outDir, sourceId: 'brla-dotd', sourceRow: BRLA_SOURCE, cams, raw: rows.length, report, reportFile: 'import-report-brla.json', log, label: 'brla' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
