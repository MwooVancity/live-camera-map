// Fail-closed licensing gate. A source is enabled only if EVERY condition holds.
export const MAX_REVIEW_AGE_DAYS = 180;

export function isEnabled(s, today = new Date()) {
  if (!s || s.mustNotShip) return false;
  if (s.commercialStatus !== 'allowed_per_doc') return false; // unknown, restricted, anything else: closed
  if (!s.attribution || !String(s.attribution).trim()) return false;
  if (!s.provenance || !String(s.provenance).trim()) return false;
  if (!s.licence || !String(s.licence).trim()) return false;
  const t = Date.parse(s.reviewedAt);
  if (Number.isNaN(t)) return false;
  const ageDays = (today.getTime() - t) / 86400000;
  if (ageDays > MAX_REVIEW_AGE_DAYS || ageDays < -1) return false; // expired or future-dated review
  return true;
}
