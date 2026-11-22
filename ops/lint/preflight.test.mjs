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
test('nonexistent action tag fails', () => {
  const bad = 'name: a\non: push\njobs:\n  j:\n    runs-on: x\n    steps:\n      - uses: actions/checkout@v999\n';
  const r = run({ '.github/workflows/a.yml': bad });
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
});
test('add_header inside if fails', () => {
  const r = run({ '.github/workflows/a.yml': 'name: a\non: push\njobs: {}\n', 'ops/proxy/x.conf': 'server { if ($a) { add_header X 1; return 403; } }' }, ['--offline']);
  assert.strictEqual(r.status, 1);
});
