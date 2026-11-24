import test from 'node:test';
import assert from 'node:assert/strict';
import { stampFirstSeen } from '../../ops/importers/lib/runner.mjs';
import { validateCamera } from '../../ops/importers/lib/registry.mjs';

const cam = (id, lastSeen) => ({ id, sourceId: 's', name: 'n', road: '', direction: '', city: null, regionSlug: 'r', regionName: 'R', lat: 1, lon: 1, feedType: 'still', officialUrl: 'https://x/a.jpg', officialUrlLastVerified: null, lastSeen });

test('a camera seen before keeps its first-seen time; a new one starts now; old rows without the field fall back to their lastSeen', () => {
  const old = [{ ...cam('s-1', '2026-11-01T00:00:00Z'), firstSeen: '2026-10-01T00:00:00Z' }, cam('s-2', '2026-11-02T00:00:00Z')];
  const out = stampFirstSeen([cam('s-1', '2026-11-24T00:00:00Z'), cam('s-2', '2026-11-24T00:00:00Z'), cam('s-3', '2026-11-24T00:00:00Z')], old);
  assert.deepEqual(out.map((c) => c.firstSeen), ['2026-10-01T00:00:00Z', '2026-11-02T00:00:00Z', '2026-11-24T00:00:00Z']);
});

test('firstSeen must be a real date; a stamped camera is valid', () => {
  assert.deepEqual(validateCamera(stampFirstSeen([cam('s-1', '2026-11-24T00:00:00Z')], [])[0]), []);
  assert.ok(validateCamera({ ...cam('s-1', '2026-11-24T00:00:00Z'), firstSeen: 'yesterday' }).includes('bad firstSeen'));
});
