// Real-browser boot test: host page on http://localhost:9000 embeds the proxied engine
// (http://map.example.test:8080/?embed=1, mapped to 127.0.0.1 by the browser only).
// Ready signal (read in gev/src/render/cesium/appRenderer.js): the renderer appends
// <div id="cesium-credits"> to document.body once the Cesium viewer is being created;
// we also require a <canvas> in the same frame.
// Fails only on uncaught page errors or a boot timeout in the detailed runs. Everything else is INFO.
import http from 'node:http';
import { chromium, devices } from 'playwright';

const HOST_PORT = 9000;
const ENGINE = 'http://map.example.test:8080/?embed=1';
const REPEATS = Number(process.env.REPEATS || 20);
const BOOT_MS = 90_000;
const OUT = process.env.OUT_DIR || 'out';

import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(`<!doctype html><title>host</title><body style="margin:0"><iframe id="map" src="${ENGINE}" style="border:0;width:100vw;height:100vh" allow="fullscreen"></iframe>`);
});
await new Promise((r) => server.listen(HOST_PORT, '127.0.0.1', r));

const browser = await chromium.launch({
  args: [
    '--host-resolver-rules=MAP map.example.test 127.0.0.1',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  ],
});

const noStorage = `for (const k of ['localStorage','sessionStorage']) {
  try { Object.defineProperty(window, k, { get() { throw new DOMException('blocked', 'SecurityError'); } }); } catch {}
}`;

async function bootOnce({ name, ctxOpts = {}, storageBlocked = false, watchHmrMs = 0, shot = false }) {
  const ctx = await browser.newContext(ctxOpts);
  if (storageBlocked) await ctx.addInitScript(noStorage);
  const page = await ctx.newPage();
  const r = { name, ok: false, ms: null, pageErrors: [], consoleErrors: [], failedRequests: [], hmr: [] };
  page.on('pageerror', (e) => r.pageErrors.push(String(e.message || e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') r.consoleErrors.push(m.text().slice(0, 300)); });
  page.on('requestfailed', (q) => r.failedRequests.push(`${q.url().slice(0, 150)} ${q.failure()?.errorText}`));
  page.on('response', (s) => { if (s.status() >= 400) r.failedRequests.push(`${s.status()} ${s.url().slice(0, 150)}`); });
  page.on('websocket', (ws) => {
    const h = { url: ws.url().slice(0, 150), openedAt: Date.now(), closedAfterMs: null, error: null };
    ws.on('socketerror', (e) => { h.error = String(e).slice(0, 150); });
    ws.on('close', () => { h.closedAfterMs = Date.now() - h.openedAt; });
    r.hmr.push(h);
  });
  const t0 = Date.now();
  try {
    await page.goto(`http://localhost:${HOST_PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const deadline = t0 + BOOT_MS;
    let frame;
    while (!(frame = page.frames().find((f) => f.url().startsWith('http://map.example.test:8080')))) {
      if (Date.now() > deadline) throw new Error('engine iframe never appeared');
      await page.waitForTimeout(500);
    }
    await frame.waitForFunction(
      () => !!document.querySelector('#cesium-credits') && !!document.querySelector('canvas'),
      null, { timeout: Math.max(1000, deadline - Date.now()), polling: 500 });
    r.ok = true;
    r.ms = Date.now() - t0;
    if (watchHmrMs) await page.waitForTimeout(watchHmrMs);
    if (shot) await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 40 });
  } catch (e) {
    r.error = String(e.message || e).split('\n')[0];
    if (shot) await page.screenshot({ path: `${OUT}/${name}-FAILED.jpg`, type: 'jpeg', quality: 40 }).catch(() => {});
  }
  r.hmr = r.hmr.map((h) => ({ url: h.url, stillOpenAtEnd: h.closedAfterMs === null, closedAfterMs: h.closedAfterMs, error: h.error }));
  await ctx.close();
  return r;
}

function print(r) {
  console.log(`\n=== ${r.name}: ${r.ok ? 'BOOTED' : 'FAILED'}${r.ms ? ` in ${r.ms}ms` : ''}${r.error ? ` (${r.error})` : ''}`);
  console.log(`  uncaught page errors: ${r.pageErrors.length}`);
  r.pageErrors.slice(0, 10).forEach((e) => console.log(`    ${e}`));
  console.log(`  console errors: ${r.consoleErrors.length}`);
  r.consoleErrors.slice(0, 10).forEach((e) => console.log(`    ${e}`));
  console.log(`  failed requests / HTTP>=400: ${r.failedRequests.length}`);
  r.failedRequests.slice(0, 10).forEach((e) => console.log(`    ${e}`));
  console.log(`  websockets (INFO): ${JSON.stringify(r.hmr)}`);
}

let hardFail = false;
const iphone = { ...devices['iPhone 13'] };
delete iphone.defaultBrowserType;
const desktop = { viewport: { width: 1366, height: 768 } };

for (const [name, ctxOpts] of [['desktop', desktop], ['mobile-iphone13', iphone]]) {
  const r = await bootOnce({ name, ctxOpts, watchHmrMs: 30_000, shot: true });
  print(r);
  if (!r.ok || r.pageErrors.length) hardFail = true;
}

const ns = await bootOnce({ name: 'desktop-storage-blocked', ctxOpts: desktop, storageBlocked: true, shot: true });
print(ns);
console.log(`INFO storage-blocked boot: ${ns.ok ? 'works' : 'FAILS'} (not a failure criterion)`);

let fails = 0;
const times = [];
for (let i = 1; i <= REPEATS; i++) {
  const r = await bootOnce({ name: `repeat-${i}`, ctxOpts: desktop });
  if (r.ok) times.push(r.ms); else { fails++; console.log(`repeat ${i} FAILED: ${r.error} pageErrors=${r.pageErrors.length}`); }
}
times.sort((a, b) => a - b);
console.log(`\nREPEAT SUMMARY: ${REPEATS - fails}/${REPEATS} booted, failure rate ${((fails / REPEATS) * 100).toFixed(1)}% (kill criterion >1% over 1000 loads; INFO only)`);
if (times.length) console.log(`  boot ms min/median/max: ${times[0]} / ${times[times.length >> 1]} / ${times[times.length - 1]}`);

await browser.close();
server.close();
if (hardFail) { console.log('\nRESULT: FAIL (boot timeout or uncaught page error in a detailed run)'); process.exit(1); }
console.log('\nRESULT: PASS');
