# ChatGPT prompt packet: did I misread the GEV repo, and does GEV have huge gaps versus Argos (sent 2026-11-24)

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome I want. If the question is ambiguous or the goal conflicts with a constraint below, say so and say what you would ask the owner.

## 1. OWNER SAID (verbatim, copied, typos kept)
> "Shouldn't we find all the sources for the world like gev or argomaps. U confirm with chatgpt u didn't fuck up reading the gev repo"
> "I hope u both confirmed gev has huge gaps vs argos" (2026-11-24)

## 2. GOAL AND WHO IT SERVES
worldtrafficcameras.com must beat argosatlas.com (79 countries, about 225,000 cameras claimed) as a free link-out traffic-camera directory. GEV (God's Eye View, open source) is an upstream map app we embed unmodified; its code and docs already name many camera feeds, so it is a cheap lead list for sources we have not built.

## 3. SITUATION (facts, each with a source)
- Earlier today I told you GEV lists about 27 camera catalogs in about 13 countries, from gev/DATA_SOURCES.md lines 65-90 only. That was incomplete.
- I then read GEV's code (gev/server/providers/cctv/sources.js, ottawa.js, quebec.js, lithuania.js, taiwan.js, worldCameras.js, and gev/config/cctv_sources.*.json). The code carries about 33 camera source kinds in 16 countries. Missing from the docs table but present in code or config: Ottawa, Taiwan (Freeway Bureau about 1,800 cameras per a code comment, and the Highway Bureau list), Lithuania, Oregon TripCheck (1,176 rows), Japan MLIT river cameras (1,054 rows), Romania, Tallinn (255 rows), Japan Shinjuku (3). Full table: docs/source-audits/gev-camera-inventory-2026-11-24.md (its content is summarised in section 6).
- Verified today by me with one request each: Taiwan Highway Bureau list https://cctv-maintain.thb.gov.tw/opendataCCTVs.xml = 200 XML, 2,354 CCTV elements with coordinates and snapshot URLs; a snapshot GET returns 200 image/jpeg (a HEAD returns 404). The bureau's page https://thbapp.thb.gov.tw/opendata/ (Chinese) says traffic information is free for public use and that the original source must be stated as the Bureau when the data is provided externally. Taiwan's Open Government Data License v1.0 (data.gov.tw/license) grants use "for any purpose" with attribution. A Taiwan build is now under way (plan item 32).
- NSW Live Traffic (250 cameras, CC BY 4.0) was built today. Iowa DOT 1,253 cameras (ArcGIS, CC BY 4.0, picture host answers image/jpeg) is the next build.
- Our coverage queue data/world-coverage.json: 79 countries seen in Argos's public sitemap; built or partial now 8; blocked 16 with a named next step; 52 not yet investigated; three agent hunt rounds found little outside the GEV and US leads.

## 4. CONSTRAINTS (pasted verbatim from CLAUDE.md)
- "God's Eye View (GEV) is proven upstream code. Its files must NEVER be edited, deleted, renamed, reformatted or patched."
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed. Default is unverified."
- "Pick the next source by camera count and licence cleanliness, never by what is easiest."
- "If a site blocks automated access (robots.txt, 403), stop. Do not work around it."
- Owner: "Never call a feature blocked: give each gap an active path."

## 5. WHAT I DID AND WHY
I re-counted GEV from its code after the owner doubted my first reading, and found my first count (27 sources, 13 countries) too low (33 sources, 16 countries; Taiwan's 2,354-camera list was missing). I did not run GEV. I have not checked how many cameras GEV shows in total; my estimate of 15,000 to 20,000 is built from counted and code-commented sizes plus guesses for the uncounted ones. My claim: GEV leaves about 63 of Argos's 79 countries uncovered and most of its camera count, so GEV is a lead list for 16 countries, not a world source list.

## 6. EXACT EVIDENCE
Counts of source kinds in gev/server/providers/cctv/sources.js (sourceKind values): wsdot-open-data, vegvesen-datex, txdot-its, toronto-rescu-open-data, tfl-open-data, tarktee-datex, tallinn-ristmikud, ontario-511-open-data, nyc-dot-tmc, nsw-livetraffic, municipal-webcam, kingcounty-open-data, iceland-vegagerdin, houston-transtar, hk-td-open-data, fl511-open-data, fintraffic-open-data, drivebc-open-data, deldot-open-data, catalonia-open-data, caltrans-open-data, calgary-open-data, austin-open-data, a22-opendatahub (24). Separate modules: ottawa.js (185 lines), quebec.js (138), lithuania.js (129), taiwan.js (450; comment: "Freeway Bureau (MOTC) CCTV static table ... published keyless and refreshed daily (~1,800 cameras)"; THB fallback feed), worldCameras.js (132; Oregon TripCheck 1,176 and MLIT river cameras 1,054 from config/cctv_sources.world-image-cameras.json, counted by me with a script). Config files: tallinn 255, shinjuku 3, romania 1, warendorf 1. GEV's DATA_SOURCES.md line 203 describes the Taiwan feeds and says Freeway Bureau data follows the Open Government Data License, Taiwan v1.0.

## 7. MY QUESTION (full)
(1) Is this a correct way to read GEV's camera sources (docs table plus provider code plus config)? What camera sources in a repo like this would I most likely still miss (runtime-built catalogs, third-party APIs hidden behind a provider that is not named cctv, camera layers in other providers such as traffic.js, transit.js, local.js, places.js, regional.js, or a different file naming)? Give me the exact greps or files an expert reviewer would check.
(2) Does the conclusion "GEV has huge gaps versus Argos (16 of 79 countries, roughly 15,000 to 20,000 of about 225,000 cameras)" hold, and what is the weakest number in it?
(3) The owner asks: shouldn't we find ALL the camera sources in the world the way GEV and Argos Maps do? What is the systematic way to do that (national open-data portals, road-agency API directories, DATEX II national access points, ArcGIS Hub camera layers, OpenStreetMap highway=camera / surveillance tags, Wikidata, public lists of 511 sites)? Rank by expected number of cameras per hour of work and by licence cleanliness, and say which are unusable for a link-out directory under our licence gate (a source ships only with a quoted licence that allows republishing the list).
My recommendation: keep the lead lists (GEV 16 countries, Argos sitemap 79 countries, ArcGIS Hub) and add one systematic sweep: DATEX II national access points in Europe and 511 developer portals in the US and Canada, ordered by camera count.

## 8. WHAT I WANT BACK
Short restatement, then a table (question, verdict, SURE or GUESS), then the greps and checks, then a ranked source-discovery plan. Say "could not verify" instead of guessing.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
