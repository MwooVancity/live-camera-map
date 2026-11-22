# Session 4 findings: restricted-source exclusion proof (2026-11-22)

Goal: a public visitor can never reach data from a source whose permission is restricted, unknown or mustNotShip.
Evidence read in `gev/` at the pinned commit aac6be7 (read-only, `git status --porcelain` empty). Machine: Windows, Node 24.18.
Map: `data/exclusion-map.json` (19 groups covering all 164 non-allowed rows of `data/source-permissions.json`).

## Verdict
CONDITIONAL: the proxy now blocks every server route and bundled data file that serves restricted data, proven offline
(11 tests, exit 0) and written as a CI proof that has NOT been run yet. Four gaps stay open (below). Not approved for public launch while BK-1 and BD-1 are open.

## The two open Session-3 questions
1. Does `/api/weather/tile` reach ECCC GeoMet? **No.** `gev/server/providers/weather.js:4` hard-codes `BASE = https://nowcoast.noaa.gov/geoserver/observations/`;
   the capabilities call (:351) and the tile/image upstream (:546) are built from it; no other host appears in the file; only `/manifest`, `/tile`, `/image` exist (:434).
   ECCC GeoMet is used only by the browser-direct air-quality layer (`gev/src/layers/airQuality/source.js:8`), which no allowlisted route serves (gap BD-1).
   `/api/weather-effects` fetches Open-Meteo (`gev/server/providers/regional/weather.js:16`).
2. What do `/api/cctv/frame|media|stream` fetch? **The upstream URL registered for that camera id in the loaded catalog**, never a client URL:
   frame `cctv.js:650-673` (`source.snapshotUrl || source.url`), media `cctv.js:368-379` (`source.url`, live HLS/MJPEG only), stream `cctv.js:354-359` (returns the stream payload with its URLs).
   Which cameras exist depends on pack env flags (`cctv/catalog.js:56-195`): NYC, Florida, Houston, Lithuania are opt-in (default off); Austin and Caltrans always load. These three routes are not allowlisted: no camera image, stream or stream URL reaches a visitor.

## Real leaks found in the Session 3B allowlist, and fixed (proxy side only)
| Source | Route reachable before | Why | Fix |
|---|---|---|---|
| Smithsonian GVP (restricted) | `/api/library/data/gvp-holocene-volcanoes` | regex allowed `/data/<any id>`; the allowlist probe was this very dataset | regex limited to the 10 `allowed_per_doc` dataset ids; probe now `eia-power-plants` |
| Bhote Koshi pack (mustNotShip) | `/events/bhote-koshi-2026/*` | `/events/` was allowlisted and holds only this pack | `/events/` removed + deny rule |
| TeleGeography (mustNotShip) | `/src/data/local_data/telegeography_submarine_cables/*.json` | open `/src/` prefix serves any file | deny rule (data is fetched at runtime, `bundledSource.js:7,13`) |
| UCS satellites, imaging sensors, CCTV ground heights (unknown) | `/src/data/local_data/<dir>/*.json` | same | deny rule (runtime fetch: `ucsSatellites.js:17`, `imagingSensors.js:17`; ground heights are read from disk by the server) |

