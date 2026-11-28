// Offline lint of ops/deploy/docker-compose.yml (no Docker, no YAML dependency).
// Fails if gev publishes a port, trusted peers is not none, a secret-looking value is present, or the proxy is missing.
// Run: node --test tests/deploy/compose-lint.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Parser for the YAML subset the compose file uses: nested maps, "- scalar" lists, JSON flow lists, comments.
// Anything else throws, so an unsupported edit fails loudly instead of being silently skipped.
export function parse(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/(^|\s)#.*$/, '')).filter((l) => l.trim());
  let i = 0;
  const scalar = (s) => {
    s = s.trim();
    if (s.startsWith('[')) return JSON.parse(s);
    if (s === '{}') return {};
    if (/^(".*"|'.*')$/.test(s)) return s.slice(1, -1);
    return s;
  };
  function block(indent) {
    const first = lines[i];
    if (first.trim().startsWith('- ')) {
      const arr = [];
      while (i < lines.length && lines[i].search(/\S/) === indent && lines[i].trim().startsWith('- ')) {
        const item = lines[i].trim().slice(2);
        if (/^[\w.-]+:(\s|$)/.test(item) && !/^"/.test(item)) throw new Error(`unsupported list-of-maps: ${item}`);
        arr.push(scalar(item));
        i++;
      }
      return arr;
    }
    const obj = {};
    while (i < lines.length) {
      const ind = lines[i].search(/\S/);
      if (ind < indent) break;
      if (ind > indent) throw new Error(`bad indent: ${lines[i]}`);
      const m = lines[i].trim().match(/^([^:\s][^:]*):(?:\s+(.*))?$/);
      if (!m) throw new Error(`unsupported line: ${lines[i]}`);
      i++;
      if (m[2] !== undefined && m[2] !== '') obj[m[1]] = scalar(m[2]);
      else if (i < lines.length && lines[i].search(/\S/) > ind) obj[m[1]] = block(lines[i].search(/\S/));
      else obj[m[1]] = null;
    }
    return obj;
  }
  return block(0);
}

const SECRET_NAME = /(KEY|SECRET|TOKEN|PASSW(OR)?D|PASS|CREDENTIAL)/i;
const SECRET_VALUE = /(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN|[A-Za-z0-9+/_-]{40,})/;
const isPlaceholder = (v) => /^\$\{[A-Z_]+(:?[-?][^}]*)?\}$/.test(v) || v === '' || /example/i.test(v);

// returns a list of problems (empty = clean)
export function lint(compose, extraEnvTexts = []) {
  const bad = [];
  const svc = compose.services || {};
  if (!svc.proxy) bad.push('proxy service is missing');
  else {
    const ports = svc.proxy.ports || [];
    if (ports.length !== 1 || !/^127\.0\.0\.1:8080:8080$/.test(ports[0])) bad.push(`proxy must publish only 127.0.0.1:8080:8080, got ${JSON.stringify(ports)}`);
    const vols = (svc.proxy.volumes || []).join(' ');
    if (!/nginx\.allowlist\.conf/.test(vols)) bad.push('proxy does not mount nginx.allowlist.conf');
  }
  const gev = svc.gev;
  if (!gev) bad.push('gev service is missing');
  else {
    if (gev.ports) bad.push(`gev publishes ports: ${JSON.stringify(gev.ports)}`);
    if (gev.network_mode) bad.push(`gev uses network_mode ${gev.network_mode}`);
    if (gev.environment?.GEV_KEY_SETUP_TRUSTED_PEERS !== 'none') bad.push(`GEV_KEY_SETUP_TRUSTED_PEERS must be none, got ${gev.environment?.GEV_KEY_SETUP_TRUSTED_PEERS}`);
  }
  for (const [name, s] of Object.entries(svc)) {
    if (name !== 'proxy' && name !== 'gev' && name !== 'tunnel') bad.push(`unexpected service ${name}`);
    // The tunnel dials out to Cloudflare; it must never open a port on the server.
    if (name === 'tunnel' && s.ports) bad.push('tunnel publishes ports');
    if (s.privileged) bad.push(`${name} is privileged`);
    const env = s.environment || {};
    for (const [k, v] of Object.entries(env)) {
      if (k !== 'GEV_KEY_SETUP_TRUSTED_PEERS' && SECRET_NAME.test(k) && !isPlaceholder(String(v))) bad.push(`${name}: literal value for secret-looking var ${k}`);
      if (SECRET_VALUE.test(String(v)) && !isPlaceholder(String(v))) bad.push(`${name}: secret-looking value in ${k}`);
    }
  }
  for (const t of extraEnvTexts) {
    for (const line of t.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (m[1] !== 'GEV_KEY_SETUP_TRUSTED_PEERS' && SECRET_NAME.test(m[1]) && m[2] && !isPlaceholder(m[2])) bad.push(`env file: literal value for ${m[1]}`);
      if (SECRET_VALUE.test(m[2]) && m[1] !== 'GEV_LIBRARY_DISABLE' && !isPlaceholder(m[2])) bad.push(`env file: secret-looking value in ${m[1]}`);
    }
  }
  return bad;
}

const read = (p) => readFileSync(resolve(root, p), 'utf8');
const envFiles = ['ops/deploy/.env.example', 'ops/deploy/gev-exclusion.env'].map(read);

test('real compose file is clean', () => {
  assert.deepEqual(lint(parse(read('ops/deploy/docker-compose.yml')), envFiles), []);
});

const GOOD = `services:
  gev:
    environment:
      GEV_KEY_SETUP_TRUSTED_PEERS: none
  proxy:
    volumes:
      - ../proxy/nginx.allowlist.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "127.0.0.1:8080:8080"
`;

test('fixture: good minimal file passes (the linter is not just always failing)', () => {
  assert.deepEqual(lint(parse(GOOD)), []);
});

test('failing fixture: every violation is caught', () => {
  const bad = GOOD
    .replace('GEV_KEY_SETUP_TRUSTED_PEERS: none', 'GEV_KEY_SETUP_TRUSTED_PEERS: 172.18.0.1\n      OPENAI_API_KEY: sk-abcdefghijklmnopqrstuvwx')
    .replace('  gev:\n', '  gev:\n    ports:\n      - "4173:4173"\n');
  const problems = lint(parse(bad));
  assert.ok(problems.some((p) => /gev publishes ports/.test(p)), 'published port');
  assert.ok(problems.some((p) => /must be none/.test(p)), 'trusted peers');
  assert.ok(problems.some((p) => /secret-looking var OPENAI_API_KEY/.test(p)), 'secret var');
  const noProxy = parse(GOOD.slice(0, GOOD.indexOf('  proxy:')));
  assert.ok(lint(noProxy).some((p) => /proxy service is missing/.test(p)), 'proxy missing');
  assert.ok(lint(parse(GOOD), ['GEMINI_API_KEY=AIzaSyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA']).some((p) => /env file/.test(p)), 'secret in env file');
});
