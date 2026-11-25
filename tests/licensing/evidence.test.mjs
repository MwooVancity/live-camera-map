// Plan item 36 P0-4: structured, gated licence evidence for metadata and images. Run: node --test tests/licensing/evidence.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEnabled, evidenceProblems, metadataOk } from './gate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const j = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const { sources } = j('data/source-permissions.json');
const manual = j('data/source-permissions.manual.json').sources;
const approvals = j('data/owner-approvals.json');
const today = new Date('2026-11-24');
const good = {
  id: 'x', commercialStatus: 'allowed_per_doc', attribution: 'NOAA', licence: 'U.S. public domain',
  provenance: 'https://example.gov/terms read 2026-11-24', reviewedAt: '2026-11-24', mustNotShip: false, enabled: true,
  metadataPermission: { status: 'allowed', quote: 'U.S. public domain', url: 'https://example.gov/terms' },
  imagePermission: { status: 'unverified', quote: '', url: '' },
};
const bad = (o) => evidenceProblems({ ...good, ...o });

test('control: a good row has no problems and is enabled', () => { assert.deepEqual(evidenceProblems(good), []); assert.equal(isEnabled(good, today), true); });
test('rule 1: metadata allowed needs a quote', () => assert.ok(bad({ metadataPermission: { ...good.metadataPermission, quote: '' } }).length));
test('rule 1: metadata allowed needs a url that appears in provenance', () => {
  assert.ok(bad({ metadataPermission: { ...good.metadataPermission, url: 'https://elsewhere.org/' } }).length);
  assert.ok(bad({ metadataPermission: { ...good.metadataPermission, url: '' } }).length);
});
test('rule 1: the quote must come from the row licence text', () => assert.ok(bad({ metadataPermission: { ...good.metadataPermission, quote: 'invented sentence' } }).length));
test('rule 2: image allowed needs quote and url, and an owner approval', () => {
  const img = { status: 'allowed', quote: 'U.S. public domain', url: 'https://example.gov/terms' };
  assert.ok(bad({ imagePermission: img }).some((p) => /owner/.test(p)), 'no owner approval');
  assert.deepEqual(evidenceProblems({ ...good, imagePermission: img }, ['x']), []);
  assert.ok(evidenceProblems({ ...good, imagePermission: { ...img, quote: '' } }, ['x']).length);
});
test('rule 2: no real row has image allowed unless data/owner-approvals.json lists it', () => {
  const ok = new Set(approvals.imageApprovals || []);
  assert.deepEqual(sources.filter((s) => s.imagePermission?.status === 'allowed' && !ok.has(s.id)).map((s) => s.id), []);
});
test('rule 3: metadata not allowed closes the gate (rows that carry the field)', () => {
  assert.equal(isEnabled({ ...good, metadataPermission: { status: 'unverified', quote: '', url: '' } }, today), false);
  assert.equal(isEnabled({ ...good, metadataPermission: { status: 'restricted', quote: '', url: '' } }, today), false);
  assert.equal(metadataOk({ ...good, metadataPermission: undefined }), true, 'a legacy row without the field is not changed');
});
test('rule 3: a grandfather flag needs a reason, and only opens an unverified (never restricted) row', () => {
  const u = { ...good, metadataPermission: { status: 'unverified', quote: '', url: '' } };
  assert.equal(isEnabled({ ...u, metadataGrandfather: { reason: 'owner approval 2026-11-24' } }, today), true);
  assert.equal(isEnabled({ ...u, metadataGrandfather: { reason: ' ' } }, today), false);
  assert.equal(isEnabled({ ...u, metadataPermission: { ...u.metadataPermission, status: 'restricted' }, metadataGrandfather: { reason: 'x' } }, today), false);
  assert.ok(evidenceProblems({ ...u, enabled: true }).length, 'an enabled unverified row with no grandfather reason is a defect');
});
test('rule 4: restricted and mustNotShip rows can never be allowed', () => {
  const s = { metadataPermission: { status: 'allowed', quote: 'U.S. public domain', url: 'https://example.gov/terms' } };
  assert.ok(bad({ commercialStatus: 'restricted', enabled: false, ...s }).length);
  assert.ok(bad({ mustNotShip: true, enabled: false, ...s }).length);
});
test('rule 5: imageStatus text and imagePermission.status agree', () => {
  assert.ok(bad({ imageStatus: 'unverified: nothing read', imagePermission: { status: 'allowed', quote: 'q', url: 'https://example.gov/terms' } }).length);
  assert.ok(bad({ imageStatus: 'allowed: x', imagePermission: { status: 'unverified', quote: '', url: '' } }).length);
  assert.deepEqual(bad({ imageStatus: 'unverified: nothing read' }), []);
});

test('real data: every row carries both fields and has no evidence problems', () => {
  const ok = approvals.imageApprovals || [];
  const all = sources.map((s) => [s.id, evidenceProblems(s, ok)]).filter(([, p]) => p.length);
  assert.deepEqual(all, []);
  assert.deepEqual(sources.filter((s) => !s.metadataPermission || !s.imagePermission).map((s) => s.id), []);
  assert.deepEqual(manual.filter((s) => !s.metadataPermission || !s.imagePermission).map((s) => s.id), [], 'manual file must carry the fields too');
});
test('real data: every restricted or mustNotShip row is restricted for metadata and images', () => {
  const r = sources.filter((s) => s.commercialStatus === 'restricted' || s.mustNotShip);
  assert.ok(r.length >= 16);
  assert.deepEqual(r.filter((s) => s.metadataPermission.status !== 'restricted' || s.imagePermission.status !== 'restricted').map((s) => s.id), []);
});
test('regression: every source enabled before P0-4 (295) is still enabled (new sources may be added, none closed)', () => {
  const base = j('tests/licensing/enabled-baseline.json');
  const now = new Set(sources.filter((s) => s.enabled).map((s) => s.id));
  assert.equal(base.ids.length, base.count);
  assert.deepEqual(base.ids.filter((id) => !now.has(id)), []);
});
