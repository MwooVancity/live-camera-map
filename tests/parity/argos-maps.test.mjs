// Argos Maps product matrix gate (plan item 29): every row says what they offer, what GEV and we do, a status and a verdict.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const m = JSON.parse(readFileSync(resolve(root, 'data/argos-maps-matrix.json'), 'utf8'));
const STATUS = ['edge', 'parity', 'gap', 'skip'];

test('argos maps matrix: every row is complete and uses a known status', () => {
  assert.ok(m.rows.length >= 15, 'matrix has the feature rows');
  for (const r of m.rows) {
    for (const k of ['feature', 'argos', 'gev', 'us', 'status', 'verdict']) assert.ok(typeof r[k] === 'string' && r[k].length >= 2, `${r.feature}: ${k}`);
    assert.ok(STATUS.includes(r.status), `${r.feature}: status ${r.status}`);
  }
});

test('argos maps matrix: features that need stored or embedded pictures are skipped, never built', () => {
  for (const name of ['Recording and 24 h history', 'Videowall and TV mode', 'Camera API: embed']) {
    const r = m.rows.find((x) => x.feature.startsWith(name));
    assert.ok(r, `${name} row exists`);
    assert.equal(r.status, 'skip', `${name} must stay skipped (link-out only)`);
  }
});

test('argos maps matrix: a gap row names where its next step lives (plan item, file, or the blocker)', () => {
  for (const r of m.rows.filter((x) => x.status === 'gap')) assert.ok(/plan item|data\/|licence|backend|key|demand/i.test(r.verdict), `${r.feature}: gap without a named next step`);
});
