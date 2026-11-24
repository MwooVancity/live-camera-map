// Plan item 28 stage 3 (first guard): an importer script nobody runs is a source that silently goes stale.
// Every ops/importers/*.mjs must be in ops/importers/run-all.json or in the reviewed EXEMPT list below with its reason.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlan } from '../../ops/importers/run-all.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'ops', 'importers');
const EXEMPT = {
  'run-all.mjs': 'the runner itself',
  'caltrans.mjs': 'large static list, imported by hand (3,263 cameras; its conditions feed is in run-all)',
  'digitraffic.mjs': 'imported by hand, 1 request a minute pace on its pictures',
  'drivebc.mjs': 'camera list imported by hand; only its events part runs every deploy (drivebc-events)',
  'quebec.mjs': 'imported by hand (list changes rarely)',
};

test('every importer script is run by run-all.json or exempt with a reason', () => {
  const planned = new Set(loadPlan().map((e) => e.script));
  const scripts = readdirSync(DIR).filter((f) => f.endsWith('.mjs'));
  const missing = scripts.filter((f) => !planned.has(f) && !EXEMPT[f]);
  assert.deepEqual(missing, [], `importer(s) not in run-all.json and not exempt: ${missing.join(', ')}`);
});

test('an exempt importer does not also sit in run-all.json (one place per importer), and every exempt file exists', () => {
  const planned = new Set(loadPlan().filter((e) => !(e.args || []).length).map((e) => e.script));
  const scripts = new Set(readdirSync(DIR));
  for (const f of Object.keys(EXEMPT)) { assert.ok(scripts.has(f), `${f} exists`); assert.ok(!planned.has(f), `${f} is both exempt and planned`); }
});

test('the deploy workflows start importers only through run-all (a hand-written importer line would be swallowed by `|| echo` again)', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['production.yml', 'staging.yml']) {
    const t = readFileSync(join(DIR, '..', '..', '.github', 'workflows', f), 'utf8');
    const direct = t.split('\n').filter((l) => /ops\/importers\/(?!run-all)[a-z-]+\.mjs/.test(l));
    assert.deepEqual(direct, [], `${f} calls an importer directly`);
    assert.ok(t.includes('node ops/importers/run-all.mjs'), `${f} runs the runner`);
  }
});
