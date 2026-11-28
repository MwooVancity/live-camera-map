// Plan item 40 step 2: the scaffold also emits every shared-file edit as a reviewable patch; three licence fixtures (clean, missing, conflicting).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { generate, apply } from '../../ops/importers/new-source.mjs';
import { isEnabled, evidenceProblems } from '../licensing/gate.mjs';

const REAL = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHARED = ['ops/importers/nsw.mjs', 'ops/importers/lib/nsw.mjs', 'tests/registry/nsw.test.mjs', 'ops/importers/run-all.json', 'data/source-permissions.manual.json', 'data/world-coverage.json',
  'ops/importers/lib/registry.mjs', 'site/src/lib/pages.mjs', 'site/src/layouts/Base.astro', 'ops/health/check.mjs', 'site/PAGES.md', 'tests/registry/registry.test.mjs'];
const fx = (n) => JSON.parse(readFileSync(join(REAL, 'tests/licensing/fixtures', `evidence-${n}.json`), 'utf8'));
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'patch-'));
  for (const f of SHARED) { mkdirSync(join(root, dirname(f)), { recursive: true }); copyFileSync(join(REAL, f), join(root, f)); }
  return root;
}
const opts = (root, evidence, extra = {}) => ({ root, evidence, name: 'Example Highway Agency camera list', regionSlug: 'example-state', countrySlug: 'united-states', worldCountry: 'united-states-of-america', today: '2026-11-24', log: () => {}, ...extra });
const read = (root, f) => readFileSync(join(root, f), 'utf8');
const finish = (root, id, slug, rename = []) => { // what the agent does by hand before the merge: the real region slug (and, optionally, other export names)
  const f = join(root, 'ops/importers/lib', id + '.mjs'); let t = readFileSync(f, 'utf8').replace("slug: 'new-south-wales'", "slug: '" + slug + "'");
  for (const [a, b] of rename) t = t.split(a).join(b);
  writeFileSync(f, t);
};

test('clean licence: patch is emitted, applies to the real shared files, is idempotent, and the new row stays disabled', () => {
  const root = sandbox();
  const { patch } = generate('wsdot', opts(root, fx('clean'), { sourceId: 'wsdot-scaffold' }));
  assert.equal(patch.verdict, 'READY');
  const row = patch.edits.find((e) => e.file.endsWith('source-permissions.manual.json')).value;
  assert.deepEqual([row.commercialStatus, row.metadataPermission.status, row.imagePermission.status, row.needsHumanReview, row.mustNotShip], ['unverified', 'unverified', 'unverified', true, true]);
  assert.ok(!JSON.stringify(row).includes('"allowed"'), 'never allowed');
  assert.ok(!JSON.parse(read(root, 'ops/importers/run-all.json')).importers.some((e) => e.id === 'wsdot'), 'run-all.json is shared: only the patch adds it');
  assert.throws(() => apply('wsdot', { root, log: () => {} }), /region slug "new-south-wales".*already used by nsw.mjs/, 'an unfinished scaffold carries the template slug');
  finish(root, 'wsdot', 'example-state', [['WSDOT_REGION', 'WS_REGION']]);
  for (const r of apply('wsdot', { root, log: () => {} })) assert.ok(/^applied|row not found/.test(r.status), `${r.file}: ${r.status}`);
  for (const r of apply('wsdot', { root, log: () => {} })) assert.ok(/already applied|row not found/.test(r.status), `second run ${r.file}: ${r.status}`);
  const rows = JSON.parse(read(root, 'data/source-permissions.manual.json')).sources;
  const got = rows.find((r) => r.id === 'wsdot-scaffold');
  assert.equal(isEnabled(got, new Date('2026-11-25')), false, 'generated-but-unreviewed source stays disabled');
  assert.deepEqual(evidenceProblems(got, []), []);
  assert.equal(rows.filter((r) => r.id === 'wsdot-scaffold').length, 1);
  for (const f of ['ops/importers/lib/registry.mjs', 'site/src/lib/pages.mjs', 'ops/health/check.mjs']) execFileSync(process.execPath, ['--check', join(root, f)]);
  assert.match(read(root, 'ops/importers/lib/registry.mjs'), /\[WS_REGION\.slug\]: WSDOT_COUNTRY/);
  assert.match(read(root, 'ops/health/check.mjs'), /'wsdot-scaffold': \{ skip: 'unreviewed-scaffold' \}/);
  const base = read(root, 'site/src/layouts/Base.astro');
  assert.match(base, /src_wsdot = sourceOf\('wsdot-scaffold'\); \/\/ attribution lines/);
  assert.match(base, /\|\| src_wsdot\) && <> Credits for/);
  assert.match(base, /, src_wsdot\]\.filter\(Boolean\)/);
  assert.match(read(root, 'site/PAGES.md'), /`\/cameras\/united-states\/example-state\/` Beats Argos by: TODO\(new-source\)[\s\S]*Helpful: TODO[\s\S]*HCU: TODO/);
  assert.match(JSON.parse(read(root, 'data/world-coverage.json')).rows.find((r) => r.country === 'united-states-of-america').next, /^SCAFFOLDED 2026-11-24 \(wsdot, READY/);
  assert.ok(!/wsdot/.test(read(root, 'tests/registry/registry.test.mjs')), 'import-stage edits wait for the first import');
  apply('wsdot', { root, stage: 'import', log: () => {} });
  assert.match(read(root, 'tests/registry/registry.test.mjs'), /'wsdot-scaffold'\)\.sort\(\)/);
  assert.match(read(root, 'tests/registry/registry.test.mjs'), /'wsdot-scaffold'\]\.reduce/);
  execFileSync(process.execPath, ['--check', join(root, 'tests/registry/registry.test.mjs')]);
  assert.ok(JSON.parse(read(root, 'ops/importers/run-all.json')).importers.some((e) => e.id === 'wsdot'));
});

