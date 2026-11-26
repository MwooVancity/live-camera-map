// External vite config for the static map build: GEV's own config, plus one thing. Run with cwd = the GEV checkout:
//   npx vite build --config <this file>      (GEV_DIR = absolute path of that checkout)
// GEV compiles the Bhote Koshi coordinates (CC BY-NC 4.0, mustNotShip: gev/public/events/bhote-koshi-2026/README.md) into the main
// bundle, so deleting events/ is not enough. Those two data modules are swapped for empty stand-ins at load time; no file in gev/ changes.
// build-static-map.mjs fails the deploy if the data is still in the output (also if GEV renames these modules).
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const STUBS = {
  // Two dummy points at 0,0: callers read route[0], route.at(-1) and route[i + 1].
  '/src/data/bhoteKoshiFloodPath.js': 'export const BHOTE_KOSHI_FLOOD_PATH = Object.freeze([Object.freeze([0, 0]), Object.freeze([0, 0.001])]);\n',
  '/src/data/bhoteKoshiIncidentPlaces.js': 'export const INCIDENT_OVERVIEW_PLACES = Object.freeze([]);\nexport const INCIDENT_OVERVIEW_HOLD_SEC = 11;\n',
};

export const stubRestricted = () => ({
  name: 'wtc-stub-restricted-data',
  enforce: 'pre',
  load(id) {
    const path = id.split('?')[0].replace(/\\/g, '/');
    const hit = Object.keys(STUBS).find((k) => path.endsWith(k));
    return hit ? STUBS[hit] : null;
  },
});

export default async (env) => {
  const gev = process.env.GEV_DIR || process.cwd();
  const base = (await import(pathToFileURL(join(gev, 'server/standalone/vite.config.js')).href)).default;
  const config = await (typeof base === 'function' ? base(env) : base);
  return { ...config, plugins: [stubRestricted(), ...(config.plugins || [])] };
};
