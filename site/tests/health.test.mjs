// Camera health block: counts come from one function, markers match the health file, a missing / invalid / stale file
// shows no counts and no markers. Fixtures are written fresh each run. Run from site/: node --test tests/health.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { cityHealth, tally, STATUSES } from '../src/lib/health.mjs';
import { readPages } from './helpers.mjs';
import { gate } from '../../ops/harness/page-gate.mjs';

const cameras = JSON.parse(readFileSync('../data/camera-registry/cameras.json', 'utf8'));
const sd = cameras.filter((c) => c.city === 'San Diego');
const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();
const route = '/cameras/united-states/california/san-diego/';

// Every camera gets a status by its position, so each status appears; the last SD camera is left out of the file (-> unknown).
function healthFile({ ageH = 1, runOk = true } = {}) {
  const cams = {};
  cameras.forEach((c, i) => { cams[c.id] = { status: STATUSES[i % 3], httpStatus: 200, lastChecked: ago(ageH), feedKind: 'still' }; });
  delete cams[sd.at(-1).id];
  const f = join(mkdtempSync(join(tmpdir(), 'hf-')), 'health.json');
  writeFileSync(f, JSON.stringify({ generatedAt: ago(ageH), runOk, perSource: {}, cameras: cams }));
  return f;
}
const load = (f) => JSON.parse(readFileSync(f, 'utf8'));

function build(file) {
  const out = mkdtempSync(join(tmpdir(), 'healthout-'));
  execFileSync(process.execPath, ['node_modules/astro/astro.js', 'build', '--outDir', out], { env: { ...process.env, HEALTH_FILE: file }, stdio: 'pipe' });
  return { out, pages: readPages(out) };
}
const healthSection = (html) => html.match(/<section data-block="health"[\s\S]*?<\/section>/)[0];

test('cityHealth: counts are one tally; roads add up to the city; a camera missing from the file is unknown', () => {
  const h = load(healthFile());
  const { block } = cityHealth(sd, h);
  assert.deepEqual(block.counts, tally(sd, h));
  assert.equal(Object.values(block.counts).reduce((a, b) => a + b, 0), sd.length);
  for (const s of STATUSES) assert.equal(block.roads.reduce((a, r) => a + r.counts[s], 0), block.counts[s], `roads add up for ${s}`);
  assert.equal(block.statusOf(sd.at(-1).id), 'unknown');
  assert.equal(block.statusOf(sd[0].id), h.cameras[sd[0].id].status);
  h.cameras[sd[0].id].status = 'live-video'; // an unrecognised status is never shown as good
  assert.equal(cityHealth(sd, h).block.statusOf(sd[0].id), 'unknown');
});

test('cityHealth: missing, incomplete-run and older-than-24h files give no block', () => {
  assert.equal(cityHealth(sd, null).reason, 'missing');
  assert.equal(cityHealth(sd, load(healthFile({ ageH: 30 }))).block, null);
  assert.equal(cityHealth(sd, load(healthFile({ ageH: 30 }))).reason, 'stale');
  assert.equal(cityHealth(sd, load(healthFile({ ageH: 23 }))).reason, null);
});

