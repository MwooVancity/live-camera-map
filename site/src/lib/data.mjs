// Loads the registry (build runs from site/). Every number on every page comes from countsBy.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { countsBy } from '../../../ops/importers/lib/registry.mjs';

export { countsBy };

const dir = process.env.REGISTRY_DIR || resolve(process.cwd(), '../data/camera-registry');
const read = (f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8'));

export const cameras = read('cameras.json');
export const sources = read('sources.json');
export const report = read('import-report.json');

export const registryDate = cameras.map((c) => c.lastSeen).filter(Boolean).sort().at(-1)?.slice(0, 10) ?? null;
export const loadedDistricts = Object.entries(report.perDistrict).filter(([, v]) => v.ok).map(([d]) => d);
export const failedDistricts = Object.entries(report.perDistrict).filter(([, v]) => !v.ok).map(([d]) => d);
