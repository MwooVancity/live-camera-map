// Session 4 live proof. Usage: node tests/exclusion/proxy-proof.mjs <baseUrl> <hostHeader>
// For every probe path of every exclusion group in data/exclusion-map.json, send ALL 7 methods through the proxy and
// FAIL unless the proxy itself blocked it (X-Proxy-Deny / PROXY_DENY body), never GEV. Also fetches /api/cctv/sources
// through the proxy and fails if a restricted camera provider shows up in the catalog.
// req() and proxyBlocked() are copied from tests/security/methods.mjs (a script, not a module); keep them in step.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [base, hostHeader] = process.argv.slice(2);
if (!base || !hostHeader) { console.error('usage: node tests/exclusion/proxy-proof.mjs <baseUrl> <hostHeader>'); process.exit(2); }
const u = new URL(base);
const map = JSON.parse(readFileSync(resolve(root, 'data/exclusion-map.json'), 'utf8'));

function req(method, path) {
  return new Promise((res) => {
    const r = http.request({ host: u.hostname, port: u.port || 80, method, path, headers: { Host: hostHeader }, timeout: 15000 }, (resp) => {
      let body = '';
      resp.on('data', (c) => { if (body.length < 4_000_000) body += c; });
      resp.on('end', () => res({ status: resp.statusCode, headers: resp.headers, body }));
    });
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.on('error', (e) => res({ status: 0, headers: {}, body: String(e.message) }));
    r.end();
  });
}
const proxyBlocked = (r) => (r.status === 403 || r.status === 404 || r.status === 400 || r.status === 405) &&
  (r.headers['x-proxy-deny'] === '1' || /PROXY_DENY|nginx/i.test(r.body) ||
    (r.body === '' && (r.status === 400 || (r.status === 403 && !/json|html/i.test(r.headers['content-type'] || ''))))) &&
  !/Proxied requests|GEV/i.test(r.body);

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
const rows = [];
let fails = 0;
const rec = (ok, line) => { if (!ok) fails++; rows.push(`${ok ? 'PASS' : 'FAIL'} ${line}`); };

for (const g of map.groups) {
  for (const p of g.probePaths) {
    for (const m of METHODS) {
      const r = await req(m, p);
      rec(proxyBlocked(r), `${g.id.padEnd(28)} ${m.padEnd(7)} ${String(r.status).padEnd(4)} ${p}${proxyBlocked(r) ? '' : '  <- NOT blocked by proxy: ' + r.body.replace(/\s+/g, ' ').slice(0, 80)}`);
    }
  }
}

// catalog content: what the allowlisted metadata route really returns (env flags from ops/deploy/gev-exclusion.env)
const cat = await req('GET', '/api/cctv/sources');
if (cat.status !== 200) rec(false, `catalog      GET     ${cat.status} /api/cctv/sources did not answer 200`);
else {
  let providers = new Map();
  try { for (const s of JSON.parse(cat.body).sources || []) providers.set(s.provider, (providers.get(s.provider) || 0) + 1); } catch { rec(false, 'catalog       /api/cctv/sources body is not JSON (or was cut at 4 MB)'); }
  // an empty catalog would make every "absent" check below pass for nothing
  rec(providers.size > 0, `catalog       /api/cctv/sources lists ${providers.size} providers (0 = proof is vacuous, the catalog never loaded)`);
  for (const bad of map.restrictedCctvProviders) rec(![...providers.keys()].some((p) => String(p).includes(bad)), `catalog       provider "${bad}" must be absent from /api/cctv/sources (found ${providers.get(bad) ?? 0})`);
  console.log('INFO providers in /api/cctv/sources:', JSON.stringify([...providers.entries()]));
}

console.log(rows.join('\n'));
const pass = rows.filter((x) => x.startsWith('PASS')).length;
console.log(`\nSUMMARY pass=${pass} fail=${fails} total=${rows.length}`);
process.exit(fails ? 1 : 0);
