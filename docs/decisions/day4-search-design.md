# Day 4 search and discovery design (ChatGPT, 2026-11-23, guest chat; read in full; ChatGPT estimates replaced by MEASURED numbers below, 2026-11-23)

## Adopted
- Search is a prebuilt static index, loaded on FIRST FOCUS of the search box (small manifest first, then the needed shard), never on page load. Shard by country from day one; a tiny global place/road lookup finds the right shard without the user naming a country.
- Index entries are compact (id, name, country, region, road, direction, lat, lon, page URL); fields weighted: exact name > city > road > region > country.
- Place discovery needs a free gazetteer: GeoNames (CC BY 4.0, needs attribution and a "modified" note) for towns; roads come from our own registry road aliases. OSM (ODbL, share-alike) stays a SEPARATE dataset with its own notice; not merged into ours without a licence check. Both are LEADS until a data/source-permissions row exists.
- Map state in the URL (lat, lon, zoom, optional query/filters), replaceState while panning; for the GEV embed translate to its verified hash form #v=2&lat=&lon=&alt=. Load cameras per visible area (bbox cells), never 200k markers; cluster; PMTiles later.
- Driver filters only: country, road, direction, status (reachable/stale/unavailable/unknown from our checker). Filters live in the URL.
- Budgets (to be MEASURED): first search download under 300 KB compressed, response under 200 ms, first result under 1 s, tested on a low-end phone. Build-time validation report (duplicates, bad coords, missing road/country, unknown direction).
- Cloudflare Pages is the launch host at this traffic (GitHub Pages soft limit ~100 GB/month).

## Rejected / changed
- "200,000+ crawlable camera pages": REJECTED (plan section 2: no per-camera pages; thin-page risk). Search results go to city, road, region or country pages, to the map, or out to the official source.
- MiniSearch/Orama/PMTiles on day one: not needed at ~4,300 cameras. Build a ~50-line prefix matcher behind a small interface; swap in a library when the index passes ~50k entries (the size gate tells us when).

## Tests required (each must fail without its guard)
Relevance set (ambiguous names: Springfield, Victoria, Highway 1, I-80; accents; road numbers; places with no cameras) top-1/top-5; size budget gate; no-JS fallback links; search box on every page; shard manifest points only to existing files; results always show country and region.

## MEASURED 2026-11-23 (site/tests/search.test.mjs, site/scripts/build-search.mjs; gzip level 9)
- Real registry, 4,998 entries (2 country, 2 region, 15 city, 10 road, 670 town, 4,299 camera): manifest 386 B, global lookup 1,033 B (4,090 raw), Canada shard 28,391 B, United States shard 137,620 B (678,875 raw). First search worst case (manifest + global + largest shard) = 139,039 B of the 307,200 B budget. First FOCUS alone loads only manifest + global = about 1.4 KB.
- Synthetic 200,000 entries (generated names, so real names may compress differently): ONE country = shard 38.5 MB raw, 8.29 MB gzip, first search 8.35 MB, OVER budget. Spread over 20 countries (10,000 each) = shard 2.0 MB raw, 421 KB gzip, first search 484 KB, still OVER. Global lookup (2,000 place rows) 300 KB raw, 62 KB gzip.
- Meaning: about 34 to 42 B gzip per entry, so one shard fits the budget up to roughly 7,000 to 9,000 entries. Camera-name rows dominate. At 200k the build gate WILL fail; the fix is shards by region (30+) and a library or an index of names without the long official URLs. The ~50-line prefix matcher scans every row (fine at 5k; 200k rows per keystroke is untested for latency).
- Not measured: response time, first result time, low-end phone, real browser behaviour (the Playwright tool was not connected). Only Node tests with a stub fetch ran.
