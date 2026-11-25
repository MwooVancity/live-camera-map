// Pure helpers for Medellin (Colombia): SIMM CCTV camera points, GeoMedellin ArcGIS layer "CCTV_Movilidad". No network here.
// Feed: one ArcGIS query (f=geojson, outSR=4326), one Point per camera. properties: direccion (street corner), localizacion (place name), link_foto (the camera's own
// picture address on medellin.gov.co, imagen<NN>.jpg, or the bare imagen.jpg / null when the camera has none). We keep ONLY that address as the link-out, never the picture.
// Licence (read 2026-11-25): the GeoMedellin catalogue record "Camaras CCTV (SIMM)" says "CC BY SA https://creativecommons.org/licenses/by-sa/4.0/deed.es"; joint circular
// 202660000054 of 2026 puts all GeoMedellin data under Creative Commons. ShareAlike: our own file of these points carries the attribution sentence and the same licence.
// No separate picture terms were found, so image permission stays unverified and nothing from the picture is fetched, stored or shown. The record is re-read in code before every run.
// Beats Argos by: every SIMM traffic-control camera of Medellin named by its place and street corner, from the city's own CC BY SA list whose licence record is re-read in code before every run, one link to the camera's own picture address.
import { robotsAllows, pageText } from './iceland.mjs';
export { robotsAllows, pageText }; // one robots.txt reader and one page-text reader

export const BOUNDS = { latMin: 6.1, latMax: 6.4, lonMin: -75.7, lonMax: -75.45 }; // Medellin plus a margin; sanity box only
export const FEED_URL = 'https://www.medellin.gov.co/servidormapas/rest/services/transporte/VC_Infraest_Gestion_Transito/MapServer/2/query?where=1=1&outFields=*&outSR=4326&f=geojson';
export const ROBOTS_URL = 'https://www.medellin.gov.co/robots.txt';
export const RECORD_URL = 'https://www.medellin.gov.co/giscatalogacion/srv/api/records/01af3090-cc7f-4f85-9a34-92a59b001a72'; // the human page of the licence record
export const TERMS_URL = RECORD_URL + '/formatters/xml'; // the same record as XML: the one we re-read (the HTML page needs a browser-like agent)
// Must still be in the record text (read 2026-11-25, tags removed, spaces collapsed): its title and its licence sentence.
export const LICENCE_PHRASES = ['Cámaras CCTV (SIMM)', 'CC BY SA https://creativecommons.org/licenses/by-sa/4.0/deed.es'];
export const ATTRIBUTION = 'Source: Distrito Especial de Ciencia, Tecnología e Innovación de Medellín, GeoMedellín (Departamento Administrativo de Planeación), Cámaras CCTV (SIMM), CC BY-SA 4.0. Our list of these points is shared under the same licence.';
// the link-out target must be the city's own picture address with a camera number
export const LINK_RE = /^https:\/\/www\.medellin\.gov\.co\/simm\/camaras-cctv\/imagen(\d{1,5})\.jpg$/;
export const MEDELLIN_REGION = { slug: 'medellin', name: 'Medellín' };
export const MEDELLIN_COUNTRY = { countryCode: 'CO', countrySlug: 'colombia', countryName: 'Colombia' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : typeof v === 'number' ? String(v) : '');

// GeoJSON text -> array of { id, address, place, link, lon, lat } (raw values, nothing validated). Throws when the body is not the camera list (HTML error page, ArcGIS error JSON, cut-off body).
export function parseFeed(body) {
  let j;
  try { j = JSON.parse(body); } catch (e) { throw new Error(`not the camera list (not JSON: ${e.message})`); }
  if (!j || typeof j !== 'object' || Array.isArray(j) || j.error) throw new Error('not the camera list (error object)');
  if (j.type !== 'FeatureCollection' || !Array.isArray(j.features)) throw new Error('not the camera list (no FeatureCollection)');
  if (j.exceededTransferLimit) throw new Error('camera list incomplete (exceededTransferLimit)');
  return j.features.map((f) => {
    const p = (f && f.properties) || {}, c = f && f.geometry && f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : [];
    return { id: p.objectid, address: p.direccion, place: p.localizacion, link: p.link_foto, lon: typeof c[0] === 'number' ? c[0] : NaN, lat: typeof c[1] === 'number' ? c[1] : NaN };
  });
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated camera number.
export function normalizeMedellin(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const lm = LINK_RE.exec(s(r.link));
  if (!lm) return bump('noUrl'); // no picture address, the bare imagen.jpg, a foreign host or http
  const num = Number(lm[1]);
  // the place name may be written twice on two lines ("Avenida Paralela\r\nAvenida Paralela"): collapse a repeated half
  let place = s(r.place);
  const h = place.length / 2;
  if (place.length > 2 && place.slice(0, Math.floor(h)).trim() === place.slice(Math.ceil(h)).trim()) place = place.slice(0, Math.floor(h)).trim();
  const address = s(r.address);
  const name = place && address && place !== address ? `${place} (${address})` : place || address;
  if (!name) return bump('noName');
  const lat = r.lat, lon = r.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const id = `medellin-simm-cameras-${num}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  return {
    id,
    sourceId: 'medellin-simm-cameras',
    name,
    road: '',
    direction: '',
    city: null, // places are neighbourhoods, not cities: one region page, no city pages (a city page would repeat the region page)
    regionSlug: MEDELLIN_REGION.slug,
    regionName: MEDELLIN_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: s(r.link),
    officialUrlLastVerified: null,
    lastSeen,
  };
}
