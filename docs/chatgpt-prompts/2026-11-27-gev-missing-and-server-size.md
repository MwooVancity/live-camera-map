# Gemini / Claude deep research: what is still missing from God's Eye View, and is one small server enough?

First restate in 3 lines what I am really asking.

## OWNER SAID
"U sure u don't need more? What else is missing from gev? Ask Gemini and Claude to deep research as well as a fresh spawn running deep research skill"

## Goal
Money first: a free, ad-funded world traffic camera site (worldtrafficcameras.com) that embeds the open-source God's Eye View (GEV) map, https://github.com/bilawalsidhu/gods-eye-view (public repo). We want every GEV feature our visitors can legally get, for the least monthly cost.

## Situation (facts, with sources)
- Today GEV runs as a STATIC build on Cloudflare Pages: no server. Some /api routes are copied at build time every 3 hours (cyclones, fire perimeters, drone airspace, shipwrecks, wind, launches, satellites, NASA FIRMS fires).
- Keys we hold: Mapillary client token (browser), NASA FIRMS map key (build time), AISStream key (needs a server: GEV SECURITY.md says "Server only").
- OpenSky flights OFF: ads count as commercial use; their commercial licence is paid.
- GEV's .env.example lists these keys/settings: AISSTREAM_API_KEY, CESIUM_ION_TOKEN, FIRMS_MAP_KEY, GEMINI_API_KEY, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_SERVER_API_KEY, LIVEUAMAP_API_KEY, LL2_API_TOKEN, MAPILLARY_CLIENT_TOKEN, NOMINATIM_URL, ONTARIO_511_API_KEY, OPENAI_API_KEY, OPENSKY_CLIENT_ID/SECRET, OVERPASS_UPSTREAMS, PHOTON_URL, RAIL_PATHS_DIR, TOMTOM_API_KEY, WORLDNEWSAPI_KEY, plus many CCTV_* source switches.
- Planned purchase: one Hetzner CX22 (2 vCPU, 4 GB RAM? or 2 GB — please check current spec) or DigitalOcean 2 GB ($12) / 4 GB ($24), running GEV's own server code unchanged behind a Cloudflare Tunnel.

## Hard rules (verbatim)
- "Unknown commercial-use permission = disabled. OpenSky stays OFF until written commercial permission (ads count as commercial)."
- "gev/ files must NEVER be edited, deleted, renamed, reformatted or patched."
- "NO PERMISSION EMAILS ... Stay off only when the terms explicitly say paid, non-commercial, no reuse, or written permission required."

## What I did
Read GEV's .env.example and SECURITY.md locally; wired Mapillary and FIRMS; confirmed ships need a server. A separate local code audit is running.

## My question
1. List every GEV feature that needs a server, a key, or a paid licence. For each: cost, free tier, and whether commercial (ad-funded) use is allowed, citing the provider's official page.
2. Is a 2 GB server enough for GEV's server with ships, search (Nominatim/Photon), Overpass, rail, news? Or 4 GB, or more?
3. Anything else we must buy that we have not listed (beyond server and OpenSky)?
My options: (a) Hetzner small box only, (b) DigitalOcean 4 GB, (c) bigger. My recommendation: (a), add paid keys later only when ads pay.

## Answer format
A table (feature | needs | monthly cost | free tier | commercial OK? | source URL), then a 5-line verdict. Say "could not open" instead of guessing.

GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
