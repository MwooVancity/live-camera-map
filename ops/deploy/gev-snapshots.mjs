// Layers GEV normally serves from its own server: we run GEV's UNCHANGED handler at build time and save its answer as a static file.
// The production workflow rebuilds every 3 hours; the answer carries its own fetchedAt time. A failed, stale or unavailable answer is
// never written: that layer then says it is unavailable, and the rest of the map still deploys.
// Beats Argos by: the layer's own official agency data on a free map with no sign-in.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { isEnabled } from '../../tests/licensing/gate.mjs';

export const SNAPSHOTS = [
  { route: '/api/cyclones', file: 'cyclones.js', factory: 'cycloneProxy', permId: 'noaa-nhc-cphc-advisories-www-nhc-noaa-gov-currentstorms-json-the-mapservices-wea' },
  { route: '/api/fire-perimeters', file: 'firePerimeters.js', factory: 'firePerimetersProxy', permId: 'nifc-wfigs-wildland-fire-interagency-geospatial-services-arcgis-feature-service' },
];
export const MAX_FILE_BYTES = 24 * 1024 * 1024; // Cloudflare Pages refuses files over 25 MB

const permissions = () => JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'source-permissions.json'), 'utf8')).sources;

// Calls the handler GEV registers for `route` with a plain GET and returns { status, body }.
export async function callHandler(plugin, route) {
  let handler;
  plugin.configurePreviewServer({ middlewares: { use: (path, fn) => { if (path === route) handler = fn; } } });
  if (!handler) throw new Error(`no handler for ${route}`);
  return new Promise((resolve, reject) => {
    let status = 0;
    const res = { destroyed: false, once() {}, removeListener() {}, setHeader() {}, writeHead(s) { status = s; }, end(body) { resolve({ status, body: String(body) }); } };
    Promise.resolve(handler({ method: 'GET', url: '/', headers: {}, socket: { remoteAddress: '127.0.0.1' } }, res)).catch(reject);
  });
}

export function problemWith({ status, body }) {
  if (status !== 200) return `status ${status}`;
  if (Buffer.byteLength(body) > MAX_FILE_BYTES) return 'too large for the host';
  let j; try { j = JSON.parse(body); } catch { return 'not JSON'; }
  if (j.stale === true || j.unavailable === true || j.error) return 'stale, unavailable or an error';
  return '';
}

export async function writeSnapshots(gevDir, outDir, { load, rows = permissions(), now = new Date() } = {}) {
  const written = [], skipped = [];
  for (const s of SNAPSHOTS) {
    try {
      if (!isEnabled(rows.find((r) => r.id === s.permId), now)) throw new Error(`licence row ${s.permId} is not enabled`);
      const mod = load ? await load(s) : await import(pathToFileURL(join(gevDir, 'server', 'providers', s.file)).href);
      const answer = await callHandler(mod[s.factory](), s.route);
      const problem = problemWith(answer);
      if (problem) throw new Error(problem);
      const target = join(outDir, ...s.route.split('/').filter(Boolean));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, answer.body);
      written.push(s.route);
    } catch (e) { skipped.push(`${s.route}: ${e.message}`); }
  }
  return { written, skipped };
}
