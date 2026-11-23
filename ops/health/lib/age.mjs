// The ONE place that decides how old a camera's own check may be before it stops counting as current.
// Used by the checker (when it carries an unchecked camera forward) and by the site (at build, when it shows a status), so the
// two can never disagree. No network, no clock of its own: the caller passes "now" in milliseconds.
export const MAX_CHECK_AGE_H = 48;
export const STATUSES = ['reachable', 'stale', 'unavailable', 'unknown'];

// Hours since this camera's own last check; null when it has none. asofMs is the fallback for an old record without lastChecked.
export function checkAgeH(rec, nowMs, asofMs = NaN) {
  const t = Date.parse((rec && rec.lastChecked) || '');
  const base = Number.isFinite(t) ? t : asofMs;
  return Number.isFinite(base) ? (nowMs - base) / 3600000 : null;
}

// The status a page may show as current: the recorded one, or 'unknown' when the camera's own check is too old
// (or missing, for any status except 'unknown'). A status that is not one of the four is 'unknown'.
export function effectiveStatus(rec, nowMs, asofMs = NaN, maxH = MAX_CHECK_AGE_H) {
  const s = rec && rec.status;
  if (!STATUSES.includes(s) || s === 'unknown') return 'unknown';
  const age = checkAgeH(rec, nowMs, asofMs);
  return age === null || age > maxH ? 'unknown' : s;
}

// "last checked 5 h ago" / "last checked 3 days ago" / '' when the camera has never been checked. Whole hours, rounded down.
export function checkedAgoText(rec, nowMs) {
  const t = Date.parse((rec && rec.lastChecked) || '');
  if (!Number.isFinite(t)) return '';
  const h = Math.max(0, Math.floor((nowMs - t) / 3600000));
  if (h < 1) return 'last checked less than 1 h ago';
  if (h < MAX_CHECK_AGE_H) return `last checked ${h} h ago`;
  return `last checked ${Math.floor(h / 24)} days ago`;
}
