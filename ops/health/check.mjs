// Camera health checker. Reads data/camera-registry/cameras.json, writes data/health/health.json (generated, gitignored).
// Usage: node ops/health/check.mjs [--previous <file|url>] [--registry <cameras.json>] [--out <health.json>]
//   [--limit N] [--sample N] [--max-requests 14000] [--budget-min 18] [--concurrency 6] [--host-delay-ms 100]
//   [--stale-hours 6] [--magic-all] [--source <sourceId>]   (--source checks one source only; with --sample it never writes health.json)
//   [--max-check-age-h 48] [--run-every-h 3]   (a camera's own check older than the first is unknown; the second only turns runs into hours in the report)
// Fair budget: each source gets a share of the time budget and request cap by its own polite pace; its cameras are checked oldest-last-checked first
// (never checked first); the ones a run does not reach keep their previous record from --previous. Per source the report says how many runs one full cycle takes.
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
import { planRun, oldestFirst, cycleText } from './lib/plan.mjs';
import { MAX_CHECK_AGE_H } from './lib/age.mjs';

// Fair budget (rule 'health-fair-budget'): each source gets a share of the time budget and of the request cap by its own polite pace
// (lib/plan.mjs); inside a source the cameras checked longest ago (never checked first) go first; the cameras a run does not reach keep
// their previous record, and one whose own last check is older than maxCheckAgeH becomes 'unknown' (lib/age.mjs, also used by the site).
// runEveryHours is the staging cron spacing ('17 */3 * * *'); it only turns "runs per full cycle" into hours for the report.
export const CONFIG = { concurrency: 6, hostDelayMs: 100, maxRequests: 14000, budgetMs: 18 * 60000, breakerAt: 25, retries: 2, backoffMs: 1000, backoffMaxMs: 30000, timeoutMs: 15000, staleHours: 6, minBytes: 1000, maxUnknownShare: 0.2, magicAll: false,
  maxCheckAgeH: MAX_CHECK_AGE_H, runEveryHours: 3, retrySlack: 0.9,
  // Per-source overrides (concurrency, hostDelayMs = minimum gap between requests to that source's host, staleHours).
  // drivebc: www.drivebc.ca publishes no rate limit and its API terms say limits may change without notice, so it gets its own
  // gentler pace (3 workers, 300 ms between requests = at most ~3 requests/s, HEAD only) and a 4 h stale limit (see docs/decisions/bc-health-stale-limit.md).
  // digitraffic (Finland): Digitraffic limits weather camera images to 60 requests a minute per IP without its Digitraffic-User header, so one worker
  // 1100 ms apart (54 a minute) is used whatever the header allows; 805 cameras take about 15 minutes, which is why the time budget is 18 minutes and the cap 7000 (raised to 9000 on 2026-11-24 when the Hong Kong list added 1,011 cameras, then to 10000 the same day when the Austin list added 823: the health test needs 1.2 x the probed cameras under the cap).
  // It answers a camera with no picture with a grey "Image not available" JPEG (200, image/jpeg, no Last-Modified, no ETag): needValidators counts that as unavailable.
  // quebec-mtmd: quebec511.info answers automated requests with a Cloudflare bot-check page (403, Cf-Mitigated: challenge); we do not work around it (CLAUDE.md),
  // so `skip` sends no request at all and every Quebec camera is unknown by design (never unavailable, and not counted in the 20% unknown limit).
  // toronto-traffic: opendata.toronto.ca publishes no rate limit and has no robots.txt of its own (it answers 302 to www.toronto.ca, whose
  // robots.txt names no /transportation/ path; read 2026-11-23). The picture files carry Cache-Control max-age=60, so a request a second
  // or two apart is far below what a browser page of them makes: 2 workers, 500 ms between requests (at most 2 a second), HEAD only.
  perSource: {
    drivebc: { concurrency: 3, hostDelayMs: 300, staleHours: 4 },
    'toronto-traffic': { concurrency: 2, hostDelayMs: 500, staleHours: 6 },
    'calgary-traffic': { concurrency: 2, hostDelayMs: 500, staleHours: 6 }, // trafficcam.calgary.ca: no robots.txt (404) and no stated limit; same polite pace as Toronto, HEAD only
    'hongkong-traffic': { concurrency: 1, hostDelayMs: 250, staleHours: 6 }, // tdcctv.data.one.gov.hk: no stated limit; one worker, 250 ms apart (at most 4 a second), HEAD only; 1,013 pictures take about 4.5 minutes
    'iceland-vegagerdin': { concurrency: 1, hostDelayMs: 250, staleHours: 6 }, // www.vegagerdin.is/vgdata/vefmyndavelar: no robots.txt (404) and no stated limit; one worker, 250 ms apart (at most 4 a second), HEAD only; about 500 pictures take about 2 minutes
    'tfl-jamcams': { concurrency: 1, hostDelayMs: 250, staleHours: 6 }, // s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk: no stated limit; one worker, 250 ms apart (at most 4 a second), HEAD only; about 792 pictures take about 3.5 minutes
    'austin-traffic':{ concurrency: 1, hostDelayMs: 250, staleHours: 6 }, // cctv.austinmobility.io: robots.txt is an S3 AccessDenied body (no rules) and no stated limit; one worker, 250 ms apart (at most 4 a second), HEAD only; about 823 pictures take about 3.5 minutes
    digitraffic: { concurrency: 1, hostDelayMs: 1100, staleHours: 6, needValidators: true },
    'quebec-mtmd': { skip: 'host-blocks-automated-checks' },
    'nsw-live-traffic': { skip: 'host-blocks-automated-checks' }, // webcams.transport.nsw.gov.au answers our client with an HTML placeholder (0 of 15 sampled returned an image, docs/source-audits/world-feed-audit-2026-11-23.md): no request, every NSW camera unknown by design
    // taiwan-thb: cctv-ss01..08.thb.gov.tw answers a HEAD request with 404 (a GET returns the JPEG, about 15 KB), so the usual HEAD check would mark every camera down. 2,354 GETs of about 15 KB each per run is too heavy for the free CI budget: no request, every Taiwan camera unknown by design (the page says live status is not checked). Revisit with a GET-based sampled check.
    'taiwan-thb': { skip: 'host-blocks-automated-checks' },
    'iowa-dot': { concurrency: 1, hostDelayMs: 250, staleHours: 6 }, // atmsqf.iowadot.gov: robots.txt 404 (no rules), no stated limit, a HEAD answers 200 image/jpeg (read 2026-11-24); one worker, 250 ms apart (at most 4 a second), HEAD only; 1,253 pictures take about 5 minutes (they run beside the other hosts, so the run time is still set by Finland, about 15 minutes of the 18 minute budget). The request cap was raised from 12000 to 14000 on 2026-11-24 when this list took the planned requests to 10,037: the health test needs 1.2 x the probed cameras under the cap for retries; cycling (a source checked every 2nd or 3rd run) is the next lever, not another raise
  } };
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
// Within a group the picks are evenly spaced (not the first N), so one source with a single group is sampled across its list.
export const spread = (l, k) => (l.length <= k ? l : Array.from({ length: k }, (_, j) => l[Math.floor((j * l.length) / k)]));
export function sampleCameras(cams, n) {
  const groups = new Map();
  for (const c of cams) { const g = c.id.replace(/-[^-]+$/, ''); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(c); }
  const lists = [...groups.values()].map((l) => spread(l, Math.ceil(n / groups.size))), out = [];
  for (let i = 0; out.length < n && lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length && out.length < n) out.push(l[i]);
  return out;
}

