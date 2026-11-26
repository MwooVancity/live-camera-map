// The GEV camera packs our registry lacked, as one table plus one normalizer. No network here.
// Rows come from GEV's own loaders (gev/server/providers/cctv, read-only) and, for Oregon, from ODOT's current TripCheck list.
// Licence: each pack opens only through its EXISTING row in data/source-permissions.json (permId): GEV's DATA_SOURCES.md note, or the owner approval of 2026-11-24 for it.
// Link-out only: we keep a name, coordinates and one link. No picture or stream is fetched, stored or shown.
// Not here, on purpose: Warendorf (one camera, http only); NYC, Florida, Houston, Lithuania (restricted or off by default in GEV); Taiwan Freeway (no row in GEV's data notes);
// Ontario (needs ONTARIO_511_API_KEY) and Ottawa (needs OTTAWA_CAMERA_CERTIFICATE); packs our own importers already cover.
// Beats Argos by: every camera named as its operator's list names it, with its own coordinates, one official link and a printed credit, and an honest "status not checked" line.

const GEV_NOTES = 'https://github.com/bilawalsidhu/gods-eye-view/blob/aac6be77735f6bcad583204724a43302227abc4d/DATA_SOURCES.md';
const US = { countryCode: 'US', countrySlug: 'united-states', countryName: 'United States' };
const EE = { countryCode: 'EE', countrySlug: 'estonia', countryName: 'Estonia' };

