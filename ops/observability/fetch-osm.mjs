// One small Overpass query for Iceland's motorway, trunk and primary ways (plan item 36 P2-11).
// Usage: node ops/observability/fetch-osm.mjs   Writes data/observability/iceland/osm-roads.json and osm-meta.json ONLY after the answer passes validateOverpass() and is under the size cap; otherwise the previous good files stay.
import { writeFileSync, renameSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { validateOverpass, sampleNetwork, METHOD } from './observability.mjs';

export const QUERY = '[out:json][timeout:90];\narea["ISO3166-1"="IS"][admin_level=2]->.a;\nway(area.a)["highway"~"^(motorway|trunk|primary)$"];\nout geom;';
export const ENDPOINT = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
export const MAX_BYTES = 2 * 1024 * 1024;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'observability', 'iceland');

const res = await fetch(ENDPOINT, { method: 'POST', body: new URLSearchParams({ data: QUERY }), headers: { 'User-Agent': 'world-traffic-cameras-observability/1.0 (one query per refresh)' }, signal: AbortSignal.timeout(120000) });
if (!res.ok) { console.error(`Overpass answered HTTP ${res.status}; nothing written`); process.exit(1); }
const text = await res.text();
const bytes = Buffer.byteLength(text);
let j; try { j = validateOverpass(text); } catch (e) { console.error(e.message); process.exit(1); }
const net = sampleNetwork(j);
if (!net.chains.length) { console.error('no joined lines after sampling; nothing written'); process.exit(1); }
const rawKept = bytes <= MAX_BYTES; // over the cap: only the sampled points are stored
mkdirSync(OUT, { recursive: true });
const meta = { what: 'OpenStreetMap roads for the Iceland road observability calculation (plan item 36 P2-11): osm-sampled.json holds the joined road lines sampled every 1 km (the raw answer is stored as osm-roads.json only when under 2 MB). Re-run offline with: node ops/observability/run.mjs', endpoint: ENDPOINT, query: QUERY, queriedAt: new Date().toISOString(), osmDataTimestamp: (j.osm3s && j.osm3s.timestamp_osm_base) || '', ways: j.elements.length, bytes, rawStored: rawKept, sampledFile: 'osm-sampled.json', sha256: createHash('sha256').update(text).digest('hex'), licence: METHOD.osmLicence, overpassCopyright: (j.osm3s && j.osm3s.copyright) || '' };
const put = (name, body) => { writeFileSync(join(OUT, name + '.tmp'), body); renameSync(join(OUT, name + '.tmp'), join(OUT, name)); };
if (rawKept) put('osm-roads.json', text);
else rmSync(join(OUT, 'osm-roads.json'), { force: true }); // an older raw answer must not sit beside the new sampled and meta files (meta says rawStored: false)
put('osm-sampled.json', JSON.stringify(net) + String.fromCharCode(10)); put('osm-meta.json', JSON.stringify(meta, null, 1) + '\n');
console.log(`saved ${net.chains.length} joined lines from ${j.elements.length} ways (raw ${bytes} bytes, ${rawKept ? 'stored' : 'not stored, over cap'}), OSM data as of ${meta.osmDataTimestamp}`);
