// Parses gev/DATA_SOURCES.md (read-only) into:
//   docs/source-audits/source-inventory.csv
//   data/source-permissions.json
// Run: node ops/audit/build-inventory.mjs
// Status values: restricted | allowed_per_doc | unknown. Unknown FAILS CLOSED (enabled=false).
// allowed_per_doc = the upstream doc names a permissive licence; NOT a legal opinion (needsHumanReview stays true).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = 'gev/DATA_SOURCES.md';
const REVIEWED_AT = process.env.REVIEWED_AT || new Date().toISOString().slice(0, 10);

// Sources Mike or DATA_SOURCES.md named as restricted. Forced, whatever the licence text says.
const FORCED_RESTRICTED = [
  [/telegeography/i, 'TeleGeography: non-commercial; must not ship or be reachable', true],
  [/opensky/i, 'OpenSky: non-commercial; needs written agreement; ads count as commercial', false],
  [/fl511|florida 511/i, 'FL511: personal use only', false],
  [/nyc dot|nycdot|nyc traffic/i, 'NYC DOT: needs agreement', false],
  [/transtar/i, 'Houston TranStar: no licence', false],
  [/ghostmaps|s2 ghost/i, 'S2 GhostMaps: non-commercial', false],
  [/google news/i, 'Google News RSS: personal use', false],
  [/inaturalist/i, 'iNaturalist: non-commercial by default', false],
];

