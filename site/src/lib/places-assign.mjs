// Cameras from lists with no city field get the nearest Natural Earth place (data/places.json, the gazetteer site search uses) within ASSIGN_KM,
// and Washington/Oregon cameras get their road from the camera name / ODOT route text. Pure; applied once in data.mjs so every page and the search agree.
// Beats Argos by: Seattle, Portland, Atlanta and the rest get real city pages built from the agencies' own camera positions, with the method stated on the page.
import { distKm } from './geo.mjs';

export const CITY_FROM_PLACES = ['washington-state', 'oregon', 'georgia', 'iowa', 'maryland', 'delaware', 'texas-highways'];
export const ROAD_FROM_NAME = { 'washington-state': (c) => c.name, oregon: (c) => String(c.locationText || '').replace(/^Route:\s*/i, '') };
export const ASSIGN_KM = 15;
// The Natural Earth admin-1 name (adm1name in data/places.json) each region's cameras must share: a camera is never filed under a town across a state line.
export const REGION_ADM1 = { 'washington-state': 'Washington', oregon: 'Oregon', georgia: 'Georgia', iowa: 'Iowa', maryland: 'Maryland', delaware: 'Delaware', 'texas-highways': 'Texas' };

// 'SR 520 @ MP 3' -> 'SR-520' (the Caltrans spelling, so one road slug across states). Not an I/SR/US route -> ''.
export const roadOf = (s) => { const m = String(s || '').trim().match(/^(I|SR|US)[\s-]*0*(\d{1,3})\b/i); return m ? `${m[1].toUpperCase()}-${m[2]}` : ''; };

// State routes and 3-digit interstate spurs are different roads in each state (WA SR-99 is not California SR-99; WA I-405 is not LA's I-405),
// so they get the state prefix; 2-digit interstates and US routes run through (I-5, US-101, US-395) and keep one spelling.
const PREFIX = { 'washington-state': 'WA', oregon: 'OR' };
export const statePrefix = (region, r) => (r && /^(SR-|I-\d{3}$)/.test(r) ? `${PREFIX[region]} ${r}` : r);

export function enrich(cams, places, km = ASSIGN_KM) {
  const want = new Set(CITY_FROM_PLACES);
  const grid = new Map(), cell = (lat, lon) => `${Math.floor(lat)}:${Math.floor(lon)}`;
  for (const p of places) { const k = cell(p[1], p[2]); (grid.get(k) || grid.set(k, []).get(k)).push(p); }
  const nearest = (lat, lon, adm1) => {
    let best = null, bd = km;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const p of grid.get(cell(lat + dy, lon + dx)) || []) {
      if (p[3] !== adm1 || p[4] !== 'US') continue; // places with no admin-1 match are never used
      const d = distKm(lat, lon, p[1], p[2]);
      if (d <= bd) { bd = d; best = p[0]; }
    } // ponytail: 1-degree cells, so ASSIGN_KM must stay well under ~50 km
    return best;
  };
  return cams.map((c) => {
    if (!want.has(c.regionSlug)) return c;
    const out = { ...c };
    if (!out.city && Number.isFinite(c.lat) && Number.isFinite(c.lon)) out.city = nearest(c.lat, c.lon, REGION_ADM1[c.regionSlug]);
    if (!out.road && ROAD_FROM_NAME[c.regionSlug]) out.road = statePrefix(c.regionSlug, roadOf(ROAD_FROM_NAME[c.regionSlug](c)));
    return out;
  });
}
