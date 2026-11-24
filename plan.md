# Plan: free world live-camera directory (Argos Atlas alternative)

**This is the ONLY plan, status and to-do file.** Files in `docs/` are evidence records (what was read, measured or decided on a day). They are never plans. Mike-only tasks live in section 1.

## 0. Header
- Goal: a free, world-wide directory of live traffic cameras with road conditions, camera health and a free map that never asks for a sign-in. Link-out only until a source allows pictures.
- End game: beat argosatlas.com page for page, match the traffic they capture, then pass it (measured by Search Console against Ahrefs). Make money inside the rules (ads and affiliate beside data, never a paywall). A penalised site earns $0.
- Site name "NearbyCams" is a placeholder (one config constant). No real domain yet. Staging (noindex): https://mwoovancity.github.io/live-camera-map/
- How to read: section 1 is what only Mike can do. Section 2 says what is built. Section 3 is the work queue Claude takes in order. Everything else is reference. "UNVERIFIED" = not checked on the primary source.
- Success = people find a camera, click through to the official source and come back; the scoreboard is Search Console non-brand clicks and shares of `/map/` links, never camera or page counts. Monetization: ads, affiliate, donations; never a paywall.
- Last updated: 2026-11-23. Registry: 6,332 cameras from 6 sources. 66 pages built. Search index 7,368 entries.

## 1. OWNER TO-DO (Mike only; Claude must not attempt these)
Highest unblocking first. "Claude did" = what is already prepared so your step is small.

