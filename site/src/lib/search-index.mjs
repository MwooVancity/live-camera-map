// Search entries from the registry. Pure (no fs, no network). Every URL is built by the same functions the pages use (pages.mjs), and an entry
// links to a page only if pageList says that page exists. Never a per-camera page (plan.md section 8).
// Beats Argos by: the index is made from the same registry and page list as the pages, so a result can never point at a page that is not built
// and a town with no page still gets a result (its map position) instead of nothing.
import { roadSlug, countryOf } from '../../../ops/importers/lib/registry.mjs';
import { pageList, curatedPlaces, curatedRoads, countryRoute, regionRoute, cityRoute, countryName, slugify } from './pages.mjs';
import { normalize, roadNorm } from './search-core.mjs';
import { distKm } from './geo.mjs';

export const MAP_ZOOM = 11;
export const mapUrl = (lat, lon, z = MAP_ZOOM) => `/map/?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&z=${z}`;
const r5 = (x) => Math.round(x * 1e5) / 1e5;
const centre = (list) => ({ lat: r5(list.reduce((s, c) => s + c.lat, 0) / list.length), lon: r5(list.reduce((s, c) => s + c.lon, 0) / list.length) });

// Which routes exist: the same list the sitemap and the pages are built from.
export function pageRoutes(cams) {
  const ca = cams.filter((c) => c.regionSlug === 'california'); // road pages are California-only
  return new Set(pageList(cams, curatedPlaces(cams), null, curatedRoads(ca)).map((p) => p.route));
}

// Returns entries { id, kind, name, norm, countrySlug, country, region, road, lat, lon, url }. Cameras with no country row (region not in REGION_COUNTRY) are skipped: no page, no address.
// Big places the camera lists never name (many agencies give no city field, so "Seattle" found only street names).
// A place is offered only with PLACE_MIN cameras within PLACE_KM, all in ONE country (a border city is skipped rather than mislabelled).
export const PLACE_KM = 25, PLACE_MIN = 5;
export function placeEntries(places, usable, have) {
  const grid = new Map(), cell = (lat, lon) => `${Math.floor(lat)}:${Math.floor(lon)}`;
  for (const c of usable) { const k = cell(c.lat, c.lon); (grid.get(k) || grid.set(k, []).get(k)).push(c); }
  const out = [], ids = new Set();
  for (const [name, lat, lon] of places) {
    const near = [], w = Math.min(10, Math.ceil(PLACE_KM / (111 * Math.max(0.05, Math.cos(lat * Math.PI / 180)))));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -w; dx <= w; dx++) for (const c of grid.get(cell(lat + dy, lon + dx)) || []) {
      const km = distKm(lat, lon, c.lat, c.lon);
      if (km <= PLACE_KM) near.push({ c, km });
    }
    if (near.length < PLACE_MIN || new Set(near.map((n) => countryOf(n.c.regionSlug).countrySlug)).size > 1) continue;
    const c = near.sort((a, b) => a.km - b.km)[0].c, key = `${c.regionSlug}:${slugify(name)}`, id = `place:${key}`;
    if (!slugify(name) || have.has(`city:${key}`) || have.has(`town:${key}`) || ids.has(id)) continue;
    ids.add(id);
    const country = countryOf(c.regionSlug);
    out.push({ id, kind: 'town', name, countrySlug: country.countrySlug, country: country.countryName, region: c.regionName, lat: r5(lat), lon: r5(lon), url: mapUrl(lat, lon) });
  }
  return out;
}

