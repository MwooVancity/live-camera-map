// Licence-evidence checklist for ONE source (plan item 40 step 3). It captures and checks evidence; it never makes the decision.
//   node ops/audit/licence-evidence.mjs --init <source-id>   print an empty record (ops/audit/licence-evidence.template.json)
//   node ops/audit/licence-evidence.mjs <record.json>        print the verdict; exit 0 READY, 1 HOLD, 2 REJECT
// READY needs: no conflict, every checked field verified with a quoted sentence, metadata sentence + URL, AND a recorded human decision "approve".
// HOLD: two statements disagree (dataset tag vs legal notice), a field is unverified, the host's bot check blocked us, or the human has not decided.
// REJECT: robots.txt disallows the feed, the metadata is restricted, or the human decided "reject".
// Image rights may stay 'unverified' (the site is link-out only); they are never 'allowed' without a quote.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const VERDICT = { READY: 'READY', HOLD: 'HOLD', REJECT: 'REJECT' };
const PERMISSIONS = ['metadata', 'commercialReuse', 'ads', 'redistribution', 'imageRights'];
const REQUIRED_VERIFIED = ['metadata', 'commercialReuse', 'ads', 'redistribution']; // imageRights may stay unverified (link-out only)
const EFFECTS = ['permits', 'restricts', 'silent'];
const nz = (v) => typeof v === 'string' && v.trim().length > 0;
export const REAL_QUOTE = (q) => nz(q) && q.trim().length >= 12 && !/^(todo|tbd|n\/a|none|unknown|\?+)$/i.test(q.trim());

export function template(sourceId = '') {
  const perm = () => ({ status: 'unverified', quote: '', url: '' });
  return {
    sourceId, dataOwner: { name: '', url: '' }, evidenceDate: '',
    statements: [{ scope: 'metadata', where: 'dataset page', url: '', quote: '', effect: 'permits | restricts | silent' }],
    metadata: perm(), commercialReuse: perm(), ads: perm(), redistribution: perm(), imageRights: perm(),
    attribution: { wording: '', url: '' }, access: { keyOrRegistration: 'unverified', note: '' }, rateLimit: { value: 'unverified', url: '' },
    robots: { result: 'unverified', url: '', checkedAt: '', note: '' }, botCheck: { result: 'unverified', httpStatus: 0, checkedAt: '' },
    stability: { value: 'unverified', note: '' }, humanDecision: { decision: 'pending', by: '', at: '', note: '' },
  };
}

