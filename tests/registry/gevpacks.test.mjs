// Offline tests for the GEV camera packs importer. Run: node --test tests/registry/gevpacks.test.mjs
// No gev/ and no network: GEV's loader is injected. The ODOT fixture is 5 real rows of the TripCheck list (2026-11-26).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCameras } from '../../ops/importers/gevpacks.mjs';
import { GEV_PACKS, GEV_REGIONS, GEV_REGION_COUNTRY, normalizeGev, pinned } from '../../ops/importers/lib/gevpacks.mjs';
import { parseFeed, normalizeOdot, FEED_URL, ROBOTS_URL, OUT_OF_STATE_RE } from '../../ops/importers/lib/odot-tripcheck.mjs';
import { validateCamera, FORBIDDEN_FIELDS } from '../../ops/importers/lib/registry.mjs';
import { isEnabled } from '../licensing/gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const list = readFileSync(join(here, 'fixtures', 'odot-tripcheck-list.json'), 'utf8');
const NOW = '2026-11-26T12:00:00.000Z';
const pack = (id) => GEV_PACKS.find((p) => p.sourceId === id);
const tln = pack('tallinn-ristmikud');
const gevRow = (n, o = {}) => ({ id: `tln-${n}`, name: `Cross ${n}`, lat: 59.4, lon: 24.7, feedType: 'image', url: `https://ristmikud.tallinn.ee/last/cam${n}.jpg`, snapshotUrl: `https://ristmikud.tallinn.ee/last/cam${n}.jpg`, ...o });
const many = (n) => Array.from({ length: n }, (_, i) => gevRow(i + 1));
const perm = (id) => ({ id, commercialStatus: 'allowed_per_doc', attribution: 'Credit line', provenance: 'p', licence: 'l', reviewedAt: '2026-11-22' });
const perms = GEV_PACKS.map((p) => perm(p.permId));
const tmp = () => mkdtempSync(join(tmpdir(), 'gevpacks-'));
const seed = (dir, rows = [{ id: 'caltrans-d07-1', sourceId: 'caltrans', officialUrl: 'https://cwwp2.dot.ca.gov/a.jpg' }]) => writeFileSync(join(dir, 'cameras.json'), JSON.stringify(rows));
const read = (dir, f = 'cameras.json') => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const run = (dir, o = {}) => runCameras({ packs: [tln], load: async () => many(200), fetchText: async () => { throw new Error('no network'); }, outDir: dir, now: NOW, perms, log: () => {}, ...o });

test('every pack opens only through an existing enabled row of data/source-permissions.json, and none is a restricted or off-by-default GEV pack', () => {
  const real = JSON.parse(readFileSync(join(here, '..', '..', 'data', 'source-permissions.json'), 'utf8')).sources;
  for (const p of GEV_PACKS) {
    const row = real.find((s) => s.id === p.permId);
    assert.ok(row, p.permId);
    assert.ok(isEnabled(row, new Date(NOW)), p.permId);
    assert.ok(!/nyc|florida|fl511|houston|lithuania/i.test(p.sourceId + p.permId));
    assert.ok(p.attribution && p.licenseUrl.startsWith('https://'));
  }
  assert.equal(new Set(GEV_PACKS.map((p) => p.region.slug)).size, GEV_PACKS.length);
  const src = readFileSync(join(here, '..', '..', 'ops', 'importers', 'lib', 'quebec.mjs'), 'utf8');
  for (const p of GEV_PACKS) assert.ok(!src.includes(`'${p.region.slug}'`), `${p.region.slug} is already a Quebec region`);
  assert.equal(Object.keys(GEV_REGIONS).length, GEV_PACKS.length);
  assert.equal(Object.keys(GEV_REGION_COUNTRY).length, GEV_PACKS.length);
  assert.match(GEV_REGIONS['japan-rivers'].placeText({ total: 3 }), /rivers, not roads/);
});

