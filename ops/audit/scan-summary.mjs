// Markdown summary of scan JSON outputs. Usage: node ops/audit/scan-summary.mjs [dir=scan-out]
// Never fails on vulnerability counts (recon spike). Exit 1 only if a SECRET is found.
// Secret values are never printed: rule, file and line only.
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || 'scan-out';
const load = (n) => {
  const p = join(dir, n);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
};
const SEV = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
const out = [];

const image = load('trivy-image.json');
out.push('## Trivy image vulnerabilities (HIGH,CRITICAL, unfixed included)');
if (!image) out.push('_missing or unreadable: trivy-image.json_');
else {
  const counts = {}, fixable = {}, pkgs = {};
  for (const r of image.Results || []) for (const v of r.Vulnerabilities || []) {
    counts[v.Severity] = (counts[v.Severity] || 0) + 1;
    if (v.FixedVersion) fixable[v.Severity] = (fixable[v.Severity] || 0) + 1;
    const k = `${v.PkgName}@${v.InstalledVersion}`;
    pkgs[k] = (pkgs[k] || 0) + 1;
  }
  out.push('| Severity | Count | With a fix |', '|---|---|---|');
  for (const s of SEV) if (counts[s]) out.push(`| ${s} | ${counts[s]} | ${fixable[s] || 0} |`);
  if (!Object.keys(counts).length) out.push('| none | 0 | 0 |');
  out.push('', 'Top 10 packages:');
  const top = Object.entries(pkgs).sort((a, b) => b[1] - a[1]).slice(0, 10);
  out.push(...(top.length ? top.map(([k, n]) => `- ${k}: ${n}`) : ['- none']));
}

const npm = load('npm-audit.json');
out.push('', '## npm audit (production deps, from lockfile)');
if (!npm) out.push('_missing or unreadable: npm-audit.json_');
else if (npm.error) out.push(`_npm audit error: ${npm.error.summary || npm.error.code || 'unknown'}_`);
else {
  const c = npm.metadata?.vulnerabilities || {};
  out.push('| Severity | Count |', '|---|---|');
  for (const s of ['critical', 'high', 'moderate', 'low', 'info']) out.push(`| ${s} | ${c[s] || 0} |`);
  const rank = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };
  const top = Object.values(npm.vulnerabilities || {})
    .sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0))
    .slice(0, 10);
  out.push('', 'Top 10 packages:');
  out.push(...(top.length ? top.map((v) => `- ${v.name} (${v.severity}, ${v.isDirect ? 'direct' : 'transitive'}, fix: ${v.fixAvailable ? 'yes' : 'no'})`) : ['- none']));
}

const sec = load('trivy-secrets.json');
out.push('', '## Secret scan (gev tree)');
let secrets = 0;
if (!sec) {
  out.push('_missing or unreadable: trivy-secrets.json (treated as NOT scanned: failing)_');
  secrets = 1;
} else {
  const hits = [];
  for (const r of sec.Results || []) for (const s of r.Secrets || [])
    hits.push(`- ${s.RuleID || s.Category} in ${r.Target}:${s.StartLine ?? '?'}`);
  secrets = hits.length;
  out.push(secrets ? `**SECRET FOUND: ${secrets}**` : 'No secrets found.', ...hits.slice(0, 20));
}

const sbom = load('sbom.cdx.json');
out.push('', '## SBOM');
out.push(sbom ? `CycloneDX components: ${(sbom.components || []).length}` : '_missing or unreadable: sbom.cdx.json_');

const md = out.join('\n') + '\n';
process.stdout.write(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
process.exit(secrets ? 1 : 0) // missing secret report also fails: no silent pass;
