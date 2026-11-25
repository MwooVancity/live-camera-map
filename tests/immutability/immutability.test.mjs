// Run: node --test tests/immutability/
// Real gev/ must be clean. Violations are simulated on a throwaway clone, never on gev/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, appendFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkImmutable } from './check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const gev = resolve(root, 'gev');
const base = resolve(root, 'ops/upstream-base.txt');
const sha = execFileSync('git', ['-C', gev, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

function clone() {
  const d = mkdtempSync(join(tmpdir(), 'gevclone-'));
  execFileSync('git', ['clone', '-q', '--no-checkout', gev, d]);
  execFileSync('git', ['-C', d, '-c', 'advice.detachedHead=false', 'checkout', '-q', sha]);
  return d;
}
const withClone = (fn) => () => {
  const d = clone();
  try {
    fn(d);
  } finally {
    try { rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* cleanup race on CI: a leftover temp folder must not fail the immutability test */ }
  }
};

test('real gev/ is pristine at pinned commit', () => {
  assert.deepEqual(checkImmutable(gev, base), []);
});
test('fresh clone passes (control)', withClone((d) => assert.deepEqual(checkImmutable(d, base), [])));
test('deliberate edit fails', withClone((d) => {
  appendFileSync(join(d, 'package.json'), '\n');
  assert.match(checkImmutable(d, base).join(), /not clean/);
}));
test('deletion fails', withClone((d) => {
  unlinkSync(join(d, 'package.json'));
  assert.ok(!existsSync(join(d, 'package.json')));
  assert.match(checkImmutable(d, base).join(), /not clean/);
}));
test('untracked file fails', withClone((d) => {
  writeFileSync(join(d, 'sneaky.txt'), 'x');
  assert.match(checkImmutable(d, base).join(), /not clean/);
}));
test('wrong HEAD fails', withClone((d) => {
  execFileSync('git', ['-C', d, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x']);
  assert.match(checkImmutable(d, base).join(), /!= pinned/);
}));

test('GIT_DIR from a linked-worktree commit hook does not redirect the check to the outer repo', () => {
  const saved = process.env.GIT_DIR;
  process.env.GIT_DIR = resolve(root, '.git'); // what git exports to a hook that runs in a linked worktree (measured 2026-11-24)
  try { assert.deepEqual(checkImmutable(), []); } finally { if (saved === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = saved; }
});

// B1 (code review 2026-11-25): status alone is blind to skip-worktree, assume-unchanged and ignored files.
const g = (d, ...a) => execFileSync('git', ['-C', d, ...a], { encoding: 'utf8' });
test('B1 skip-worktree edit fails', withClone((d) => {
  g(d, 'update-index', '--skip-worktree', 'package.json');
  appendFileSync(join(d, 'package.json'), '\n');
  assert.match(checkImmutable(d, base).join(), /skip-worktree|assume-unchanged|hidden/i);
}));
test('B1 assume-unchanged edit fails', withClone((d) => {
  g(d, 'update-index', '--assume-unchanged', 'package.json');
  appendFileSync(join(d, 'package.json'), '\n');
  assert.match(checkImmutable(d, base).join(), /skip-worktree|assume-unchanged|hidden/i);
}));
test('B1 untracked file hidden by .git/info/exclude fails', withClone((d) => {
  appendFileSync(join(d, '.git', 'info', 'exclude'), 'sneaky.txt\n');
  writeFileSync(join(d, 'sneaky.txt'), 'x');
  assert.match(checkImmutable(d, base).join(), /sneaky\.txt/);
}));
test('B1 allowed ignored build folders still pass', withClone((d) => {
  appendFileSync(join(d, '.git', 'info', 'exclude'), 'node_modules/\ndist/\n.gev-cache/\n.gev-logs/\n');
  for (const f of ['node_modules', 'dist', '.gev-cache', '.gev-logs']) { mkdirSync(join(d, f)); writeFileSync(join(d, f, 'a'), 'x'); }
  assert.deepEqual(checkImmutable(d, base), []);
}));
