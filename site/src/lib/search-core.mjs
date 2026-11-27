// Search core: ONE file shared by the build (index names) and the browser (query). Pure: no DOM, no Node APIs, no network
// unless a fetch function is passed in, and then only after focus() is called.
// Beats Argos by: a place, a road alias ("I 405", "Interstate 405") or a town with no page finds the right page or map position
// from a prebuilt static index loaded on first focus, and every result names its kind, region AND country, so two towns with one name are never confused.
// NOT supported (stated, tested): typo tolerance ("Sacremento" finds nothing). Accents are stripped; letters like the German sharp s or the Danish o-slash do not decompose and are kept as is.
export const MAX_RESULTS = 10;
export const KIND_RANK = { city: 1, town: 2, road: 3, region: 4, country: 5, camera: 6 }; // exact name always first, then this order
export const KIND_LABEL = { city: 'City', town: 'Place', road: 'Road', region: 'Region', country: 'Country', camera: 'Camera' };
// Row layout (compact arrays, one per entry). A shard has its country in its header; a global-lookup row carries it at index 9.
export const F = { id: 0, kind: 1, name: 2, norm: 3, region: 4, road: 5, lat: 6, lon: 7, url: 8, country: 9 };

export const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9㐀-鿿]+/g, ' ').trim(); // Chinese characters are kept so a Taiwan camera name (all Chinese, no Latin letters) still has an index key; every other script is dropped as before

// The ONE road alias function. Input: a normalized query. Output: canonical road keys, e.g. 'interstate 405' -> ['i 405'], 'highway 1' -> ['sr 1', 'us 1'].
// Digits may be partial ('interstate 4' -> ['i 4'], matched as a prefix of 'i 405'). Not a road shape -> [].
const WORD = { interstate: ['i'], i: ['i'], us: ['us'], 'u s': ['us'], 'us highway': ['us'], 'us route': ['us'], 'u s highway': ['us'], 'u s route': ['us'],
  sr: ['sr'], ca: ['sr'], 'state route': ['sr'], 'state highway': ['sr'], 'california state route': ['sr'], 'california highway': ['sr'],
  highway: ['sr', 'us', 'hwy', 'highway'], hwy: ['sr', 'us', 'hwy', 'highway'], route: ['sr', 'us', 'hwy'], rte: ['sr', 'us', 'hwy'] }; // 'highway N' is ambiguous (California SR or US, British Columbia 'Hwy'): all are tried, every result shows what it is
const ROAD_RE = /^(interstate|i|us highway|us route|u s highway|u s route|us|u s|california state route|california highway|state route|state highway|sr|ca|highway|hwy|route|rte)\s?(\d{1,3}[a-z]?)$/;
export function roadKeys(norm) {
  const m = ROAD_RE.exec(norm);
  return m ? WORD[m[1]].map((k) => `${k} ${m[2]}`) : [];
}
// How a road is stored in the index: 'I-405' -> 'i 405'. Same function the query side uses, so the two can never drift.
export const roadNorm = (road) => roadKeys(normalize(road))[0] || normalize(road);

export const decode = (row, country) => ({ id: row[0], kind: row[1], name: row[2], norm: row[3], region: row[4], road: row[5], lat: row[6], lon: row[7], url: row[8], country: row[9] ?? country });

// sets = [{ rows, country }]. Prefix and word-start matching only. Returns at most max decoded entries, never the same id twice.
export function search(sets, query, max = MAX_RESULTS) {
  const q = normalize(query);
  if (!q) return [];
  const toks = q.split(' '), keys = roadKeys(q), seen = new Set(), hits = [];
  for (const { rows, country } of sets) for (const r of rows) {
    const n = r[3], isRoad = r[1] === 'road';
    let tier;
    if (n === q || (isRoad && keys.includes(n))) tier = 0;
    else if (n.startsWith(q) && (!keys.length || isRoad || n[q.length] === ' ')) tier = 1; // prefix of the whole name (for a road query on a non-road row: only at a word end)
    else if (isRoad && keys.some((k) => n.startsWith(k))) tier = 2; // partial digits: 'interstate 4' -> I-405
    else if (keys.length ? keys.some((k) => (' ' + n + ' ').includes(' ' + k + ' ')) : toks.every((t) => (' ' + n).includes(' ' + t))) tier = 3; // a road query matches the whole road designation as words ('i 80' never 'i 805'); any other query: every typed word starts some word of the name
    else continue;
    if (seen.has(r[0])) continue;
    seen.add(r[0]);
    hits.push({ tier, rank: KIND_RANK[r[1]] ?? 9, r, country });
  }
  hits.sort((a, b) => (a.tier ? 1 : 0) - (b.tier ? 1 : 0) || a.rank - b.rank || a.tier - b.tier || a.r[3].length - b.r[3].length || (a.r[2] < b.r[2] ? -1 : a.r[2] > b.r[2] ? 1 : 0) || (a.r[0] < b.r[0] ? -1 : 1));
  return hits.slice(0, max).map((h) => decode(h.r, h.country));
}

// Loader: NOTHING is fetched until focus() is called (the first focus of the box). Then the manifest and the global lookup (country, region,
// city and road names); a country shard is fetched only when a query needs it (town and camera names live there).
export function createLoader(fetchFn, base = '/search/') {
  let started = null, manifest = null, global = null;
  const shards = new Map(); // country + region -> { rows, country }
  const skey = (s) => `${s.country}|${s.region}`;
  const get = async (file) => { const res = await fetchFn(base + file); if (!res.ok) throw new Error(`search: ${file} ${res.status}`); return res.json(); };
  const focus = () => (started ||= (async () => {
    manifest = await get('manifest.json');
    if (manifest.version !== 1) throw new Error('search: unknown manifest version');
    global = await get(manifest.global.file);
  })().catch((e) => { started = null; throw e; }));
  const shard = async (s) => {
    if (!shards.has(skey(s))) shards.set(skey(s), { rows: (await get(s.file)).rows, country: s.country });
  };
  const query = async (q) => {
    await focus();
    const sets = () => [{ rows: global.rows }, ...[...shards.values()]];
    let res = search(sets(), q);
    if (res.length >= MAX_RESULTS) return res;
    // a result names its country and region: fetch that region's shard (a country-level result has no single region: it fetches nothing extra)
    let need = manifest.shards.filter((s) => !shards.has(skey(s)) && res.some((x) => x.country === s.country && x.region === s.region));
    // ponytail: a query the place index cannot answer reads every camera-name shard once (about 0.9 MB gzip); a name-word index if that grows
    if (!res.length) need = manifest.shards.filter((s) => !shards.has(skey(s)));
    if (!need.length) return res;
    await Promise.all(need.map(shard));
    res = search(sets(), q);
    return res;
  };
  return { focus, query, loaded: () => ({ manifest: !!manifest, shards: [...shards.keys()].map((k) => k.replace('|', ' / ')) }) };
}
