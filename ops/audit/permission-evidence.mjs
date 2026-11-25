// Plan item 36 P0-4: derive the structured permission evidence for a licence row, and (CLI) migrate the hand-read manual file once.
// metadataPermission = may we publish camera names, coordinates and the official link; imagePermission = may we show, cache or proxy the pictures.
// Never sets an image permission to 'allowed' (CLAUDE.md: only the owner does, through data/owner-approvals.json imageApprovals).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const firstQuote = (t) => ((String(t).match(/"([^"]{15,})"/) || [])[1] || '').trim();
// The place the quote was read: an https URL, else a file reference like gev/DATA_SOURCES.md:72. Never "the first word" (any prose would then pass the includes() check).
const urlOf = (prov) => { const p = String(prov || ''); return (p.match(/https:\/\/[^\s,;)"']+/) || [])[0] || (p.match(/(?:^|[\s(])([\w.-]+(?:\/[\w.-]+)+(?::\d+)?)(?=[\s,;)]|$)/) || [])[1] || ''; };
// A quote that says "no commercial use", "not permitted", "all rights reserved" is a restriction, not a permission (A3).
export const RESTRICTS = /\b(no|non|not|without|never)\b\s+(?:[\w-]+\s+){0,3}(commercial|redistribut|republish|re-?us|reproduc|copy\b|copying)|all rights reserved|prohibit|forbidden|not (?:be )?(?:permitted|allowed)|may not|must not|cannot be used/i;
const restricts = (q) => RESTRICTS.test(String(q).replace(/\b(no|without)\s+(?:known\s+|any\s+)?(restrictions?|limitations?|limits?)\b/gi, ''));

export function derive(r) {
  const url = urlOf(r.provenance);
  const closed = r.commercialStatus === 'restricted' || r.mustNotShip;
  const imgText = typeof r.imageStatus === 'string' ? (r.imageStatus.match(/^(unverified|allowed|restricted)/i) || ['', 'unverified'])[1].toLowerCase() : 'unverified';
  const imagePermission = { status: closed ? 'restricted' : (imgText === 'allowed' ? 'unverified' : imgText), quote: '', url: '' };
  if (closed) return { metadataPermission: { status: 'restricted', quote: '', url }, imagePermission };
  const quote = firstQuote(r.licence) || (r.commercialStatus === 'allowed_per_doc' ? String(r.licence || '').trim().slice(0, 500) : '');
  // allowed only when the status says so (per doc, or the owner approved it with a date), a real https URL is in the provenance, and the quote itself does not restrict
  const statusOk = r.commercialStatus === 'allowed_per_doc' || (r.commercialStatus === 'allowed_per_owner' && Boolean(r.ownerApprovedAt));
  if (quote && url && statusOk && !restricts(quote)) return { metadataPermission: { status: 'allowed', quote, url }, imagePermission };
  const out = { metadataPermission: { status: 'unverified', quote: '', url }, imagePermission };
  if (r.commercialStatus === 'allowed_per_owner' && r.ownerApprovedAt) out.metadataGrandfather = { reason: `owner approval ${r.ownerApprovedAt} (data/owner-approvals.json): the doc licence text is unclear, so no sentence permits publishing names and coordinates` };
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === '--migrate-manual') {
  const f = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/source-permissions.manual.json');
  const d = JSON.parse(readFileSync(f, 'utf8'));
  d.sources = d.sources.map((r) => ({ ...r, ...derive(r) }));
  writeFileSync(f, JSON.stringify(d, null, 2) + '\n');
  console.log(`migrated ${d.sources.length} manual rows`);
}
