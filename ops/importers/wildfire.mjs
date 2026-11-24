// NIFC WFIGS current wildfire perimeters (US public domain row in data/source-permissions.json), kept only near our California city and road pages.
// Run: node ops/importers/wildfire.mjs      Writes data/conditions/wildfire.json (one request per 2000 perimeters; about 50 to a few hundred exist).
// A run that errors, returns HTML, an empty list or under half the previous count refuses and keeps the old file.
// Beats Argos by: the city and road page show the fires near that place with distance from the nearest edge of the perimeter, acres and
// percent contained, and hide the block when the file is older than 6 hours.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { writeJsonAtomic, readJsonOrNull } from './lib/registry.mjs';
import { UA } from './lib/conditions.mjs';
import { pageUrl, buildDoc, WILDFIRE_SOURCE_ID } from './lib/wildfire.mjs';
import { centroid } from './nws.mjs';
import { curatedCities, curatedRoads } from '../../site/src/lib/pages.mjs';
import { roadSlug } from './lib/registry.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_FILE = join(ROOT, 'data', 'conditions', 'wildfire.json');
const MAX_PAGES = 5;

export async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/geo+json, application/json' }, signal: AbortSignal.timeout(60000) });
  const body = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  try { return JSON.parse(body); } catch (e) { throw new Error(`invalid JSON (HTML or cut-off body?): ${e.message}`); }
}

// Follows exceededTransferLimit with offset pages; more than MAX_PAGES means a partial list, so it throws.
export async function fetchAll(fetcher = fetchJson) {
  let all = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const part = await fetcher(pageUrl(all ? all.features.length : 0));
    if (!part || !Array.isArray(part.features)) return part; // buildDoc names what is wrong with it
    all = all ? { ...all, features: all.features.concat(part.features) } : part;
    const more = part.exceededTransferLimit === true || (part.properties && part.properties.exceededTransferLimit === true);
    if (!more) return all;
    if (!part.features.length) break;
  }
  throw new Error('still more pages after the page cap: partial list refused');
}

// Page places: California city centres plus one point per 0.1 degree cell of every camera on a road page (the road block measures from its cameras).
export function placesOf(cams) {
  const ca = cams.filter((c) => c.regionSlug === 'california');
  const pts = curatedCities(ca).map((city) => centroid(ca, city)).filter(Boolean).map((c) => ({ lat: c.lat, lon: c.lon }));
  const slugs = new Set(curatedRoads(ca).map(roadSlug)), seen = new Set();
  for (const c of ca) {
    if (!slugs.has(roadSlug(c.road))) continue;
    const k = `${Math.round(c.lat * 10)},${Math.round(c.lon * 10)}`;
    if (!seen.has(k)) { seen.add(k); pts.push({ lat: c.lat, lon: c.lon }); }
  }
  return pts;
}

export async function run({ fetcher = fetchJson, outFile = OUT_FILE, now = new Date(), cams, perms, log = console.log } = {}) {
  cams ??= JSON.parse(readFileSync(join(ROOT, 'data', 'camera-registry', 'cameras.json'), 'utf8'));
  perms ??= JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
  if (!isEnabled(perms.find((s) => s.id === WILDFIRE_SOURCE_ID), now)) { log('wildfire: NOT FETCHED: licence row is not enabled'); return { written: false, reason: 'licence closed' }; }
  const prev = readJsonOrNull(outFile);
  try {
    const doc = buildDoc({ collection: await fetchAll(fetcher), places: placesOf(cams), prev, now });
    writeJsonAtomic(outFile, doc); // only after every page and every check passed
    const r = { written: true, reason: null, fetched: doc.fetchedCount, kept: doc.items.length, drop: doc.drop };
    log(`wildfire: ${JSON.stringify(r)}`);
    return r;
  } catch (e) {
    const r = { written: false, reason: String(e.message || e), keptOld: Boolean(prev) };
    log(`wildfire: ${JSON.stringify(r)}`);
    return r;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await run();
  process.exit(r.written ? 0 : 1);
}
