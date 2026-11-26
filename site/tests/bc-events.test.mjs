// BC road events: fresh + enabled shows active events by type, closed first, URLs stripped; stale or closed licence shows nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bcEvents, loadLive } from '../src/lib/live.mjs';
import { DIST, isNoindex } from './helpers.mjs';

const realPerms = JSON.parse(readFileSync('../data/source-permissions.json', 'utf8'));
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
function fixture({ ageMin = 5, closed = false } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'bc-'));
  const it = (id, eventType, active, closedRd, road, text = 'x') => ({ id, road, eventType, active, closed: closedRd, text, roadState: 'ALL_LANES_OPEN', lat: 49, lon: -123, updated: ago(10) });
  writeFileSync(join(d, 'bc-events.json'), JSON.stringify({ generatedAt: ago(ageMin), items: [
    it('a', 'INCIDENT', true, false, 'Hwy 1', 'see https://evil.example/x now'), it('b', 'INCIDENT', true, true, 'Hwy 99'),
    it('c', 'INCIDENT', false, false, 'Hwy 5'), it('d', 'CONSTRUCTION', true, false, 'Hwy 3') ] }));
  const perms = { ...realPerms, sources: realPerms.sources.filter((s) => s.id === 'drivebc-events').map((s) => ({ ...s, reviewedAt: new Date().toISOString().slice(0, 10), ...(closed ? { mustNotShip: true } : {}) })) };
  writeFileSync(join(d, 'perms.json'), JSON.stringify(perms));
  process.env.CONDITIONS_DIR = d; process.env.PERMISSIONS_FILE = join(d, 'perms.json');
}

test('fresh and enabled: active only, grouped by type, closed first, no URLs in text', () => {
  fixture();
  const z = bcEvents(loadLive());
  assert.equal(z.state, 'fresh');
  assert.equal(z.total, 3);
  assert.equal(z.closedCount, 1);
  assert.deepEqual(z.types.map((t) => t.type), ['INCIDENT', 'CONSTRUCTION']);
  assert.deepEqual(z.types[0].rows.map((r) => r.id), ['b', 'a']);
  assert.ok(!/https?:/.test(JSON.stringify(z.types)) && !/https?:/.test(z.attribution));
  assert.ok(z.asof && /Open Government Licence/.test(z.attribution));
});
test('older than 24 h: no rows', () => { fixture({ ageMin: 25 * 60 }); const z = bcEvents(loadLive()); assert.equal(z.state, 'older than its limit'); assert.equal(z.types, undefined); });
test('closed licence row: no rows', () => { fixture({ closed: true }); assert.equal(bcEvents(loadLive()).state, 'licence not enabled'); });
test('built page: noindex, no images, not in the sitemap', () => {
  const f = join(DIST, 'work-zones', 'british-columbia', 'index.html');
  assert.ok(existsSync(f), 'run npm run build first');
  const html = readFileSync(f, 'utf8');
  assert.ok(isNoindex(html));
  assert.ok(!/<img/i.test(html));
  assert.ok(!readFileSync(join(DIST, 'sitemap.xml'), 'utf8').includes('/work-zones/'));
  assert.match(html, /data-block="bc-road-events"/);
});
