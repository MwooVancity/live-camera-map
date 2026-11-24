// Importer runner (plan item 28 stage 2): a failing importer is visible and never stops the others.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAll, loadPlan } from '../../ops/importers/run-all.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const plan = [{ id: 'a', script: 'a.mjs' }, { id: 'b', script: 'b.mjs', required: false }, { id: 'c', script: 'c.mjs' }, { id: 'd', script: 'd.mjs' }];

test('a failed required importer is reported, the others still run, and the failure is counted', () => {
  const ran = [];
  const exec = (cmd, args) => { const n = basename(args[0]); ran.push(n); return { 'a.mjs': { status: 1 }, 'b.mjs': { status: 2 }, 'c.mjs': { status: 0 }, 'd.mjs': { status: null, signal: 'SIGKILL' } }[n]; };
  const out = [];
  const { results, failedRequired } = runAll(plan, { exec, log: (m) => out.push(m) });
  assert.deepEqual(ran, ['a.mjs', 'b.mjs', 'c.mjs', 'd.mjs'], 'every importer ran after earlier failures');
  assert.deepEqual(results.map((r) => r.outcome), ['FAILED', 'FAILED', 'ok', 'TIMED OUT']);
  assert.equal(failedRequired, 2, 'a (required, failed) and d (required, timed out); b is optional');
  assert.ok(out.some((l) => l.startsWith('ERROR: a FAILED')) && out.some((l) => l.startsWith('warning: b FAILED')) && out.some((l) => l.startsWith('ERROR: d TIMED OUT')));
});

test('all ok means no failures', () => {
  const { failedRequired } = runAll(plan, { exec: () => ({ status: 0 }), log: () => {} });
  assert.equal(failedRequired, 0);
});

test('--only with an unknown id throws instead of silently running nothing', () => {
  assert.throws(() => runAll(plan, { only: ['zzz'], exec: () => ({ status: 0 }), log: () => {} }), /unknown importer id/);
});

test('the real plan: every script exists, ids are unique, every timeout is set', () => {
  const real = loadPlan();
  assert.equal(new Set(real.map((e) => e.id)).size, real.length);
  for (const e of real) { assert.ok(existsSync(join(ROOT, 'ops', 'importers', e.script)), `${e.id}: ${e.script} exists`); assert.ok(e.timeoutSec >= 30, `${e.id}: timeout`); }
});
