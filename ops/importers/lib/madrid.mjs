// Pure helpers for Madrid (Ayuntamiento de Madrid, open data dataset 202088-0 "Tráfico. Cámaras": the city's fixed traffic cameras, KML). No network here.
// Feed: one KML file, one <Placemark> per camera: ExtendedData Numero ("06303"), Nombre ("PLAZA DE CASTILLA (NORTE)"), Point coordinates "lon,lat,alt", and a description whose <img src> is the picture address
// https://informo.madrid.es/cameras/Camara<Numero>.jpg?v=<n>. We keep ONLY the link to that still picture (without the ?v= cache number), never the picture.
// The KML request on datos.madrid.es answers 301 to https://informo.madrid.es/informo/tmadrid/CCTV.kml, so the importer reads that one file from informo.madrid.es (robots.txt read for both hosts); it never requests a picture.
// Beats Argos by: every camera the City lists, named as the City names it with its 5-digit camera number, from a list whose CC BY 4.0 dataset licence, the commercial-reuse grant and the City's "not for pictures" warning are re-read in code before every run, and a real per-picture status check.
import { robotsAllows } from './iceland.mjs';
export { robotsAllows };

export const BOUNDS = { latMin: 40.2, latMax: 40.7, lonMin: -3.95, lonMax: -3.4 }; // the city of Madrid plus a margin (the 357 points span 40.33-40.52 N, 3.78-3.55 W); sanity box only
export const FEED_URL = 'https://datos.madrid.es/egob/catalogo/202088-0-trafico-camaras.kml'; // answers 301 to KML_FINAL_URL
export const KML_FINAL_URL = 'https://informo.madrid.es/informo/tmadrid/CCTV.kml';
export const ROBOTS_URL = 'https://datos.madrid.es/robots.txt'; // read 2026-11-24: Crawl-delay 10; Disallow /api/, /datastore/, /dataset/*/resource/*/download, /dataset?...; /egob/catalogo/, /dataset/<id> and /pages/ are not listed
export const INFORMO_ROBOTS_URL = 'https://informo.madrid.es/robots.txt'; // read 2026-11-24: 404 NoSuchKey (no rules)
export const PAGE_URL = 'https://datos.madrid.es/dataset/202088-0-trafico-camaras';
export const TERMS_URL = 'https://datos.madrid.es/pages/condiciones-generales-ayuntamiento-de-madrid';
export const LEGAL_URL = 'https://datos.madrid.es/pages/aviso-legal';
export const CRAWL_DELAY_MS = 10000; // robots.txt Crawl-delay: 10, applied between our requests to datos.madrid.es
// Each page's phrases must still be in its text (read 2026-11-24, tags removed, entities decoded, spaces collapsed).
export const DATASET_PHRASES = ['Licencia Creative Commons Attribution 4.0 International (CC BY 4.0)', 'Información relativa a las cámaras fijas de tráfico instaladas en la ciudad de Madrid'];
export const TERMS_PHRASES = [
  'permiten la reutilización de los documentos y datos sometidos a ellas para fines comerciales y no comerciales',
  'Debe citarse la fuente de los documentos objeto de la reutilización',
  'No se podrá indicar, insinuar o sugerir que el Ayuntamiento de Madrid participa, patrocina o apoya la reutilización',
];
export const LEGAL_PHRASES = ['Este criterio de reutilización no se aplica, salvo que expresamente se establezca lo contrario, ni a imágenes, vídeos u otros contenidos multimedia'];
export const ATTRIBUTION = 'Origen de los datos: Ayuntamiento de Madrid, Tráfico. Cámaras (datos.madrid.es), CC BY 4.0.';
// the link-out target must be the City's own picture path; the cache number after ? is dropped
export const IMAGE_RE = /^https:\/\/informo\.madrid\.es\/cameras\/Camara(\d{5})\.jpg(?:\?v=\d{1,9})?$/;
export const MADRID_REGION = { slug: 'madrid', name: 'Madrid' };
export const MADRID_COUNTRY = { countryCode: 'ES', countrySlug: 'spain', countryName: 'Spain' };

const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ' };
export const decode = (v) => String(v).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] ?? m;
});
const s = (v) => (typeof v === 'string' ? decode(v).trim().replace(/\s+/g, ' ') : '');
// page HTML -> plain text, so a phrase split by a tag, a line break or a numeric entity is still found
export const pageText = (html) => decode(String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

// KML text -> array of placemark texts. Throws when the body is not the camera list (HTML, an error body, a cut-off body).
export function parseFeed(body) {
  if (typeof body !== 'string' || !/<kml[\s>]/i.test(body)) throw new Error('not the camera list (no KML)');
  if (!/<\/kml>\s*$/i.test(body)) throw new Error('camera list cut off (no closing kml tag)');
  return body.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
}

const field = (p, name) => (new RegExp(`<Data name="${name}">\\s*<Value>([\\s\\S]*?)</Value>`).exec(p) || [])[1];

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated Numero.
export function normalizeMadrid(p, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (typeof p !== 'string') return bump('malformed');
  const num = s(field(p, 'Numero'));
  if (!/^\d{5}$/.test(num)) return bump('noNumero');
  const desc = decode((/<description>([\s\S]*?)<\/description>/.exec(p) || [])[1] || '');
  const img = /<img\s+src=["']?([^\s"'>]+)/i.exec(desc);
  const m = img ? IMAGE_RE.exec(img[1]) : null;
  if (!m || m[1] !== num) return bump('noUrl'); // not https, not informo.madrid.es/cameras, or a picture of another camera
  const name = s(field(p, 'Nombre'));
  if (!name) return bump('noName');
  const c = /<coordinates>\s*([^<]*?)\s*<\/coordinates>/.exec(p);
  const parts = c ? c[1].split(',') : [];
  const [lon, lat] = parts.slice(0, 2).map((x) => (/^-?\d+(\.\d+)?$/.test(x.trim()) ? Number(x) : NaN));
  if (parts.length < 2 || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const id = `madrid-camaras-${num}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  return {
    id, sourceId: 'madrid-camaras', name, road: '', direction: '', city: null, // the list has no city or road field
    regionSlug: MADRID_REGION.slug, regionName: MADRID_REGION.name,
    lat, lon, feedType: 'still',
    officialUrl: `https://informo.madrid.es/cameras/Camara${num}.jpg`,
    officialUrlLastVerified: null, lastSeen,
    locationText: `Ayuntamiento de Madrid camera ${num}, city of Madrid.`,
  };
}
