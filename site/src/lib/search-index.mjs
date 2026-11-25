// Search entries from the registry. Pure (no fs, no network). Every URL is built by the same functions the pages use (pages.mjs), and an entry
// links to a page only if pageList says that page exists. Never a per-camera page (plan.md section 8).
// Beats Argos by: the index is made from the same registry and page list as the pages, so a result can never point at a page that is not built
// and a town with no page still gets a result (its map position) instead of nothing.
import { roadSlug, countryOf } from '../../../ops/importers/lib/registry.mjs';
import { pageList, curatedPlaces, curatedRoads, countryRoute, regionRoute, cityRoute, countryName, slugify } from './pages.mjs';
import { normalize, roadNorm } from './search-core.mjs';

export const MAP_ZOOM = 11;
// Regions whose camera NAMES are left out of the search index (their region page, roads and places stay searchable): Georgia's 3,829 cameras put the United States shard at 379 KB gzip, over the 300 KB first-search budget (2026-11-25).
// Remove an entry when the region shards exist (plan.md item 3: fix = region shards past 300 KB). The budget itself is never raised to fit.
export const SEARCH_SKIP_CAMERAS = new Set(['georgia']);
export const mapUrl = (lat, lon, z = MAP_ZOOM) => `/map/?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&z=${z}`;
const r5 = (x) => Math.round(x * 1e5) / 1e5;
const centre = (list) => ({ lat: r5(list.reduce((s, c) => s + c.lat, 0) / list.length), lon: r5(list.reduce((s, c) => s + c.lon, 0) / list.length) });

// Which routes exist: the same list the sitemap and the pages are built from.
export function pageRoutes(cams) {
  const ca = cams.filter((c) => c.regionSlug === 'california'); // road pages are California-only
  return new Set(pageList(cams, curatedPlaces(cams), null, curatedRoads(ca)).map((p) => p.route));
}

// Returns entries { id, kind, name, norm, countrySlug, country, region, road, lat, lon, url }. Cameras with no country row (region not in REGION_COUNTRY) are skipped: no page, no address.
export function buildEntries(cams) {
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
  // roads with a page (California)
  const ca = usable.filter((c) => c.regionSlug === 'california');
  for (const road of curatedRoads(ca)) {
    const slug = roadSlug(road), url = `/roads/${slug}/`;
    if (!routes.has(url)) continue;
    add({ id: `road:${slug}`, kind: 'road', name: road, norm: roadNorm(road), ...where('california'), region: ca[0].regionName, road, ...centre(ca.filter((c) => roadSlug(c.road) === slug)), url });
  }
  // camera names: the link goes to the camera's city page, else its road page, else the official source. Neither city nor road pages have per-camera anchors, so no anchor is added.
  for (const c of usable) {
    if (SEARCH_SKIP_CAMERAS.has(c.regionSlug)) continue;
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
