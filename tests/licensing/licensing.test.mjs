// Run: node --test tests/licensing/licensing.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEnabled } from './gate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { sources } = JSON.parse(readFileSync(resolve(root, 'data/source-permissions.json'), 'utf8'));
const good = {
  commercialStatus: 'allowed_per_doc',
  attribution: 'NOAA',
  provenance: 'gev/DATA_SOURCES.md:20',
  licence: 'U.S. public domain',
  reviewedAt: '2026-11-21',
  mustNotShip: false,
};
const today = new Date('2026-11-22');

test('gate: good entry passes (control)', () => assert.equal(isEnabled(good, today), true));
test('gate: unknown fails closed', () => assert.equal(isEnabled({ ...good, commercialStatus: 'unknown' }, today), false));
test('gate: restricted fails', () => assert.equal(isEnabled({ ...good, commercialStatus: 'restricted' }, today), false));
test('gate: missing attribution fails', () => assert.equal(isEnabled({ ...good, attribution: '' }, today), false));
test('gate: missing provenance fails', () => assert.equal(isEnabled({ ...good, provenance: '' }, today), false));
test('gate: missing licence fails', () => assert.equal(isEnabled({ ...good, licence: '' }, today), false));
test('gate: expired review fails', () => assert.equal(isEnabled({ ...good, reviewedAt: '2026-01-01' }, today), false));
test('gate: garbage review date fails', () => assert.equal(isEnabled({ ...good, reviewedAt: 'soon' }, today), false));
test('gate: mustNotShip fails even if permissive', () => assert.equal(isEnabled({ ...good, mustNotShip: true }, today), false));
test('gate: undefined entry fails', () => assert.equal(isEnabled(undefined, today), false));

test('inventory: has rows', () => assert.ok(sources.length > 200, `only ${sources.length} rows`));
test('inventory: stored enabled flag matches the gate (no hand edits)', () => {
  const bad = sources.filter((s) => s.enabled !== isEnabled(s, new Date(s.reviewedAt)));
  assert.deepEqual(bad.map((s) => s.id), []);
});
test('inventory: nothing unknown or restricted is enabled', () => {
  assert.deepEqual(sources.filter((s) => s.enabled && s.commercialStatus !== 'allowed_per_doc').map((s) => s.id), []);
});
test('inventory: every enabled source has attribution, provenance, review date', () => {
  const bad = sources.filter((s) => s.enabled && !(s.attribution && s.provenance && s.reviewedAt));
  assert.deepEqual(bad.map((s) => s.id), []);
});
test('inventory: ids are unique', () => {
  const ids = sources.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

// Sources the owner named as restricted must exist in the inventory and be disabled.
const NAMED = [
  ['OpenSky', /opensky/i],
  ['FL511', /fl511/i],
  ['NYC DOT', /nyc dot/i],
  ['Houston TranStar', /transtar/i],
  ['S2 GhostMaps', /ghostmaps/i],
  ['Google News RSS', /google news/i],
  ['iNaturalist', /inaturalist/i],
  ['TeleGeography', /telegeography/i],
  ['Bhote Koshi pack', /bhote koshi/i],
];
for (const [label, re] of NAMED) {
  test(`named restricted source is present and disabled: ${label}`, () => {
    const hits = sources.filter((s) => re.test(s.name));
    assert.ok(hits.length > 0, `${label} missing from inventory`);
    for (const h of hits) {
      assert.equal(h.enabled, false, `${h.id} enabled`);
      assert.equal(h.commercialStatus, 'restricted', `${h.id} status ${h.commercialStatus}`);
    }
  });
}
test('TeleGeography and Bhote Koshi are flagged mustNotShip', () => {
  for (const re of [/telegeography/i, /bhote koshi/i]) {
    for (const h of sources.filter((s) => re.test(s.name))) assert.equal(h.mustNotShip, true, h.id);
  }
});

// Bundled datasets: every folder on disk must be covered by an inventory row (a dataset nobody listed is the risk).
test('every bundled data folder on disk has an inventory row', () => {
  const dirs = readdirSync(resolve(root, 'gev/src/data/local_data'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const events = readdirSync(resolve(root, 'gev/public/events'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const uncovered = [...dirs, ...events].filter((d) => !sources.some((s) => (s.folder || '').includes(d)));
  assert.deepEqual(uncovered, []);
});
test('every config/cctv_sources pack on disk is accounted for', () => {
  const files = readdirSync(resolve(root, 'gev/config')).filter((f) => f.startsWith('cctv_sources.'));
  assert.ok(files.length > 0);
  const text = JSON.stringify(sources).toLowerCase();
  const missing = files.filter((f) => !text.includes(f.replace('cctv_sources.', '').replace('.json', '').toLowerCase()));
  assert.deepEqual(missing, []);
});
test('source doc and csv exist', () => {
  assert.ok(existsSync(resolve(root, 'docs/source-audits/source-inventory.csv')));
});
