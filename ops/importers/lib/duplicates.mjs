// Cross-source duplicate MARKING (plan item 28 stage 5). Never deletes: it only reports camera pairs from DIFFERENT sources
// that sit within `metres` of each other. A pair is a suspect, not a verdict: two cameras on opposite carriageways can be 10 m apart.
const R = 6371000, rad = (d) => (d * Math.PI) / 180;
export const metres = (a, b) => { const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

export function findSuspects(cams, metresMax = 30) {
  const cell = (c) => `${Math.floor(c.lat * 400)}:${Math.floor(c.lon * 400)}`; // about 280 m cells, so neighbours are within one cell step
  const grid = new Map();
  for (const c of cams) { if (typeof c.lat !== 'number' || typeof c.lon !== 'number') continue; const k = cell(c); (grid.get(k) || grid.set(k, []).get(k)).push(c); }
  const out = [];
  for (const c of cams) {
    if (typeof c.lat !== 'number' || typeof c.lon !== 'number') continue;
    const [y, x] = cell(c).split(':').map(Number);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const o of grid.get(`${y + dy}:${x + dx}`) || []) {
      if (o.sourceId === c.sourceId || o.id <= c.id) continue; // different source, each pair once
      const m = metres(c, o);
      if (m <= metresMax) out.push({ a: c.id, b: o.id, metres: Math.round(m * 10) / 10 });
    }
  }
  return out;
}
