# Day 4 search and discovery design (ChatGPT, 2026-11-23, guest chat; read in full; all numbers are ChatGPT estimates = UNVERIFIED until benchmarked)

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
