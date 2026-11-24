// Pure helpers (no Astro): page list, noindex gate, sitemap. Tested with fixtures in tests/gate.test.mjs.
import { countsBy, roadSlug, countryOf, REGION_COUNTRY } from '../../../ops/importers/lib/registry.mjs';
import { MIN_CAMERAS } from '../config.mjs';
import { QC_REGIONS } from '../../../ops/importers/lib/quebec.mjs';
import { TOR_REGION } from '../../../ops/importers/lib/toronto.mjs';
import { CGY_REGION } from '../../../ops/importers/lib/calgary.mjs';

// NFKD splits an accented letter into the letter plus a combining mark; the marks are removed first, otherwise "Hämeenlinna" became "ha-meenlinna".
export const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The ONE place a camera-page address is built: /cameras/<country>/<region>/<city>/. A region with no country row has no address (null).
export const countryRoute = (countrySlug) => `/cameras/${countrySlug}/`;
export const regionRoute = (region) => { const c = countryOf(region); return c ? `/cameras/${c.countrySlug}/${region}/` : null; };
export const cityRoute = (region, city) => { const r = regionRoute(region); return r ? `${r}${slugify(city)}/` : null; };

// The one noindex rule.
export const isIndexable = (count) => count >= MIN_CAMERAS;

export const GUIDES = [
  { slug: 'how-to-read-last-checked-status', title: 'How to read "last checked" status', date: '2026-11-22' },
  { slug: 'what-link-out-only-means', title: 'What "link-out only" means on this site', date: '2026-11-22' },
  { slug: 'how-caltrans-cameras-work', title: 'How Caltrans traffic cameras work', date: '2026-11-22' },
  { slug: 'what-live-road-conditions-mean', title: 'What the live road conditions mean', date: '2026-11-22' },
  { slug: 'how-to-read-a-road-page', title: 'How to read a road page (driving order, nearest cameras)', date: '2026-11-22' },
  { slug: 'how-drivebc-cameras-work', title: 'How British Columbia (DriveBC) traffic cameras work', date: '2026-11-22', region: 'british-columbia' },
  { slug: 'what-caltrans-chain-controls-mean', title: 'What Caltrans chain controls (R-1, R-2, R-3) mean', date: '2026-11-24' },
  { slug: 'camera-link-is-dead', title: 'What to do if a camera link is dead', date: '2026-11-22' },
];

