// Code review 2026-11-25 batch A: A11 (one robots.txt reader) and A12 (an unreadable robots.txt stops the importer). Run: node --test tests/registry/review-a-robots.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { robotsAllows } from '../../ops/importers/lib/iceland.mjs';
import { robotsAllows as hkRobots } from '../../ops/importers/lib/hongkong.mjs';
import { readRobots, pathQuery } from '../../ops/importers/lib/runner.mjs';
import { runCameras as runIceland, loadPerms } from '../../ops/importers/iceland.mjs';
import { ROBOTS_URL, TERMS_URL } from '../../ops/importers/lib/iceland.mjs';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';


const R = (...l) => 'User-agent: *\n' + l.join('\n');

test('A11: wildcards, $, query string, longest match and Allow-wins-ties', () => {
  assert.equal(robotsAllows(R('Disallow: /dataset/*/resource/*/download'), '/dataset/a/resource/b/download'), false);
  assert.equal(robotsAllows(R('Disallow: /dataset/*/resource/*/download'), '/dataset/a/resource/b/view'), true);
  assert.equal(robotsAllows(R('Disallow: /*.json$'), '/x/list.json'), false);
  assert.equal(robotsAllows(R('Disallow: /*.json$'), '/x/list.json?page=2'), true, '$ anchors the end of path plus query');
  assert.equal(robotsAllows(R('Disallow: /api?format=xml'), pathQuery('https://h.example/api?format=xml')), false);
  assert.equal(robotsAllows(R('Disallow: /api?format=xml'), pathQuery('https://h.example/api?format=json')), true);
  assert.equal(robotsAllows(R('Disallow: /a', 'Allow: /a'), '/a/b'), true, 'equal length: Allow wins whatever the order');
  assert.equal(robotsAllows(R('Allow: /a', 'Disallow: /a'), '/a/b'), true);
  assert.equal(robotsAllows(R('Disallow: /a/b', 'Allow: /a'), '/a/b/c'), false, 'the longer Disallow wins');
  assert.equal(robotsAllows(R('Disallow: /a.b'), '/axb'), true, 'a dot is a dot, not any character');
});

test('A11: Hong Kong uses the same reader (one implementation)', () => assert.equal(hkRobots, robotsAllows));

test('A12: readRobots: 404, 410 and 403 mean no rules; a 5xx, 429 or a network error is thrown', async () => {
  const bad = (m) => async () => { throw new Error(m); };
  for (const m of ['HTTP 404', 'HTTP 410', 'HTTP 403']) assert.equal(await readRobots(bad(m), 'https://h/robots.txt'), '', m);
  for (const m of ['HTTP 500', 'HTTP 503', 'HTTP 429', 'fetch failed', 'The operation was aborted due to timeout']) await assert.rejects(readRobots(bad(m), 'https://h/robots.txt'), (e) => e.message === m);
  assert.equal(await readRobots(async () => 'User-agent: *\n', 'u'), 'User-agent: *\n');
});

test('A12: an importer stops when robots.txt errors out (5xx or network), but not when the file is simply absent (404)', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const list = readFileSync(join(here, 'fixtures', 'iceland-list.json'), 'utf8'), terms = readFileSync(join(here, 'fixtures', 'iceland-terms.html'), 'utf8');
  const go = (robotsError) => runIceland({ fetchText: async (url) => { if (url === ROBOTS_URL) throw new Error(robotsError); return url === TERMS_URL ? terms : list; }, outDir: mkdtempSync(join(tmpdir(), 'rr-')), now: '2026-11-25T12:00:00.000Z', perms: loadPerms(), log: () => {} });
  for (const e of ['HTTP 503', 'fetch failed']) { const r = await go(e); assert.equal(r.written, false, e); assert.match(r.reason, /robots\.txt unreadable/); }
  assert.equal((await go('HTTP 404')).written, true);
});
