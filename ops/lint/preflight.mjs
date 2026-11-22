// Preflight: run before every push. Fails on invalid workflow YAML, a `uses:` action tag that does not exist,
// and an nginx `add_header` inside an `if` (the three bugs that cost ~10 CI reruns in Session 3).
// Usage: node ops/lint/preflight.mjs   (needs python3 with PyYAML, and git + network for tag checks; --offline skips tags)
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const offline = process.argv.includes('--offline');
const py = process.platform === 'win32' ? 'python' : 'python3';
const errors = [];
const dir = '.github/workflows';
const files = readdirSync(dir).filter((f) => f.endsWith('.yml'));

const tmp = mkdtempSync(join(tmpdir(), 'preflight-'));
const pyFile = join(tmp, 'y.py');
writeFileSync(pyFile, 'import sys,yaml\nyaml.safe_load(open(sys.argv[1],encoding="utf8"))\n');

const tagCache = new Map();
function tagExists(repo, tag) {
  const k = `${repo}@${tag}`;
  if (tagCache.has(k)) return tagCache.get(k);
  let ok = false;
  try {
    const out = execFileSync('git', ['ls-remote', '--tags', '--heads', `https://github.com/${repo}.git`, tag, `${tag}^{}`], { encoding: 'utf8', timeout: 30000 });
    ok = out.trim().length > 0;
  } catch { ok = false; }
  tagCache.set(k, ok);
  return ok;
}

for (const f of files) {
  const p = `${dir}/${f}`;
  try { execFileSync(py, ['-I', pyFile, p], { stdio: 'pipe' }); }
  catch (e) { errors.push(`${p}: invalid YAML: ${String(e.stderr).trim().split('\n').pop()}`); continue; }
  if (offline) continue;
  for (const m of readFileSync(p, 'utf8').matchAll(/uses:\s*([\w.-]+\/[\w.-]+)(?:\/[\w./-]+)?@([\w.-]+)/g)) {
    if (!tagExists(m[1], m[2])) errors.push(`${p}: action ${m[1]}@${m[2]} does not exist`);
  }
}

// nginx: add_header is not allowed inside `if` at server level.
for (const f of readdirSync('ops/proxy').filter((x) => x.endsWith('.conf'))) {
  const t = readFileSync(`ops/proxy/${f}`, 'utf8');
  for (const m of t.matchAll(/\bif\s*\([^)]*\)\s*\{([^}]*)\}/g)) {
    if (/add_header/.test(m[1])) errors.push(`ops/proxy/${f}: add_header inside an if block (nginx rejects it)`);
  }
}

if (errors.length) { console.error('PREFLIGHT FAIL\n' + errors.join('\n')); process.exit(1); }
console.log(`PREFLIGHT OK (${files.length} workflows${offline ? ', tags not checked' : ''})`);
