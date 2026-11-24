// Link classes and directory eligibility (plan item 36 P0-1 and P0-2; found with Singapore LTA, whose picture URLs change every update).
// A link is STABLE when the same address keeps naming the same camera; TEMPORARY when the address names one moment (a date or a uuid in the path, a timestamp in the query).
// directory_eligible = stable identity + verified coordinates + a stable official destination. (The licence row is checked separately by tests/licensing/gate.mjs.)
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const DATE_PATH = /\/(19|20)\d{2}\/(0[1-9]|1[0-2])(\/|$)/;                              // /2026/11/ or /2026/11/25/
const STAMP_QUERY = /[?&](t|ts|time|timestamp|_|rand|nocache|v)=\d{8,}/i;                  // ?t=1764050000123
const STAMP_FILE = /(?:^|[\/_-])(19|20)\d{2}[-_]?(0[1-9]|1[0-2])[-_]?([0-2]\d|3[01])[T_-]?\d{4,6}/; // ..._20261125T061530

export function linkClass(url) {
  let u;
  try { u = new URL(url); } catch { return 'invalid'; }
  if (!/^https?:$/.test(u.protocol)) return 'invalid';
  const full = u.pathname + u.search;
  if (UUID.test(u.pathname) || DATE_PATH.test(u.pathname) || STAMP_QUERY.test(u.search) || STAMP_FILE.test(u.pathname)) return 'temporary';
  return 'stable';
}

export function eligibility(c) {
  const reasons = [];
  if (typeof c.id !== 'string' || !c.id.startsWith(`${c.sourceId}-`)) reasons.push('no stable identity');
  if (!Number.isFinite(c.lat) || !Number.isFinite(c.lon) || (c.lat === 0 && c.lon === 0)) reasons.push('coordinates missing or zero');
  const k = linkClass(c.officialUrl);
  if (k !== 'stable') reasons.push(`official link is ${k}`);
  return { directory_eligible: reasons.length === 0, link_class: k, reasons };
}
