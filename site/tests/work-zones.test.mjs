// Minnesota work zones: fresh + enabled shows active zones only with source and timestamp; stale or closed licence shows nothing; feed text is untrusted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mnWorkZones, loadLive } from '../src/lib/live.mjs';
import { DIST, isNoindex } from './helpers.mjs';

const realPerms = JSON.parse(readFileSync('../data/source-permissions.json', 'utf8'));
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
function fixture({ ageMin = 5, closed = false } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'wz-'));
  const it = (id, active, road = 'I-94') => ({ id, road, direction: 'eastbound', text: 'Work', active, lat: 45, lon: -93, start: ago(60), end: ago(-60) });
  writeFileSync(join(d, 'mn-wzdx.json'), JSON.stringify({ generatedAt: ago(ageMin), feedUpdated: ago(ageMin), items: [it('a', true), it('b', false), it('c', true, 'I-35')] }));
  const perms = { ...realPerms, sources: realPerms.sources.filter((s) => s.id === 'mn-wzdx').map((s) => ({ ...s, reviewedAt: new Date().toISOString().slice(0, 10), ...(closed ? { mustNotShip: true } : {}) })) };
  writeFileSync(join(d, 'perms.json'), JSON.stringify(perms));
  process.env.CONDITIONS_DIR = d; process.env.PERMISSIONS_FILE = join(d, 'perms.json');
}

test('fresh and enabled: only active zones, sorted by road, with timestamp and CC0 credit', () => {
  fixture();
  const z = mnWorkZones(loadLive());
  assert.equal(z.state, 'fresh');
  assert.deepEqual(z.rows.map((r) => r.id), ['c', 'a']); // I-35 sorts before I-94
  assert.ok(z.asof && /CC0/.test(z.attribution));
});
test('older than 24 h: no rows', () => { fixture({ ageMin: 25 * 60 }); const z = mnWorkZones(loadLive()); assert.equal(z.state, 'older than its limit'); assert.equal(z.rows, undefined); });
test('closed licence row: no rows', () => { fixture({ closed: true }); assert.equal(mnWorkZones(loadLive()).state, 'licence not enabled'); });
test('built page: noindex, no images, not in the sitemap', () => {
  const f = join(DIST, 'work-zones', 'minnesota', 'index.html');
  assert.ok(existsSync(f), 'run npm run build first');
  const html = readFileSync(f, 'utf8');
  assert.ok(isNoindex(html));
  assert.ok(!/<img/i.test(html));
  assert.ok(!readFileSync(join(DIST, 'sitemap.xml'), 'utf8').includes('/work-zones/'));
  assert.match(html, /data-block="mn-work-zones"/);
});
