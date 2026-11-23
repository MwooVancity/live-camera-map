// British Columbia importer (DriveBC): camera list + Open511 road events. No key needed.
// Run: node ops/importers/drivebc.mjs [--only=cameras|events]
//   cameras: BC Data Catalogue HighwayCams list (Open Government Licence - BC) -> data/camera-registry/cameras.json
//            (ONLY the drivebc rows are rewritten; Caltrans rows are kept as they were) + import-report-drivebc.json
//   events:  Open511 BC /events -> data/conditions/bc-events.json (a live conditions feed, like the Caltrans ones)
// Link-out only: no camera picture is fetched, stored or shown. Generic User-Agent, no contact detail.
// Beats Argos by: BC cameras and BC road events come from licensed official records with the licence checked in code
// before every run (the importer stops if the dataset's licence title changes), each with its own timestamp.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { dedupe, validateCamera, countsBy, writeJsonAtomic, readJsonOrNull, mergeSource, ownRows, upsertSources, registryUnreadable } from './lib/registry.mjs';
import { parseCsv, normalizeDriveBc, parseOpen511, BC_LICENCE_TITLE, CKAN_PACKAGE_URL, OPEN511_EVENTS_URL, OPEN511_PAGE } from './lib/drivebc.mjs';
import { UA, SOURCE_IDS } from './lib/conditions.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REG_DIR = join(ROOT, 'data', 'camera-registry');
export const COND_DIR = join(ROOT, 'data', 'conditions');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;

// Default fetchers: 3 tries, 30 s timeout. A non-200 fails. fetchJson also fails on a body that is not JSON (an HTML error page).
export async function fetchText(url, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      const body = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return body;
    } catch (e) { err = e; if (i < tries - 1) await sleep(2000 * (i + 1)); }
  }
  throw err;
}
export async function fetchJson(url) {
  const body = await fetchText(url);
  try { return JSON.parse(body); } catch (e) { throw new Error(`invalid JSON from source: ${e.message}`); }
}

const U = 'unverified';
export const BC_SOURCE = {
  id: 'drivebc', name: 'DriveBC HighwayCams (Government of British Columbia)', status: 'active',
  api: { auth: 'none', rateLimit: 'one request per run for the list; the health checker throttles per host', docsUrl: 'https://catalogue.data.gov.bc.ca/dataset/drivebc-highway-cams' },
  permissions: { metadata_commercial: U, image_display: U, image_caching: U, image_redistribution: U },
  attribution: 'Contains information licensed under the Open Government Licence - British Columbia',
  license: BC_LICENCE_TITLE, licenseUrl: 'https://www2.gov.bc.ca/gov/content?id=A519A56BC2BF44E4A008B33FCF527F61', reviewedAt: '2026-11-22',
};
const NEEDED = ['id', 'camName', 'latitude', 'longitude', 'links_imageURL', 'highway_number', 'orientation'];

