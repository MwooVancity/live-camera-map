// Immutability check for gev/. Exports checkImmutable(dir, baseFile). CLI: node tests/immutability/check.mjs [gevDir]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// GIT_* variables (GIT_DIR, GIT_INDEX_FILE) leak in from a commit hook in a linked worktree and would aim these commands at the outer repo.
const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const git = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', env: cleanEnv() });

const ALLOWED_IGNORED = /^(node_modules|dist|\.gev-cache|\.gev-logs)\/$/;

export function checkImmutable(dir = resolve(root, 'gev'), baseFile = resolve(root, 'ops/upstream-base.txt')) {
  const base = readFileSync(baseFile, 'utf8').trim().split(/\s+/)[0];
  const errors = [];
  if (!/^[0-9a-f]{40}$/.test(base)) errors.push(`bad base hash in ${baseFile}`);
  const head = git(dir, 'rev-parse', 'HEAD').trim();
  if (head !== base) errors.push(`HEAD ${head} != pinned ${base}`);
  // Untracked files count as dirty. Only the named build folders may be ignored (B1): ignore rules (info/exclude, gev's own .gitignore) must not hide edits.
  const dirty = git(dir, '-c', 'core.excludesFile=', 'status', '--porcelain', '--untracked-files=all', '--ignored=matching')
    .split('\n').filter((l) => l.trim() && !(l.startsWith('!! ') && ALLOWED_IGNORED.test(l.slice(3)))).join('\n');
  if (dirty) errors.push(`gev not clean:\n${dirty}`);
  // skip-worktree / assume-unchanged entries hide tracked edits from status.
  const hidden = git(dir, 'ls-files', '-v').split('\n').filter((l) => l && !l.startsWith('H '));
  if (hidden.length) errors.push(`hidden tracked files (skip-worktree/assume-unchanged):\n${hidden.join('\n')}`);
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
