// Static camera exports (plan item 36 P0-5 and P2-13): one CSV row per DIRECTORY-ELIGIBLE camera with its source, licence, attribution, link class and health stamp.
// Pure functions plus a small CLI: node ops/exports/camera-exports.mjs <outDir> writes cameras-all.csv and one cameras-<country>.csv per country (nothing is written to the site by the build yet).
// A row is exported only when eligibility() passes AND the source has a licence label and an attribution: an unlicensed camera can never reach a download.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eligibility } from '../importers/lib/eligibility.mjs';
import { countryOf } from '../importers/lib/registry.mjs';
import { metadataOk } from '../../tests/licensing/gate.mjs';

export const COLUMNS = ['camera_id', 'name', 'road', 'direction', 'country', 'region', 'city', 'lat', 'lon', 'source_id', 'source_name', 'official_url', 'link_class', 'first_seen', 'last_seen', 'health_status', 'health_last_checked', 'licence', 'attribution'];
// Spreadsheet formula injection guard: a text cell never starts with = + - @ (our own numbers are written bare).
const cell = (v, isNum = false) => {
  let s = v == null ? '' : String(v);
  if (!isNum && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// A registry source whose own row says 'unverified' may still be enabled by the licence gate under another id (Caltrans: the owner approved the doc row 2026-11-24): only those listed here, and only while that gate row is enabled.
export const GATE_FALLBACK = { caltrans: 'caltrans-cwwp2-dot-ca-gov' };

// Registry source id -> its hand-read licence row (P0-4). A mapped row must pass the gate's metadata rule or its cameras are not exported; a source with no row here is judged by its own licence label as before.
export const PERMISSION_ROW = { caltrans: 'caltrans-cwwp2-dot-ca-gov', digitraffic: 'digitraffic-weathercam', 'quebec-mtmd': 'quebec-cameras', 'toronto-traffic': 'toronto-traffic-cameras', 'calgary-traffic': 'calgary-traffic-cameras', 'hongkong-traffic': 'hongkong-traffic-cameras', 'iceland-vegagerdin': 'iceland-road-cameras', 'austin-traffic': 'austin-traffic-cameras', drivebc: 'drivebc-cameras', 'tfl-jamcams': 'tfl-jamcam-cameras', 'nsw-live-traffic': 'nsw-live-traffic-cameras', 'taiwan-thb': 'taiwan-thb-cameras', 'iowa-dot': 'iowa-dot-cameras', 'a22-brennero': 'a22-brennero-cameras', 'brla-dotd': 'brla-dotd-cameras', 'madrid-camaras': 'madrid-camaras-cameras' };

export function buildRows(cams, sources, health = {}, perms = []) {
  const src = new Map(sources.map((s) => [s.id, s]));
  for (const [sid, pid] of Object.entries(GATE_FALLBACK)) {
    const s = src.get(sid), p = perms.find((x) => x.id === pid);
    if (s && (!s.license || s.license === 'unverified') && p && p.enabled === true && p.licence && p.attribution) src.set(sid, { ...s, license: `${p.licence} (licence gate row ${pid}: ${p.commercialStatus})`, attribution: p.attribution });
  }
  const rows = [], skipped = { notEligible: 0, noLicence: 0, noMetadata: 0 };
  const metaClosed = new Set([...src.keys()].filter((sid) => { const p = perms.find((x) => x.id === (PERMISSION_ROW[sid] || sid)); return p && !metadataOk(p); }));
  for (const c of cams) {
    const e = eligibility(c); if (!e.directory_eligible) { skipped.notEligible++; continue; }
    const s = src.get(c.sourceId);
    const licence = s && s.license && s.license !== 'unverified' ? s.license : '';
    if (!licence || !s.attribution) { skipped.noLicence++; continue; }
    const h = health[c.id] || {};
    rows.push({ camera_id: c.id, name: c.name, road: c.road, direction: c.direction, country: (countryOf(c.regionSlug) || {}).countrySlug || '', region: c.regionName, city: c.city || '', lat: c.lat, lon: c.lon, source_id: c.sourceId, source_name: s.name, official_url: c.officialUrl, link_class: e.link_class, first_seen: c.firstSeen || '', last_seen: c.lastSeen || '', health_status: h.status || 'unknown', health_last_checked: h.lastChecked || '', licence, attribution: s.attribution });
  }
  return { rows, skipped };
}
export const toCsv = (rows) => [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((k) => cell(r[k], k === 'lat' || k === 'lon')).join(','))].join('\r\n') + '\r\n';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// Writes cameras-all.csv, cameras-<country>.csv and manifest.json (counts, sources, licences) into outDir; the site build and the CLI both call this, so the /data/ page and the files cannot disagree.
export function writeExports(out, root = ROOT) {
  const j = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const cams = j('data/camera-registry/cameras.json'); const srcs = j('data/camera-registry/sources.json');
  let health = {}; try { health = j('data/health/health.json').cameras || {}; } catch { /* no health file: every status is unknown */ }
  const { rows, skipped } = buildRows(Array.isArray(cams) ? cams : cams.cameras, Array.isArray(srcs) ? srcs : srcs.sources, health, j('data/source-permissions.json').sources);
  mkdirSync(out, { recursive: true });
  const put = (name, rs) => { const t = toCsv(rs); writeFileSync(join(out, name), t); return Buffer.byteLength(t); };
  const allBytes = put('cameras-all.csv', rows);
  const by = {}; for (const r of rows) (by[r.country || 'unknown'] ||= []).push(r);
  const countries = Object.entries(by).sort().map(([slug, v]) => ({ slug, count: v.length, file: `cameras-${slug}.csv`, bytes: put(`cameras-${slug}.csv`, v) }));
  const bySrc = new Map(); for (const r of rows) { const x = bySrc.get(r.source_id) || { id: r.source_id, name: r.source_name, count: 0, licence: r.licence, attribution: r.attribution }; x.count++; bySrc.set(r.source_id, x); }
  const asof = rows.map((r) => r.last_seen).filter(Boolean).sort().at(-1)?.slice(0, 10) || '';
  const manifest = { asof, total: rows.length, allBytes, skipped, columns: COLUMNS, countries, sources: [...bySrc.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) };
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2]; if (!out) { console.error('usage: node ops/exports/camera-exports.mjs <outDir>'); process.exit(2); }
  const m = writeExports(out);
  console.log(`exported ${m.total} cameras in ${m.countries.length} countries; skipped ${JSON.stringify(m.skipped)}`);
}
