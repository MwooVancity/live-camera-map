// Checks site/public/_headers (Cloudflare Pages format): well-formed, security basics present, caching right, and no CSP that would break the /map/ frame or Astro's inline scripts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FILE = new URL('../../site/public/_headers', import.meta.url);
const NAME = /^[A-Za-z][A-Za-z0-9-]*$/;

// Returns { rules: [{ path, set: [[name, value]], detach: [name] }], problems: [] }.
export function parseHeaders(text) {
  const rules = [], problems = [];
  let cur = null;
  text.split(/\r?\n/).forEach((raw, n) => {
    const at = `line ${n + 1}`;
    if (raw.length > 2000) problems.push(`${at}: longer than 2000 characters`);
    if (!raw.trim() || raw.trim().startsWith('#')) return;
    if (!/^\s/.test(raw)) { // a path line
      if (!/^(\/\S*|https:\/\/\S+)$/.test(raw.trim())) { problems.push(`${at}: rule path must start with / : ${raw}`); cur = null; return; }
      cur = { path: raw.trim(), set: [], detach: [] };
      if (rules.some((r) => r.path === cur.path)) problems.push(`${at}: duplicate rule for ${cur.path}`);
      rules.push(cur);
      return;
    }
    if (!cur) { problems.push(`${at}: header before any path: ${raw.trim()}`); return; }
    const t = raw.trim();
    if (t.startsWith('!')) { const nm = t.slice(1).trim(); if (!NAME.test(nm)) problems.push(`${at}: bad detach name ${t}`); else cur.detach.push(nm.toLowerCase()); return; }
    const i = t.indexOf(':');
    if (i < 1 || !NAME.test(t.slice(0, i)) || !t.slice(i + 1).trim()) { problems.push(`${at}: malformed header line: ${t}`); return; }
    cur.set.push([t.slice(0, i).toLowerCase(), t.slice(i + 1).trim()]);
  });
  if (rules.length > 100) problems.push('more than 100 rules (Pages limit)');
  for (const r of rules) if (!r.set.length && !r.detach.length) problems.push(`${r.path}: rule with no headers`);
  return { rules, problems };
}

// Would this Content-Security-Policy break the map frame or Astro's inline scripts? Returns reasons (empty = fine).
export function cspBreaks(csp) {
  const d = new Map(csp.split(';').map((s) => s.trim()).filter(Boolean).map((s) => { const [k, ...v] = s.split(/\s+/); return [k.toLowerCase(), v]; }));
  const out = [];
  const frame = d.get('frame-src') ?? d.get('child-src') ?? d.get('default-src');
  if (frame && !frame.includes('https:') && !frame.includes('*')) out.push('frame-src/child-src/default-src does not allow https: frames (the map engine is a frame on another host)');
  const script = d.get('script-src') ?? d.get('default-src');
  if (script && !script.includes("'unsafe-inline'")) out.push("script-src/default-src lacks 'unsafe-inline' (Astro emits inline scripts)");
  return out;
}

export function headerProblems(text) {
  const { rules, problems } = parseHeaders(text);
  const out = [...problems];
  const all = rules.find((r) => r.path === '/*');
  const val = (r, n) => r?.set.find(([k]) => k === n)?.[1];
  if (!all) return [...out, 'no /* rule'];
  if (!/(^|,\s*)nosniff(\s*,|$)/i.test(val(all, 'x-content-type-options') || '')) out.push('/* has no X-Content-Type-Options: nosniff');
  if (!val(all, 'referrer-policy')) out.push('/* has no Referrer-Policy');
  const pp = val(all, 'permissions-policy') || '';
  if (!/geolocation=\(self\)/.test(pp)) out.push('Permissions-Policy must allow geolocation=(self) (the near-me button)');
  if (!/camera=\(\)/.test(pp) || !/microphone=\(\)/.test(pp)) out.push('Permissions-Policy must deny camera and microphone');
  for (const r of rules) {
    const csp = val(r, 'content-security-policy');
    if (csp) for (const why of cspBreaks(csp)) out.push(`${r.path}: CSP would break the site: ${why}`);
    const xfo = val(r, 'x-frame-options');
    if (xfo && /deny/i.test(xfo) && r.path !== '/*') out.push(`${r.path}: X-Frame-Options DENY`);
    if (r.path !== '/*' && r.set.some(([k]) => k === 'cache-control') && !r.detach.includes('cache-control')) out.push(`${r.path}: sets Cache-Control without "! Cache-Control" (Pages would join it with the /* value)`);
  }
  const cc = (p) => val(rules.find((r) => r.path === p), 'cache-control') || '';
  for (const p of ['/_astro/*', '/fonts/*']) if (!(/immutable/.test(cc(p)) && Number((/max-age=(\d+)/.exec(cc(p)) || [])[1]) >= 31536000)) out.push(`${p}: needs a one-year immutable cache`);
  for (const p of ['/data/*', '/health.json']) if (!(/must-revalidate/.test(cc(p)) && Number((/max-age=(\d+)/.exec(cc(p)) || [])[1]) <= 3600)) out.push(`${p}: needs a short cache with must-revalidate`);
  if (!(/max-age=0/.test(cc('/*')) && /must-revalidate/.test(cc('/*')))) out.push('/* (HTML) needs max-age=0, must-revalidate');
  return out;
}

test('site/public/_headers is well formed and has the required headers', () => {
  assert.deepEqual(headerProblems(readFileSync(FILE, 'utf8')), []);
});

test('failing fixtures: each defect is caught', () => {
  const good = readFileSync(FILE, 'utf8');
  const bad = (re, to) => headerProblems(good.replace(re, to)).length;
  assert.ok(bad(/  X-Content-Type-Options: nosniff\n/, '') > 0, 'missing nosniff');
  assert.ok(bad(/  X-Content-Type-Options: nosniff/, '  X-Content-Type-Options') > 0, 'header with no value');
  assert.ok(bad(/^\/fonts\/\*/m, 'fonts/*') > 0, 'path without leading slash');
  assert.ok(bad(/geolocation=\(self\)/, 'geolocation=()') > 0, 'geolocation blocked');
  assert.ok(bad(/  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable\n\n\/fonts/, '  Cache-Control: public, max-age=31536000, immutable\n\n/fonts') > 0, 'no detach');
  assert.ok(bad(/\/_astro\/\*\n  ! Cache-Control\n  Cache-Control: [^\n]*/, '/_astro/*\n  ! Cache-Control\n  Cache-Control: public, max-age=60') > 0, 'hashed assets not immutable');
  assert.ok(bad(/^\/\*\n/m, '/*\n  Content-Security-Policy: default-src \'self\'\n') > 0, "default-src 'self' blocks the map frame");
  assert.ok(cspBreaks("script-src 'self'").length > 0, 'script-src without unsafe-inline');
  assert.deepEqual(cspBreaks("frame-ancestors 'self'"), [], 'frame-ancestors alone breaks nothing');
  assert.deepEqual(cspBreaks("frame-src https:; script-src 'self' 'unsafe-inline'"), []);
  assert.ok(parseHeaders('  X: y\n').problems.length > 0, 'header before a path');
});

test('the self-hosted proxy cache rule does not touch this site\'s paths', () => {
  const nginx = readFileSync(new URL('../../ops/proxy/nginx.allowlist.conf', import.meta.url), 'utf8');
  const rule = nginx.match(/map \$uri \$cache_ctl \{[\s\S]*?\n  \}/)[0];
  assert.ok(!/_astro|fonts|\/data\//.test(rule), 'proxy cache map names only the map engine /assets/ files');
});