test('built page, fresh health file: counts, per-road lines and per-camera markers all equal the file', () => {
  const f = healthFile();
  const h = load(f);
  const { out, pages } = build(f);
  const html = pages.get(route);
  const sec = healthSection(html);
  assert.match(sec, /data-source="World Traffic Cameras health checker"/);
  assert.ok(sec.includes(`data-asof="${h.generatedAt}"`));
  const want = tally(sd, h);
  assert.ok(sec.includes(`${want.reachable} reachable, ${want.stale} stale, ${want.unavailable} unavailable, ${want.unknown} unknown, out of ${sd.length} cameras`), 'city counts line');
  assert.ok(sec.includes('/guides/how-to-read-last-checked-status/'));
  const camSec = html.match(/<section data-block="cameras"[\s\S]*?<\/section>/)[0]; // the four words are defined once, at the top of the camera list
  for (const s of STATUSES) assert.ok(camSec.includes(`${s[0].toUpperCase()}${s.slice(1)} means`), `${s} explained`);
  assert.ok(!sec.includes(' means '), 'definitions are not repeated in the health block');
  assert.ok(camSec.indexOf('Reachable means') < camSec.indexOf('data-status='), 'defined before the first marker');
  assert.ok(html.includes('Link check by us: last run '), 'link check line comes from the health file');
  assert.ok(!/never run|not run yet/i.test(html.replace(/<[^>]+>/g, ' ')), 'no page text says the check never ran beside real markers');
  const roadLines = [...sec.matchAll(/<li>[^<]*?: (\d+) reachable, (\d+) stale, (\d+) unavailable, (\d+) unknown \(of (\d+)\)/g)];
  assert.ok(roadLines.length > 0);
  assert.equal(roadLines.reduce((a, m) => a + Number(m[5]), 0), sd.length);
  assert.equal(roadLines.reduce((a, m) => a + Number(m[1]), 0), want.reachable);
  // every camera link is followed by its own status marker, equal to the file
  const marks = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const c of sd) {
    const i = html.indexOf(`<a href="${c.officialUrl}"`);
    assert.ok(i > 0, `link for ${c.id}`);
    const li = html.slice(i, html.indexOf('</li>', i));
    const m = li.match(/data-status="(\w+)"[^>]*>Status: (\w+)\./);
    const expected = h.cameras[c.id] ? h.cameras[c.id].status : 'unknown';
    assert.equal(m[1], expected, `${c.id} marker`); assert.equal(m[2], expected); marks[expected]++;
    assert.ok(/title="[^"]+"/.test(li), 'accessible title');
  }
  assert.deepEqual(marks, want, 'marker counts equal the block counts');
  assert.ok(!/<img\b/i.test(sec));
  const g = gate(out, readFileSync('PAGES.md', 'utf8'));
  assert.deepEqual(g, [], 'whole page gate passes with the health block (near-duplicates, stale, proof)');
});

test('built page, missing file: honest "not checked yet", no counts, no markers', () => {
  const { pages } = build(join(tmpdir(), 'no-such-health.json'));
  for (const [r, html] of pages) {
    if (!r.startsWith('/cameras/united-states/california/') || r.split('/').filter(Boolean).length !== 4) continue;
    const sec = healthSection(html);
    assert.match(sec, /Not checked yet/); assert.match(sec, /data-asof="not-checked"/);
    assert.ok(!/reachable,/.test(sec) && !/Status: /.test(html), `${r}: no counts or markers`);
  }
});

test('built page, incomplete run (runOk false) and file older than 24 h: block omitted, no counts, no markers', () => {
  for (const f of [healthFile({ runOk: false }), healthFile({ ageH: 30 })]) {
    const { out, pages } = build(f);
    const html = pages.get(route);
    const sec = healthSection(html);
    assert.match(sec, /data-asof="not-checked"/);
    assert.match(sec, /Not checked (yet|recently)/);
    assert.ok(!/\d+ reachable,/.test(sec) && !/Status: /.test(html) && !/data-status=/.test(html));
    assert.deepEqual(gate(out, readFileSync('PAGES.md', 'utf8')).filter((e) => /older than/.test(e)), []);
  }
});

test('built guide: says when the checker last ran only if the file is fresh', () => {
  const guide = '/guides/how-to-read-last-checked-status/';
  assert.match(build(healthFile()).pages.get(guide), /The checker last ran at \d{4}-\d\d-\d\d \d\d:\d\d UTC and covers \d+ cameras/);
  const stale = build(healthFile({ ageH: 30 })).pages.get(guide);
  assert.ok(!/checker last ran/.test(stale) && /has not produced a usable result/.test(stale));
});

test('built Quebec region page with a health file: every camera shows status unknown (never unavailable) and the page says why; the page gate passes', () => {
  const cams = {};
  cameras.forEach((c, i) => { cams[c.id] = c.sourceId === 'quebec-mtmd' ? { status: 'unknown', httpStatus: null, lastChecked: null, reason: 'host-blocks-automated-checks' } : { status: STATUSES[i % 3], httpStatus: 200, lastChecked: ago(1), feedKind: 'still' }; });
  const f = join(mkdtempSync(join(tmpdir(), 'hf-')), 'health.json');
  writeFileSync(f, JSON.stringify({ generatedAt: ago(1), runOk: true, perSource: {}, cameras: cams }));
  const { out, pages } = build(f);
  const html = pages.get('/cameras/canada/montreal/');
  const mine = cameras.filter((c) => c.regionSlug === 'montreal');
  const marks = [...html.matchAll(/data-status="([a-z]+)"/g)].map((m) => m[1]);
  assert.equal(marks.length, mine.length);
  assert.ok(marks.every((s) => s === 'unknown'), 'no Quebec camera is shown as reachable or unavailable');
  assert.match(html, /Unknown means we have not checked it/);
  assert.match(html, /unknown by design, not broken/);
  assert.deepEqual(gate(out, readFileSync('PAGES.md', 'utf8')), []);
});

