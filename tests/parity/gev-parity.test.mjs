// Gate for plan.md item 15 (GEV parity audit): nothing in God's Eye View may be silently missing from our site.
// Run: node --test tests/parity/gev-parity.test.mjs   (needs site/dist for in-site URL checks)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(root, 'site', 'dist');
const STATUSES = ['in-map', 'in-site', 'gap', 'excluded'];
const PIN = 'aac6be77735f6bcad583204724a43302227abc4d';

export function checkParity(d, urlExists) {
  const errs = [];
  if (!d || !Array.isArray(d.rows) || !d.rows.length) return ['no rows'];
  if (d.pin !== PIN) errs.push(`audit pin ${d.pin} is not the pinned base ${PIN}`);
  const seen = new Set();
  let unreviewed = 0;
  for (const r of d.rows) {
    const id = `${r.inventory}: ${r.feature}`;
    if (seen.has(r.key)) errs.push(`${id}: duplicate key`);
    seen.add(r.key);
    if (r.status === 'unreviewed') { unreviewed++; continue; }
    if (!STATUSES.includes(r.status)) { errs.push(`${id}: bad status ${r.status}`); continue; }
    if ((r.status === 'gap' || r.status === 'excluded') && !(typeof r.reason === 'string' && r.reason.trim().length >= 8)) errs.push(`${id}: ${r.status} with no reason`);
    if (r.status === 'in-site') {
      if (!r.ourUrl) errs.push(`${id}: in-site with no our URL`);
      else if (!urlExists(r.ourUrl)) errs.push(`${id}: ${r.ourUrl} is not in the built site`);
    }
    if (/needs human review/i.test(r.reason || '')) errs.push(`${id}: still needs human review`);
  }
  if (d.complete === true) {
    if (unreviewed) errs.push(`${unreviewed} rows are unreviewed but the audit says complete`);
    const who = new Set(d.confirmedBy || []);
    for (const w of ['claude', 'chatgpt']) if (!who.has(w)) errs.push(`audit says complete but ${w} has not confirmed`);
  }
  return errs;
}
const onDisk = (u) => existsSync(join(DIST, u.replace(/^\//, ''), 'index.html')) || existsSync(join(DIST, u.replace(/^\//, '')));

test('the real GEV parity file: statuses, reasons, URLs, and (once complete) both confirmations', () => {
  const f = join(root, 'data', 'gev-parity.json');
  assert.ok(existsSync(f), 'data/gev-parity.json missing: run ops/audit/build-gev-parity.mjs');
  assert.ok(existsSync(DIST), 'site/dist missing: run npm run build in site/');
  assert.deepEqual(checkParity(JSON.parse(readFileSync(f, 'utf8')), onDisk), []);
});
const row = (o = {}) => ({ key: 'k' + Math.random(), inventory: 'x', feature: 'f', status: 'in-map', reason: null, ourUrl: null, ...o });
const base = (rows, o = {}) => ({ pin: PIN, complete: false, confirmedBy: [], rows, ...o });
test('failing fixture: a gap or excluded row with no reason fails', () => {
  assert.equal(checkParity(base([row({ status: 'gap' })]), () => true).length, 1);
  assert.equal(checkParity(base([row({ status: 'excluded', reason: 'x' })]), () => true).length, 1);
});
test('failing fixture: in-site with a URL missing from the build, or no URL, fails', () => {
  assert.equal(checkParity(base([row({ status: 'in-site', ourUrl: '/nope/' })]), () => false).length, 1);
  assert.equal(checkParity(base([row({ status: 'in-site' })]), () => true).length, 1);
});
test('failing fixture: complete with an unreviewed row, or missing a confirmation, fails; incomplete may hold unreviewed rows', () => {
  assert.equal(checkParity(base([row({ status: 'unreviewed' })]), () => true).length, 0);
  assert.ok(checkParity(base([row({ status: 'unreviewed' })], { complete: true, confirmedBy: ['claude', 'chatgpt'] }), () => true).length >= 1);
  assert.equal(checkParity(base([row()], { complete: true, confirmedBy: ['claude'] }), () => true).length, 1);
  assert.equal(checkParity(base([row()], { complete: true, confirmedBy: ['claude', 'chatgpt'] }), () => true).length, 0);
});
test('failing fixture: wrong pin, bad status, duplicate key, leftover human-review marker fail', () => {
  assert.equal(checkParity(base([row()], { pin: 'abc' }), () => true).length, 1);
  assert.equal(checkParity(base([row({ status: 'maybe' })]), () => true).length, 1);
  const k = row(); assert.equal(checkParity(base([k, { ...k }]), () => true).length, 1);
  assert.equal(checkParity(base([row({ status: 'gap', reason: 'needs human review: unclear' })]), () => true).length, 1);
});
