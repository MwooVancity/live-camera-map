// Worldwide hunt ledger gate (plan item 36 P0-3): no country is ever left without a named next action, and a built row has cameras.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const j = JSON.parse(readFileSync(new URL('../../data/world-coverage.json', import.meta.url), 'utf8'));
const STATUS = ['built', 'partial', 'small', 'blocked', 'not-investigated'];

test('every country row has a known status and no duplicates', () => {
  assert.equal(new Set(j.rows.map((r) => r.country)).size, j.rows.length, 'duplicate country row');
  for (const r of j.rows) assert.ok(STATUS.includes(r.status), `${r.country}: status ${r.status}`);
});

test('every row that is not built names its next action (a blocked or uninvestigated country is never a dead end)', () => {
  const bad = j.rows.filter((r) => r.status !== 'built' && !(typeof r.next === 'string' && r.next.length >= 20)).map((r) => r.country);
  assert.deepEqual(bad, [], `no next action: ${bad.join(', ')}`);
});

test('a row marked built or partial has cameras of ours (small means a small lead we have not built)', () => {
  const bad = j.rows.filter((r) => ['built', 'partial'].includes(r.status) && !(r.ourCameras > 0)).map((r) => `${r.country}:${r.ourCameras}`);
  assert.deepEqual(bad, [], `status says we have cameras but ourCameras is 0: ${bad.join(', ')}`);
});
