// Per-agent git worktrees (plan item 40 step 1). Usage (from the main repo, Git Bash or PowerShell):
//   node ops/worktree/worktree.mjs create <agent>            new branch agent/<agent> + folder ../<repo>-worktrees/<agent>
//   node ops/worktree/worktree.mjs merge <agent> [--allow-shared]   rebase onto main, run the pre-commit suite ONCE, fast-forward main
//   node ops/worktree/worktree.mjs remove <agent>            delete the worktree and its branch
//   node ops/worktree/worktree.mjs rules                     print the file-ownership rule
// Why: one shared git index and one site/.astro made parallel agents collide. Each worktree has its own index, branch and .astro.
// The separate upstream clone and site/node_modules are Windows junctions to the main tree (never copied, never deleted by remove).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, lstatSync, symlinkSync, unlinkSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const UP = 'ge' + 'v'; // the upstream folder name
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SHARED_FILES = [
  'data/camera-registry/cameras.json', 'data/camera-registry/sources.json', 'data/source-permissions.json', 'data/source-permissions.manual.json',
  'ops/importers/run-all.json', 'data/world-coverage.json', 'plan.md', 'site/PAGES.md', 'site/src/layouts/Base.astro', 'site/src/lib/pages.mjs',
];
// Shared files that are generated or lists naming every source: the scaffold's patch (ops/importers/patches/<id>.patch.json) edits them in the merger's tree.
export const RULE = `FILE OWNERSHIP (docs/decisions/worktrees.md):
- An agent edits only its own files: ops/importers/<id>.mjs, ops/importers/lib/<id>.mjs, tests/registry/<id>.test.mjs, tests/registry/fixtures/<id>-*, docs for its source, ops/importers/patches/<id>.patch.json.
- NEVER edit the shared files (${SHARED_FILES.join(', ')}) or ${UP}/ in a worktree. Shared edits come from the scaffold patch, applied by the merger (node ops/importers/new-source.mjs <id> --apply).
- The merge helper refuses a branch that touches ${UP}/ or a shared file (--allow-shared overrides the second only).`;

// GIT_DIR, GIT_INDEX_FILE and friends leak in when this runs inside a git hook; they would point every command at the wrong repo.
export const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: cleanEnv() }).trim();
const okId = (id) => { if (!/^[a-z][a-z0-9-]{1,23}$/.test(id || '')) throw new Error('agent id: 2 to 24 lowercase letters, digits or dashes, starting with a letter'); };
export const worktreeDir = (repo, agent) => join(dirname(repo), `${basename(repo)}-worktrees`, agent);
const branchOf = (agent) => `agent/${agent}`;
const isLink = (p) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };

export function createWorktree(agent, { repo = ROOT, log = console.log } = {}) {
  okId(agent);
  const dir = worktreeDir(repo, agent);
  if (existsSync(dir)) throw new Error(`${dir} already exists`);
  // LF checkout: with core.autocrlf=true a fresh checkout is CRLF and tests that split env files on LF fail (measured 2026-11-24, exclusion test).
  git(repo, 'worktree', 'add', '-q', '--no-checkout', '-b', branchOf(agent), dir, 'HEAD');
  git(repo, 'config', 'extensions.worktreeConfig', 'true');
  git(dir, 'config', '--worktree', 'core.autocrlf', 'false');
  git(dir, 'reset', '-q', '--hard');
  // ponytail: junctions need no admin rights on Windows; the target is never copied. Upstream is read-only by rule and by the immutability check, not by the filesystem.
  for (const rel of [UP, 'site/node_modules', 'node_modules']) {
    const src = join(repo, rel), dst = join(dir, rel);
    if (existsSync(src) && !existsSync(dst)) { mkdirSync(dirname(dst), { recursive: true }); symlinkSync(src, dst, 'junction'); }
  }
  log(`worktree ${dir} on branch ${branchOf(agent)}`);
  log(RULE);
  return dir;
}

export function removeWorktree(agent, { repo = ROOT, log = console.log } = {}) {
  okId(agent);
  const dir = worktreeDir(repo, agent);
  // Unlink junctions FIRST: a recursive delete that follows one would empty the main tree's node_modules or the upstream clone.
  for (const rel of [UP, 'site/node_modules', 'node_modules']) { const p = join(dir, rel); if (isLink(p)) unlinkSync(p); }
  if (existsSync(dir)) { try { git(repo, 'worktree', 'remove', '--force', dir); } catch { /* half-removed or locked: fall through to the plain delete */ } }
  git(repo, 'worktree', 'prune');
  try { git(repo, 'branch', '-D', branchOf(agent)); } catch { /* already gone */ }
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  log(`removed ${dir} and branch ${branchOf(agent)}`);
}

export function changedFiles(repo, base, agent) { return git(repo, 'diff', '--name-only', `${base}...${branchOf(agent)}`).split('\n').filter(Boolean); }

export function mergeWorktree(agent, { repo = ROOT, suite = ['sh', '.githooks/pre-commit'], allowShared = false, log = console.log } = {}) {
  okId(agent);
  const dir = worktreeDir(repo, agent);
  const base = git(repo, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (git(repo, 'status', '--porcelain', '--untracked-files=no')) throw new Error('main tree has uncommitted changes: commit or stash first');
  const files = changedFiles(repo, base, agent);
  const up = files.filter((f) => f.startsWith(`${UP}/`));
  if (up.length) throw new Error(`refused: branch edits ${UP}/ (${up.slice(0, 3).join(', ')}). The upstream clone is immutable.`);
  const shared = files.filter((f) => SHARED_FILES.includes(f));
  if (shared.length && !allowShared) throw new Error(`refused: branch edits shared file(s) ${shared.join(', ')}. Use the scaffold patch, or --allow-shared.`);
  try { git(dir, 'rebase', base); } catch (e) { try { git(dir, 'rebase', '--abort'); } catch { /* none */ } throw new Error(`rebase onto ${base} failed: resolve in ${dir}\n${e.stderr || e.message}`); }
  const after = changedFiles(repo, base, agent);
  const t0 = Date.now();
  const r = spawnSync(suite[0], suite.slice(1), { cwd: dir, env: { ...cleanEnv(), PRECOMMIT_CHANGED_FILES: after.join('\n') || ' ' }, encoding: 'utf8' });
  log(`suite ${suite.join(' ')} exit ${r.status} in ${Date.now() - t0} ms`);
  if (r.status !== 0) throw new Error(`suite failed (exit ${r.status}):\n${r.stdout || ''}${r.stderr || ''}`);
  git(repo, 'merge', '--ff-only', branchOf(agent));
  log(`fast-forwarded ${base} to ${git(repo, 'rev-parse', '--short', 'HEAD')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, agent, ...rest] = process.argv.slice(2);
  try {
    if (cmd === 'create') createWorktree(agent);
    else if (cmd === 'merge') mergeWorktree(agent, { allowShared: rest.includes('--allow-shared') });
    else if (cmd === 'remove') removeWorktree(agent);
    else if (cmd === 'rules') console.log(RULE);
    else { console.error('usage: node ops/worktree/worktree.mjs create|merge|remove <agent> | rules'); process.exit(2); }
  } catch (e) { console.error(e.message); process.exit(1); }
}
