// Plan item 36 P0-4: derive the structured permission evidence for a licence row, and (CLI) migrate the hand-read manual file once.
// metadataPermission = may we publish camera names, coordinates and the official link; imagePermission = may we show, cache or proxy the pictures.
// Never sets an image permission to 'allowed' (CLAUDE.md: only the owner does, through data/owner-approvals.json imageApprovals).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const firstQuote = (t) => ((String(t).match(/"([^"]{15,})"/) || [])[1] || '').trim();
const urlOf = (prov) => { const p = String(prov || '').trim(); return (p.match(/https?:\/\/[^\s,;)]+/) || [p.split(/\s+/)[0]])[0] || ''; };

export function derive(r) {
  const url = urlOf(r.provenance);
  const closed = r.commercialStatus === 'restricted' || r.mustNotShip;
  const imgText = typeof r.imageStatus === 'string' ? (r.imageStatus.match(/^(unverified|allowed|restricted)/i) || ['', 'unverified'])[1].toLowerCase() : 'unverified';
  const imagePermission = { status: closed ? 'restricted' : (imgText === 'allowed' ? 'unverified' : imgText), quote: '', url: '' };
  if (closed) return { metadataPermission: { status: 'restricted', quote: '', url }, imagePermission };
  const quote = firstQuote(r.licence) || (r.commercialStatus === 'allowed_per_doc' ? String(r.licence || '').trim().slice(0, 500) : '');
  if (quote && url && String(r.provenance).includes(url)) return { metadataPermission: { status: 'allowed', quote, url }, imagePermission };
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
