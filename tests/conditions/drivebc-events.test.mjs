// Offline tests for the DriveBC Open511 events feed (bc-events). Run: node --test tests/conditions/drivebc-events.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEvents, loadPerms } from '../../ops/importers/drivebc.mjs';
import { parseOpen511 } from '../../ops/importers/lib/drivebc.mjs';
import { usableItems, MAX_AGE_MIN, SOURCE_IDS } from '../../ops/importers/lib/conditions.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, 'fixtures', 'open511-events.json'), 'utf8'));
const NOW = new Date('2026-11-22T20:00:00.000Z');
const quiet = () => {};
const perms = loadPerms();
const opts = (dir, o = {}) => ({ fetchJson: async () => fx, outDir: dir, now: NOW, perms, log: quiet, pauseMs: 0, ...o });
const read = (dir) => JSON.parse(readFileSync(join(dir, 'bc-events.json'), 'utf8'));

test('parse: Point and LineString, UTC intervals, active / closed / future / expired are told apart', () => {
  const drop = {};
  const items = fx.events.map((e) => parseOpen511(e, NOW, drop)).filter(Boolean);
  assert.deepEqual(drop, { notActive: 1, badGeometry: 1, outOfBounds: 1 });
  assert.deepEqual(items.map((i) => i.id), ['bc-evt-RIDE-1', 'bc-evt-RIDE-2', 'bc-evt-RIDE-3', 'bc-evt-RIDE-4', 'bc-evt-RIDE-1']);
  const [a, b, c, d] = items;
  assert.equal(a.active, true); assert.equal(a.endIndefinite, true); assert.equal(a.direction, 'West'); assert.equal(a.road, 'Highway 1');
  assert.deepEqual([a.lat, a.lon], [49.2, -122.9]); // GeoJSON order is [lon, lat]
  assert.equal(b.active, true); assert.equal(b.start, '2026-11-02T15:00:00.000Z'); assert.equal(b.end, '2026-11-30T23:00:00.000Z');
  assert.deepEqual([b.lat, b.lon, b.endLat, b.endLon], [49.1, -122.65, 49.11, -122.64]); // first and last point of the line
  assert.equal(c.active, false); assert.equal(c.closed, true); // expired (ended Nov 10)
  assert.equal(d.active, false); // starts Dec 15
  assert.equal(a.area, 'Lower Mainland District');
});

test('run: writes bc-events.json with its source id, time, counts; duplicate ids are dropped', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bce-'));
  const r = await runEvents(opts(dir));
  assert.equal(r.written, true, r.reason);
  const doc = read(dir);
  assert.equal(doc.feed, 'bc-events'); assert.equal(doc.sourceId, 'drivebc-events');
  assert.equal(doc.generatedAt, NOW.toISOString());
  assert.equal(doc.count, 4); assert.equal(doc.items.length, 4);
  assert.equal(doc.dropped.dupId, 1);
});

test('feed-fresh: the page gate (usableItems) shows the file only inside its 15 minute limit and only with a valid shape', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bce-'));
  await runEvents(opts(dir));
  const doc = read(dir);
  assert.equal(MAX_AGE_MIN['bc-events'], 15);
  assert.equal(usableItems(doc, 'bc-events', new Date(NOW.getTime() + 10 * 60000)).length, 4);
  assert.deepEqual(usableItems(doc, 'bc-events', new Date(NOW.getTime() + 16 * 60000)), [], 'stale (failing fixture)');
  assert.deepEqual(usableItems({ ...doc, items: undefined }, 'bc-events', NOW), [], 'wrong shape');
});

test('feed-licence: the row exists, is enabled, and a closed row stops the fetch before any request', async () => {
  assert.equal(SOURCE_IDS['bc-events'], 'drivebc-events');
  const dir = mkdtempSync(join(tmpdir(), 'bce-'));
  const closed = perms.map((s) => (s.id === 'drivebc-events' ? { ...s, commercialStatus: 'restricted' } : s));
  const boom = async () => { throw new Error('must not be fetched'); };
  const r = await runEvents(opts(dir, { perms: closed, fetchJson: boom }));
  assert.equal(r.written, false); assert.equal(r.reason, 'licence closed');
});

test('a renamed events field (shape change) or an HTML error page writes nothing (failing fixtures)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bce-'));
  const renamed = await runEvents(opts(dir, { fetchJson: async () => ({ items: fx.events }) }));
  assert.equal(renamed.written, false); assert.match(renamed.reason, /events unreadable/);
  const html = await runEvents(opts(dir, { fetchJson: async () => { throw new Error('invalid JSON from source: Unexpected token <'); } }));
  assert.equal(html.written, false);
  const noGeo = await runEvents(opts(dir, { fetchJson: async () => ({ events: fx.events.map((e) => ({ ...e, geography: undefined })) }) }));
  assert.equal(noGeo.written, false); assert.match(noGeo.reason, /only 0 of 8 events kept|zero items/);
});

test('a failed or shrunken run never replaces a good file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bce-'));
  const many = { events: Array.from({ length: 60 }, (_, i) => ({ ...fx.events[0], id: `drivebc.ca/RIDE-${100 + i}` })) };
  assert.equal((await runEvents(opts(dir, { fetchJson: async () => many }))).written, true);
  const before = readFileSync(join(dir, 'bc-events.json'), 'utf8');
  const few = await runEvents(opts(dir, { now: new Date(NOW.getTime() + 60000), fetchJson: async () => ({ events: many.events.slice(0, 10) }) }));
  assert.equal(few.written, false); assert.match(few.reason, /count fell from 60 to 10/);
  const down = await runEvents(opts(dir, { fetchJson: async () => { throw new Error('HTTP 503'); } }));
  assert.equal(down.written, false);
  assert.equal(readFileSync(join(dir, 'bc-events.json'), 'utf8'), before);
});

test('an empty first run writes nothing (no events at all is not a result)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bce-'));
  const r = await runEvents(opts(dir, { fetchJson: async () => ({ events: [] }) }));
  assert.equal(r.written, false); assert.match(r.reason, /zero items/);
});

test('paging: a full page of 500 asks for the next offset; a list that never ends is refused', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bce-'));
  const urls = [];
  const full = (n, off) => ({ events: Array.from({ length: n }, (_, i) => ({ ...fx.events[0], id: `drivebc.ca/RIDE-${off + i}` })) });
  const paged = async (u) => { urls.push(u); const off = Number(u.match(/offset=(\d+)/)[1]); return off === 0 ? full(500, 0) : full(7, 500); };
  const r = await runEvents(opts(dir, { fetchJson: paged }));
  assert.equal(r.written, true); assert.equal(r.report.count, 507);
  assert.equal(urls.length, 2); assert.match(urls[1], /offset=500/);
  assert.match(urls[0], /limit=500/);
  const endless = await runEvents(opts(dir, { fetchJson: async () => full(500, 0) }));
  assert.equal(endless.written, false); assert.match(endless.reason, /cut-off/);
});

test('real data/conditions/bc-events.json (when present): valid shape, every item inside BC with text and a start', () => {
  const f = join(here, '..', '..', 'data', 'conditions', 'bc-events.json');
  const doc = JSON.parse(readFileSync(f, 'utf8'));
  assert.equal(doc.feed, 'bc-events'); assert.ok(doc.items.length > 0);
  for (const i of doc.items) { assert.ok(i.text && i.start && Number.isFinite(i.lat) && Number.isFinite(i.lon), i.id); assert.ok(i.lat > 48 && i.lat < 61 && i.lon < -114 && i.lon > -140, i.id); }
});
