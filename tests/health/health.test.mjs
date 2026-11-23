// Offline tests for the camera health checker: a local http server on 127.0.0.1, no internet.
// Run: node --test tests/health/health.test.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, loadPrevious, sampleCameras } from '../../ops/health/check.mjs';
import { EXTRA_HEADERS } from '../../ops/health/lib/probe.mjs';
import { classify, feedKindOf } from '../../ops/health/lib/classify.mjs';

const JPEG = (extra = '') => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(extra), Buffer.alloc(2500, 7)]);
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toUTCString();

let server, base, seen = [], handler;
before(async () => {
  server = http.createServer((req, res) => { seen.push({ method: req.method, url: req.url, range: req.headers.range, ua: req.headers['user-agent'] }); handler(req, res); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const fast = { hostDelayMs: 0, backoffMs: 5, backoffMaxMs: 20, retries: 2 };
const cam = (i, path = `/c${i}.jpg`, sourceId = 't') => ({ id: `${sourceId}-${i}`, sourceId, officialUrl: base + path });
const go = async (cams, o = {}) => {
  seen = [];
  const outDir = o.outDir || mkdtempSync(join(tmpdir(), 'health-'));
  const r = await run({ cameras: cams, outDir, previous: o.previous || null, config: { ...fast, ...(o.config || {}) }, limit: o.limit, sample: o.sample });
  return { ...r, outDir, rec: (i) => r.doc.cameras[cams[i].id] };
};
const sendJpeg = (res, headers = {}, body = JPEG()) => { res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': body.length, ...headers }); res.end(body); };

test('a 200 with an HTML error body is unavailable, not reachable', async () => {
  handler = (req, res) => { const b = '<html>Error</html>'.repeat(100); res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': b.length }); res.end(b); };
  const r = await go([cam(1)]);
  assert.equal(r.rec(0).status, 'unavailable');
  assert.equal(r.rec(0).reason, 'not-an-image');
  assert.equal(r.rec(0).httpStatus, 200);
});

test('a 200 with a JSON error body is unavailable', async () => {
  handler = (req, res) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': 2000 }); res.end('{}'); };
  assert.equal((await go([cam(1)])).rec(0).status, 'unavailable');
});

test('a tiny image is unavailable (minimum size)', async () => {
  handler = (req, res) => sendJpeg(res, {}, Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]));
  assert.equal((await go([cam(1)])).rec(0).reason, 'too-small');
});

test('a JPEG with the right magic bytes is reachable; the wrong magic is unavailable', async () => {
  handler = (req, res) => sendJpeg(res);
  const ok = await go([cam(1)], { config: { magicAll: true } });
  assert.equal(ok.rec(0).status, 'reachable');
  assert.deepEqual(seen.map((s) => s.method), ['HEAD', 'GET']);
  handler = (req, res) => sendJpeg(res, {}, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(2500)]));
  const bad = await go([cam(1)], { config: { magicAll: true } });
  assert.equal(bad.rec(0).status, 'unavailable');
  assert.equal(bad.rec(0).reason, 'bad-signature');
});

test('stale: Last-Modified older than the stale limit; fresh one stays reachable; no Last-Modified cannot be stale', async () => {
  handler = (req, res) => sendJpeg(res, { 'Last-Modified': hoursAgo(10) });
  assert.equal((await go([cam(1)])).rec(0).status, 'stale');
  handler = (req, res) => sendJpeg(res, { 'Last-Modified': hoursAgo(1) });
  assert.equal((await go([cam(1)])).rec(0).status, 'reachable');
  handler = (req, res) => sendJpeg(res, { 'Last-Modified': hoursAgo(10) });
  assert.equal((await go([cam(1)], { config: { staleHours: 12 } })).rec(0).status, 'reachable');
  handler = (req, res) => sendJpeg(res);
  assert.equal((await go([cam(1)])).rec(0).status, 'reachable');
});

test('unchanged ETag keeps lastChanged; a changed ETag moves it; the status stays separate', async () => {
  let etag = '"a"';
  handler = (req, res) => sendJpeg(res, { ETag: etag });
  const first = await go([cam(1)]);
  assert.equal(first.rec(0).lastChanged, null, 'first run: nothing to compare with, not invented');
  const prev1 = { cameras: { 't-1': { ...first.rec(0), lastChanged: '2026-01-01T00:00:00.000Z' } } };
  const second = await go([cam(1)], { previous: prev1 });
  assert.equal(second.rec(0).lastChanged, '2026-01-01T00:00:00.000Z');
  assert.equal(second.rec(0).status, 'reachable');
  etag = '"b"';
  const third = await go([cam(1)], { previous: prev1 });
  assert.ok(Date.parse(third.rec(0).lastChanged) > Date.parse('2026-01-01'));
});

test('HEAD refused (405) falls back to one ranged GET', async () => {
  handler = (req, res) => (req.method === 'HEAD' ? (res.writeHead(405), res.end()) : (res.writeHead(206, { 'Content-Type': 'image/jpeg', 'Content-Range': 'bytes 0-1023/2504' }), res.end(JPEG().subarray(0, 1024))));
  const r = await go([cam(1)]);
  assert.equal(r.rec(0).status, 'reachable');
  assert.equal(r.rec(0).contentLength, 2504, 'size read from Content-Range, not the 1 KB slice');
  assert.deepEqual(seen.map((s) => [s.method, s.range]), [['HEAD', undefined], ['GET', 'bytes=0-1023']]);
  assert.equal(seen[0].ua, 'NearbyCams-build');
});

test('429 then success: backs off and retries; a 429 that never clears is unknown, not unavailable', async () => {
  let n = 0;
  handler = (req, res) => (++n <= 2 ? (res.writeHead(429), res.end()) : sendJpeg(res));
  const r = await go([cam(1)]);
  assert.equal(r.rec(0).status, 'reachable');
  assert.equal(seen.length, 3);
  handler = (req, res) => (res.writeHead(429), res.end());
  const t = await go([cam(1)]);
  assert.equal(t.rec(0).status, 'unknown');
  assert.equal(seen.length, 3, '1 try + 2 retries, then stop');
});

test('redirects: followed up to 3, a 4th hop is unavailable', async () => {
  handler = (req, res) => {
    const m = /^\/r(\d)\.jpg$/.exec(req.url);
    if (m && Number(m[1]) < 5) { res.writeHead(302, { Location: `/r${Number(m[1]) + 1}.jpg` }); return res.end(); }
    sendJpeg(res);
  };
  assert.equal((await go([cam(1, '/r2.jpg')])).rec(0).status, 'reachable'); // r2 -> r3 -> r4 -> r5 (3 hops)
  assert.equal((await go([cam(1, '/r1.jpg')])).rec(0).reason, 'too-many-redirects');
});

test('circuit breaker: after 25 transport failures the rest of the source is unknown, never unavailable; run is partial', async () => {
  handler = (req, res) => (res.writeHead(503), res.end());
  const cams = Array.from({ length: 40 }, (_, i) => cam(i));
  const r = await go(cams, { config: { concurrency: 1, retries: 0 } });
  const st = cams.map((c, i) => r.rec(i).status);
  assert.equal(st.filter((s) => s === 'unavailable').length, 25);
  assert.equal(st.filter((s) => s === 'unknown').length, 15);
  assert.ok(!st.slice(25).includes('unavailable'));
  assert.equal(r.doc.perSource.t.circuitOpen, true);
  assert.equal(seen.length, 25, 'no request after the breaker opened');
  assert.equal(r.partial, true);
  assert.equal(r.name, 'health.partial.json');
  assert.ok(!existsSync(join(r.outDir, 'health.json')));
});

test('a 404 is unavailable but is not a transport failure (does not open the breaker)', async () => {
  handler = (req, res) => (res.writeHead(404), res.end());
  const cams = Array.from({ length: 30 }, (_, i) => cam(i));
  const r = await go(cams, { config: { concurrency: 1 } });
  assert.equal(Object.values(r.doc.cameras).filter((c) => c.status === 'unavailable').length, 30);
  assert.equal(r.doc.perSource.t.circuitOpen, false);
});

test('request cap and time budget are respected', async () => {
  handler = (req, res) => sendJpeg(res);
  const cams = Array.from({ length: 12 }, (_, i) => cam(i));
  const capped = await go(cams, { config: { maxRequests: 5, concurrency: 1 } });
  assert.ok(seen.length <= 5);
  assert.equal(capped.doc.runOk, false);
  assert.equal(Object.values(capped.doc.cameras).filter((c) => c.reason === 'request-cap').length, 7);
  const timed = await go(Array.from({ length: 60 }, (_, i) => cam(i)), { config: { budgetMs: 60, hostDelayMs: 30, concurrency: 2 } });
  assert.ok(seen.length < 60, `time budget stopped the run (${seen.length} requests)`);
  assert.equal(timed.doc.runOk, false);
  assert.ok(Object.values(timed.doc.cameras).some((c) => c.reason === 'time-budget'));
});

test('a partial run never overwrites a good health.json', async () => {
  handler = (req, res) => sendJpeg(res);
  const outDir = mkdtempSync(join(tmpdir(), 'health-'));
  const good = JSON.stringify({ generatedAt: 'GOOD', runOk: true, cameras: {} });
  writeFileSync(join(outDir, 'health.json'), good);
  const r = await go(Array.from({ length: 10 }, (_, i) => cam(i)), { outDir, config: { maxRequests: 3, concurrency: 1 } });
  assert.equal(readFileSync(join(outDir, 'health.json'), 'utf8'), good);
  assert.equal(r.name, 'health.partial.json');
  assert.ok(existsSync(join(outDir, 'health.partial.json')));
  const full = await go([cam(1)], { outDir });
  assert.equal(full.name, 'health.json');
  assert.equal(JSON.parse(readFileSync(join(outDir, 'health.json'), 'utf8')).runOk, true);
});

test('a sample or limit run writes health.sample.json only', async () => {
  handler = (req, res) => sendJpeg(res);
  const cams = Array.from({ length: 6 }, (_, i) => cam(i));
  const r = await go(cams, { limit: 2 });
  assert.equal(r.name, 'health.sample.json');
  assert.equal(Object.keys(r.doc.cameras).length, 2);
  assert.ok(!existsSync(join(r.outDir, 'health.json')));
  const mixed = [...cams.slice(0, 3).map((c, i) => ({ ...c, id: `a-d01-${i}` })), ...cams.slice(3).map((c, i) => ({ ...c, id: `a-d02-${i}` }))];
  assert.deepEqual(sampleCameras(mixed, 2).map((c) => c.id), ['a-d01-0', 'a-d02-0']);
});

test('carry-over: consecutiveFailures and lastSuccess persist across runs; success resets the count', async () => {
  handler = (req, res) => (res.writeHead(404), res.end());
  const prev = { cameras: { 't-1': { status: 'unavailable', consecutiveFailures: 2, lastSuccess: '2026-11-01T00:00:00.000Z', lastChanged: '2026-10-30T00:00:00.000Z', fingerprint: '"a"' } } };
  const r = await go([cam(1)], { previous: prev });
  assert.equal(r.rec(0).consecutiveFailures, 3);
  assert.equal(r.rec(0).lastSuccess, '2026-11-01T00:00:00.000Z');
  assert.equal(r.rec(0).lastChanged, '2026-10-30T00:00:00.000Z');
  handler = (req, res) => sendJpeg(res);
  const ok = await go([cam(1)], { previous: { cameras: { 't-1': r.rec(0) } } });
  assert.equal(ok.rec(0).consecutiveFailures, 0);
  assert.ok(Date.parse(ok.rec(0).lastSuccess) > Date.parse('2026-11-02'));
  // unknown (throttled) keeps the old count instead of resetting or adding
  handler = (req, res) => (res.writeHead(429), res.end());
  const t = await go([cam(1)], { previous: { cameras: { 't-1': r.rec(0) } } });
  assert.equal(t.rec(0).consecutiveFailures, 3);
});

test('previous file: missing or unusable starts fresh and says so; a good file loads', async () => {
  const msgs = [];
  assert.equal(await loadPrevious(join(tmpdir(), 'nope-health.json'), (m) => msgs.push(m)), null);
  assert.match(msgs[0], /starting fresh/);
  const d = mkdtempSync(join(tmpdir(), 'health-'));
  writeFileSync(join(d, 'p.json'), JSON.stringify({ cameras: { a: {} } }));
  assert.deepEqual(Object.keys((await loadPrevious(join(d, 'p.json'))).cameras), ['a']);
  handler = (req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ cameras: { b: {} } })); };
  assert.deepEqual(Object.keys((await loadPrevious(`${base}/health.json`)).cameras), ['b']);
  handler = (req, res) => (res.writeHead(404), res.end());
  assert.equal(await loadPrevious(`${base}/health.json`, () => {}), null);
});

