// Run: node --test tests/immutability/
// Real gev/ must be clean. Violations are simulated on a throwaway clone, never on gev/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, appendFileSync, unlinkSync, existsSync } from 'node:fs';
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
    rmSync(d, { recursive: true, force: true });
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