const RESTRICT_RE = /non-?commercial|cc by-nc|\bby-nc\b|personal use|written agreement|needs an agreement|research use only|not licensed/i;
const PERMISSIVE_RE = /public domain|\bcc0\b|cc by 4\.0|cc by-sa|\bodbl\b|\bmit\b|apache|open government licen|\bogl\b|u\.s\. government|nasa|noaa|usgs|natural earth/i;

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}
const strip = (s) => s.replace(/\*\*/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/`/g, '').trim();

function classify(name, licence, commercialCol) {
  for (const [re, why, mustNotShip] of FORCED_RESTRICTED) {
    if (re.test(name)) return { status: 'restricted', why, mustNotShip };
  }
  if (commercialCol) {
    if (/^no\b/i.test(commercialCol)) return { status: 'restricted', why: `doc says commercial use: ${commercialCol.slice(0, 80)}`, mustNotShip: false };
  }
  if (RESTRICT_RE.test(licence)) return { status: 'restricted', why: 'licence text restricts commercial use', mustNotShip: false };
  if (commercialCol && /^yes\b/i.test(commercialCol)) return { status: 'allowed_per_doc', why: `doc says commercial use: ${commercialCol.slice(0, 80)}`, mustNotShip: false };
  if (PERMISSIVE_RE.test(licence)) return { status: 'allowed_per_doc', why: 'doc names a permissive licence', mustNotShip: false };
  return { status: 'unknown', why: 'licence unclear in doc; fails closed', mustNotShip: false };
}

const lines = readFileSync(resolve(root, SRC), 'utf8').split(/\r?\n/);
let section = '';
let header = null;
const rows = [];
lines.forEach((line, i) => {
  if (/^#{1,4} /.test(line)) {
    section = line.replace(/^#+\s*/, '').trim();
    header = null;
    return;
  }
  if (!line.startsWith('|')) {
    header = null;
    return;
  }
  const c = cells(line);
  if (c.every((x) => /^:?-{3,}:?$/.test(x))) return;
  if (!header) {
    header = c.map((x) => x.toLowerCase());
    return;
  }
  const find = (re) => header.findIndex((h) => re.test(h));
  const li = find(/licen[cs]e|terms/);
  const ai = find(/attribution|credit/);
  const ci = find(/commercial/);
  const fi = find(/folder/);
  if (li < 0) return; // table without a licence column: not a source table
  const name = strip(c[0]);
  rows.push({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80),
    name,
    section,
    folder: fi >= 0 ? strip(c[fi] || '') : '',
    licence: strip(c[li] || ''),
    commercialCol: ci >= 0 ? strip(c[ci] || '') : '',
    attribution: ai >= 0 ? strip(c[ai] || '') : '',
    provenance: `${SRC}:${i + 1}`,
  });
});

// Bundled items DATA_SOURCES.md describes only in prose, found by walking gev/ (read-only).
rows.push(
  { id: '', name: 'Bhote Koshi event pack (Vantor imagery crops, GeoPera river centerline)', section: 'Bundled snapshots (prose)', folder: 'public/events/bhote-koshi-2026', licence: 'CC BY-NC 4.0 (public/events/bhote-koshi-2026/README.md); same for src/data/bhoteKoshiFloodPath.js', commercialCol: '', attribution: 'Vantor; GeoPera (see event pack README)', provenance: `${SRC}:413 + public/events/bhote-koshi-2026/README.md`, forceNoShip: true },
  { id: '', name: 'Owner flags sheet (flag-icons 7.5.0)', section: 'Bundled snapshots (prose)', folder: 'src/data/local_data/owner_flags', licence: 'MIT (flag-icons), per src/data/local_data/owner_flags/README.md', commercialCol: '', attribution: 'flag-icons contributors', provenance: 'gev/src/data/local_data/owner_flags/README.md' },
  { id: '', name: 'Shinjuku CCTV source pack', section: 'Local CCTV source packs (prose)', folder: 'config/cctv_sources.shinjuku.json', licence: '', commercialCol: '', attribution: '', provenance: 'gev/config/cctv_sources.shinjuku.json (no licence row in DATA_SOURCES.md)' },
);

const seen = new Map();
const out = rows.map((r) => {
  const base = r.id || r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const k = seen.get(base) || 0;
  seen.set(base, k + 1);
  const id = k ? `${base}-${k + 1}` : base;
  const cls = classify(r.name, r.licence, r.commercialCol);
  if (r.forceNoShip) {
    cls.status = 'restricted';
    cls.why = 'non-commercial licence on a file that ships in public/';
    cls.mustNotShip = true;
  }
  const attributionOk = r.attribution.length > 0 && !/^[-—n/a]*$/i.test(r.attribution);
  // Fail closed: enabled only when permissive per doc AND attribution AND provenance AND review date are all present.
  const enabled = cls.status === 'allowed_per_doc' && attributionOk && Boolean(REVIEWED_AT);
  return {
    id,
    name: r.name,
    section: r.section,
    folder: r.folder,
    licence: r.licence,
    commercialStatus: cls.status,
    statusReason: cls.why,
    attribution: r.attribution,
    provenance: r.provenance,
    reviewedAt: REVIEWED_AT,
    reviewedBy: 'claude-doc-parse',
    needsHumanReview: true,
    mustNotShip: cls.mustNotShip,
    enabled: cls.mustNotShip ? false : enabled,
  };
});

// Hand-read rows (sources not in gev/DATA_SOURCES.md). Appended so regenerating never drops them; `enabled` comes from the gate.
for (const m of JSON.parse(readFileSync(resolve(root, 'data/source-permissions.manual.json'), 'utf8')).sources) {
  if (out.some((o) => o.id === m.id)) throw new Error(`manual row ${m.id} duplicates a generated id`);
  out.push({ ...m, enabled: isEnabled(m, new Date(m.reviewedAt)) });
}

mkdirSync(resolve(root, 'docs/source-audits'), { recursive: true });
mkdirSync(resolve(root, 'data'), { recursive: true });
writeFileSync(resolve(root, 'data/source-permissions.json'), JSON.stringify({ generatedFrom: SRC, reviewedAt: REVIEWED_AT, sources: out }, null, 2) + '\n');

const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
const cols = ['id', 'name', 'section', 'commercialStatus', 'enabled', 'mustNotShip', 'licence', 'attribution', 'provenance', 'reviewedAt', 'needsHumanReview', 'statusReason'];
writeFileSync(
  resolve(root, 'docs/source-audits/source-inventory.csv'),
  [cols.join(','), ...out.map((o) => cols.map((c) => q(o[c])).join(','))].join('\n') + '\n',
);

const n = (f) => out.filter(f).length;
console.log(`rows=${out.length} allowed_per_doc=${n((o) => o.commercialStatus === 'allowed_per_doc')} restricted=${n((o) => o.commercialStatus === 'restricted')} unknown=${n((o) => o.commercialStatus === 'unknown')} enabled=${n((o) => o.enabled)}`);
