# ChatGPT prompt packet: world infrastructure and what is still missing (sent 2026-11-24)

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome I want. If the question is ambiguous or the goal conflicts with a constraint below, say so and say what you would ask the owner.

## 1. OWNER SAID (verbatim, copied, typos kept)
> "Debate with chatglt infrastructure for the world and update planmd. What's still missing"
> "Why are we still hunting isn't gev have all that info" (2026-11-24)

## 2. GOAL AND WHO IT SERVES
worldtrafficcameras.com: free world traffic-camera directory (link-out only, no sign-in, no picture copying, proxy or caching) plus the GEV map (God's Eye View, an open-source upstream app we embed unmodified at /map/). It must beat argosatlas.com (about 225k cameras, 79 countries claimed, about 500k visits a month) and earn from ads and affiliate links beside data. Our site is a static Astro build; data is JSON in git; health checks run in GitHub Actions every 3 hours; hosting is Cloudflare Pages (site) plus a 2 GB Hetzner-class host for GEV behind an nginx allowlist proxy (owner has not bought it yet).

## 3. SITUATION (facts, each with a source)
- Our registry: 10 sources, 9,457 cameras, 6 countries (data/camera-registry/cameras.json; plan.md section 0).
- Measured health run (staging health.json generated 2026-11-24T09:54Z, 9 sources, before London): 7,998 requests, 884,907 ms (14.7 min), whole set every run (cycle 3 h). Workflow timeout 22 min, request ceiling 12,000: about 1.5x headroom (plan item 28, stage 0).
- Adding London changed 25 files (commit 1334c57); stage 1 of the onboarding plan removed one of three duplicated region-to-country maps (site/tests/dist.test.mjs now uses countryOf from ops/importers/lib/registry.mjs, commit pending push). Stages still open: runner that shows failures (workflow importer lines end in `|| echo`, production.yml:46-55), manifest for pace, page configs, scaffold.
- World coverage queue data/world-coverage.json: 79 countries seen in Argos's public sitemap; built 6; blocked 17 with a named next action; 55 not investigated. Hunt round 1 (8 countries) found: Lyon 15 cameras (Licence Ouverte 2.0, not built), Austria ASFINAG 403 bot check, Czechia and Poland need registration, South Korea refused connection.
- GEV (upstream app) lists about 27 camera catalogs in its DATA_SOURCES.md lines 65-90 with a licence column: Austin, TxDOT, FL511 (personal use only, off), Tallinn, Estonia Tarktee, Warendorf, Live Traffic NSW (CC BY 4.0), Caltrans, DelDOT, TfL, Ontario 511, Digitraffic, DriveBC, Calgary, Catalonia, Iceland, King County WA, WSDOT, Hong Kong, Norway Statens vegvesen (NLOD 2.0), NYC DOT (agreement needed, off), Toronto, Houston TranStar (no licence, bans copying), A22 Italy (CC0), Lithuania (off). We have onboarded 10 of those (Austin, Caltrans, Digitraffic, DriveBC, Hong Kong, Iceland, TfL, Toronto, Calgary, Quebec is ours, not GEV's).
- Our licence gate (tests/licensing/gate.mjs) is fail-closed: a source ships only with a row whose status is allowed_per_doc or allowed_per_owner, attribution, review under 180 days, not mustNotShip. A GEV licence-column row is NOT our licence row: GEV shows live frames at runtime server side; we publish a static list of camera names, coordinates and links in our own public repo and pages, which is a different use.
- Argos Maps matrix (data/argos-maps-matrix.json, 18 rows): our verified edges are no quota, no ad before the click, no sign-in, free 3D globe, official-source links with health stamps; skipped on rules: recording, videowall, camera API embed; gaps: camera count, live flights and ships, alerts, CSV export, AI assistant.

## 4. CONSTRAINTS (pasted verbatim from CLAUDE.md)
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed. Default is unverified. Never set a permission to allowed yourself; propose it and let Mike confirm after he reads the source's terms."
- "NO database, NO backend server, NO mass programmatic page generation, Global expansion is the GOAL (owner 2026-11-22): grow country by country, but every source ships only with its own licence row. Pick the next source by camera count and licence cleanliness, never by what is easiest."
- "Regional pages: config default min 3 cameras, but only pages on the curated list are indexed. Everything else is noindex."
- "God's Eye View (GEV) is proven upstream code. Its files must NEVER be edited, deleted, renamed, reformatted or patched."
- "If a site blocks automated access (robots.txt, 403), stop. Do not work around it; tell Mike and ask him to supply the data."
- "Never overwrite a good health.json with an empty or partial one."

## 5. WHAT I DID AND WHY
Answered the owner's second question from the repo: GEV does NOT have "all that info" for our purpose. It knows about 27 camera catalogs in about 13 countries or states, which is a free lead list (feed URL, licence line, attribution) for sources we have not onboarded yet (NSW, WSDOT, King County, DelDOT, TxDOT, Tallinn, Estonia, Catalonia, Ontario, Norway, A22). For the other 60 or so countries Argos lists, GEV has nothing, so hunting continues there. My plan: harvest GEV's list first (cheap), then hunt the rest by Argos page depth. I have not yet checked the feeds or read the licence texts for the GEV-listed sources.

## 6. EXACT EVIDENCE
GEV DATA_SOURCES.md line 71: `Live Traffic NSW (Transport for NSW) | CCTV camera catalog + frames, New South Wales | CC BY 4.0 (https://opendata.transport.nsw.gov.au/) — attribution REQUIRED`
line 264: the NSW list is the keyless public `data.livetraffic.com/cameras/traffic-cam.json` feed; frames on `webcams.transport.nsw.gov.au`; that host answers non-browser clients with an HTML placeholder.
line 85: `Statens vegvesen ... NLOD 2.0 — attribution REQUIRED` (catalog ogckart-sn1.atlas.vegvesen.no). Our coverage queue marks Norway blocked: "Statens vegvesen DATEX registration (NLOD named)".
line 89: Houston TranStar: "No licence. The TranStar disclaimer prohibits copying or distribution, and external framing or linking to specific images".
Our health sizes: caltrans 3,269 requests, drivebc 1,036, austin 825, digitraffic 805, whole-set every run.
Importer pattern: fetch terms page and check required phrases, check robots.txt, fetch list, normalize, commitSource() rewrites only that source's rows; tests offline with injected fetch.

## 7. MY QUESTION (full)
Design the infrastructure for the whole world and tell me what is still missing. Specifically:
(1) Is "harvest GEV's camera list first, then hunt" the right order? What are the risks of treating GEV's licence column as a lead (not a licence)? Which GEV-listed sources look cleanest for a static list plus link-out (my guess: NSW CC BY 4.0, Norway NLOD 2.0, A22 CC0, WSDOT, King County, Catalonia)?
(2) At 80+ sources: the health run is 14.7 min for 9 sources, whole set every run. My plan: cycle big sources across runs (only what changed) before source 15; keep the 3-hour cron; per-source pace in a manifest. What breaks first (Actions minutes on a public repo, Cloudflare Pages 20,000-file and 25 MB limits, build time, cameras.json size in git, search index size, GEV host load)? Give numbers or say could not verify.
(3) Link-out only means our value is data quality, coverage and health stamps. What data pipeline gaps stop us at 100k+ cameras (dedupe of cameras across sources, stable ids, coordinate quality, a camera moved or removed, a source changing format, a feed that needs registration or a key)? What is the cheapest way to handle country sources behind a registration key or a bot check (email, owner-supplied data file)?
(4) What is still missing from our plan overall (infrastructure, legal, SEO, monetisation, operations), ranked by effect on traffic and revenue? Name what you would cut.
My recommendation: stages in plan item 28 (runner with visible failures, manifest for pace and region-to-country, scaffold), item 30 (country hunt), plus a new item: harvest GEV's list first.

## 8. WHAT I WANT BACK
Short restatement, then a table (question, verdict, risk, cheapest next step), then a ranked missing-list with SURE or GUESS on each claim, then a verdict. Say "could not verify" instead of guessing.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
