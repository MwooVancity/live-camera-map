// Pure helpers for the live-conditions feeds (Caltrans CWWP lcs/cc/cms/rwis, NWS). No network here.
// Beats Argos by: every road closure, chain control, sign and road-weather reading carries its own source and
// timestamp and hides itself when stale; one function (usableItems) decides what a page block may show.
import { CA_BOUNDS } from './registry.mjs';

export const UA = 'NearbyCams-build'; // generic on purpose: no email, no name
// Max age per block, plan.md section 12.
export const MAX_AGE_MIN = { lcs: 15, cc: 15, cms: 15, rwis: 60, 'nws-forecast': 180, 'nws-alerts': 180, 'bc-events': 15 };
// Licence row (data/source-permissions.json) that must be enabled before a feed is fetched or shown.
export const SOURCE_IDS = { lcs: 'caltrans-lcs', cc: 'caltrans-cc', cms: 'caltrans-cms', rwis: 'caltrans-rwis', 'nws-forecast': 'nws-forecast', 'nws-alerts': 'nws-alerts', 'bc-events': 'drivebc-events' };

// true only for a parseable timestamp that is not older than maxAgeMin and not more than 5 min in the future.
export function isFresh(generatedAt, maxAgeMin, now = new Date()) {
  const t = Date.parse(generatedAt);
  if (Number.isNaN(t) || !(maxAgeMin > 0)) return false;
  const ageMin = (new Date(now).getTime() - t) / 60000;
  return ageMin >= -5 && ageMin <= maxAgeMin;
}

// The one gate for page blocks: a feed document -> items, or [] when the shape is wrong or the data is stale.
export function usableItems(doc, feed, now = new Date()) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.items) || typeof doc.generatedAt !== 'string') return [];
  return isFresh(doc.generatedAt, MAX_AGE_MIN[feed], now) ? doc.items : [];
}

// NWS city file -> { periods, alerts }; each side [] when the shape is wrong or its own max age is exceeded.
export function usableNws(doc, now = new Date()) {
  const f = doc && doc.forecast, a = doc && doc.alerts;
  return {
    periods: f && Array.isArray(f.periods) && isFresh(f.fetchedAt, MAX_AGE_MIN['nws-forecast'], now) ? f.periods : [],
    alerts: a && Array.isArray(a.items) && isFresh(a.fetchedAt, MAX_AGE_MIN['nws-alerts'], now) ? a.items : [],
  };
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');
// Caltrans writes "Not Reported" or "" for nothing.
const nr = (v) => { const t = str(v); return t === '' || /^not reported$/i.test(t) ? null : t; };
const num = (v, errVal) => { const t = nr(v); if (t === null) return null; const n = Number(t); return Number.isFinite(n) && n !== errVal ? n : null; };
const iso = (epoch) => { const n = Number(epoch); return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : null; };
const local = (d, t) => (nr(d) && nr(t) ? `${str(d)} ${str(t)}` : null); // Pacific local time, no zone given by Caltrans
const inCA = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= CA_BOUNDS.latMin && lat <= CA_BOUNDS.latMax && lon >= CA_BOUNDS.lonMin && lon <= CA_BOUNDS.lonMax;
const coords = (a, b) => (nr(a) && nr(b) ? [Number(a), Number(b)] : [NaN, NaN]);
const pad = (nn) => String(nn).padStart(2, '0');

// Shared head for cc/cms/rwis records: location block. Returns [fields, null] or [null, dropReason].
function place(c, nn, feed) {
  const L = c && c.location;
  if (!L || !nr(c.index)) return [null, 'malformed'];
  if (String(c.inService).toLowerCase() !== 'true') return [null, 'notInService'];
  const [lat, lon] = coords(L.latitude, L.longitude);
  if (!inCA(lat, lon)) return [null, 'badCoords'];
  return [{
    id: `ca-${feed}-d${pad(nn)}-${str(c.index)}`, district: pad(nn), road: str(L.route) + str(L.routeSuffix),
    direction: nr(L.direction), place: nr(L.nearbyPlace), county: nr(L.county), locationName: nr(L.locationName), lat, lon,
  }, null];
}

export function parseLcs(raw, nn, now, drop) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  const c = raw && raw.lcs, b = c && c.location && c.location.begin, e = (c && c.location && c.location.end) || {}, z = c && c.closure;
  if (!c || !b || !z || !nr(c.index)) return bump('malformed');
  const [lat, lon] = coords(b.beginLatitude, b.beginLongitude);
  if (!inCA(lat, lon)) return bump('badCoords');
  const [elat, elon] = coords(e.endLatitude, e.endLongitude);
  const T = z.closureTimestamp || {};
  const start = iso(T.closureStartEpoch), end = iso(T.closureEndEpoch), indefinite = String(T.isClosureEndIndefinite).toLowerCase() === 'true';
  const t = new Date(now).getTime();
  const lanes = nr(z.lanesClosed);
  return {
    id: `ca-lcs-d${pad(nn)}-${str(c.index)}`, district: pad(nn), road: str(b.beginRoute) + str(b.beginRouteSuffix),
    direction: nr(c.location.travelFlowDirection), place: nr(b.beginNearbyPlace), county: nr(b.beginCounty),
    locationName: nr(b.beginLocationName), endLocationName: nr(e.endLocationName), lat, lon,
    endLat: inCA(elat, elon) ? elat : null, endLon: inCA(elat, elon) ? elon : null,
    typeOfClosure: nr(z.typeOfClosure), facility: nr(z.facility), typeOfWork: nr(z.typeOfWork), lanesClosed: lanes,
    totalLanes: num(z.totalExistingLanes), estimatedDelay: nr(z.estimatedDelay),
    text: [nr(z.typeOfClosure) && `${str(z.typeOfClosure)} closure`, lanes && `lanes ${lanes} closed`, nr(z.typeOfWork)].filter(Boolean).join('; '),
    start, end, endIndefinite: indefinite,
    active: Boolean(start) && Date.parse(start) <= t && (indefinite || (Boolean(end) && Date.parse(end) >= t)),
  };
}

