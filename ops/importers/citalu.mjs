// Luxembourg importer (CITA motorway webcams, Administration des Ponts et Chaussees; dataset CC0 on data.public.lu, FAQ: available without restrictions). No key needed.
// Run: node ops/importers/citalu.mjs
//   dataset record (licence checked every run) + FAQ page text (phrase checked every run) + robots.txt + the KML list
//   -> data/camera-registry/cameras.json (ONLY the cita-lu-cameras rows are rewritten) + import-report-citalu.json
// Link-out only: no camera picture is fetched, stored or shown (the page footer says "All rights reserved", so image permission stays unverified). Generic User-Agent, no contact detail.
// Beats Argos by: every CITA motorway camera named as CITA names it (motorway and camera number), from its own CC0 list whose dataset record and FAQ sentence are re-read in code before every run.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseKml, normalizeCita, datasetProblems, robotsAllows, pageText, FEED_URL, DATASET_API_URL, DATASET_URL, ROBOTS_URL, TERMS_URL, LICENCE_PHRASES, ATTRIBUTION } from './lib/citalu.mjs';
import { fetchText as ft0, commitSource, readRobots, pathQuery } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
export const CITA_SOURCE = {
  id: 'cita-lu-cameras', name: 'CITA motorway webcams (Ponts et Chaussees, Luxembourg)', status: 'active',
  api: { auth: 'none', rateLimit: 'one KML request per run; none stated by the host; picture links are not checked by the health checker (the link is an HTML page)', docsUrl: DATASET_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'Creative Commons Zero (CC0) dataset licence (data.public.lu); CITA FAQ: webcam information available without restrictions', licenseUrl: TERMS_URL, reviewedAt: '2026-11-25',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ minUsable = 60, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`citalu: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'cita-lu-cameras'), new Date(now))) return fail('licence closed');
  let item, terms, robots = '', raw;
  try { item = await fetchText(DATASET_API_URL, { Accept: 'application/json' }); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const ip = datasetProblems(item);
  if (ip.length) return fail(`licence wording changed (${ip.join('; ')}); review before use`);
  try { terms = pageText(await fetchText(TERMS_URL)); } catch (e) { return fail(`licence page unreadable: ${e.message}`); }
  const lost = LICENCE_PHRASES.filter((p) => !terms.includes(p));
  if (lost.length) return fail(`licence wording changed (missing "${lost.join('", "')}"); review before use`);
  try { robots = await readRobots(fetchText, ROBOTS_URL); } catch (e) { return fail(`robots.txt unreadable: ${e.message}`); } // only a 3xx/4xx answer (no file) means no rules
  if (!robotsAllows(robots, pathQuery(FEED_URL))) return fail('robots.txt disallows the feed path');
  try { raw = parseKml(await fetchText(FEED_URL)); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const drop = {}, seen = new Set(), cams = [];
  for (const r of raw) { const c = normalizeCita(r, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: TERMS_URL, raw: raw.length, dropped: drop, total: cams.length };
  if (cams.length < minUsable) return fail(`only ${cams.length} usable cameras (shape change?)`, report);
  return commitSource({ outDir, sourceId: 'cita-lu-cameras', sourceRow: CITA_SOURCE, cams, raw: raw.length, report, reportFile: 'import-report-citalu.json', log, label: 'citalu' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
