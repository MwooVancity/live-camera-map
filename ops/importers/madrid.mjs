// Madrid importer (Ayuntamiento de Madrid open data, dataset 202088-0 "Tráfico. Cámaras", KML; dataset licence CC BY 4.0). No key needed.
// Run: node ops/importers/madrid.mjs
//   dataset page + terms page + legal notice (phrases checked every run) + robots.txt of both hosts + one KML request -> data/camera-registry/cameras.json (ONLY the madrid-camaras rows are rewritten) + import-report-madrid.json
// Link-out only: no camera picture is requested, stored or shown. The KML itself is served by informo.madrid.es (datos.madrid.es answers 301), so that one file is read from there; no picture path is requested.
// Beats Argos by: every camera the City lists, named as the City names it with its camera number, with the CC BY 4.0 licence, the commercial-reuse grant and the "not for pictures" warning re-read in code before every run.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseFeed, normalizeMadrid, robotsAllows, pageText, FEED_URL, KML_FINAL_URL, ROBOTS_URL, INFORMO_ROBOTS_URL, PAGE_URL, TERMS_URL, LEGAL_URL, DATASET_PHRASES, TERMS_PHRASES, LEGAL_PHRASES, ATTRIBUTION, CRAWL_DELAY_MS } from './lib/madrid.mjs';
import { fetchText as ft0, commitSource } from './lib/runner.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const U = 'unverified';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const MADRID_SOURCE = {
  id: 'madrid-camaras', name: 'Madrid traffic cameras (Ayuntamiento de Madrid open data, Tráfico. Cámaras)', status: 'active',
  api: { auth: 'none', rateLimit: 'datos.madrid.es robots.txt asks Crawl-delay 10: four requests per run 10 s apart (dataset page, terms, legal notice, KML); the health checker HEADs informo.madrid.es pictures one worker 250 ms apart (informo.madrid.es robots.txt answers 404, no rules)', docsUrl: PAGE_URL },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: ATTRIBUTION,
  license: 'Creative Commons Attribution 4.0 International (CC BY 4.0) per the dataset page; Ayuntamiento de Madrid general reuse conditions allow commercial and non-commercial reuse with credit; the legal notice says this reuse criterion does not apply to images, videos or other multimedia', licenseUrl: PAGE_URL, reviewedAt: '2026-11-24',
};

// fetchText(url) is injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ minUsable = 150, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log, pauseMs = CRAWL_DELAY_MS } = {}) {
  const fail = (reason, report = null) => { log(`madrid: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'madrid-camaras-cameras'), new Date(now))) return fail('licence closed');
  let robots = '', robots2 = '', body, xml;
  try { robots = await fetchText(ROBOTS_URL, {}, 1); } catch { robots = ''; } // no robots.txt (an error body) = no rules
  try { robots2 = await fetchText(INFORMO_ROBOTS_URL, {}, 1); } catch { robots2 = ''; }
  for (const u of [PAGE_URL, TERMS_URL, LEGAL_URL, FEED_URL]) if (!robotsAllows(robots, new URL(u).pathname)) return fail('robots.txt disallows a path we read');
  if (!robotsAllows(robots2, new URL(KML_FINAL_URL).pathname)) return fail('robots.txt of informo.madrid.es disallows the camera file');
  for (const [url, phrases, label] of [[PAGE_URL, DATASET_PHRASES, 'dataset page'], [TERMS_URL, TERMS_PHRASES, 'terms page'], [LEGAL_URL, LEGAL_PHRASES, 'legal notice']]) {
    let text;
    if (pauseMs) await sleep(pauseMs); // Crawl-delay 10
    try { text = pageText(await fetchText(url)); } catch (e) { return fail(`licence page unreadable (${label}): ${e.message}`); }
    const lost = phrases.filter((p) => !text.includes(p));
    if (lost.length) return fail(`licence wording changed on the ${label} (missing "${lost.join('", "')}"); review before use`);
  }
  if (pauseMs) await sleep(pauseMs);
  try { body = await fetchText(FEED_URL, { Accept: 'application/vnd.google-earth.kml+xml' }); xml = parseFeed(body); } catch (e) { return fail(`feed unreadable: ${e.message}`); }
  const drop = {}, seen = new Set(), cams = [];
  for (const p of xml) { const c = normalizeMadrid(p, now, drop, seen); if (c) cams.push(c); }
  const report = { generatedAt: now, source: FEED_URL, licenceUrl: PAGE_URL, raw: xml.length, dropped: drop, total: cams.length };
  if (cams.length < minUsable) return fail(`only ${cams.length} usable cameras (shape change?)`, report);
  return commitSource({ outDir, sourceId: 'madrid-camaras', sourceRow: MADRID_SOURCE, cams, raw: xml.length, report, reportFile: 'import-report-madrid.json', log, label: 'madrid' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = await runCameras();
  console.log(`cameras: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify(v.report) : ''}`);
  process.exit(v.written ? 0 : 1);
}