export function parseCc(raw, nn, now, drop) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  const c = raw && raw.cc;
  const [p, why] = place(c, nn, 'cc');
  if (why) return bump(why);
  const S = c.statusData || {};
  const status = nr(S.status);
  if (!status) return bump('noStatus');
  return { ...p, status, inEffect: status !== 'R-0', text: nr(S.statusDescription), statusLocal: local(S.statusTimestamp && S.statusTimestamp.statusDate, S.statusTimestamp && S.statusTimestamp.statusTime) };
}

export function parseCms(raw, nn, now, drop) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  const c = raw && raw.cms;
  const [p, why] = place(c, nn, 'cms');
  if (why) return bump(why);
  const M = c.message || {};
  const lines = (ph, k) => [1, 2, 3].map((i) => nr(ph && ph[`${k}Line${i}`])).filter(Boolean);
  const ph1 = lines(M.phase1, 'phase1'), ph2 = lines(M.phase2, 'phase2');
  if (!ph1.length && !ph2.length) return bump('blankSign'); // a blank sign is not a message
  return { ...p, phase1: ph1, phase2: ph2, text: [ph1.join(' / '), ph2.join(' / ')].filter(Boolean).join(' | '), messageLocal: local(M.messageTimestamp && M.messageTimestamp.messageDate, M.messageTimestamp && M.messageTimestamp.messageTime) };
}

export const RWIS_MAX_AGE_MS = MAX_AGE_MIN.rwis * 60000;
export function parseRwis(raw, nn, now, drop) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  const c = raw && raw.rwis;
  const [p, why] = place(c, nn, 'rwis');
  if (why) return bump(why);
  const recordedAt = iso(c.recordTimestamp && c.recordTimestamp.recordEpoch);
  if (!recordedAt || new Date(now).getTime() - Date.parse(recordedAt) > RWIS_MAX_AGE_MS) return bump('stale'); // a station that stopped reporting is hidden
  const D = c.rwisData || {}, W = D.windData || {}, T = D.temperatureData || {}, V = D.visibilityData || {}, H = D.humidityPrecipData || {};
  const first = (arr, k1, k2) => (Array.isArray(arr) && arr[0] && arr[0][k1] ? arr[0][k1][k2] : undefined);
  // Units are NOT stated in the CWWP field description: values are kept as reported, never labelled.
  const r = {
    airTemp: num(first(T.essTemperatureSensorTable, 'essTemperatureSensorEntry', 'essAirTemperature'), 1001),
    surfaceTemp: num(first(D.pavementSensorData && D.pavementSensorData.essPavementSensorTable, 'essPavementSensorEntry', 'essSurfaceTemperature'), 1001),
    windAvg: num(W.essAvgWindSpeed, 65535), windGust: num(W.essMaxWindGustSpeed, 65535), windDir: num(W.essAvgWindDirection, 361),
    visibility: num(V.essVisibility, 1000001), humidity: num(H.essRelativeHumidity, 101),
  };
  if (Object.values(r).every((v) => v === null)) return bump('noReadings');
  return { ...p, recordedAt, ...r };
}

export const FEEDS = {
  lcs: { parse: parseLcs, file: (nn) => `lcs/lcsStatusD${pad(nn)}.json` },
  cc: { parse: parseCc, file: (nn) => `cc/ccStatusD${pad(nn)}.json` },
  cms: { parse: parseCms, file: (nn) => `cms/cmsStatusD${pad(nn)}.json` },
  rwis: { parse: parseRwis, file: (nn) => `rwis/rwisStatusD${pad(nn)}.json` },
};
// Unpadded district in the folder, padded in the file name.
export const feedUrl = (feed, nn) => `https://cwwp2.dot.ca.gov/data/d${Number(nn)}/${FEEDS[feed].file(nn)}`;
export const DISTRICTS = Array.from({ length: 12 }, (_, i) => pad(i + 1));
