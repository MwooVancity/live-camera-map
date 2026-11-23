# Plan: Free live traffic camera directory (Argos Atlas alternative)

Status: direction agreed after a 3-round Claude vs ChatGPT debate, 2026-11-21.
Owner: Mike. Site name is a placeholder ("NearbyCams"); no domain chosen yet.

## 1. Goal
A free, no-paywall, search-first camera directory with a simple 2D map. English first, WORLD-wide target (owner 2026-11-22); California and BC are the first two regions, not the scope.
- Launch is LINK-OUT ONLY: each camera page shows metadata and links to the official source.
- Success = users find a camera, click through to the official source, and come back. Not camera count.
- First milestone: 150-300 real, reliable cameras (quality over count), 2 working importers, a working map, health monitoring, ~10 useful landing pages.
- Monetization later (ads / affiliate / donations). Never a paywall.

## 2. Decisions (debate outcome)
| Decision | Result |
|---|---|
| Stack | Astro (static) + MapLibre GL JS + OpenFreeMap tiles behind a provider abstraction (fallback: self-hosted PMTiles) |
| Data | JSON files in git: `cameras.json`, `sources.json`. Generated `health.json` is NOT committed |
| Licensing | Granular per-source permissions (see section 4), each `allowed / not_allowed / unverified`. Default `unverified` |
| Images | No embeds and no image proxy until a source's written permission is confirmed |
| Regional pages | Config default min 3 cameras, but INDEXING is controlled by a curated page list picked from keyword data |
| Camera pages | Only selectively, where a camera has independent search value. Whole registry is not auto-published |
| Health checks | GitHub Actions cron -> publishes `health.json` to Cloudflare R2. Site fetches it client-side. No server |
| Health statuses | `reachable`, `stale`, `unavailable`, `unknown`. `last_changed` is separate (an unchanged image is not proof of a dead camera) |
| Importers | Run locally first (the Claude sandbox cannot reach camera APIs) |
| God's Eye View | The `/map` engine. Untouched upstream (pinned commit in `ops/upstream-base.txt`), run from its Docker image on its own subdomain and embedded by the Astro `/map/` page. We only ADD files around it. Gated by Session 3 (see docs/decisions/red-team-round3.md) |
| Backend / DB | No database in v1. GEV's own Node server is the live-data engine; camera health is static JSON on R2 |

Disputed and settled: fixed 8-camera threshold dropped; link-out-first (Claude won); GitHub Actions over a server (Claude won); R2 over committing health data (ChatGPT won); per-camera health and granular permissions (ChatGPT won).

## 3. Architecture
```
Source APIs -> importers (local) -> normalize + dedupe + validate -> cameras.json (git)
sources.json (git, permissions) -----------------------------------^
GitHub Actions cron -> health checker (per-source throttling) -> health.json -> Cloudflare R2
Astro build (cameras.json + sources.json + curated page list) -> static site (Cloudflare Pages)
Browser: MapLibre map + client fetch of health.json from R2
```
Rule: if a health run fails or is incomplete, never overwrite the last good `health.json`.

