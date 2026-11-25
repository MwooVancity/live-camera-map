// Offline calculator CLI: node ops/observability/run.mjs [dataDir]   (default data/observability/iceland)
// Reads osm-sampled.json + osm-meta.json (saved by fetch-osm.mjs) and the camera registry, writes result.json. No network, no clock: same inputs, same bytes.
// Fails loudly and leaves the previous result.json untouched on any bad input.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeObservability, eligibleCameras, METHOD } from './observability.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = process.argv[2] || join(ROOT, 'data', 'observability', 'iceland');
const j = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
try {
  const osm = JSON.parse(readFileSync(join(dir, 'osm-sampled.json'), 'utf8'));
  if (!Array.isArray(osm.chains) || !osm.chains.length) throw new Error('osm-sampled.json has no road lines');
  const meta = JSON.parse(readFileSync(join(dir, 'osm-meta.json'), 'utf8'));
  const reg = j('data/camera-registry/cameras.json'), src = j('data/camera-registry/sources.json');
  let health = {}; try { health = j('data/health/health.json').cameras || {}; } catch { /* no health file: statuses unknown, eligibility does not use them */ }
  const all = (Array.isArray(reg) ? reg : reg.cameras).filter((c) => c.regionSlug === 'iceland');
  const { cameras, excluded, asOf } = eligibleCameras(all, Array.isArray(src) ? src : src.sources, health, j('data/source-permissions.json').sources);
  if (!cameras.length) throw new Error('no eligible cameras; refusing to publish a 0 percent result');
  const r = computeObservability(osm, cameras);
  const out = { country: 'Iceland', cameraAsOf: asOf, camerasInRegistry: all.length, camerasCounted: cameras.length, camerasExcluded: excluded, osm: { query: meta.query, queriedAt: meta.queriedAt, dataTimestamp: meta.osmDataTimestamp, sha256: meta.sha256, endpoint: meta.endpoint }, method: METHOD, ...r };
  const tmp = join(dir, 'result.json.tmp');
  writeFileSync(tmp, JSON.stringify(out, null, 1) + '\n'); renameSync(tmp, join(dir, 'result.json'));
  console.log(`Iceland: ${r.total.observed}/${r.total.points} points observed (${r.total.percent}%), ${r.total.km} km; cameras counted ${cameras.length} of ${all.length}`);
} catch (e) { console.error('observability FAILED, previous result kept: ' + e.message); process.exit(1); }