// Per-region facts. cityLimit = how many curated city pages the region gets (by real coverage, each with MIN_CAMERAS or more).
// One entry per source region: the agency named on its pages, its guide (or null), and the region's own wording about where its
// place, direction and links come from. ONE place for that text: region pages, city pages and the footer all read it from here, so a
// page never describes another source's habits. listAll = the region page lists every camera (a region with no city pages).
const sentence = (s) => s.replace(/\s+/g, ' ').trim();
const BC_NOTE = 'gives no city field and no traffic direction';
export const REGIONS = {
  california: { sourceId: 'caltrans', agency: 'Caltrans', cityLimit: 10, guide: 'how-caltrans-cameras-work' },
  'british-columbia': {
    sourceId: 'drivebc', agency: 'DriveBC', cityLimit: 5, guide: 'how-drivebc-cameras-work', list: 'HighwayCams list',
    placeText: (x) => sentence(`DriveBC gives no city field, so only ${x.named} cameras have a named place (${x.places} places, taken from the camera's own name and caption); the other ${x.unnamed} are on the road list only.`),
    cityText: (city) => sentence(`DriveBC ${BC_NOTE}: ${city} is the place named in these cameras' own names and captions, not a municipal boundary, and "facing" is the way the camera looks.`),
    caveats: [],
  },
  finland: {
    sourceId: 'digitraffic', agency: 'Fintraffic', cityLimit: 8, guide: null, credit: true, list: 'weather camera station list',
    placeText: (x) => sentence(`Fintraffic gives no city field, so only ${x.named} cameras have a named place (${x.places} places, the second part of the station's own name, for example Inkoo in kt51_Inkoo); the other ${x.unnamed} are on the road list and the map only.`),
    cityText: (city) => sentence(`Fintraffic gives no city field and no direction: ${city} is the place in the second part of these stations' own names, not a municipal boundary, road codes such as kt51 are the prefixes Fintraffic puts in its station names, and each link is one picture address on weathercam.digitraffic.fi that we never show.`),
    caveats: ['Each link goes to one picture address on weathercam.digitraffic.fi (the first view of the station; a station can have several views). It is a link only, never shown here. The Fintraffic licence sentence covers its open data; it does not say whether the pictures themselves are covered.'],
  },
  // Quebec: the ministry's feed names 14 administrative regions; each is a region here and has no city pages (the feed has no place field).
  ...Object.fromEntries(QC_REGIONS.map((r) => [r.slug, {
    sourceId: 'quebec-mtmd', agency: 'MTMD Québec', cityLimit: 0, guide: null, credit: true, list: 'camera list', listAll: true,
    placeText: (x) => sentence(`The ministry's feed has no city field and its descriptions name no reliable place, so no camera here has a named place and there are no city pages; all ${x.total} cameras are listed below.`),
    cityText: () => '',
    caveats: ['Each link goes to a video page on quebec511.info. That site answers automated requests with a bot-check page, so we never request those links and every camera here shows the status unknown by design, not broken. Direction is the word in the ministry\'s own description (for example "westward"); the road is read from the description only when it agrees with the feed\'s route number. The licence covers the list; it does not say whether the video is covered.'],
  }])),
  // Toronto: one region from the City's open list; each row is an intersection of two streets and the feed has no place field, so no city pages.
  [TOR_REGION.slug]: {
    sourceId: 'toronto-traffic', agency: 'City of Toronto', cityLimit: 0, guide: null, credit: true, list: 'traffic camera list', listAll: true,
    placeText: (x) => sentence(`The City's list has no neighbourhood or place field and names each camera as the meeting of two streets, so no camera here has a named place and there are no city pages; all ${x.total} cameras are listed below. A row names the compass views only when the City lists fewer than all four (north, east, south, west).`),
    cityText: () => '',
    caveats: ['Each link goes to one live picture address on opendata.toronto.ca, the main view of that intersection; it is a link only, never shown here. The City lists up to four compass views (north, east, south, west) for an intersection and we name the ones it lists. The licence covers the list; it does not say whether the picture files themselves are covered.'],
  },
  // Calgary: one region from the City's open list; each row is a place text "Road / Cross road" plus a quadrant word and the feed has no place field, so no city pages.
  [CGY_REGION.slug]: {
    sourceId: 'calgary-traffic', agency: 'City of Calgary', cityLimit: 0, guide: null, credit: true, list: 'traffic camera list', listAll: true,
    placeText: (x) => sentence(`The City's list has no neighbourhood or place field: each camera is named by the roads it is at and a quadrant of the city (NW, NE, SW, SE), which is a part of the city and not a place name, so no camera here has a named place and there are no city pages; all ${x.total} cameras are listed below.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to the City of Calgary and are not shown here. Each link goes to one live picture address on trafficcam.calgary.ca; it is a link only. The City says the cameras are for traffic monitoring, not enforcement, and footage is not recorded. The licence covers the list; it does not say whether the picture files themselves are covered.'],
  },
};
// The credit sentence for a source that asks for one (its attribution line from sources.json, without a leading "Source:").
export const creditLine = (source) => `Credit: ${String(source.attribution).replace(/^Source:\s*/i, '').replace(/\.$/, '')}.`; // one full stop whether or not the licence's own statement ends with one
export const regionInfo = (slug) => REGIONS[slug] || { sourceId: null, agency: 'the official source', cityLimit: 5, guide: null };

// Curated places: [{ region, city, n }]. Counted PER REGION, so the same place name in two regions never merges into one count
// or one page. Bigger regions first; inside a region by camera count, ties A to Z. Provisional.
export function curatedPlaces(cams, limit) {
  const regions = Object.entries(countsBy(cams, 'region')).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([r]) => r).filter((r) => countryOf(r));
  const out = [];
  for (const region of regions) {
    Object.entries(countsBy(cams.filter((c) => c.regionSlug === region), 'city')).filter(([, n]) => n >= MIN_CAMERAS)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit ?? regionInfo(region).cityLimit)
      .forEach(([city, n]) => out.push({ region, city, n }));
  }
  return out;
}
// Names only (callers that already know the region). Two regions with one name appear twice: use curatedPlaces when that matters.
export const curatedCities = (cams, limit) => curatedPlaces(cams, limit).map((p) => p.city);

// Curated roads: the ten with the most cameras, each with at least MIN_CAMERAS. Provisional, like the cities.
// Counted by roadSlug so two spellings of one road would count once; returns the display spelling (most common).
export function curatedRoads(cams, limit = 10) {
  const by = new Map();
  for (const c of cams) {
    const k = roadSlug(c.road);
    if (!k) continue;
    const e = by.get(k) || { n: 0, spell: {} };
    e.n++; e.spell[c.road] = (e.spell[c.road] || 0) + 1;
    by.set(k, e);
  }
  return [...by.values()].filter((e) => e.n >= MIN_CAMERAS)
    .map((e) => ({ n: e.n, road: Object.entries(e.spell).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0] }))
    .sort((a, b) => b.n - a.n || a.road.localeCompare(b.road)).slice(0, limit).map((e) => e.road);
}

// Regions that get a hub: only with enough cameras (an empty hub is never generated).
export function regionsWithPages(cams) {
  return Object.entries(countsBy(cams, 'region')).filter(([slug, n]) => n >= MIN_CAMERAS && countryOf(slug)).map(([slug]) => slug);
}

// Countries that get a hub: only with enough cameras across their regions.
export function countriesWithPages(cams) {
  return Object.entries(countsBy(cams, 'country')).filter(([, n]) => n >= MIN_CAMERAS).map(([slug]) => slug);
}
export const countryName = (slug) => Object.values(REGION_COUNTRY).find((c) => c.countrySlug === slug)?.countryName;
export const regionsOfCountry = (cams, countrySlug) => regionsWithPages(cams).filter((r) => countryOf(r).countrySlug === countrySlug);

// Every page: { route, kind, count, indexable, lastmod }. cities are passed in so tests can use fixtures.
// cities: names (one region) or curatedPlaces rows. dates: optional { regionSlug: 'YYYY-MM-DD' } so a region page carries ITS registry date.
export function pageList(cams, cities, registryDate, roads = [], dates = {}) {
  const byRegion = countsBy(cams, 'region');
  const dateOf = (r) => dates[r] || registryDate;
  const out = [
    { route: '/', kind: 'home', count: cams.length, indexable: true, lastmod: registryDate },
    { route: '/map/', kind: 'map', count: cams.length, indexable: true, lastmod: registryDate },
    { route: '/status/', kind: 'status', count: cams.length, indexable: true, lastmod: registryDate },
    { route: '/cameras/', kind: 'hub', count: cams.length, indexable: isIndexable(cams.length), lastmod: registryDate },
  ];
  const byCountry = countsBy(cams, 'country');
  const countryDate = (c) => regionsOfCountry(cams, c).map(dateOf).filter(Boolean).sort().at(-1) || registryDate;
  for (const c of countriesWithPages(cams)) out.push({ route: countryRoute(c), kind: 'country', count: byCountry[c], indexable: isIndexable(byCountry[c]), lastmod: countryDate(c) });
  for (const r of regionsWithPages(cams)) out.push({ route: regionRoute(r), kind: 'region', count: byRegion[r], indexable: isIndexable(byRegion[r]), lastmod: dateOf(r) });
  for (const p of cities.map((x) => (typeof x === 'string' ? { city: x, region: null } : x))) {
    const sub = p.region ? cams.filter((c) => c.regionSlug === p.region) : cams;
    const rs = [...new Set(sub.filter((c) => c.city === p.city).map((c) => c.regionSlug))];
    if (rs.length !== 1 || !regionRoute(rs[0])) continue; // a bare name used in two regions is ambiguous, and a region with no country has no address: no page rather than a wrong one
    const n = countsBy(sub, 'city')[p.city] || 0;
    out.push({ route: cityRoute(rs[0], p.city), kind: 'city', count: n, indexable: isIndexable(n), lastmod: dateOf(rs[0]) });
  }
  if (roads.length) out.push({ route: '/roads/', kind: 'roads-hub', count: roads.length, indexable: true, lastmod: dateOf('california') }); // road pages are California-only
  const byRoad = countsBy(cams, 'road');
  for (const r of roads) out.push({ route: `/roads/${roadSlug(r)}/`, kind: 'road', count: byRoad[r] || 0, indexable: isIndexable(byRoad[r] || 0), lastmod: dateOf('california') });
  for (const g of GUIDES) out.push({ route: `/guides/${g.slug}/`, kind: 'guide', count: null, indexable: true, lastmod: g.date });
  return out;
}

export function buildSitemap(pages, siteUrl) {
  const rows = pages.filter((p) => p.indexable).map((p) => `<url><loc>${siteUrl}${p.route}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}
