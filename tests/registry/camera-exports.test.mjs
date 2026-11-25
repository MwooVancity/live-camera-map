import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRows, toCsv, toGeoJson, toKml, COLUMNS, PERMISSION_ROW, GATE_FALLBACK } from '../../ops/exports/camera-exports.mjs';
import { eligibility } from '../../ops/importers/lib/eligibility.mjs';
import { isEnabled } from '../licensing/gate.mjs';

const cam = (o = {}) => ({ id: 's-1', sourceId: 's', name: 'N', road: 'R', direction: '', city: null, regionSlug: 'iceland', regionName: 'Iceland', lat: 64.1, lon: -21.9, feedType: 'still', officialUrl: 'https://x.org/1.jpg', lastSeen: '2026-11-24T00:00:00Z', ...o });
const src = [{ id: 's', name: 'Source S', license: 'CC BY 4.0', attribution: 'Source: S' }];
const NOW = new Date('2026-11-25T12:00:00Z');
// A full, open gate row for source id `id` (A5: a source with no row, or a row that fails the gate, exports nothing).
const gate = (id = 's', extra = {}) => ({ id, commercialStatus: 'allowed_per_doc', attribution: 'Attribution X', provenance: 'p', licence: 'L', reviewedAt: '2026-11-20', ...extra });
const P = [gate()];

test('an eligible, licensed camera is exported with source, licence, attribution and a health stamp', () => {
  const { rows, skipped } = buildRows([cam()], src, { 's-1': { status: 'reachable', lastChecked: '2026-11-25T09:00:00Z' } }, P, NOW);
  assert.equal(rows.length, 1); assert.equal(skipped.notEligible + skipped.noLicence, 0);
  assert.deepEqual([rows[0].licence, rows[0].attribution, rows[0].health_status, rows[0].country], ['CC BY 4.0', 'Source: S', 'reachable', 'iceland']);
});

test('no licence or no attribution means no row; a temporary link or zero coordinates means no row', () => {
  const r = buildRows([cam(), cam({ id: 's-2', officialUrl: 'https://x.org/2026/11/a.jpg' }), cam({ id: 's-3', lat: 0, lon: 0 })], [{ id: 's', name: 'S', license: 'unverified', attribution: 'x' }], {}, P, NOW).skipped;
  assert.equal(r.notEligible, 2); assert.equal(r.noLicence, 1);
  assert.equal(buildRows([cam()], [{ id: 's', name: 'S', license: 'CC BY 4.0', attribution: '' }], {}, P, NOW).rows.length, 0);
  assert.equal(buildRows([cam()], [], {}, P, NOW).rows.length, 0, 'a source with no row at all exports nothing');
});

test('csv: header, quoting, formula-injection guard, CRLF', () => {
  const { rows } = buildRows([cam({ name: '=HYPERLINK("x")', road: 'a,b' })], src, {}, P, NOW);
  const t = toCsv(rows).split('\r\n');
  assert.equal(t[0], COLUMNS.join(','));
  assert.ok(t[1].includes(`"'=HYPERLINK(""x"")"`) && t[1].includes('"a,b"'));
});

test('the real registry: every export row has a licence and attribution, and count equals the eligible licensed cameras', () => {
  const j = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
  const c = j('data/camera-registry/cameras.json'), s = j('data/camera-registry/sources.json');
  const perms = j('data/source-permissions.json').sources;
  const cams = Array.isArray(c) ? c : c.cameras, srcs = Array.isArray(s) ? s : s.sources;
  const { rows, skipped } = buildRows(cams, srcs, {}, perms);
  console.log(`export rows ${rows.length}, skipped ${JSON.stringify(skipped)}`);
  assert.ok(rows.every((r) => r.licence && r.attribution && r.official_url));
  // The independently computed eligible set (A5): eligible camera, an OPEN gate row for its source, and a licence label (or the Caltrans fallback row) with an attribution.
  const open = new Set(srcs.map((x) => x.id).filter((id) => isEnabled(perms.find((p) => p.id === (PERMISSION_ROW[id] || id)), new Date())));
  const labelled = new Set(srcs.filter((x) => (x.license && x.license !== 'unverified') || GATE_FALLBACK[x.id]).filter((x) => x.attribution || GATE_FALLBACK[x.id]).map((x) => x.id));
  const expected = cams.filter((x) => eligibility(x).directory_eligible && open.has(x.sourceId) && labelled.has(x.sourceId)).length;
  assert.equal(rows.length, expected);
  assert.ok(rows.length > 0);
});

test('a source labelled unverified is exported only through an enabled gate row, never otherwise', () => {
  const s = [{ id: 'caltrans', name: 'C', license: 'unverified', attribution: 'x' }];
  const c = [{ id: 'caltrans-1', sourceId: 'caltrans', name: 'N', road: '', direction: '', city: null, regionSlug: 'california', regionName: 'California', lat: 1, lon: 1, feedType: 'still', officialUrl: 'https://x.org/1.jpg' }];
  assert.equal(buildRows(c, s, {}, [], NOW).rows.length, 0);
  assert.equal(buildRows(c, s, {}, [gate('caltrans-cwwp2-dot-ca-gov', { enabled: false, mustNotShip: true })], NOW).rows.length, 0);
  assert.equal(buildRows(c, s, {}, [gate('caltrans-cwwp2-dot-ca-gov', { enabled: true, commercialStatus: 'allowed_per_owner', ownerApprovedAt: '2026-11-24' })], NOW).rows.length, 1);
});

test('P0-4: a source whose licence row has no metadata permission exports nothing; an allowed row exports', () => {
  const row = (m, extra = {}) => [gate('toronto-traffic-cameras', { metadataPermission: m, ...extra }), gate('s')];
  const s = [{ id: 'toronto-traffic', name: 'T', license: 'OGL', attribution: 'T' }, ...src];
  const c = [cam({ sourceId: 'toronto-traffic', id: 'toronto-traffic-1' }), cam()];
  assert.equal(buildRows(c, s, {}, row({ status: 'unverified', quote: '', url: '' }), NOW).rows.length, 1, 'unverified: Toronto closed, source s still exports');
  assert.equal(buildRows(c, s, {}, row({ status: 'unverified', quote: '', url: '' }), NOW).skipped.noMetadata, 1);
  assert.equal(buildRows(c, s, {}, row({ status: 'unverified', quote: '', url: '' }, { metadataGrandfather: { reason: 'owner approval' } }), NOW).rows.length, 2);
  assert.equal(buildRows(c, s, {}, row({ status: 'allowed', quote: 'q', url: 'u' }), NOW).rows.length, 2);
});

test('A5: an expired, restricted, mustNotShip or unmapped source exports nothing (failing fixtures: all of them used to export)', () => {
  const rows = (perms) => buildRows([cam()], src, {}, perms, NOW).rows.length;
  assert.equal(rows([gate('s')]), 1);
  assert.equal(rows([gate('s', { reviewedAt: '2026-01-01' })]), 0, 'review older than 180 days');
  assert.equal(rows([gate('s', { commercialStatus: 'restricted' })]), 0);
  assert.equal(rows([gate('s', { mustNotShip: true })]), 0);
  assert.equal(rows([]), 0, 'no row for the source');
});

test('A6: the CSV health_status uses the 48 h rule, like the site (an old check shows unknown)', () => {
  const h = (lastChecked) => buildRows([cam()], src, { 's-1': { status: 'reachable', lastChecked } }, P, NOW).rows[0].health_status;
  assert.equal(h('2026-11-25T00:00:00Z'), 'reachable');
  assert.equal(h('2026-11-20T00:00:00Z'), 'unknown');
});