// ---- Fair budget: a camera the checker carried forward shows its OWN check age; older than 48 h it is unknown (one function for counts and markers) ----
import { statusOf, checkedText, MAX_CHECK_AGE_H } from '../src/lib/health.mjs';
test('statusOf / tally / checkedText: a camera whose own last check is over 48 h old is unknown beside a fresh run; the text says how long ago', () => {
  const h = (n) => new Date(Date.now() - n * 3600000).toISOString();
  const cams = [{ id: 'a', road: 'R' }, { id: 'b', road: 'R' }, { id: 'c', road: 'R' }, { id: 'd', road: 'R' }];
  const health = { generatedAt: h(1), runOk: true, cameras: {
    a: { status: 'reachable', lastChecked: h(1) },
    b: { status: 'reachable', lastChecked: h(5.5) }, // carried forward from an earlier run
    c: { status: 'reachable', lastChecked: h(MAX_CHECK_AGE_H + 2) }, // too old: never shown as current
    d: { status: 'unavailable', lastChecked: h(MAX_CHECK_AGE_H + 2) },
  } };
  assert.deepEqual(['a', 'b', 'c', 'd'].map((id) => statusOf(id, health)), ['reachable', 'reachable', 'unknown', 'unknown']);
  assert.deepEqual(tally(cams, health), { reachable: 2, stale: 0, unavailable: 0, unknown: 2 });
  const { block } = cityHealth(cams, health);
  assert.deepEqual(block.counts, tally(cams, health), 'block counts come from the same function');
  assert.deepEqual(block.roads[0].counts, block.counts, 'per-road counts too');
  assert.equal(block.statusOf('c'), 'unknown');
  assert.equal(block.checkedText('b'), 'last checked 5 h ago');
  assert.equal(block.checkedText('c'), 'last checked 2 days ago');
  assert.equal(checkedText('zzz', health), '', 'a camera with no record has no text');
});

test('whole-file rule is unchanged: the file older than 24 h gives no block at all, whatever its cameras say', () => {
  const old = new Date(Date.now() - 30 * 3600000).toISOString();
  const health = { generatedAt: old, runOk: true, cameras: { a: { status: 'reachable', lastChecked: old } } };
  assert.equal(cityHealth([{ id: 'a', road: 'R' }], health).reason, 'stale');
});

test('built Toronto page: carried-forward cameras say how long ago they were checked; a camera over 48 h is unknown; the page gate passes', () => {
  const tor = cameras.filter((c) => c.sourceId === 'toronto-traffic');
  const cams = {};
  cameras.forEach((c, i) => { cams[c.id] = { status: 'reachable', httpStatus: 200, lastChecked: ago(1), feedKind: 'still' }; });
  tor.forEach((c, i) => { cams[c.id] = { status: 'reachable', httpStatus: 200, lastChecked: ago(i % 3 === 0 ? 60 : i % 3 === 1 ? 5.5 : 1), feedKind: 'still' }; });
  const f = join(mkdtempSync(join(tmpdir(), 'hf-')), 'health.json');
  writeFileSync(f, JSON.stringify({ generatedAt: ago(1), runOk: true, perSource: {}, cameras: cams }));
  const { out, pages } = build(f);
  const html = pages.get('/cameras/canada/toronto/');
  const marks = [...html.matchAll(/data-status="([a-z]+)"/g)].map((m) => m[1]);
  const want = (k) => tor.filter((_, i) => i % 3 === k).length;
  assert.equal(marks.filter((s) => s === 'unknown').length, want(0), 'over 48 h: unknown');
  assert.equal(marks.filter((s) => s === 'reachable').length, tor.length - want(0));
  assert.equal((html.match(/last checked 5 h ago/g) || []).length, want(1));
  assert.equal((html.match(/last checked 2 days ago/g) || []).length, want(0));
  assert.ok(/Link check by us: last run /.test(html));
  assert.deepEqual(gate(out, readFileSync('PAGES.md', 'utf8')), []);
});
