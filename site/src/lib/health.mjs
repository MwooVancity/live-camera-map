// Camera health block data (plan section 12). Pure functions plus a loader; no network.
// Beats Argos by: every camera shows its own checked status from our checker (a 200 HTML page counts as failed), and the
// block is hidden, never shown as current, when the last run is older than 24 h at build.
// ONE function (`cityHealth`, through `tally`) computes every count the block shows.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { countsBy } from '../../../ops/importers/lib/registry.mjs';

export const HEALTH_MAX_AGE_H = 24;
export const STATUSES = ['reachable', 'stale', 'unavailable', 'unknown'];
export const MEANING = {
  reachable: 'the official link answers with a picture (this does not say the picture is recent)',
  stale: 'the server says the file is old: its own last-modified time is more than 6 hours ago',
  unavailable: 'the official link does not answer, or answers with a web page or error instead of a picture',
  unknown: 'we have not checked it, or the check could not finish',
};
// The status words, defined once per page (near the top of the camera list) from MEANING. Never says a picture is fresh.
export const statusWords = () => STATUSES.map((s) => `${s[0].toUpperCase()}${s.slice(1)} means ${MEANING[s]}.`).join(' ');
// The one sentence about our link check, derived from cityHealth's result so it can never say "never run" beside real markers.
export const linkCheckText = ({ block, reason }) => (block ? `Link check by us: last run ${block.asof.slice(0, 16).replace('T', ' ')} UTC.`
  : reason === 'stale' ? 'Link check by us: the last run is more than 24 hours old, so no status is shown.' : 'Link check by us: not run yet.');


const healthFile = () => process.env.HEALTH_FILE || resolve(process.cwd(), '../data/health/health.json');

// Returns the parsed file or null (missing, unreadable, wrong shape, not a complete run).
export function loadHealth() {
  try {
    const f = healthFile();
    if (!existsSync(f)) return null;
    const h = JSON.parse(readFileSync(f, 'utf8'));
    return h && h.runOk === true && Number.isFinite(Date.parse(h.generatedAt)) && h.cameras && typeof h.cameras === 'object' ? h : null;
  } catch { return null; }
}

// Counts of statuses over a list of cameras. A camera with no record, or an unrecognised status, is unknown.
export function tally(cams, health) {
  const n = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const c of cams) n[statusOf(c.id, health)]++;
  return n;
}
export const statusOf = (id, health) => { const s = health.cameras[id] && health.cameras[id].status; return STATUSES.includes(s) ? s : 'unknown'; };

// null when there is no usable health (missing, invalid, or older than 24 h at build): the page then shows no counts.
// reason says which, so the page can be honest about it.
export function cityHealth(cams, health, now = new Date()) {
  if (!health) return { block: null, reason: 'missing' };
  const age = (new Date(now).getTime() - Date.parse(health.generatedAt)) / 3600000;
  if (age > HEALTH_MAX_AGE_H || age < -1) return { block: null, reason: 'stale' };
  const roads = Object.keys(countsBy(cams, 'road')).sort((a, b) => countsBy(cams, 'road')[b] - countsBy(cams, 'road')[a] || a.localeCompare(b))
    .map((road) => { const here = cams.filter((c) => c.road === road); return { road, n: here.length, counts: tally(here, health) }; });
  return { block: { asof: health.generatedAt, total: cams.length, counts: tally(cams, health), roads, statusOf: (id) => statusOf(id, health), record: (id) => health.cameras[id] || null }, reason: null };
}
