// Run: node --test tests/licensing/licensing.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEnabled, RESTRICT_RE } from './gate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { sources } = JSON.parse(readFileSync(resolve(root, 'data/source-permissions.json'), 'utf8'));
const good = {
  commercialStatus: 'allowed_per_doc',
  attribution: 'NOAA',
  provenance: 'gev/DATA_SOURCES.md:20',
  licence: 'U.S. public domain',
  reviewedAt: '2026-11-21',
  mustNotShip: false,
};
const today = new Date('2026-11-22');
const now = new Date(); // B5: stored flags and real rows are judged today, not on their own review date

test('gate: good entry passes (control)', () => assert.equal(isEnabled(good, today), true));
test('gate: unknown fails closed', () => assert.equal(isEnabled({ ...good, commercialStatus: 'unknown' }, today), false));
test('gate: restricted fails', () => assert.equal(isEnabled({ ...good, commercialStatus: 'restricted' }, today), false));
test('gate: missing attribution fails', () => assert.equal(isEnabled({ ...good, attribution: '' }, today), false));
test('gate: missing provenance fails', () => assert.equal(isEnabled({ ...good, provenance: '' }, today), false));
test('gate: missing licence fails', () => assert.equal(isEnabled({ ...good, licence: '' }, today), false));
test('gate: expired review fails', () => assert.equal(isEnabled({ ...good, reviewedAt: '2026-01-01' }, today), false));
test('gate: garbage review date fails', () => assert.equal(isEnabled({ ...good, reviewedAt: 'soon' }, today), false));
test('gate: mustNotShip fails even if permissive', () => assert.equal(isEnabled({ ...good, mustNotShip: true }, today), false));
test('gate: undefined entry fails', () => assert.equal(isEnabled(undefined, today), false));

