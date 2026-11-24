# GEV camera sources, counted from its CODE (2026-11-24, upstream base aac6be77735f, read only)

Why this file exists: my first count (about 27 sources in about 13 countries) came from gev/DATA_SOURCES.md lines 65-90 only. Owner asked whether I misread GEV. I re-read the code: gev/server/providers/cctv/ (sources.js 4,079 lines, ottawa.js, quebec.js, lithuania.js, taiwan.js, worldCameras.js) and gev/config/cctv_sources.*.json. The docs table UNDERCOUNTS: Ottawa, Taiwan (two feeds), Lithuania, Oregon, Japan (two), Romania, Tallinn are in the code or config but not in that table.

## What GEV carries (verified by reading the files named)

| # | Source kind | Where in code | Country or state | Size read | Notes |
|---|---|---|---|---|---|
| 1 | caltrans-open-data | sources.js | US, California | thousands | we have it |
| 2 | austin-open-data | sources.js | US, Texas | ~800 | we have it |
| 3 | txdot-its | sources.js | US, Texas (25 districts) | not counted | no licence text, no linkable picture (our audit) |
| 4 | houston-transtar | sources.js | US, Texas | ~1,000 | bans copying and linking: closed |
| 5 | fl511-open-data | sources.js | US, Florida | not counted | personal use only: closed |
| 6 | wsdot-open-data | sources.js | US, Washington | ~1,700 | no licence grant found: closed pending email |
| 7 | kingcounty-open-data | sources.js | US, Washington | ~90 own | small |
| 8 | nyc-dot-tmc | sources.js | US, New York | not counted | agreement needed: closed |
| 9 | deldot-open-data | sources.js | US, Delaware | 374 | no licence text: closed pending email |
| 10 | toronto-rescu-open-data | sources.js | Canada, Toronto | ours | we have it |
| 11 | ontario-511-open-data | sources.js | Canada, Ontario | not counted | needs key |
| 12 | drivebc-open-data | sources.js | Canada, BC | ours | we have it |
| 13 | calgary-open-data | sources.js | Canada, Alberta | ours | we have it |
| 14 | (ottawa.js) | ottawa.js | Canada, Ottawa | not counted | NOT in the docs table: new lead |
| 15 | (quebec.js, public/quebec-cameras.json) | quebec.js | Canada, Quebec | ours | we have it |
| 16 | tfl-open-data | sources.js | UK, London | ours | we have it |
| 17 | fintraffic-open-data | sources.js | Finland | ours | we have it |
| 18 | iceland-vegagerdin | sources.js | Iceland | ours | we have it |
| 19 | vegvesen-datex | sources.js | Norway | many | needs registration |
| 20 | tarktee-datex | sources.js | Estonia | not counted | no official feed found in our audit |
| 21 | tallinn-ristmikud | sources.js + config (255 rows) | Estonia | 255 | lead |
| 22 | (lithuania.js) | lithuania.js | Lithuania | not counted | NOT in the docs table; off by default in GEV, endpoints are a website backend |
| 23 | catalonia-open-data | sources.js | Spain, Catalonia | 38 (36 own) | small |
| 24 | a22-opendatahub | sources.js | Italy | 13 | small, CC0 |
| 25 | municipal-webcam | sources.js + config | Germany, Warendorf | 1 | tiny |
| 26 | (romania config) | config/cctv_sources.romania.json | Romania | 1 | tiny, provider terms restrictive |
| 27 | nsw-livetraffic | sources.js | Australia, NSW | 250 | built today (commit 5c609eb) |
| 28 | hk-td-open-data | sources.js | Hong Kong | ours | we have it |
| 29 | (taiwan.js) THB provincial roads | taiwan.js | Taiwan | 2,354 (counted by us today) | NOT in the docs table: BIGGEST NEW LEAD, building as plan item 32 |
| 30 | (taiwan.js) Freeway Bureau | taiwan.js | Taiwan | about 1,800 per the code comment | feed does not answer from our network |
| 31 | (worldCameras.js) Oregon TripCheck | worldCameras.js + config world-image-cameras | US, Oregon | 1,176 | ODOT FAQ permits use with credit; official feed needs a TripCheck account |
| 32 | (worldCameras.js) MLIT river cameras | worldCameras.js + config | Japan | 1,054 | river cameras, not traffic; asks for no periodic collection |
| 33 | (config shinjuku) | config/cctv_sources.shinjuku.json | Japan, Tokyo | 3 | tiny |

Result: about 33 camera sources in 16 countries (US, Canada, UK, Finland, Iceland, Norway, Estonia, Lithuania, Spain, Italy, Germany, Romania, Australia, Hong Kong, Taiwan, Japan). The first count said 27 and 13.