export async function run(opts) {
  const cfg = { ...CONFIG, ...(opts.config || {}) };
  const log = opts.log || (() => {});
  const now = opts.now || (() => new Date());
  let cams = opts.cameras;
  if (opts.source) cams = cams.filter((c) => c.sourceId === opts.source);
  const isSample = Boolean(opts.sample || opts.limit || opts.source); // a one-source run covers only part of the registry: never health.json
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
      state.hosts.set(h, t + ((cfg.perSource && cfg.perSource[src.id] && cfg.perSource[src.id].hostDelayMs) ?? cfg.hostDelayMs));
      state.requests++; src.requests++; // reserved before the sleep so concurrent workers cannot pass the cap together
      if (t > Date.now()) await sleep(t - Date.now());
      if (Date.now() >= deadline) { state.requests--; src.requests--; throw new Limit('time'); }
    },
    deadline,
  });

  const bySource = new Map();
  for (const c of cams) { if (!bySource.has(c.sourceId)) bySource.set(c.sourceId, []); bySource.get(c.sourceId).push(c); }
  const ps = (id) => (cfg.perSource && cfg.perSource[id]) || {};
  const plan = planRun([...bySource].map(([id, l]) => ({ id, total: l.length, delayMs: ps(id).hostDelayMs ?? cfg.hostDelayMs, skip: ps(id).skip })), cfg);
  const stampMs = Date.parse(stamp), deferredIds = new Set();
  // A camera this run does not reach: its previous record stays (status, lastChecked), unless it was never checked or its own check is too old.
  const carry = (c) => {
    deferredIds.add(c.id);
    const p = prev[c.id], t = Date.parse((p && p.lastChecked) || '');
    if (!Number.isFinite(t)) return unknownRec(c, 'never-checked');
    if (stampMs - t > cfg.maxCheckAgeH * 3600000) return unknownRec(c, 'check-too-old');
    return { ...p };
  };

  const unknownRec = (c, reason) => {
    const p = prev[c.id] || {};
    return { status: 'unknown', httpStatus: null, contentType: null, contentLength: null, lastChecked: p.lastChecked || null, lastSuccess: p.lastSuccess || null, lastChanged: p.lastChanged || null, consecutiveFailures: p.consecutiveFailures || 0, feedKind: p.feedKind || 'unknown', fingerprint: p.fingerprint || null, unknownReason: reason };
  };

  async function checkOne(c, src, ctx) {
    if (src.skip) return unknownRec(c, src.skip); // never probed: see CONFIG.perSource
    if (src.open) { src.skipped++; return unknownRec(c, 'circuit-breaker'); }
    let o;
    try { new URL(c.officialUrl); } catch { return { ...unknownRec(c, 'bad-url'), status: 'unavailable', reason: 'bad-url', unknownReason: undefined, lastChecked: stamp }; }
    try { o = await observe(c.officialUrl, ctx); } catch (e) { if (e instanceof Limit) { state.hit = state.hit || e.reason; src.skipped++; return unknownRec(c, e.reason === 'cap' ? 'request-cap' : 'time-budget'); } throw e; }
    const k = classify(c.officialUrl, o, { staleHours: src.staleHours, minBytes: cfg.minBytes, needValidators: src.needValidators }, now());
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
    const src = perSource[id] = { id, total: list.length, requests: 0, skipped: 0, consec: 0, open: false, staleHours: (cfg.perSource && cfg.perSource[id] && cfg.perSource[id].staleHours) || cfg.staleHours, skip: (cfg.perSource && cfg.perSource[id] && cfg.perSource[id].skip) || null, needValidators: Boolean(cfg.perSource && cfg.perSource[id] && cfg.perSource[id].needValidators) };
    // Skipped sources send nothing (every camera unknown by design). Others: the oldest-checked quota first, the rest carried forward.
    const ordered = src.skip ? list : oldestFirst(list, prev), n = src.skip ? list.length : Math.min(ordered.length, plan[id].quota);
    const ctx = ctxFor(src), queue = ordered.slice(0, n);
    for (const c of ordered.slice(n)) rec[c.id] = carry(c);
    src.scheduled = n;
    const t0 = Date.now(); // per-source runtime (item 28 stage 6): which source eats the time budget
    const conc = (cfg.perSource && cfg.perSource[id] && cfg.perSource[id].concurrency) || cfg.concurrency;
    await Promise.all(Array.from({ length: conc }, async () => { for (let c; (c = queue.shift());) rec[c.id] = await checkOne(c, src, ctx); }));
    src.ms = Date.now() - t0;
  }));

  const total = cams.length, cameras = {};
  for (const c of cams) cameras[c.id] = rec[c.id];
  const summary = {};
  for (const [id, s] of Object.entries(perSource)) {
    const n = Object.fromEntries(STATUSES.map((x) => [x, 0]));
    for (const c of bySource.get(id)) n[cameras[c.id].status]++;
    const dn = bySource.get(id).filter((c) => deferredIds.has(c.id)).length;
    summary[id] = { total: s.total, ...n, requests: s.requests, ms: s.ms ?? 0, circuitOpen: s.open, staleHours: s.staleHours, scheduled: s.skip ? 0 : s.scheduled, carriedForward: dn, cycleRuns: plan[id].runs, cycleHours: plan[id].hours, cycle: cycleText(id, s.skip ? null : plan[id], cfg.maxCheckAgeH), ...(s.skip ? { skipped: s.skip } : {}) };
  }
  const skippedIds = new Set(cams.filter((c) => perSource[c.sourceId].skip).map((c) => c.id)); // never probed on purpose: not a failure of this run
  // Failures only: breaker, budget, cap and survived-429. A camera this run never scheduled (carried forward, or never checked yet) is not a failure;
  // it is reported per source (carriedForward, cycle) and the page shows it as unknown once its own check is older than the limit.
  const unknownRun = cams.filter((c) => cameras[c.id].status === 'unknown' && !skippedIds.has(c.id) && !deferredIds.has(c.id)).length;
  const checkable = total - skippedIds.size - deferredIds.size;
  const share = checkable ? unknownRun / checkable : total ? 0 : 1;
  const runOk = total > 0 && !state.hit;
  const doc = { generatedAt: stamp, runOk, requests: state.requests, elapsedMs: Date.now() - t0, staleHours: cfg.staleHours, maxCheckAgeHours: cfg.maxCheckAgeH, perSource: summary, cameras };
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
  for (const s of Object.values(summary)) log(s.cycle);
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
  const config = { concurrency: num(a.concurrency, CONFIG.concurrency), hostDelayMs: num(a['host-delay-ms'], CONFIG.hostDelayMs), maxRequests: num(a['max-requests'], CONFIG.maxRequests), budgetMs: num(a['budget-min'], CONFIG.budgetMs / 60000) * 60000, staleHours: num(a['stale-hours'], CONFIG.staleHours), maxCheckAgeH: num(a['max-check-age-h'], CONFIG.maxCheckAgeH), runEveryHours: num(a['run-every-h'], CONFIG.runEveryHours), magicAll: Boolean(a['magic-all']) };
  if (!existsSync(regFile)) { console.error(`registry not found: ${regFile}`); process.exit(2); }
  const log = (m) => console.log(m);
  const previous = await loadPrevious(a.previous, log);
  const r = await run({ cameras: JSON.parse(readFileSync(regFile, 'utf8')), previous, outDir: dirname(out), config, log, limit: a.limit && !a.sample ? Number(a.limit) : 0, sample: a.sample ? Number(a.sample) : 0, source: a.source || '' });
  console.log(JSON.stringify(Object.fromEntries(Object.entries(r.doc.perSource).map(([k, v]) => [k, v])), null, 1));
  process.exit(0);
}
