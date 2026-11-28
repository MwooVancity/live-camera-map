// Loads the registry (build runs from site/). Every number on every page comes from countsBy.
// The registry holds every source (cameras.json), so a page about one region filters by regionSlug first.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { countsBy } from '../../../ops/importers/lib/registry.mjs';
import { enrich } from './places-assign.mjs';

export { countsBy };

const dir = process.env.REGISTRY_DIR || resolve(process.cwd(), '../data/camera-registry');
const read = (f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
const readOpt = (f) => (existsSync(resolve(dir, f)) ? read(f) : null);

// cities and WA/OR roads filled from the gazetteer for lists with no city field (lib/places-assign.mjs)
export const cameras = enrich(read('cameras.json'), JSON.parse(readFileSync(resolve(process.cwd(), '../data/places.json'), 'utf8')).places);
export const sources = read('sources.json');
export const report = read('import-report.json'); // Caltrans (districts)
export const bcReport = readOpt('import-report-drivebc.json'); // DriveBC (null until the BC importer has run)

// One date per region: a region's pages say when THAT region's list was imported, never another region's newer date.
export const registryDateOf = (region) => cameras.filter((c) => c.regionSlug === region).map((c) => c.lastSeen).filter(Boolean).sort().at(-1)?.slice(0, 10) ?? null;
export const regionDates = Object.fromEntries([...new Set(cameras.map((c) => c.regionSlug))].map((r) => [r, registryDateOf(r)]));
export const registryDate = cameras.map((c) => c.lastSeen).filter(Boolean).sort().at(-1)?.slice(0, 10) ?? null; // newest of all (hubs, sitemap)
export const sourceOf = (id) => sources.find((s) => s.id === id);
export const loadedDistricts = Object.entries(report.perDistrict).filter(([, v]) => v.ok).map(([d]) => d);
export const failedDistricts = Object.entries(report.perDistrict).filter(([, v]) => !v.ok).map(([d]) => d);

// River cameras (sources.json names them "river cameras": MLIT Japan, Taiwan WRA) watch rivers, not roads, so every headline counts them apart.
const RIVER = new Set(sources.filter((s) => /river cameras/i.test(s.name)).map((s) => s.id));
export const isRiver = (c) => RIVER.has(c.sourceId);
export const splitCount = (list) => { const river = list.filter(isRiver).length; return { traffic: list.length - river, river }; };
// " and 1054 river cameras" or '': the one tail every headline appends after its traffic count.
export const riverTail = (list) => { const r = splitCount(list).river; return r ? ` and ${r} river camera${r === 1 ? '' : 's'}` : ''; };
