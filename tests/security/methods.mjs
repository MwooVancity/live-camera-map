// Route/method allowlist + bypass matrix. Usage: node tests/security/methods.mjs <baseUrl> <hostHeader>
// PASS rule: a request the allowlist denies must be blocked BY THE PROXY (403/404 + X-Proxy-Deny header or nginx body),
// never answered by GEV. A request the allowlist allows must reach GEV (not a proxy denial) and, for the probe, give an expected status.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [base, hostHeader] = process.argv.slice(2);
if (!base || !hostHeader) { console.error('usage: node tests/security/methods.mjs <baseUrl> <hostHeader>'); process.exit(2); }
const u = new URL(base);
const allow = JSON.parse(readFileSync(resolve(root, 'data/proxy-allowlist.json'), 'utf8'));
const inv = JSON.parse(readFileSync(resolve(root, 'data/route-inventory.json'), 'utf8')).routes;
const routes = allow.routes.map((r) => ({ ...r, re: new RegExp(r.pattern) }));

// Raw request: path is sent exactly as given (no URL parsing, so %2e, //, ;, .. reach the proxy untouched).
function req(method, path) {
  return new Promise((res) => {
    const r = http.request({ host: u.hostname, port: u.port || 80, method, path, headers: { Host: hostHeader }, timeout: 15000 }, (resp) => {
      let body = '';
      resp.on('data', (c) => { if (body.length < 4000) body += c; });
      resp.on('end', () => res({ status: resp.statusCode, headers: resp.headers, body }));
    });
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.on('error', (e) => res({ status: 0, headers: {}, body: String(e.message) }));
    r.end();
  });
}

// What the allowlist SAYS (independent JS mirror of the nginx rules).
const nonCanonical = (p) => !p.startsWith('/') || /^[^?]*(%|\/\/|;|\\|[^ -~]|\/\.\.?(\/|\?|$))/.test(p);
const allowedBy = (method, p) => !nonCanonical(p) && routes.some((r) => r.re.test(p) && r.methods.includes(method));

const proxyBlocked = (r) => (r.status === 403 || r.status === 404 || r.status === 400 || r.status === 405) &&
  (r.headers['x-proxy-deny'] === '1' || /PROXY_DENY|nginx/i.test(r.body) ||
    // HEAD has no body: nginx 'return 403 "text"' answers with an octet-stream type, GEV answers JSON/HTML.
    (r.body === '' && (r.status === 400 || (r.status === 403 && !/json|html/i.test(r.headers['content-type'] || ''))))) &&
  !/Proxied requests|GEV/i.test(r.body);

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
const rows = [];
let fails = 0;
function record(kind, method, path, r, ok, why) {
  if (!ok) fails++;
  rows.push(`${ok ? 'PASS' : 'FAIL'} ${kind.padEnd(8)} ${method.padEnd(7)} ${String(r.status).padEnd(4)} ${path.slice(0, 70)}${ok ? '' : '  <- ' + why + ' | ' + r.body.replace(/\s+/g, ' ').slice(0, 80)}`);
}

// 1) every inventory route + fixed list, every method: prediction from the JSON, behaviour from the proxy.
const fixed = ['/api/setup/status', '/api/setup/keys', '/api/setup/anything', '/mcp', '/mcp.json', '/mcp/x', '/api/openai/chat', '/api/gemini/chat', '/api/realtime/token',
  '/api/ghostmaps/catalog', '/api/inaturalist/grid', '/api/news/feed', '/@fs/etc/passwd', '/@fs/app/.env', '/.env', '/.git/config', '/vite.config.js', '/package.json',
  '/api/flights', '/api/vessels', '/api/celestrak/active', '/api/adsbdb', '/api/tomtom/status', '/api/geocode', '/api/does-not-exist', '/api'];
const paths = [...new Set([...inv.map((r) => r.route.replace(/\{z\}/g, '1').replace(/\{x\}/g, '1').replace(/\{y\}/g, '1').replace('...', 'x')), ...fixed])];
for (const p of paths) {
  for (const m of METHODS) {
    const r = await req(m, p);
    if (allowedBy(m, p)) record('allowed', m, p, r, !proxyBlocked(r), 'allowlisted route was blocked by proxy');
    else record('denied', m, p, r, proxyBlocked(r), 'not blocked by proxy');
  }
}

