// Caltrans CWWP2 live-conditions importer: lane closures (lcs), chain controls (cc), message signs (cms), road weather (rwis).
// No key needed. Run on Mike's machine / the Actions cron: node ops/importers/caltrans-conditions.mjs [--feeds=lcs,cc]
// Writes data/conditions/ca-<feed>.json. URL pattern: data/d<UNPADDED>/<feed>/<feed>StatusD<PADDED>.json
// Beats Argos by: official Caltrans closure/chain/sign/weather records with their own as-of time and a per-district
// ok/fail report, so a page can say which districts are missing instead of showing a partial picture as complete.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { writeJsonAtomic, readJsonOrNull } from './lib/registry.mjs';
import { FEEDS, DISTRICTS, SOURCE_IDS, UA, feedUrl } from './lib/conditions.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_DIR = join(ROOT, 'data', 'conditions');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 2 tries. A non-JSON body (the CWWP error page is HTML) fails, an HTTP status other than 200 fails.
export async function fetchDistrict(feed, nn, tries = 2) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(feedUrl(feed, nn), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      const body = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      try { return JSON.parse(body); } catch (e) { throw new Error(`invalid JSON from source: ${e.message}`); }
    } catch (e) { err = e; if (i < tries - 1) await sleep(2000); }
  }
  throw err;
}

export const loadPerms = () => JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;

// fetcher(feed, nn) -> parsed JSON or throws. Returns { feed: { written, reason, report } }.
export async function run({ feeds = Object.keys(FEEDS), fetcher = fetchDistrict, outDir = OUT_DIR, now = new Date(), perms = loadPerms(), log = console.log, pauseMs = 300 } = {}) {
  const out = {};
  for (const feed of feeds) {
    const row = perms.find((s) => s.id === SOURCE_IDS[feed]);
    if (!isEnabled(row, now)) { log(`${feed}: NOT FETCHED: licence row ${SOURCE_IDS[feed]} is not enabled`); out[feed] = { written: false, reason: 'licence closed', report: null }; continue; }
    const perDistrict = {}, dropped = {}, ids = new Set(), items = [];
    for (const nn of DISTRICTS) {
      try {
        const j = await fetcher(feed, nn);
        if (!j || !Array.isArray(j.data)) throw new Error('no data array');
        let kept = 0;
        for (const raw of j.data) {
          const it = FEEDS[feed].parse(raw, nn, now, dropped);
          if (!it) continue;
          if (ids.has(it.id)) { dropped.dupId = (dropped.dupId || 0) + 1; continue; }
          ids.add(it.id); items.push(it); kept++;
        }
        perDistrict[nn] = { ok: true, raw: j.data.length, kept };
      } catch (e) { perDistrict[nn] = { ok: false, error: String(e.message || e) }; }
      log(`${feed} d${nn}: ${JSON.stringify(perDistrict[nn])}`);
      if (pauseMs) await sleep(pauseMs);
    }
    const failedDistricts = DISTRICTS.filter((nn) => !perDistrict[nn].ok);
    const file = join(outDir, `ca-${feed}.json`);
    const old = readJsonOrNull(file);
    let reason = null;
    const regressed = old && old.perDistrict ? failedDistricts.filter((nn) => old.perDistrict[nn] && old.perDistrict[nn].ok) : [];
    if (failedDistricts.length === DISTRICTS.length) reason = 'every district failed';
    else if (regressed.length) reason = `districts that worked last run failed now: ${regressed.join(',')}`;
    else if (old && Array.isArray(old.items) && old.items.length >= 20 && items.length < old.items.length * 0.5) reason = `count fell from ${old.items.length} to ${items.length}`;
    else if (items.length === 0 && !(old && old.items && old.items.length === 0)) reason = 'zero items'; // an empty first file is never written
    const report = { perDistrict, failedDistricts, dropped, count: items.length };
    if (reason) { log(`${feed}: NOT WRITTEN: ${reason}`); out[feed] = { written: false, reason, report }; continue; }
    writeJsonAtomic(file, { feed, sourceId: SOURCE_IDS[feed], generatedAt: new Date(now).toISOString(), timeNote: 'statusLocal/messageLocal are America/Los_Angeles local time; start/end/recordedAt are UTC', ...report, items });
    out[feed] = { written: true, reason: null, report };
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv.find((a) => a.startsWith('--feeds='));
  const r = await run({ feeds: arg ? arg.slice(8).split(',') : undefined });
  for (const [f, v] of Object.entries(r)) console.log(`${f}: ${v.written ? 'WROTE' : 'NOT WRITTEN (' + v.reason + ')'} ${v.report ? 'count=' + v.report.count + ' failed=[' + v.report.failedDistricts + '] dropped=' + JSON.stringify(v.report.dropped) : ''}`);
  process.exit(Object.values(r).every((v) => v.written) ? 0 : 1);
}
