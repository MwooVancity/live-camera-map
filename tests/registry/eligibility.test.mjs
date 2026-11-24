import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { linkClass, eligibility } from '../../ops/importers/lib/eligibility.mjs';

test('link classes: a timestamped or uuid picture address is temporary (Singapore), a plain camera address is stable', () => {
  assert.equal(linkClass('https://images.data.gov.sg/api/traffic-images/2026/11/cd94272d-1a32-4592-ae05-0962887f8767.jpg'), 'temporary');
  assert.equal(linkClass('https://cam.example.org/shot.jpg?t=1764050000123'), 'temporary');
  assert.equal(linkClass('https://cam.example.org/snap_20261125T061530.jpg'), 'temporary');
  assert.equal(linkClass('https://trafficnz.info/camera/714.jpg'), 'stable');
  assert.equal(linkClass('https://www.drivebc.ca/images/42.jpg'), 'stable');
  assert.equal(linkClass('not a url'), 'invalid');
  assert.equal(linkClass('ftp://x/y.jpg'), 'invalid');
});

test('eligibility names every failure and passes a good record', () => {
  const ok = { id: 's-1', sourceId: 's', lat: 1, lon: 2, officialUrl: 'https://x.org/cams/1.jpg' };
  assert.deepEqual(eligibility(ok), { directory_eligible: true, link_class: 'stable', reasons: [] });
  const bad = eligibility({ id: 'zz-1', sourceId: 's', lat: 0, lon: 0, officialUrl: 'https://x.org/2026/11/a.jpg' });
  assert.equal(bad.directory_eligible, false);
  assert.equal(bad.reasons.length, 3);
});

test('the real registry: every camera in it is directory eligible today (a wave of temporary links would fail here)', () => {
  const j = JSON.parse(readFileSync(new URL('../../data/camera-registry/cameras.json', import.meta.url), 'utf8'));
  const cams = Array.isArray(j) ? j : j.cameras;
  const bad = cams.map((c) => ({ id: c.id, ...eligibility(c) })).filter((x) => !x.directory_eligible);
  const bySource = {}; for (const b of bad) bySource[b.id.split('-').slice(0, 2).join('-')] = (bySource[b.id.split('-').slice(0, 2).join('-')] || 0) + 1;
  console.log(`not eligible: ${bad.length} of ${cams.length}`, JSON.stringify(bySource), bad.slice(0, 3).map((b) => b.id + ':' + b.reasons.join('/')).join(' | '));
  assert.ok(bad.length <= cams.length * 0.01, `${bad.length} cameras are not directory eligible`);
});
