// Plan item 40 step 3: the licence-evidence validator. Real cases (Spain DGT, Madrid Calle 30) must HOLD; READY needs a human decision.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, template } from '../../ops/audit/licence-evidence.mjs';

const fx = (n) => JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', `evidence-${n}.json`), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));

test('DGT: CC BY tag on the dataset page vs the legal notice on unauthorised commercialisation is HOLD with both sentences', () => {
  const v = validate(fx('dgt'));
  assert.equal(v.verdict, 'HOLD');
  assert.equal(v.conflicts.length, 1);
  assert.match(v.conflicts[0].permits.quote, /Creative Commons Attribution/);
  assert.match(v.conflicts[0].restricts.quote, /comercializacion/);
  assert.ok(v.reasons.some((r) => /CONFLICT/.test(r) && /Creative Commons/.test(r) && /comercializacion/.test(r)));
});

test('Madrid Calle 30: mc30.es notice vs the CC BY tag is HOLD', () => {
  const v = validate(fx('madrid-calle30'));
  assert.equal(v.verdict, 'HOLD');
  assert.equal(v.conflicts.length, 1);
  assert.match(v.conflicts[0].restricts.url, /mc30\.es\/aviso-legal/);
});

test('a clean fixture is READY only with a recorded human decision', () => {
  const r = fx('clean');
  assert.equal(validate(r).verdict, 'READY');
  const pending = clone(r); pending.humanDecision = { decision: 'pending', by: '', at: '', note: '' };
  assert.equal(validate(pending).verdict, 'HOLD');
  const noName = clone(r); noName.humanDecision.by = '';
  assert.equal(validate(noName).verdict, 'HOLD');
});

test('robots disallowed is REJECT; a human reject is REJECT; restricted metadata is REJECT', () => {
  const a = clone(fx('clean')); a.robots.result = 'blocked'; assert.equal(validate(a).verdict, 'REJECT');
  const b = clone(fx('clean')); b.humanDecision.decision = 'reject'; assert.equal(validate(b).verdict, 'REJECT');
  const c = clone(fx('clean')); c.metadata.status = 'restricted'; assert.equal(validate(c).verdict, 'REJECT');
});

test('never READY without a quoted metadata sentence, even with an approval', () => {
  for (const bad of ['', 'TODO', 'n/a', 'short']) { const r = clone(fx('clean')); r.metadata.quote = bad; assert.equal(validate(r).verdict, 'HOLD', `quote "${bad}"`); }
  const r = clone(fx('clean')); r.metadata.url = ''; assert.equal(validate(r).verdict, 'HOLD');
  assert.equal(validate(template('x')).verdict, 'HOLD');
});

test('unverified fields, a 403 bot check and a missing rate limit each HOLD; image rights may stay unverified', () => {
  const edits = [(r) => { r.ads.status = 'unverified'; }, (r) => { r.botCheck = { result: 'blocked', httpStatus: 403, checkedAt: '2026-11-24' }; }, (r) => { r.rateLimit.value = 'unverified'; }, (r) => { r.robots.result = 'unverified'; }, (r) => { r.evidenceDate = ''; }, (r) => { r.access.keyOrRegistration = 'unverified'; }];
  for (const e of edits) { const r = clone(fx('clean')); e(r); assert.equal(validate(r).verdict, 'HOLD'); }
  assert.equal(fx('clean').imageRights.status, 'unverified');
  assert.equal(validate(fx('clean')).verdict, 'READY');
});
