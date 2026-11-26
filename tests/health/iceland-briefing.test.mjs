// Run: node --test tests/health/iceland-briefing.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { icelandBriefing } from '../../site/src/lib/iceland-briefing.mjs';

const perms = JSON.parse(readFileSync(new URL('../../data/source-permissions.json', import.meta.url), 'utf8'));
const row = perms.sources.find((s) => s.id === 'iceland-road-cameras');
const NOW = new Date('2026-11-25T12:00:00Z');
const mk = (id, name) => ({ id, name, sourceId: 'iceland-vegagerdin', locationText: 'Station: A.', lastSeen: '2026-11-24T02:00:00Z', officialUrl: 'https://x/' + id });
const cams = [mk('a', 'A'), mk('b', 'B'), mk('c', 'C'), mk('d', 'D'), { ...mk('z', 'Z'), sourceId: 'other' }];
const rec = (status, o = {}) => ({ status, lastChecked: '2026-11-25T10:00:00Z', ...o });
const health = (o = {}) => ({ runOk: true, generatedAt: '2026-11-25T10:00:00Z', cameras: { a: rec('reachable', { lastChanged: '2026-11-25T08:00:00Z' }), b: rec('unavailable', { consecutiveFailures: 3 }), c: rec('reachable', { lastChanged: '2026-11-20T08:00:00Z' }) }, ...o });

test('real licence row exists and is open', () => assert.equal(icelandBriefing({ cams, health: null, row, now: NOW }).state, 'registry only'));
test('counts, changed in 24 h, failed; other sources ignored; unrecorded camera is unknown', () => {
  const b = icelandBriefing({ cams, health: health(), row, now: NOW });
  assert.equal(b.state, 'checked');
  assert.equal(b.total, 4);
  assert.deepEqual(b.counts, { reachable: 2, stale: 0, unavailable: 1, unknown: 1 });
  assert.deepEqual(b.changed.map((x) => x.c.id), ['a']);
  assert.deepEqual(b.failed.map((x) => x.c.id), ['b']);
});
test('closed licence row shows nothing', () => {
  assert.equal(icelandBriefing({ cams, health: health(), row: { ...row, mustNotShip: true }, now: NOW }).state, 'licence not enabled');
  assert.equal(icelandBriefing({ cams, health: health(), row: undefined, now: NOW }).state, 'licence not enabled');
});
test('health older than 24 h, missing, or incomplete: registry only, no counts', () => {
  for (const h of [health({ generatedAt: '2026-11-24T10:00:00Z' }), null, health({ runOk: false })]) {
    const b = icelandBriefing({ cams, health: h, row, now: NOW });
    assert.equal(b.state, 'registry only'); assert.equal(b.counts, undefined); assert.equal(b.total, 4);
  }
});
test('a camera whose own check is over 48 h old is unknown, not changed or failed', () => {
  const h = health(); h.cameras.a = rec('reachable', { lastChecked: '2026-11-20T10:00:00Z', lastChanged: '2026-11-25T08:00:00Z' });
  const b = icelandBriefing({ cams, health: h, row, now: NOW });
  assert.equal(b.counts.unknown, 2); assert.equal(b.changed.length, 0);
});
test('page is noindex, has the Beats Argos line; credit comes from the row', () => {
  const p = readFileSync(new URL('../../site/src/pages/briefing/iceland.astro', import.meta.url), 'utf8');
  assert.match(p, /noindex=\{true\}/); assert.match(p, /Beats Argos by:/);
  assert.match(icelandBriefing({ cams, health: null, row, now: NOW }).attribution, /CC BY 4\.0/);
});