test('feedKind comes from the URL and the response, never guessed as video', () => {
  assert.equal(feedKindOf('https://x/a.JPG'), 'still');
  assert.equal(feedKindOf('https://x/a.png?x=1'), 'still');
  assert.equal(feedKindOf('https://x/a.m3u8'), 'video');
  assert.equal(feedKindOf('https://x/watch', 'text/html'), 'operator-page');
  assert.equal(feedKindOf('https://x/live', 'application/vnd.apple.mpegurl'), 'video');
  assert.equal(feedKindOf('https://x/live', null), 'unknown');
  assert.equal(feedKindOf('not a url'), 'unknown');
  assert.equal(classify('https://x/watch', { httpStatus: 200, contentType: 'text/html' }).status, 'unknown'); // an HTML page is never a reachable picture
});

test('no image bytes are persisted: only headers and a status survive, not even the 3-byte signature', async () => {
  const MARK = 'SECRETPIXELS';
  handler = (req, res) => sendJpeg(res, { ETag: '"e"', 'Last-Modified': hoursAgo(1) }, JPEG(MARK));
  const r = await go([cam(1)], { config: { magicAll: true } });
  assert.equal(r.rec(0).status, 'reachable');
  const files = readdirSync(r.outDir);
  assert.deepEqual(files, ['health.json']);
  const text = readFileSync(join(r.outDir, 'health.json'), 'utf8');
  assert.ok(!text.includes(MARK) && !text.includes('ffd8ff') && !/signature/i.test(text));
  const allowed = new Set(['status', 'httpStatus', 'contentType', 'contentLength', 'lastChecked', 'lastSuccess', 'lastChanged', 'consecutiveFailures', 'feedKind', 'fingerprint', 'reason']);
  for (const c of Object.values(r.doc.cameras)) for (const k of Object.keys(c)) assert.ok(allowed.has(k), `unexpected field ${k}`);
});

