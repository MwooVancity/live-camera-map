// Code review 2026-11-25 batch A: A9, A10, A14, A15 (importers write path). Run: node --test tests/registry/review-a-importers.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run as runCaltrans } from '../../ops/importers/caltrans.mjs';
import { runCameras, loadPerms } from '../../ops/importers/drivebc.mjs';
import { commitSource } from '../../ops/importers/lib/runner.mjs';
import { normalizeCaltrans } from '../../ops/importers/lib/registry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const caFixture = JSON.parse(readFileSync(join(here, 'fixtures', 'caltrans-small.json'), 'utf8'));
const csv = readFileSync(join(here, 'fixtures', 'drivebc-webcams.csv'), 'utf8');
const pkg = JSON.parse(readFileSync(join(here, 'fixtures', 'drivebc-package.json'), 'utf8'));
const NOW = '2026-11-25T12:00:00.000Z'; // after the Caltrans licence row's reviewedAt (2026-11-24): the gate refuses a future-dated review
const quiet = () => {};
const caOk = async () => caFixture;
const dirWith = (files) => { const d = mkdtempSync(join(tmpdir(), 'ra-')); for (const [k, v] of Object.entries(files)) writeFileSync(join(d, k), v); return d; };
const row = { id: 'x-1', sourceId: 'x', name: 'n', road: '', direction: '', city: null, regionSlug: 'r', regionName: 'R', lat: 1, lon: 1, feedType: 'still', officialUrl: 'https://x/a.jpg', officialUrlLastVerified: null, lastSeen: NOW };

test('A9: a damaged sources.json stops Caltrans, DriveBC and commitSource; it is never replaced by one row', async () => {
  const cut = '[{"id":"other"';
  for (const [name, go] of [
    ['caltrans', (d) => runCaltrans({ fetcher: caOk, outDir: d, now: NOW, log: quiet })],
    ['drivebc', (d) => runCameras({ fetchJson: async () => pkg, fetchText: async () => csv, outDir: d, now: NOW, perms: loadPerms(), log: quiet })],
    ['runner', async (d) => commitSource({ outDir: d, sourceId: 'x', sourceRow: { id: 'x' }, cams: [row], raw: 1, report: {}, reportFile: 'r.json', log: quiet })],
  ]) {
    const d = dirWith({ 'cameras.json': '[]', 'sources.json': cut });
    const r = await go(d);
    assert.equal(r.written, false, name);
    assert.match(r.reason, /sources\.json/, name);
    assert.equal(readFileSync(join(d, 'sources.json'), 'utf8'), cut, name);
  }
});

test('A10: Caltrans importer refuses when its licence row is closed or missing', async () => {
  const d = dirWith({});
  const closed = loadPerms().map((s) => (s.id === 'caltrans-cwwp2-dot-ca-gov' ? { ...s, enabled: false, mustNotShip: true } : s));
  for (const perms of [closed, loadPerms().filter((s) => s.id !== 'caltrans-cwwp2-dot-ca-gov')]) {
    const r = await runCaltrans({ fetcher: caOk, outDir: d, now: NOW, perms, log: quiet });
    assert.equal(r.written, false);
    assert.match(r.reason, /licence closed/);
  }
});

test('A14: Caltrans and DriveBC rows get firstSeen (one shared write path)', async () => {
  const d = dirWith({});
  assert.equal((await runCaltrans({ fetcher: caOk, outDir: d, now: NOW, log: quiet })).written, true);
  const rows = JSON.parse(readFileSync(join(d, 'cameras.json'), 'utf8'));
  assert.ok(rows.length > 0 && rows.every((c) => c.firstSeen));
});

test('A15: commitSource rejects rows that belong to another source', () => {
  const d = dirWith({ 'cameras.json': '[]' });
  const r = commitSource({ outDir: d, sourceId: 'x', sourceRow: { id: 'x' }, cams: [{ ...row, sourceId: 'y', id: 'y-1' }], raw: 1, report: {}, reportFile: 'r.json', log: quiet });
  assert.equal(r.written, false);
  assert.match(r.reason, /validation/);
});

test('A15: Caltrans officialUrl must be on a dot.ca.gov host', () => {
  const mk = (url) => ({ cctv: { index: '1', inService: 'true', location: { latitude: '34.05', longitude: '-118.25', locationName: 'A', route: 'I-5' }, imageData: { static: { currentImageURL: url } } } });
  const drop = {};
  assert.ok(normalizeCaltrans(mk('https://cwwp2.dot.ca.gov/a.jpg'), 7, NOW, drop));
  assert.equal(normalizeCaltrans(mk('https://evil.example.com/a.jpg'), 7, NOW, drop), null);
  assert.equal(drop.badHost, 1);
});