test('a row keeps name, place and one pinned link; no picture field; a fixed page replaces stream and data addresses', () => {
  const c = normalizeGev(tln, gevRow(103), NOW);
  assert.deepEqual(validateCamera(c), []);
  assert.equal(c.id, 'tallinn-ristmikud-103');
  assert.equal(c.officialUrl, 'https://ristmikud.tallinn.ee/last/cam103.jpg');
  for (const f of FORBIDDEN_FIELDS) assert.ok(!(f in c), f);
  const de = pack('delaware-deldot'), seen = new Set();
  const a = normalizeGev(de, { id: 'deldot-a', name: 'A', lat: 39.7, lon: -75.5, feedType: 'hls', url: 'https://video.deldot.gov/live/A.m3u8', snapshotUrl: '' }, NOW, {}, seen);
  const b = normalizeGev(de, { id: 'deldot-b', name: 'B', lat: 39.8, lon: -75.5, feedType: 'hls', url: 'https://video.deldot.gov/live/B.m3u8' }, NOW, {}, seen);
  assert.deepEqual([a.officialUrl, b.officialUrl, a.feedType], ['https://deldot.gov/map/', 'https://deldot.gov/map/', 'video']);
  const jp = normalizeGev(pack('mlit-river'), { id: 'world-jp-river-31', name: '橋', city: '佐賀県, JP', lat: 33.3, lon: 130.4, url: 'https://cam.river.go.jp/cam/now/31.jpg' }, NOW);
  assert.deepEqual([jp.id, jp.road, jp.locationText, jp.regionSlug], ['mlit-river-31', '', 'Prefecture: 佐賀県.', 'japan-rivers']);
});

test('untrusted rows are dropped and counted: foreign host, javascript, login, port, markup name, bad coordinates, repeated id or link', () => {
  for (const u of ['javascript:alert(1)', 'https://evil.example/a.jpg', 'https://u:p@ristmikud.tallinn.ee/a', 'https://ristmikud.tallinn.ee:8080/a', 'ftp://ristmikud.tallinn.ee/a', '']) assert.equal(pinned(u, tln.hosts), '', u);
  const drop = {}, seen = new Set(['ristmikud.tallinn.ee/last/cam9.jpg']);
  const bad = [null, gevRow(1, { id: 'a b' }), gevRow(2, { url: 'https://evil.example/x', snapshotUrl: '' }), gevRow(3, { name: '<script>' }), gevRow(4, { name: ' ' }), gevRow(5, { lat: '59' }), gevRow(6, { lat: 0, lon: 0 }), gevRow(7, { lon: 999 }), gevRow(9)];
  for (const r of bad) assert.equal(normalizeGev(tln, r, NOW, drop, seen), null);
  assert.deepEqual(drop, { malformed: 1, noId: 1, badUrl: 1, badName: 2, badCoords: 3, dupUrl: 1 });
});

test('run: writes only the pack rows with its source row; a link another source already lists is skipped', async () => {
  const dir = tmp();
  seed(dir, [{ id: 'other-1', sourceId: 'other', officialUrl: 'https://ristmikud.tallinn.ee/last/cam1.jpg' }]);
  const { results } = await run(dir);
  assert.equal(results[tln.sourceId].written, true, results[tln.sourceId].reason);
  assert.equal(results[tln.sourceId].report.total, 199);
  assert.equal(results[tln.sourceId].report.dropped.dupUrl, 1);
  assert.equal(read(dir).filter((c) => c.sourceId === 'other').length, 1);
  assert.equal(read(dir, 'sources.json')[0].permissions.image_display, 'unverified');
  const again = await run(dir); // its own rows are not "another source"
  assert.equal(again.results[tln.sourceId].report.total, 199);
});

test('run: closed licence, failed, empty or short download, and a list under half the last good one change nothing', async () => {
  for (const [o, re] of [
    [{ perms: [] }, /licence closed/],
    [{ perms: [{ ...perm(tln.permId), mustNotShip: true }] }, /licence closed/],
    [{ perms: [{ ...perm(tln.permId), commercialStatus: 'restricted' }] }, /licence closed/],
    [{ load: async () => { throw new Error('boom'); } }, /list unreadable/],
    [{ load: async () => [] }, /only 0 usable/],
    [{ load: async () => many(100) }, /only 100 usable/],
    [{ load: async () => [...many(200), ...Array(300).fill(null)] }, /only 200 of 500/],
  ]) {
    const dir = tmp(); seed(dir);
    const before = readFileSync(join(dir, 'cameras.json'), 'utf8');
    const r = (await run(dir, o)).results[tln.sourceId];
    assert.equal(r.written, false, String(re));
    assert.match(r.reason, re);
    assert.equal(readFileSync(join(dir, 'cameras.json'), 'utf8'), before);
    assert.ok(!existsSync(join(dir, 'sources.json')));
  }
  const dir = tmp();
  await run(dir, { load: async () => many(600) });
  const r = (await run(dir)).results[tln.sourceId];
  assert.match(r.reason, /count fell from 600 to 200/);
  assert.equal(read(dir).length, 600);
});

