// Shared steps for the world-source camera importers (Finland, Quebec; DriveBC predates this and keeps its own copy).
// No key, link-out only, generic User-Agent. Each importer rewrites ONLY its own sourceId rows (mergeSource).
import { join } from 'node:path';
import { validateCamera, writeJsonAtomic, readJsonOrNull, mergeSource, ownRows, upsertSources, registryUnreadable } from './registry.mjs';
import { UA } from './conditions.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 3 tries, 30 s timeout. A non-200 fails. `headers` are extra request headers (Accept etc.).
export async function fetchText(url, headers = {}, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(30000) });
      const body = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return body;
    } catch (e) { err = e; if (i < tries - 1) await sleep(2000 * (i + 1)); }
  }
  throw err;
}
export async function fetchJson(url, headers = {}) {
  const body = await fetchText(url, { Accept: 'application/json', ...headers });
  try { return JSON.parse(body); } catch (e) { throw new Error(`invalid JSON from source: ${e.message}`); }
}

// A camera id seen before keeps its first-seen time (rows from before this field existed use their lastSeen); a new id gets its own lastSeen.
export function stampFirstSeen(cams, old) {
  const was = new Map(old.map((o) => [o.id, o.firstSeen || o.lastSeen]));
  for (const c of cams) c.firstSeen = was.get(c.id) || c.lastSeen;
  return cams;
}

// Validate, guard, then write cameras.json (own rows only), sources.json and the report. Never overwrites good with incomplete.
// raw = how many source records were read; kept = cams.length after normalise + dedupe.
export function commitSource({ outDir, sourceId, sourceRow, cams, raw, report, reportFile, log = console.log, label = sourceId }) {
  const fail = (reason) => { log(`${label}: NOT WRITTEN: ${reason}`); return { written: false, reason, report }; };
  const camPath = join(outDir, 'cameras.json');
  const all0 = readJsonOrNull(camPath);
  const old = ownRows(all0, sourceId);
  stampFirstSeen(cams, old);
  const bad = cams.filter((c) => validateCamera(c).length);
  let reason = null;
  if (registryUnreadable(camPath)) reason = 'cameras.json exists but is not a readable list; fix it first (other sources would be lost)';
  else if (bad.length) reason = `${bad.length} cameras failed validation`;
  else if (cams.length === 0) reason = 'zero cameras';
  else if (cams.length < raw * 0.5) reason = `only ${cams.length} of ${raw} records kept (shape change?)`;
  else if (old.length && cams.length < old.length * 0.5) reason = `count fell from ${old.length} to ${cams.length}`;
  if (reason) return fail(reason);
  writeJsonAtomic(camPath, mergeSource(all0, sourceId, cams)); // every other source's rows are untouched
  writeJsonAtomic(join(outDir, 'sources.json'), upsertSources(readJsonOrNull(join(outDir, 'sources.json')), [sourceRow]));
  writeJsonAtomic(join(outDir, reportFile), report);
  return { written: true, reason: null, report };
}
