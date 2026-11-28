# Big picture round 2: file audit of the whole project (not a brainstorm)

First restate in 3 lines what I am really asking.

## OWNER SAID
"I need the nothing more to add debates with ChatGPT and Gemini on the entire project, not the Seattle page in i5. What the fuck is that? We're doing the world, everything. Tell it to read the GEV and tell it to find everything missing in it, right? Like, you understand that we need to think big picture shit."
"I need you guys to eventually both agree that there is no more information gain that we could add that's helpful to the user. Only when that is done can we agree that the page deserves number one."

## Goal
Money first (ads), inside truth and Google's rules. worldtrafficcameras.com: free world traffic-camera directory plus /map/ (hosted copy of https://github.com/bilawalsidhu/gods-eye-view at commit aac6be77735f6bcad583204724a43302227abc4d, v0.3.0).

## What you asked for in round 1, now supplied (public repo, read these yourself)
- Source list (33 sources): https://github.com/MwooVancity/live-camera-map/blob/main/data/camera-registry/sources.json
- Camera catalogue (24,561): https://github.com/MwooVancity/live-camera-map/blob/main/data/camera-registry/cameras.json
- Link-check code: https://github.com/MwooVancity/live-camera-map/blob/main/ops/health/check.mjs
- Licence register: https://github.com/MwooVancity/live-camera-map/blob/main/data/source-permissions.json
- Route allowlist for the map: https://github.com/MwooVancity/live-camera-map/blob/main/data/proxy-allowlist.json
- Plan: https://github.com/MwooVancity/live-camera-map/blob/main/plan.md
If a link does not open, say "could not open" for it. Do not guess its contents.

## Facts since round 1 (from our repo)
- The 14,169 unchecked cameras come from 19 sources skipped in check.mjs: 13 GEV packs whose picture host is not reviewed, 2 where a fake id also returns 200 (Georgia, BRLA), 1 where HEAD returns 404 (Taiwan THB), 4 Cloudflare-blocked (Maryland, A22, Quebec, NSW), 1 where the link is a web page (CITA Luxembourg). A fix is being built now.
- Search Console: none yet (site is noindex until owner says go live). Ahrefs export: private, not shareable.
- Built since round 1: 46 city pages, 12 road pages (I-5 one road across CA/OR/WA, 802 cameras), Mapillary coverage on the map, NASA FIRMS fires on the map.
- Queued from round 1: per-source reliability and outage history; road status fusion with observed/estimated/forecast labels; border-crossing and mountain-pass pages; country expansion by road coverage; Queensland (132 cameras, CC BY 4.0).

## Hard rules (verbatim)
- "For every page and feature, helpfulness to the person and information gain over Argos come before everything else"
- "Nothing exists to satisfy a count, census or ranking trick (no forced internal links, no padding)."
- "NO image embeds ... unless sources.json has that permission set to allowed."
- "Unknown commercial-use permission = disabled. OpenSky stays OFF until written commercial permission (ads count as commercial)."

## My question
Audit the files above. (1) What is wrong or weak in them that hurts a visitor (bad data, missing fields, wrong licence reading, gaps in the check)? (2) What helpful information is still missing for the whole project, world-wide, that round 1 did not list? Only NEW items, not repeats of round 1. (3) Do you agree with my order: unchecked-gap fix, reliability history, road fusion, border/pass pages, country expansion? If round 1 plus this covers everything, say "nothing new".

## Answer format
Table: item | file or area | problem or gap | public source (URL) | licence (or UNKNOWN) | visitor value high/med/low. Then agree/disagree on the order in 3 lines. Mark guesses GUESS.

GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
