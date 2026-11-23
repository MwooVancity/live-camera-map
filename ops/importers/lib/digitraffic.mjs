// Pure helpers for Finland (Fintraffic Digitraffic weather cameras). No network here.
// Feed: https://tie.digitraffic.fi/api/weathercam/v1/stations (GeoJSON, needs Accept-Encoding gzip; 406 without it).
// Licence: CC 4.0 BY, read on https://www.digitraffic.fi/en/terms-of-service/ (the importer re-checks that sentence every run).
// Camera pictures are NEVER fetched, stored or shown: the picture address is only the link-out target (officialUrl).
// Beats Argos by: every Finnish station is a licensed-list record with the licence sentence checked in code before every run,
// the place only where the station's own name gives one, and the same link check as the other countries.
export const FI_BOUNDS = { latMin: 59.4, latMax: 70.2, lonMin: 19.0, lonMax: 31.7 }; // Finland incl. Aland; sanity box only
export const STATIONS_URL = 'https://tie.digitraffic.fi/api/weathercam/v1/stations';
export const TERMS_URL = 'https://www.digitraffic.fi/en/terms-of-service/';
export const IMAGE_HOST = 'https://weathercam.digitraffic.fi/';
// Both phrases must still be on the terms page; if either goes missing the importer stops.
export const LICENCE_PHRASES = ['Creative Commons 4.0 By', 'even commercially'];
export const FI_HEADERS = { 'Accept-Encoding': 'gzip', 'Digitraffic-User': 'NearbyCams-build' }; // gzip is mandatory for the API; the user header is Digitraffic's own request, no personal data

const s = (v) => (typeof v === 'string' ? v.trim() : '');
// Station names look like "kt51_Inkoo" or "vt2_Karkkila_Korpi": a road code, then a place name, then maybe a spot.
const NAME = /^(kt|vt|st|mt|yt)(\d{1,5})_([\p{L}][\p{L}' -]{1,40})(?:_|$)/iu;
export const parseName = (name) => {
  const m = s(name).match(NAME);
  if (!m) return { road: '', city: null };
  const place = m[3].trim();
  return { road: `${m[1].toLowerCase()}${m[2]}`, city: place.charAt(0).toUpperCase() + place.slice(1) };
};

// Returns a camera or null; drop reasons are counted into `drop`.
export function normalizeStation(f, lastSeen, drop = {}) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  const p = f && f.properties;
  if (!p || typeof p !== 'object' || !f.geometry) return bump('malformed');
  const id = s(p.id), name = s(p.name);
  if (!/^C\d{5}$/.test(id) || !name) return bump('noIdOrName');
  if (/^test/i.test(name)) return bump('testStation');
  if (p.collectionStatus !== 'GATHERING') return bump('notGathering');
  const c = f.geometry.coordinates;
  if (f.geometry.type !== 'Point' || !Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return bump('badCoords');
  const [lon, lat] = c;
  if (lat < FI_BOUNDS.latMin || lat > FI_BOUNDS.latMax || lon < FI_BOUNDS.lonMin || lon > FI_BOUNDS.lonMax) return bump('outOfBounds');
  const preset = (Array.isArray(p.presets) ? p.presets : []).find((x) => x && x.inCollection === true && new RegExp(`^${id}\\d\\d$`).test(s(x.id)));
  if (!preset) return bump('noPreset'); // the picture address is built from a preset id (Digitraffic docs): no preset, no link
  const { road, city } = parseName(name);
  return {
    id: `digitraffic-${id}`,
    sourceId: 'digitraffic',
    name,
    road,
    direction: '', // the feed has no direction field
    city,
    regionSlug: 'finland',
    regionName: 'Finland',
    lat, lon,
    feedType: 'still',
    officialUrl: `${IMAGE_HOST}${s(preset.id)}.jpg`, // link-out target only
    officialUrlLastVerified: null,
    lastSeen,
  };
}