| # | Your step (one line) | Why it matters | Claude already did | Status |
|---|---|---|---|---|
| 1 | Cloudflare deploy, two steps. (a) Create an API token: Cloudflare > My Profile > API Tokens > Create Token > Custom token, permissions: Account > Cloudflare Pages > Edit, and Zone > DNS > Edit (zone worldtrafficcameras.com). (b) In GitHub: repo MwooVancity/live-camera-map > Settings > Secrets and variables > Actions > New repository secret, twice: CLOUDFLARE_API_TOKEN (the token) and CLOUDFLARE_ACCOUNT_ID = 175119c9cdd3c5d253a685ce56080b8c (the long number in your Cloudflare dashboard address). Never paste the token to Claude. | The site goes live on worldtrafficcameras.com. Until then the production workflow does nothing. | DOMAIN BOUGHT 2026-11-23 (Cloudflare nameservers confirmed; expires 2027-11-23). Site name is now World Traffic Cameras. .github/workflows/production.yml creates the Pages project, deploys, attaches the domain, and keeps the whole site hidden from search (noindex, robots Disallow, empty sitemap) until you set the repository variable LAUNCH to live (Settings > Secrets and variables > Actions > Variables). Switch is tested. | OPEN (domain DONE) |
| 2 | Register a free TfL developer account. | Unlocks London, 889 cameras (810 flagged available). | Read the TfL terms: commercial use allowed, show "Powered by TfL Open Data", max 500 calls a minute. Importer pattern ready. | OPEN |
| 3 | Watch your Gmail for the reply from nap@dgt.es and paste it to Claude. | Unlocks Spain, 1,980 cameras (not Catalonia, not the Basque Country). Spain is blocked because DGT's two official pages disagree about commercial use. | Email sent 2026-11-23 (EN + ES). | WAITING |
| 4 | Confirm each licence row below (read the quoted line, say OK). Claude never sets "allowed" for you. Needed before any ads. | Ads must not break a source's terms. | Each row has quote, URL and date in `data/source-permissions.json` and the importer re-reads the terms every run. | OPEN |
| 5 | Open one quebec511.info camera link in a normal browser (e.g. https://www.quebec511.info/Carte/Fenetres/FenetreVideo.html?id=3998) and tell Claude if it loads. | Our tool got a bot-check page, so all 672 Quebec cameras show "unknown" by design. | Importer built; we do not bypass the check. | OPEN |
| 6 | Register Ontario 511 (developer key + agreement). | Next big Canadian source. | Importer not built (needs key). | OPEN |
| 7 | Alberta 511: get a developer key AND written permission for commercial use. | Terms forbid commercial reproduction without it (quoted in section 7). | Nothing built. | OPEN |
| 8 | Register an Oregon TripCheck (TTIP) account; ask ODOT in writing that ads are fine. | Strongest permission found ("businesses ... may use data and images"). | Quote verified on the FAQ page (an FAQ, not a licence). | OPEN |
| 9 | Apply for 511NY developer access and save the agreement text. | Agreement text could not be read by us. | Only a search snippet seen: UNVERIFIED. | OPEN |
| 10 | Read Open-Meteo's commercial terms and tell Claude. | Permissions mark it allowed from a CC BY line; my recollection is that the free tier is non-commercial (UNVERIFIED). `/api/weather-effects` depends on it. | Flagged in section 10. | OPEN |
| 11 | Decide how ads sit beside third-party data; ask each provider whether pictures may be shown beside ads (DriveBC and Fintraffic optional). | Ad slots stay OFF until this is answered. | Rule `revenue-slots` is PENDING. | OPEN |
| 12 | Host and deploy steps: choose host; Cloudflare Tunnel and DNS to 127.0.0.1:8080 (token stays on the host); set `GEV_ALLOWED_HOSTS` and `GEV_EMBED_FRAME_ANCESTORS` in `ops/deploy/.env`; run workflow `session5-compose` once from the Actions tab and say if green; after launch set repo variable `HEALTH_BASE_URL`. | Public map engine and monitoring. | Compose file, proxy, runbook, healthcheck written; never run on a real host. | OPEN (after 1) |
| 13 | Optional: Washington access code; Norway credentials; keys for Queensland, Georgia, Pennsylvania, Minnesota; email tmc@transpordiamet.ee (Estonia); ask MDOT for a licensed Michigan feed; ask LTA why Singapore returns 8 cameras. | Each could add a source; none blocks the rest. | Probed, section 7. | OPEN, low |
| 14 | Optional: email OpenSky for written commercial permission (ads count as commercial). | Live flights stay OFF until then. | OpenSky route blocked at the proxy. | OPEN, low |
| 15 | Optional: re-run Gemini Deep Research (limit hit 2026-11-21) and paste into `docs/research/`; keyword research in Keyword Planner. | Extra ideas only. Pages are already chosen by real coverage; Search Console after launch is the scoreboard. | Ahrefs-free and Similarweb evidence in section 4. | OPEN, low |

Licence rows waiting for your OK (full quote, URL and date are in `data/source-permissions.json`; the importers re-read the terms every run):
- Caltrans `caltrans-lcs`, `-cc`, `-cms`, `-rwis`: "public domain", "no charge", "available for integration into your application" (cwwp2.dot.ca.gov, dot.ca.gov/conditions-of-use). Caltrans calls its portal the Commercial Wholesale Web Portal but the text never says "commercial" either way; RWIS units not stated; rows stay flagged `needsHumanReview`.
- NWS `nws-forecast`, `nws-alerts`: weather.gov/disclaimer, public domain, any lawful purpose; no implied endorsement, no modified data passed off as official.
- DriveBC `drivebc-cameras`, `drivebc-events`: OGL - British Columbia, "including for commercial purposes".
- Finland `digitraffic-weathercam`: CC BY 4.0, "even commercially".
- Quebec `quebec-cameras`: cc-by 4.0, "meme a des fins commerciales".
- Toronto `toronto-traffic-cameras`, Calgary `calgary-traffic-cameras`: their own Open Government Licences, "including for commercial purposes". Required credit lines: "Contains information licensed under the Open Government Licence – Toronto." and "... – City of Calgary." Claude read both pages in a browser; you confirm.
- Quebec: the 7 dataset resources carry no licence of their own. Finland: the sentence speaks of open data in general (page read 2026-11-23).
- For all camera sources, pictures are NOT confirmed as covered: link-out only.

Done by Claude (so none is lost): read TfL, Calgary and NZTA terms in a real browser (2026-11-23); emailed DGT; decided NSW = not now; GitHub repo and staging exist; Docker Desktop install fails on this PC (admin prompt), so Linux CI is the real test target and the Docker tests ran there; DriveTexas ruled out (terms limit it to emergency management).

## 2. STATUS TABLE (honest state, 2026-11-23)
Day 1 to 7 are this plan's build order; Sessions 1 to 10 are the master prompt's (`prompts/00-kickoff-master-prompt.md`, gitignored).

| Step | State | Evidence |
|---|---|---|
| Day 1 Foundation | PARTIAL | Astro, data files, build done. Map is the GEV iframe, not MapLibre/OpenFreeMap; GEV not deployed. |
| Day 2 Ontario 511 importer | NOT DONE | Needs Mike's key (until then build against saved sample responses). BC built instead (no key needed; convenience, not strategy). |
| Day 3 Caltrans importer | DONE | 3,263 cameras, 12 districts, tests. |
| Day 4 Discovery UX | PARTIAL | Search built (static index, country shards, box on every page, `/map/?lat=&lon=`). Not built: filters, clustering, bbox loading, camera detail, nearby, GeoNames, phone test, timing budgets. |
| Day 5 Health monitoring | MOSTLY | Checker, per-source pace, fair budget (18 min and 7,000-request cap per run, shared by source pace), publish every 3 h via GitHub Pages. No R2, no failure alerts, no full end-to-end run. Intervals start at 30-60 min for still cameras; prefer bulk endpoints over per-camera requests. |
| Day 6 SEO pages | DONE | World, country, region, city, road pages (I-5, US-101, I-15, I-10, I-80, SR-99, SR-1, I-210, I-580, I-405; California only), guides; canonical, sitemap, breadcrumbs, silo gate. |
| Day 7 Test and deploy | PARTIAL | CI and noindex staging. No domain, Cloudflare, 1,000-marker load or live post-deploy check. Still to test: broken official URLs, source outages, duplicate cameras, mobile search, health failure, sitemap correctness. |
| S1 Freeze and baseline | DONE | `baseline.md`. Linux CI green except flaky `test:perf` (not a gate). |
| S2 Source audit | DONE | `data/source-permissions.json`, inventory CSV, licensing tests; unknown = closed. |
| S3 Deploy spike | CONDITIONAL GO | `session3-findings.md`. Beta only. 20/20 boots, 0 critical; 1,000-load kill test not done. |
| S4 Exclusion proof | CONDITIONAL | 11 offline tests pass; CI `session4-exclusion` first run not confirmed. Gaps BK-1, BD-1, CCTV-NOSWITCH. |
| S5 Deployment, monitoring | WRITTEN, NOT RUN | Compose, proxy, runbook, healthcheck; never run on a real host. |
| S6 Astro SEO shell | DONE (out of order) | Built on the owner's 2026-11-22 "maxed out pages" call, before any keyword page list. |
| S7 Registry and gate | DONE | 6 camera sources; each importer rewrites only its own rows (tested). |
| S8 Camera browser, directories | PARTIAL | Directories done; filters, clustering, detail not. |
| S9 Share link, freshness | PARTIAL | Freshness done (last checked, status words, block ages). Share links not built. |
| S10 Launch certification | NOT BUILT | No site e2e, no k6 (100 then 250), no rehearsed rollback, no real-device test. |

Cameras: Caltrans 3,263; DriveBC 1,036; Finland 805; Quebec 672; Toronto 334; Calgary 222. Rules: 48 enforced, 3 pending (`node ops/harness/selftest.mjs`).

## Next (section 3): steps Claude works in order, without asking
An item is done only when each Edge-cases line names a passing test or a recorded guard.

1. **Strategy debate DONE 2026-11-23** (outcome in section 9 log). DONE 2026-11-23: network-status page `/status/` (per-source health table, headline counts only checked cameras, no counts without a fresh health file; test in dist.test.mjs). DONE 2026-11-23: browser-local saved cameras (`/saved/`, noindex, Save button on city pages; checked in a real browser; test in dist.test.mjs). Research-piece data pulled (`docs/source-audits/licence-reads-2026-11-23-agents.md`, UNVERIFIED until the page is built from it). Saved ROADS done too (Save this road on road pages, listed on /saved/, checked in a real browser). Still to build: original research pieces, browser-local saved cameras and routes, agency outreach after launch.
   Edge cases: chat gone or blocked -> one line, carry on. Answer cut off -> no judgement until read to the end. Its claims stay UNVERIFIED until checked on the primary source.
2. WAITING 2026-11-23 (needs the map app plus proxy running; no docker on this machine, so the share e2e runs only in CI, which needs the host first, item 5): Shareable map links (Session 9).** The map app already ships share links; the proxy allows /share/<code>; no share e2e test exists yet. Moves: shares of `/map/` links are our viral engine. Use GEV's native `/share/<code>`; times in UTC.
   Beats Argos by: free, no sign-in, every view shareable with visible freshness.
   Edge cases: link to a removed camera -> clear message (test needed); opened in another browser or in the iframe -> restores the view (test needed); storage blocked -> GEV logs "initialization failed: SecurityError" (seen in e2e, unresolved).
3. **Finish Day 4.** DONE 2026-11-23: city-page filters in the URL (road, feed, status; form hidden without JS, full list stays in the HTML; test in `site/tests/dist.test.mjs`; checked in a real browser on the LA page). Still open: region and country filters, then the rest. Moves: findability. Filters in the URL (country, road, direction, status); camera detail through city and road pages, never per-camera pages; nearby cameras, bbox loading, clustering; GeoNames towns after a licence row (CC BY 4.0, credit and "modified" note; OSM stays a separate ODbL dataset); phone test, 200 ms and 1 s timing.
   Edge cases: size. First search measured 139 KB gzip of the 300 KB budget at 4,998 entries; 200,000 synthetic entries do NOT fit (34 to 42 B gzip per entry, one shard holds about 7,000 to 9,000). Guard: size gate in `site/tests/search.test.mjs`; fix is region shards (30+). Ambiguous names (Springfield, Victoria, I-80): 58-query relevance set. Manifest names a missing shard: manifest test. No JS: no-JS fallback test.
4. DONE 2026-11-23: Traffic-parity data file** (rule enforced; test runs in production.yml after the page gate, needs a built site so not in the commit hook; rows to refine from Search Console). Moves: turns "match their traffic" into a gate. `data/traffic-parity.json` (cluster, type, our URL or gap reason, status; no raw Ahrefs rows, the repo is public) plus `tests/parity/parity.test.mjs`; rule `traffic-parity` PENDING -> ENFORCED.
   Edge cases: cluster with no page and no gap reason -> test fails; listed URL not in the built site -> test fails; brand/direct/social -> "not capturable"; Ahrefs numbers are estimates -> Search Console decides; export format changes -> parser fails closed; a cluster we cannot serve legally -> gap row with the reason, never a copied page. If the language split shows material Spanish (or other) traffic, build that language by the same silo and gates (real per-language data pages or none). Build biggest gap first; re-read monthly.
5. OWNER 2026-11-24 (needs Mike items 1 and 4: Cloudflare token and secrets): **Deploy to Cloudflare (needs Mike items 1 and 4).** Real domain in `PUBLIC_SITE_URL`; remove staging noindex and sitemap removal (`ops/staging/prepare.mjs` is staging only); ad-slot gate; health to R2; failure alert; Cloudflare Pages (GitHub Pages soft limit about 100 GB a month).
   Edge cases: noindex left on -> zero traffic (live read of robots and meta after deploy); ads before licences -> gate; partial health run -> last good file kept (tested); free CI minutes checked before any run.
6. OWNER 2026-11-24 (needs the running stack and a host; no docker here): **Launch security gaps:** BK-1 (a CC BY-NC data module loads at boot), BD-1 (browser-direct sources bypass the proxy), CCTV-NOSWITCH, 1,000-load boot test, load 100 then 250 clients, phone WebGL, restart and rollback.
   Edge cases: any kill criterion in `red-team-round3.md` -> no public launch, ask Mike.
7. OWNER 2026-11-24 (each source waits on Mike: TfL registration, DGT reply, keys): **Build each blocked source when it unblocks:** London (TfL), Spain (DGT reply), Oregon (TTIP), Ontario and Alberta (keys). Each: licence row, importer, fixtures including a failing one, exclusion-map entry, health pace, one region-text table, `Beats Argos by:` in `site/PAGES.md`.
   Beats Argos by: London shows which of 889 cameras TfL itself flags unavailable plus picture age from `Last-Modified` (Argos doing either is UNVERIFIED); Toronto and Calgary show labelled compass views per intersection with one source and one licence.
   Edge cases: feed renames a field -> parser fails closed, block hides (fixture); licence phrase vanishes -> importer stops; same camera in two sources -> dedupe by position (tested).
8. **Source hunts via ChatGPT/Gemini** (section 9): which countries have the most licence-clean free feeds, ranked; keyword and page ideas per country (Gemini Deep Research); free licensed sources per vertical; Argos page layouts by screenshot. Every claim checked on the primary page before a row is written.
9. OWNER 2026-11-24 (needs the Cloudflare R2 secrets): **Health finish:** R2 publish, failure alerts, one full end-to-end run (about 15 min, 5,400 requests; check CI minutes first).
10. **Verticals** (section 4 table) only after the licence row passes and the Ahrefs-free numbers justify the page type.
11. OWNER 2026-11-24 (needs the running stack, CI and a host): **Launch certification (S10):** unit, integration, Playwright e2e, security, k6, SEO, immutability, licensing, rehearsed rollback. Record the image digest, dependency inventory and a vulnerability scan with each run; test through the proxy at 10 / 25 / 50 / 100 clients, container crash, restart and rollback to the pinned image.
12. **More licensed feeds and guides from the 2026-11-22 review (agreed gaps; agent licence reads logged 2026-11-23 in `docs/source-audits/licence-reads-2026-11-23-agents.md`, UNVERIFIED; USGS looks cleanest, CHP and CAL FIRE unknown):** CHP incidents, Caltrans speeds or travel times if CWWP offers them, USGS quakes, AirNow, CAL FIRE (each needs a licence row first); coverage beyond Caltrans for the same cities (city, county, port cameras) after each licence is read; problem-led guides (closures, chain controls, snow) instead of site-mechanics guides.
   Edge cases: a lead that is paid or login-walled -> excluded, row says why; free but non-commercial -> row not_allowed, block never ships; a country with no licence text -> unknown, disabled, link-out only; a source that needs a key -> Mike item; a source dies -> health marks unknown or unavailable, blocks hide.

## 4. STRATEGY AND EVIDENCE
**End game.** Every page answers its query better than the Argos page for the same query (licensed data, health, conditions, corridors), covers every page type and keyword cluster they rank for, then passes their traffic. Scoreboard: Search Console non-brand clicks and impressions, and shares of `/map/` links; never page counts. Revenue only where a source's licence allows it.

**Traffic parity procedure.** (1) Evidence from free tools only (no paid Ahrefs needed): Ahrefs free Traffic Checker, Similarweb free page, Argos sitemap, our Search Console after launch. (2) Cluster their pages by type (country, region, city, road, guide, brand, map/app, other language); brand and own-app searches cannot be captured by pages. (3) Each cluster gets our URL or a gap reason in `data/traffic-parity.json` (section 3 item 4). (4) Build biggest gap first. (5) Re-read monthly.

**Argos teardown (2026-11-23, public pages and sitemap; details in `docs/decisions/argos-teardown-2026-11-23.md`).** Cameras, flights, ships, war, OSINT, infrastructure, hazards, 3D globe, paid tier; the map asks for sign-in. Sitemap 2,521 URLs: 644 Spanish and 564 English camera place pages, 79 country camera pages, 502 "country today" pages, 694 guides, 5 tools, ~15 other. Weaknesses: contradictory counts (London 845 vs 776 vs 2,143), templated prose, no sibling-city links (from page text; check view-source first).

**Traffic numbers (free tools; estimates, not Argos's own).**
- Ahrefs free Traffic Checker: October 2026 494K visits (+373K vs September), 459K unique visitors, 2M page views; flat May to July, steep rise Aug to Oct. Top countries by order: US, UK, India, Germany, Singapore.
- Similarweb free (desktop, estimated): organic search 61.33%, direct second, organic social third (X, WhatsApp, YouTube); US 20.73%, India 14.12%, UK 6.45%, Germany 6.12%, Italy 5.38%; Spain not in the top five; all top keywords are brand; 364 keywords in total; global rank about 32,000.
- Owner-reported: about 500k visits a month. Page counts: their public sitemap, +-20.

**Reading.** Most of their traffic is brand, direct and social, so pages alone cannot capture it. The non-brand long tail they own is small (364 keywords) and beatable. A young site reached about 500k in three months, so domain age is no barrier; why it spiked is UNVERIFIED. Our engines: data pages for non-brand queries; the free no-sign-in map with share links; launch moments tied to real events (storms, closures) using our live data; Search Console as scoreboard.

**Verticals (every row is a LEAD, all UNVERIFIED: a licence row with quote, URL and date first; paid or non-commercial = excluded).**
| Argos page type | Our page type | Free source leads |
|---|---|---|
| Cameras by place | built (EN) | section 7 |
| Country "today" | `/country/<c>/` | travel advisories, OpenAQ or WAQI, IMF PortWatch, USGS; conflict data is hard (ACLED non-commercial: likely excluded) |
| Chokepoints, ships | `/tools/<x>/` | IMF PortWatch (CC BY, to verify); live AIS needs a licensed free source |
| Flights | `/flights/` | adsb.lol (ODbL?); OpenSky stays OFF |
| Quakes, fires, storms, outbreaks | `/hazards/` | USGS, NASA FIRMS, NOAA NWS (used), WHO |
| Energy, infrastructure | `/infrastructure/` | OSM-derived (ODbL, separate), EIA, ENTSO-E |
| Guides | our own short guides | written by us |
| Outages, military | tools | IODA (terms to read); military likely excluded |
Built only after the licence row passes and numbers justify it; each new page type gets a "Beats Argos by:" line and the page gate. Conflict content: only licensed, verified, link-out with attribution, never our own claims. A vertical whose only free source is non-commercial -> gap row, not built; a stale hazard feed -> block hides.
Method for leads: read Argos's public sources page by hand (no scraping, robots.txt respected; list in `docs/source-audits/argos-source-leads.md`), then per source: free? key? commercial use? attribution? -> licence row -> importer -> page block. The bottleneck is reading licences, not pages, so the licence workflow stays a repeatable script (fetch terms, quote, row, importer, fixtures). Argos using a source is NOT a licence.

**Language.** Spanish is LOW priority (Spain is outside their top five audiences although half their pages are Spanish). String table and hreflang plumbing are ready; add Spanish, Italian or German only when Search Console or these tools show that audience. Guides are written, never machine-mirrored.

**GEV vs us.** GEV is the APP (globe, flights, ships, satellites, weather, quakes, fires, cameras). It does not make SEO pages, country pages, tools, guides, health or road conditions. 146 of its 303 inventoried sources have unknown licences (OpenSky restricted; adsb.lol and USGS allowed per doc; AISStream, CelesTrak, GDELT, IMF PortWatch unknown).

## 5. ARCHITECTURE AND DATA MODEL
```
Importers (local) -> normalize, dedupe, validate -> data/camera-registry/cameras.json (git)
data/source-permissions.json (git, gate) ---------^
GitHub Actions every 3 h -> health checker (per-source pace) + live feeds -> health.json / conditions
Astro build (registry + curated page list) -> static site; staging on GitHub Pages, launch on Cloudflare Pages
Browser: Astro pages + GEV map in an iframe (own subdomain, behind an allowlist proxy)
```
- Site: Astro static, one registry and one `countsBy` function feed every number. Search is a prebuilt static index loaded on first focus, sharded by country. Map state is the URL (`/map/?lat=&lon=` becomes GEV's `#v=2&lat=&lon=&alt=`).
- Map engine: God's Eye View (GEV), pinned in `ops/upstream-base.txt`, IMMUTABLE (separate gitignored clone, never edited; check: `git status --porcelain` empty and HEAD equals the pin). Docker image behind the nginx allowlist proxy (`ops/proxy/`, `data/proxy-allowlist.json`; 1,435 bypass checks, 0 failures). Deploy rules: GEV port never published, `GEV_KEY_SETUP_TRUSTED_PEERS=none`, `GEV_ALLOWED_HOSTS`, no secrets in the container, engine subdomain noindex. It runs a dev server (not hardened): beta only.
- Ads go around the map on Astro pages, never inside the engine. Esri basemap disabled in public. OpenFreeMap with GEV: no test recorded; fallbacks self-hosted OSM tiles or Natural Earth; a basemap manifest (licence, attribution, review date) gets the same fail-closed gate as sources.
- Data (files in `data/camera-registry/`): `cameras.json` (id prefixed by source, sourceId, name, road, direction, city, regionSlug, regionName, lat, lon, feedType still|video, officialUrl, officialUrlLastVerified, lastSeen; optional locationText = the source's own caption, text only); `sources.json` (api auth, rateLimit, docsUrl; attribution, license, licenseUrl, reviewedAt) and `data/source-permissions.json` (per-source `metadata_commercial`, `image_display`, `image_caching`, `image_redistribution`: allowed | not_allowed | unverified, default unverified; quote, URL, review date); `health.json` generated, never committed (generatedAt, runOk; per camera status, httpStatus, contentType, lastChecked, lastSuccess, lastChanged, consecutiveFailures).
- Enforcement layers: Claude Code hooks (`.claude/settings.json`: Line 0 every request, block on writes under `gev/`), git pre-commit (`.githooks/pre-commit`), CI (immutability, preflight, site), page gate on the built site. Every rule is ENFORCED or PENDING in `ops/harness/rules.mjs`; check with `node ops/harness/selftest.mjs`.
- Health: statuses reachable, stale, unavailable, unknown; `lastChanged` is separate (an unchanged picture is not proof of a dead camera); a 200 with an HTML error page or a placeholder picture is NOT working; a source with no `Last-Modified` (BC) can never be stale; blocked hosts (Quebec) are unknown by design; a camera whose own last check is over 48 h is unknown; a failed or partial run never replaces the last good file.
- Importers: each rewrites only its own rows; each re-reads its licence page every run and stops if the quoted phrase is gone; local-only, they write the committed registry (CI does not refresh it).
- No database, no backend in v1, no historical images, no mass programmatic pages, no copying or scraping argosatlas.com. GEV's own Node server is the live-data engine. No image embeds, proxy or caching for a source until its `image_*` permission is allowed.
- Kill criteria and the session order are in `docs/decisions/red-team-round3.md`: if safe operation needs an edit under `gev/`, STOP and ask Mike (small documented patch series or drop GEV).

## 6. PAGE CONTENT RULES
Every city or road page carries ALL blocks that have licensed data for that place; a block with no data is omitted, never faked; each shows its own source, timestamp and credit and hides itself past its max age. A page works without JS (build-time snapshot, then refresh).

| Block | What it shows | Source (needs `allowed_per_doc`) | Max age |
|---|---|---|---|
| Cameras | every camera, road, direction, link to the official source (no images) | registry | registry date |
| Camera health | reachable / stale / unavailable / unknown, last checked, last changed | our checker | 2 h |
| Road conditions | incidents, lane closures, chain controls, road work | Caltrans feeds; DriveBC Open511 | 15 min |
| Road weather | air and surface temperature, wind, visibility | Caltrans RWIS, NWS | 1 h |
| Forecast and alerts | 48 h forecast, active alerts | NWS (US only; Canada after ECCC licence read) | 3 h |
| Traffic signs | message sign text | Caltrans CMS | 15 min |
| Coverage | roads and counts, density, gaps, definition of "near" | registry | registry date |
| Corridor view | cameras in driving order, "estimated from camera positions" | registry (geometric order, NOT milepost: postmile restarts at county lines) | registry date |
| Map | the page's cameras on the GEV map | GEV embed `?embed=1` | live |

Rules: pages publish only where the registry has 3+ cameras (rest noindex); conditions above camera lists; three times kept apart (feed updated, record changed, page built); status words defined once per list; a "Greater <city>" block (cameras within 30 km, both counts printed); sunrise and sunset computed locally; clean labels; a "do not use while driving" notice; no featured-camera section without images; Open-Meteo OFF until its terms are read.

**Silo (enforced by `ops/harness/page-gate.mjs`).** `/cameras/` (world) -> `/cameras/<country>/` -> `/cameras/<country>/<region>/` -> city; `/roads/<slug>/` (California only until a second country has roads); guides. Reachable from `/` in 4 clicks, no orphans, city -> parent region, 3+ related cities, a guide, the map; region -> country -> world hub; hubs link every child; guides link a city. `site/PAGES.md` must carry "Beats Argos by: ..." for each indexable page. `/map/` is the app with a short crawlable intro and plain HTML links to the hubs; map-state URLs (`/map/<place>/`) have their canonical on the matching landing page, never hash-only (`/map/#london`). Real `<a>` links with descriptive anchors ("Toronto traffic cameras"), not "click here". Initial HTML carries title, count, coverage, sources, health summary and links; the map hydrates after. NWS calls need a User-Agent. City names come from the feed's own fields; where a feed has no place (Quebec, Toronto, Calgary) there are no city pages.

**Licence and link-out rules.** Link-out only for pictures. Claude never sets a permission to allowed; Mike confirms. A free feed is not a licence; Argos using a source is not a licence; image rights are separate from data rights. Review dates expire in 180 days and the gate disables the row. A site that blocks automated access (robots, 403, bot check) is not worked around. Never copy Argos code, text, images, layout or branding; never scrape it. Registry data is untrusted: `textContent`, never HTML.

**Money.** Display ads and affiliate (dash cams, road-trip gear, roadside assistance) beside data blocks, never inside a camera link-out; ad slots OFF until each source's terms allow data beside ads.

## 7. SOURCES
**Built (camera registry).**
| Source | Cameras | Licence (quoted by us) | Notes |
|---|---|---|---|
| Caltrans CWWP, California | 3,263 | public domain, no charge (Mike OK pending) | plus lane closure, chain control, signs, RWIS feeds |
| DriveBC HighwayCams, BC | 1,036 (from 1,041 rows, 5 position duplicates) | OGL - British Columbia, commercial | list only; 192 have a place; Open511 events (319 active) built |
| Fintraffic Digitraffic, Finland | 805 (of 808) | CC BY 4.0, "even commercially" | stops if the sentence vanishes; 60 requests a minute limit; "Image not available" grey JPEG counts as unavailable |
| Quebec MTMD | 672 (of 683) | CC BY 4.0 dataset level | Cloudflare bot check: all unknown by design |
| Toronto | 334 (of 336) | OGL - Toronto, commercial | CKAN robots Disallows the file download, so the datastore API is read |
| Calgary | 222 | OGL - City of Calgary v2.1, commercial | region `calgary`, not Alberta |
Conditions feeds built: Caltrans lane closures, chain controls, signs, RWIS; NWS forecast and alerts; DriveBC Open511.

**Verified, not built.**
| Source | Cameras | What unblocks it |
|---|---|---|
| UK TfL JamCams | 889 | Mike registers (item 2); OGL v2 amended; image age readable; must not crop |
| Spain DGT NAP | 1,980 | DGT reply (item 3); dataset page says CC BY, legal notice forbids unauthorised commercialisation |
| Oregon TripCheck | not counted | TTIP account (item 8) |
| NSW Live Traffic (open copy) | 250 | decision: not now; 0 of 15 image links worked, endpoint status unverified, official API needs a key |
| Singapore data.gov.sg | 8 | feed too small; licence clean |

**Blocked.** Ontario 511 (key, agreement). Alberta 511 (key; written commercial permission; 10 calls per 60 s). 511NY (agreement unread). Washington WSDOT (access code; photo criteria CC BY-NC-ND, link-out only). Norway (registration; NLOD). Queensland, Georgia, Pennsylvania (keys). Estonia, Japan MLIT (no open feed found). Michigan MiDrive (808 cameras, NO licence, undocumented endpoint: do not build).

**Unverified claims from ChatGPT (check each source's terms page before any row is `allowed`).** Ontario 511 is under the Open Government Licence - Ontario, needs registration, and third-party redistribution must be disclosed. Alberta 511 allows about 10 calls per 60 s. Caltrans: general info public domain, some photos copyrighted. National Highways (England) needs a separate paid commercial licence. WSDOT photo reuse criteria are non-commercial (CC BY-NC-ND seen).

**Excluded.** NZTA (terms: not for commercial purposes). DriveTexas (emergency use only). FL511 (personal use), NYC DOT (needs agreement), Houston TranStar (no licence). Germany Autobahn (0 webcams). Netherlands NDW (no cameras). Victoria (enforcement cameras only). Caltrans QuickMap speeds (Google data).

**Leads, not checked.** Colorado, Utah, Arizona, Florida; CHP incidents (link-out only); other GEV catalog providers (Vegagerdin, MLIT river cameras 1,054, Autostrada del Brennero); Ireland TII, Czechia, Poland, Edmonton, Vancouver (nothing found, absence not proven). Data leads: OSM (ODbL), Natural Earth, OurAirports, GeoNames. Each needs its own licence row. Counts and quotes: `docs/source-audits/*`.


## 8. DECISIONS LOG
- 2026-11-23: domain worldtrafficcameras.com bought by the owner (Claude suggested it: matches the main query, world-first; Claude checked it was free via the registry, trademark not checked). Site name World Traffic Cameras. Production deploys to Cloudflare Pages from GitHub Actions; hidden from search until LAUNCH=live.
- 2026-11-21 Link-out first; no fixed 8-camera threshold; GitHub Actions over a server; R2 for health; granular per-source permissions; no database in v1 (3-round debate).
- 2026-11-21 GEV stays untouched in its own container behind a proxy; Sessions 1-3 before the Astro site; kill criteria agreed before testing.
- 2026-11-22 World-first, not region-first. Argos's public sources are our lead list; each needs its own licence row.
- 2026-11-22 BC was built second only because it needed no key (convenience, not strategy).
- 2026-11-22 Road order is geometric, not milepost (checked on live Caltrans files: postmile restarts at every county line; rank correlation with position only 0.1 to 0.2 for I-5 and US-101, 0.77 to 0.90 for I-5 northbound, I-405, US-101 overall, and it matches exactly inside most single districts).
- 2026-11-21 Stack debate result: Astro static; map was planned as MapLibre + OpenFreeMap (fallback self-hosted PMTiles) but is now the GEV iframe; R2 over committing health data (ChatGPT won); per-camera health and granular permissions (ChatGPT won); link-out-first and GitHub Actions over a server (Claude won).
- 2026-11-22 Proxy uses an allowlist (denylist as second layer); public dev server accepted for beta only.
- 2026-11-23 Country level added to URLs; roads stay `/roads/<slug>/`; no redirects (nothing was ever indexed).
- 2026-11-23 Per-camera pages rejected (200,000 thin pages); search results go to city, road, region, country, map or the official source.
- 2026-11-23 World sources built: Finland, Quebec, Toronto, Calgary. Spain blocked on DGT. NSW not now. NZTA excluded. Michigan not built. Singapore skipped (8). Autobahn empty.
- 2026-11-23 Quebec shows unknown by design; we do not work around a bot check.
- 2026-11-23 Spanish is low priority; plumbing ready; no thin mirrors. Map never asks for a sign-in.
- 2026-11-23 One planning file: this one. `mike-todo.md` and `session3-plan.md` folded in and deleted.

## 9. ASK-CHATGPT PROCEDURE (rule; also Gemini)
When: before any plan-changing decision, for big research (source hunts, licence terms, teardowns, keyword and page ideas), and for a second opinion on a finished page or architecture. Not for small lookups or code edits.
1. One batched prompt per topic: goal in one line, exact questions, "give a table", "mark UNVERIFIED anything you could not open", "say 'could not open' instead of guessing". Public URLs and generic text only: no secrets or personal details. If a site blocks bots (staging does), paste the page text.
2. Guest chat in Chrome (chatgpt.com or gemini.google.com/app). Never log in or enter credentials for Mike. Browser blocked: say so in one line and carry on.
3. Read the WHOLE answer to its final line. Every fact is UNVERIFIED until checked on the primary source.
4. Where it disagrees with this plan, say where Claude agrees, where not, and why; report wrong claims back to it.
5. Log below; save long answers in `docs/source-audits/` or `docs/decisions/` marked UNVERIFIED or VERIFIED.

| Date | Asked | Outcome (file) |
|---|---|---|
| 2026-11-21 | Red-team of GEV fork and architecture | `red-team-round3.md` |
| 2026-11-22 | Session 3 results review | allowlist proxy; verified in code |
| 2026-11-22 | Staging review (Gemini + ChatGPT) | gap list; sub-pages unreadable to them, Argos counts UNVERIFIED |
| 2026-11-22 | Feed hunt, 13 jurisdictions | `chatgpt-feed-research-2026-11-22.md`; Oregon, BC, Alberta, WSDOT verified |
| 2026-11-22 | Our LA + I-405 pages vs Argos | `review-2026-11-22-chatgpt-vs-argos.md`; 8 fixes done; 2 of its defects were my paste errors |
| 2026-11-23 | Day 4 search design | `day4-search-design.md`; per-camera pages rejected; sizes now measured |
| 2026-11-23 | World feed ranking | `chatgpt-world-feeds-2026-11-23.md` UNVERIFIED, then the live audit |
| 2026-11-23 | TfL, Calgary, NZTA terms read in Chrome; DGT email | `world-feed-audit-2026-11-23.md` |
| 2026-11-23 | Strategy debate (read to its last line) | Agree: distribution is the biggest risk, so shareable map links (Session 9) stay first; camera health and provenance public (already built, extend with a network-status page); never index thin pages (MIN_CAMERAS gate exists); no-account is our edge, so add browser-local saved cameras and a saved-route page (no server). New: original research from our own health data ("how many public road cameras are actually online", coverage by highway) as link bait; ask the agencies that run each feed to list us. Disagree: "road-first, skip country count" conflicts with the owner's world-first rule and the parity gate, so we keep adding licensed countries; its 3K visits by day 90 is a floor, not our target; "buy domain / use Cloudflare" already done; its 15 names are moot (name bought) and its Cloudflare 500 builds per month and Argos facts are UNVERIFIED (it cites pages it says it read; we have not checked them). Its freshness point is right but not new: 200 is not proof (CLAUDE.md rule); image-age freshness stays unverified because we link out and never fetch images. |
| 2026-11-24 | Why the agent keeps stopping (ChatGPT guest chat; zip upload refused, guest chat takes images only, so text was pasted) | Verified in code: the Stop hook allowed ONE push per reply (`stop_hook_active` early return) and counted `**DONE` and `**OWNER` lines as open. Fixed in the global `plan-gate.mjs`: markdown-tolerant status check, per-session counter (25 blocks, reset after 30 idle minutes), tested. Pre-commit now quiet. ChatGPT's replacement script NOT used: it used `require` in an `.mjs` file, its heading regex would not match `## Next (section 3)`, and it dropped the scheduled-task and lock guards. Its block-cap claims VERIFIED in the Claude Code docs (hooks.md, env-vars.md): built-in cap is 8 consecutive blocks, reset each time Claude calls a tool, setting CLAUDE_CODE_STOP_HOOK_BLOCK_CAP; not changed because a working agent resets it. Whether stop_hook_active resets between prompts is not documented. |

## 10. WHAT BREAKS FIRST (edge-case register, worst first)
1. A licence changes or is misread and ads break a source's terms. Guard: gate with quote, URL, date; importers stop if the phrase vanishes; 180-day expiry; ads OFF (`revenue-slots` PENDING). Needs Mike item 4.
2. Restricted data reaches a visitor through GEV. Guard: allowlist proxy, deny rules, 1,435 checks, exclusion tests. Open: BK-1, BD-1, CCTV-NOSWITCH; `session4-exclusion` first CI run not confirmed.
3. Public GEV exposure (dev server, credential setup). Guard: private network, no published port, trusted peers `none`. Never tested on a real host.
4. Staging noindex left on at launch. Guard: launch checklist, live read after deploy.
5. A 200 hides a dead camera. Guard: health checker (content type, placeholder picture, validators). Gaps: Quebec unknown; BC never stale.
6. Rate limits and bot checks. Guard: per-source pace, fair budget. Gap: full end-to-end health run not done.
7. Scheduled Actions run late or are disabled after 60 days idle in a public repo. Guard: manual dispatch, "last checked" on pages. No failure alert yet.
8. Search index outgrows its budget. Guard: size gate; fix is region shards.
9. CI free minutes run out. Guard: check the remaining minutes before any run; no forced full reruns.
10. Thin pages. Guard: 3+ camera floor, curated list, unique data per page.
11. CONTRADICTION: section 6 says Open-Meteo stays OFF until its terms are read, but `data/source-permissions.json` marks it allowed and `/api/weather-effects` is allowlisted on that basis. Fix: Mike item 10, then align.
12. Two writers overwrite one file. Guard: one writer per file; one session edits this file at a time.
13. Windows vs Linux: GEV `npm test` fails on Windows (ENAMETOOLONG); `test:perf` is flaky on both. Linux CI is the target; thresholds untouched.
14. Public repo exposure: no secrets, no raw Ahrefs rows (`research-private/`, `docs/research/`, `prompts/` are gitignored).
15. OpenFreeMap has no SLA. Guard: provider abstraction (the map is currently the GEV iframe).
16. Scale of pages: 100x pages means build time and R2 file count grow. Guard: measure monthly; one JSON per region, not per page.
17. NOT VERIFIED anywhere: a full end-to-end health run (about 15 min, 5,400 requests); picture rights for any source; that camera numbers (Toronto, Calgary) stay stable between list refreshes; any page on a phone or Android viewport; that Finland place names are municipalities; Digitraffic's higher limit with its header; Calgary and Toronto rate limits (none published). A feed that changes its licence-page layout without losing the phrases is not caught.


## 11. EVIDENCE INDEX
`plan.md` is the only plan, status and to-do file. These `docs/` files are read-only evidence records, never plans.
- `docs/decisions/`: `baseline.md` (GEV baseline, exit codes); `red-team-round3.md` (kill criteria, 10-session order, 25 edge cases, test plan); `session3-findings.md` (deploy spike); `session4-findings.md` (exclusion proof, open gaps); `scan-policy.md` (what blocks a release); `day4-search-design.md` (search design, measured sizes); `url-map.md` (old to new URLs); `review-2026-11-22-chatgpt-vs-argos.md` (page review, 8 fixes); `bc-health-stale-limit.md` (why BC is never stale); `argos-teardown-2026-11-23.md` (Argos product, sitemap, traffic).
- `docs/source-audits/`: `world-feed-audit-2026-11-23.md` (live audit, two rounds, terms read in a browser); `chatgpt-feed-research-2026-11-22.md` (Oregon, BC, NY, Alberta, Texas, WSDOT); `chatgpt-world-feeds-2026-11-23.md` (UNVERIFIED shortlist); `argos-source-leads.md`; `source-inventory.csv` (generated by `ops/audit/build-inventory.mjs`).
- `docs/deploy/runbook.md`: deploy, rollback, kill switch (a procedure, not a plan).
- Gitignored, not in the repo: `docs/research/`, `research-private/`, `prompts/`.
