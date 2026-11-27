// Copies the Natural Earth populated places list (public domain, row natural-earth-populated-places-7-342-points-name-position-rank
// in data/source-permissions.json) from the pinned upstream checkout into our data folder. Reads the checkout, never writes in it.
// Usage: node ops/importers/places.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = JSON.parse(readFileSync(join(ROOT, 'gev', 'src', 'data', 'local_data', 'natural_earth', 'populated_places.json'), 'utf8'));
const places = src.places.map(([name, lat, lon]) => [name, lat, lon]);
if (places.length < 7000) throw new Error(`only ${places.length} places: refusing to replace the list`);
writeFileSync(join(ROOT, 'data', 'places.json'), JSON.stringify({ source: 'Made with Natural Earth (public domain)', url: src.meta.url, places }) + '\n');
console.log(places.length);
