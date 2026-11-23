// Pure helpers for Quebec (MTMD "Camera de circulation", Donnees Quebec, CC-BY 4.0). No network here.
// Feed: WFS GeoJSON of ministry traffic cameras. Each record has a link to a quebec511.info video page, never a picture address.
// Beats Argos by: every Quebec camera sits in the administrative region the ministry's own feed names (14 of them), with the
// ministry's description as the label, and says plainly that quebec511.info blocks automated link checks so status is unknown by design.
export const QC_BOUNDS = { latMin: 44.9, latMax: 62.7, lonMin: -79.8, lonMax: -57.0 }; // Quebec; sanity box only
export const PACKAGE_URL = 'https://www.donneesquebec.ca/recherche/api/3/action/package_show?id=camera-de-circulation';
export const LICENCE_ID = 'cc-by'; // CKAN license_id the importer insists on ("Attribution (CC-BY 4.0)")
export const FEED_URL = 'https://ws.mapserver.transports.gouv.qc.ca/swtq?service=wfs&version=2.0.0&request=getfeature&typename=ms:infos_cameras&outfile=Camera&srsname=EPSG:4326&outputformat=geojson';
export const LINK_PREFIX = 'https://www.quebec511.info/';

// The ONE list of regions: the 14 values of NomRegionDiffusion seen in the feed on 2026-11-23. REGION_COUNTRY is built from it.
// A record naming any other region is dropped and counted (unknownRegion), never given a made-up region.
export const QC_REGIONS = [
  ['Québec (Capitale-Nationale)', 'quebec-capitale-nationale'],
  ['Bas-Saint-Laurent—Gaspésie—Îles-de-la-Madeleine', 'bas-saint-laurent-gaspesie-iles-de-la-madeleine'],
  ['Estrie', 'estrie'],
  ['Outaouais', 'outaouais'],
  ['Saguenay—Lac-Saint-Jean', 'saguenay-lac-saint-jean'],
  ['Nord-du-Québec', 'nord-du-quebec'],
  ['Montréal', 'montreal'],
  ['Abitibi-Témiscamingue', 'abitibi-temiscamingue'],
  ['Côte-Nord', 'cote-nord'],
  ['Chaudière-Appalaches', 'chaudiere-appalaches'],
  ['Mauricie—Centre-du-Québec', 'mauricie-centre-du-quebec'],
  ['Montérégie', 'monteregie'],
  ['Laurentides—Lanaudière', 'laurentides-lanaudiere'],
  ['Laval', 'laval'],
].map(([name, slug]) => ({ name, slug }));
const BY_NAME = new Map(QC_REGIONS.map((r) => [r.name, r]));

const s = (v) => (typeof v === 'string' ? v.trim() : '');
const DIRS = { northward: 'Northward', southward: 'Southward', eastward: 'Eastward', westward: 'Westward', north: 'North', south: 'South', east: 'East', west: 'West', northbound: 'Northbound', southbound: 'Southbound', eastbound: 'Eastbound', westbound: 'Westbound' };

// Road and direction are read from the ministry's English description ("Aut. 540 (westward) at boul. Wilfrid-Hamel") and kept
// only when the road number agrees with the feed's own NumeroRoute; otherwise ''. Direction: only a lone parenthesis that is a
// direction word; "(Henri-IV)" or "(km 26)" give none.
export function parseDescription(desc, numeroRoute) {
  const d = s(desc);
  const m = d.match(/^(Aut\.|Route|Rte)\s+(\d{1,3})\b/i);
  const n = Number(s(numeroRoute));
  const road = m && Number(m[2]) === n ? `${/^aut/i.test(m[1]) ? 'Autoroute' : 'Route'} ${n}` : '';
  const dir = [...d.matchAll(/\(([^)]*)\)/g)].map((x) => DIRS[x[1].trim().toLowerCase()]).filter(Boolean);
  return { road, direction: dir.length === 1 ? dir[0] : '' };
}

// Returns a camera or null; drop reasons are counted into `drop`.
export function normalizeQuebec(f, lastSeen, drop = {}) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  const p = f && f.properties;
  if (!p || typeof p !== 'object' || !f.geometry) return bump('malformed');
  const id = s(p.IDEcamera);
  const name = s(p.DescriptionLocalisationEn) || s(p.DescriptionLocalisationFr);
  if (!/^\d{1,6}$/.test(id) || !name) return bump('noIdOrName');
  const region = BY_NAME.get(s(p.NomRegionDiffusion));
  if (!region) return bump('unknownRegion');
  const c = f.geometry.coordinates;
  if (f.geometry.type !== 'Point' || !Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return bump('badCoords');
  const [lon, lat] = c;
  if (lat < QC_BOUNDS.latMin || lat > QC_BOUNDS.latMax || lon < QC_BOUNDS.lonMin || lon > QC_BOUNDS.lonMax) return bump('outOfBounds');
  const link = s(p.URL_FLUX_DONNEE);
  if (!link.startsWith(LINK_PREFIX)) return bump('noUrl'); // the link-out target must be on quebec511.info itself
  const { road, direction } = parseDescription(name, p.NumeroRoute);
  return {
    id: `quebec-mtmd-${id}`,
    sourceId: 'quebec-mtmd',
    name,
    road,
    direction,
    city: null, // the feed gives no place field and its free text has no reliable one: no invented cities
    regionSlug: region.slug,
    regionName: region.name,
    lat, lon,
    feedType: 'video', // the feed calls the link a video flux page
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
  };
}
