// Turns a keyless GEV `vite build` into a static folder for the Cloudflare Pages project worldtrafficcameras-map (no server).
// Usage: node ops/deploy/build-static-map.mjs <gevDir> <outDir>   (reads <gevDir>/dist; never writes inside gevDir)
// LAUNCH=live removes noindex and the robots Disallow; any other value keeps the map hidden from search.
// /api/* does not exist on static hosting, so every server-proxied feed is unreachable; the one file we add is /api/cctv/sources.
import { readFileSync, writeFileSync, readdirSync, rmSync, cpSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative, sep, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildRows, PERMISSION_ROW } from '../exports/camera-exports.mjs';
import { GEV_PACKS } from '../importers/lib/gevpacks.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';
import { SNAPSHOTS, contentType, writeSnapshots } from './gev-snapshots.mjs';
import { MAP_LAYER_HOSTS } from '../../site/src/lib/privacy-facts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Same list as deny-built-restricted-data in data/proxy-allowlist.json (plus the camelCase loader chunks it also names).
const RESTRICTED_NAME = /(^|\/)(cable-geo|landing-point-geo|ucs_satellites|imaging_sensors|cctv_ground_heights)(-[A-Za-z0-9_-]{8})?\.(json|js|geojson)$|(^|\/)(ucsSatellites|imagingSensors)-[A-Za-z0-9_-]{8}\.(json|js)$|(^|\/)events(\/|$)|telegeography_submarine_cables/;
// Source files (inside the GEV checkout) whose CONTENT must not be anywhere in the output, under any name.
export const RESTRICTED_SOURCES = ['src/data/local_data/telegeography_submarine_cables', 'src/data/local_data/ucs_satellites', 'src/data/local_data/imaging_sensors', 'src/data/local_data/cctv_ground_heights', 'public/events'];

// A safety ceiling only. GEV's own server stops at 8,000 (CCTV_MAX_SOURCES_CEILING) but its client has no cap, and 8,000
// left whole cities (Seattle, Atlanta) off the static map (docs/human-testing-2026-11-26.md). The tests fail if any camera is dropped.
export const CAMERA_CAP = 40000;