export function buildEntries(cams, gazetteer = []) {
  const routes = pageRoutes(cams);
  const usable = cams.filter((c) => countryOf(c.regionSlug) && Number.isFinite(c.lat) && Number.isFinite(c.lon));
  const out = [];
  const add = (e) => out.push({ road: '', ...e, norm: e.norm ?? normalize(e.name) });
  const where = (regionSlug) => { const c = countryOf(regionSlug); return { countrySlug: c.countrySlug, country: c.countryName }; };
  const regionNameOf = (slug) => usable.find((c) => c.regionSlug === slug).regionName;

  for (const cs of [...new Set(usable.map((c) => countryOf(c.regionSlug).countrySlug))].sort()) {
    const url = countryRoute(cs);
    const of = usable.filter((c) => countryOf(c.regionSlug).countrySlug === cs);
    if (routes.has(url)) add({ id: `country:${cs}`, kind: 'country', name: countryName(cs), countrySlug: cs, country: countryName(cs), region: 'All regions', ...centre(of), url });
  }
  for (const rs of [...new Set(usable.map((c) => c.regionSlug))].sort()) {
    const url = regionRoute(rs);
    if (routes.has(url)) add({ id: `region:${rs}`, kind: 'region', name: regionNameOf(rs), ...where(rs), region: regionNameOf(rs), ...centre(usable.filter((c) => c.regionSlug === rs)), url });
  }
  // cities with a page, and named places (towns) without one: counted per REGION, so one name in two regions stays two entries
  const places = new Map();
  for (const c of usable) if (c.city) { const k = `${c.regionSlug}\n${c.city}`; (places.get(k) || places.set(k, []).get(k)).push(c); }
  for (const [k, list] of [...places].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const [rs, city] = k.split('\n');
    const url = cityRoute(rs, city), at = centre(list);
    const base = { name: city, ...where(rs), region: list[0].regionName, ...at };
    if (url && routes.has(url)) add({ id: `city:${rs}:${slugify(city)}`, kind: 'city', ...base, url });
    else add({ id: `town:${rs}:${slugify(city)}`, kind: 'town', ...base, url: mapUrl(at.lat, at.lon) });
  }
  for (const e of placeEntries(gazetteer, usable, new Set(out.map((x) => x.id)))) add(e);
  // roads with a page (California)
  const ca = usable.filter((c) => c.regionSlug === 'california');
  for (const road of curatedRoads(ca)) {
    const slug = roadSlug(road), url = `/roads/${slug}/`;
    if (!routes.has(url)) continue;
    add({ id: `road:${slug}`, kind: 'road', name: road, norm: roadNorm(road), ...where('california'), region: ca[0].regionName, road, ...centre(ca.filter((c) => roadSlug(c.road) === slug)), url });
  }
  // camera names: the link goes to the camera's city page, else its road page, else the official source. Neither city nor road pages have per-camera anchors, so no anchor is added.
  for (const c of usable) {
    const cityUrl = c.city ? cityRoute(c.regionSlug, c.city) : null;
    const roadUrl = c.regionSlug === 'california' && roadSlug(c.road) ? `/roads/${roadSlug(c.road)}/` : null;
    const url = cityUrl && routes.has(cityUrl) ? cityUrl : roadUrl && routes.has(roadUrl) ? roadUrl : c.officialUrl;
    add({ id: c.id, kind: 'camera', name: c.name, ...where(c.regionSlug), region: c.regionName, road: c.road || '', lat: r5(c.lat), lon: r5(c.lon), url });
  }
  return out;
}

// Build-time validation: the report the design asked for. Returns problems (empty = valid).
export function validateEntries(entries, routes) {
  const p = [], ids = new Set();
  for (const e of entries) {
    if (ids.has(e.id)) p.push(`duplicate id ${e.id}`); ids.add(e.id);
    if (!e.name || !e.norm) p.push(`${e.id}: empty name`);
    if (!e.country || !e.region) p.push(`${e.id}: missing country or region`);
    if (!Number.isFinite(e.lat) || !Number.isFinite(e.lon) || Math.abs(e.lat) > 90 || Math.abs(e.lon) > 180) p.push(`${e.id}: bad coordinates`);
    const internal = e.url.startsWith('/') && !e.url.startsWith('/map/');
    if (internal && !routes.has(e.url)) p.push(`${e.id}: links to ${e.url}, which is not a built page`);
    if (!internal && !e.url.startsWith('/map/') && !/^https?:\/\//.test(e.url)) p.push(`${e.id}: bad url ${e.url}`);
    if (/^\/cameras\/[^/]+\/[^/]+\/[^/]+\/[^/]+\//.test(e.url)) p.push(`${e.id}: links deeper than a city page (per-camera page)`);
  }
  return p;
}