// fetchJson(url) / fetchText(url) are injected so tests run offline. Returns { written, reason, report }.
export async function runCameras({ fetchJson: fj = fetchJson, fetchText: ft = fetchText, outDir = REG_DIR, now = new Date().toISOString(), perms = loadPerms(), log = console.log } = {}) {
  const fail = (reason, report = null) => { log(`cameras: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === 'drivebc-cameras'), new Date(now))) return fail('licence closed');
  let pkg, text;
  try { pkg = await fj(CKAN_PACKAGE_URL); } catch (e) { return fail(`dataset record unreadable: ${e.message}`); }
  const rec = pkg && pkg.success === true && pkg.result;
  if (!rec) return fail('dataset record has no result');
  if (rec.license_title !== BC_LICENCE_TITLE) return fail(`licence title changed to "${rec.license_title}"; review before use`);
  const res = (rec.resources || []).find((r) => /^csv$/i.test(r.format || '') && /^https:\/\/catalogue\.data\.gov\.bc\.ca\/.*\.csv$/.test(r.url || ''));
  if (!res) return fail('no CSV resource in the dataset record');
  try { text = await ft(res.url); } catch (e) { return fail(`CSV unreadable: ${e.message}`); }
  const { head, rows, badRows } = parseCsv(text);
  const missing = NEEDED.filter((k) => !head.includes(k));
  if (missing.length) return fail(`CSV shape changed, missing columns: ${missing.join(',')}`);
  const drop = {};
  const all = [];
  for (const r of rows) { const c = normalizeDriveBc(r, now, drop); if (c) all.push(c); }
  const cams = dedupe(all, drop);
  const bad = cams.filter((c) => validateCamera(c).length);
  const report = { generatedAt: now, source: res.url, datasetModified: rec.metadata_modified || null, licence: rec.license_title, raw: rows.length, badRows, dropped: drop, total: cams.length, byCity: countsBy(cams, 'city') };
  const camPath = join(outDir, 'cameras.json');
  const all0 = readJsonOrNull(camPath);
  const old = ownRows(all0, 'drivebc');
  let reason = null;
  if (registryUnreadable(camPath)) reason = 'cameras.json exists but is not a readable list; fix it first (other sources would be lost)';
  else if (bad.length) reason = `${bad.length} cameras failed validation`;
  else if (cams.length === 0) reason = 'zero cameras';
  else if (badRows > rows.length * 0.05) reason = `${badRows} of ${rows.length + badRows} CSV rows had the wrong number of fields`;
  else if (cams.length < (rows.length) * 0.5) reason = `only ${cams.length} of ${rows.length} rows kept`;
  else if (old.length && cams.length < old.length * 0.5) reason = `count fell from ${old.length} to ${cams.length}`;
  if (reason) return fail(reason, report);
  writeJsonAtomic(camPath, mergeSource(all0, 'drivebc', cams)); // Caltrans rows are untouched
  writeJsonAtomic(join(outDir, 'sources.json'), upsertSources(readJsonOrNull(join(outDir, 'sources.json')), [BC_SOURCE]));
  writeJsonAtomic(join(outDir, 'import-report-drivebc.json'), report);
  return { written: true, reason: null, report };
}

// One paged request chain to Open511 (limit 500; a full page asks for the next offset). Returns { written, reason, report }.
export async function runEvents({ fetchJson: fj = fetchJson, outDir = COND_DIR, now = new Date(), perms = loadPerms(), log = console.log, pauseMs = 500 } = {}) {
  const fail = (reason, report = null) => { log(`bc-events: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  if (!isEnabled(perms.find((s) => s.id === SOURCE_IDS['bc-events']), now)) return fail('licence closed');
  const events = [];
  try {
    for (let off = 0, page = 0; page < 6; page++, off += OPEN511_PAGE) {
      const j = await fj(`${OPEN511_EVENTS_URL}?format=json&status=ACTIVE&limit=${OPEN511_PAGE}&offset=${off}`);
      if (!j || !Array.isArray(j.events)) throw new Error('no events array');
      events.push(...j.events);
      if (j.events.length < OPEN511_PAGE) break;
      if (page === 5) throw new Error('more than 6 full pages: refusing a possibly cut-off list');
      if (pauseMs) await sleep(pauseMs);
    }
  } catch (e) { return fail(`events unreadable: ${String(e.message || e)}`); }
  const dropped = {}, ids = new Set(), items = [];
  for (const e of events) {
    const it = parseOpen511(e, now, dropped);
    if (!it) continue;
    if (ids.has(it.id)) { dropped.dupId = (dropped.dupId || 0) + 1; continue; }
    ids.add(it.id); items.push(it);
  }
  const file = join(outDir, 'bc-events.json');
  const old = readJsonOrNull(file);
  const report = { raw: events.length, count: items.length, dropped };
  let reason = null;
  if (events.length > 0 && items.length < events.length * 0.5) reason = `only ${items.length} of ${events.length} events kept (shape change?)`;
  else if (old && Array.isArray(old.items) && old.items.length >= 20 && items.length < old.items.length * 0.5) reason = `count fell from ${old.items.length} to ${items.length}`;
  else if (items.length === 0 && !(old && old.items && old.items.length === 0)) reason = 'zero items'; // an empty first file is never written
  if (reason) return fail(reason, report);
  writeJsonAtomic(file, { feed: 'bc-events', sourceId: SOURCE_IDS['bc-events'], generatedAt: new Date(now).toISOString(), timeNote: 'start/end/updated are UTC; position is the first point of the event line', ...report, items });
  return { written: true, reason: null, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
  const out = {};
  if (!only || only === 'cameras') out.cameras = await runCameras();
  if (!only || only === 'events') out.events = await runEvents();
  for (const [k, v] of Object.entries(out)) {
    console.log(`${k}: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? JSON.stringify({ ...v.report, byCity: undefined }) : ''}`);
    if (k === 'cameras' && v.report && v.report.byCity) console.log('top places:', JSON.stringify(Object.entries(v.report.byCity).sort((a, b) => b[1] - a[1]).slice(0, 25)));
  }
  process.exit(Object.values(out).every((v) => v.written) ? 0 : 1);
}