test('missing licence evidence: rejected, nothing written', () => {
  for (const bad of [{}, { ...fx('clean'), statements: [], metadata: { status: 'unverified', quote: '', url: '' } }, { ...fx('clean'), robots: { result: 'blocked', url: 'x' } }]) {
    const root = sandbox();
    assert.throws(() => generate('oregon', opts(root, bad)), /REJECT/);
    assert.ok(!existsSync(join(root, 'ops/importers/oregon.mjs')) && !existsSync(join(root, 'ops/importers/patches')), 'nothing written');
  }
});

test('conflicting licence (Spain DGT): HOLD patch quoting both sentences, row closed', () => {
  const root = sandbox();
  const { patch } = generate('dgt', opts(root, fx('dgt'), { sourceId: 'dgt-spain', regionSlug: 'spain-national', countrySlug: 'spain' }));
  assert.equal(patch.verdict, 'HOLD');
  const row = patch.edits.find((e) => e.file.endsWith('source-permissions.manual.json')).value;
  assert.match(row.licence, /Creative Commons Attribution/);
  assert.match(row.licence, /comercializacion o transformacion no autorizadas/);
  assert.match(row.statusReason, /^HOLD: CONFLICT/);
  assert.equal(row.mustNotShip, true);
  assert.equal(isEnabled(row, new Date('2026-11-25')), false);
  assert.equal(patch.conflicts.length, 1);
});

test('bad names and slugs cannot reach code', () => {
  const root = sandbox();
  assert.throws(() => generate('abcd', opts(root, fx('clean'), { name: "x'); process.exit(1); //" })), /name/);
  assert.throws(() => generate('abcd', opts(root, fx('clean'), { regionSlug: "a'b" })), /regionSlug/);
  assert.ok(!existsSync(join(root, 'ops/importers/abcd.mjs')));
});

test('A13: the copied importer, library and test use the same source id as the patch (no template id left behind)', () => {
  for (const extra of [{ sourceId: 'wsdot-cameras' }, {}]) {
    const root = sandbox();
    const { patch } = generate('wsdot', opts(root, fx('clean'), extra));
    assert.equal(patch.sourceId, 'wsdot-cameras');
    const files = ['ops/importers/wsdot.mjs', 'ops/importers/lib/wsdot.mjs', 'tests/registry/wsdot.test.mjs'].map((f) => read(root, f));
    assert.match(files[0], /s\.id === 'wsdot-cameras'/);
    assert.match(files[0], /sourceId: 'wsdot-cameras', sourceRow/);
    assert.match(files[1], /sourceId: 'wsdot-cameras'/);
    assert.match(files[1], /`wsdot-cameras-\$\{/);
    for (const t of files) assert.ok(!/wsdot-live-traffic/.test(t), 'the template id (swapped to wsdot-live-traffic) is gone');
  }
});