test('top level has generatedAt, runOk and a per-source summary', async () => {
  handler = (req, res) => sendJpeg(res);
  const r = await go([cam(1), cam(2)]);
  assert.ok(Date.parse(r.doc.generatedAt) > 0);
  assert.equal(r.doc.runOk, true);
  assert.deepEqual([r.doc.perSource.t.total, r.doc.perSource.t.reachable, r.doc.perSource.t.unknown], [2, 2, 0]);
});

test('adversarial: empty body is never reachable (magic read), operator pages and bad URLs never crash or count reachable', async () => {
  handler = (req, res) => { res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Transfer-Encoding': 'chunked' }); res.end(); };
  const e = await go([cam(1)], { config: { magicAll: true } });
  assert.equal(e.rec(0).status, 'unavailable');
  handler = (req, res) => { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': 5000 }); res.end('x'); };
  const p = await go([cam(1, '/watch')]);
  assert.equal(p.rec(0).status, 'unknown');
  const b = await go([{ id: 't-9', sourceId: 't', officialUrl: 'not a url' }]);
  assert.equal(b.rec(0).status, 'unavailable');
});

test('adversarial: a survived 429 counts toward the unknown share, so the run is partial', async () => {
  handler = (req, res) => { res.writeHead(429, { 'Retry-After': '0' }); res.end(); };
  const outDir = mkdtempSync(join(tmpdir(), 'health-'));
  const r = await go(Array.from({ length: 5 }, (_, i) => cam(i)), { outDir });
  assert.equal(r.name, 'health.partial.json');
  assert.ok(!existsSync(join(outDir, 'health.json')));
});

test('adversarial: concurrent workers never pass the request cap', async () => {
  handler = (req, res) => sendJpeg(res);
  const r = await go(Array.from({ length: 40 }, (_, i) => cam(i)), { config: { maxRequests: 7, concurrency: 6, hostDelayMs: 5 } });
  assert.ok(seen.length <= 7 && r.doc.requests <= 7, `${seen.length} requests`);
});

// ---- British Columbia (drivebc): its own pace and stale limit; a one-source run never replaces health.json ----
import { CONFIG, spread } from '../../ops/health/check.mjs';
test('BC config: drivebc has its own gentler pace (>= 250 ms between requests, <= 3 workers) and a 4 h stale limit', () => {
  const b = CONFIG.perSource.drivebc;
  assert.ok(b.hostDelayMs >= 250 && b.concurrency <= 3, JSON.stringify(b));
  assert.equal(b.staleHours, 4);
  assert.ok(CONFIG.maxRequests >= 3263 + 1036 + 500, 'request cap must cover Caltrans + BC with retries');
});

test('BC pace: a per-source hostDelayMs spaces requests to that host (4 requests, 120 ms apart, take at least 330 ms)', async () => {
  handler = (req, res) => sendJpeg(res);
  const t0 = Date.now();
  const r = await go([1, 2, 3, 4].map((i) => cam(i, `/d${i}.jpg`, 'drivebc')), { config: { perSource: { drivebc: { hostDelayMs: 120, concurrency: 3 } } } });
  assert.ok(Date.now() - t0 >= 330, `took only ${Date.now() - t0} ms`);
  assert.equal(r.doc.perSource.drivebc.reachable, 4);
  assert.equal(r.doc.perSource.drivebc.requests, 4);
});

test('BC stale limit: a picture last modified 5 h ago is stale for drivebc (4 h) but reachable for another source (6 h)', async () => {
  handler = (req, res) => sendJpeg(res, { 'Last-Modified': hoursAgo(5) });
  const r = await go([cam(1, '/a.jpg', 'drivebc'), cam(2, '/b.jpg', 't')]);
  assert.equal(r.doc.cameras['drivebc-1'].status, 'stale');
  assert.equal(r.doc.cameras['t-2'].status, 'reachable');
  assert.equal(r.doc.perSource.drivebc.staleHours, 4);
});

test('BC html error page behind a 200 is unavailable (same rule as every source)', async () => {
  handler = (req, res) => { const b = '<html>DriveBC error</html>'.repeat(100); res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': b.length }); res.end(b); };
  const r = await go([cam(1, '/x.jpg', 'drivebc')]);
  assert.equal(r.doc.cameras['drivebc-1'].status, 'unavailable');
});

test('--source: only that source is checked and the output is health.sample.json, never health.json (failing fixture: a one-source run must not replace the full file)', async () => {
  handler = (req, res) => sendJpeg(res);
  const outDir = mkdtempSync(join(tmpdir(), 'health-'));
  writeFileSync(join(outDir, 'health.json'), '{"keep":true}');
  const cams = [cam(1, '/a.jpg', 'drivebc'), cam(2, '/b.jpg', 'drivebc'), cam(3, '/c.jpg', 't')];
  seen = [];
  const r = await run({ cameras: cams, outDir, previous: null, config: fast, source: 'drivebc' });
  assert.equal(r.name, 'health.sample.json');
  assert.deepEqual(Object.keys(r.doc.cameras).sort(), ['drivebc-1', 'drivebc-2']);
  assert.equal(readFileSync(join(outDir, 'health.json'), 'utf8'), '{"keep":true}');
  assert.ok(seen.every((s) => !s.url.startsWith('/c.jpg')), 'the other source was not requested');
});

test('sample of one big group is evenly spread over the list, not its first N', () => {
  const list = Array.from({ length: 100 }, (_, i) => ({ id: `drivebc-${i}`, sourceId: 'drivebc' }));
  assert.deepEqual(sampleCameras(list, 4).map((c) => c.id), ['drivebc-0', 'drivebc-25', 'drivebc-50', 'drivebc-75']);
  assert.deepEqual(spread([1, 2, 3], 5), [1, 2, 3]);
});

// ---- world sources (2026-11-23): Finland (digitraffic) and Quebec (quebec-mtmd) ----
const REAL_CAMS = JSON.parse(readFileSync(new URL('../../data/camera-registry/cameras.json', import.meta.url), 'utf8'));

test('digitraffic config: one worker, 1100 ms apart (under its 60 requests a minute), and the whole Finland list fits the time budget and the cap', () => {
  const c = CONFIG.perSource.digitraffic;
  assert.equal(c.concurrency, 1);
  assert.ok(c.hostDelayMs >= 1000, 'at most 60 requests a minute');
  const n = REAL_CAMS.filter((x) => x.sourceId === 'digitraffic').length;
  assert.ok(n >= 100, 'the real registry holds the Finland list');
  assert.ok(n * c.hostDelayMs < CONFIG.budgetMs * 0.95, `${n} cameras x ${c.hostDelayMs} ms must fit the ${CONFIG.budgetMs / 60000} min budget`);
  const probed = REAL_CAMS.filter((x) => !(CONFIG.perSource[x.sourceId] && CONFIG.perSource[x.sourceId].skip)).length;
  assert.ok(probed * 1.2 < CONFIG.maxRequests, `${probed} probed cameras plus retries must fit the cap ${CONFIG.maxRequests}`);
});

test('the Digitraffic-User header is sent only to the weather camera host and holds no personal detail', () => {
  assert.deepEqual(Object.keys(EXTRA_HEADERS), ['weathercam.digitraffic.fi']);
  assert.match(EXTRA_HEADERS['weathercam.digitraffic.fi']['Digitraffic-User'], /^NearbyCams-build$/);
});

test('needValidators: a JPEG with no Last-Modified and no ETag (Digitraffic "Image not available") is unavailable for that source and reachable for others (failing fixture)', async () => {
  handler = (req, res) => sendJpeg(res, {}, Buffer.concat([JPEG(), Buffer.alloc(8000, 1)]));
  const r = await go([cam(1, '/a.jpg', 'digitraffic'), cam(2, '/b.jpg', 'other')], { config: { perSource: { digitraffic: { needValidators: true } } } });
  assert.equal(r.rec(0).status, 'unavailable');
  assert.equal(r.rec(0).reason, 'placeholder-no-validators');
  assert.equal(r.rec(1).status, 'reachable');
  handler = (req, res) => sendJpeg(res, { 'Last-Modified': hoursAgo(0.1) });
  assert.equal((await go([cam(1, '/a.jpg', 'digitraffic')], { config: { perSource: { digitraffic: { needValidators: true } } } })).rec(0).status, 'reachable', 'a dated picture is fine');
});

test('skip: a source that blocks automated checks gets no request, is unknown with a reason, never unavailable, and does not make the run partial', async () => {
  handler = (req, res) => sendJpeg(res, { 'Last-Modified': hoursAgo(0.1) });
  const cams = [...[1, 2, 3, 4].map((i) => cam(i, `/s${i}.jpg`, 'blocked')), ...[5, 6, 7].map((i) => cam(i, `/g${i}.jpg`, 'good'))];
  const r = await go(cams, { config: { perSource: { blocked: { skip: 'host-blocks-automated-checks' } } } });
  assert.equal(seen.filter((s) => /\/s\d/.test(s.url)).length, 0, 'no request to the blocked source');
  for (let i = 0; i < 4; i++) { assert.equal(r.rec(i).status, 'unknown'); assert.equal(r.rec(i).reason, 'host-blocks-automated-checks'); assert.equal(r.rec(i).httpStatus, null); }
  for (let i = 4; i < 7; i++) assert.equal(r.rec(i).status, 'reachable');
  assert.equal(r.partial, false, '4 of 7 unknown by design must not trip the 20% rule');
  assert.equal(r.name, 'health.json');
  assert.equal(r.doc.perSource.blocked.skipped, 'host-blocks-automated-checks');
});

test('skip: unknowns that are NOT by design still count (a survived 429 on a normal source makes the run partial even beside a skipped source)', async () => {
  handler = (req, res) => { if (/\/g/.test(req.url)) { res.writeHead(429, { 'Retry-After': '0' }); res.end(); } else sendJpeg(res); };
  const cams = [...[1, 2].map((i) => cam(i, `/s${i}.jpg`, 'blocked')), ...[3, 4].map((i) => cam(i, `/g${i}.jpg`, 'good'))];
  const r = await go(cams, { config: { perSource: { blocked: { skip: 'x' } } } });
  assert.equal(r.partial, true);
});

test('the real Quebec config skips quebec-mtmd and no Quebec link is ever requested', () => {
  assert.equal(CONFIG.perSource['quebec-mtmd'].skip, 'host-blocks-automated-checks');
  assert.ok(REAL_CAMS.filter((x) => x.sourceId === 'quebec-mtmd').every((x) => x.officialUrl.startsWith('https://www.quebec511.info/')));
});
