// Code review 2026-11-25 batch A: A3 (permission-evidence derive) and A4 (licence-evidence validate). Run: node --test tests/registry/review-a-audit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { derive } from '../../ops/audit/permission-evidence.mjs';
import { validate, template, VERDICT } from '../../ops/audit/licence-evidence.mjs';

const row = (o = {}) => ({ commercialStatus: 'allowed_per_doc', provenance: 'https://example.org/licence', licence: 'Data is free to reuse for any purpose, including commercial.', ...o });

test('A3: a quote that forbids use is never "allowed"', () => {
  assert.equal(derive(row({ licence: 'The terms say "no commercial use of this data permitted".' })).metadataPermission.status, 'unverified');
  assert.equal(derive(row({ licence: 'Redistribution is "not permitted without prior written consent".' })).metadataPermission.status, 'unverified');
  assert.equal(derive(row()).metadataPermission.status, 'allowed');
  assert.equal(derive(row({ licence: 'Open licence with no restrictions on commercial use.' })).metadataPermission.status, 'allowed', '"no restrictions" is a permission');
  assert.equal(derive(row({ licence: 'NASA media, not subject to copyright in the United States.' })).metadataPermission.status, 'allowed');
});

test('A3: the quote must be backed by a URL or file reference, never by the first word of the provenance', () => {
  assert.equal(derive(row({ provenance: 'Read from the licence page' })).metadataPermission.status, 'unverified');
  assert.equal(derive(row({ provenance: 'gev/DATA_SOURCES.md:72' })).metadataPermission.url, 'gev/DATA_SOURCES.md:72');
  assert.equal(derive(row({ provenance: 'see https://example.org/terms, page 2' })).metadataPermission.url, 'https://example.org/terms');
});

test('A3: only per-doc or dated owner approval can be allowed', () => {
  assert.equal(derive(row({ commercialStatus: 'unknown' })).metadataPermission.status, 'unverified');
  assert.equal(derive(row({ commercialStatus: 'allowed_per_owner' })).metadataPermission.status, 'unverified');
});

const ready = () => {
  const p = (q) => ({ status: 'allowed', quote: q, url: 'https://example.org/t' });
  return { ...template('x'), dataOwner: { name: 'O', url: '' }, evidenceDate: '2026-11-25', statements: [],
    metadata: p('Names and locations may be published.'), commercialReuse: p('Commercial reuse is permitted.'), ads: p('Use on ad-supported sites is permitted.'), redistribution: p('Redistribution is permitted.'),
    attribution: { wording: 'W', url: '' }, access: { keyOrRegistration: false, note: '' }, rateLimit: { value: '60/min', url: '' }, robots: { result: 'allowed', url: '', checkedAt: '', note: '' },
    botCheck: { result: 'none', httpStatus: 200, checkedAt: '' }, stability: { value: 'stable', note: '' }, humanDecision: { decision: 'approve', by: 'm', at: '2026-11-25', note: '' } };
};

test('A4: the baseline record is READY', () => assert.equal(validate(ready()).verdict, VERDICT.READY));

test('A4: a restricting statement against an allowed field is a conflict (HOLD), even a short one', () => {
  const r = ready(); r.statements = [{ scope: 'commercialReuse', where: 'legal notice', url: 'https://example.org/n', quote: 'no commercial use', effect: 'restricts' }];
  const v = validate(r);
  assert.equal(v.verdict, VERDICT.HOLD);
  assert.equal(v.conflicts.length, 1);
});

test('A4: restricted commercialReuse or ads is REJECT', () => {
  for (const k of ['commercialReuse', 'ads']) { const r = ready(); r[k] = { status: 'restricted', quote: 'Not for commercial use.', url: 'https://example.org/t' }; assert.equal(validate(r).verdict, VERDICT.REJECT, k); }
});

test('A4: a misspelled statement effect is an error (HOLD), not silently ignored', () => {
  const r = ready(); r.statements = [{ scope: 'metadata', where: 'w', url: 'u', quote: 'Names and locations may be published.', effect: 'permit' }];
  const v = validate(r);
  assert.equal(v.verdict, VERDICT.HOLD);
  assert.ok(v.reasons.some((x) => /effect "permit"/.test(x)));
});
