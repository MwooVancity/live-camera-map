// Layers GEV normally serves from its own server: we run GEV's UNCHANGED handler at build time and save its answer as a static file.
// The production workflow rebuilds every 3 hours; the answer carries its own fetchedAt time. A failed, stale or unavailable answer is
// never written: that layer then says it is unavailable, and the rest of the map still deploys.
// Beats Argos by: the layer's own official agency data on a free map with no sign-in.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { isEnabled } from '../../tests/licensing/gate.mjs';

function celestrak(mount, group) {
  return { route: `${mount}/${group}`, mount, path: `/${group}`, text: true, file: 'space/celestrak.js', factory: 'celestrakProxy', permId: 'celestrak' };
}
export const SNAPSHOTS = [
  { route: '/api/cyclones', file: 'cyclones.js', factory: 'cycloneProxy', permId: 'noaa-nhc-cphc-advisories-www-nhc-noaa-gov-currentstorms-json-the-mapservices-wea' },
  { route: '/api/fire-perimeters', file: 'firePerimeters.js', factory: 'firePerimetersProxy', permId: 'nifc-wfigs-wildland-fire-interagency-geospatial-services-arcgis-feature-service' },
  { route: '/api/drone-airspace', file: 'droneAirspace.js', factory: 'droneAirspaceProxy', permId: 'faa-special-use-airspace-services6-arcgis-com-featureserver-special-use-airspace' },
  { route: '/api/shipwrecks', file: 'shipwrecks.js', factory: 'shipwrecksProxy', permId: ['emodnet-human-activities-ship-wrecks-ows-emodnet-humanactivities-eu-wfs-layer-em', 'wikidata-shipwrecks-query-wikidata-org-sparql'] },
  { route: '/api/acartia/sightings', mount: '/api/acartia', path: '/sightings', file: 'acartia.js', factory: 'acartiaProxy', permId: 'acartia-acartia-io-api-v1-sightings-current' },
  { route: '/api/launches', file: 'space/launch-library.js', factory: 'rocketLaunchesProxy', permId: 'the-space-devs-launch-library-2-v2-3' },
  // CelesTrak asks for no more than one download every 2 hours; the build runs every 3. Plain text, one file per group GEV asks for.
  ...['stations', 'visual', 'gps-ops', 'glo-ops', 'galileo', 'geo', 'resource', 'weather', 'planet', 'sar', 'science', 'starlink', 'active'].map((g) => celestrak('/api/celestrak', g)),
  ...['stations', 'visual', 'gps-ops', 'glo-ops', 'galileo', 'geo', 'resource', 'weather', 'planet', 'sar', 'science'].map((g) => celestrak('/api/celestrak-satcat', g)),
];
export const contentType = (s) => (s.text ? 'text/plain' : 'application/json');
// CelesTrak asks for one download per 2 hours: runs other than the 3-hour schedule copy the live file instead.
const LIVE_MAP = 'https://worldtrafficcameras-map.pages.dev';
export const MAX_FILE_BYTES = 24 * 1024 * 1024; // Cloudflare Pages refuses files over 25 MB

const permissions = () => JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'source-permissions.json'), 'utf8')).sources;

// Calls the handler GEV registers for `route` with a plain GET and returns { status, body }.
export async function callHandler(plugin, route, path = '/') {
  let handler;
  plugin.configurePreviewServer({ middlewares: { use: (path, fn) => { if (path === route) handler = fn; } } });
  if (!handler) throw new Error(`no handler for ${route}`);
  return new Promise((resolve, reject) => {
    let status = 0, headers = {};
    const res = { destroyed: false, headersSent: false, once() {}, removeListener() {}, setHeader() {}, writeHead(s, h = {}) { status = s; headers = h; }, end(body) { resolve({ status, headers, body: String(body) }); } };
    Promise.resolve(handler({ method: 'GET', url: path, headers: {}, socket: { remoteAddress: '127.0.0.1' } }, res)).catch(reject);
  });
}

export function problemWith({ status, body, headers = {} }, text = false) {
  if (status !== 200) return `status ${status}`;
  if (Object.values(headers).includes('STALE-ERROR')) return 'an old cached copy';
  if (!body) return 'empty';
  if (Buffer.byteLength(body) > MAX_FILE_BYTES) return 'too large for the host';
  if (text) return '';
  let j; try { j = JSON.parse(body); } catch { return 'not JSON'; }
  if (j.stale === true || j.unavailable === true || j.error) return 'stale, unavailable or an error';
  return '';
}

export async function writeSnapshots(gevDir, outDir, { load, rows = permissions(), now = new Date() } = {}) {
  const written = [], skipped = [];
  const plugins = new Map(); // one plugin per factory: GEV's own cooldown then covers all its routes
  for (const s of SNAPSHOTS) {
    try {
      for (const id of [s.permId].flat()) if (!isEnabled(rows.find((r) => r.id === id), now)) throw new Error(`licence row ${id} is not enabled`);
      const mod = load ? await load(s) : await import(pathToFileURL(join(gevDir, 'server', 'providers', s.file)).href);
      if (!plugins.has(s.factory)) plugins.set(s.factory, mod[s.factory]());
      const reuse = s.text && process.env.GITHUB_EVENT_NAME && process.env.GITHUB_EVENT_NAME !== 'schedule';
      const answer = reuse
        ? await fetch(LIVE_MAP + s.route, { signal: AbortSignal.timeout(30000) }).then(async (r) => ({ status: r.status, body: await r.text(), headers: {} }))
        : await Promise.race([callHandler(plugins.get(s.factory), s.mount || s.route, s.path), new Promise((_, no) => setTimeout(() => no(new Error('no answer in 60 s')), 60000).unref())]);
      const problem = problemWith(answer, s.text);
      if (problem) throw new Error(problem);
      const target = join(outDir, ...s.route.split('/').filter(Boolean));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, answer.body);
      written.push(s.route);
    } catch (e) { skipped.push(`${s.route}: ${e.message}`); }
  }
  return { written, skipped };
}
