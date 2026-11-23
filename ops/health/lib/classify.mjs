// Pure rules: an observation of a camera link -> status, feed kind, fingerprint. No network, no clock except `now`.
// Statuses: reachable | stale | unavailable | unknown.
//  - A 200 is not enough: a still must answer image/* (HTML or JSON error bodies are unavailable), be at least
//    minBytes when the size is known, and carry the right file signature when we read one.
//  - stale = reachable, but the server's own Last-Modified is older than the per-source stale limit (default 6 h).
//    No Last-Modified = we cannot tell = reachable. An unchanged picture alone is never "dead" (lastChanged is separate).
//  - 429 that survived the backoff = unknown (we were throttled; that says nothing about the camera).
export const DEFAULTS = { staleHours: 6, minBytes: 1000 };

export function feedKindOf(url, contentType) {
  let p;
  try { p = new URL(url).pathname.toLowerCase(); } catch { return 'unknown'; }
  if (/\.(jpe?g|png)$/.test(p)) return 'still';
  if (/\.m3u8$/.test(p)) return 'video';
  const ct = String(contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return 'still';
  if (/mpegurl/.test(ct)) return 'video';
  return ct ? 'operator-page' : 'unknown';
}

const SIG = { jpeg: 'ffd8ff', png: '89504e', m3u8: '234558' }; // "#EX" = 23 45 58
const sigOk = (kind, ct, sig) => {
  if (sig === null || sig === undefined) return true; // not read: nothing to contradict
  if (sig === '') return false; // read and empty body
  if (kind === 'video') return sig === SIG.m3u8;
  if (/jpe?g/.test(ct)) return sig === SIG.jpeg;
  if (/png/.test(ct)) return sig === SIG.png;
  return true;
};

export const fingerprintOf = (o) => o.etag || o.lastModified || (o.contentLength !== null && o.contentLength !== undefined ? `len:${o.contentLength}` : null);

// Returns { status, feedKind, fingerprint, transient, reason }. transient = a transport-level failure (feeds the circuit breaker).
export function classify(url, o, cfg = {}, now = new Date()) {
  const { staleHours, minBytes } = { ...DEFAULTS, ...cfg };
  const feedKind = feedKindOf(url, o.contentType);
  const out = (status, reason, transient = false) => ({ status, feedKind, fingerprint: status === 'reachable' || status === 'stale' ? fingerprintOf(o) : null, transient, reason });
  if (o.error) return out('unavailable', o.error, true);
  if (o.httpStatus === 429) return out('unknown', 'throttled-429', true);
  if (o.httpStatus >= 500) return out('unavailable', `http-${o.httpStatus}`, true);
  if (!(o.httpStatus >= 200 && o.httpStatus < 300)) return out('unavailable', `http-${o.httpStatus}`);
  const ct = String(o.contentType || '').toLowerCase();
  if (feedKind === 'still') {
    if (!ct.startsWith('image/')) return out('unavailable', 'not-an-image');
    if (o.contentLength !== null && o.contentLength < minBytes) return out('unavailable', 'too-small');
    if (!sigOk(feedKind, ct, o.signature)) return out('unavailable', 'bad-signature');
    // A source that always dates a real picture (Last-Modified or ETag) and sends neither for its "Image not available" placeholder (Digitraffic).
    if (cfg.needValidators && !o.lastModified && !o.etag) return out('unavailable', 'placeholder-no-validators');
  } else if (feedKind === 'video') {
    if (!/mpegurl/.test(ct)) return out('unavailable', 'not-a-playlist');
    if (!sigOk(feedKind, ct, o.signature)) return out('unavailable', 'bad-signature');
  }
  else return out('unknown', 'unverifiable-kind'); // an operator page or unknown type is not a picture: never counted reachable
  const lm = Date.parse(o.lastModified || '');
  if (feedKind === 'still' && Number.isFinite(lm) && new Date(now).getTime() - lm > staleHours * 3600000) return out('stale', 'last-modified-old');
  return out('reachable', 'ok');
}
