// /map/?lat=&lon=&z= helpers. Pure, browser-safe. Beats Argos by: a search result for a town with no page opens the map at that position, and with no map
// engine deployed the page still names the position and the nearest city and road pages (Argos has no such fallback list).
import { distKm } from './geo.mjs';

// Strictly validated: anything not a plain number in range returns null (never passed on to the embed).
export function parseMapParams(search) {
  const q = new URLSearchParams(search), num = (k) => (/^-?\d{1,3}(\.\d{1,6})?$/.test(q.get(k) ?? '') ? Number(q.get(k)) : NaN);
  const lat = num('lat'), lon = num('lon'), z = q.has('z') ? num('z') : 11;
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180) || !(z >= 1 && z <= 20)) return null;
  return { lat, lon, z: Math.round(z) };
}

// Camera altitude in metres for a web-map zoom: a 1,000 px wide view at zoom z spans about 1000 * 156543 * cos(lat) / 2^z metres; with a 60 degree
// field of view the camera stands half that width / tan(30 degrees) up. APPROXIMATION, not checked in the GEV viewer (only the hash FORMAT is verified).
export const altFromZoom = (lat, z) => Math.max(200, Math.round(((1000 * 156543 * Math.cos(lat * Math.PI / 180)) / 2 ** z / 2) / Math.tan(Math.PI / 6)));

// The GEV share-hash form, verified in gev/scripts/qa-stories.mjs ('v=2&lat=20&lon=10&alt=2500000&...') and gev/src/share/viewCodec.js (fields lat, lon, alt).
export const gevHash = ({ lat, lon, z }) => `#v=2&lat=${lat}&lon=${lon}&alt=${altFromZoom(lat, z)}`;

// items = [[name, url, lat, lon, kindLabel]]; the n closest to p, nearest first (ties by name).
export const nearest = (items, p, n = 3) => items.map((i) => ({ i, km: distKm(p.lat, p.lon, i[2], i[3]) })).sort((a, b) => a.km - b.km || (a.i[0] < b.i[0] ? -1 : 1)).slice(0, n);
