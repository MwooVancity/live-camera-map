// Gate for rule 'traffic-parity': every cluster has our page (that exists in the built site) or a recorded gap reason.
// Run after `npm run build` in site/: node --test tests/parity/parity.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(root, 'site', 'dist');
const STATUSES = ['built', 'partial', 'gap', 'not-capturable'];

export function checkParity(data, exists) {
  const errs = [];
  if (!Array.isArray(data?.clusters) || !data.clusters.length) return ['no clusters'];
  const seen = new Set();
  for (const c of data.clusters) {
    const n = c?.cluster || '(no name)';
    if (seen.has(n)) errs.push(`${n}: duplicate cluster`);
    seen.add(n);
    if (!STATUSES.includes(c?.status)) { errs.push(`${n}: bad status`); continue; }
    const urls = Array.isArray(c.ourUrls) ? c.ourUrls : [];
    if ((c.status === 'built' || c.status === 'partial') && !urls.length) errs.push(`${n}: ${c.status} with no our URL`);
    if ((c.status === 'gap' || c.status === 'not-capturable') && !(typeof c.reason === 'string' && c.reason.trim().length >= 10)) errs.push(`${n}: ${c.status} with no reason`);
    for (const u of urls) if (!exists(u)) errs.push(`${n}: ${u} is not in the built site`);
  }
  return errs;
}
const onDisk = (u) => existsSync(join(DIST, u.replace(/^\//, ''), 'index.html')) || (u === '/' && existsSync(join(DIST, 'index.html')));

test('the real parity file: every cluster has a built page or a reason', () => {
  assert.ok(existsSync(DIST), 'site/dist missing: run npm run build in site/ first');
  const data = JSON.parse(readFileSync(join(root, 'data', 'traffic-parity.json'), 'utf8'));
  assert.deepEqual(checkParity(data, onDisk), []);
});
test('failing fixture: a cluster with no page and no reason fails', () => {
  assert.equal(checkParity({ clusters: [{ cluster: 'x', status: 'gap' }] }, () => true).length, 1);
});
test('failing fixture: a listed URL missing from the build fails', () => {
  assert.equal(checkParity({ clusters: [{ cluster: 'x', status: 'built', ourUrls: ['/nope/'] }] }, () => false).length, 1);
});
test('failing fixture: built with no URL, bad status, duplicate and empty file all fail', () => {
  assert.equal(checkParity({ clusters: [{ cluster: 'x', status: 'built' }] }, () => true).length, 1);
  assert.equal(checkParity({ clusters: [{ cluster: 'x', status: 'maybe' }] }, () => true).length, 1);
  assert.equal(checkParity({ clusters: [{ cluster: 'x', status: 'not-capturable', reason: 'brand searches' }, { cluster: 'x', status: 'not-capturable', reason: 'brand searches' }] }, () => true).length, 1);
  assert.equal(checkParity({}, () => true).length, 1);
});
