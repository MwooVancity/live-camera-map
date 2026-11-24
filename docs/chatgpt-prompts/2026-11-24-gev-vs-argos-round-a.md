# ChatGPT prompt packet: GEV versus Argos Maps, round A (sent 2026-11-24)

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome I want. If the question is ambiguous or the goal conflicts with a constraint below, say so and say what you would ask the owner.

## 1. OWNER SAID (verbatim, copied, typos kept)
> "U and chatgot need to thoroughly debate gev vs argomaps. Not a single thing missed"
> "I wanna make sure no fuckups from u or chatgpt into porting argos killer into my website" (2026-11-24)

## 2. GOAL AND WHO IT SERVES
worldtrafficcameras.com: a free world traffic-camera directory (link-out only, no sign-in) plus the GEV map (God's Eye View, open source, MIT code) embedded unmodified at /map/. It must beat argosatlas.com ("Argos Maps"), earning from ads and affiliate links beside data, inside Google's rules. Site: static Astro, noindex until the owner says go live.

## 3. SITUATION (facts, each with a source)
- Two independent inventories were built today: Argos from its PUBLIC pages in a normal browser (no sign-in, own words, about 235 rows) and GEV from its code (about 360 rows, 40 of 40 sampled rows of our parity file matched) plus a live local run of GEV on the owner's PC (cameras: 7,350 served by default, about 17,950 available, 14 countries; a "12 keys waiting" badge shows 12 unset API keys).
- VERIFIED on Argos's own attributions page: its 3D globe code and particle wind layer are adapted from God's Eye View (MIT). Argos's own additions: geopolitics, finance, VIP, risk zones, paid tools.
- Argos facts read today: 226,203 cameras (25,317 live video), 190+ countries; flights 15,798, ships 19,932; sitemap 2,535 URLs (646 EN camera pages = 79 country + 566 region/place, 251 country pages, 351 blog posts EN and 353 ES, 6 named author pages, 5 tools pages); flights, ships, VIPs, finance and risk zones have NO public pages; Spanish and English only; free map needs a sign-in, has a daily camera quota and an ad before a camera opens; paid tiers OUTPOST $29.99, DISTRICT $79.99 (3D globe, 15 recorded cameras, AI credits, geofences, Telegram), DIVISION $279 (videowall, antenna, export "coming"), AGENCY $4,999 a month (API, MCP, commercial use); affiliate programme 20 percent forever; robots.txt blocks AI-training crawlers.
- GEV facts: no alerts, accounts, payments, finance, VIP, risk zones, export, recording or service worker code; 39 layers, 39 provider plugins, 30 MCP tools, 61 voice tools, 14 UI languages, 25 CCTV packs; several datasets are non-commercial (OpenSky, TeleGeography cables, GhostMaps, volcanoes, iNaturalist, FL511); Cesium ion free plan is personal and non-commercial; Esri and Google imagery have proprietary terms; the server is a dev or preview server, "not a hardened production service".
- Our site: 9,707 cameras in 8 countries (Taiwan 2,354 and Iowa 1,253 queued), per-camera health, country, region, city and road pages, Lighthouse 100 on four pages (lab).

## 4. CONSTRAINTS (pasted verbatim from CLAUDE.md)
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed. Default is unverified."
- "NO database, NO backend server, NO mass programmatic page generation."
- "God's Eye View (GEV) is proven upstream code. Its files must NEVER be edited, deleted, renamed, reformatted or patched."
- "Copying IDEAS from argosatlas.com is allowed and encouraged: page types, features, data fields, page structure, layout patterns and UX flows may be matched or beaten. Still never copied word for word or file for file: their prose, source code, images, logos and brand name."
- "NOINDEX STAYS ON until Mike says 'go live' in chat."
- Owner: "Never call a feature blocked: give each gap an active path."

## 5. WHAT I DID AND WHY
I built the two inventories with separate agents, then merged them into the table below and gave each row a verdict (EDGE we are better, PARITY same once GEV is deployed, GAP they have it and we do not, SKIP fails a test or a hard rule). Mistakes I already made today and corrected: undercounted GEV from its docs (27 sources, real 33 in code), a HEAD check that said Taiwan pictures were dead while GET works, an unmeasured camera total. You (ChatGPT) cannot read this repo, so everything below is my summary; please treat it as such.

## 6. EXACT EVIDENCE (the merged table, class | Argos | GEV | our site | my verdict)
1 3D globe | paid from DISTRICT | yes (Cesium) | via embedded map | EDGE free vs paid
2 Wind, cloud, radar, lightning, quakes, fires, storms | free | wind, weather, cyclones, FIRMS (key), quakes library | via GEV | PARITY
3 Satellites, ISS, launches | free | yes | via GEV | PARITY
4 Street-level photos | free | street-level layer, same three providers | via GEV | PARITY
5 Camera count | 226,203 | 7,350 served, about 17,950 available, 14 countries | 9,707 (Taiwan and Iowa queued) | GAP
6 Camera pictures | inside their wall with ad and quota | frames via GEV proxy | link-out only | EDGE and SKIP embed
7 Camera health | last image time per card | none | per-camera health stamp, 3-hourly | EDGE/PARITY
8 Recording and 24 h archive | paid | none | none | SKIP (stored pictures)
9 Videowall | paid | none | none | SKIP
10 Camera embed API | paid (detail unseen) | none | none | SKIP
11 Live flights | free 15,798 | OpenSky (non-commercial, off) plus adsb.lol (ODbL) | via GEV, OpenSky off | GAP (licence for ads unknown)
12 OFAC sanctions match | free | none | none | GAP, unknown value
13 Live ships (AIS) | free 19,932 | AISStream, needs a free key | via GEV once key set | GAP (owner sign-up)
14 Ports, straits, chokepoint table | free, public tools page | IMF PortWatch library entry only | none | GAP, weak fit
15 Frontlines, verified war events, GPS jamming, UCDP | free, map only | GDELT conflicts, GPS integrity, GhostMaps (non-commercial) | partly via GEV | SKIP for now
16 Finance, VIPs, risk zones, instability index | free, map only (index on country pages) | none by policy | none | SKIP
17 Country pages (251) with ports, advisories, internet status | public SEO pages | none | country camera hubs | GAP partly
18 Public camera pages | 646 EN (79 country, 566 region/place), same in ES | none | country, region, city, road pages (noindex) | GAP volume and Spanish
19 Blog | 351 EN, 353 ES, 6 named authors | none | few guides | GAP, HCU risk of mass posts
20 Languages | ES and EN | 14 UI languages | English | GAP Spanish
21 AI assistant | paid credits | chat and voice with the user's own key | via GEV key-gated | PARITY if key set
22 Alerts, geofences, briefs | paid | none | none | GAP deferred (needs accounts)
23 Export CSV, GeoJSON, KML | coming, paid | import only | none | GAP and EDGE chance (free per-city CSV, licence read per source)
24 API and MCP | AGENCY $4,999 a month | MCP server 30 tools (route closed on our host) | none | EDGE chance: public read-only data file
25 Accounts, quotas, ads | sign-in wall, quota, ad before camera, passes | none | none | EDGE
26 Growth engine | affiliate 20 percent forever, creator playbook, per-card links | none | none | SKIP (needs accounts and payments)
27 Mobile | 2D map works on phones, globe needs strong machine | desktop-first | phone-first site, Lighthouse 100 | EDGE for the directory, map on phone UNKNOWN
28 Data library (airports, power plants, data centres, dams, companies) | free | 96 entries, several non-commercial | via GEV | PARITY partly
29 History | paid 7 or 90 days | 64 AIS fixes only | none | SKIP
30 Camera-owner licensing | publishes a page naming about 25 camera owners | licence column in docs | licence row per source, gate fails closed | EDGE on rigour; their list is our lead list

## 7. MY QUESTION (full)
Round A of at least three. Attack this comparison as an expert reviewer and an adversary would.
(1) For each row where my verdict is wrong, weak or unproven, say so and give the evidence you would need. Which verdicts rest on a guess?
(2) WHAT DID BOTH INVENTORIES MISS? List every feature class, page type, growth mechanism, trust or E-E-A-T signal, data type, legal or licence issue, performance or reliability issue, accessibility, onboarding, sharing or virality feature, monetisation mechanism, and operational risk that a complete GEV-versus-Argos comparison should contain and that is not in the 30 rows. Do not stop at obvious ones.
(3) PORTING RISKS: GEV is a dev or preview server; its map uses Esri and Cesium ion (the ion free plan is personal and non-commercial) and OpenFreeMap; several of its datasets are non-commercial. What exactly could go wrong, legally or technically, when an ad-supported commercial site embeds GEV's map, and what is the safest sequence (basemap choice, ion plan, which layers stay off, what disclosure)?
(4) Argos's traffic comes mostly from camera and country pages. Which Argos page types or on-page elements should we match or beat first (their camera region page structure: H1 with count and month, essentials block, featured cameras with timestamps, roads ranked by camera count, "what you won't see", FAQ, sibling regions), and which would fail Google's helpful-content review if copied?
(5) Rank the GAP and EDGE-chance rows by expected effect on traffic and revenue and by cost, say which break our hard rules, and name the first three builds. My current ranking: camera count, Spanish camera hubs, free per-city CSV, country context pages, flights and ships, alerts without accounts.

## 8. WHAT I WANT BACK
Short restatement, then a table (row or topic, verdict agree or disagree, evidence needed, SURE or GUESS), then the list of what both inventories missed, then the porting-risk sequence, then the ranked builds. Say "could not verify" instead of guessing.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