// min = fewest usable rows we accept on a first run (about two thirds of the count read 2026-11-26); after that the under-half rule also applies.
// link: fixed page used when GEV's address is a stream or a data call a visitor cannot open.
export const GEV_PACKS = [
  { sourceId: 'odot-tripcheck', loader: 'odot', min: 600, permId: 'world-camera-image-subset-2-230-locations',
    region: { slug: 'oregon', name: 'Oregon' }, country: US, agency: 'Oregon Department of Transportation (TripCheck)', host: 'tripcheck.com', what: 'traffic and road cameras',
    attribution: 'Camera courtesy of ODOT', licenseUrl: 'https://tripcheck.com/Pages/Frequently-Asked-Questions' },
  { sourceId: 'mlit-river', loader: 'loadWorldCameraSources', sourceKind: 'mlit-river', min: 700, permId: 'world-camera-image-subset-2-230-locations',
    region: { slug: 'japan-rivers', name: 'Japan rivers' }, country: { countryCode: 'JP', countrySlug: 'japan', countryName: 'Japan' }, agency: 'MLIT river cameras (Japan)', host: 'cam.river.go.jp', what: 'river cameras (they watch rivers, not roads)',
    attribution: '出典：国土交通省 川の防災情報 (Ministry of Land, Infrastructure, Transport and Tourism, Japan)', hosts: ['cam.river.go.jp'] },
  { sourceId: 'tallinn-ristmikud', loader: 'loadTallinnSourcesFromCatalog', min: 170, permId: 'city-of-tallinn-ristmikud-tallinn-ee',
    region: { slug: 'tallinn', name: 'Tallinn' }, country: EE, agency: 'City of Tallinn', host: 'ristmikud.tallinn.ee', what: 'intersection cameras',
    attribution: 'City of Tallinn — ristmikud.tallinn.ee', hosts: ['ristmikud.tallinn.ee'] },
  { sourceId: 'tarktee-cameras', loader: 'loadTarkteeSourcesFromDatex', min: 100, permId: 'transpordiamet-tarktee',
    region: { slug: 'estonia-roads', name: 'Estonia roads' }, country: EE, agency: 'Transpordiamet (Tarktee)', host: 'tarktee.transpordiamet.ee', what: 'road weather cameras',
    attribution: 'Transpordiamet / Tarktee — tarktee.transpordiamet.ee', hosts: ['tarktee.transpordiamet.ee'] },
  { sourceId: 'catalonia-transit', loader: 'loadCataloniaSourcesFromOpenData', min: 20, permId: 'servei-catal-de-tr-nsit-ajuntament-de-barcelona-ajuntament-de-terrassa',
    region: { slug: 'catalonia', name: 'Catalonia' }, country: { countryCode: 'ES', countrySlug: 'spain', countryName: 'Spain' }, agency: 'Servei Català de Trànsit', host: 'the operator named on each camera', what: 'traffic cameras',
    attribution: 'Servei Català de Trànsit; partner-supplied cameras also name their owner', hosts: ['mct.gencat.cat', 'emap.terrassa.cat'] },
  { sourceId: 'delaware-deldot', loader: 'loadDelDOTSourcesFromOpenData', min: 240, permId: 'deldot-video-deldot-gov',
    region: { slug: 'delaware', name: 'Delaware' }, country: US, agency: 'DelDOT (Delaware Department of Transportation)', host: 'deldot.gov', what: 'traffic cameras',
    attribution: 'DelDOT — Delaware Department of Transportation', hosts: ['video.deldot.gov'], link: 'https://deldot.gov/map/' },
  { sourceId: 'king-county-roads', loader: 'loadKingCountySourcesFromOpenData', min: 38, permId: 'king-county-road-services-services-arcgis-com-king-county-gis',
    region: { slug: 'king-county', name: 'King County' }, country: US, agency: 'King County Road Services', host: 'info.kingcounty.gov', what: 'county road cameras',
    attribution: 'King County Road Services (partner-city cameras name their owner)', hosts: ['info.kingcounty.gov'] },
  { sourceId: 'txdot-its', loader: 'loadTxdotSourcesFromOpenData', min: 400, permId: 'txdot-its-its-txdot-gov',
    region: { slug: 'texas-highways', name: 'Texas highways' }, country: US, agency: 'Texas Department of Transportation', host: 'its.txdot.gov', what: 'highway cameras (Austin and San Antonio districts)',
    attribution: 'Texas Department of Transportation', hosts: ['its.txdot.gov'], link: 'https://its.txdot.gov/' },
  { sourceId: 'wsdot-cameras', loader: 'loadWsdotSourcesFromOpenData', min: 800, permId: 'wsdot-data-wsdot-wa-gov',
    region: { slug: 'washington-state', name: 'Washington State' }, country: US, agency: 'Washington State Department of Transportation', host: 'images.wsdot.wa.gov', what: 'highway cameras',
    attribution: 'Washington State Department of Transportation (Travel Center)', hosts: ['images.wsdot.wa.gov'] },
  { sourceId: 'vegvesen-cameras', loader: 'loadVegvesenSourcesFromOpenData', min: 600, permId: 'statens-vegvesen-catalog-ogckart-sn1-atlas-vegvesen-no-frames-kamera-atlas-vegve',
    region: { slug: 'norway', name: 'Norway' }, country: { countryCode: 'NO', countrySlug: 'norway', countryName: 'Norway' }, agency: 'Statens vegvesen', host: 'kamera.atlas.vegvesen.no and kamera.vegvesen.no', what: 'road cameras',
    attribution: 'Contains data under the Norwegian licence for Open Government data (NLOD) distributed by Statens vegvesen', licenseUrl: 'https://data.norge.no/nlod/en/2.0', hosts: ['kamera.atlas.vegvesen.no', 'kamera.vegvesen.no'] },
  // only the Montreal intersection nodes of GEV's Quebec snapshot: the ministry's own cameras come from our quebec importer, and the third-party scenic webcams carry their own terms
  { sourceId: 'montreal-osm-cameras', loader: 'loadQuebecSources', sourceKind: 'quebec-montreal-osm', min: 280, permId: 'qu-bec-cctv-source-catalog-1-120-locations',
    region: { slug: 'montreal-city', name: 'Montréal city intersections' }, country: { countryCode: 'CA', countrySlug: 'canada', countryName: 'Canada' }, agency: 'Ville de Montréal camera locations (OpenStreetMap)', host: 'ville.montreal.qc.ca', what: 'intersection cameras',
    attribution: '© OpenStreetMap contributors (ODbL)', licenseUrl: 'https://www.openstreetmap.org/copyright', hosts: ['ville.montreal.qc.ca'] },
].map((p) => ({ licenseUrl: GEV_NOTES, ...p }));

