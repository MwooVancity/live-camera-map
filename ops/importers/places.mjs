// Copies the Natural Earth populated places list (public domain, row natural-earth-populated-places-7-342-points-name-position-rank
// in data/source-permissions.json) from the pinned upstream checkout into our data folder. Reads the checkout, never writes in it.
// Each place also gets its admin-1 name and ISO country code (adm1name, iso_a2) from the same pinned Natural Earth file the checkout
// was built from (meta.url), so a camera is only filed under a place in its own state or province (site/src/lib/places-assign.mjs).
// Usage: node ops/importers/places.mjs [local copy of the pinned geojson, else it is downloaded from meta.url]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = JSON.parse(readFileSync(join(ROOT, 'gev', 'src', 'data', 'local_data', 'natural_earth', 'populated_places.json'), 'utf8'));
const ne = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : await (await fetch(src.meta.url)).json();

// join by name and nearest position (the checkout rounds coordinates, so an exact match misses about 5%)
export function joinAdm1(places, features) {
  const byName = new Map();
  for (const f of features) { const p = f.properties; (byName.get(p.name) || byName.set(p.name, []).get(p.name)).push(p); }
  return places.map(([name, lat, lon]) => {
    let best = null, bd = 0.1;
    for (const p of byName.get(name) || []) { const d = Math.hypot(p.latitude - lat, p.longitude - lon); if (d <= bd) { bd = d; best = p; } }
    return [name, lat, lon, best?.adm1name || '', best?.iso_a2 || ''];
  });
}

const places = joinAdm1(src.places, ne.features);
if (places.length < 7000) throw new Error(`only ${places.length} places: refusing to replace the list`);
const noAdm1 = places.filter((p) => !p[3]).length;
if (noAdm1 > 200) throw new Error(`${noAdm1} places have no admin-1 match: refusing to replace the list`);
writeFileSync(join(ROOT, 'data', 'places.json'), JSON.stringify({ source: 'Made with Natural Earth (public domain)', url: src.meta.url, fields: ['name', 'lat', 'lon', 'adm1name', 'iso_a2'], places }) + '\n');
console.log(places.length, 'places,', noAdm1, 'without admin-1');