export function validate(r) {
  const reasons = [], conflicts = [];
  if (!r || typeof r !== 'object') return { verdict: VERDICT.HOLD, reasons: ['record is not an object'], conflicts };
  // --- REJECT first
  const reject = [];
  if (r.robots?.result === 'blocked') reject.push(`robots.txt disallows the feed (${r.robots.url || 'no url'})`);
  if (r.metadata?.status === 'restricted') reject.push(`metadata is restricted: "${r.metadata.quote || ''}"`);
  if (r.humanDecision?.decision === 'reject') reject.push(`human decision: reject (${r.humanDecision.by || '?'}, ${r.humanDecision.at || '?'})`);
  // The site carries ads and is a commercial directory: restricted commercial reuse or ads cannot be approved (A4).
  for (const k of ['commercialReuse', 'ads']) if (r[k]?.status === 'restricted') reject.push(`${k} is restricted: "${r[k].quote || ''}"`);
  if (reject.length) return { verdict: VERDICT.REJECT, reasons: reject, conflicts };
  // --- conflicts: the same scope has a statement that permits and one that restricts
  const all = Array.isArray(r.statements) ? r.statements : [];
  for (const s of all) if (!EFFECTS.includes(s && s.effect)) reasons.push(`statement effect "${s && s.effect}" (${s && s.scope}) is not one of permits, restricts, silent`);
  // A permitting statement needs a real quote; a restricting one counts whatever its length (a short "no commercial use" is still a restriction).
  const st = all.filter((s) => s && (s.effect === 'restricts' || REAL_QUOTE(s.quote)));
  for (const scope of new Set(st.map((s) => s.scope))) {
    const ok = st.filter((s) => s.scope === scope && s.effect === 'permits'), no = st.filter((s) => s.scope === scope && s.effect === 'restricts');
    for (const p of ok) for (const q of no) conflicts.push({ scope, permits: { where: p.where, url: p.url, quote: p.quote }, restricts: { where: q.where, url: q.url, quote: q.quote } });
    // a restricting statement against a field marked allowed contradicts the field itself, even with no permitting statement
    if (!ok.length && r[scope]?.status === 'allowed') for (const q of no) conflicts.push({ scope, permits: { where: `the ${scope} field`, url: r[scope].url, quote: r[scope].quote }, restricts: { where: q.where, url: q.url, quote: q.quote } });
  }
  for (const c of conflicts) reasons.push(`CONFLICT on ${c.scope}: ${c.permits.where} (${c.permits.url}) says "${c.permits.quote}" BUT ${c.restricts.where} (${c.restricts.url}) says "${c.restricts.quote}"`);
  // --- unverified fields
  const m = r.metadata;
  if (m?.status !== 'allowed' || !REAL_QUOTE(m?.quote) || !nz(m?.url)) reasons.push('no quoted licence sentence with a URL that allows metadata');
  for (const k of REQUIRED_VERIFIED) { const p = r[k]; if (!p || p.status === 'unverified' || !['allowed', 'restricted'].includes(p.status)) reasons.push(`${k} is unverified`); else if (p.status === 'allowed' && (!REAL_QUOTE(p.quote) || !nz(p.url))) reasons.push(`${k} is "allowed" without a quoted sentence and URL`); }
  if (r.imageRights?.status === 'allowed' && !REAL_QUOTE(r.imageRights.quote)) reasons.push('imageRights "allowed" without a quoted sentence');
  if (!nz(r.dataOwner?.name)) reasons.push('data owner missing');
  if (!nz(r.attribution?.wording)) reasons.push('attribution wording missing');
  if (!nz(r.evidenceDate) || Number.isNaN(Date.parse(r.evidenceDate))) reasons.push('evidence date missing');
  if (!r.access || ![true, false].includes(r.access.keyOrRegistration)) reasons.push('key or registration is unverified');
  if (!nz(r.rateLimit?.value) || /^unverified$/i.test(r.rateLimit.value)) reasons.push('rate limit is unverified');
  if (r.robots?.result !== 'allowed') reasons.push(`robots result is ${r.robots?.result || 'missing'}`);
  if (r.botCheck?.result === 'blocked') reasons.push(`the host blocks automated requests (HTTP ${r.botCheck.httpStatus || '?'}): checks and pictures cannot be automated, stop and ask`);
  else if (r.botCheck?.result !== 'none') reasons.push(`403/bot-check result is ${r.botCheck?.result || 'missing'}`);
  if (!nz(r.stability?.value) || /^unverified$/i.test(r.stability.value)) reasons.push('stability is unverified');
  // --- the human decision
  const h = r.humanDecision;
  if (h?.decision !== 'approve' || !nz(h.by) || !nz(h.at)) reasons.push('no recorded human decision (approve, by, at)');
  return { verdict: reasons.length ? VERDICT.HOLD : VERDICT.READY, reasons, conflicts };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [a, b] = process.argv.slice(2);
  if (a === '--init') { console.log(JSON.stringify(template(b || ''), null, 2)); process.exit(0); }
  if (!a) { console.error('usage: node ops/audit/licence-evidence.mjs <record.json> | --init <source-id>'); process.exit(64); }
  const out = validate(JSON.parse(readFileSync(a, 'utf8')));
  console.log(out.verdict); for (const x of out.reasons) console.log(' - ' + x);
  process.exit(out.verdict === VERDICT.READY ? 0 : out.verdict === VERDICT.HOLD ? 1 : 2);
}