export const FRAME_ANCESTORS = 'https://worldtrafficcameras.com https://www.worldtrafficcameras.com https://worldtrafficcameras.pages.dev';
// Browser-direct hosts the keyless globe may call. Allowlist = every other host (open-meteo, GBIF, OpenSnowMap, Google, news...) is blocked by the browser.
// Each has an allowed row in data/source-permissions.json (OpenStreetMap, the map=osm share links; Esri, OpenFreeMap, Re:Earth/Mapterhorn, NASA GIBS, USGS).
const DATA_HOSTS = 'https://tile.openstreetmap.org https://services.arcgisonline.com https://server.arcgisonline.com https://tiles.openfreemap.org https://terrain.reearth.land https://tiles.mapterhorn.com https://gibs.earthdata.nasa.gov https://basemap.nationalmap.gov';
const LAYER_HOSTS = MAP_LAYER_HOSTS.map((h) => `https://${h.host}`).join(' ');
// The full policy goes in a <meta> tag in every page (no length limit), so each Data Library host can be listed.
// The header keeps only what a meta tag cannot carry (frame-ancestors) plus the hard blocks; two policies only ever narrow each other.
export const HEADER_CSP = `frame-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors ${FRAME_ANCESTORS}`;
export const cspFor = (extra = []) => CSP.replace(/(img-src|connect-src) ([^;]*)/g, (m) => [m, ...extra].join(' ')).replace(/; frame-ancestors [^;]*/, '');
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${DATA_HOSTS} ${LAYER_HOSTS}`,
  `connect-src 'self' data: blob: ${DATA_HOSTS} ${LAYER_HOSTS}`,
  "media-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  `frame-ancestors ${FRAME_ANCESTORS}`,
].join('; ');

export function headersFile(launch) {
  return `/*
${launch === 'live' ? '' : '  X-Robots-Tag: noindex\n'}  Content-Security-Policy: ${HEADER_CSP}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/api/cctv/sources
  Content-Type: application/json; charset=utf-8
${SNAPSHOTS.map((s) => `
${s.route}
  Content-Type: ${contentType(s)}; charset=utf-8
`).join('')}
/api/cctv/health
  Content-Type: application/json; charset=utf-8
${Object.keys(STATIC_ANSWERS).map((r) => `\n${r}\n  Content-Type: application/json; charset=utf-8\n`).join('')}`;
}

// Registry rows that pass the CSV export licence gate, in the shape of GEV's GET /api/cctv/sources (gev/server/providers/cctv.js, '/sources').
// sourceKind starts with 'quebec-': GEV's switch (cctv/model.js isBrowserOverlayCamera) for "browser overlay camera": it then asks for NO frame
// (cards, hover, projection and the panel all skip it) and shows the credit plus a link to sourceUrl. With browserMediaUrl '' it plays no media.
// No url / snapshotUrl is ever written. GEV shows the link only for https, so http-only rows are left out.
export function cctvSources(rows, cap = CAMERA_CAP) {
  const lanes = new Map();
  for (const r of rows) if (String(r.official_url).startsWith('https://')) (lanes.get(r.source_id) || lanes.set(r.source_id, []).get(r.source_id)).push(r);
  const picked = [], queues = [...lanes.values()];
  for (let i = 0; picked.length < cap && queues.some((q) => i < q.length); i++) for (const q of queues) if (i < q.length && picked.length < cap) picked.push(q[i]); // round-robin, like GEV's cap.js: a cap thins every source, drops none
  return {
    trimmedPacks: [],
    sources: picked.map((r) => ({
      id: r.camera_id, pack: r.source_id, name: r.name, city: r.city || r.region, cityId: '', provider: r.source_name,
      lat: r.lat, lon: r.lon, feedType: 'image', sourceKind: 'quebec-link-only', sourceUrl: r.official_url, browserMediaUrl: '',
      headingConfidence: 'low', license: r.licence, credit: r.attribution, groundHeights: null,
    })),
  };
}

// The map shows what the directory already lists as links. The downloadable-list gate (buildRows) is stricter, so two groups
// are opened for the map only, and the downloads stay as they are: GEV's usable packs that have no permission row (owner rule
// 2026-11-26 "GEV SAYS USABLE = USE IT") and Georgia 511 while its owner-approval row (2026-11-25, link-only) stays enabled.
export function mapOnlySources(perms, now = new Date()) {
  const rowed = new Set(perms.map((p) => p.id));
  const open = new Set(GEV_PACKS.map((p) => p.sourceId).filter((id) => !rowed.has(PERMISSION_ROW[id] || id)));
  if (isEnabled(perms.find((p) => p.id === 'georgia-511-cameras'), now)) open.add('georgia-511');
  return open;
}

function registryRows(root = ROOT) {
  const j = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const c = j('data/camera-registry/cameras.json'), s = j('data/camera-registry/sources.json');
  const perms = j('data/source-permissions.json').sources;
  return buildRows(c.cameras || c, s.sources || s, {}, perms, new Date(), NaN, mapOnlySources(perms)).rows;
}

// Our name on the map (owner 2026-11-27). GEV is MIT: the upstream files stay untouched, the built copy is renamed, and
// GEV's licence and copyright notice ship as /LICENSE-gods-eye-view.txt.
export const BRAND = [
  [/"GOD'S EYE "(\),[^)]{0,60}?)"VIEW"/g, '"WORLD TRAFFIC "$1"CAMERAS"'],
  [/GOD'S EYE (<span class="title-accent">)VIEW/g, 'WORLD TRAFFIC $1CAMERAS'],
  [/God['’]s Eye View/g, 'World Traffic Cameras'],
  [/content="God's Eye"/g, 'content="World Traffic Cameras"'],
  [/NO PLACE LEFT BEHIND/g, 'EVERY OFFICIAL CAMERA, ONE MAP'],
  [/ENTER GOD MODE/g, 'EXPLORE THE MAP'],
  [/"short_name": "God's Eye"/g, '"short_name": "Traffic Cameras"'],
  [/Live spatial intelligence in the browser\./g, 'Official traffic cameras and live world data on one map.'],
  [/GEV Stories/g, 'Map Stories'],
  [/Talk to GEV/g, 'Talk to the map'],
];
export function rebrand(text) { return BRAND.reduce((s, [re, to]) => s.replace(re, to), text); }

// Data Library entries GEV offers without a server (browser-direct, not operator opt-in, not a pack), each opened only when its
// own licence row (named "(<entry id>, <host>)" in data/source-permissions.json) is enabled. Returns the hosts to allow.
export function libraryHosts(gevDir, perms, now = new Date()) {
  const dir = join(gevDir, 'src', 'library', 'entries');
  if (!existsSync(dir)) return { hosts: [], open: [], closed: [] };
  const hosts = new Set(), open = [], closed = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const e = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (e.source?.fetch !== 'browser-direct' || e.kind === 'pack' || e.licence?.operatorOptIn) continue;
    const row = perms.find((p) => (p.name || '').includes(`(${e.id},`));
    if (!isEnabled(row, now)) { closed.push(e.id); continue; }
    open.push(e.id);
    const { licence, attribution, links, provenance, ...rest } = e;
    for (const m of JSON.stringify(rest).matchAll(/https:\/\/([a-z0-9{}.-]+)/gi)) hosts.add('https://' + m[1].replace(/^\{[^}]*\}/, '*').toLowerCase());
  }
  return { hosts: [...hosts].filter((h) => !/[{}]/.test(h)).sort(), open, closed };
}
// Answers for GEV routes that only report "no server here", so the layer takes its own keyless path instead of failing on a 404 page.
export const STATIC_ANSWERS = {
  '/api/military-installations': { unavailable: true, code: 'OVERPASS_NOT_CONFIGURED' },
  '/api/geocode/status': { configured: false },
  '/api/overpass/status': { configured: false, unavailable: true, code: 'OVERPASS_NOT_CONFIGURED' },
  '/api/openai/hud-summary/status': { configured: false },
  '/api/mapillary/status': { configured: false },
};
// Street Level photos from Mapillary without GEV's tile proxy. The client token is public by design (gev/SECURITY.md:37).
// z11-13 coverage tiles go straight to Mapillary; z14 tiles carry a ~12 MB image layer the proxy would trim
// (gev/server/providers/mapillary/tiles.js), so they are answered empty instead of sent to phones untrimmed.
// ponytail: no z14 coverage lines until a server or a trimming Worker exists.
export const mapillaryRedirects = (token) => (token ? [11, 12, 13].map((z) => `/api/mapillary/tiles/coverage/${z}/:x/:y https://tiles.mapillary.com/maps/vtp/mly1_public/2/${z}/:x/:y?access_token=${encodeURIComponent(token)} 302`).join('\n') + '\n/api/mapillary/tiles/coverage/14/* /api/mapillary/empty 200\n' : '');
// Copy-link gives /share/<code>; the page reads the code itself, so every such path serves the map.
export const REDIRECTS = '/share/* / 200\n';

const walk = (d) => (statSync(d).isDirectory() ? readdirSync(d).flatMap((e) => walk(join(d, e))) : [d]);
const rel = (base, f) => relative(base, f).split(sep).join('/');
const sha = (b) => createHash('sha256').update(b).digest('hex');

// Distinctive values (long decimals, long strings) from a restricted text file; survives renaming and re-minifying.
function fingerprints(text) {
  const all = [...new Set(text.match(/-?\d{1,3}\.\d{5,}|"[^"\\\n]{24,120}"/g) || [])].map((t) => t.replace(/^"|"$/g, ''));
  const step = Math.max(1, Math.floor(all.length / 200));
  return all.filter((_, i) => i % step === 0).slice(0, 200);
}

export function restrictedProblems(outDir, gevDir) {
  const problems = [], marks = [], hashes = new Map();
  for (const s of RESTRICTED_SOURCES) {
    if (!existsSync(join(gevDir, s))) { problems.push(`restricted source folder missing in the GEV checkout, cannot check content: ${s}`); continue; }
    for (const f of walk(join(gevDir, s))) {
      if (/(README\.md|source\.json)$/i.test(f)) continue;
      const buf = readFileSync(f), name = rel(gevDir, f);
      hashes.set(sha(buf), name);
      if (/\.(json|geojson|geojsonl)$/.test(f)) marks.push([name, fingerprints(buf.toString('utf8'))]);
    }
  }
  const outFiles = walk(outDir);
  const texts = [];
  for (const f of outFiles) {
    const name = rel(outDir, f), buf = readFileSync(f);
    if (RESTRICTED_NAME.test(name)) problems.push(`restricted file in output: ${name}`);
    if (hashes.has(sha(buf))) problems.push(`restricted content in output: ${name} is a copy of ${hashes.get(sha(buf))}`);
    if (/\.(json|js|geojson|geojsonl|txt|html|czml)$/.test(f) && !name.startsWith('cesium/')) texts.push([name, buf.toString('utf8')]);
  }
  // 20 or more of one file's sampled values (or half, for small files) inside one output file = that data was copied in.
  for (const [src, list] of marks) {
    const need = Math.max(3, Math.min(20, Math.ceil(list.length / 2)));
    for (const [name, text] of texts) {
      let hit = 0;
      for (const m of list) if (text.includes(m) && ++hit >= need) { problems.push(`restricted content in output: ${name} contains data from ${src}`); break; }
    }
  }
  return problems;
}

export function buildStaticMap({ gevDir, outDir, launch = '', rows = registryRows() }) {
  const dist = join(gevDir, 'dist'), out = resolve(outDir);
  if (!existsSync(join(dist, 'index.html'))) throw new Error(`no GEV build at ${dist}`);
  if ((out + sep).startsWith(resolve(gevDir) + sep)) throw new Error('outDir must be outside the GEV checkout');
  rmSync(out, { recursive: true, force: true });
  cpSync(dist, out, { recursive: true });
  rmSync(join(out, 'events'), { recursive: true, force: true });
  for (const f of walk(out)) if (/\.(html|js|json|css|webmanifest)$/.test(f) && !rel(out, f).startsWith('cesium/')) { const s = readFileSync(f, 'utf8'), r = rebrand(s); if (r !== s) writeFileSync(f, r); }
  // Our own mark in place of GEV's logo (the site's favicon); GEV's PNG app icons stay until we make PNGs of our own.
  const mark = join(ROOT, 'site', 'public', 'favicon.svg');
  if (existsSync(mark)) for (const f of ['logo.svg', 'favicon.svg']) if (existsSync(join(out, f))) cpSync(mark, join(out, f));
  if (existsSync(join(gevDir, 'LICENSE'))) cpSync(join(gevDir, 'LICENSE'), join(out, 'LICENSE-gods-eye-view.txt'));
  for (const f of walk(out)) if (RESTRICTED_NAME.test(rel(out, f))) rmSync(f);
  const problems = restrictedProblems(out, gevDir);
  if (problems.length) throw new Error(`restricted data in the static map:\n${problems.join('\n')}`);
  const catalog = cctvSources(rows);
  if (!catalog.sources.length) throw new Error('no licensed cameras: refusing to publish an empty camera layer');
  mkdirSync(join(out, 'api', 'cctv'), { recursive: true });
  writeFileSync(join(out, 'api', 'cctv', 'sources'), JSON.stringify(catalog));
  writeFileSync(join(out, 'api', 'cctv', 'health'), '{"cameras":[]}'); // GEV polls this every 7 s; empty = status unknown
  const lib = libraryHosts(gevDir, JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources);
  // Our name is 21 letters against GEV's 14: a smaller title keeps it clear of the top-centre buttons (owner 2026-11-27).
  const meta = `<meta http-equiv="Content-Security-Policy" content="${cspFor(lib.hosts)}"><style>#title-bar h1{font-size:17px;letter-spacing:4px}</style>`;
  for (const f of walk(out).filter((x) => x.endsWith('.html'))) { const s = readFileSync(f, 'utf8'); writeFileSync(f, /<head[^>]*>/i.test(s) ? s.replace(/<head[^>]*>/i, (h) => h + meta) : meta + s); }
  const mly = String(process.env.MAPILLARY_CLIENT_TOKEN || '').trim();
  writeFileSync(join(out, '_redirects'), REDIRECTS + mapillaryRedirects(mly));
  for (const [route, body] of Object.entries(STATIC_ANSWERS)) { const p = join(out, ...route.split('/').filter(Boolean)); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(route === '/api/mapillary/status' ? { configured: Boolean(mly) } : body)); }
  if (mly) writeFileSync(join(out, 'api', 'mapillary', 'empty'), '');
  const headers = headersFile(launch);
  if (headers.split('\n').some((l) => l.length > 2000)) throw new Error('a _headers line is over Cloudflare Pages\' 2,000-character limit');
  const perms = JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
  const closed = MAP_LAYER_HOSTS.filter((h) => !isEnabled(perms.find((p) => p.id === h.permId), new Date())).map((h) => h.host);
  if (closed.length) throw new Error(`map layer hosts without an enabled licence row: ${closed.join(', ')}`);
  writeFileSync(join(out, '_headers'), headers);
  writeFileSync(join(out, 'robots.txt'), launch === 'live' ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n');
  // Without a 404.html Pages answers every unknown path (/api/x included) with index.html and 200.
  writeFileSync(join(out, '404.html'), '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Not found</title><p>Not found.</p>\n');
  const files = walk(out);
  const big = files.filter((f) => statSync(f).size > 25 * 1024 * 1024);
  if (big.length || files.length > 20000) throw new Error(`over the Cloudflare Pages limits: ${files.length} files, over 25 MB: ${big.join(', ')}`);
  return { files: files.length, cameras: catalog.sources.length, eligible: rows.length, sources: new Set(catalog.sources.map((s) => s.pack)).size };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [gevDir, outDir] = process.argv.slice(2);
  if (!gevDir || !outDir) { console.error('usage: node ops/deploy/build-static-map.mjs <gevDir> <outDir>'); process.exit(2); }
  const built = buildStaticMap({ gevDir: resolve(gevDir), outDir, launch: process.env.LAUNCH || '' });
  console.log(JSON.stringify({ ...built, snapshots: await writeSnapshots(resolve(gevDir), resolve(outDir)) }));
}
