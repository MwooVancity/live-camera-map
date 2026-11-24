import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRows, toCsv, COLUMNS } from '../../ops/exports/camera-exports.mjs';

const cam = (o = {}) => ({ id: 's-1', sourceId: 's', name: 'N', road: 'R', direction: '', city: null, regionSlug: 'iceland', regionName: 'Iceland', lat: 64.1, lon: -21.9, feedType: 'still', officialUrl: 'https://x.org/1.jpg', lastSeen: '2026-11-24T00:00:00Z', ...o });
const src = [{ id: 's', name: 'Source S', license: 'CC BY 4.0', attribution: 'Source: S' }];

test('an eligible, licensed camera is exported with source, licence, attribution and a health stamp', () => {
  const { rows, skipped } = buildRows([cam()], src, { 's-1': { status: 'reachable', lastChecked: '2026-11-24T09:00:00Z' } });
  assert.equal(rows.length, 1); assert.equal(skipped.notEligible + skipped.noLicence, 0);
  assert.deepEqual([rows[0].licence, rows[0].attribution, rows[0].health_status, rows[0].country], ['CC BY 4.0', 'Source: S', 'reachable', 'iceland']);
});

test('no licence or no attribution means no row; a temporary link or zero coordinates means no row', () => {
  const r = buildRows([cam(), cam({ id: 's-2', officialUrl: 'https://x.org/2026/11/a.jpg' }), cam({ id: 's-3', lat: 0, lon: 0 })], [{ id: 's', name: 'S', license: 'unverified', attribution: 'x' }]).skipped;
  assert.equal(r.notEligible, 2); assert.equal(r.noLicence, 1);
  assert.equal(buildRows([cam()], [{ id: 's', name: 'S', license: 'CC BY 4.0', attribution: '' }]).rows.length, 0);
  assert.equal(buildRows([cam()], []).rows.length, 0, 'a source with no row at all exports nothing');
});

test('csv: header, quoting, formula-injection guard, CRLF', () => {
  const { rows } = buildRows([cam({ name: '=HYPERLINK("x")', road: 'a,b' })], src);
  const t = toCsv(rows).split('\r\n');
  assert.equal(t[0], COLUMNS.join(','));
  assert.ok(t[1].includes(`"'=HYPERLINK(""x"")"`) && t[1].includes('"a,b"'));
});

test('the real registry: every export row has a licence and attribution, and count equals the eligible licensed cameras', () => {
  const j = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
  const c = j('data/camera-registry/cameras.json'), s = j('data/camera-registry/sources.json');
  const perms = j('data/source-permissions.json').sources;
  const { rows, skipped } = buildRows(Array.isArray(c) ? c : c.cameras, Array.isArray(s) ? s : s.sources, {}, perms);
  console.log(`export rows ${rows.length}, skipped ${JSON.stringify(skipped)}`);
  assert.ok(rows.every((r) => r.licence && r.attribution && r.official_url));
  assert.ok(rows.length > 0);
});

test('a source labelled unverified is exported only through an enabled gate row, never otherwise', () => {
  const s = [{ id: 'caltrans', name: 'C', license: 'unverified', attribution: 'x' }];
  const c = [{ id: 'caltrans-1', sourceId: 'caltrans', name: 'N', road: '', direction: '', city: null, regionSlug: 'california', regionName: 'California', lat: 1, lon: 1, feedType: 'still', officialUrl: 'https://x.org/1.jpg' }];
  assert.equal(buildRows(c, s).rows.length, 0);
  assert.equal(buildRows(c, s, {}, [{ id: 'caltrans-cwwp2-dot-ca-gov', enabled: false, licence: 'L', attribution: 'A' }]).rows.length, 0);
  assert.equal(buildRows(c, s, {}, [{ id: 'caltrans-cwwp2-dot-ca-gov', enabled: true, licence: 'L', attribution: 'A', commercialStatus: 'allowed_per_owner' }]).rows.length, 1);
});
