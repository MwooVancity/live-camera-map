// Dependency-free public health check. Usage: node ops/monitoring/healthcheck.mjs <baseUrl> [hostHeader]
// (hostHeader or env HEALTH_HOST overrides the Host header, for testing 127.0.0.1:8080 against a placeholder host.)
// Exit 0 = all checks pass. Exit 1 = prints one "HEALTH FAIL <check>: <why>" line per failure. Exit 2 = bad usage.
import http from 'node:http';
import https from 'node:https';

const [base, hostArg] = process.argv.slice(2);
if (!base) { console.error('usage: node ops/monitoring/healthcheck.mjs <baseUrl> [hostHeader]'); process.exit(2); }
const host = hostArg || process.env.HEALTH_HOST || '';
const u = new URL(base);
const lib = u.protocol === 'https:' ? https : http;

// Raw path, optional Host override (fetch() cannot set Host).
const get = (path) => new Promise((done) => {
  const r = lib.request({ hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname.replace(/\/$/, '') + path,
    method: 'GET', headers: host ? { Host: host } : {}, servername: host || u.hostname, timeout: 20000 }, (res) => {
    res.resume();
    res.on('end', () => done({ status: res.statusCode, headers: res.headers }));
  });
  r.on('timeout', () => r.destroy(new Error('timeout')));
  r.on('error', (e) => done({ status: 0, headers: {}, err: e.message }));
  r.end();
});

const checks = [
  ['home-200', '/', (r) => r.status === 200 || `expected 200, got ${r.status} ${r.err || ''}`],
  ['embed-frame-ancestors', '/?embed=1', (r) => (r.status === 200 && /frame-ancestors/i.test(r.headers['content-security-policy'] || '')) || `status ${r.status}, no frame-ancestors in CSP`],
  ['setup-status-403', '/api/setup/status', (r) => r.status === 403 || `expected 403, got ${r.status} (credential setup may be exposed)`],
  ['restricted-route-blocked', '/api/ghostmaps/catalog', (r) => r.status === 403 || `expected 403, got ${r.status} (restricted source may be live)`],
];

let failed = 0;
for (const [name, path, test] of checks) {
  const verdict = test(await get(path));
  if (verdict !== true) { failed++; console.log(`HEALTH FAIL ${name}: ${verdict} (${base}${path})`); }
  else console.log(`HEALTH OK ${name}`);
}
process.exit(failed ? 1 : 0);