test('run: one failing pack does not stop the next; a gencat http address is listed as https', async () => {
  const dir = tmp(); seed(dir);
  const cat = { ...pack('catalonia-transit'), min: 1 };
  const { results } = await run(dir, { packs: [tln, cat], load: async (l) => (l === tln.loader ? [] : [{ id: 'cat-1', name: 'N-II', lat: 41.5, lon: 2, url: 'http://mct.gencat.cat/a.gif' }]) });
  assert.equal(results[tln.sourceId].written, false);
  assert.equal(results[cat.sourceId].written, true, results[cat.sourceId].reason);
  assert.equal(read(dir).find((c) => c.sourceId === cat.sourceId).officialUrl, 'https://mct.gencat.cat/a.gif');
  assert.equal(normalizeGev(tln, gevRow(2, { url: 'http://ristmikud.tallinn.ee/a.jpg', snapshotUrl: '' }), NOW), null, 'http is not listed');
});

test('ODOT: ids carry both numbers, City label is no road, encoded link, no Accept header, other states and bad file names left out', async () => {
  const recs = parseFeed('﻿' + list);
  const cams = recs.map((r) => normalizeOdot(r, NOW, {}, new Set()));
  for (const c of cams) assert.deepEqual(validateCamera(c), []);
  const first = cams.find((c) => c.id === 'odot-tripcheck-277-392');
  assert.deepEqual([first.road, first.locationText], ['', 'Route: US101.']);
  const city = cams.find((c) => c.id === 'odot-tripcheck-1486-5351');
  assert.deepEqual([city.road, city.officialUrl], ['', 'https://tripcheck.com/RoadCams/cams/NE%2082nd%20at%20Siskiyou_pid5351.jpg']);
  const drop = {};
  for (const o of [{ filename: '../a.jpg' }, { filename: 'a.jpg?x=1' }, { title: '<b>' }, { latitude: -123, longitude: 46 }, { title: 'Idaho - US95' }]) assert.equal(normalizeOdot({ ...recs[0], ...o }, NOW, drop), null);
  assert.deepEqual(drop, { badFile: 2, badName: 1, outOfBounds: 1, outOfState: 1 });
  assert.ok(!OUT_OF_STATE_RE.test('Washington County - Nyberg St at I-5'));
  assert.throws(() => parseFeed(list.slice(0, -40)), /cut off/);
  assert.throws(() => parseFeed('<html></html>'), /no JSON object/);
  assert.throws(() => parseFeed('{"features":[],"exceededTransferLimit":true}'), /cut off/);
  const odot = { ...pack('odot-tripcheck'), min: 3 }, hits = [];
  const net = (o = {}) => async (u, headers) => {
    hits.push(u);
    assert.ok(!headers?.Accept);
    if (u === ROBOTS_URL) { if (o.robots) return o.robots; throw new Error('HTTP 404'); }
    if (u === FEED_URL) return o.feed ?? list;
    throw new Error('unexpected ' + u);
  };
  const dir = tmp(); seed(dir);
  assert.equal((await run(dir, { packs: [odot], fetchText: net() })).results[odot.sourceId].written, true);
  assert.deepEqual(hits, [ROBOTS_URL, FEED_URL]);
  for (const o of [{ robots: 'User-agent: *\nDisallow: /' }, { feed: list.slice(0, -40) }]) {
    const d = tmp(); seed(d);
    assert.match((await run(d, { packs: [odot], fetchText: net(o) })).results[odot.sourceId].reason, /list unreadable/);
  }
});
