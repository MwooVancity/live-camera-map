// Session 4: restricted-source exclusion proof, offline (no Docker, no GEV).
// Run: node --test tests/exclusion/exclusion.test.mjs
// It evaluates the REAL ops/proxy/nginx.allowlist.conf rules (regex lines of its maps, run as JS RegExp) and the JSON
// mirror data/proxy-allowlist.json against data/exclusion-map.json and data/source-permissions.json.
// A running-GEV proof of the same paths is .github/workflows/session4-exclusion.yml.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const real = {
  nginxText: read('ops/proxy/nginx.allowlist.conf'),
  allow: JSON.parse(read('data/proxy-allowlist.json')),
  map: JSON.parse(read('data/exclusion-map.json')),
  perms: JSON.parse(read('data/source-permissions.json')).sources,
  envText: read('ops/deploy/gev-exclusion.env'),
};
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
const isAllowedPerm = (s) => (s.commercialStatus === 'allowed_per_doc' || s.commercialStatus === 'allowed_per_owner') && s.enabled === true && s.mustNotShip !== true;

// ---- nginx model: the regex lines of each map block, exactly as nginx reads them ----
function mapLines(text, header) {
  const start = text.indexOf(header);
  if (start < 0) throw new Error('nginx map not found: ' + header);
  const end = text.indexOf('\n  }', start);
  const res = [];
  for (const l of text.slice(start, end).split('\n')) {
    const m = /^\s*"~(.*)"\s+1;\s*$/.exec(l);
    if (m) res.push(new RegExp(m[1]));
    // fail loud: a rule line this model cannot parse would be silently dropped (an unparsed ALLOW line = false pass)
    else if (/"/.test(l) && !/^\s*(#|map )/.test(l)) throw new Error(`nginx map ${header}: cannot parse rule line: ${l.trim()}`);
  }
  return res;
}
function nginxModel(text) {
  return {
    badPath: mapLines(text, 'map $request_uri $bad_path {'),
    deny: mapLines(text, 'map $request_uri $deny_asset {'),
    route: mapLines(text, 'map "$request_method $request_uri" $route_ok {'),
    hasDenyIf: /if \(\$deny_asset\)\s*\{\s*return 403/.test(text),
  };
}
const nginxDenied = (m, uri) => m.deny.some((re) => re.test(uri));
function nginxAllows(m, method, uri) {
  if (!uri.startsWith('/')) return false; // bad_uri
  if (m.badPath.some((re) => re.test(uri))) return false;
  if (m.hasDenyIf && nginxDenied(m, uri)) return false;
  return m.route.some((re) => re.test(`${method} ${uri}`));
}
// ---- JSON mirror (same logic as tests/security/methods.mjs) ----
const nonCanonical = (p) => !p.startsWith('/') || /^[^?]*(%|\/\/|;|\\|[^ -~]|\/\.\.?(\/|\?|$))/.test(p);
function jsonAllows(allow, method, p) {
  if (nonCanonical(p)) return false;
  if ((allow.deny || []).some((d) => new RegExp(d.pattern).test(p))) return false;
  return allow.routes.some((r) => new RegExp(r.pattern).test(p) && r.methods.includes(method));
}

// ---- the whole check; returns a list of violations (empty = proven) ----
export function checkExclusion({ nginxText, allow, map, perms, envText }) {
  const v = [];
  const m = nginxModel(nginxText);
  if (!m.hasDenyIf) v.push('nginx: $deny_asset is defined but no `if ($deny_asset) { return 403 ...}` uses it');

  // 1. every restricted source's reachable paths are denied for every method, by nginx and by the JSON mirror
  for (const g of map.groups) {
    for (const p of g.probePaths) {
      for (const method of METHODS) {
        if (nginxAllows(m, method, p)) v.push(`${g.id}: nginx ALLOWS ${method} ${p}`);
        if (jsonAllows(allow, method, p)) v.push(`${g.id}: allowlist JSON ALLOWS ${method} ${p}`);
      }
    }
  }
  // 1b. the prefixes the allowlist says are never allowed
  for (const pre of allow.neverAllowed) {
    for (const p of [pre, pre.endsWith('/') ? pre + 'x' : pre + '/x']) {
      for (const method of ['GET', 'HEAD']) {
        if (nginxAllows(m, method, p)) v.push(`neverAllowed: nginx ALLOWS ${method} ${p}`);
        if (jsonAllows(allow, method, p)) v.push(`neverAllowed: JSON ALLOWS ${method} ${p}`);
      }
    }
  }
  // 1c. every deny rule works in both places
  for (const d of allow.deny || []) {
    if (!nginxDenied(m, d.probe)) v.push(`deny ${d.id}: nginx $deny_asset does not match ${d.probe}`);
    if (jsonAllows(allow, 'GET', d.probe)) v.push(`deny ${d.id}: JSON mirror allows ${d.probe}`);
  }

  // 2. every non-allowed permission row belongs to a group; groups hold only non-allowed rows that exist
  const byId = new Map(perms.map((s) => [s.id, s]));
  const grouped = new Map();
  for (const g of map.groups) for (const id of g.permissionIds) grouped.set(id, g.id);
  for (const s of perms) if (!isAllowedPerm(s) && !grouped.has(s.id)) v.push(`unclassified restricted/unknown source (no exclusion group): ${s.id}`);
  for (const [id, gid] of grouped) {
    const s = byId.get(id);
    if (!s) v.push(`group ${gid}: unknown permission id ${id}`);
    else if (isAllowedPerm(s)) v.push(`group ${gid}: ${id} is allowed_per_doc and enabled, it does not belong in an exclusion group`);
  }
  for (const g of map.groups) if (!g.probePaths.length || !g.routes.length) v.push(`group ${g.id}: needs routes and probePaths`);

  // 3. every allowlisted route is justified by an enabled source or is static/boot-only
  const idsInPattern = (pattern) => { const mm = /\/data\/\(([^)]*)\)/.exec(pattern); return mm ? mm[1].split('|') : []; };
  const gapIds = new Map(map.knownGaps.map((gp) => [gp.id, gp]));
  for (const r of allow.routes) {
    const j = map.routeJustification[r.id];
    if (!j) { v.push(`route ${r.id}: allowlisted with no justification`); continue; }
    if (j.basis === 'static-boot') {
      if (!j.reason || j.reason.length < 10) v.push(`route ${r.id}: static-boot needs a reason`);
    } else if (j.basis === 'enabled-source') {
      if (!(j.sourceIds || j.libraryIds)) v.push(`route ${r.id}: enabled-source needs sourceIds or libraryIds`);
      for (const id of j.sourceIds || []) {
        const s = byId.get(id);
        if (!s) v.push(`route ${r.id}: justifying source ${id} not in source-permissions.json`);
        else if (!isAllowedPerm(s)) v.push(`route ${r.id}: justified by ${id} which is ${s.commercialStatus}/enabled=${s.enabled}/mustNotShip=${s.mustNotShip}`);
      }
      if (j.libraryIds) {
        const inPattern = new Set(idsInPattern(r.pattern));
        for (const id of j.libraryIds) if (!inPattern.has(id)) v.push(`route ${r.id}: library id ${id} justified but not in the route pattern`);
        for (const id of inPattern) if (!j.libraryIds.includes(id)) v.push(`route ${r.id}: pattern allows library id ${id} with no justification`);
        for (const id of j.libraryIds) if (map.libraryDisabledIds.includes(id)) v.push(`route ${r.id}: library id ${id} is on the disabled list`);
      }
    } else v.push(`route ${r.id}: unknown basis ${j.basis}`);
    if (j.knownGap && !(gapIds.get(j.knownGap)?.status === 'open')) v.push(`route ${r.id}: knownGap ${j.knownGap} is not an open, documented gap`);
  }
  for (const id of Object.keys(map.routeJustification)) if (!allow.routes.some((r) => r.id === id)) v.push(`justification for route ${id} that is not in the allowlist`);

  // 4. JSON and nginx agree: every allowlisted probe works in nginx for its methods
  for (const r of allow.routes) for (const method of r.methods) {
    if (!nginxAllows(m, method, r.probe)) v.push(`route ${r.id}: JSON says ${method} ${r.probe} is allowed, nginx denies it`);
    if (!jsonAllows(allow, method, r.probe)) v.push(`route ${r.id}: own probe ${method} ${r.probe} is not allowed by the JSON mirror`);
  }

  // 5. deployment env switches off what the proxy cannot see (browser-direct, opt-in packs)
  const env = Object.fromEntries(envText.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
  for (const k of ['CCTV_NYC_ENABLED', 'CCTV_FLORIDA_ENABLED', 'CCTV_HOUSTON_ENABLED', 'CCTV_LITHUANIA_ENABLED']) if (env[k] !== '0') v.push(`env: ${k} must be 0`);
  const disabled = new Set((env.GEV_LIBRARY_DISABLE || '').split(',').filter(Boolean));
  for (const id of map.libraryDisabledIds) if (!disabled.has(id)) v.push(`env: GEV_LIBRARY_DISABLE is missing ${id}`);
  for (const id of disabled) if (!map.libraryDisabledIds.includes(id)) v.push(`env: GEV_LIBRARY_DISABLE lists ${id}, not in the exclusion map`);
  return v;
}

const clone = (o) => JSON.parse(JSON.stringify(o));

test('real config: no restricted/unknown source is reachable, every route justified (0 violations)', () => {
  const v = checkExclusion(real);
  const open = real.map.knownGaps.filter((g) => g.status === 'open').map((g) => g.id);
  console.log(`open documented gaps (not violations, see docs/decisions/session4-findings.md): ${open.join(', ')}`);
  assert.deepEqual(v, []);
});

test('every restricted/unknown/mustNotShip permission row is classified into an exclusion group', () => {
  const bad = real.perms.filter((s) => !isAllowedPerm(s));
  assert.ok(bad.length >= 15, 'expected the 15+ restricted rows that owner approval never covers (2026-11-24: unknown rows were approved, restricted stay closed)');
  const grouped = new Set(real.map.groups.flatMap((g) => g.permissionIds));
  assert.deepEqual(bad.filter((s) => !grouped.has(s.id)).map((s) => s.id), []);
  for (const need of ['opensky-network', 'google-news-rss']) assert.ok(grouped.has(need), need);
});

test('named restricted sources are each denied on every route we know serves them', () => {
  const must = {
    opensky: ['/api/flights'], ghostmaps: ['/api/ghostmaps/catalog'], inaturalist: ['/api/inaturalist/grid'], 'google-news': ['/api/news/feed'],
    gvp: ['/api/library/data/gvp-holocene-volcanoes'], telegeography: ['/src/data/local_data/telegeography_submarine_cables/cable-geo.json'],
    'bhote-koshi': ['/events/bhote-koshi-2026/event.json'], 'nyc-dot': ['/api/cctv/frame/nyc-1', '/api/cctv/media/nyc-1', '/api/cctv/stream/nyc-1'],
  };
  const m = nginxModel(real.nginxText);
  for (const [gid, paths] of Object.entries(must)) {
    const g = real.map.groups.find((x) => x.id === gid);
    assert.ok(g, 'group ' + gid);
    for (const p of paths) {
      assert.ok(g.probePaths.includes(p), `${gid} probe list lacks ${p}`);
      for (const method of METHODS) assert.equal(nginxAllows(m, method, p), false, `${method} ${p}`);
    }
  }
});

test('session 3B regressions stay fixed: gvp library id, /events/, telegeography data files', () => {
  const m = nginxModel(real.nginxText);
  assert.equal(nginxAllows(m, 'GET', '/api/library/data/gvp-holocene-volcanoes'), false);
  assert.equal(nginxAllows(m, 'GET', '/events/bhote-koshi-2026/pre.webp'), false);
  assert.equal(nginxAllows(m, 'GET', '/src/data/local_data/telegeography_submarine_cables/cable-geo.json?import'), false);
  // the same prefix must not swallow the boot path
  assert.equal(nginxAllows(m, 'GET', '/src/main.js'), true);
  assert.equal(nginxAllows(m, 'GET', '/api/library/data/eia-power-plants'), true);
  assert.equal(nginxAllows(m, 'GET', '/api/library/data/eia-power-plants-evil'), false, 'id match must be anchored');
});

test('FIXTURE: a restricted route added to a copy of the nginx allowlist makes the check FAIL', () => {
  const hook = '"~^(GET|HEAD)[ ]/([?].*)?$" 1;';
  assert.ok(real.nginxText.includes(hook));
  const bad = real.nginxText.replace(hook, hook + '\n    "~^(GET|HEAD)[ ]/api/ghostmaps/catalog([?].*)?$" 1;');
  const v = checkExclusion({ ...real, nginxText: bad });
  assert.ok(v.some((x) => x.startsWith('ghostmaps: nginx ALLOWS GET /api/ghostmaps/catalog')), v.join('\n'));
});

test('FIXTURE: a restricted route added to a copy of the allowlist JSON makes the check FAIL', () => {
  const allow = clone(real.allow);
  allow.routes.push({ id: 'bad-gvp', pattern: '^/api/library/data/gvp-holocene-volcanoes(\\?.*)?$', probe: '/api/library/data/gvp-holocene-volcanoes', expect: [200], methods: ['GET'] });
  const v = checkExclusion({ ...real, allow });
  assert.ok(v.some((x) => x.includes('gvp') && x.includes('JSON ALLOWS')), v.join('\n'));
  assert.ok(v.some((x) => x.includes('bad-gvp') && x.includes('no justification')), v.join('\n'));
});

test('FIXTURE: widening the library regex back to any id makes the check FAIL', () => {
  const bad = real.nginxText.replace(/\/api\/library\(\/data\/\([^)]*\)\)\?/, '/api/library(/data/[A-Za-z0-9_-]+)?');
  assert.notEqual(bad, real.nginxText);
  const v = checkExclusion({ ...real, nginxText: bad });
  assert.ok(v.some((x) => x.includes('gvp: nginx ALLOWS GET /api/library/data/gvp-holocene-volcanoes')), v.join('\n'));
});

test('FIXTURE: dropping the telegeography deny line from nginx makes the check FAIL', () => {
  const bad = real.nginxText.replace(/\n\s*"~\^\/src\/data\/local_data\/telegeography_submarine_cables\/" 1;/, '');
  assert.notEqual(bad, real.nginxText);
  const v = checkExclusion({ ...real, nginxText: bad });
  assert.ok(v.some((x) => x.startsWith('telegeography: nginx ALLOWS GET')), v.join('\n'));
});

test('FIXTURE: a new restricted permission row with no exclusion group makes the check FAIL', () => {
  const perms = clone(real.perms);
  perms.push({ id: 'new-restricted-source', name: 'x', section: 'Live sources', commercialStatus: 'restricted', mustNotShip: false, enabled: false });
  const v = checkExclusion({ ...real, perms });
  assert.ok(v.some((x) => x.includes('unclassified') && x.includes('new-restricted-source')), v.join('\n'));
});

test('FIXTURE: justifying a route with a restricted source makes the check FAIL', () => {
  const map = clone(real.map);
  map.routeJustification.weather.sourceIds.push('opensky-network');
  const v = checkExclusion({ ...real, map });
  assert.ok(v.some((x) => x.includes('route weather') && x.includes('opensky-network')), v.join('\n'));
});

test('FIXTURE: an allow rule line the model cannot parse makes the check THROW (never a silent pass)', () => {
  const hook = '"~^(GET|HEAD)[ ]/([?].*)?$" 1;';
  const bad = real.nginxText.replace(hook, hook + '\n    "~^(GET|HEAD)[ ]/api/ghostmaps/catalog([?].*)?$"   1 ;');
  assert.throws(() => checkExclusion({ ...real, nginxText: bad }), /cannot parse rule line/);
});

test('FIXTURE: an opt-in camera pack left on in the deploy env makes the check FAIL', () => {
  const envText = real.envText.replace('CCTV_NYC_ENABLED=0', 'CCTV_NYC_ENABLED=1');
  const v = checkExclusion({ ...real, envText });
  assert.ok(v.some((x) => x.includes('CCTV_NYC_ENABLED')), v.join('\n'));
});