// 2) bypass variants of denied AND allowed paths: all must be blocked by the proxy (GET and POST).
const targets = ['/api/setup/keys', '/mcp', '/api/ghostmaps/catalog', '/@fs/etc/passwd', '/api/news/feed'];
const smuggle = [];
for (const t of targets) {
  smuggle.push(t.replace(/\/([^/]+)/, (m, s) => '/%' + s.charCodeAt(0).toString(16) + s.slice(1)), // %xx first letter
    t.replace(/\//g, '%2f'), t.replace(/\/(?!$)/g, '%2F'), '/' + t, t.replace(/\/([^/]+)$/, '//$1'),
    t + '/', t.toUpperCase(), t + ';x=1', t.replace(/\/([^/]+)$/, ';a=b/$1'), t + '%00', t + '%00.js', t + '%3f',
    '/./' + t.slice(1), '/src/../' + t.slice(1), '/src/%2e%2e/' + t.slice(1), '/src/..%2f' + t.slice(1), '/src/%2e%2e%2f' + t.slice(1),
    '/src/.%2e/' + t.slice(1), '/share/../' + t.slice(1), '/api/weather/../' + t.slice(1), '/api/weather/%2e%2e/' + t.slice(1), '/api/weather;/../' + t.slice(1),
    '/icons/%2e%2e/' + t.slice(1), '/src/' + '%5c..%5c' + t.slice(1), '/src\\..\\' + t.slice(1), t + '#/src/', t + '%23', t + '%e2%80%8b');
}
// allowed paths with a non-canonical shape must also die
const allowedShapes = ['/api/weather', '/api/cctv/sources', '/api/cctv/health', '/', '/src/main.js', '/share/AQc', '/api/library'];
for (const a of allowedShapes) {
  smuggle.push(a.toUpperCase(), '/' + a, a.replace(/\/([^/]+)$/, '//$1'), a + '/x/..', a + ';x=1', a.replace(/\./g, '%2e'), a.replace(/^\/(.)/, (m, c) => '/%' + c.charCodeAt(0).toString(16)));
  if (a !== '/') smuggle.push(a + '/');
}
for (const p of [...new Set(smuggle)]) {
  if (allowedBy('GET', p)) continue; // e.g. '/' + '/' variants that collapse back to an allowed canonical form are not variants
  for (const m of ['GET', 'POST', 'HEAD']) { const r = await req(m, p); record('variant', m, p, r, proxyBlocked(r), 'bypass variant not blocked by proxy'); }
}
// raw absolute-form / odd forms via path
for (const p of ['http://evil.example/api/setup/keys', '*', 'api/setup/keys']) {
  const r = await req('GET', p); record('variant', 'GET', p, r, proxyBlocked(r) || r.status === 400, 'odd request-target not blocked');
}
// query-string tricks must not change routing: denied path + allowed-looking query stays denied; allowed path + denied-looking query still allowed.
for (const p of ['/api/setup/keys?/api/weather', '/api/setup/keys?x=/', '/mcp?/', '/?/../api/setup/keys']) {
  const r = await req('GET', p);
  const exp = allowedBy('GET', p);
  record('query', 'GET', p, r, exp ? !proxyBlocked(r) : proxyBlocked(r), exp ? 'allowed query shape was blocked' : 'query trick not blocked');
}

// 3) allowlisted routes work with their allowed method and give an expected status.
for (const r0 of allow.routes) {
  for (const m of r0.methods) {
    const r = await req(m, r0.probe);
    const ok = !proxyBlocked(r) && r0.expect.includes(r.status);
    record('probe', m, r0.probe, r, ok, `expected ${r0.expect.join('/')}`);
  }
}

console.log(rows.join('\n'));
const pass = rows.filter((x) => x.startsWith('PASS')).length;
console.log(`\nSUMMARY pass=${pass} fail=${fails} total=${rows.length}`);
process.exit(fails ? 1 : 0);
