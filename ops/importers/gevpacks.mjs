// One importer for every GEV camera pack our registry lacked (table and rules: lib/gevpacks.mjs).
// Run: node ops/importers/gevpacks.mjs        (needs the gev/ clone beside ops/, read-only; GEV_DIR overrides the place)
//   GEV's own catalog loaders (per-pack caps raised by their CCTV_<PACK>_MAX_SOURCES variables) + ODOT's current TripCheck list for Oregon
//   -> data/camera-registry/cameras.json (ONLY the rows of each pack's own sourceId) + import-report-gevpacks.json
// Each pack stands alone: a closed licence row, a failed or short download, or a list under half the last good one leaves that pack's old rows as they were.
// No key is read or sent. No picture or stream is requested. GEV's own caps that cannot be raised: WSDOT 1200, Tarktee 300, Taiwan 2000.
// Beats Argos by: every camera named as its operator's list names it, with its own coordinates, one official link and a printed credit, and an honest "status not checked" line.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { GEV_PACKS, normalizeGev, urlKey } from './lib/gevpacks.mjs';
import { parseFeed, normalizeOdot, robotsAllows, FEED_URL, ROBOTS_URL } from './lib/odot-tripcheck.mjs';
import { fetchText as ft0, commitSource, readRobots, pathQuery } from './lib/runner.mjs';
import { readJsonOrNull, writeJsonAtomic } from './lib/registry.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
const CAPPED = ['TALLINN', 'TARKTEE', 'DELDOT', 'KINGCOUNTY', 'TXDOT', 'WSDOT', 'VEGVESEN', 'CATALONIA', 'QUEBEC'];

// The real loader: GEV's own module for that pack. Returns raw catalog rows (GEV loaders answer [] when their download fails).
export async function gevLoad(loader, gevDir = process.env.GEV_DIR || join(ROOT, 'gev')) {
  for (const k of CAPPED) process.env[`CCTV_${k}_MAX_SOURCES`] ??= '100000';
  const file = { loadQuebecSources: 'quebec.js', loadWorldCameraSources: 'worldCameras.js' }[loader] || 'sources.js';
  const mod = await import(pathToFileURL(join(gevDir, 'server', 'providers', 'cctv', file)).href);
  return mod[loader]({ sourceRoot: gevDir });
}

// Oregon from ODOT's current list instead of GEV's older bundled copy.
async function odotRows(fetchText) {
  const robots = await readRobots(fetchText, ROBOTS_URL);
  if (!robotsAllows(robots, pathQuery(FEED_URL))) throw new Error('robots.txt disallows the feed path');
  return parseFeed(await fetchText(FEED_URL)); // no Accept header: the host answers 406 to "Accept: application/json" (2026-11-26)
}

const sourceRow = (p, permission) => ({
  id: p.sourceId, name: `${p.agency}: ${p.what}`, status: 'active',
  api: { auth: 'none', rateLimit: 'one catalog read per run, at most every 3 h (the run-all schedule); picture links are not checked by the health checker', docsUrl: p.licenseUrl },
  permissions: { metadata_commercial: 'unverified', image_display: 'unverified', image_caching: 'unverified', image_redistribution: 'unverified' },
  attribution: p.attribution, license: permission.licence, licenseUrl: p.licenseUrl, reviewedAt: permission.reviewedAt,
});

// load(loader) and fetchText(url) are injected so tests run offline. Returns { results: { sourceId: { written, reason, report } } }.
export async function runCameras({ packs = GEV_PACKS, load = gevLoad, fetchText = ft0, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const results = {}, cache = new Map();
  const once = (loader) => { if (!cache.has(loader)) cache.set(loader, Promise.resolve().then(() => load(loader))); return cache.get(loader); };
  for (const p of packs) { // one at a time: each commit reads the registry the one before it wrote
    const fail = (reason, report = null) => { log(`gevpacks ${p.sourceId}: NOT WRITTEN: ${reason}`); results[p.sourceId] = { written: false, reason, report }; };
    const perm = perms.find((s) => s.id === p.permId);
    if (!isEnabled(perm, new Date(now))) { fail('licence closed'); continue; }
    let rows;
    try { rows = p.loader === 'odot' ? await odotRows(fetchText) : await once(p.loader); } catch (e) { fail(`list unreadable: ${e.message}`); continue; }
    const offered = rows.available ?? rows.length;
    rows = p.sourceKind ? rows.filter((r) => r && r.sourceKind === p.sourceKind) : [...rows];
    const registry = readJsonOrNull(join(outDir, 'cameras.json'));
    // links another source already lists; the fixed page links (p.link) are shared by design and not compared
    const seen = new Set((Array.isArray(registry) ? registry : []).filter((c) => c && c.sourceId !== p.sourceId).map((c) => urlKey(c.officialUrl)));
    const taken = new Set(seen), drop = {}, cams = [];
    for (const r of rows) {
      let c = p.loader === 'odot' ? normalizeOdot(r, now, drop, seen) : normalizeGev(p, r, now, drop, seen);
      if (c && p.loader === 'odot' && taken.has(urlKey(c.officialUrl))) { drop.dupUrl = (drop.dupUrl || 0) + 1; c = null; }
      if (c) cams.push(c);
    }
    const report = { generatedAt: now, gevCount: rows.length, gevOffered: p.sourceKind ? rows.length : offered, dropped: drop, total: cams.length };
    if (cams.length < p.min) { fail(`only ${cams.length} usable cameras, need ${p.min} (download failed or shape changed?)`, report); continue; }
    results[p.sourceId] = commitSource({ outDir, sourceId: p.sourceId, sourceRow: sourceRow(p, perm), cams, raw: rows.length, report, reportFile: `import-report-${p.sourceId}.json`, log, label: `gevpacks ${p.sourceId}` });
  }
  return { results };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outDir = process.argv[2] || REG_DIR;
  const { results } = await runCameras({ outDir });
  const summary = Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.written ? v.report : { written: false, reason: v.reason, ...(v.report || {}) }]));
  console.log(JSON.stringify(summary, null, 1));
  writeJsonAtomic(join(outDir, 'import-report-gevpacks.json'), summary);
  // fail the run when nothing was written, or a pack that already has rows could not be refreshed
  const have = new Set((readJsonOrNull(join(outDir, 'cameras.json')) || []).map((c) => c.sourceId));
  const bad = !Object.values(results).some((v) => v.written) || Object.entries(results).some(([k, v]) => !v.written && have.has(k));
  process.exit(bad ? 1 : 0);
}