## Table: source, route, status, proof, rollback
| Source (status) | GEV route or asset | Status now | Proof | Rollback |
|---|---|---|---|---|
| OpenSky (restricted) | `/api/flights`, `/api/flights/track` (`aircraft/opensky.js:494`, `tracks.js:67`) | blocked by proxy | unit test + CI proof, 7 methods | n/a, default deny |
| GhostMaps (restricted) | `/api/ghostmaps/*` (`ghostMaps.js:431`) | blocked by proxy | same | n/a |
| iNaturalist (restricted) | `/api/inaturalist/*` (`inaturalist/observations.js:337`) | blocked by proxy | same | n/a |
| Google News (restricted) | `/api/news/*`, `/api/regional-brief` (`news.js:185`, `regional/news.js:95`) | blocked by proxy | same | n/a |
| FL511, NYC DOT (restricted), TranStar (restricted) | `/api/cctv/frame|media|stream/:id`, library packs | blocked by proxy; packs also default off, set to 0 in `ops/deploy/gev-exclusion.env` | same + CI asserts these providers are absent from `/api/cctv/sources` | remove the env lines |
| Other CCTV packs (unknown) | frame/media/stream blocked; `/api/cctv/sources` metadata still lists Austin and Caltrans | images blocked; metadata gap CCTV-NOSWITCH | same | n/a |
| GVP volcanoes (restricted) | `/api/library/data/gvp-holocene-volcanoes` | blocked by proxy (was open) | fixture test shows the old regex fails the check | revert allowlist JSON and nginx line |
| GBIF (restricted) | library tiles, browser-direct | `/api/library/tile/*` blocked; browser-direct stopped only by `GEV_LIBRARY_DISABLE` | env checked in unit test; NOT browser-tested | remove id from env |
| TeleGeography (mustNotShip) | `/src/data/local_data/telegeography_submarine_cables/*` | blocked by proxy (was open) | unit test + CI proof | remove deny entry |
| Bhote Koshi (mustNotShip) | `/events/bhote-koshi-2026/*` blocked (was open); `/src/data/bhoteKoshiFloodPath.js` STILL REACHABLE | assets blocked, code module OPEN (BK-1) | unit test + CI proof for assets | n/a |
| UCS, imaging sensors, ground heights (unknown) | `/src/data/local_data/*` | blocked by proxy (was open) | same | remove deny entry |
| BiciMAD, Hamilton HSR and ~90 transit/bike/rail feeds | `/api/transit`, `/api/rail`, `/api/gbfs` | blocked by proxy | same | n/a |
| NHC, Street View, Google 3D, adsbdb, AIS, CelesTrak, Launch Library, TomTom, radio | server routes | blocked by proxy | same | n/a |
| Esri imagery, ECCC AQHI, Street View (unknown) | browser-direct | NOT stoppable at the proxy (BD-1) | none | n/a |
| ECCC via `/api/weather/tile` | does not exist | resolved: no | code read, see above | n/a |

## Open gaps (also in `data/exclusion-map.json` knownGaps; the unit test lists them and fails if a route points at an unlisted gap)
- **BK-1 (high for public launch)**: `src/data/bhoteKoshiFloodPath.js` (CC BY-NC river centreline) is statically imported at boot (`constructCatalog.js:45-46` -> `bhoteKoshiLocator.js:20`); blocking it breaks every visitor. Needs a production build with it stubbed, or a proxy-side stub after a real-browser boot test. Not done.
- **BD-1 (medium)**: browser-direct sources bypass any reverse proxy. Library entries are covered by `GEV_LIBRARY_DISABLE` (GEV answers 403 and its client will not switch them on, `library/proxy.js:515-530`, `library/controller.js:188`). ECCC AQHI and Esri have no switch found. Option: CSP `connect-src`/`img-src` at the proxy after a browser test.
- **CCTV-NOSWITCH (medium)**: Austin and Caltrans (permission unknown) load with `enabled: () => true` (`catalog.js:60-64`); their metadata (name, lat/lon, source URL) is in `/api/cctv/sources`. Fix in Session 5: filtering wrapper, permission, or drop the route and use the Astro registry.
- **OPENMETEO-UNVERIFIED (low, Mike)**: permissions mark Open-Meteo allowed from a CC BY 4.0 line. My recollection (UNVERIFIED, not read this session) is that its free API tier is non-commercial. `/api/weather-effects` is allowlisted on that basis; Mike should read the terms.

## Not verified
- Nothing ran against a live GEV (no Docker here). The CI workflow `session4-exclusion` has never run; its first run is the real test. Pushing paths under `data/`, `ops/` or `tests/exclusion/` triggers it (builds the image, a few CI minutes; check the monthly budget).
- Boot with the new deny rules and the `gev-exclusion.env` flags: not tested in a browser. Satellite layers that fetch `ucs_satellites.json` / `imaging_sensors.json` should fail soft (retryable loaders); unconfirmed. Allowed imagery tile entries are still unreachable (their `/tile/` route is not allowlisted), a Session 3B limit unchanged.
- `/api/library` (catalog metadata) still lists restricted entries; GEV should mark them `operator-disabled` once `GEV_LIBRARY_DISABLE` is set. Unconfirmed against a running GEV.
- The existing matrix `tests/security/methods.mjs` was extended (deny rules, extra denied paths), not weakened; not re-run here (needs a live proxy).
- Static fallback/built-in camera sources in `cctv/sources.js` beyond the packs in `catalog.js` were not enumerated one by one.
- The map's file:line numbers were read from the pinned checkout today; routes served by `regional/`, `transit.js`, `rail.js`, `gbfs.js`, `radio.js` rely on `data/route-inventory.json` and file names, not a line-by-line read.
