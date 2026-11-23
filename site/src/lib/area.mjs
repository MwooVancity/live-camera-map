// "Greater <city>" coverage. ONE function (greaterArea) computes every number the block shows. Pure, no network.
// Beats Argos by: a city page says both how many cameras carry the city's own name and how many are within a stated radius,
// grouped by town, with the definition of "near" printed, so the two numbers can never contradict.
import { distKm } from './live.mjs';

export const GREATER_KM = 30; // the only place the radius is set

export const centreOf = (list) => ({ lat: list.reduce((s, c) => s + c.lat, 0) / list.length, lon: list.reduce((s, c) => s + c.lon, 0) / list.length });

// regionCams = the cameras of ONE region (so a town name in two regions never merges). exact = cameras whose town is `city`.
// within = exact cameras plus every other camera of the region within km of the centre of the exact cameras, so within >= exact always.
// towns = other named towns (count, roads), noTown = cameras with no named place, unnamed = those cameras nearest first (for links).
export function greaterArea(regionCams, city, km = GREATER_KM) {
  const exact = regionCams.filter((c) => c.city === city);
  if (!exact.length) return null;
  const centre = centreOf(exact);
  const others = regionCams.filter((c) => c.city !== city && Number.isFinite(c.lat) && Number.isFinite(c.lon))
    .map((camera) => ({ camera, km: distKm(centre.lat, centre.lon, camera.lat, camera.lon) })).filter((x) => x.km <= km)
    .sort((a, b) => a.km - b.km || a.camera.id.localeCompare(b.camera.id));
  const by = new Map();
  for (const { camera } of others.filter((x) => x.camera.city)) {
    const e = by.get(camera.city) || { town: camera.city, n: 0, roads: new Set() };
    e.n++; if (camera.road) e.roads.add(camera.road);
    by.set(camera.city, e);
  }
  const towns = [...by.values()].map((e) => ({ town: e.town, n: e.n, roads: [...e.roads].sort() })).sort((a, b) => b.n - a.n || a.town.localeCompare(b.town));
  const unnamed = others.filter((x) => !x.camera.city);
  return { km, centre, exact: exact.length, within: exact.length + others.length, towns, noTown: unnamed.length, unnamed };
}
