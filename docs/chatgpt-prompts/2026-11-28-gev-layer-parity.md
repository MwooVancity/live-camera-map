# GEV layer parity check: did we port every free layer?

First restate in 3 lines what I am really asking.

## OWNER SAID
"Ask ChatGPT to read the GEV GitHub repo just to make sure we're not missing any layer and that we've ported GEV at the minimum, everything that we could, except for the paid shit. Paid. Like OpenSky."

## Goal
Money first (ads), inside truth and Google's rules. worldtrafficcameras.com /map/ must do at least everything God's Eye View (GEV) does, minus anything paid, non-commercial or licence-restricted.

## Facts (sources)
- Upstream: https://github.com/bilawalsidhu/gods-eye-view at commit aac6be77735f6bcad583204724a43302227abc4d (v0.3.0). Read README.md, DATA_SOURCES.md, .env.example and src/ yourself.
- Our repo (public): https://github.com/MwooVancity/live-camera-map. Route allowlist: data/proxy-allowlist.json. Static build script: ops/deploy/build-static-map.mjs.
- Today /map/ is a STATIC build of GEV (no /api/* routes). A server deploy (workflow server-deploy, GEV behind an allowlist proxy) is ready but not bought yet; owner buys it last.
- Seen working live 2026-11-27 on the static map: earthquakes, GDACS alerts (80), NASA EONET (~1.0K), Canada air quality, wildfire outlines (39), satellites (11.8K), space launches (26), Mapillary coverage, NASA FIRMS fires, 8,000 cameras. Not yet seen: NWS alerts count, NASA recent imagery (needs a drawn box), hurricanes (no active storms).
- Our gap table of every feature that does not work statically, with file:line, is ATTACHED (2026-11-27-gev-static-gaps-and-vps.md).

## Hard rules (verbatim)
- "Unknown commercial-use permission = disabled. OpenSky stays OFF until written commercial permission (ads count as commercial)."
- "TeleGeography stays in the checkout but must not ship in the public build or be reachable by any route."
- "Its files must NEVER be edited, deleted, renamed, reformatted or patched." (GEV upstream; new files and proxy config only)
- "if GEV says you can use it, then we should use it." (a source GEV's own data notes mark usable is imported on that basis)

## What I decided
Skip: OpenSky, TomTom, Google 3D/geocode, Cesium ion, OpenAI/Gemini voice, Liveuamap/World News API, submarine cables, Nepal pack, GhostMaps, iNaturalist, volcano library entry, Google News regional briefing, public Nominatim/Overpass, ISS telemetry, MCP panel, key setup. Do on the server: adsb.lol flights+military, aircraft enrichment, GNSS, AIS (free key), weather radar/clouds/lightning/effects, wind, transit, rail live feeds, GBFS bike share, GDELT news with disk cap, Data Library (minus NC), radio, terrain, Mapillary photos, Photon search. Later after licence read: OSRM directions, CCTV frames.

## My question
Read the GEV repo (README, DATA_SOURCES.md, .env.example, src/ layer registry and server routes). (1) List every GEV layer, panel or feature that is NOT in my attached table or my "seen working" list. (2) For each item I put in "skip", say if I am wrong (it is actually free and commercial-OK per GEV's own notes). (3) Anything that works in the static build that I have not listed as seen? If my list is complete, say "nothing missing".

## Answer format
Table: GEV feature | file in GEV repo | in my list? (yes/no) | free/paid/NC per GEV's notes | my call right? | fix. Mark anything you could not open "could not open". Mark guesses GUESS.

GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