test('inventory: has rows', () => assert.ok(sources.length > 200, `only ${sources.length} rows`));
test('inventory: stored enabled flag matches the gate (no hand edits)', () => {
  const bad = sources.filter((s) => s.enabled !== isEnabled(s, now));
  assert.deepEqual(bad.map((s) => s.id), []);
});
test('inventory: nothing unknown or restricted is enabled', () => {
  assert.deepEqual(sources.filter((s) => s.enabled && !['allowed_per_doc', 'allowed_per_owner'].includes(s.commercialStatus)).map((s) => s.id), []);
});
test('inventory: every enabled source has attribution, provenance, review date', () => {
  const bad = sources.filter((s) => s.enabled && !(s.attribution && s.provenance && s.reviewedAt));
  assert.deepEqual(bad.map((s) => s.id), []);
});
test('inventory: ids are unique', () => {
  const ids = sources.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

// Sources the owner named as restricted must exist in the inventory and be disabled.
const NAMED = [
  ['OpenSky', /opensky/i],
  ['FL511', /fl511/i],
  ['NYC DOT', /nyc dot/i],
  ['Houston TranStar', /transtar/i],
  ['S2 GhostMaps', /ghostmaps/i],
  ['Google News RSS', /google news/i],
  ['iNaturalist', /inaturalist/i],
  ['TeleGeography', /telegeography/i],
  ['Bhote Koshi pack', /bhote koshi/i],
];
for (const [label, re] of NAMED) {
  test(`named restricted source is present and disabled: ${label}`, () => {
    const hits = sources.filter((s) => re.test(s.name));
    assert.ok(hits.length > 0, `${label} missing from inventory`);
    for (const h of hits) {
      assert.equal(h.enabled, false, `${h.id} enabled`);
      assert.equal(h.commercialStatus, 'restricted', `${h.id} status ${h.commercialStatus}`);
    }
  });
}
test('TeleGeography and Bhote Koshi are flagged mustNotShip', () => {
  for (const re of [/telegeography/i, /bhote koshi/i]) {
    for (const h of sources.filter((s) => re.test(s.name))) assert.equal(h.mustNotShip, true, h.id);
  }
});

// Bundled datasets: every folder on disk must be covered by an inventory row (a dataset nobody listed is the risk).
test('every bundled data folder on disk has an inventory row', () => {
  const dirs = readdirSync(resolve(root, 'gev/src/data/local_data'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const events = readdirSync(resolve(root, 'gev/public/events'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const uncovered = [...dirs, ...events].filter((d) => !sources.some((s) => (s.folder || '').includes(d)));
  assert.deepEqual(uncovered, []);
});
test('every config/cctv_sources pack on disk is accounted for', () => {
  const files = readdirSync(resolve(root, 'gev/config')).filter((f) => f.startsWith('cctv_sources.'));
  assert.ok(files.length > 0);
  const text = JSON.stringify(sources).toLowerCase();
  const missing = files.filter((f) => !text.includes(f.replace('cctv_sources.', '').replace('.json', '').toLowerCase()));
  assert.deepEqual(missing, []);
});
// Rule `feed-licence`: every live-conditions feed has a hand-read row that quotes its licence text and URL.
import { SOURCE_IDS } from '../../ops/importers/lib/conditions.mjs';
for (const [feed, id] of Object.entries(SOURCE_IDS)) {
  test(`feed-licence: ${feed} has a row (${id}) that passes the gate and quotes text and a URL`, () => {
    const row = sources.find((s) => s.id === id);
    assert.ok(row, `${id} missing from data/source-permissions.json`);
    assert.equal(isEnabled(row, now), true, `${id} is not enabled by the gate (expired review or closed row)`);
    assert.match(row.licence, /"[^"]{15,}"/, 'licence must quote the source text');
    assert.match(row.provenance + row.licence, /https:\/\//, 'row must give the URL');
  });
}
test('feed-licence: flipping a feed row to unknown closes it (the importers read this same gate)', () => {
  const row = sources.find((s) => s.id === 'caltrans-lcs');
  assert.equal(isEnabled({ ...row, commercialStatus: 'unknown' }, today), false);
});
test('source doc and csv exist', () => {
  assert.ok(existsSync(resolve(root, 'docs/source-audits/source-inventory.csv')));
});

// ---- Regenerating the inventory never re-dates a row nobody changed (the run of 2026-11-23 re-dated ~290 rows) ----
import { keepReviewDates } from '../../ops/audit/review-dates.mjs';
test('review dates: an unchanged row keeps its own date, a changed or new row gets the new one', () => {
  const prev = [{ id: 'a', licence: 'x', reviewedAt: '2026-11-22', enabled: true }, { id: 'b', licence: 'y', reviewedAt: '2026-11-22', enabled: true }];
  const fresh = [{ enabled: false, reviewedAt: '2026-11-23', licence: 'x', id: 'a' }, { id: 'b', licence: 'y CHANGED', reviewedAt: '2026-11-23', enabled: true }, { id: 'c', licence: 'z', reviewedAt: '2026-11-23', enabled: true }];
  const out = keepReviewDates(fresh, prev);
  assert.equal(out[0].reviewedAt, '2026-11-22', 'same content (key order and enabled ignored) keeps its date');
  assert.equal(out[1].reviewedAt, '2026-11-23', 'a changed row is dated today');
  assert.equal(out[2].reviewedAt, '2026-11-23', 'a new row is dated today');
  assert.equal(fresh[0].reviewedAt, '2026-11-23', 'the input is not changed');
});
test('review dates: no previous file (first run, unreadable) dates every row today; a previous row with no date does not match', () => {
  const fresh = [{ id: 'a', licence: 'x', reviewedAt: '2026-11-23' }];
  assert.deepEqual(keepReviewDates(fresh, null), fresh);
  assert.deepEqual(keepReviewDates(fresh, [{ id: 'a', licence: 'x' }]), fresh);
});
test('review dates: every row in the real file has its own ISO date', () => {
  assert.ok(sources.every((s) => /^\d{4}-\d\d-\d\d$/.test(s.reviewedAt)));
});

// ---- B5: expiry boundaries (code review 2026-11-25) ----
const daysAgo = (n) => new Date(Date.parse(good.reviewedAt) + n * 86400000);
test('B5: review age 180 days passes, 181 fails, 2 days in the future fails', () => {
  assert.equal(isEnabled(good, daysAgo(180)), true);
  assert.equal(isEnabled(good, daysAgo(181)), false);
  assert.equal(isEnabled(good, daysAgo(-2)), false);
});
test('B5: an enabled row dated 2024-01-01 is rejected today (the old test judged it on its own date)', () => {
  assert.equal(isEnabled({ ...good, reviewedAt: '2024-01-01' }, now), false);
  const stale = { ...good, reviewedAt: '2024-01-01', enabled: true };
  assert.notEqual(stale.enabled, isEnabled(stale, now), 'the inventory check would flag this row');
});

// ---- B6: allowed_per_owner is bound to data/owner-approvals.json ----
const approvals = { approvedAt: '2026-11-24' };
const owner = { ...good, commercialStatus: 'allowed_per_owner', ownerApprovedAt: '2026-11-24', licence: 'Terms unclear in the doc' };
const t24 = new Date('2026-11-25');
test('B6: owner-approved row with the recorded date passes (control)', () => assert.equal(isEnabled(owner, t24, approvals), true));
test('B6: owner-approved row without a date fails', () => assert.equal(isEnabled({ ...owner, ownerApprovedAt: undefined }, t24, approvals), false));
test('B6: owner-approved row with a date that is not the recorded approval fails', () => assert.equal(isEnabled({ ...owner, ownerApprovedAt: '2026-11-20' }, t24, approvals), false));
test('B6: deleting the approvals file closes every owner-approved row', () => assert.equal(isEnabled(owner, t24, null), false));
test('B6: a restricted licence text is never opened by an owner approval', () => {
  assert.equal(isEnabled({ ...owner, licence: 'Non-commercial use only' }, t24, approvals), false);
  assert.equal(isEnabled({ ...owner, licence: 'Written permission required' }, t24, approvals), false);
});
test('B6: every real owner-approved row matches the recorded approval and has no restricted text', () => {
  const rec = JSON.parse(readFileSync(resolve(root, 'data/owner-approvals.json'), 'utf8'));
  const own = (s) => (rec.sources || []).some((a) => a.id === s.id && a.approvedAt === s.ownerApprovedAt);
  const bad = sources.filter((s) => s.commercialStatus === 'allowed_per_owner' && ((s.ownerApprovedAt !== rec.approvedAt && !own(s)) || RESTRICT_RE.test(s.licence)));
  assert.deepEqual(bad.map((s) => s.id), []);
});

// per-source approvals (2026-11-25): an entry opens exactly its own id and date
const approvals2 = { approvedAt: '2026-11-24', sources: [{ id: 'georgia-511-cameras', approvedAt: '2026-11-25', scope: 'this source only' }] };
const ga = { ...owner, id: 'georgia-511-cameras', ownerApprovedAt: '2026-11-25' };
const t25 = new Date('2026-11-26');
test('B6 per-source: the named source with the entry date passes (control)', () => assert.equal(isEnabled(ga, t25, approvals2), true));
test('B6 per-source: the approval cannot widen to another source id', () => {
  assert.equal(isEnabled({ ...ga, id: 'maryland-chart-cameras' }, t25, approvals2), false);
  assert.equal(isEnabled({ ...ga, id: 'georgia-511-cameras-2' }, t25, approvals2), false);
  assert.equal(isEnabled({ ...ga, id: undefined }, t25, approvals2), false);
});
test('B6 per-source: the right source with another date, or with no entry, stays closed', () => {
  assert.equal(isEnabled({ ...ga, ownerApprovedAt: '2026-11-20' }, t25, approvals2), false);
  assert.equal(isEnabled(ga, t25, { approvedAt: '2026-11-24' }), false);
  assert.equal(isEnabled(ga, t25, { approvedAt: '2026-11-24', sources: [] }), false);
  assert.equal(isEnabled(ga, t25, null), false);
});
test('B6 per-source: a restricted licence text or mustNotShip is not opened by a per-source entry', () => {
  assert.equal(isEnabled({ ...ga, licence: 'Non-commercial use only' }, t25, approvals2), false);
  assert.equal(isEnabled({ ...ga, mustNotShip: true }, t25, approvals2), false);
});
test('B6 per-source: the real file lists georgia-511-cameras only for 2026-11-25, and the real row matches it', () => {
  const rec = JSON.parse(readFileSync(resolve(root, 'data/owner-approvals.json'), 'utf8'));
  const e = rec.sources.filter((a) => a.id === 'georgia-511-cameras');
  assert.equal(e.length, 1);
  assert.equal(e[0].approvedAt, '2026-11-25');
  const row = sources.find((s) => s.id === 'georgia-511-cameras');
  assert.equal(row.ownerApprovedAt, e[0].approvedAt);
  assert.equal(row.commercialStatus, 'allowed_per_owner');
});

// ---- B7: the restricted pattern covers the wording the owner-approval scope forbids ----
test('B7: restricted pattern matches written permission, proprietary, subscription, your own key', () => {
  for (const t of ['Written permission required', 'Proprietary data', 'Paid subscription needed', 'Bring your own key', 'Requires your own API key', 'non-commercial']) assert.match(t, RESTRICT_RE, t);
  for (const t of ['U.S. public domain', 'CC BY 4.0', 'ODbL']) assert.doesNotMatch(t, RESTRICT_RE, t);
});

// Human decision 2026-11-25: Luxembourg (CC0) and Medellin (CC BY-SA) open link-only. Entries name these two ids only.
{
  const rec = JSON.parse(readFileSync(resolve(root, 'data/owner-approvals.json'), 'utf8'));
  const perm = JSON.parse(readFileSync(resolve(root, 'data/source-permissions.json'), 'utf8')).sources;
  const open = rec.sources.filter((a) => a.kind === 'open-explicit-licence');
  test('open-explicit-licence decisions: exactly cita-lu-cameras and medellin-simm-cameras, dated 2026-11-25, with the owner quote', () => {
    assert.deepEqual(open.map((a) => a.id).sort(), ['cita-lu-cameras', 'medellin-simm-cameras']);
    for (const a of open) { assert.equal(a.approvedAt, '2026-11-25'); assert.equal(a.quote, 'Open both, link-only (Recommended)'); assert.match(a.by, /Open both, link-only \(Recommended\)/); assert.match(a.scope, /THIS SOURCE ID ONLY/); }
  });
  test('open-explicit-licence rows: allowed_per_doc, enabled, image still unverified, only these ids opened by a decision', () => {
    for (const a of open) {
      const r = perm.find((p) => p.id === a.id);
      assert.equal(r.commercialStatus, 'allowed_per_doc'); assert.equal(r.enabled, true); assert.equal(r.imagePermission.status, 'unverified'); assert.equal(r.mustNotShip, false);
    }
  });
  test('Luxembourg keeps the footer conflict on record; Medellin carries the ShareAlike attribution', () => {
    assert.match(perm.find((p) => p.id === 'cita-lu-cameras').licence, /All rights reserved/);
    assert.match(perm.find((p) => p.id === 'medellin-simm-cameras').attribution, /ShareAlike[\s\S]*same licence/);
  });
}