## GEV versus Argos (the gap)
Argos Atlas names 79 countries and about 225,000 cameras (Argos's own claim, not verified by us). GEV's code names camera sources in 16 countries. That is a SOURCE-COUNTRY comparison, not a measured camera-coverage comparison: a source can fail at runtime, and GEV's real camera total and per-country coverage have NOT been measured (no run, no export). The earlier guess of 15,000 to 20,000 GEV cameras is a GUESS built from a few counted sizes (Taiwan 2,354, Oregon 1,176, MLIT 1,054, WSDOT about 1,700, Tallinn 255, NSW 250) plus uncounted sources, and ChatGPT (chat 6b06089e) rightly refused to accept it. What is solid: GEV's code names sources in 16 countries, Argos names 79, so about 63 Argos countries have no GEV source at all. GEV is a lead list for 16 countries, not a world source list; the world list is built country by country (plan item 30) plus the systematic sweeps in plan item 33, and the GEV countries are the cheapest part.

ChatGPT's re-check (chat 6b06089e, read to its last line): the method (docs plus provider code plus config) is sound but not a complete runtime inventory; it asked for greps for hidden camera layers. I ran them: no camera source in local.js, overpass, regional, terrain, gbfs, traffic.js, transit.js, places.js (local.js only wires the cctv proxy; overpass names "cctv" only as a caller of OSM surveillance queries, which map where cameras are, not live pictures); no Windy, webcams.travel, SkylineWebcams or EarthCam aggregator is in the server or src code (the one "EarthCam" hit is the City of Toronto's own file tmcearthcameras.json). Still unmeasured: GEV's runtime count, deduplication, how many of the 33 are enabled by default (several are off by default: FL511, NYC, Houston, Lithuania).

## Not read
GEV also reads operator-supplied lists through the settings CCTV_SOURCES_JSON, CCTV_SOURCES_FILE and CCTV_SOURCE_FILE (found by grep of the CCTV_ names in the provider code): those are the operator's own extra cameras, not built-in data, so they are not counted; the exact counts for sources marked "not counted"; GEV's runtime behaviour (this is a code and docs reading, nothing was run).

## RUNTIME MEASUREMENT (same day, GEV started locally by me: `npm --prefix gev run dev -- --port 5173 --host 127.0.0.1` in the Terminal panel, it moved to port 5174 because 5173 was already in use; one request to /api/cctv/sources, 5,410,885 bytes, HTTP 200)
- `sources` array: 7,350 camera sources SERVED by default (the server trims big packs to about 250-267 each). By kind: austin 250, caltrans 267, tfl 250, fintraffic 267, drivebc 250, iceland 250, hk 266, deldot 266, wsdot 250, vegvesen 266, toronto 266, taiwan-highway-motc 266, txdot 55, tallinn 255, nsw 249, calgary 219, catalonia 36, kingcounty 58, a22 13, municipal-webcam 1, mlit-river 1,054, tripcheck-odot 1,176, quebec-511-browser 680, quebec-montreal-osm 426, quebec-webcam-link 14.
- `trimmedPacks` (available versus served): austin 823/250, caltrans 1,857/267, tfl 792/250, fintraffic 2,269/267, drivebc 1,059/250, iceland 499/250, hk 1,013/266, deldot 365/266, wsdot 1,635/250, vegvesen 897/266, toronto 336/266, taiwan 2,172/266. Sum available in the 12 trimmed packs = 13,717; served = 3,114.
- AVAILABLE total (trimmed packs' available + the untrimmed packs' served) = 13,717 + 4,236 = about 17,950 camera records. VERIFIED by a live local run. So the earlier guess of 15,000 to 20,000 landed inside the measured range by luck, and is now a measurement, not a guess.
- NOT served by default (off, need a key, or not reachable from this PC): FL511, NYC DOT, Houston TranStar, Lithuania, Ottawa, Ontario 511, Romania. Default-served countries: US, Canada, UK, Finland, Iceland, Norway, Estonia, Spain, Italy, Germany, Australia, Hong Kong, Taiwan, Japan = 14.
- Two things this run shows that code reading missed: (1) GEV's Montreal rows (quebec-montreal-osm, 426) come from OpenStreetMap, not an agency list; (2) Taiwan available is 2,172 in this run (our own count of the Highway Bureau file was 2,354; GEV may drop rows without usable coordinates or streams).
- Still not measured: duplicates between sources, how many pictures actually load, and every UI feature. Next: click through the map UI at http://127.0.0.1:5174/ and tick features against the two inventories.
