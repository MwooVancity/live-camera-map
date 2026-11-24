# GEV feature inventory (2026-11-24)

Scope: the God's Eye View checkout in `gev/` (package `gods-eye-view` 0.3.0, MIT code, author Bilawal Sidhu). Read-only audit. Nothing in `gev/` was edited, no git was run in it, the app was not run. Paths below are relative to `gev/`.

## How to read the confidence column
- **VERIFIED** = I opened the named file (or its registry/config/list) and saw the thing registered or configured.
- **DOC-ONLY** = the claim comes from README.md, DATA_SOURCES.md, docs/*.md or `.env.example`; I confirmed the cited path exists but did not read the implementation, so behaviour, counts and "works" are unproven.
- "Default?" column: **Off\*** means the layer is not on at first start (README "First Five Minutes" tells the user to switch layers on; I did not read per-layer startup defaults, so this is DOC-ONLY for each layer). **Yes** = on whenever the server runs and the route is hit (keyless proxy). **Opt-in** = needs an env flag or key.
- Nothing here has been tested against live data. Every feed's liveness is UNVERIFIED.

## Counts (headline numbers)
| What | Count | Evidence |
|---|---|---|
| Layers registered for share links / saved state | **39** ids (tokens in `src/data/layerStateTokenReservations.json`, registry in `src/data/layerState.js`) | VERIFIED |
| Layers the README headlines | "Twenty-three layers and map sources", 21 with a keyless path | DOC-ONLY (README.md "What's on the Globe") |
| Layer implementation folders | 34 entries in `src/layers/` (33 layer dirs + 1 test), 34 files in `src/app/layers/` | VERIFIED (ls) |
| Control-surface layers wired in catalog | 15 named roles (traffic, flights, military, satellites, cctv, street-level, wildlife-sightings, radio, bikeshare, transit, ais-live-vessels, military-awareness, military-installations, rocket-launches, local-adsb) | VERIFIED `src/app/catalog.js` |
| Server provider plugins mounted | **39** factories (38 always + Gemini Live opt-in) in `server/providers/local.js`, plus the `/mcp` plugin `server/mcp/plugin.js` | VERIFIED |
| Entries in `server/providers/` top level | 52 (files + dirs, including tests and `common/`) | VERIFIED (ls) |
| `/api/*` route prefixes found | about 63 distinct strings in server/src (list in section "MCP and API") | VERIFIED (grep) |
| Env variables documented in `.env.example` | **129** names (about 18 are keys/tokens/secrets/certificates) | VERIFIED (grep) |
| Env variables read anywhere in code (`process.env.X`/`env.X`) | **167** unique names, including QA_*, test, system (PATH, HOME) and tuning flags | VERIFIED (grep) |
| CCTV pack on/off flags (`CCTV_*_ENABLED`) | 25 | VERIFIED `.env.example` |
| Core tool definitions (one catalog for MCP + voice + chat) | **40** (`coreTools` in `src/tools/index.js`) | VERIFIED |
| MCP tools offered | **30** (40 minus 10 turned off for MCP in `src/tools/surfaces.js`; includes the panel-only `panel_request`) | VERIFIED |
| Voice app-action tools | **36** (unique `name:` in `src/voice/actionSchemas.js`; `osm_query` only offered when `OVERPASS_UPSTREAMS` is set) | VERIFIED |
| Catalog tools given to voice | **25** (40 minus 15 voice-off) | VERIFIED |
| Total voice tools | 36 + 25 = **61** (60 without Overpass) | derived from VERIFIED parts |
| Typed chat tools | the same action tool set as voice (`offeredTools` in `server/providers/openai/chat.js`, `gemini/chat.js`) | VERIFIED |
| Data Library entries | **96** JSON files in `src/library/entries/` | VERIFIED (ls) |
| CCTV catalogue ceiling | 7,350 locations (`CCTV_MAX_SOURCES`) | DOC-ONLY (.env.example, README) |
| 3D models | 124 `.glb` in `public/models` (122 procedural fleet + `iss.glb` + `tiangong.glb`) | VERIFIED (find) |
| Bundled infrastructure | Datacenters 4,352; dams 706; submarine cables 712 | DOC-ONLY (README) |
| UI languages | 13 translation files + English = 14 | VERIFIED `src/i18n/locales/` |
| Keyboard shortcuts | 10 keys bound in the shortcut file (1-6, Esc, H, O, V, F, D, C) plus backtick for frame rate (README) | VERIFIED `src/ui/applicationShortcuts.js` |
| Share-link long-form params | 27 core (v, lat, lon, alt, heading, pitch, roll, style, map, hud, hv, hs, bloom, bi, bv, sharpen, si, dm, dd, da, kf, ko, cr, sc, scf, sco, sce) plus lib, ui, sp, at, an, sl | VERIFIED `src/sharelink.js`, docs/SHARE-LINK-FORMAT.md |
| Shipped Director scenes | 7 recipes | VERIFIED `src/scenes/recipes.js` |
| Parity-file check | 40 of 40 sampled rows of `data/gev-parity.json` matched (see end) | VERIFIED |

---

## Map, globe and basemaps
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| 3D globe renderer | Cesium-based photoreal globe, camera, picking, post effects | CesiumJS | none | Yes | `src/render/cesium/`, `src/maps/globeEngine.js` | VERIFIED |
| Keyless basemap | Esri World Imagery satellite plus keyless terrain in 2D; OSM takes over if Esri fails | Esri, OSM | none | Yes (no credentials) | `src/maps/defaultSources.js`, `src/maps/keylessTerrain.js` | DOC-ONLY |
| Google Photorealistic 3D Tiles (direct) | 3D city meshes, also Google place search | Google Map Tiles API | `GOOGLE_MAPS_API_KEY` (client-exposed), billing | Opt-in | `src/maps/googleTokens.js`, `server/standalone/google-token-unavailable.js` | DOC-ONLY |
| Google 3D via Cesium ion | Same 3D plus world terrain, Bing imagery through an ion token | Cesium ion | `CESIUM_ION_TOKEN` (free plan non-commercial) | Opt-in | `src/maps/catalog.js` | VERIFIED (ion asset ids in header) |
| Map stacks | photoreal, bing-aerial, bing-labels, esri-imagery, osm; a tray switches them | Google/ion/Esri/OSM | per stack | Yes | `src/maps/catalog.js`, `docs/SHARE-LINK-FORMAT.md` field 15 | VERIFIED |
| Map source tray and availability reasons | Tells the user which key a stack needs | n/a | n/a | Yes | `src/ui/mapSourceControls.js`, `src/maps/availability.js` | DOC-ONLY |
| Imagery comparison / split view | Side-by-side imagery compare | Esri/NASA | none | On demand | `src/maps/imageryComparison.js`, `src/ui/views/panels/ImagerySplitView.vue` | DOC-ONLY |
| Terrain height lookup | Ground heights for cameras, cockpit, floor hold | Cesium terrain / Kartverket (Norway) | none | Yes | `server/providers/terrain.js`, `src/services/terrainHeights.js` | DOC-ONLY |
| OpenFreeMap vector tiles | Boundaries, place names, outlines | OpenFreeMap/OSM | none | Yes | `src/sources/openFreeMap.js` | DOC-ONLY |
| Visual styles (6) | normal, retro (CRT), surveillance (NVG), thermal (FLIR), anime, noir; keys 1-6 | local shaders | none | normal | `src/styles/*.js`, `src/ui/applicationShortcuts.js` | VERIFIED |
| Post-processing | bloom, sharpen, style parameters, visual presets | local | none | per style | `src/ui/visualPresets.js`, `src/ui/styleParameters.js` | DOC-ONLY |
| HUD variants | tactical, minimal, cyber (Tactical plus Sonar); H toggles | local | none | Auto | `src/hud.js`, `src/hudLayouts.js` | VERIFIED (field 16 in share doc) |
| Cyber Sonar | Scanner-style contact overlay | local | none | Off* | `src/cyberSonar.js`, `src/cyberSonarScene.js` | DOC-ONLY |
| Detection overlay | Screen-space boxes and IDs on everything in view; D cycles | local | none | Off | `src/data/detection.js`, `src/ui/applicationShortcuts.js` | VERIFIED (shortcut) |
| Orbit mode | Smooth orbit around target; O key | local | none | Off | `src/orbit.js` | VERIFIED |
| Tilt / North Up / compass / Reset Globe | Oblique or top-down view; one control back to full Earth | local | none | Yes | `src/ui/cameraOrientationControls.js`, `src/ui/views/panels/GlobeCompass.vue`, `GlobeActions.vue` | DOC-ONLY |
| Clean view | V hides panels | local | none | Off | `src/ui/applicationShortcuts.js` | VERIFIED |
| Camera floor / ground guard | Keeps camera above terrain and 3D mesh | terrain/mesh | none | Yes | `src/cameraGroundGuard.js`, `src/services/groundFloor.js` | DOC-ONLY |
| Sky, stars, Milky Way | Real star catalogue sky | bundled (`scripts/build-bright-stars.mjs`, `build-milky-way.mjs`) | none | Yes | `src/sky/`, `src/viewSky.js` | DOC-ONLY |
| Celestial ring | Ring of sky bodies around the view | local | none | Off | `src/celestialRing.js` | DOC-ONLY |
| Sun dial / spot conditions | Local sun position and conditions card | local math | none | On demand | `src/ui/views/panels/SunDial.vue`, `SpotConditions.vue` | DOC-ONLY |
| Neighborhood overlays | SF neighbourhoods, WOF neighbourhoods, census places, Wikidata cities, Natural Earth regions, admin boundary packs | DataSF, WOF, Census, Wikidata, Natural Earth | none | Yes | `src/data/neighborhoodPolygons.js`, `src/data/adminBoundaries.js`, `src/data/local_data/*` | DOC-ONLY |
| OSM overlays: sea marks, ski pistes | Two OSM-backed overlay layers | OSM via Overpass | `OVERPASS_UPSTREAMS` (own server) | Opt-in | `src/data/osmOverlays.js` | VERIFIED (ids) |
| Data Library browser | Browse and light 96 outside datasets/tiles; operators can enable or remove ids | many (see licence section) | `GEV_LIBRARY_ENABLE`, `GEV_LIBRARY_DISABLE` | Per entry | `src/library/`, `src/ui/libraryBrowser.js`, `server/providers/library.js`, `docs/DATA-LIBRARY.md` | VERIFIED (96 files) |
| Library entry kinds | tiles (xyz/bbox), datasets (geojson, arcgis, geoparquet, json), CCTV packs | per entry | none | Off | `src/library/entries/*.json`, `src/library/parquet.js` | DOC-ONLY |
| Frame-rate governor | Display-rate drawing while moving, 60 Hz idle cap | local | none | Yes | `src/renderGovernor.js` | VERIFIED (doc text read) |
| Render-failure recovery | Inline retry panel on WebGL loss | local | none | Yes | `src/ui/views/panels/RenderFailure.vue`, `src/app/globeInViewRecovery.js` | DOC-ONLY |
| Credits / attribution lightbox | Per-layer credits on globe | n/a | none | Yes | `src/data/dataCredits.js`, `src/ui/creditsView.js` | DOC-ONLY |

## Camera layers
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| CCTV Mesh layer | Projects public camera frames into the 3D scene as geo-posed pictures; up to 7,350 locations (4,000 shared round-robin slots + 1,120 Quebec + 2,230 World image cameras) | many (list below) | none for most | Off* | `src/layers/cctv/`, `src/app/layers/cctv.js`, `server/providers/cctv.js` | DOC-ONLY (count) / VERIFIED (files) |
| Camera proxy routes | Catalogue, JPEG frames and HLS media pass through the local server | n/a | n/a | Yes | `/api/cctv`, `/api/cctv/frame/`, `/api/cctv/media/`; `server/providers/cctv/stream.js`, `media.js` | VERIFIED (route strings) |
| Camera pose/heading estimates | Camera direction and height are estimates and labelled so | local model | none | Yes | `src/layers/cctv/headingConfidence.js`, `src/data/cctv.js` | DOC-ONLY |
| Viewshed / coverage volume | Per-camera estimated coverage cone | local math + terrain | none | Mode toggle | `src/data/cctvViewshed.js` | DOC-ONLY |
| Camera count markers and click-to-zoom clusters | Aggregates dense areas | local | none | Yes | `src/layers/cctv/countMarkers.js` | VERIFIED (file) |
| Camera database specs | Model/spec table used for field-of-view guesses | bundled | none | Yes | `src/layers/cctv/modelSpecs.js` | DOC-ONLY |
| Precomputed ground heights | Heights per camera so poses sit on terrain | Kartverket etc. | `CCTV_GROUND_HEIGHTS_FILE` | Yes | `scripts/precompute-cctv-heights.mjs`, `src/data/local_data/cctv_ground_heights` | DOC-ONLY |
| Austin TX pack | City of Austin Open Data | City of Austin | none (`CCTV_AUSTIN_MAX_SOURCES`) | Yes | `server/providers/cctv/sources.js`, `config/cctv_sources.austin.json` | VERIFIED (config file) |
| TxDOT (Texas) | District catalogs | its.txdot.gov | none (`CCTV_TXDOT_ENABLED`, `_DISTRICTS`, `_MAX_SOURCES`) | Yes | `server/providers/cctv/sources.js` | DOC-ONLY |
| Caltrans (California) | Districts 4,7,11,3 by default | cwwp2.dot.ca.gov | `CCTV_CALTRANS_DISTRICTS` | Yes | same | DOC-ONLY |
| TfL JamCams (London) | London traffic cams | TfL Open Data | `TFL_APP_KEY` optional (raises rate) | Yes (`CCTV_TFL_ENABLED`) | `server/providers/cctv/sources.js:409-420` | VERIFIED |
| Ontario 511 | Highway cams | Ontario 511 | `ONTARIO_511_API_KEY` (free developer key) | needs key | `sources.js` | DOC-ONLY |
| City of Ottawa | Traffic cam images | City of Ottawa | `OTTAWA_CAMERA_CERTIFICATE` (free) | needs cert | `server/providers/cctv/ottawa.js` | VERIFIED (file) |
| Fintraffic (Finland) | Weathercams | Digitraffic CC BY 4.0 | none | Yes | `sources.js` | DOC-ONLY |
| DriveBC | BC highway cams | Gov of BC OGL | none | Yes | `sources.js` | DOC-ONLY |
| Tallinn and Tarktee (Estonia) | City intersections; road-weather cams | Tallinn, Transpordiamet | none | Yes | `sources.js`, `config/cctv_sources.tallinn.json` | VERIFIED (config) |
| Warendorf (Germany) | Municipal webcams | Stadt Warendorf | none | Yes | `config/cctv_sources.warendorf.json` | VERIFIED (config) |
| Live Traffic NSW | Australia cams | TfNSW CC BY 4.0 | none | Yes | `sources.js` | DOC-ONLY |
| Open Calgary | Calgary cams | City of Calgary OGL | none | Yes | `sources.js` | DOC-ONLY |
| Catalonia | Servei Catala de Transit etc. | Generalitat | none | Yes | `sources.js` | DOC-ONLY |
| Iceland (Vegagerdin) | Road cams | IRCA CC BY 4.0 | none | Yes | `sources.js` | DOC-ONLY |
| King County WA / WSDOT | Road cams | KCGIS / WSDOT | none | Yes | `sources.js` | DOC-ONLY |
| Hong Kong | Transport Dept snapshot cams (~1,013) | DATA.GOV.HK | none | Yes | `sources.js` | DOC-ONLY |
| Norway (Statens vegvesen) | ~850 cams, live HLS video optional | NLOD 2.0 | none | Yes | `sources.js` | DOC-ONLY |
| Toronto RESCU | Toronto cams | Toronto OGL | none | Yes | `sources.js` | DOC-ONLY |
| A22 Brenner (Italy) | Motorway webcams | Open Data Hub | none | Yes | `sources.js` | DOC-ONLY |
| Taiwan Freeway Bureau | MOTC CCTV xml | MOTC | none | Yes | `server/providers/cctv/taiwan.js` | VERIFIED (file) |
| Delaware DelDOT | Live HTTPS HLS video | DelDOT | none | Yes | `sources.js` | DOC-ONLY |
| Quebec locations | MTQ, Montreal, scenic links; video opt-in (511 terms unconfirmed) | MTQ | `CCTV_QUEBEC_VIDEO_ENABLED` | locations yes, video no | `server/providers/cctv/quebec.js`, `public/quebec-cameras.json` | VERIFIED (files) |
| World image cameras (Oregon, Japan MLIT) | Still cameras | ODOT, MLIT | none | Yes (`CCTV_WORLD_CAMERAS_ENABLED`) | `server/providers/cctv/worldCameras.js`, `config/cctv_sources.world-image-cameras.json` | VERIFIED (files) |
| Lithuania | Via Lietuva cams, photo licence unconfirmed | eismoinfo.lt | `CCTV_LITHUANIA_ENABLED=1` | Off | `server/providers/cctv/lithuania.js` | VERIFIED (file) |
| Florida FL511 | Statewide cams, personal use only | FDOT | `CCTV_FLORIDA_ENABLED=1` | Off | `sources.js` | DOC-ONLY |
| NYC DOT TMC | Needs data-sharing agreement | NYC DOT | `CCTV_NYC_ENABLED=1` | Off | `sources.js` | DOC-ONLY |
| Houston TranStar | Needs TxDOT written permission | TranStar | `CCTV_HOUSTON_ENABLED=1` | Off | `sources.js` | DOC-ONLY |
| Romania Giroc, Shinjuku | Local source packs with HLS | webcamromania.ro, others | none | Off (config files) | `config/cctv_sources.romania.json`, `cctv_sources.shinjuku.json` | VERIFIED (files) |
| Custom camera source pack | Operator supplies JSON | operator | `CCTV_SOURCES_FILE` / `CCTV_SOURCES_JSON` | Opt-in | `server/providers/cctv/sources.js` | VERIFIED (env names) |
| Catalogue cap and health | Cap by slots; per-source max env | local | `CCTV_MAX_SOURCES` + per-pack `*_MAX_SOURCES` | Yes | `server/providers/cctv/cap.js`, `src/layers/cctv/health.js` | VERIFIED (files) |
| Camera picker/preview/video | Panel with select, snapshot, HLS playback | n/a | n/a | Yes | `src/ui/views/panels/CctvPanel.vue`, `CctvPreview.vue`, `src/ui/cctvVideo.js` | DOC-ONLY |
| Street View fallback for camera frames | Placeholder or Street View still when a frame fails | Google Street View Static | `GOOGLE_MAPS_SERVER_API_KEY` | Opt-in | `server/providers/places/google-key.js` | DOC-ONLY |
| Mapped ALPR cameras | OSM-tagged plate-reader locations, SHOW NEAREST; no plates, no video | OSM / DeFlock | none | Off* | `src/layers/alpr/`, `src/data/alprCameras.js` | DOC-ONLY |
| Street Level (4 providers) | Coverage lines, photo cones, viewer; Mapillary, Google Street View, KartaView, Panoramax | Mapillary / Google / KartaView / Panoramax | `MAPILLARY_CLIENT_TOKEN` (free), `GOOGLE_MAPS_API_KEY` (billed) | Off* | `src/layers/streetLevel/`, `server/providers/mapillary.js` | VERIFIED (dirs) |
| Fire/vessel to nearest camera hand-off | One click from a tracked fire or vessel to nearest live camera | local | none | Yes | `src/ui/cctvBindings.js` | DOC-ONLY |
| find_cctv_cameras / get_cctv_snapshot / find_alpr_cameras tools | MCP/voice/chat queries | as above | none | Yes | `src/tools/queries/media.js`, `surveillance.js` | VERIFIED |

## Aircraft
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| Live Flights layer | 11,000+ aircraft with route history | OpenSky (non-commercial licence) with adsb.lol fallback | `OPENSKY_CLIENT_ID`/`OPENSKY_CLIENT_SECRET` optional, `OPENSKY_AUTH_MODE` | Off* | `src/layers/flights/`, `server/providers/aircraft/opensky.js`, `adsb-lol.js` | VERIFIED (files) |
| Military Flights layer | ADS-B military traffic, emergencies in red | adsb.lol (ODbL) | none | Off* | `src/layers/military/`, `/api/military` | VERIFIED |
| Aircraft tracks / backfill | Recent path for a selected aircraft | adsb.lol traces | none | Yes | `server/providers/aircraft/tracks.js`, `/api/flights/track`, `/api/military/track` | VERIFIED |
| Aircraft enrichment | Type, registration, route by ICAO hex | adsbdb | none | Yes | `server/providers/aircraft/enrichment.js`, `/api/adsbdb` | VERIFIED |
| Aircraft photo | Thumbnail of tracked aircraft | Planespotters | none | Yes | `src/sources/live/standalone.js` | DOC-ONLY |
| Emergency squawk handling | Highlights emergency broadcasts | feed fields | none | Yes | `src/data/aircraftEmergency.js` | DOC-ONLY |
| Military registry / names | Military identification from registry | adsb.lol, bundled | none | Yes | `src/data/militaryRegistry.js`, `scripts/build-military-names.py` | DOC-ONLY |
| Local ADS-B layer | Your own decoder feeds (1090/978) | your receiver | `LOCAL_RECEIVER_FEEDS` | Opt-in | `src/layers/localAdsb/`, `server/providers/local-receivers.js` | VERIFIED |
| SDR in the browser | RTL-SDR over WebUSB: ADS-B decode, spectrum, FM audio | your USB radio | none | Opt-in | `src/sdr/` | VERIFIED (files) |
| GNSS Integrity layer | Regional accuracy scores from ADS-B integrity fields; anomalies are not proof of jamming | adsb.lol, GPSJAM aggregation | none | Off* | `src/layers/gnss/`, `server/providers/gnssIntegrity.js` | VERIFIED (header) |
| Prohibited & Restricted Airspace | FAA P and R special-use airspace polygons (US only) | FAA SUA | none | Off* | `src/layers/droneAirspace/`, `server/providers/droneAirspace.js` | VERIFIED (header) |
| 3D fleet | 122 procedural models; within 3 km glyph swaps to model | project-made | none | Yes | `public/models/fleet/`, `src/data/fleetModels.js` | VERIFIED (glb count) |
| Cockpit view | Ride a tracked flight, instruments, terrain-hold, radar page, brief pages | local | none | On demand | `src/ui/cockpitController.js`, `src/ui/views/CockpitView.vue` | VERIFIED (files) |
| Contacts roster | 250 km list of nearby live aircraft, jump into any cockpit | local | none | On demand | `src/ui/contextControls.js`, `src/layers/awareness/` | DOC-ONLY |
| Military Awareness | Range-ring/awareness of aircraft, ships, installations near a target | local | none | Off* | `src/layers/awareness/`, `src/data/militaryAwarenessEngine.js` | VERIFIED (dependencies file) |
| Aircraft class, motion model, recession | Icons, smoothing, course from fixes | local | none | Yes | `src/data/aircraftClass.js`, `motionModel.js`, `courseFromFixes.js` | VERIFIED (files) |
| Tools: aircraft_in_area, find_aircraft, get_aircraft_track, get_aircraft_info, military_awareness | Chat/MCP answers | as above | none | Yes | `src/tools/queries/aviation.js`, `brief.js` | VERIFIED |
| Airport 3D/taxi trails | Descend to taxiways, grounded contacts | OSM + feed | none | Opt | `src/data/groundFloor.js` | DOC-ONLY |

## Ships
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| Live Vessels (AIS) | Thousands of ships; server caches up to 50,000, browser draws up to 12,000 (`VITE_AIS_LIVE_MAX_ROWS`) | AISStream.io (free beta, no formal ToS) | `AISSTREAM_API_KEY` | Off*, needs key | `src/layers/vessels/`, `server/providers/vessels/ais-live.js`, `ais-store.js` | VERIFIED |
| AIS filters and watchdog | Bounding-box and message-type filters; stale-feed recycle | AISStream | `AISSTREAM_BOUNDING_BOXES`, `AISSTREAM_MESSAGE_TYPES`, `AISSTREAM_SILENCE_TIMEOUT_MS`, `AISSTREAM_URL` | Yes | `src/data/aisWatchdog.js` | VERIFIED (env names) |
| Recent path per vessel | 64 samples ring buffer per MMSI, in memory, not voyage history | server memory | none | Yes | `server/providers/vessels/ais-store.js` | VERIFIED |
| Vessel photo | One photo by MMSI | openvesselphotos.org | none | Yes | `src/data/openVesselPhoto.js` | DOC-ONLY |
| Ship 3D models, aids to navigation | ships and buoys models; AtoN types decoded | project-made | none | Yes | `public/models/fleet/ships`, `buoys`, `src/data/vesselTypes.js` | VERIFIED |
| Shipwrecks layer | ~7,000 European wrecks plus Wikidata wrecks | EMODnet CC BY 4.0, Wikidata CC0 | none | Off* | `src/layers/shipwrecks/`, `server/providers/shipwrecks.js` | VERIFIED (header) |
| Sea marks overlay | OSM nautical marks | OSM | own Overpass | Opt-in | `src/data/osmOverlays.js` | VERIFIED |
| Wildlife Sightings (marine) | Salish Sea marine mammals plus iNaturalist; sensitive spots in 0.2 degree cells | Acartia (CC BY 4.0), iNaturalist (per-record, default NC) | `INATURALIST_DAILY_BUDGET` | Off* | `src/layers/wildlifeSightings/`, `server/providers/acartia.js`, `inaturalist/` | VERIFIED (files) |
| Port chokepoints and disruptions | IMF PortWatch datasets | IMF PortWatch | `GEV_LIBRARY_ENABLE` | Opt-in | `src/library/entries/imf-portwatch-*.json` | VERIFIED (file names) |
| Tide stations | NOAA CO-OPS | NOAA | none | Library, off | `src/library/entries/noaa-tide-stations.json` | VERIFIED |
| Tools: vessels_in_area, find_vessel, get_vessel_track | queries | AIS | none | Yes | `src/tools/queries/maritime.js` | VERIFIED |

## Satellites and space
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| Satellites layer | ~1,300 objects in 6 classes (Stations, Imaging, Telecom, Starlink, Probes, Debris), TLE propagated in the browser | CelesTrak TLE + SATCAT | none | Off* | `src/layers/satellites/`, `src/data/satellites.js`, `src/sources/tle.js`, `/api/celestrak`, `/api/celestrak-satcat` | VERIFIED (routes) |
| UCS satellite database | Operator/purpose/owner details | UCS (bundled) | none | Yes | `src/data/ucsSatellites.js`, `scripts/build-ucs-satellites.py` | DOC-ONLY |
| Owner flag | Country flag per satellite owner | flag-icons sheet | none | Yes | `src/ui/ownerFlag.js` | VERIFIED |
| Satellite passes | When a satellite next rises over you | local propagation | none | Yes | `src/data/satellitePass.js`; voice `next_satellite_pass`, `next_iss_pass`; MCP `next_satellite_pass` | VERIFIED |
| satellites_overhead tool | What is above a place | local | none | Yes | `src/tools/queries/space.js` | VERIFIED |
| ISS and Tiangong 3D models | Models near the station | NASA (public domain), project-made | none | Yes | `public/models/iss.glb`, `tiangong.glb` | VERIFIED |
| ISS live telemetry | Solar-array angles etc. from NASA ISSLive | NASA via Lightstreamer | `ISS_TELEMETRY_ENABLED=1` | Off | `server/providers/space/issTelemetry.js`, `/api/iss-telemetry` | VERIFIED |
| ISS live video | Two NASA YouTube streams | NASA | none | On demand | `src/ui/views/panels/StationPanel.vue` | DOC-ONLY |
| Space Missions / launches | Rolling 30-day launches with payload, stage and recovery; replay overlay | Launch Library 2 | `LL2_API_TOKEN` optional paid | Off* | `src/layers/launches/`, `server/providers/space/launch-library.js`, `/api/launches` | VERIFIED |
| Mission roster/replay | Panel and replay of a launch | LL2 | none | On demand | `src/ui/views/panels/MissionRoster.vue`, `MissionReplayOverlay.vue` | VERIFIED (files) |
| Orbital cockpit view | Cockpit-style view of a satellite, focus, signals | local | none | On demand | `src/ui/cockpitOrbitalView.js`, `src/ui/views/panels/CockpitOrbital.vue` | VERIFIED (files) |
| Satellite ground view | Ground footprint | local | none | On demand | `src/ui/views/panels/SatelliteGroundView.vue` | VERIFIED (file) |
| Imaging sensor pack | Sensor specs for imaging satellites | bundled | none | Yes | `src/data/imagingSensors.js`, `src/data/local_data/imaging_sensors` | DOC-ONLY |
| get_recent_launches tool | Launch queries | LL2 | none | Yes | `src/tools/queries/space.js` | VERIFIED |

## Weather, wind, cyclones and hazards
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| Wind layer | Animated 10 m forecast wind; optional temperature/pressure colour field; reading at map centre | NOAA GFS (public domain) or ECMWF IFS (CC BY 4.0) | none | Off* | `src/layers/wind/`, `server/providers/wind/gfs.js`, `ifs.js`, `/api/wind`, `/api/wind/grid/` | VERIFIED |
| Rain radar | MRMS reflectivity, contiguous US, replayable | NOAA nowCOAST | none | Off* | `src/layers/weather/`, `/api/weather/tile`, `/api/weather/image` | VERIFIED (routes) |
| Satellite clouds | GOES regional/global infrared, Clouds-only or full image | NOAA nowCOAST | none | Off* | `src/layers/weather/infraredImage.js` | VERIFIED (file) |
| Lightning density | 15-minute strike density, Americas and Pacific | NOAA nowCOAST (Vaisala-derived) | none | Off* | `src/layers/weather/` | DOC-ONLY |
| Weather timeline | Scrub observed layers backwards, Play, Latest | NOAA | none | On when a time layer is on | `src/layers/weather/clock.js`, `src/ui/views/panels/WorldTimeline.vue` | VERIFIED (component) |
| Cyclones | NHC/CPHC positions, tracks and cones (Atlantic, E/C Pacific only) | NOAA NHC/CPHC | none | Off* | `src/layers/cyclones/`, `server/providers/cyclones.js` | VERIFIED |
| Weather on 3D tiles | Observed layers as translucent shells above city | local | none | Yes | `src/layers/weather/shellRendering.js` | VERIFIED (file) |
| Air quality (AQHI) | Live Canadian AQHI, readout card (Canada only) | ECCC MSC GeoMet | none | Off* | `src/layers/airQuality/`, `src/app/layers/airQuality.js` | VERIFIED (dirs) |
| Cockpit local weather + effects | Local weather and cloud/rain effects | Open-Meteo (CC BY 4.0) | none | In cockpit | `server/providers/regional/weather.js`, `/api/weather-effects` | VERIFIED (route) |
| get_weather, get_weather_map, get_wind, get_cyclones | Tools | above | none | Yes | `src/tools/queries/environment.js`, `atmosphere.js` | VERIFIED |
| Earthquakes (24 h) | Global quakes; ripple animation | USGS | none | Off* | `src/layers/earthquakes/`, `src/app/layers/earthquakeRipples.js` | VERIFIED |
| Active Fires | FIRMS detections trailing 24 h; empty with "KEY REQUIRED" without key; heat raster/heatmap | NASA FIRMS | `FIRMS_MAP_KEY` (free) | Off*, key | `src/layers/firms/`, `server/providers/firms.js` | VERIFIED (.env.example note) |
| Fire Perimeters | Interagency boundaries and containment, InciWeb links | NIFC WFIGS | none | Off* | `src/layers/perimeters/`, `server/providers/firePerimeters.js` | VERIFIED |
| Volcanoes, disaster alerts, EONET, NWS alerts, GDACS | Optional datasets | Smithsonian GVP (non-commercial), GDACS, NASA EONET, NWS | none | Library, off | `src/library/entries/gvp-holocene-volcanoes.json`, `gdacs-disaster-alerts.json`, `nasa-eonet-events.json`, `nws-active-alerts.json` | VERIFIED (file names) |
| Surface water, geology, Black Marble | Raster/tile datasets | JRC, Macrostrat, NASA | none | Library, off | `src/library/entries/` | VERIFIED (file names) |
| get_earthquakes, get_active_fires, get_fire_perimeters | Tools | USGS/FIRMS/NIFC | `FIRMS_MAP_KEY` | Yes | `src/tools/queries/hazards.js`, `environment.js` | VERIFIED |

## Earth observation and imagery
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| Recent Imagery layer | Draw a box, fetch recent HLS Sentinel-2/Landsat or VIIRS scenes, drape on terrain | NASA GIBS + CMR | none | Off* | `src/layers/recentImagery/`, `src/ui/imageryBoxTool.js` | VERIFIED (files) |
| get_recent_imagery tool | Returns imagery for a place | NASA | none | MCP only | `src/tools/queries/imagery.js` | VERIFIED |
| Statewide / county / national orthophoto tiles | ~50 US state/county, Bayern, NRW, France IGN, Japan GSI, Estonia, NSW, NAIP | many gov | none | Library, off | `src/library/entries/*-imagery*.json` | VERIFIED (file names) |
| Norway map layers | Topo, cadastre, depth, hillshade, charts, terrain relief | Kartverket CC BY 4.0 | none | Library, off | `src/library/entries/kartverket-*.json` | VERIFIED (file names) |
| Infrastructure datasets | EIA power plants, EPA Superfund, TRI, FEMA structures, bridges (NBI), EPC England | US gov, UK gov | none | Library, off | `src/library/entries/` | VERIFIED (file names) |
| Biodiversity | GBIF occurrence density tiles | GBIF | none | Library, off | `src/library/entries/gbif-occurrence-density.json` | VERIFIED |
| Blender camera export | Camera-only USD (.usda) from a saved scene | local | none | CLI | `tools/export-blender-camera.mjs`, `docs/BLENDER-CAMERAS.md` | VERIFIED |

## Geopolitics, conflicts and news
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| News layer: Conflicts | Last 24 h violence events, one report per story, categories incl. alert | GDELT 2.0 events + GKG | none | Off* | `src/layers/news/`, `server/providers/news/gdeltEvents.js`, `news/categorize.js` | VERIFIED (files) |
| Liveuamap mapped items | Extra mapped conflict reports (paid API) | Liveuamap | `LIVEUAMAP_API_KEY` | Opt-in | `server/providers/news/keyed.js` | VERIFIED (env in .env.example) |
| News layer: Local | Day's news of the country at view centre, outline and name | World News API (caching needs their written permission) | `WORLDNEWSAPI_KEY`, `WORLDNEWSAPI_DAILY_READS` | Opt-in | `server/providers/news/` | VERIFIED (.env.example) |
| External news server | Forwards `/api/news/*` to your own server | operator | `GEV_NEWS_ORIGIN` | Opt-in | `server/providers/news/upstream.js` | VERIFIED |
| News panel | 12/6/3/1 hour windows, picture cards | as above | none | Right rail | `src/ui/newsPanel.js` | DOC-ONLY |
| Regional brief | Cockpit regional headlines | Google News RSS (primary), GDELT DOC 2.0 | none | In cockpit | `server/providers/regional/news.js`, `briefing.js`, `/api/regional-brief` | VERIFIED |
| S2 GhostMaps layer | Intel-style KMZ products (CIP, 30-day kinetic) from S2 Underground GitHub repo; polled | S2 Underground (CC BY-NC-SA 4.0) | `GHOSTMAPS_POLL_SECONDS` | Off* | `src/layers/ghostMaps/`, `server/providers/ghostMaps.js` | VERIFIED |
| Mapped military installations | Viewport OSM military sites, labelled incomplete | OSM/Overture | none | Off* | `src/layers/installations/`, `server/providers/military-installations.js` | VERIFIED |
| Military names pack | Names for military areas | Overture, OSM | none | Yes | `scripts/build-military-names.py`, `src/data/militaryNames.js` | DOC-ONLY |
| Bhote Koshi flood scene | Nepal 2026 flood replay: path, witness sources, imagery; bundled data non-commercial | bundled | none | Scene | `src/data/bhoteKoshi*.js`, `public/events/bhote-koshi-2026`, `get_bhote_koshi_flood` tool | VERIFIED |
| find_military_installations, military_awareness | Tools | OSM / feeds | none | Yes | `src/tools/queries/environment.js`, `brief.js` | VERIFIED |
| Port disruptions, chokepoints | Trade-chokepoint overlays | IMF PortWatch | none | Library, off | `src/library/entries/imf-portwatch-*.json` | VERIFIED |
| Sanctions, borders disputes, elections | Not found as dedicated features | | | | | see Absent |

## Finance and economy
Absent. grep for `finance` found 0 files in `src/`, `server/`, `scripts/`. `market`/`stock` hits are unrelated words (OSM `marketplace` preset, `stock` as in a stock icon). Nearest items: IMF PortWatch chokepoint datasets and EIA power plants in the Data Library (VERIFIED file names). No tickers, FX, commodities, crypto.

## People and organisations
Absent by policy. README "The line" states the project does not build named-person search, face recognition or individual tracking and will not merge PRs that cross that line (DOC-ONLY, README.md "Responsible & Open"). grep `vip` = 0 files. The word `person` appears in 93 files but as generic text, not a feature. Nearest items: satellite owner flags (`src/ui/ownerFlag.js`, VERIFIED), aircraft registrations via adsbdb, ALPR camera locations (no plates).

## Infrastructure (cables, power, rail, transit, bikes)
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| Submarine cables | 712 cable lines, bundled; CC BY-NC-SA (NonCommercial) | TeleGeography | none | Off* | `src/layers/submarineCables/`, `src/data/local_data/telegeography_submarine_cables`, `find_submarine_cables` tool | VERIFIED |
| Datacenters | 4,352 bundled sites | bundled | none | Off* | `src/data/local_data/datacenters`, layer id `local-datacenters` | VERIFIED (files) |
| Dams | 706 bundled | bundled | none | Off* | `src/data/local_data/dams/dams.geojsonl`, layer id `local-dams` | VERIFIED |
| Infrastructure queries | find_infrastructure | bundled | none | Yes | `src/tools/queries/infrastructure.js` | VERIFIED |
| Reserved id `local-firms` | Layer id reserved in the state ledger | bundled | none | n/a | `src/data/layerStateTokenReservations.json` | VERIFIED (id only) |
| Traffic | Simulated vehicles on OSM roads; TomTom live flow drives speeds and congestion below ~8 km | TomTom + OSM | `TOMTOM_API_KEY`, `TOMTOM_DAILY_TILE_BUDGET` (default 6000/day) | Off* | `src/layers/traffic/`, `server/providers/traffic.js`, `/api/tomtom` | VERIFIED |
| Transit | Live buses, trams, metros, ferries with delayed playback and trails; 53 feed entries (Boston, Austin, Minneapolis, Helsinki, Netherlands, Norway, SE Queensland, Cairns, Rio, Poland, Lisbon, Prague, Bucharest, Rome, Turin, Venice, Canada, ...) | agency GTFS-RT/SIRI | none | Off* | `src/data/transitFeeds.js`, `server/providers/transit.js`, `/api/transit` | VERIFIED (counted id strings) |
| Transit history | 15 minutes of recent positions | MBTA etc. | none | Yes | `server/providers/transitHistory.js` | DOC-ONLY |
| Rail | Live trains from about 27-30 keyless operator feeds in US, Canada, Australia, Ireland, Finland, Spain, Norway, Malaysia, Japan, France; optional route/schedule packs | agencies | none (`RAIL_PATHS_DIR`) | Off* | `src/data/railFeeds.js`, `server/providers/rail.js`, `/api/rail` | VERIFIED (27 id strings; README says 30) |
| Bikeshare | Live GBFS station availability, dozens of systems | GBFS operators | none | Off* | `src/data/bikeshare.js`, `server/providers/gbfs.js`, `/api/gbfs` | VERIFIED |
| Radio | Geolocated world radio, tuner across up to 750 stations; priority countries | Radio Browser | `RADIO_PRIORITY_COUNTRIES` | Off* | `src/layers/radio/`, `server/providers/radio.js`, `/api/radio` | VERIFIED |
| Directions | Click A and B for drive/walk/cycle route with steps; fly along it | OSRM on FOSSGIS | none | Utilities panel | `src/layers/directions/`, `/api/route` | VERIFIED |
| OSM Places | Voice place search ("hospitals in Kathmandu") with about 50 presets | OSM via Overpass | `OVERPASS_UPSTREAMS` | Off without own Overpass | `src/layers/osmPlaces/`, `src/data/osmPresets.js`, `/api/overpass`, `/api/osm/features` | VERIFIED |
| get_traffic_flow, get_bike_share, get_transit_vehicles, find_radio_stations, plan_route, get_map_features | Tools (the middle four are off for MCP) | as above | none | Yes | `src/tools/queries/mobility.js`, `media.js`, `places.js` | VERIFIED |

## Places, search and geocoding
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| Omnibar | One box parses a line into clauses: place, layers on/off, style, HUD, map stack, camera move, radio, cockpit, nearest aircraft, follow | local | none | Yes | `src/ui/omnibarIntent.js`, `Omnibar.vue` | VERIFIED |
| Coordinate / `geo:` search | Decimal and `geo:` URI, no geocoder request | local | none | Yes | `src/search/coordinateParser.js`, `coordinateGeocoder.js` | VERIFIED |
| Plus codes | Full Open Location Codes | local | none | Yes | `src/search/plusCode.js` | VERIFIED |
| UTM / MGRS | Grid references | local | none | Yes | `src/search/gridReference.js` | VERIFIED |
| Bundled city and landmark presets | Fly with no network | Wikidata/Natural Earth | none | Yes | `src/search/presetGeocoder.js`, `src/cityPois.js` | VERIFIED |
| Photon | Keyless place search fallback | komoot | `PHOTON_URL` | Yes (public) | `src/search/photonSetting.js` | VERIFIED |
| Nominatim | Last-resort search and voice outlines; off unless configured | OSM | `NOMINATIM_URL`, `NOMINATIM_DAILY_CAP` (50) | Opt-in | `src/search/nominatim.js`, `server/providers/regional/nominatimCache.js` | VERIFIED |
| Google geocode / places | Place search, nearby places, reverse geocode | Google | `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_SERVER_API_KEY`, `GEV_RATELIMIT_GOOGLE_PER_MIN` | Opt-in | `server/providers/places/`, `/api/google/*` | VERIFIED |
| Geocode proxy and outlines | `/api/geocode`, `/api/geocode/outline` | OSM | none | Yes | `server/providers/regional.js` | VERIFIED (route) |
| Wallet-phrase guard | Blocks a typed 12/24-word recovery phrase from leaving the browser | BIP39 list | none | Yes | `src/search/bip39Words.js` | VERIFIED |
| Alps correction | "Alps" means the range | local | none | Yes | `src/search/alpsGeocoder.js` | VERIFIED |
| Layer finder / section index | Find a layer by name | local | none | Yes | `src/ui/views/panels/LayerFinder.vue` | DOC-ONLY |
| search_places / places_nearby / get_terrain_height | Tools (first two off for MCP) | Google / terrain | key | Yes | `src/tools/queries/places.js`, `environment.js` | VERIFIED |
| resolve_area (voice) | Resolve a named area to a polygon | OSM outlines | none | Yes | `src/voice/areaActions.js` | VERIFIED (tool name) |

## Time, history and replay
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| World clock | One time for every layer; live or cursor | local | none | Live | `src/time/worldClock.js` | VERIFIED |
| World timeline bar | Play/pause, speeds real-time, 1 min/s, 1 h/s, 1 d/s, 1 wk/s, scrub, ticks for launches and quakes; hidden when only live feeds are on | local | none | Hidden | `src/ui/views/panels/WorldTimeline.vue` | VERIFIED |
| Snapshot timeline | Loads snapshots for followers of the clock | feeds | none | Yes | `src/time/snapshotTimeline.js` | VERIFIED (file header) |
| Observed weather history | Step back through radar/clouds/lightning | NOAA | none | Yes | `src/layers/weather/clock.js` | VERIFIED (file) |
| Vessel recent paths | 64 fixes per MMSI, in-memory only | AIS | none | Yes | `ais-store.js` | VERIFIED |
| Transit 15-min history | Recent positions | agencies | none | Yes | `transitHistory.js` | DOC-ONLY |
| Long-term history | Not offered; README says the present is the cheap part and points to a hosted product | n/a | n/a | Absent | `README.md` "What's Next" | DOC-ONLY |
| Director scenes (timed camera tours) | Authored shots, moves, holds, packs | local | none | Yes | `src/director/`, `src/scenes/`, `docs/DIRECTOR*.md` | VERIFIED (dirs) |
| Stories | Shipped scenes with an Explore feed and 60 s idle tour | local | none | Yes | `src/stories/`, `src/ui/views/StoriesView.vue` | VERIFIED |

## AI chat, voice and agent tools
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| OpenAI Realtime voice | Speak to the globe; server mints short-lived client secret | OpenAI | `OPENAI_API_KEY` (billed) or Codex OAuth; `OPENAI_REALTIME_MODEL` etc. | Opt-in | `server/providers/openai/realtime.js`, `/api/realtime/token` | VERIFIED |
| Cheaper MINI voice tier | Toggle in mic panel | OpenAI | `OPENAI_REALTIME_MODEL_MINI` | Opt-in | `.env.example` | VERIFIED |
| Gemini Live voice | Alternate provider selected in the mic panel | Google Gemini | `GEMINI_API_KEY`, `GEMINI_LIVE_MODEL` | Opt-in | `server/providers/gemini/realtime.js`, `/api/gemini/token` | VERIFIED |
| Typed chat | Chat with the same tools via Chat Completions or Gemini generateContent | OpenAI / Gemini | `OPENAI_CHAT_MODEL`, `GEMINI_CHAT_MODEL` | Opt-in | `server/providers/openai/chat.js`, `gemini/chat.js`, `/api/openai/chat`, `/api/gemini/chat` | VERIFIED |
| ChatGPT/Codex OAuth | Use a signed-in local Codex session instead of a key (`GEV_PREFER_CODEX_OAUTH` forbids API-key sessions) | OpenAI | none | Opt-in | `server/providers/openai/codex-auth.js`, `/api/realtime/oauth-login` | VERIFIED |
| HUD AI summary | One-line summary of the view every ~15 s | OpenAI | `OPENAI_HUD_SUMMARY_MODEL` | Opt-in | `server/providers/openai/hud-summary.js`, `/api/openai/hud-summary` | VERIFIED |
| Rate limits per IP | Throttles on voice, chat, Google, Gemini | local | `GEV_RATELIMIT_OPENAI_PER_MIN`, `_OPENAI_CHAT_`, `_GEMINI_`, `_GEMINI_CHAT_`, `_GOOGLE_` | Yes | `server/providers/openai/rate-limit.js`, `common/rate-limit.js` | VERIFIED |
| Voice cost meter and cap | Counts session cost | local | none | Yes | `src/voice/voiceCost.js` (named in .env.example) | DOC-ONLY |
| Voice debug log | Rotated JSONL, content omitted unless `GEV_VOICE_LOG_CONTENT` | local | `GEV_VOICE_LOG_CONTENT` | Yes | `server/providers/openai/debug-log.js`, `/api/realtime/debug-log` | VERIFIED |
| Point-and-ask / pointer context | Ask about what the cursor points at; pointer crop | local | none | Yes | `src/voice/pointerContext.js`, `pointerPick.js` | VERIFIED (files) |
| Chat attachments | Attach images/files to chat | local | none | Yes | `src/voice/chatAttachments.js` | VERIFIED (file) |
| Voice inactivity timeout | `set_voice_inactivity_timeout` | local | none | Yes | `src/voice/panel/inactivity.js` | VERIFIED |
| Voice app actions (36) | adjust_camera_zoom, analyst_query, annotate_map, clear_annotations, control_cctv, control_cockpit, control_radio, control_scene, find_imagery, fly_route, fly_to_location, frame_overhead, get_current_view_state, get_entity_context, move_camera, next_iss_pass, next_satellite_pass, open_stories, osm_query, resolve_area, select_nearest_aircraft, set_context_mode, set_cyber_sonar, set_detection, set_hud, set_layer_visibility, set_map_stack, set_panel_open, set_post_processing, set_visual_style, set_voice_inactivity_timeout, show_data_layers_menu, show_street_level, stop_tracking, track_entity, zoom_to_globe | the app | none | Yes | `src/voice/actionSchemas.js`, `src/voice/gevActions.js`, `server/providers/openai/tools.js` | VERIFIED (names) |
| Catalog tools given to voice (25) | The 40 core tools minus 15 voice-off (see MCP section) | as above | none | Yes | `server/standalone/voiceTools.js`, `src/tools/surfaces.js` | VERIFIED |
| Analyst answers | Count, filter and rank satellites, datacenters, dams, flights, ships, fires, quakes; says when a feed is stale | loaded layers | none | Yes | `src/data/analystEngine.js`, voice `analyst_query` | VERIFIED (file/name) |
| World packet for agents | Snapshot of the world for AI context | local | none | Yes | `src/agent/worldPacket.js` | VERIFIED (file) |
| Context modes (Global Context) | One switch stages the full situational picture and restores the view after | local | none | Off | `src/contextModePolicy.js`, voice `set_context_mode` | VERIFIED |
| Provider Settings / POWER UP | In-app form that writes keys into the checkout's `.env` and restarts the dev server; localhost-only | n/a | n/a | Yes | `server/standalone/key-setup.js`, `src/keySetup.js`, `/api/setup/keys`, `/api/setup/status` | VERIFIED |

## MCP and API
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| MCP server over stdio | `node server/mcp/stdio.js --api-base http://localhost:4173` for Claude Code, Codex, Claude Desktop | the running app | none | Opt-in | `server/mcp/stdio.js`, `docs/MCP_SETUP.md` | VERIFIED |
| MCP over HTTP at `/mcp` | Stateless HTTP transport mounted in the dev/preview server | the running app | none | Yes | `server/mcp/plugin.js`, `src/tools/mcp/http.js` | VERIFIED |
| MCP Apps panel | Renders the globe inside a chat via `ui://gods-eye-view/globe`; `panel_request` relays paths with a per-page key | the app | none | Opt-in (`npm run build:panel`) | `src/tools/globePanel.js`, `server/mcp/panelKey.js`, `src/tools/queries/panelRequest.js` | VERIFIED |
| MCP tools (30) | situation_brief, military_awareness, find_aircraft, aircraft_in_area, get_aircraft_track, get_aircraft_info, vessels_in_area, find_vessel, get_vessel_track, satellites_overhead, next_satellite_pass, get_recent_launches, get_earthquakes, get_active_fires, get_fire_perimeters, get_cyclones, get_weather_map, get_recent_imagery, find_cctv_cameras, get_cctv_snapshot, find_alpr_cameras, find_submarine_cables, find_infrastructure, find_military_installations, get_map_features, get_terrain_height, get_traffic_flow, get_bhote_koshi_flood, show_in_gods_eye_view, panel_request | per tool | `FIRMS_MAP_KEY` for fires | Opt-in | `src/tools/index.js`, `src/tools/surfaces.js` | VERIFIED (40 minus 10 off) |
| Tools off for MCP (10) | search_places, places_nearby, plan_route, get_weather, get_wind, get_regional_brief, find_radio_stations, get_bike_share, get_transit_vehicles, get_hud_caption | | | | `src/tools/surfaces.js` | VERIFIED |
| Tools off for voice (15) | show_in_gods_eye_view, panel_request, next_satellite_pass (voice has an action), get_weather_map, get_recent_imagery, get_cctv_snapshot, get_hud_caption, aircraft_in_area, vessels_in_area, find_aircraft, find_vessel, get_earthquakes, get_active_fires, find_infrastructure, satellites_overhead | | | | `src/tools/surfaces.js` | VERIFIED |
| Share links as tool output | show_in_gods_eye_view builds a view URL (camera, layers, style, map, follow, annotations, street_level) | | none | Yes | `src/tools/queries/share.js`, `src/view/index.js` | VERIFIED |
| Embed mode | `?embed=1` shows only the globe; parent posts `gev:view`, app replies `gev:view-applied`, `gev:ready`; framing allowed only by `GEV_EMBED_FRAME_ANCESTORS` | | `GEV_EMBED_FRAME_ANCESTORS` | Off | `src/app/embed.js`, `build/embed-framing.js` | VERIFIED |
| API routes (local server) | /api/acartia, adsbdb, cctv (+frame, media), celestrak, celestrak-satcat, cyclones, drone-airspace, fire-perimeters, firms, flights (+track), gbfs, gemini/chat, gemini/token, geocode (+outline), ghostmaps, gnss-integrity, google/{geocode,nearby-places,reverse-geocode,text-search,tiles-token}, inaturalist, iss-telemetry, launches, library, local-receivers/aircraft, mapillary/{status,tiles}, military (+track), military-installations, news, openai/{chat,hud-summary}, osm/features, overpass, radio, rail, realtime/{token,debug-log,oauth-login,oauth-status}, regional-brief, route, setup/{keys,status}, shipwrecks, terrain/heights, tomtom (+flow), transit, vessels, weather (+image,tile), weather-effects, wind (+grid), /mcp | | | Yes | `server/providers/local.js`, `server/standalone/api-not-found.js` | VERIFIED (grep of route strings) |
| Unknown /api routes | Return a JSON not-found | | none | Yes | `server/standalone/api-not-found.js` | VERIFIED (file) |
| Public hosted API | None; the project says a hosted product is "coming" | n/a | n/a | Absent | `README.md` "What's Next" | DOC-ONLY |

## Annotations, drawing, measurement and sharing
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| Voice whiteboard / annotate_map | Pins, highlights, area outlines, arrows, routes, labels at place names or coordinates | OSM outlines (Nominatim/Photon) | none | Yes | `src/annotations/`, `src/voice/actionSchemas.js` | VERIFIED |
| Draw tool | User draws marks, swatches, mark list | local | none | Utilities panel | `src/annotations/drawTool.js`, `src/ui/views/panels/DrawControls.vue` | VERIFIED |
| Hybrid world/screen renderers | World-space and screen-space annotation drawing | local | none | Yes | `src/annotations/hybridAnnotationRenderer.js` | VERIFIED (file) |
| Region outlines | Real boundary polygons for named places | OSM, admin boundary packs | none | Yes | `src/annotations/outlineRungs.js`, `src/data/adminBoundaries.js` | VERIFIED (files) |
| File import | GeoJSON, JSON, KML, KMZ, GPX; 50 MB file cap, 12 files, 250,000 vertices, KMZ inflate cap 120 MB | user file | none | Utilities panel | `src/data/geoFileImport.js`, `src/ui/views/panels/GeoImport.vue` | VERIFIED (limits read in code) |
| Measurement | Route distances and distance formatting; no dedicated ruler/area tool found | local | none | n/a | `src/data/distanceFormat.js`, `src/layers/directions/` | VERIFIED (files); absence of a ruler is a grep-level finding |
| Share links, long form | `#v=2&lat=...` state in address bar | local | none | Yes | `src/sharelink.js` | VERIFIED |
| Share links, short form | `/share/<code>` base64url with CRC-8, 39 chars typical; place or thing view (follows aircraft/satellite/vessel) | local | none | Yes | `src/share/viewCodec.js`, `docs/SHARE-LINK-FORMAT.md` | VERIFIED |
| Director project export/import | Scene JSON and `.gevbundle.json` bundles with preview before apply | local | none | Authoring panel | `src/director/sharing/bundle.js`, `docs/DIRECTOR-SHARING.md` | VERIFIED (files) |
| Blender camera export | See Earth observation | | | CLI | `tools/export-blender-camera.mjs` | VERIFIED |
| Picked-entity context cards | Card for a selected aircraft, vessel, camera etc. with Find it | local | none | Yes | `src/ui/stores/entityCard.js`, `src/data/entityContext.js` | VERIFIED |

## Recording, export and download
Mostly absent. What exists:
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| Recording mode | Not a recorder: hides panels, sets minimal HUD, draws a 16:9 or 9:16 safe frame so the user can screen-record | local | none | Off | `src/ui/recordingControls.js` | VERIFIED |
| Director project file export | JSON and bundle downloads | local | none | Authoring | `src/director/sharing/bundle.js` | VERIFIED (file) |
| Blender USD export | CLI | local | none | CLI | `tools/export-blender-camera.mjs` | VERIFIED |
| Data export (CSV/KML/GeoJSON out) | NOT FOUND; GeoJSON/KML/GPX only imported. `MediaRecorder` appears only in a conformance check, `toBlob` only in weather and render ports | n/a | n/a | Absent | grep, see Absent | VERIFIED (grep) |

## Alerts and notifications
Absent as a product feature. No Notification API, `requestPermission`, `serviceWorker`, `PushManager`, e-mail, Telegram, SMS or webhook sender found (grep over `src/` and `server/`, empty output). In-app only: a news "alert" category (air-raid/drone alerts as channel notices, `src/layers/news/model.js:156`), emergency squawk highlight (`src/data/aircraftEmergency.js`), feed-degradation notices (`src/data/feedState.js`), toasts (`src/ui/toast.js`), and a GhostMaps watcher that polls GitHub because "there is no webhook" (`server/providers/ghostMaps.js:17`). No user geofence (the one `geofence` hit is a bikeshare dock-capacity field, `src/sources/gbfsStations.js:86`).

## Accounts, sign-in, quotas and ads
| Feature | What it does | Data source / provider | Key or paid (env var) | Default? | Where | Conf |
|---|---|---|---|---|---|---|
| User accounts / sign-in | NONE; local-first, state in the browser's localStorage (28 files use it: layer state `gev:layer-state:v2`, locale, library, first-run, scenes) | n/a | n/a | Absent | grep | VERIFIED |
| Key settings panel | Owner pastes provider keys; localhost only (trusted peers via `GEV_KEY_SETUP_TRUSTED_PEERS`) | n/a | n/a | Yes | `server/standalone/key-setup.js` | VERIFIED |
| Optional ChatGPT/Codex sign-in | Only for voice billing via local Codex login | OpenAI | n/a | Opt-in | `/api/realtime/oauth-login` | VERIFIED |
| Quotas | Per-IP request throttles (not billing caps), TomTom 6,000 tiles/day soft cap, Nominatim 50/day, World News 30 reads/day, iNaturalist budget | local | env names above | Yes | various | VERIFIED (env names) |
| Payments, subscriptions, plans | NOT FOUND (`stripe` only in a retro stripe style; `payment` only in a BIP39 word list and transit text) | n/a | n/a | Absent | grep | VERIFIED |
| Ads | No ad code seen in the files opened; not exhaustively grepped | n/a | n/a | Absent? | n/a | UNVERIFIED |

## Languages
| Feature | What it does | Where | Conf |
|---|---|---|---|
| UI languages | English + ar, de, es, fr, he, it, ja, pt, ru, sv, uk, zh-CN, zh-Hant (13 files) | `src/i18n/locales/*.json` | VERIFIED |
| Locale picker and URL override | `?lang=` and saved `gev:locale:v1` | `src/ui/views/panels/LocalePicker.vue`, `src/i18n/index.js` | VERIFIED |
| Right-to-left and CJK styles | Arabic/Hebrew, CJK CSS | `src/ui/styles/cjk.css` | DOC-ONLY (file name) |
| Voice language | The model answers in the user's language (OpenAI/Gemini); not separately configured | `server/providers/openai/instructions.js` | DOC-ONLY |
| Translator tools | `npm run i18n`, `docs/I18N.md`, `docs/TRANSLATORS.md` | `scripts/i18n.mjs` | VERIFIED (file) |

## Mobile and device support
| Feature | What it does | Where | Conf |
|---|---|---|---|
| Phone shell | Phone tab bar, bottom sheets, mobile shell | `src/ui/mobileShell.js`, `mobileSheets.js`, `PhoneTabBar.vue` | VERIFIED (files) |
| PWA manifest | Standalone display, icons incl. maskable | `public/manifest.webmanifest` | VERIFIED |
| Service worker / offline cache | NOT FOUND | grep `serviceWorker` empty | VERIFIED |
| Native apps | None (no iOS/Android code seen) | n/a | DOC-ONLY |
| Touch gestures | Pinch zoom (README) | `src/render/input` | DOC-ONLY |
| WebUSB SDR | Desktop Chromium only (WebUSB) | `src/sdr/usbDevices.js` | VERIFIED (file) |

## Offline or self-hosted deployment
| Feature | What it does | Where | Conf |
|---|---|---|---|
| Local dev/preview server | Vite server with provider middleware; the API proxies live in this server, so a pure static host cannot run the live layers | `server/standalone/vite.config.js` | VERIFIED |
| Docker and compose | Loopback-only port 4173, bind-mounted checkout | `Dockerfile`, `compose.yaml` | VERIFIED |
| Pinokio launcher | One-click install/start/update | `pinokio/*.js`, `scripts/pinokio-*.mjs` | VERIFIED (files) |
| Secure dev mode | `./scripts/dev-secure.sh` | `package.json` | VERIFIED |
| Offline with no internet | NOT supported: every live layer fetches upstream; only bundled data (cities, cables, datacenters, dams, 3D models, stars) works offline | n/a | derived |
| Binding | `HOST` default localhost, `PORT` 4173, `GEV_ALLOWED_HOSTS` | `.env.example` | VERIFIED |
| Node requirement | `>=24.14.0 <25 || >=26 <27` | `package.json` | VERIFIED |
| Caches | `.gev-cache/nominatim`, `.gev-logs` | `.env.example` | DOC-ONLY |

## Licence and usage restrictions of the data
GEV's code is MIT; the MIT grant does NOT cover third-party data (DATA_SOURCES.md top, DOC-ONLY). Items that bite a commercial, ad-supported site:
| Source | Restriction | Evidence |
|---|---|---|
| OpenSky | Non-commercial research/education licence | DATA_SOURCES.md (live table) |
| TeleGeography cables | CC BY-NC-SA 3.0, NonCommercial; delete folder for commercial use | DATA_SOURCES.md "TeleGeography is bundled but NonCommercial" |
| S2 GhostMaps | CC BY-NC-SA 4.0 | DATA_SOURCES.md |
| Smithsonian GVP volcanoes | personal, educational, non-commercial | Library table |
| iNaturalist | per-record licences, default CC BY-NC | DATA_SOURCES.md |
| Bhote Koshi scene data | bundled, non-commercial | README |
| FL511 | individual personal use only | `.env.example`, Library |
| NYC DOT | data-sharing agreement required | `.env.example` |
| Houston TranStar | no copying/redistribution without written permission | `.env.example` |
| Lithuania, Quebec video | photo/video licence unconfirmed; off by default | `.env.example` |
| World News API | caching needs prior written permission | `.env.example` |
| Liveuamap | paid API, operator's own subscription | DATA_SOURCES.md |
| Google 3D, Street View, Esri | proprietary ToS, billing | DATA_SOURCES.md |
| Cesium ion free plan | personal non-commercial | `.env.example` |
| OSM, adsb.lol, OpenFreeMap | ODbL 1.0 (share-alike on derived databases, attribution) | DATA_SOURCES.md |
| Mapillary, KartaView, Panoramax | CC BY-SA 4.0 imagery | DATA_SOURCES.md |
| FOSSGIS OSRM | 1 request/second, no heavy use, attribution | DATA_SOURCES.md |
| Disclaimer | "Do not use for flight or maritime navigation, emergency response ..." | README.md |

## Performance and limits
| Item | Value | Evidence |
|---|---|---|
| Startup (Apple M5, Chrome 150, 1440x900, 22 Aug 2026) | app ready median 604.9 ms; initial settle median 1,855.8 ms; JS heap about 105 MiB; 60 FPS motion and rest | docs/PERFORMANCE.md (DOC-ONLY, one machine) |
| Frame loop | display refresh while moving, 60 ticks/s parked | `src/renderGovernor.js` per docs text |
| AIS | server cache 50,000 vessels, stale after 30 min, 64 fixes per path; browser cap 12,000 rows, 900 labels | `ais-store.js`, `.env.example` VERIFIED |
| CCTV | 7,350 catalogue ceiling | `.env.example` |
| Flights | 11,000+ aircraft | README (DOC-ONLY) |
| Radio | up to 750 stations | README |
| Imports | 50 MB per file, 12 files, 250,000 vertices | `src/data/geoFileImport.js` VERIFIED |
| TomTom | 6,000 tile fetches/day soft cap | `.env.example` |
| Rate limits per IP | OpenAI 30/min, chat 30/min, Gemini 30/min, Google 120/min (all env-tunable, process-local, reset on restart) | `.env.example` |
| Tests | `npm test`, `test:perf`, many `qa:*` browser scripts (`scripts/qa-*.mjs`, about 150) | `package.json`, `scripts/` |
| Server is a dev/preview server, "not a hardened production service" | | README "Status" |

---

## Absent in GEV (searched, with file evidence)
grep was case-insensitive over `src`, `server`, `scripts`, `tools`, `index.html` (js, mjs, vue, html); test and qa scripts excluded from the file counts.
| Term | Result | Evidence |
|---|---|---|
| alert | FOUND, only as feed content: news category "alert", GTFS service alerts; not user alerts | `src/layers/news/model.js:156`, `src/data/gtfsRealtime.js`, `railTripUpdates.js` |
| notification | FOUND as the word only (state-change callbacks); no browser Notification | grep `new Notification(\|requestPermission` returned nothing |
| telegram | NOT FOUND | 0 files |
| email | NOT FOUND as feature; 5 files mention contact addresses/policy | `src/data/transitFeeds.js`, `src/layers/streetLevel/providers/panoramax/policy.js` |
| export | no data export; 1,605 files use ES `export`. User-facing exports: Director project, `.gevbundle.json`, Blender USD CLI | `src/director/sharing/bundle.js` |
| csv | FOUND as import parsing (FIRMS, space provider), not export | `src/data/firmsCsv.js` |
| kml | FOUND, import only (KML/KMZ) | `src/data/geoFileImport.js`, `geoImportFeatures.js` |
| gpx | FOUND, import only | `src/data/geoFileImport.js` (`GEO_FILE_ACCEPT`) |
| geofence | NOT FOUND as feature (bikeshare dock field only) | `src/sources/gbfsStations.js:86` |
| subscription | FOUND as websocket/data-feed subscriptions, not paid plans | `src/data/aisStreamAdapter.js` |
| login | FOUND only for OAuth to ChatGPT/Codex and radio ingest text | `src/keySetup.js:522` |
| account | NOT a feature; "account for" wording in code | grep |
| quota | FOUND as upstream/API quotas and local throttles | `.env.example` |
| payment | NOT FOUND (BIP39 word, transit feed text) | `src/search/bip39Words.js`, `src/data/transitFeeds.js` |
| stripe | NOT FOUND (CSS "stripe" in retro style) | `src/styles/retro.js` |
| recording | FOUND: screen-recording-friendly mode only, no capture | `src/ui/recordingControls.js` |
| history | FOUND: short recent paths and weather timeline, no archive | `server/providers/vessels/ais-store.js` |
| timeline | FOUND: world clock timeline bar | `src/ui/views/panels/WorldTimeline.vue` |
| finance | NOT FOUND | 0 files |
| stock | NOT FOUND as feature (word hits only) | grep |
| market | NOT FOUND as feature (OSM marketplace preset, rail text) | `src/data/osmPresets.js` |
| vip | NOT FOUND | 0 files |
| person | FOUND only as ordinary word; project policy forbids person tracking | README "The line" |
| risk zone | NOT FOUND | 0 files |
| SMS / webhook sender | NOT FOUND (webhook word only in a comment) | `server/providers/ghostMaps.js:17` |
| service worker / push | NOT FOUND | grep empty |
| Things a camera-directory user may expect | historic camera snapshots/timelapse, camera uptime or health history, per-camera permalink pages, SEO pages, sitemap | no files; this is an app, not a content site |
| Ads | no ad code seen in files opened; not exhaustively grepped | UNVERIFIED |

## Things I might have missed (code areas not opened)
- `docs/CURRENT-STATE.md` (926 KB): only the first 50 lines read; it is a dense behaviour log that would add small features.
- `server/providers/cctv/sources.js` (4,079 lines): not read except lines near 409-420; per-pack facts come from `.env.example` and DATA_SOURCES.md.
- `src/voice/gevActions.js` (6,287 lines) and `src/voice/actionSchemas.js` (1,110): only tool names read, not arguments or behaviour.
- `src/render/` (Cesium, contract, conformance, stub), `src/ui/` panels and Vue stores, `src/ui/views/stories/`, `src/director/`, `src/scenes/`, `src/stories/`, `src/layers/*/` internals (only filenames and headers).
- `src/library/entries/*.json` contents (read only file names and the DATA_SOURCES table); I named roughly 75 of the 96 entries.
- `config/*.json`, `public/events/`, `public/models/fleet/types.json`, `src/data/local_data/*` contents.
- `scripts/qa-*.mjs` (about 150 browser QA scripts; a useful feature list but unread), `TESTING.md`, `SECURITY.md`, `CHANGELOG.md`, `changelog.d/`, `CONTRIBUTING.md`, `docs/panel-surfaces.md`, `docs/UI-OWNERSHIP.md`, `docs/VUE-MIGRATION.md`.
- Rail feed count (27 id strings vs README "30"), transit feed count (53 id strings) and the GBFS system list were counted by regex, not enumerated.
- Which layers are on at first start was not checked per layer.
- Whether any layer works live on 2026-11-24 (every upstream could have changed).
- `gev/dist/` and `gev/node_modules` ignored. `gev/pinokio/` only listed.

## Parity-file check (`data/gev-parity.json`)
File: 4,500 rows, fields key, inventory, feature, category, where, evidence (plus status, ourUrl, reason, by). Inventory split: src 1,483; server 909; feat2 511; ui-gap 409; sources 300; feat-gap 289; ui-features 229; readme 209; files 98; mechanical 63. Categories include env-flag 247, panel 254, camera 166, layer 456, provider 127, mcp-tool 45, tool 115, voice-tool 36, chat-tool 36, url-param 120, shortcut 41, language 14, library-entry 96.

Sample: 40 rows, evenly spaced (row index i*4500/40 + 7). Checked each: (a) the cited file exists in `gev/`, (b) at least half of the evidence tokens appear in that file. Result: **40 of 40 matched** after allowing for rows whose `where` omits the `src/` prefix (5 rows, fixed by adding it), rows whose `where` is a README/DATA_SOURCES line number (4 rows, I opened those lines and the text matched), non-code assets (3 rows, file exists), and one `.d.ts`. 0 contradicted. The automatic pass alone matched 21 of 40 by token test and 29 of 40 on file existence; the rest were hand-checked. Caveat: this proves sampled rows point to real things, not that the 4,500 rows are complete (my own pass found details such as the 25 CCTV flags and 39 provider plugins that the sample did not test).
