// Security/compat probe against a deployed GEV. Usage:
//   node tests/security/probe.mjs <baseUrl> <hostHeader> <label> [--expect-untrusted]
// Writes results/<label>.json and prints a table. Exit 1 if any CRITICAL check fails.
// CRITICAL checks assume the caller is a PUBLIC visitor (must not reach credential setup or host files).
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [base, hostHeader, label] = process.argv.slice(2);
if (!base || !hostHeader || !label) {
  console.error('usage: probe.mjs <baseUrl> <hostHeader> <label>');
  process.exit(2);
}
const u = new URL(base);
const MARKER = 'GEV_SECURITY_TEST_7f31c9';

function req(method, path, headers = {}, body = null) {
  return new Promise((done) => {
    const r = http.request(
      { host: u.hostname, port: u.port, method, path, headers: { Host: hostHeader, ...headers }, timeout: 15000 },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          if (data.length < 4000) data += c;
        });
        res.on('end', () => done({ status: res.statusCode, headers: res.headers, body: data }));
      },
    );
    r.on('timeout', () => {
      r.destroy();
      done({ status: 0, headers: {}, body: 'TIMEOUT' });
    });
    r.on('error', (e) => done({ status: 0, headers: {}, body: `ERR ${e.code || e.message}` }));
    if (body) r.write(body);
    r.end();
  });
}

const denied = (r) => r.status >= 400 && r.status < 500;
const results = [];
async function check(id, critical, method, path, headers, body, judge) {
  const r = await req(method, path, headers, body);
  const verdict = judge ? judge(r) : 'INFO';
  results.push({ id, critical, method, path, hostHeader: headers.Host || hostHeader, xff: headers['X-Forwarded-For'] || '', status: r.status, verdict, snippet: r.body.slice(0, 120).replace(/\s+/g, ' ') });
}

const SPOOF = { 'X-Forwarded-For': '127.0.0.1', 'X-Real-IP': '127.0.0.1', Forwarded: 'for=127.0.0.1' };
const J = { 'Content-Type': 'application/json' };

// Credential setup must be denied to a public visitor, including with spoofed loopback headers.
await check('setup-status', true, 'GET', '/api/setup/status', {}, null, (r) => (denied(r) ? 'PASS' : 'FAIL'));
await check('setup-status-spoofed-xff', true, 'GET', '/api/setup/status', SPOOF, null, (r) => (denied(r) ? 'PASS' : 'FAIL'));
await check('setup-keys-post', true, 'POST', '/api/setup/keys', { ...J, Origin: `http://${hostHeader}` }, '{}', (r) => (denied(r) ? 'PASS' : 'FAIL'));
await check('setup-keys-post-spoofed', true, 'POST', '/api/setup/keys', { ...J, ...SPOOF, Origin: 'http://localhost:4173' }, '{}', (r) => (denied(r) ? 'PASS' : 'FAIL'));

// Host files: a marker file outside the app root must not be readable.
await check('fs-marker', true, 'GET', '/@fs/tmp/gev-marker.txt', {}, null, (r) => (r.body.includes(MARKER) ? 'FAIL' : 'PASS'));
await check('fs-marker-encoded', true, 'GET', '/@fs/%2e%2e/%2e%2e/tmp/gev-marker.txt', {}, null, (r) => (r.body.includes(MARKER) ? 'FAIL' : 'PASS'));
await check('fs-etc-passwd', true, 'GET', '/@fs/etc/passwd', {}, null, (r) => (r.body.includes('root:') ? 'FAIL' : 'PASS'));
await check('env-file', true, 'GET', '/.env', {}, null, (r) => (/KEY|SECRET|TOKEN/.test(r.body) && r.status === 200 ? 'FAIL' : 'PASS'));

// Host allowlist.
await check('evil-host', false, 'GET', '/', { Host: 'evil.example' }, null, (r) => (denied(r) ? 'PASS' : 'FAIL'));

// Framing: embed document framable only by the configured ancestor; everything else not framable.
const framing = (r) => `${r.headers['content-security-policy'] || ''} | xfo=${r.headers['x-frame-options'] || ''}`;
await check('frame-embed', false, 'GET', '/?embed=1', {}, null, (r) => (/frame-ancestors https:\/\/www\.example\.test/.test(framing(r)) ? 'PASS' : `FAIL ${framing(r).slice(0, 100)}`));
await check('frame-plain', false, 'GET', '/', {}, null, (r) => (/frame-ancestors 'none'/.test(framing(r)) || /deny/i.test(framing(r)) ? 'PASS' : `FAIL ${framing(r).slice(0, 100)}`));

// Dev-server surface (INFO: recorded for review, release blocker if reachable publicly).
for (const p of ['/@vite/client', '/@vite/env', '/src/main.js', '/vite.config.js', '/package.json', '/node_modules/.vite/deps/_metadata.json', '/.git/config', '/server/standalone/key-setup.js']) {
  await check(`dev-${p}`, false, 'GET', p, {}, null, null);
}

// Inventory sweep: sensitive and restricted routes, GET only, recorded not judged here.
const inv = JSON.parse(readFileSync(resolve(root, 'data/route-inventory.json'), 'utf8')).routes;
for (const r of inv.filter((x) => x.class !== 'public-candidate')) {
  await check(`inv-${r.class}-${r.route}`, false, 'GET', r.route, {}, null, null);
}

mkdirSync(resolve(root, 'results'), { recursive: true });
writeFileSync(resolve(root, `results/${label}.json`), JSON.stringify(results, null, 2));
const crit = results.filter((r) => r.critical && r.verdict !== 'PASS');
console.log(`# ${label}  base=${base} host=${hostHeader}`);
for (const r of results) console.log(`${(r.critical ? 'CRIT ' : '     ')}${String(r.status).padEnd(4)} ${r.verdict.slice(0, 40).padEnd(8)} ${r.method} ${r.path}  ${r.snippet.slice(0, 60)}`);
console.log(`\nCRITICAL FAILURES: ${crit.length}`);
process.exit(crit.length ? 1 : 0);
