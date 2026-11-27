# GEV full read, 2026-11-27 (evidence; the plan is plan.md)

Five read-only agents read all of gev/README.md (to line 729), gev/DATA_SOURCES.md (to 745), gev/docs/CURRENT-STATE.md (1-10178, two halves),
every folder in gev/src/layers and gev/src/library (96 entries by script), and the UI, tools, stories, search and share code.
Statuses come from code reading; "seen live" only where a browser test is noted in plan.md.

## Works on the static map (no server)
Cameras (24k link-only), Satellites (CelesTrak 3-hour copies), Space Missions, Earthquakes, Fire Perimeters, Restricted Airspace,
Shipwrecks, Cyclones (copy; no storms today), Air quality (Canada), Recent Imagery (NASA, draw a box), Data Library: GDACS, EONET,
NWS alerts + 54 browser-direct entries with enabled rows (opened 2026-11-27; GBIF stays closed), Datacenters, Dams, simulated
Traffic on OpenFreeMap roads, Mapped Installations via tiles (static "unavailable" answer added), Draw, Import, Director/scenes,
visual styles 1-6, HUD readouts, detection overlay, scope, tilt/north up/reset, share links (hash; /share/ path fixed 2026-11-27),
14 languages, Stories shell (Orbital Watch, Thermal Threat Board work; flight stories play empty), keyboard shortcuts, credits.
Street Level KartaView and Panoramax: hosts opened 2026-11-27 (Panoramax photo instances are an open set; some may stay blocked).
Wildlife: Acartia copy added; the iNaturalist half is non-commercial and stays off.

## Could work with more free work
- Wind: default GFS only, as a 3-hour manifest + grid copy (other models and overlays fail by design of the client check).
- Place search for any city: Photon (photon.komoot.io, ODbL, fair use, no heavy use) needs a licence row and privacy line; or a server.
- InciWeb links on fire perimeters: a copy of /api/fire-perimeters/inciweb/index (path conflicts with the file; needs a folder layout).
- Sea Marks (tiles.openseamap.org), Ski Pistes (www.opensnowmap.org, bans bulk use): rows exist? check, then CSP hosts.
- Vessel and aircraft photos (openvesselphotos.org, api.planespotters.net): only matter once vessels/flights exist.
- Radio directory copy: audio needs media-src for every broadcaster host; skip.
- ALPR (tiles.dontgetflocked.com): no licence row; add one from the OSM ODbL note or leave off.
- FIRMS active fires: needs the key in the build step and a licence row (none exists).
- Remaining GEV branding: logo.svg/icons, first-run card links to the GEV author.

## Needs a server or a key (not free)
Live flights (OpenSky off by rule; adsb.lol needs a server), Military flights, GNSS, Vessels (AISStream key + websocket),
Observed weather (radar, clouds, lightning), Transit, Rail, Bike share, Directions (OSRM; commercial limits), OSM Places,
News, terrain heights (degrades quietly), voice and chat (OpenAI/Gemini keys), MCP panel, Mapillary, cockpit weather/news.

## Must stay off (licence)
Submarine cables (TeleGeography, CC BY-NC-SA), Nepal flood story (CC BY-NC; stubbed out 2026-11-27), S2 GhostMaps (NC),
iNaturalist (NC), GBIF (NC), TomTom live flow, Google 3D/Street View, Cesium ion (non-commercial), Smithsonian volcanoes,
IMF PortWatch, opt-in camera packs (NYC, FL511, Houston, Lithuania, Giroc), World News API cache, Google News RSS.
