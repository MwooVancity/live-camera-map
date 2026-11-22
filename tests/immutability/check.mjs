// Immutability check for gev/. Exports checkImmutable(dir, baseFile). CLI: node tests/immutability/check.mjs [gevDir]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const git = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' });

export function checkImmutable(dir = resolve(root, 'gev'), baseFile = resolve(root, 'ops/upstream-base.txt')) {
  const base = readFileSync(baseFile, 'utf8').trim().split(/\s+/)[0];
  const errors = [];
  if (!/^[0-9a-f]{40}$/.test(base)) errors.push(`bad base hash in ${baseFile}`);
  const head = git(dir, 'rev-parse', 'HEAD').trim();
  if (head !== base) errors.push(`HEAD ${head} != pinned ${base}`);
  // Untracked files count as dirty. Ignored build output (node_modules, dist) does not.
  const dirty = git(dir, 'status', '--porcelain', '--untracked-files=all').trim();
  if (dirty) errors.push(`gev not clean:\n${dirty}`);
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errs = checkImmutable(process.argv[2] ? resolve(process.argv[2]) : undefined);
  if (errs.length) {
    console.error('IMMUTABILITY FAIL\n' + errs.join('\n'));
    process.exit(1);
  }
  console.log('immutability OK');
}
