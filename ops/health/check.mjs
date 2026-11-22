// Camera health checker. Reads data/camera-registry/cameras.json, writes data/health/health.json (generated, gitignored).
// Usage: node ops/health/check.mjs [--previous <file|url>] [--registry <cameras.json>] [--out <health.json>]
//   [--limit N] [--sample N] [--max-requests 4000] [--budget-min 12] [--concurrency 6] [--host-delay-ms 100]
//   [--stale-hours 6] [--magic-all]
// Throttling: per-source concurrency, minimum delay between requests per host, a global request cap, a hard time budget,
// exponential backoff on 429/5xx, and a per-source circuit breaker (25 consecutive transport failures: the rest of that
// source is 'unknown', never 'unavailable'). Defaults to HEAD only (headers); --magic-all also reads the 3-byte signature.
// A run that is not ok, or leaves more than 20% 'unknown' (breaker, budget, cap), is written to health.partial.json and
// never replaces a good health.json. --limit / --sample runs write health.sample.json only.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJsonAtomic, readJsonOrNull } from '../importers/lib/registry.mjs';
import { observe, Limit } from './lib/probe.mjs';
import { classify } from './lib/classify.mjs';

export const CONFIG = { concurrency: 6, hostDelayMs: 100, maxRequests: 4000, budgetMs: 12 * 60000, breakerAt: 25, retries: 2, backoffMs: 1000, backoffMaxMs: 30000, timeoutMs: 15000, staleHours: 6, minBytes: 1000, maxUnknownShare: 0.2, magicAll: false };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STATUSES = ['reachable', 'stale', 'unavailable', 'unknown'];

export async function loadPrevious(arg, log = () => {}) {
  let doc = null;
  try {
    if (/^https?:\/\//i.test(arg || '')) {
      const r = await fetch(arg, { headers: { 'User-Agent': 'NearbyCams-build' }, signal: AbortSignal.timeout(20000) });
      if (r.ok) doc = await r.json();
    } else if (arg) doc = readJsonOrNull(arg);
  } catch { doc = null; }
  if (!doc || typeof doc !== 'object' || !doc.cameras || typeof doc.cameras !== 'object') {
    log(arg ? `previous health file unusable (${arg}): starting fresh` : 'no previous health file: starting fresh (first run)');
    return null;
  }
  return doc;
}

// Even spread: round-robin over groups (id minus its last "-<n>", i.e. the district).
export function sampleCameras(cams, n) {
  const groups = new Map();
  for (const c of cams) { const g = c.id.replace(/-[^-]+$/, ''); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(c); }
  const lists = [...groups.values()], out = [];
  for (let i = 0; out.length < n && lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length && out.length < n) out.push(l[i]);
  return out;
}

