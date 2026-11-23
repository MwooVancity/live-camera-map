// Fair scheduling for the health checker (master prompt "only what changed"): pure functions, no network, no clock.
// Rule 'health-fair-budget' (ops/harness/rules.mjs) is enforced by tests/health/health.test.mjs.

// How many cameras each source may check in ONE run.
//   time:    requests to one host are spaced by that source's own polite pace (workers do not multiply it), so in the time budget a source
//            can make at most budget * slack / delay requests. slack (default 0.9) leaves room for retries and the slow tail.
//   request: the shared request cap (also times slack) is split max-min fairly: a small source takes what it needs, the rest share the
//            remainder equally. So a huge source can never starve a small one, and no source gets less than an equal share of the cap.
// sources: [{ id, total, delayMs, skip }]. Returns { [id]: { quota, total, capacity, runs, hours } }.
// runs = how many runs it takes to check the whole set once (null when it is never probed); hours = runs * runEveryHours.
export function planRun(sources, { budgetMs, maxRequests, retrySlack = 0.9, magicAll = false, runEveryHours = 3 }) {
  const perCam = magicAll ? 2 : 1; // --magic-all reads the 3-byte signature with a second request
  const out = {}, live = [];
  for (const s of sources) {
    const capacity = s.delayMs > 0 ? Math.floor((budgetMs * retrySlack) / s.delayMs / perCam) : Infinity;
    const need = s.skip ? 0 : Math.min(s.total, capacity);
    out[s.id] = { quota: 0, total: s.total, capacity: Number.isFinite(capacity) ? capacity : null, runs: null, hours: null };
    if (need > 0) live.push({ id: s.id, need });
  }
  let left = Math.floor((maxRequests * retrySlack) / perCam);
  live.sort((a, b) => a.need - b.need || a.id.localeCompare(b.id));
  live.forEach((s, i) => { const q = Math.min(s.need, Math.floor(left / (live.length - i))); out[s.id].quota = q; left -= q; });
  for (const o of Object.values(out)) if (o.quota > 0) { o.runs = Math.ceil(o.total / o.quota); o.hours = o.runs * runEveryHours; }
  return out;
}

// Cameras never checked first, then the one checked longest ago; ties keep registry order. Does not change its input.
export function oldestFirst(cams, prev) {
  const t = (c) => { const v = Date.parse((prev[c.id] && prev[c.id].lastChecked) || ''); return Number.isFinite(v) ? v : -Infinity; };
  return cams.map((c, i) => ({ c, i, t: t(c) })).sort((a, b) => (a.t === b.t ? a.i - b.i : a.t < b.t ? -1 : 1)).map((x) => x.c);
}

// "Finland: whole set every 2 runs = 6 h"; label is the source id unless the caller names it.
export function cycleText(id, p, maxAgeH) {
  if (!p || p.quota === 0) return `${id}: never probed by us`;
  const s = `${id}: whole set every ${p.runs === 1 ? 'run' : p.runs + ' runs'} = ${p.hours} h`;
  return p.hours > maxAgeH ? `${s} (longer than the ${maxAgeH} h limit: part of it shows unknown)` : s;
}
