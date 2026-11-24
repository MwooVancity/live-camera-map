// The scaffold (plan item 28 stage 4): copies the template with names swapped, never overwrites, and is honest that it is unfinished.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { scaffold, CHECKLIST } from '../../ops/importers/new-source.mjs';

const REAL = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'scaffold-'));
  for (const f of ['ops/importers/nsw.mjs', 'ops/importers/lib/nsw.mjs', 'tests/registry/nsw.test.mjs', 'ops/importers/run-all.json']) { mkdirSync(join(root, dirname(f)), { recursive: true }); copyFileSync(join(REAL, f), join(root, f)); }
  return root;
}

test('scaffold writes three files and a run-all entry with the name swapped, each file starting with the TODO banner', () => {
  const root = sandbox();
  const out = scaffold('wsdot', { root, log: () => {} });
  assert.equal(out.length, 4);
  for (const f of ['ops/importers/wsdot.mjs', 'ops/importers/lib/wsdot.mjs', 'tests/registry/wsdot.test.mjs']) {
    const t = readFileSync(join(root, f), 'utf8');
    assert.ok(t.startsWith('// TODO(new-source)'), `${f} banner`);
    const body = t.split('\n').slice(1).join('\n'); // line 1 is the banner, which names the template on purpose
    assert.ok(!/\bnsw\b|\bNSW\b/.test(body.replace(/Transport for NSW|New South Wales/g, '')), `${f}: template name swapped`);
  }
  assert.ok(JSON.parse(readFileSync(join(root, 'ops/importers/run-all.json'), 'utf8')).importers.some((e) => e.id === 'wsdot' && e.script === 'wsdot.mjs'));
  execFileSync(process.execPath, ['--check', join(root, 'ops/importers/wsdot.mjs')]);
  execFileSync(process.execPath, ['--check', join(root, 'ops/importers/lib/wsdot.mjs')]);
});

test('scaffold refuses to overwrite and refuses a bad id', () => {
  const root = sandbox();
  scaffold('abcd', { root, log: () => {} });
  assert.throws(() => scaffold('abcd', { root, log: () => {} }), /already exists/);
  assert.throws(() => scaffold('Bad Id', { root, log: () => {} }), /short id/);
  assert.throws(() => scaffold('../x', { root, log: () => {} }), /short id/);
});

test('the checklist names every shared file a new source touched in the NSW commit', () => {
  const text = CHECKLIST('x').join('\n');
  for (const f of ['source-permissions.manual.json', 'registry.mjs', 'pages.mjs', 'Base.astro', 'PAGES.md', 'check.mjs', 'registry.test.mjs', 'rules.mjs', 'world-coverage.json']) assert.ok(text.includes(f), f);
});