// Site wiring (spread into REGION_COUNTRY and REGIONS by the shared-file patch).
export const GEV_REGION_COUNTRY = Object.fromEntries(GEV_PACKS.map((p) => [p.region.slug, p.country]));
export const GEV_REGIONS = Object.fromEntries(GEV_PACKS.map((p) => [p.region.slug, {
  sourceId: p.sourceId, agency: p.agency, cityLimit: 0, guide: null, credit: true, list: 'camera list', listAll: true,
  placeText: (x) => `The list we read has no city field we use, so there are no city pages here. Each of the ${x.total} ${p.what} is named as the list names it and has its own coordinates.`,
  cityText: () => '',
  caveats: [`The pictures belong to their operator and are not shown here. ${p.link ? `Each link opens the operator's page on ${p.host}, not one camera: find the camera there by its name.` : `Each link goes to the official address on ${p.host}; it is a link only.`} We have not checked whether each camera is live, so the status reads unknown. No operator endorses this site.`],
}]));

const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, max) : '');

// The address, only when it is plain http(s) on one of the pack's own hosts (no login, no port).
export function pinned(raw, hosts) {
  let u;
  try { u = new URL(String(raw)); } catch { return ''; }
  return /^https?:$/.test(u.protocol) && !u.username && !u.password && !u.port && hosts.includes(u.hostname) ? u.href : '';
}
// one spelling per address, for "do we already list this link?"
export const urlKey = (u) => String(u).toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/%20/g, ' ');

// One GEV catalog row -> a registry camera or null. `seen` holds ids and links already taken (links of other sources included by the caller).
export function normalizeGev(pack, r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const raw = String(r.id ?? '');
  if (!/^[\p{L}\p{N}_.+=-]{1,200}$/u.test(raw)) return bump('noId');
  // the site links https only; mct.gencat.cat answered the same picture address over https (one HEAD, 2026-11-26)
  const picture = (pinned(r.snapshotUrl || r.url || r.sourceUrl, pack.hosts) || pinned(r.sourceUrl || r.url, pack.hosts)).replace(/^http:\/\/mct\.gencat\.cat\//, 'https://mct.gencat.cat/');
  if (!picture.startsWith('https://')) return bump('badUrl');
  const name = text(r.name, 180);
  if (!name || /[<>]/.test(name)) return bump('badName');
  const { lat, lon } = r;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) return bump('badCoords');
  const id = `${pack.sourceId}-${raw.replace(/^(world-jp-river|tln|txdot|deldot|kingcounty|wsdot|no-vegvesen|cat|ee-tarktee)-/, '')}`;
  if (seen.has(id)) return bump('dupId');
  if (seen.has(urlKey(picture))) return bump('dupUrl');
  seen.add(id); seen.add(urlKey(picture)); // the picture address tells two cameras apart even when they share one fixed page link
  const partner = text(r.credit, 80);
  const where = pack.sourceKind === 'mlit-river' ? text(r.city, 40).replace(/, JP$/, '') : '';
  const locationText = where ? `Prefecture: ${where}.` : pack.sourceId === 'catalonia-transit' && partner ? `Camera owner: ${partner}.` : pack.sourceId === 'king-county-roads' && partner ? `Camera owner: ${partner}.` : '';
  return {
    id, sourceId: pack.sourceId, name, road: '', direction: '', city: null,
    regionSlug: pack.region.slug, regionName: pack.region.name, lat, lon,
    feedType: r.feedType === 'hls' || r.feedType === 'mjpeg' ? 'video' : 'still',
    officialUrl: pack.link || picture, officialUrlLastVerified: null, lastSeen,
    ...(locationText ? { locationText } : {}),
  };
}