## 4. Data model
`cameras.json` entry: `id`, `sourceId`, `name`, `road`, `direction`, `city`, `regionSlug`, `regionName`, `lat`, `lon`, `feedType` (still|video), `officialUrl`, `officialUrlLastVerified`, `lastSeen`; optional `locationText` (the source's own caption, text only; DriveBC gives it).

`sources.json` entry: `id`, `name`, `api` {auth, rateLimit, docsUrl}, `permissions` {`metadata_commercial`, `image_display`, `image_caching`, `image_redistribution`: each allowed|not_allowed|unverified}, `attribution`, `license`, `licenseUrl`, `reviewedAt`.

`health.json`: top level `generatedAt`, `runOk`; per camera `status`, `httpStatus`, `contentType`, `lastChecked`, `lastSuccess`, `lastChanged`, `consecutiveFailures`. A 200 response with an HTML error page must NOT count as working (check content-type, preferably dimensions).

## 5. Build order
Run in parallel from day 1: keyword research (Google Keyword Planner or Ahrefs free) to choose which pages to index. The Gemini Deep Research run also exists in Mike's Gemini history (its UI never finished rendering).

- [~] **Day 1: Foundation (PARTIAL 2026-11-23: Astro + data files + build done; map is the GEV iframe, not MapLibre/OpenFreeMap, and GEV is not deployed yet).** Astro + MapLibre + OpenFreeMap, the three data files, sample cameras. Done when: map renders sample cameras and `npm run build` passes.
- [ ] **Day 2: Importer 1 (Ontario 511). NOT DONE: needs Mike key; British Columbia (DriveBC, OGL-BC, no key) built instead as a convenience, not by plan.** Auth, normalize, validate coordinates, dedupe, attribution, official URLs. Done when: real Ontario cameras on the map. If API approval is pending, build against saved sample responses and use Alberta 511 or another keyed source meanwhile.
- [x] **Day 3: Importer 2 (Caltrans). DONE 2026-11-22 (3,263 cameras, all 12 districts, real run, tests).** Different API shape, same schema. Metadata only; image permissions stay `unverified`.
- [~] **Day 4: Discovery UX. PARTIAL 2026-11-23: search built (static index, first-focus load, country shards, road aliases, header box on every page, /map/?lat=&lon= with GEV hash), size budget + 58-query relevance set + page gate.** NOT built: filters (country/road/direction/status), clustering, bbox loading, camera detail, nearby cameras, corridor navigation, GeoNames towns (towns come from camera captions only), real-browser/phone test of the box, 200 ms / 1 s timing budgets. MEASURED: real first search 139 KB gzip (4,998 entries); synthetic 200k does NOT fit 300 KB per country shard (needs ~30+ shards by region), see docs/decisions/day4-search-design.md.
- [~] **Day 5: Health monitoring (MOSTLY DONE 2026-11-22: checker, throttling, backoff, publish via GitHub Pages every 3 h, statuses on pages; R2 and failure alerts not built).** Actions cron, per-source throttling and backoff, R2 publish, statuses on camera cards, workflow failure alerts. Start intervals at 30-60 min for still cameras; prefer bulk endpoints over per-camera requests.
- [x] **Day 6: SEO pages. DONE 2026-11-23 (world hub, country, region, city, road pages, guides; canonical, sitemap, breadcrumbs, silo gate).** Homepage, major city pages, major highway pages, a few camera pages. Canonical, sitemap, BreadcrumbList, internal links, crawlable HTML that works without the map. No near-empty pages.
- [~] **Day 7: Test and deploy (PARTIAL: CI, noindex staging on GitHub Pages; no real domain, no Cloudflare, no load of 1,000+ markers, no post-deploy live check yet).** 1,000+ markers, broken official URLs, source API outages, duplicate cameras, mobile search, health failure, sitemap correctness.

## 6. Blocked on Mike (Claude cannot do these)
- Register for Ontario 511 developer access; get an Alberta 511 key.
- Create accounts: GitHub repo, Cloudflare (Pages + R2). Pick site name and domain.
- Read each source's terms and confirm the permission values in `sources.json`.
- Run importers on your own machine and commit the output.
- Keyword research, and review the Gemini report.

## 7. What will break first (ranked)
1. Camera URLs change, expire or stop updating. Mitigation: health records, official URL re-verification.
2. Image licensing ambiguity. Mitigation: link-out only at launch.
3. Source rate limits, auth changes, blocking. Mitigation: source-aware throttling, bulk endpoints.
4. Scheduled GitHub Actions run late or get dropped; public-repo schedules can be disabled after 60 days of inactivity. Mitigation: manual dispatch, show "last checked" on the site.
5. Thousands of thin pages. Mitigation: curated page list.
6. OpenFreeMap has no SLA. Mitigation: provider abstraction.

## 8. Unverified claims (from ChatGPT, not independently checked)
- Ontario 511 data is under the Open Government Licence - Ontario; registration required; third-party redistribution must be disclosed.
- Alberta 511 API needs a key and allows ~10 calls per 60 seconds.
- Caltrans: general info public domain, some photos copyrighted.
- WSDOT photo reuse criteria are non-commercial.
- National Highways (England) needs a separate paid commercial licence.
- Argos Atlas traffic of ~500k visits/month is unconfirmed (one estimate site ranks it Tranco #666,409).
Open each source's official terms page before setting any permission to `allowed`.

## 9. Out of scope for v1
3D globe, flights, ships, conflict layers, voice/AI, Spanish, image proxy or caching, historical images, a database, a backend, mass programmatic SEO pages, copying anything from argosatlas.com (code, text, images, layout) or scraping it.

## 10. Open question
Ads next to third-party camera content: ask each provider whether images may be shown alongside advertisements before enabling embeds + ads.

## 11. SEO structure (Argos Atlas teardown + Claude/ChatGPT debate, 2026-11-21)
Correction to the earlier assumption: Argos Atlas is NOT "everything on /map". Their `/map/` is a JS app with ~100 words of crawlable text and no crawlable links into their content. The traffic engine is a silo around it (counts approximate, from sitemap chunks, +-20):
- ~330 blog guides in 10 topic hubs (138 on traffic cameras), EN/ES mirrored, each linking to `/map/` with "Open the map" CTAs.
- 1,000+ programmatic camera listing pages: `/en/cameras/<country>/<region-or-city>/`, templated, all lastmod 2026-11-20.
- ~480 `/country/<country>/` pages, plus tools and author pages.
- Their weaknesses: contradictory counts (London 845 vs 776 vs 2,143), templated generic prose, Spanish slugs on English URLs, no sibling-city links. No JSON-LD or hreflang seen (from extracted page text; check view-source before relying on this).

Our version (agreed): the map is the product, a SMALL curated silo is the acquisition engine, camera health is the differentiator.
- `/map/` = the app. Add a short crawlable intro and plain HTML links to the hubs. Map-state URLs (`/map/<place>/`) are app entry points whose canonical points to the matching landing page. Never hash-only (`/map/#london`).
- `/cameras/` hub (1), country/region hubs (2-4), city/corridor landing pages (10), guides (3-5). Total 16-20 pages at launch.
- City/corridor pages are chosen from keyword research plus real coverage; each page must have unique data (coverage roads, sources, last verified, health), not just swapped city names.
- Internal links (real `<a>` tags only): hub -> region -> city; city -> parent; city -> 3-6 related locations; city -> 2-3 guides; guide -> city; every landing page -> prominent map CTA; map -> crawlable links to landing pages. Descriptive anchors ("Toronto traffic cameras"), not "click here".
- Initial HTML must contain title, count, coverage, sources, health summary and links. The map hydrates after.
- One registry powers every count, so numbers never disagree across title, map and list.
- Do NOT copy: 330 guides, EN/ES mirroring, 1,000+ pages, featured thumbnails (no image rights yet), "is X free" posts.
- (Superseded by section 12, owner 2026-11-22: every landing page ships maxed out from day one. Number of pages still grows only with real coverage, never because more records exist.)

## 12. Page content: everything on the page (owner 2026-11-22: "put everything on the page, maxed out info gain")
Goal: millions of views a month is the target, not a forecast (Argos's ~500k/month is unverified). The route is pages so complete that nothing else answers the question. Every city/corridor page carries ALL of the blocks below that have licensed data for that place. A block with no data is omitted, never faked. Every block shows its own source, timestamp and attribution, and hides itself if older than its limit.

| Block | What it shows | Source (must be `allowed_per_doc` in `data/source-permissions.json`) | Max age |
|---|---|---|---|
| Cameras | Every camera, road, direction, plain link to the official source (no images) | Caltrans CWWP, later Ontario 511, Alberta 511, other states | registry date |
| Camera health | reachable / stale / unavailable per camera, last checked, last changed, 30-day uptime per road | our own checker (GitHub Actions to R2) | 2 h |
| Road conditions | active incidents, lane closures, chain controls, road work | Caltrans lane closure and chain control feeds, CHP incident feed; Canadian 511 equivalents | 15 min |
| Road weather | stations on the roads: air and surface temperature, wind, visibility | Caltrans RWIS, NWS observations | 1 h |
| Forecast and alerts | next 48 h forecast and active weather alerts for the city | NWS api.weather.gov (US public domain), ECCC for Canada only after its licence is read | 3 h |
| Traffic signs | current message sign text on the corridors | Caltrans CMS feed | 15 min |
| Coverage | roads and counts per road, camera density, gaps | our registry | registry date |
| Corridor view | cameras in driving order along each highway, with the next and previous camera | registry (postmile order) | registry date |
| Context | sunrise and sunset, local time | computed locally, no external call | live |
| Map | the page's cameras on the GEV map, centred on the city | GEV embed `?embed=1` plus URL hash | live |
Rules:
- Live blocks are filled by the same Actions cron that writes `health.json` (one JSON per region on R2). The page contains a build-time snapshot in the HTML so it works without JS and is crawlable, then refreshes client-side.
- One registry and one `countsBy` function feed every number on the page.
- Each new feed needs: a row in `data/source-permissions.json` (allowed_per_doc with licence text and review date), a fetch script in `ops/importers/`, a fixture test, a failing-fixture test, and an entry in `data/exclusion-map.json` if it is reachable through GEV.
- Added to the earlier cut line: Open-Meteo stays OFF until its commercial terms are read (UNVERIFIED).
- Pages still publish only where the registry has 3+ cameras; the rest are noindex.
- Do not copy Argos wording, layout or images. Their weakness is generic text and contradictory counts; ours is one data source per number.
Edge cases:
- A feed changes its JSON shape: parser fails closed, block hides, page still builds. Test: fixture with a renamed field.
- A feed is down for a week: block hides after its max age and shows "last updated"; the page never shows old data as current. Test: stale-timestamp fixture.
- A feed's licence turns out restrictive: flip its permission row to not allowed, the gate removes the block site-wide. Test: licensing test.
- Two blocks disagree (camera count vs list): impossible by construction, one function. Test: count equals list length for every page.
- 100x pages: build time and R2 file count. Measure monthly; per-region JSON, not per-page.

Build order (replaces nothing in section 5; adds):
- [ ] Block 1-2 (cameras, health) as part of Day 5/6.
- [ ] Road conditions, signs, road weather from Caltrans (same API family, no key).
- [ ] NWS forecast and alerts block (no key, needs a User-Agent).
- [ ] Corridor view.
- [ ] Ontario 511 and Alberta 511 once Mike has keys (Mike task, unchanged).

## 13. Money and enforcement (owner 2026-11-22: "make more money than them", "enforce it every level")
- Money first, inside the rules: a penalised site earns $0. Revenue comes from the same pages: display ads and affiliate links (dash cams, road-trip gear, roadside assistance) placed beside the data blocks, never inside a camera link-out. Ad slots stay OFF until each source's terms allow data beside ads (plan section 10); `revenue-slots` in `ops/harness/rules.mjs` is PENDING until a gate checks it.
- Silo is enforced in code (`ops/harness/page-gate.mjs`): reachable from / in 4 clicks (world hub -> country -> region -> city), no orphans, city -> parent region, 3+ related cities, a guide, the map; region -> country, country -> world hub; every hub links every child; guides link a city.
- Every rule lives in `ops/harness/rules.mjs` as ENFORCED (names its gate) or PENDING (a note). Check: `node ops/harness/selftest.mjs`. Layers: Claude Code hooks (`.claude/settings.json`: Line 0 every request, gev/ write block), git pre-commit (`.githooks/pre-commit`), CI (immutability, preflight, site), page gate on the built site.
- Page gate also needs `site/PAGES.md` to carry "Beats Argos by: ..." for each indexable page.

## Next
- DONE 2026-11-22: Caltrans registry (3,263 cameras), Astro site (20 pages), enforcement harness, live blocks (lane closures, chain controls, signs, road weather, NWS), CI green, noindex staging live at https://mwoovancity.github.io/live-camera-map/ (workflow staging.yml, refreshes feeds every 3 h).
- DONE 2026-11-22: British Columbia is the second source (lead from Argos list; ChatGPT claim checked against the BC pages and the CKAN record first). Licence rows `drivebc-cameras` and `drivebc-events` (Open Government Licence - BC, quoted; list only, pictures unverified so link-out). `ops/importers/drivebc.mjs`: HighwayCams list (1,036 cameras after 5 position duplicates) into the shared `cameras.json` (each importer rewrites only its own rows, tested), Open511 events into `data/conditions/bc-events.json` (319 active events on the first run). BC health is checked by the same `ops/health/check.mjs` with its own pace (3 workers, 300 ms apart); the BC picture server sends no Last-Modified, so BC cameras can be reachable or unavailable but never stale (docs/decisions/bc-health-stale-limit.md). Site: `/cameras/british-columbia/` hub, 5 city pages, BC guide; no road pages for BC. DriveBC has no city field, so a BC "city" is a named place (camera name plus DriveBC's own caption); 192 of 1,036 cameras have one, so BC city pages are the 5 largest named places, not the 5 largest towns. Not done for BC: forecast (no Canadian weather licence read), road pages, camera pictures.
- DONE 2026-11-23 (world sources 2 and 3, from the live audit docs/source-audits/world-feed-audit-2026-11-23.md): Finland (Fintraffic Digitraffic weather cameras) and Quebec (MTMD Camera de circulation). Built only the two the audit VERIFIED with a quoted licence, no key and 100+ cameras; NOT built: Spain DGT (its dataset page says CC BY but its legal notice forbids commercialisation: blocked until DGT answers), NSW (open copy returned no image for 15 of 15 links, endpoint status unverified), Singapore (feed returns 8 cameras). Licence rows `digitraffic-weathercam` and `quebec-cameras` (quoted text, URL, review date 2026-11-23, pictures unverified so link-out; Mike confirmation lines in docs/decisions/mike-todo.md). Importers `ops/importers/digitraffic.mjs` (805 cameras from 808 stations: 1 test station, 1 not gathering, 1 repeated position; re-reads the terms page every run and stops if "Creative Commons 4.0 By" or "even commercially" is gone) and `ops/importers/quebec.mjs` (672 cameras from 683: 11 repeated position+road+direction; stops unless license_id is cc-by or if the feed is cut off), shared steps in `ops/importers/lib/runner.mjs`; each rewrites only its own rows (tested in any order with Caltrans and BC). Real run once each: both exit 0. Honest places: Finland city only from the strict name form road-code_Place (796 of 805; 320 places; the place is a NAME from the feed, that it is usually the municipality is UNVERIFIED), no direction; Quebec has NO city at all (the free text has no reliable place) and its 14 regions are the feed's own NomRegionDiffusion values (table QC_REGIONS, also builds REGION_COUNTRY). Site: /cameras/finland/ (country), /cameras/finland/finland/ (region) and 8 city pages (Oulu 31 ... Lappeenranta 11); 13 Quebec region hubs under /cameras/canada/<region>/ that list every camera (Abitibi-Temiscamingue has 1 camera: counted, no page, the Canada hub says so); no Quebec city pages; text per source from one table (REGIONS in site/src/lib/pages.mjs), credit lines from sources.json, caveats printed; `Beats Argos by:` lines added to site/PAGES.md (23); 64 pages built; search index 6,810 entries, first search 140,050 B gzip of the 307,200 B budget. Bug found and fixed on the way: slugify split accented words (Hameenlinna with an a-umlaut became ha-meenlinna); it now drops accents (test). Health: Digitraffic images 1 worker 1100 ms apart (its limit is 60 requests a minute per IP without the Digitraffic-User header; the checker sends that header, no personal data), time budget 12 to 18 min and cap 6000 to 7000 because 805 x 1.1 s is about 15 min (staging.yml timeouts raised, test that every list fits). Live sample of 20 Finland cameras (node ops/health/check.mjs --source digitraffic --sample 20): 19 reachable, 1 stale (Last-Modified 14 h old), 0 unavailable. Finding: Digitraffic answers a camera with no picture by a grey "Image not available" JPEG (HTTP 200, 9,897 bytes, no Last-Modified or ETag, same md5 for two cameras): a 200 is not proof, so a source flag needValidators counts that as unavailable (proved live on C0300101). Quebec: quebec511.info answers automated requests with a Cloudflare bot-check page (403, Cf-Mitigated: challenge); per CLAUDE.md we do not work around it: the checker never requests those links, every Quebec camera is unknown by design (reason shown, left out of the 20% unknown limit, the pages say so). robots.txt of weathercam.digitraffic.fi, tie.digitraffic.fi and www.quebec511.info read: Allow all for our generic agent. Rules added in ops/harness/rules.mjs: world-importers, honest-place-world, health-blocked-host, health-placeholder-image, health-fits-budget, region-text-one-source, slug-accents (46 enforced, 2 pending). Camera importers stay local-only like Caltrans and the BC list (they write the committed registry, CI does not refresh it); no importer step was added to staging.yml. NOT verified: a full health run over all sources end to end (about 15 min and 5,100 requests, not run); Digitraffic's higher limit with the header (not stated); that quebec511.info links load in a normal browser (Mike-only); picture or video rights for either source; update intervals other than the Digitraffic Last-Modified values seen; Finland/Quebec on an Android or phone viewport.
- REVIEW 2026-11-22 (Gemini + ChatGPT guest chats; neither could open sub-pages, so their page-level claims are UNVERIFIED; their Argos counts of 493 LA / 706 CA / 200k+ total are UNVERIFIED third-hand). Agreed gaps, in order:
  1. Camera health checker (GitHub Actions): proves a camera link works (content-type, not an HTML error page), classifies still / video / operator page / unavailable / retired, keeps history for 30-day uptime. Both reviewers: a last-checked stamp alone is not proof.
  2. Road and corridor pages (I-5, I-10, I-405, US-101): cameras in driving order, closures and signs between them; camera-to-event links (each closure/incident links to its nearest cameras). Only where data exists.
     DONE 2026-11-22: /roads/ hub plus 10 road pages (I-5, US-101, I-15, I-10, I-80, SR-99, SR-1, I-210, I-580, I-405), guide how-to-read-a-road-page. Order is by position along the road's line of best fit, NOT milepost: checked on the live Caltrans files, postmile restarts at every county line (I-5 and US-101 rank correlation with position 0.1 to 0.2) and milepost is not one scale across districts (I-5 northbound 0.77, I-405 0.90, US-101 0.88 overall, while inside most single districts it matches exactly; Los Angeles I-5 mixes values equal to the county postmile with cumulative ones). Registry schema unchanged. Closures, chain controls and signs are listed only with a road camera within 25 km. Gate: road-slug, road-order, road-silo, event-nearest-cameras in ops/harness/rules.mjs.
  3. More licensed feeds on the page: CHP incidents, Caltrans speeds/travel times if CWWP offers them, USGS quakes, AirNow, CAL FIRE. Each needs a licence row first.
  4. Count definitions on the page (what counts as a camera, active, and how a city is assigned) so numbers are never inflated.
  5. Coverage beyond Caltrans for the same cities (city, county, port cameras) after each licence is read; Canadian sources seen in GEV catalog (DriveBC, Calgary, Toronto).
  6. Problem-led guides (closures, chain controls, snow) instead of site-mechanics guides.
- LICENCE: Caltrans calls its portal the Commercial Wholesale Web Portal and says no charge for use, but never states commercial use outright. Rows stay flagged needsHumanReview. Mike confirms before ads.
- LAUNCH CHECKLIST: remove staging noindex and sitemap removal (ops/staging/prepare.mjs is staging only), real domain in PUBLIC_SITE_URL, licence confirmed, ad slots gate.
- OWNER: Ontario 511 and Alberta 511 keys; domain and name when going live; Open-Meteo commercial terms.

## 14. Argos as our lead list (owner 2026-11-22)
- Rule: every public source Argos uses is a lead. Free = candidate, paid = excluded. A candidate becomes live only after its own licence row passes the gate (quote, URL, date). Argos using it is NOT a licence.
- Method: read their public sources/methodology page by hand (no scraping, robots.txt respected), list source names in docs/research/argos-source-leads.md, then for each: free? key needed? commercial use? attribution? -> source-permissions row -> importer -> page block.
- Why not skip licensing: a free feed can ban commercial use, so ads would break it; the gate costs minutes per source and protects the whole site.
- Edge cases: lead is paid or login-walled -> excluded, row says why. Lead is free but non-commercial -> row not_allowed, block never ships. Lead moved or changed terms -> review date expires in 180 days, gate disables it.

## 15. World-first (owner 2026-11-22: "I do not care about anywhere but the world, like Argos")
- Supersedes "regional first" and "no global expansion in v1" (plan section 1/9, CLAUDE.md). Why those existed: the 2026-11-21 Claude vs ChatGPT debate, before this goal was stated.
- Why BC was built first (record): plan never named it; it was the only non-California source needing nothing from Mike (OGL-BC, no key). That was convenience, not strategy; it yields only 5 city pages of 4 cameras.
- How we get the world: (1) the GEV catalog already lists ~27 camera providers worldwide (seen in the Session 4 proof: Caltrans, TripCheck, Fintraffic, Live Traffic NSW, Vegagerdin, Toronto, Calgary, Quebec 511, MLIT river cameras 1,054, Autostrada del Brennero and more): each is a lead, each needs its own licence row; (2) rank leads by camera count x licence clarity x no key, build the top ones first; (3) country hub pages -> region -> city, same silo gate; (4) all numbers stay single-source.
- Scale limit to design for: licences, not pages. Each country needs reading its terms; that is the bottleneck, so the licence workflow must be a repeatable script (fetch terms, quote, row, importer, fixtures).
- Edge cases: a country with no licence text -> unknown, disabled, link-out only; sources that need a key -> Mike todo; a source dies -> health checker marks unknown/unavailable, pages hide blocks.
- DONE 2026-11-23: country level added (Argos pattern country -> region/city, our silo gate): /cameras/ -> /cameras/<country>/ -> /cameras/<country>/<region>/ -> city. Cities are NOT avoided: plan section 15 always said country hub -> region -> city; what was avoided is a flat region-only list. Region -> country table is REGION_COUNTRY in ops/importers/lib/registry.mjs. Roads stay /roads/<slug>/ (California-only), see docs/decisions/url-map.md.
- DONE 2026-11-23: review fixes 1-8 from docs/decisions/review-2026-11-22-chatgpt-vs-argos.md on city and road pages: Greater <city> block (cameras within 30 km, `site/src/lib/area.mjs`, radius set in one place, both counts printed with the definition of near), 'in <city>' vs 'on the whole road' road counts, link-check line derived from the health function (the 'never run yet' contradiction is gone), conditions above the camera lists, road page jump links and per-camera last-checked time, three times kept apart on live blocks, status words defined once at the top of each camera list, 'estimated from camera positions' wording, clean camera labels (`site/src/lib/labels.mjs`), 'Do not use this page while driving' notice. Rules `reader-first-pages`, `greater-area`, `clean-labels`, `timestamps-apart` in ops/harness/rules.mjs. Not built on purpose: a featured-cameras section (padding without images).

## 16. Ask ChatGPT (and Gemini) first: procedure (owner 2026-11-22 "to save my money and time"; also global CLAUDE.md "Offload heavy lifting")
When: (a) before any plan-changing decision (global rule 2026-11-20), (b) for big research: source hunts, licence terms, competitor teardowns, keyword and page ideas, (c) for a second opinion on a finished page or architecture. Not for small lookups or code edits.
Steps:
1. Write ONE batched prompt per topic: goal in one line, the exact questions, "give a table", "mark UNVERIFIED anything you could not open", "say 'could not open' instead of guessing". Public URLs and generic descriptions only: no secrets, keys, personal details or private data. If the site blocks bots (staging does), paste the page text.
2. Use a guest chat in Chrome (chatgpt.com or gemini.google.com/app). Never log in or enter credentials for Mike. If the browser is blocked, say so in one line and carry on; do not loop.
3. Read the WHOLE answer (confirm it ends at its final line). Treat every fact as UNVERIFIED. Check the claims that will ship against the primary source (agency page, licence text, the code) before anything is built or any licence row is written.
4. Where they disagree with this plan or each other, say where Claude agrees, where not, and why; report wrong claims back to them instead of silently substituting.
5. Log it in the table below and save any long answer as a file in docs/source-audits/ or docs/decisions/ marked UNVERIFIED/VERIFIED.
Log:
| Date | Asked | Outcome | Verified? |
|---|---|---|---|
| 2026-11-21 | 3-round red-team of GEV fork / architecture | plan sections 2-3, docs/decisions/red-team-round3.md | partly |
| 2026-11-22 | Session 3 results review | allowlist proxy, public-dev-server beta caveat | yes, in code |
| 2026-11-22 | Adversarial review of staging site (Gemini + ChatGPT) | gaps list in Next; they could not open sub-pages (robots disallow) | Argos counts UNVERIFIED |
| 2026-11-22 | Free camera/road feed hunt, 13 jurisdictions (ChatGPT) | docs/source-audits/chatgpt-feed-research-2026-11-22.md | Oregon, BC, Alberta, WSDOT verified; NY, Texas not |
| 2026-11-22 | Our LA + I-405 pages vs Argos (ChatGPT, text pasted) | docs/decisions/review-2026-11-22-chatgpt-vs-argos.md | 2 of its defects were my paste errors |
| 2026-11-23 | Day 4 search/discovery design for 200k cameras (ChatGPT) | docs/decisions/day4-search-design.md; rejected its per-camera pages | sizes UNVERIFIED, licences leads |
| 2026-11-23 | Rank world camera feeds by count x licence x no key (ChatGPT) | docs/source-audits/chatgpt-world-feeds-2026-11-23.md; no counts verified; shortlist Finland, Spain, NSW, Singapore, Quebec | UNVERIFIED, live audit running |
Next asks queued: (1) [DONE 2026-11-23: Day 4 search design], (2) which countries have the most licence-clean free camera feeds, ranked (ChatGPT, then we verify each licence), (3) keyword and page ideas per country (Gemini Deep Research when available).
