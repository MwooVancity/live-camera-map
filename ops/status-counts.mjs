// Prints the numbers for plan.md section 2 from the registry, so the status table is refreshed from data, not by hand.
// Usage: node ops/status-counts.mjs   (prints the "Cameras (date)" line and the counts the table rows quote)
import { readFileSync } from 'node:fs';
import { countryOf } from './importers/lib/registry.mjs';

const dir = new URL('../data/camera-registry/', import.meta.url);
const cams = JSON.parse(readFileSync(new URL('cameras.json', dir), 'utf8'));
const sources = JSON.parse(readFileSync(new URL('sources.json', dir), 'utf8'));
const name = new Map(sources.map((s) => [s.id, s.name]));
const by = (key) => cams.reduce((m, c) => m.set(c[key], (m.get(c[key]) || 0) + 1), new Map());
const perSource = [...by('sourceId')].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
const n = (x) => x.toLocaleString('en-US');
const asof = cams.map((c) => c.lastSeen).filter(Boolean).sort().at(-1)?.slice(0, 10);
export const counts = { total: cams.length, sources: perSource.length, countries: new Set(cams.map((c) => countryOf(c.regionSlug)?.countrySlug ?? 'unmapped:' + c.regionSlug)).size, perSource, asof };
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').slice(-2).join('/'))) {
  console.log(`Cameras (${asof}): ${n(cams.length)} from ${perSource.length} sources in ${counts.countries} countries: ${perSource.map(([id, k]) => `${name.get(id) || id} ${n(k)}`).join('; ')}.`);
  for (const [id, k] of perSource) console.log(`  ${id}: ${n(k)}`);
}
