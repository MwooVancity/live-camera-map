// Pure helpers (no Astro): page list, noindex gate, sitemap. Tested with fixtures in tests/gate.test.mjs.
import { countsBy, roadSlug, countryOf, REGION_COUNTRY } from '../../../ops/importers/lib/registry.mjs';
import { MIN_CAMERAS } from '../config.mjs';
import { QC_REGIONS } from '../../../ops/importers/lib/quebec.mjs';
import { TOR_REGION } from '../../../ops/importers/lib/toronto.mjs';
import { CGY_REGION } from '../../../ops/importers/lib/calgary.mjs';
import { HK_REGION } from '../../../ops/importers/lib/hongkong.mjs';
import { IS_REGION } from '../../../ops/importers/lib/iceland.mjs';
import { TX_REGION } from '../../../ops/importers/lib/austin.mjs';
import { LN_REGION } from '../../../ops/importers/lib/tfl.mjs';
import { NSW_REGION } from '../../../ops/importers/lib/nsw.mjs';
import { TW_REGION } from '../../../ops/importers/lib/taiwan.mjs';
import { IA_REGION } from '../../../ops/importers/lib/iowa.mjs';
import { A22_REGION } from '../../../ops/importers/lib/a22.mjs';
import { LA_REGION } from '../../../ops/importers/lib/brla.mjs';
import { MADRID_REGION } from '../../../ops/importers/lib/madrid.mjs';

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
  { slug: 'what-caltrans-lane-closures-mean', title: 'What Caltrans lane closures mean (types, duration, end dates)', date: '2026-11-24' },
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
  // Hong Kong: one region from the Transport Department's own list; each row has a District (the Department's own word), kept as text, and the feed has no city field, so no city pages.
  [HK_REGION.slug]: {
    sourceId: 'hongkong-traffic', agency: 'Transport Department (Hong Kong)', cityLimit: 0, guide: null, credit: true, list: 'traffic camera list', listAll: true,
    placeText: (x) => sentence(`The Department's list has no city field: each camera is named as the Department names it, ending in its camera key (for example [H429F]), and carries a District and an area (Hong Kong Island, Kowloon or New Territories), which are parts of Hong Kong and not city names, so there are no city pages; all ${x.total} cameras are listed below.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to the Government of the Hong Kong SAR and are not shown here. Each link goes to one still picture address on tdcctv.data.one.gov.hk; it is a link only. The DATA.GOV.HK terms cover the data; they do not separately say whether the picture files are covered.'],
  },
  // Iceland: one region from the Road and Coastal Administration's own list; one row per camera view, the station name kept as text, no place field, so no city pages.
  [IS_REGION.slug]: {
    sourceId: 'iceland-vegagerdin', agency: 'Icelandic Road and Coastal Administration (Vegagerðin)', cityLimit: 0, guide: null, credit: true, list: 'road camera list', listAll: true,
    placeText: (x) => sentence(`The Administration's list has no place field: each camera view is named as the Administration names it, with the picture file name in brackets because several views share one text, and carries its road name and number where the Administration gives them, so there are no city pages; all ${x.total} views are listed below.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to the Icelandic Road and Coastal Administration and are not shown here. Each link goes to one still picture address on www.vegagerdin.is; it is a link only. The Administration publishes the data under CC BY 4.0 and says its road camera images are automatically generated real-time data provided as is; its terms do not separately say that the picture files are covered, and we do not suggest the Administration endorses this site.'],
  },
  // London: one region from TfL's own JamCam list; every row has the city London, so the region page lists them all and there are no city pages.
  [LN_REGION.slug]: {
    sourceId: 'tfl-jamcams', agency: 'Transport for London', cityLimit: 0, guide: null, credit: true, list: 'JamCam list', listAll: true,
    placeText: (x) => sentence(`TfL's list has no borough or place field: each camera is named as TfL names it, usually the roads it is at, and every one is in London, so there are no city pages; all ${x.total} available cameras are listed below. Cameras TfL marks as not available are left out.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to Transport for London and are not shown here. Each link goes to one still picture address on s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk; it is a link only. TfL\'s licence covers its data; it does not mention the picture files, and we do not suggest TfL endorses this site.'],
  },
  // New South Wales: one region from Transport for NSW's own Live Traffic list; each row carries the agency's view sentence and area code as text, and the feed has no place field, so no city pages.
  [NSW_REGION.slug]: {
    sourceId: 'nsw-live-traffic', agency: 'Transport for NSW', cityLimit: 0, guide: null, credit: true, list: 'Live Traffic camera list', listAll: true,
    placeText: (x) => sentence(`Transport for NSW's list has no suburb or place field: each camera is named as the agency names it, usually a road and a suburb in brackets, and carries the agency's own sentence on where it looks and an agency area code (for example SYD_SOUTH), which is an area of the agency and not a place name, so there are no city pages; all ${x.total} cameras are listed below.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to Transport for NSW and are not shown here. Each link goes to one still picture address on webcams.transport.nsw.gov.au (one on data.livetraffic.com); it is a link only. That host answers automated requests with a placeholder page, so we never request the pictures and every camera here shows the status unknown by design, not broken. The Open Data Hub licence covers the data; it does not say whether the picture files themselves are covered, and we do not suggest Transport for NSW endorses this site.'],
  },
  // Taiwan: one region from the Highway Bureau's own provincial-road CCTV list; the Chinese description is the name, the road code and kilometre mark are kept as text, no place field, so no city pages.
  [TW_REGION.slug]: {
    sourceId: 'taiwan-thb', agency: 'Highway Bureau, Ministry of Transportation and Communications (Taiwan)', cityLimit: 0, guide: null, credit: true, list: 'provincial road CCTV list', listAll: true,
    placeText: (x) => sentence(`The Bureau's list has no city or place field: each camera is named as the Bureau names it, in Chinese, usually a road and an interchange span or a kilometre mark with a direction letter, and carries the Bureau's own road code (for example 台9線) and kilometre mark as text, so there are no city pages; all ${x.total} cameras are listed below.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to the Highway Bureau and are not shown here. Each link goes to one still picture address on cctv-ss01 to cctv-ss08.thb.gov.tw; it is a link only. Live status is not checked: the picture host does not answer the usual status request, so every camera here shows the status unknown by design, not broken. The list covers the Bureau\'s provincial roads only, not the national freeways. The Bureau lets the public use its traffic data free of charge if the Bureau is named as the original source, and says the data is for reference only; its notice does not say whether the picture files are covered, and we do not suggest the Bureau endorses this site.'],
  },
  // Iowa: one region from the Iowa DOT's own camera list; the route (I-80, US 20) is the road, the DOT's type and function labels are kept as text, the layer has no place field, so no city pages.
  [IA_REGION.slug]: {
    sourceId: 'iowa-dot', agency: 'Iowa Department of Transportation', cityLimit: 0, guide: null, credit: true, list: 'traffic camera list', listAll: true,
    placeText: (x) => sentence(`The Iowa DOT's list has no city or place field: each camera is named as the DOT names it, usually a route and a mile marker (for example I-80 @ MM 114.2), and carries the DOT's own type (Iowa DOT, RWIS road weather station or rest area) and function as text, so there are no city pages; all ${x.total} cameras are listed below. A weather station or rest area with several views has one link per view.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to the Iowa Department of Transportation and are not shown here. Each link goes to one still picture address on atmsqf.iowadot.gov; it is a link only, and the DOT\'s live video streams are not linked. The DOT licenses the camera list under Creative Commons Attribution 4.0 with credit to the DOT; that licence covers the data, and we do not suggest the DOT endorses this site.'],
  },
  // A22 Brenner motorway (Italy): one region from Autobrennero's own webcams as listed by the Open Data Hub; kilometre mark and carriageway side are kept as text, no city field, so no city pages.
  [A22_REGION.slug]: {
    sourceId: 'a22-brennero', agency: 'Autostrada del Brennero (A22), via the Open Data Hub', cityLimit: 0, guide: null, credit: true, list: 'A22 webcam list', listAll: true,
    placeText: (x) => sentence(`The list has no city or place field: each of the ${x.total} cameras is named as Autobrennero names it (a toll station or junction on the A22 from Brennero to the A1 near Modena) and carries its kilometre mark and the side of the carriageway as text, so there are no city pages.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to Autostrada del Brennero and are not shown here. Each link goes to one still picture address on www.autobrennero.it; it is a link only. Live status is not checked: that host answers automated requests with a bot challenge, so every camera here shows the status unknown by design, not broken. The Open Data Hub tags the camera list CC0 but says that tag does not extend to the picture behind the link. Autostrada del Brennero S.p.A. does not endorse this site.'],
  },
  // Louisiana: one source, the LADOTD cameras in Greater Baton Rouge as listed by the City of Baton Rouge open data portal; the list has no name, road or city field, so the 511LA camera code is the name and there are no city pages.
  [LA_REGION.slug]: {
    sourceId: 'brla-dotd', agency: 'Louisiana DOTD, via City of Baton Rouge open data', cityLimit: 0, guide: null, credit: true, list: 'DOTD camera list', listAll: true,
    placeText: (x) => sentence(`These are the Greater Baton Rouge cameras only, not a list for the whole state of Louisiana: the City of Baton Rouge's open list of Louisiana DOTD cameras has no name, road or city field, so each of the ${x.total} cameras is named by its 511LA camera code (for example b24--1) and there are no city pages.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to the Louisiana Department of Transportation and Development and are not shown here. Each link goes to one 511LA camera address on 511la.org; it is a link only, and live status is not checked, so every camera here shows the status unknown by design, not broken. The City of Baton Rouge open data portal tags the list Public Domain and names LADOTD as the source; that is the city portal\'s tag on state-owned data, not a licence we read from LADOTD, and 511LA\'s own disclaimer is a warranty and liability notice that does not say whether the pictures may be reused. LADOTD does not endorse this site.'],
  },
  // Madrid: one source, the City of Madrid's own traffic camera list (357 fixed cameras); the list has no road or city field, so the City's uppercase description is the name, the camera number is kept as text, and there are no city pages. Not the DGT national feed (a separate source, not built).
  [MADRID_REGION.slug]: {
    sourceId: 'madrid-camaras', agency: 'Ayuntamiento de Madrid', cityLimit: 0, guide: null, credit: true, list: 'Madrid camera list', listAll: true,
    placeText: (x) => sentence(`These are the City of Madrid's own fixed traffic cameras only, not a list for the whole Madrid region or for Spain: the City's list has no road or city field, so each of the ${x.total} cameras is named as the City names it (for example PLAZA DE CASTILLA (NORTE)) with its five-digit camera number kept as text, and there are no city pages.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to the Ayuntamiento de Madrid and are not shown here. Each link goes to one still picture address on informo.madrid.es; it is a link only. The City publishes the camera list under Creative Commons Attribution 4.0 with credit to the City, and its general reuse conditions allow commercial reuse; its legal notice says that reuse criterion does not apply to images, videos or other multimedia, so we do not show or copy any picture. The picture status is checked by one request per picture and shown as last checked. We do not suggest the Ayuntamiento de Madrid sponsors or supports this site.'],
  },
  // Texas: one source, the City of Austin's own list. Region page is Austin only (the registry has no other Texas source); the feed has no city field and lists cameras in the City's extra-territorial jurisdiction too, so no city is invented.
  [TX_REGION.slug]: {
    sourceId: 'austin-traffic', agency: 'City of Austin', cityLimit: 0, guide: null, credit: true, list: 'traffic camera list', listAll: true,
    placeText: (x) => sentence(`These are the City of Austin's cameras only, not a list for the whole state of Texas: the City's list has no city field (it also covers cameras in the City's extra-territorial jurisdiction), so there are no city pages. Each of the ${x.total} cameras is one the City marks TURNED_ON, named as the City names it with its camera number in brackets, and carries its street and cross street where the City gives them; cameras the City marks DESIRED, VOID or REMOVED are left out.`),
    cityText: () => '',
    caveats: ['The camera pictures belong to the City of Austin and are not shown here. Each link goes to one still picture address on cctv.austinmobility.io; it is a link only. The City of Austin Open Data Terms of Use cover the data portal and put no controls on end use; they do not separately say whether the picture files are covered.'],
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
    if (c.regionSlug !== 'california') continue; // road pages are California-only: another region's route (Iowa I-80, I-35) must never become a California road page, a sitemap row or take a place in the ten
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
export function pageList(cams, cities, registryDate, roads = [], dates = {}, corridors = []) {
  const byRegion = countsBy(cams, 'region');
  const dateOf = (r) => dates[r] || registryDate;
  const out = [
    { route: '/', kind: 'home', count: cams.length, indexable: true, lastmod: registryDate },
    { route: '/map/', kind: 'map', count: cams.length, indexable: true, lastmod: registryDate },
    { route: '/status/', kind: 'status', count: cams.length, indexable: true, lastmod: registryDate },
    { route: '/data/', kind: 'data', count: cams.length, indexable: true, lastmod: registryDate },
    { route: '/privacy/', kind: 'privacy', count: null, indexable: true, lastmod: '2026-11-24' }, // facts checked on this date; a test (site/tests/privacy.test.mjs) fails when they change
    { route: '/observability/iceland/', kind: 'observability', count: cams.filter((c) => c.country === 'iceland').length, indexable: true, lastmod: registryDate },
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
  for (const c of corridors) out.push({ route: `/corridors/${c.slug}/`, kind: 'corridor', count: c.n, indexable: isIndexable(c.n), lastmod: dateOf(c.region) }); // plan item 36 P2-12: five corridor pages outside California
  for (const g of GUIDES) out.push({ route: `/guides/${g.slug}/`, kind: 'guide', count: null, indexable: true, lastmod: g.date });
  return out;
}

export function buildSitemap(pages, siteUrl) {
  const rows = pages.filter((p) => p.indexable).map((p) => `<url><loc>${siteUrl}${p.route}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}
