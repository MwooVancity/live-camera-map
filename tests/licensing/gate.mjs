// Fail-closed licensing gate. A source is enabled only if EVERY condition holds.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export const MAX_REVIEW_AGE_DAYS = 180;
// Licence wording that restricts commercial use. Shared by ops/audit/build-inventory.mjs (classifier) and the owner-approval check below (B6/B7).
export const RESTRICT_RE = /non-?commercial|cc by-nc|by-nc|personal use|written agreement|needs an agreement|research use only|not licensed|written permission|proprietary|subscription|your own (api )?key|bring your own/i;
const APPROVALS = fileURLToPath(new URL('../../data/owner-approvals.json', import.meta.url));
// Recorded owner approval; null when the file is gone (then every allowed_per_owner row closes).
export const loadApprovals = () => (existsSync(APPROVALS) ? JSON.parse(readFileSync(APPROVALS, 'utf8')) : null);

export function isEnabled(s, today = new Date(), approvals = loadApprovals()) {
  if (!s || s.mustNotShip) return false;
  if (!metadataOk(s)) return false; // P0-4: names, coordinates and links need a quoted permission (rows that carry the field)
  if (s.commercialStatus === 'allowed_per_owner') { // B6: the date must be the recorded approval, and a restricted licence text is out of its scope
    if (!approvals || !s.ownerApprovedAt || s.ownerApprovedAt !== approvals.approvedAt || RESTRICT_RE.test(String(s.licence || ''))) return false;
  }
  else if (s.commercialStatus !== 'allowed_per_doc') return false; // unknown, restricted, anything else: closed
  if (!s.attribution || !String(s.attribution).trim() || /^[-—n/a\s]*$/i.test(String(s.attribution))) return false; // a dash or n/a is no attribution (same rule as build-inventory)
  if (!s.provenance || !String(s.provenance).trim()) return false;
  if (!s.licence || !String(s.licence).trim()) return false;
  const t = Date.parse(s.reviewedAt);
  if (Number.isNaN(t)) return false;
  const ageDays = (today.getTime() - t) / 86400000;
  if (ageDays > MAX_REVIEW_AGE_DAYS || ageDays < -1) return false; // expired or future-dated review
  return true;
}

// ---- Plan item 36 P0-4: structured evidence for publishing metadata and for showing pictures ----
// Only rows that carry metadataPermission are held to it (legacy fixtures without it behave as before).
const nz = (v) => typeof v === 'string' && v.trim().length > 0;
export function metadataOk(s) {
  const m = s && s.metadataPermission;
  if (!m) return true;
  if (m.status === 'allowed') return true;
  // Grandfather: an unverified row stays open only with a written reason; a restricted row never.
  return m.status === 'unverified' && nz(s.metadataGrandfather && s.metadataGrandfather.reason);
}
// Returns a list of defects (empty = fine). imageApprovals = ids listed in data/owner-approvals.json.
export function evidenceProblems(s, imageApprovals = []) {
  const p = [];
  const closed = s.commercialStatus === 'restricted' || s.mustNotShip;
  for (const [key, label] of [['metadataPermission', 'metadata'], ['imagePermission', 'image']]) {
    const f = s[key];
    if (!f) { p.push(key + ' missing'); continue; }
    if (!['allowed', 'unverified', 'restricted'].includes(f.status)) { p.push(key + '.status invalid'); continue; }
    if (f.status === 'allowed') {
      if (!nz(f.quote)) p.push(label + ' allowed without a quote');
      else if (!String(s.licence || '').includes(f.quote)) p.push(label + ' quote is not in the licence text');
      if (!nz(f.url) || !String(s.provenance || '').includes(f.url)) p.push(label + ' url does not appear in provenance');
      if (closed) p.push(label + ' allowed on a restricted or mustNotShip row');
    }
  }
  if (s.imagePermission && s.imagePermission.status === 'allowed' && !imageApprovals.includes(s.id)) p.push('image allowed without an owner approval in data/owner-approvals.json');
  if (typeof s.imageStatus === 'string' && s.imagePermission) {
    const t = (s.imageStatus.match(/^(unverified|allowed|restricted)/i) || [])[1];
    if (!t || t.toLowerCase() !== s.imagePermission.status) p.push('imageStatus text and imagePermission.status disagree');
  }
  if (s.metadataPermission && s.enabled === true && !metadataOk(s)) p.push('enabled row has unverified metadata and no grandfather reason');
  if (s.metadataGrandfather && !nz(s.metadataGrandfather.reason)) p.push('grandfather flag without a reason');
  return p;
}
