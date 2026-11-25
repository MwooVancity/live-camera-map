// Code review 2026-11-25 batch A: A1, A2, A7, A8 (health checker). Run: node --test tests/health/review-a-health.test.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, loadPrevious } from '../../ops/health/check.mjs';
import { classify } from '../../ops/health/lib/classify.mjs';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2500, 7)]);
let server, base, handler;
before(async () => {
  server = http.createServer((req, res) => handler(req, res));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
const sendJpeg = (res) => { res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': JPEG.length, 'Last-Modified': new Date().toUTCString() }); res.end(JPEG); };
const fast = { hostDelayMs: 0, backoffMs: 5, backoffMaxMs: 20, retries: 0 };
const cam = (i, sourceId = 't', path = `/c${i}.jpg`) => ({ id: `${sourceId}-${i}`, sourceId, officialUrl: base + path });
const go = async (cams, o = {}) => {
  const outDir = o.outDir || mkdtempSync(join(tmpdir(), 'rah-'));
  const r = await run({ cameras: cams, outDir, previous: o.previous || null, previousFailed: o.previousFailed, config: { ...fast, ...(o.config || {}) } });
  return { ...r, outDir };
};

test('A1: 401, 403 and a Cloudflare challenge are unknown (host-blocked), transient; a 404 stays unavailable', () => {
  const u = 'https://h.example/a.jpg';
  for (const o of [{ httpStatus: 403 }, { httpStatus: 401 }, { httpStatus: 200, contentType: 'text/html', cfMitigated: 'challenge' }]) {
    const k = classify(u, o);
    assert.equal(k.status, 'unknown', JSON.stringify(o));
    assert.equal(k.reason, 'host-blocked');
    assert.equal(k.transient, true);
  }
  assert.equal(classify(u, { httpStatus: 404 }).status, 'unavailable');
});

test('A1: a source whose every response is 403 never marks cameras unavailable, opens the breaker and the run is partial', async () => {
  handler = (req, res) => { res.writeHead(403, { 'cf-mitigated': 'challenge' }); res.end(); };
  const cams = Array.from({ length: 40 }, (_, i) => cam(i));
  const r = await go(cams, { config: { concurrency: 1 } });
  const st = Object.values(r.doc.cameras).map((c) => c.status);
  assert.ok(!st.includes('unavailable'));
  assert.equal(r.doc.perSource.t.circuitOpen, true);
  assert.equal(r.partial, true);
  assert.ok(!existsSync(join(r.outDir, 'health.json')));
});

test('A2: a source that runs out of time marks only its own cameras unknown; the others keep fresh results and health.json is written', async () => {
  handler = (req, res) => (req.url.startsWith('/slow') ? setTimeout(() => sendJpeg(res), 60) : sendJpeg(res));
  const cams = [...Array.from({ length: 8 }, (_, i) => cam(i, 'slow', `/slow${i}.jpg`)), ...Array.from({ length: 92 }, (_, i) => cam(i, 'fast'))];
  const r = await go(cams, { config: { budgetMs: 250, concurrency: 6, perSource: { slow: { concurrency: 1, hostDelayMs: 0 } } } });
  const by = (s) => Object.values(r.doc.cameras).filter((c, i) => cams[i].sourceId === s);
  assert.ok(by('fast').every((c) => c.status === 'reachable'));
  assert.ok(by('slow').some((c) => c.status === 'unknown' && c.reason === 'time-budget'));
  assert.equal(r.name, 'health.json');
  assert.equal(r.doc.runOk, true);
});

test('A7: a previous file that exists but cannot be fetched is not a first run; the run is partial and health.json is untouched', async () => {
  handler = (req, res) => (res.writeHead(500), res.end());
  const st = {};
  assert.equal(await loadPrevious(`${base}/health.json`, () => {}, st), null);
  assert.equal(st.failed, true);
  const st2 = {};
  handler = (req, res) => (res.writeHead(404), res.end());
  await loadPrevious(`${base}/health.json`, () => {}, st2);
  assert.equal(st2.failed, undefined, '404 = no file yet = first run');
  handler = (req, res) => sendJpeg(res);
  const outDir = mkdtempSync(join(tmpdir(), 'rah-'));
  writeFileSync(join(outDir, 'health.json'), 'GOOD');
  const r = await go([cam(1)], { outDir, previousFailed: true });
  assert.equal(r.name, 'health.partial.json');
  assert.equal(readFileSync(join(outDir, 'health.json'), 'utf8'), 'GOOD');
});

test('A8: a run where the reachable share collapses against the previous file is partial, never the new health.json', async () => {
  handler = (req, res) => (res.writeHead(404), res.end());
  const cams = Array.from({ length: 40 }, (_, i) => cam(i));
  const previous = { cameras: Object.fromEntries(cams.map((c) => [c.id, { status: 'reachable', lastChecked: new Date().toISOString() }])) };
  const r = await go(cams, { previous });
  assert.equal(r.partial, true);
  assert.match(r.doc.incomplete, /reachable share fell/);
  assert.ok(!existsSync(join(r.outDir, 'health.json')));
});
