// Proves preflight can fail: run it in a throwaway copy with a broken workflow and a fake action tag.
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const script = resolve('ops/lint/preflight.mjs');
function run(files, args = []) {
  const d = mkdtempSync(join(tmpdir(), 'pf-'));
  mkdirSync(join(d, '.github/workflows'), { recursive: true });
  mkdirSync(join(d, 'ops/proxy'), { recursive: true });
  for (const [n, c] of Object.entries(files)) writeFileSync(join(d, n), c);
  return spawnSync('node', [script, ...args], { cwd: d, encoding: 'utf8' });
}

test('good workflow passes (offline)', () => {
  assert.strictEqual(run({ '.github/workflows/a.yml': 'name: a\non: push\njobs: {}\n' }, ['--offline']).status, 0);
});
test('unquoted colon in step name fails', () => {
  const bad = 'name: a\non: push\njobs:\n  j:\n    runs-on: x\n    steps:\n      - name: Trivy: vulns\n        run: echo\n';
  assert.strictEqual(run({ '.github/workflows/a.yml': bad }, ['--offline']).status, 1);
});
const online = spawnSync('git', ['ls-remote', '--tags', 'https://github.com/actions/checkout.git', 'v4'], { encoding: 'utf8', timeout: 30000 }).stdout.includes('v4');
const wf = (ref) => ['name: a', 'on: push', 'jobs:', '  j:', '    runs-on: x', '    steps:', '      - uses: ' + ref, ''].join(String.fromCharCode(10));
test('B14 online control: an existing action tag passes', { skip: !online && 'github.com unreachable: online checks skipped' }, () => {
  const r = run({ '.github/workflows/a.yml': wf('actions/checkout@v4') });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});
test('nonexistent action tag fails with "does not exist" (needs the online control to hold)', { skip: !online && 'github.com unreachable: a failure here would only prove the network is down' }, () => {
  const r = run({ '.github/workflows/a.yml': wf('actions/checkout@v999') });
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /does not exist/);
});
test('B9 a 40-character commit SHA pin passes the check', { skip: !online && 'github.com unreachable' }, () => {
  const r = run({ '.github/workflows/a.yml': wf('actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4') });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});
test('add_header inside if fails', () => {
  const r = run({ '.github/workflows/a.yml': 'name: a\non: push\njobs: {}\n', 'ops/proxy/x.conf': 'server { if ($a) { add_header X 1; return 403; } }' }, ['--offline']);
  assert.strictEqual(r.status, 1);
});