export async function run(opts) {
  const cfg = { ...CONFIG, ...(opts.config || {}) };
  const log = opts.log || (() => {});
  const now = opts.now || (() => new Date());
  let cams = opts.cameras;
  const isSample = Boolean(opts.sample || opts.limit);
  if (opts.sample) cams = sampleCameras(cams, opts.sample);
  else if (opts.limit) cams = cams.slice(0, opts.limit);
  const prev = (opts.previous && opts.previous.cameras) || {};
  const t0 = Date.now(), deadline = t0 + cfg.budgetMs, stamp = now().toISOString();

  const state = { requests: 0, hit: null, hosts: new Map() };
  const perSource = {}, rec = {};
  const ctxFor = (src) => ({
    ...cfg,
    async before(url) {
      if (state.requests >= cfg.maxRequests) throw new Limit('cap');
      if (Date.now() >= deadline) throw new Limit('time');
      const h = new URL(url).host, t = Math.max(Date.now(), state.hosts.get(h) || 0);
      state.hosts.set(h, t + cfg.hostDelayMs);
      state.requests++; src.requests++; // reserved before the sleep so concurrent workers cannot pass the cap together
      if (t > Date.now()) await sleep(t - Date.now());
      if (Date.now() >= deadline) { state.requests--; src.requests--; throw new Limit('time'); }
    },
    deadline,
  });

  const bySource = new Map();
  for (const c of cams) { if (!bySource.has(c.sourceId)) bySource.set(c.sourceId, []); bySource.get(c.sourceId).push(c); }

  const unknownRec = (c, reason) => {
    const p = prev[c.id] || {};
    return { status: 'unknown', httpStatus: null, contentType: null, contentLength: null, lastChecked: p.lastChecked || null, lastSuccess: p.lastSuccess || null, lastChanged: p.lastChanged || null, consecutiveFailures: p.consecutiveFailures || 0, feedKind: p.feedKind || 'unknown', fingerprint: p.fingerprint || null, unknownReason: reason };
  };

  async function checkOne(c, src, ctx) {
    if (src.open) { src.skipped++; return unknownRec(c, 'circuit-breaker'); }
    let o;
    try { new URL(c.officialUrl); } catch { return { ...unknownRec(c, 'bad-url'), status: 'unavailable', reason: 'bad-url', unknownReason: undefined, lastChecked: stamp }; }
    try { o = await observe(c.officialUrl, ctx); } catch (e) { if (e instanceof Limit) { state.hit = state.hit || e.reason; src.skipped++; return unknownRec(c, e.reason === 'cap' ? 'request-cap' : 'time-budget'); } throw e; }
    const k = classify(c.officialUrl, o, { staleHours: src.staleHours, minBytes: cfg.minBytes }, now());
    if (k.transient) { if (++src.consec >= cfg.breakerAt) src.open = true; } else src.consec = 0;
    const p = prev[c.id] || {}, ok = k.status === 'reachable' || k.status === 'stale';
    const changed = ok && k.fingerprint && k.fingerprint !== p.fingerprint;
    const lm = Date.parse(o.lastModified || '');
    return {
      status: k.status, httpStatus: o.httpStatus ?? null, contentType: o.contentType ?? null, contentLength: o.contentLength ?? null,
      lastChecked: stamp, lastSuccess: ok ? stamp : p.lastSuccess || null,
      // lastChanged: only when the header fingerprint (ETag, else Last-Modified, else size) differs from the previous run;
      // a changed one is dated by the server's Last-Modified when it gave one. An unchanged picture is not a dead camera.
      lastChanged: changed ? (Number.isFinite(lm) ? new Date(lm).toISOString() : p.fingerprint ? stamp : p.lastChanged || null) : p.lastChanged || null,
      consecutiveFailures: k.status === 'unavailable' ? (p.consecutiveFailures || 0) + 1 : ok ? 0 : p.consecutiveFailures || 0,
      feedKind: k.feedKind, fingerprint: ok ? k.fingerprint : p.fingerprint || null, ...(k.status === 'unavailable' || k.status === 'unknown' ? { reason: k.reason } : {}),
    };
  }

  await Promise.all([...bySource].map(async ([id, list]) => {
    const src = perSource[id] = { total: list.length, requests: 0, skipped: 0, consec: 0, open: false, staleHours: (cfg.perSource && cfg.perSource[id] && cfg.perSource[id].staleHours) || cfg.staleHours };
    const ctx = ctxFor(src), queue = [...list];
    const conc = (cfg.perSource && cfg.perSource[id] && cfg.perSource[id].concurrency) || cfg.concurrency;
    await Promise.all(Array.from({ length: conc }, async () => { for (let c; (c = queue.shift());) rec[c.id] = await checkOne(c, src, ctx); }));
  }));

  const total = cams.length, cameras = {};
  for (const c of cams) cameras[c.id] = rec[c.id];
  const summary = {};
  for (const [id, s] of Object.entries(perSource)) {
    const n = Object.fromEntries(STATUSES.map((x) => [x, 0]));
    for (const c of bySource.get(id)) n[cameras[c.id].status]++;
    summary[id] = { total: s.total, ...n, requests: s.requests, circuitOpen: s.open, staleHours: s.staleHours };
  }
  const unknownRun = Object.values(cameras).filter((c) => c.status === 'unknown').length; // breaker, budget, cap and survived-429 alike
  const share = total ? unknownRun / total : 1;
  const runOk = total > 0 && !state.hit;
  const doc = { generatedAt: stamp, runOk, requests: state.requests, elapsedMs: Date.now() - t0, staleHours: cfg.staleHours, perSource: summary, cameras };
  if (!runOk) doc.incomplete = state.hit ? `${state.hit === 'cap' ? 'request cap' : 'time budget'} reached` : 'no cameras';
  // Strip our private bookkeeping key from the published record.
  for (const c of Object.values(cameras)) { if (c.unknownReason) { c.reason = c.unknownReason; } delete c.unknownReason; }

  const dir = opts.outDir;
  const partial = !runOk || share > cfg.maxUnknownShare;
  const name = isSample ? 'health.sample.json' : partial ? 'health.partial.json' : 'health.json';
  const path = join(dir, name);
  writeJsonAtomic(path, doc);
  const line = partial && !isSample
    ? `PARTIAL run (runOk=${runOk}, ${(share * 100).toFixed(0)}% unknown from breaker/budget/cap): wrote ${name}, left health.json untouched`
    : `wrote ${name}`;
  log(`${line}; ${total} cameras, ${state.requests} requests, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return { path, name, doc, partial, share };
}

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    if (k === 'magic-all') o[k] = true; else o[k] = argv[++i];
  }
  return o;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = args(process.argv.slice(2));
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const regFile = a.registry || join(root, 'data', 'camera-registry', 'cameras.json');
  const out = a.out ? resolve(a.out) : join(root, 'data', 'health', 'health.json');
  const num = (v, d) => (v === undefined ? d : Number(v));
  const config = { concurrency: num(a.concurrency, CONFIG.concurrency), hostDelayMs: num(a['host-delay-ms'], CONFIG.hostDelayMs), maxRequests: num(a['max-requests'], CONFIG.maxRequests), budgetMs: num(a['budget-min'], 12) * 60000, staleHours: num(a['stale-hours'], CONFIG.staleHours), magicAll: Boolean(a['magic-all']) };
  if (!existsSync(regFile)) { console.error(`registry not found: ${regFile}`); process.exit(2); }
  const log = (m) => console.log(m);
  const previous = await loadPrevious(a.previous, log);
  const r = await run({ cameras: JSON.parse(readFileSync(regFile, 'utf8')), previous, outDir: dirname(out), config, log, limit: a.limit && !a.sample ? Number(a.limit) : 0, sample: a.sample ? Number(a.sample) : 0 });
  console.log(JSON.stringify(Object.fromEntries(Object.entries(r.doc.perSource).map(([k, v]) => [k, v])), null, 1));
  process.exit(0);
}
