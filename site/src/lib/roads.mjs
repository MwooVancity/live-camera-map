// Road (corridor) page helpers. Pure functions, no Astro, no network.
// Beats Argos by: a driver sees every camera on a road in driving order, with the closures, signs and chain controls
// between them each linked to their nearest cameras; Argos lists cameras by city only.
//
// WHY THE ORDER IS GEOMETRIC (checked on the real Caltrans files, 2026-11-22, see docs/decisions/review-2026-11-22-chatgpt-vs-argos.md and plan.md section 6): `postmile` restarts at every
// county line, and `milepost` is not one continuous scale across districts (on I-5 northbound the milepost of an Orange
// County camera is lower than a Los Angeles camera that is further south of it), so neither is a reliable sort key.
// We order by projecting each camera onto the road's main axis (line of best fit through all its cameras).
import { distKm } from './live.mjs';

const KM_PER_DEG_LAT = 110.57, KM_PER_DEG_LON_EQ = 111.32;
const COMPASS = { North: [0, 1], South: [0, -1], East: [1, 0], West: [-1, 0] };
const ORDER = ['North', 'South', 'East', 'West'];

// Main axis of a set of cameras: a unit vector in local km (x east, y north), pointing north (or east when the road
// runs more east-west than north-south), plus a projector from any lat/lon to its distance along that axis.
export function roadAxis(cams) {
  const lat0 = cams.reduce((s, c) => s + c.lat, 0) / cams.length, lon0 = cams.reduce((s, c) => s + c.lon, 0) / cams.length;
  const kx = KM_PER_DEG_LON_EQ * Math.cos(lat0 * Math.PI / 180);
  const xy = (lat, lon) => [(lon - lon0) * kx, (lat - lat0) * KM_PER_DEG_LAT];
  let sxx = 0, syy = 0, sxy = 0;
  for (const c of cams) { const [x, y] = xy(c.lat, c.lon); sxx += x * x; syy += y * y; sxy += x * y; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let ax = Math.cos(th), ay = Math.sin(th);
  if (Math.abs(ay) >= Math.abs(ax) ? ay < 0 : ax < 0) { ax = -ax; ay = -ay; }
  return { ax, ay, along: (item) => { const [x, y] = xy(item.lat, item.lon); return x * ax + y * ay; }, northish: Math.abs(ay) >= Math.abs(ax) };
}

// Cameras of ONE road in driving order per recorded direction. Returns
// { northish, groups: [{ direction, label, cams: [{ camera, along }], gap: { km, from, to } | null }] }.
// A North/East group runs along the axis, South/West against it; a direction that does not line up with the axis, and
// cameras with no direction ('' or 'Median'), run along the axis. `gap` = largest straight-line km between neighbours.
export function orderAlongRoad(cams) {
  if (!cams.length) return { northish: true, groups: [] };
  const axis = roadAxis(cams);
  const dirs = [...new Set(cams.map((c) => c.direction || ''))]
    .sort((a, b) => (ORDER.indexOf(a) < 0 ? 9 : ORDER.indexOf(a)) - (ORDER.indexOf(b) < 0 ? 9 : ORDER.indexOf(b)) || a.localeCompare(b));
  const groups = dirs.map((direction) => {
    const v = COMPASS[direction];
    const sign = v ? Math.sign(v[0] * axis.ax + v[1] * axis.ay) || 1 : 1;
    const list = cams.filter((c) => (c.direction || '') === direction)
      .map((camera) => ({ camera, along: sign * axis.along(camera) }))
      .sort((a, b) => a.along - b.along || a.camera.id.localeCompare(b.camera.id));
    let gap = null;
    for (let i = 1; i < list.length; i++) {
      const km = distKm(list[i - 1].camera.lat, list[i - 1].camera.lon, list[i].camera.lat, list[i].camera.lon);
      if (!gap || km > gap.km) gap = { km, from: list[i - 1].camera, to: list[i].camera };
    }
    const label = v ? `${direction}bound` : direction === 'Median' ? 'Median' : 'Direction not recorded';
    return { direction, label, cams: list, gap };
  });
  return { northish: axis.northish, groups, along: axis.along };
}

// Roads related to `road`: curated roads that share a curated city with it (most shared first), then the roads whose
// cameras are closest to it. `byRoad` = Map road -> its cameras; `cityOf` = Map road -> Set of curated cities it passes.
export function relatedRoads(road, roads, byRoad, cityOf, limit = 4) {
  const mine = byRoad.get(road);
  const rows = roads.filter((r) => r !== road).map((r) => {
    const shared = [...cityOf.get(r)].filter((c) => cityOf.get(road).has(c)).length;
    let km = Infinity;
    for (const a of mine) for (const b of byRoad.get(r)) km = Math.min(km, distKm(a.lat, a.lon, b.lat, b.lon));
    return { road: r, shared, km };
  });
  return rows.sort((a, b) => b.shared - a.shared || a.km - b.km || a.road.localeCompare(b.road)).slice(0, limit);
}

// The k curated cities closest to the road (km from the city's camera centre to the road's nearest camera).
export function nearestCities(roadCams, cityCentres, k = 2) {
  return cityCentres.map((c) => ({ city: c.city, km: Math.min(...roadCams.map((r) => distKm(c.lat, c.lon, r.lat, r.lon))) }))
    .sort((a, b) => a.km - b.km || a.city.localeCompare(b.city)).slice(0, k);
}
