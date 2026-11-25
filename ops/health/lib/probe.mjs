// One HTTP observation of one camera link. Headers only; a GET reads at most its first chunk and keeps nothing of it
// but a 3-byte file signature (JPEG FF D8 FF, PNG 89 50 4E, m3u8 "#EX"). No image byte is stored anywhere.
// Generic user agent, no contact detail. Redirects followed by hand, at most 3.
export const UA = 'NearbyCams-build';
export const MAX_REDIRECTS = 3;
// Digitraffic asks API users to identify the application in this header (no personal data); it raises their request limit.
export const EXTRA_HEADERS = { 'weathercam.digitraffic.fi': { 'Digitraffic-User': UA } };
const REDIRECT = new Set([301, 302, 303, 307, 308]);
export const HEAD_REFUSED = new Set([400, 403, 405, 501]); // HEAD not allowed: try one ranged GET instead

export class Limit extends Error { constructor(reason) { super(reason); this.reason = reason; } } // 'cap' | 'time'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ctx.before(url) awaits the per-host delay and throws Limit when the request cap or time budget is spent.
async function once(url, method, ctx) {
  let u = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await ctx.before(u);
    let res;
    try {
      res = await fetch(u, { method, redirect: 'manual', headers: { 'User-Agent': UA, ...(EXTRA_HEADERS[new URL(u).host] || {}), ...(method === 'GET' ? { Range: 'bytes=0-1023' } : {}) }, signal: AbortSignal.timeout(ctx.timeoutMs) });
    } catch (e) { return { error: e && e.name === 'TimeoutError' ? 'timeout' : 'network' }; }
    const loc = res.headers.get('location');
    if (REDIRECT.has(res.status) && loc) {
      await res.body?.cancel().catch(() => {});
      try { u = new URL(loc, u).href; } catch { return { error: 'bad-redirect' }; }
      if (!/^https?:/i.test(u)) return { error: 'bad-redirect' };
      continue;
    }
    const h = (n) => res.headers.get(n);
    const range = /\/(\d+)\s*$/.exec(h('content-range') || '');
    const len = range ? Number(range[1]) : h('content-length') !== null && h('content-length') !== '' ? Number(h('content-length')) : null;
    const o = { httpStatus: res.status, contentType: h('content-type'), contentLength: Number.isFinite(len) ? len : null, etag: h('etag'), lastModified: h('last-modified'), retryAfter: h('retry-after'), cfMitigated: h('cf-mitigated'), method, signature: null };
    if (method === 'GET' && res.status >= 200 && res.status < 300 && res.body) {
      // '' = we read the body and it was empty (never a valid picture); null = could not read (nothing to contradict)
      try { const r = res.body.getReader(); const { value } = await r.read(); await r.cancel(); o.signature = value && value.length ? Buffer.from(value.subarray(0, 3)).toString('hex') : ''; } catch { /* signature stays null */ }
    } else await res.body?.cancel().catch(() => {});
    return o;
  }
  return { error: 'too-many-redirects' };
}

// Retry-After is seconds or an HTTP date; returns milliseconds, or 0 when absent or unreadable.
export function retryAfterMs(v, nowMs = Date.now()) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  if (Number.isFinite(n)) return n > 0 ? n * 1000 : 0;
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.max(0, t - nowMs) : 0;
}

// Retry 429 / 5xx / transport errors with exponential backoff (Retry-After honoured, capped).
async function withBackoff(fn, ctx) {
  let o;
  for (let i = 0; i <= ctx.retries; i++) {
    o = await fn();
    const transient = o.error === 'timeout' || o.error === 'network' || o.httpStatus === 429 || o.httpStatus >= 500;
    if (!transient) return o;
    if (i < ctx.retries) {
      const ra = retryAfterMs(o.retryAfter);
      // never sleep past the run deadline: the next ctx.before() then stops the run on time
      const wait = Math.min(ctx.backoffMaxMs, ra > 0 ? ra : ctx.backoffMs * 2 ** i);
      await sleep(ctx.deadline ? Math.max(0, Math.min(wait, ctx.deadline - Date.now())) : wait);
    }
  }
  return o;
}

// HEAD first. If HEAD is refused, one ranged GET. magicAll = also GET after a good HEAD to check the signature.
export async function observe(url, ctx) {
  let o = await withBackoff(() => once(url, 'HEAD', ctx), ctx);
  const ok = o.httpStatus >= 200 && o.httpStatus < 300;
  if (HEAD_REFUSED.has(o.httpStatus) || (ok && ctx.magicAll)) {
    const g = await withBackoff(() => once(url, 'GET', ctx), ctx);
    o = ok ? { ...o, signature: g.signature ?? null } : g;
  }
  return o;
}
