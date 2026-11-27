# Plan: free world live-camera directory (Argos Atlas alternative)

**This is the ONLY plan, status and to-do file.** Files in `docs/` are evidence records (what was read, measured or decided on a day). They are never plans. Mike-only tasks live in section 1.

## NOW (read this first; work top to bottom; owner 2026-11-26: "I feel like it's fucking taking forever")

Definition of a working website: the domain loads, /map/ runs God's Eye View, and every camera GEV says is usable is listed. Noindex stays until Mike says go live.

1. DONE 2026-11-26: GEV camera packs imported (live site 24,371+ links). Left out: WSDOT beyond 1,200, Ontario and Ottawa (credentials), Tarktee (timeout).
2. DONE 2026-11-26: static GEV on Pages project worldtrafficcameras-map, in /map/, up to 8,000 cameras. Left: more than 8,000 cameras, server-only layers, phone test.
3. REPO LEADS (docs/decisions/github-repos-2026-11-26.md): OpenTrafficCamMap and canada-cams for cameras we lack; osiris CCTV code; worldmonitor only as a separate AGPL app or for ideas.
3b. GAP LIST: work the audit agent's ranked table (GEV layers, keys, Argos gaps, slow process), highest visitor value first.
4. DONE 2026-11-26: domain DNS (apex and www answer 200, noindex).

Speed rules: only NOW items get worked; a new idea goes under section 3, not in front. Add status as one short line per item (under 300 characters); evidence and long notes go in docs/. Full history: `docs/plan-archive-2026-11-26.md`.

### MAP LAYERS WITHOUT A SERVER (added 2026-11-27 from a code read; supersedes "waiting" in items 17 and 19 for these)
Done = switched on in a real browser on the live map with data showing, not just deployed.
- [x] Earthquakes (seen live in Chrome 2026-11-27)
- [x] GDACS 80 alerts, NASA EONET ~1.0K events seen live 2026-11-27. [ ] NWS alerts added without error, own count not seen (few drawn-area alerts today?)
- [x] Canada air quality loaded live 2026-11-27. [ ] NASA recent imagery: needs a drawn box, not tested
- [x] Wildfire outlines 39 seen live 2026-11-27. [ ] Hurricanes: no active storms in the feed, untestable today ( a red map-freshness run means they went stale)
- [x] Satellites 11.8K; space launches 26 (seen live 2026-11-27)
- [ ] Active fires, NASA FIRMS (3-hour copy; needs the key in CI; measure file size first)
- [x] Restricted airspace 569; shipwrecks 8.0K (seen live 2026-11-27). Wind: needs a server (client checks the query of each answer)
- [ ] Data Library shows ~90 entries and most fail (hosts blocked; cannot hide them without editing GEV). Rest of the Data Library (imagery, power plants, tide stations, bridges and others): one licence row per host
- [ ] Bundled layers (dams, datacenters), USGS topo and night lights: may already work, test them
- Needs a server, a key or permission: weather radar and clouds, live flights (OpenSky off), live ships, directions, transit, rail, military flights and sites. Full missing-feature rows: data/gev-parity.json (gap 813 on 2026-11-27), data/argos-maps-matrix.json (gap 17).

From the GEV README read 2026-11-27 (first list came from a code read and missed these):
- [ ] Submarine Cables toggle still shows in the layer list (data removed, TeleGeography); confirm it loads nothing
- [ ] Test, may work with no server: visual styles 1-6, HUD, detection overlay, Draw, Director mode, share links, North Up/tilt, bundled submarine cables stay OFF (TeleGeography)
- [x] GEV search cause found (audit): only 9 bundled cities; others need Photon (photon.komoot.io, fair-use limits) or a server; /map/ note corrected. Was: Test GEV keyless search: README says coordinates and bundled cities need no geocoder; "Seattle" and "Atlanta" gave "Location not found" in our test, cause unknown; fix the note on /map/ to match what the test shows
- [ ] Check licence and whether browser-direct: Street Level (KartaView, Panoramax), Mapped ALPR, Radio, Wildlife, Bikeshare
- [ ] Test: Stories (one ships a non-commercial flood scene and turns on flights); Traffic simulation may work with a static {"hasKey":false} at /api/tomtom/status
- Needs a server or key: Cockpit (needs flights), GNSS integrity, News, Directions, OSM Places, Installations, Transit, Rail, voice and chat, MCP
- NYC cameras: GEV ships them opt-in only, needing your own NYC DOT agreement; stays off.

FULL GEV READ 2026-11-27 (all docs and code, 5 agents): docs/gev-full-read-2026-11-27.md lists every feature as works / free work left / needs server or key / must stay off. Free work left, in order:
- [x] Live 2026-11-27: map header "World Traffic Cameras"; Street Level (KartaView) 314 near Seattle; licence file and probe files served. [x] Share path /share/<code> now serves the map (200; restore of a real code not yet tried) [x] smaller title clear of the buttons, seen live, 54 library entries, Acartia, installations, traffic sim: browser test pending
- [x] Wind (GFS default) seen live 2026-11-27 (streaks over the globe, "NOAA GFS")
- [ ] Photon place search: licence row + privacy line, or decide to keep only bundled names
- [x] Sea Marks and Ski Pistes opened; Sea Marks switched on live 2026-11-27 (no error; marks only show near coasts when zoomed in); Ski Pistes not yet switched on
- [x] Our logo and app name in the built copy (live 2026-11-27); [ ] GEV PNG app icons and first-run author links remain
- [ ] InciWeb link copy; FIRMS once its row and key are in place

- 2026-11-27 owner: "Celestak emailed us it's fine" (CelesTrak reply, satellite data). Row `celestrak` already open (owner approval). Email text not yet saved: paste it into docs/outreach/ as written evidence.

PAID AND SIGN-UP ITEMS (owner 2026-11-27: "The last thing left is spend real money on licenses and server"). Prices are from earlier checks, re-check before paying.
- FREE sign-ups, no money (unlock layers now): NASA FIRMS map key (active fires); AISStream key (live ships, also needs the server); Mapillary token (street photos).
- Server, about $24/month (DigitalOcean 4 GB, price read 2026-11-26; a 2 GB box is $12): unlocks place search for every city, weather radar/clouds/lightning, ships, transit, rail, directions, military flights, GNSS, news, camera health checks.
- OpenSky commercial licence, 99 USD/month or 79.20 on a yearly plan (their email, 2026-11-24): live flights; needs the server and a fixed IP.
- Pay-per-use, optional: OpenAI or Gemini key (voice and chat on the map); Google Maps key (3D cities, Street View; metered).
- Not buyable cheaply or not worth it now: TomTom live traffic (commercial terms), Cesium ion commercial plan (price not checked).

## 0. Header
- Goal: a free, world-wide directory of live traffic cameras with road conditions, camera health and a free map that never asks for a sign-in. Link-out only until a source allows pictures.
- End game: beat argosatlas.com page for page, match the traffic they capture, then pass it (measured by Search Console against Ahrefs). Make money inside the rules (ads and affiliate beside data, never a paywall). A penalised site earns $0.
- Site: World Traffic Cameras, worldtrafficcameras.com (bought 2026-11-23, Cloudflare). Name and URL live in site/src/config.mjs. Staging (noindex): https://mwoovancity.github.io/live-camera-map/. Ship target: Fri 2026-11-27.
- Why Argos wins traffic (owner 2026-11-23, confirmed in Ahrefs): repeat visitors who found it by keyword, then search the brand. So: port GEV as a website, add what Argos has beyond GEV, make the map worth returning to.
- How to read: section 1 is what only Mike can do. Section 2 says what is built. Section 3 is the work queue Claude takes in order. Everything else is reference. "UNVERIFIED" = not checked on the primary source.
- Success = people find a camera, click through to the official source and come back; the scoreboard is Search Console non-brand clicks and shares of `/map/` links, never camera or page counts. Monetization: ads, affiliate, donations; never a paywall.
- Last updated: 2026-11-25. Registry counts are NOT kept by hand: run `node ops/status-counts.mjs` (2026-11-25: 13,801 cameras, 16 sources, 10 countries).

## 1. OWNER TO-DO (Mike only; Claude must not attempt these)
Highest unblocking first. "Claude did" = what is already prepared so your step is small.

| # | Your step (one line) | Why it matters | Claude already did | Status |
|---|---|---|---|---|
| 1 | Cloudflare deploy, two steps. (a) Create an API token: Cloudflare > My Profile > API Tokens > Create Token > Custom token, permissions: Account > Cloudflare Pages > Edit, and Zone > DNS > Edit (zone worldtrafficcameras.com). (b) In GitHub: repo MwooVancity/live-camera-map > Settings > Secrets and variables > Actions > New repository secret, twice: CLOUDFLARE_API_TOKEN (the token) and CLOUDFLARE_ACCOUNT_ID = 175119c9cdd3c5d253a685ce56080b8c (the long number in your Cloudflare dashboard address). Never paste the token to Claude. | The site goes live on worldtrafficcameras.com. Until then the production workflow does nothing. | DOMAIN BOUGHT 2026-11-23 (Cloudflare nameservers confirmed; expires 2027-11-23). Site name is now World Traffic Cameras. .github/workflows/production.yml creates the Pages project, deploys, attaches the domain, and keeps the whole site hidden from search (noindex, robots Disallow, empty sitemap) until you set the repository variable LAUNCH to live (Settings > Secrets and variables > Actions > Variables). Switch is tested. | OPEN (domain DONE) |
| 2 | Register a free TfL developer account. | London, 792 available JamCams. | DONE 2026-11-24: account email arrived 2026-11-23; the list needs no key, so Claude built the London source (commit 1334c57) from TfL's terms: commercial use allowed, credit printed. | DONE |
| 3 | Watch your Gmail for the reply from nap@dgt.es and paste it to Claude. | Unlocks Spain, 1,980 cameras (not Catalonia, not the Basque Country). Spain is blocked because DGT's two official pages disagree about commercial use. | Email sent 2026-11-23 (EN + ES). | WAITING |
| 4 | Confirm each licence row below (read the quoted line, say OK). Claude never sets "allowed" for you. Needed before any ads. | Ads must not break a source's terms. | Each row has quote, URL and date in `data/source-permissions.json` and the importer re-reads the terms every run. | OPEN |
| 5 | Open one quebec511.info camera link in a normal browser (e.g. https://www.quebec511.info/Carte/Fenetres/FenetreVideo.html?id=3998) and tell Claude if it loads. | Our tool got a bot-check page, so all 672 Quebec cameras show "unknown" by design. | Importer built; we do not bypass the check. | OPEN |
| 6 | Register Ontario 511 (developer key + agreement). | Next big Canadian source. | Importer not built (needs key). | OPEN |
| 7 | Alberta 511: get a developer key AND written permission for commercial use. | Terms forbid commercial reproduction without it (quoted in section 7). | Nothing built. | OPEN |
| 8 | Register an Oregon TripCheck (TTIP) account; ask ODOT in writing that ads are fine. | Strongest permission found ("businesses ... may use data and images"). | Quote verified on the FAQ page (an FAQ, not a licence). | OPEN |
| 9 | Apply for 511NY developer access and save the agreement text. | Agreement text could not be read by us. | Only a search snippet seen: UNVERIFIED. | OPEN |
| 10 | Read Open-Meteo's commercial terms and tell Claude. | Permissions mark it allowed from a CC BY line; my recollection is that the free tier is non-commercial (UNVERIFIED). `/api/weather-effects` depends on it. | Flagged in section 10. | OPEN |
| 11 | Decide how ads sit beside third-party data; ask each provider whether pictures may be shown beside ads (DriveBC and Fintraffic optional). | Ad slots stay OFF until this is answered. | Rule `revenue-slots` is PENDING. | OPEN |
| 12 | Host and deploy steps: choose host; Cloudflare Tunnel and DNS to 127.0.0.1:8080 (token stays on the host); set `GEV_ALLOWED_HOSTS` and `GEV_EMBED_FRAME_ANCESTORS` in `ops/deploy/.env`; run workflow `session5-compose` once from the Actions tab and say if green; after launch set repo variable `HEALTH_BASE_URL`. | Public map engine and monitoring. | Compose file, proxy, runbook, healthcheck written; Preview build proven on Linux Docker in CI 2026-11-24 (item 23). Not run on a real host. | OPEN: Mike buys the host when home (ChatGPT and Claude both pick Hetzner, 2 GB), then Claude follows the runbook |
| 13 | Optional: Washington access code; Norway credentials; keys for Queensland, Georgia, Pennsylvania, Minnesota; email tmc@transpordiamet.ee (Estonia); ask MDOT for a licensed Michigan feed; ask LTA why Singapore returns 8 cameras. | Each could add a source; none blocks the rest. | Probed, section 7. | OPEN, low |
| 14 | OpenSky answered 2026-11-24: 99 USD a month (79.20 on 12 months) commercial licence, fixed server IP needed. Only if you want live flights. Claude recommends not buying yet (item 20). | Live flights stay OFF until then. | Email sent, reply read in full, terms logged. | YOUR DECISION, low |
| 15 | Optional: re-run Gemini Deep Research (limit hit 2026-11-21) and paste into `docs/research/`; keyword research in Keyword Planner. | Extra ideas only. Pages are already chosen by real coverage; Search Console after launch is the scoreboard. | Ahrefs-free and Similarweb evidence in section 4. | OPEN, low |
| 16 | In Cloudflare > Workers & Pages > worldtrafficcameras > Custom domains: click "Complete DNS setup" on worldtrafficcameras.com and www. | The domain does not resolve until you do (Claude's click was blocked as an account DNS change). Noindex stays on until you say "go live". | Site deployed to worldtrafficcameras.pages.dev (noindex). | OPEN |
| 17 | Decide the public map basemap: OpenStreetMap tiles now (free, the OSM policy lets them block heavy use) or budget a paid one. | The default GEV basemap was Esri (terms unknown); the /map/ iframe now picks OSM. Item 25. | Done and tested in a real browser. | OPEN |
| 18 | Before ads: decide about the Cesium ion credit on the globe (its Community plan is non-commercial). | Ads make the site commercial. | Noted in item 25; no token added. | OPEN |

| 19 | SIGN-UP LIST 2026-11-25 (owner: "give me everything still missing for my sign up and I'll do it"), in value order. LAUNCH BASICS: (a) DONE 2026-11-24: Cloudflare token and the GitHub secrets are set and two production runs succeeded (code review D fix; nothing for Mike here); (b) "Complete DNS setup" (#16); (c) DONE 2026-11-26: contact@worldtrafficcameras.com forwards by Cloudflare Email Routing (delivery not yet tested); the privacy, about, takedown and security.txt pages that waited on it are Claude work now; (d) Google Search Console DONE 2026-11-26 (domain property verified by DNS TXT; keep that record; sitemap waits for go live); Bing Webmaster still open; (e) Cloudflare R2 on + secrets for health publish and failure alerts (item 9). KEYS THAT UNLOCK CAMERAS: South Korea data.go.kr key for MOLIT dataset 3068943 and a UTIC key (state the real ad-supported directory purpose); Ontario 511; Queensland QLDTraffic (401 without a key); Sweden Trafikverket; Norway Statens vegvesen DATEX account; Oregon TripCheck TTIP (+ ODOT ads OK); 511NY; Arizona AZ511, Georgia, Nevada, Utah, Wisconsin and Alaska 511 developer keys (leads from the open LiveTrafficCam registry, CC BY 4.0, 2026-11-25); WSDOT access code. DECISIONS: OK each licence row (#4), ads beside third-party data (#11), 2 GB host (#12), basemap (#17). Paste any key or code to Claude and it wires it in. | Each unlocks a named source or a launch step. | Claude wrote the drafts in docs/outreach/ and keeps this list. | OPEN |

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

## 2. STATUS TABLE (honest state, 2026-11-23; camera counts refreshed from data 2026-11-24 with `node ops/status-counts.mjs`)
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
| S5 Deployment, monitoring | RUN IN CI, NOT ON A HOST | session5-compose and session6-preview (build then vite preview behind the real proxy: 1531 route checks, gzip, one-year cache, restricted files refused, 459 MiB under light load) green on Linux 2026-11-24; never on a real host. |
| S6 Astro SEO shell | DONE (out of order) | Built on the owner's 2026-11-22 "maxed out pages" call, before any keyword page list. |
| S7 Registry and gate | DONE | 16 camera sources in 10 countries (was 6 on 2026-11-23); each importer rewrites only its own rows (tested). |
| S8 Camera browser, directories | PARTIAL | Directories done; filters, clustering, detail not. |
| S9 Share link, freshness | PARTIAL | Freshness done (last checked, status words, block ages). Share links not built. |
| S10 Launch certification | NOT BUILT | No site e2e, no k6 (100 then 250), no rehearsed rollback, no real-device test. |

Cameras (2026-11-24, from data/camera-registry via `node ops/status-counts.mjs`): 13,801 from 16 sources in 10 countries: Caltrans 3,263; Taiwan THB 2,354; Iowa DOT 1,252; DriveBC 1,036; Hong Kong 1,011; Austin 823; Finland 805; London 792; Quebec 672; Iceland 499; Madrid 357; Toronto 334; NSW 250; Calgary 222; Baton Rouge 118; A22 Brenner 13. Rules: 53 enforced, 2 pending (`node ops/harness/selftest.mjs`).

## Next (section 3): steps Claude works in order, without asking
Trimmed 2026-11-23: finished detail lives in git history (`git log -p plan.md`) and section 9.
MINIMUM RULE (owner 2026-11-23, HARD): the public site does everything GEV does and everything Argos Maps does, as a floor, never a stretch goal. "Blocked" is not a status: every gap gets an active path (read the licence, open a clean alternative, build our own feed, or email the provider) tracked here until shipped. Only licensing, gev/ immutability, security and link-out-only can hold a feature, and each hold names the exact next action. Email authority: Claude may email data providers for written permission without asking Mike (draft in `docs/outreach/`, send from Chrome Gmail, log in section 9; never sign contracts, pay, or share secrets).
WHY (owner 2026-11-23): Argos traffic is repeat visitors who found it by keywords, then searched the brand. Port GEV as a website, add what Argos has beyond GEV, ship by Fri 2026-11-27. Do not overthink.

RELEASE CHECKLIST (updated 2026-11-26): [x] deploy green [x] domain loads [x] Search Console verified [x] contact address, About, removal route [x] one-command server setup passes in CI (no real host yet) [x] top human-test findings fixed and live (map 24,375 incl. Seattle 405, Atlanta 1,243; search; near me; no-results) [ ] long region pages filter and Save [ ] map card auto-opens, no map controls, slow first load [ ] real phone check (docs/human-testing-2026-11-26.md) [ ] new region pages checked for thinness [ ] Mike says "go live" (then LAUNCH=live, live robots and sitemap read, sitemap submitted)

NO-BUDGET QUEUE (owner 2026-11-27: server not yet, "I'm broke"): free work only. [x] site search finds big places (1,168; live-tested Seattle 2026-11-27) [x] reader pages drop internal approval wording [x] /map/: link to the full GEV view (it runs without a server: layer list and camera panel open; place search says "Location not found"; other layers untested) [x] long region pages filter and Save [ ] phone-size check. Not fixable free by name: New York and Chicago have no cameras in our registry.

2. WAITING 2026-11-23 (share e2e needs the running stack; CI only, after item 5): shareable /map/ links via GEV `/share/<code>`. Beats Argos by: free, no sign-in. Edge: removed camera -> message (test needed); storage blocked -> GEV logs SecurityError (unresolved).
5. OWNER 2026-11-24 (DEPLOY DONE: secrets are set, production run 45374825914 uploaded 90 files, https://worldtrafficcameras.pages.dev/ answers 200 with robots noindex and Disallow, /map/ 200. REMAINING, owner only: Cloudflare dash > Workers & Pages > worldtrafficcameras > Custom domains shows ... [full text: archive item 5]
6. OWNER 2026-11-24 (needs running stack, no docker here): launch security gaps BK-1, BD-1, CCTV-NOSWITCH, load tests, phone WebGL, rollback. Any kill criterion in red-team-round3.md -> ask Mike.
7. OWNER 2026-11-24 (London DONE 2026-11-24, commit 1334c57: TfL JamCams, 889 raw, 792 available kept, 97 unavailable dropped, 3 requests, no key needed; terms read from the TfL page, OGL 2.0 based, "Exploit ... commercially", credit "Powered by TfL Open Data. Contains OS data © Crown copyright and ... [full text: archive item 7]
9. OWNER 2026-11-24 (R2 secrets): health publish to R2, failure alerts, one full end-to-end run.
10. WAITING 2026-11-24 (launch and Search Console data): extra verticals only after a licence row passes and demand shows.
11. OWNER 2026-11-24 (stack, CI, host): launch certification S10.
15. WAITING 2026-11-24 (ChatGPT confirmation needs Chrome): final GEV parity audit. data/gev-parity.json 4,497 rows (in-map 2,365, excluded 1,297, gap 786, in-site 49), scripts in ops/audit/, test tests/parity/gev-parity.test.mjs. Open: i18n string pass, verifier rerun on README/sources/server ... [full text: archive item 15]
17. WAITING 2026-11-23 (wildfire block DONE, commit 93218f5; rest needs a licence read or an email reply, or batches with the next source): port all of GEV's research (DATA_SOURCES.md rows are in data/source-permissions.json: 139 enabled, 149 unknown, 15 restricted). Done: Hong Kong 1,011 ... [full text: archive item 17]
19. WAITING 2026-11-23 (rest needs Mike keys FIRMS and Mapillary, provider email replies, or launch demand; all active paths recorded here): unblock every GEV layer by an active path. OPENED and VERIFIED in CI 2026-11-23 (commit cd8c432, session4-exclusion green: GET 200 through the real nginx for ... [full text: archive item 19]
20. WAITING 2026-11-24 (NZTA: terms read whole in a normal browser 2026-11-24 (nzta.govt.nz/about-us/our-data-and-official-information/use-our-data/terms-of-use): registering accepts them; 2(b) allows publishing travel information, but 3(d) and 7(a) say no commercial purposes unless expressly ... [full text: archive item 20]
21. WAITING 2026-11-23 (fails the Helpful test as a block on camera pages: country-level headlines do not answer a road question; GDELT DOC API also limits to one request per 5 s; revisit as its own /news/ page when Search Console or Ahrefs-free shows news demand): own GDELT conflict and news block ... [full text: archive item 21]
23. OWNER 2026-11-24 (the stack is already built and proven: ops/deploy/docker-compose.yml = pinned GEV + allowlist proxy, workflow session5-compose ran GREEN 2026-11-22, runbook docs/deploy/runbook.md; Docker is not installed on this PC so no local copy of the public stack. Only Mike can pick and ... [full text: archive item 23]
24. WAITING 2026-11-24 (design system built and enforced; lab numbers below; what is left needs a Playwright or Lighthouse install on this PC to make the sweep a repo script, and real CLS/LCP needs launch traffic in Search Console; Mike's ok to install dev tools, or Claude keeps running the sweep ... [full text: archive item 24]

25. WAITING 2026-11-24 (basemap and browser-direct layers; the rest needs the deployed map): MEASURED in a real browser on local GEV: the default first view loads ESRI World Imagery (services.arcgisonline.com) and terrain from terrain.reearth.land; the ALPR host (tiles.dontgetflocked.com) and ... [full text: archive item 25]

26. WAITING 2026-11-25 07:51 (ChatGPT's free attachment quota is used up until then; it said "You're out of attachments for now ... try again tomorrow after 7:51 AM"): owner asked (2026-11-24) "update plan MD with chattpt, give it the file". Plan: save the packet ... [full text: archive item 26]

27. WAITING 2026-11-24 (THREE-TESTS VERDICTS, Claude 2026-11-24, applied to each unbuilt page; nothing left that passes all three and needs no key, host or demand data: (1) camera detail page per camera = FAILS Gain and HCU (a page per camera repeats one link, the thin-page risk ChatGPT also named; ... [full text: archive item 27]

30. WAITING 2026-11-24 (top 8 countries by Argos depth now hunted: Czechia, Switzerland, France, South Korea, Hungary, Poland, Indonesia, Austria, each with a verified finding or a named next action; what is left needs replies or hands: unsent emails in docs/outreach (Bison Futé, ... [full text: archive item 30]
31. WAITING 2026-11-24 (built from this item today: NSW, Taiwan item 32, Iowa, A22 Italy, Baton Rouge; checked and parked: Catalonia (38 cameras, dataset terms unread, SCT terms pages 404/403), King County (written permission), Spain DGT (licence conflict, reply pending), Maryland CHART ... [full text: archive item 31]
33. WAITING 2026-11-24 (round 0 Argos owner list worked: BUILT Madrid city 357, Iowa 1,252, A22 13; parked with a named next action: Queensland (free key, Mike), Northern Ireland (no camera dataset on OpenDataNI, find the DfI Traffic Watch NI data page or email), Madrid Calle 30 (HELD 2026-11-24, ... [full text: archive item 33]
34. WAITING 2026-11-24 (steps 1-5 DONE: both inventories, merged table, rounds A B C, data/argos-maps-matrix.json now 48 rows = 18 original + the 30 merged rows, each with status edge, parity, gap or skip, every gap row naming its plan item, file, licence, key or demand blocker, gated by ... [full text: archive item 34]
36. WAITING 2026-11-25 (built: P0-1 to P0-5, P2-11 Iceland, P2-12 five corridors, P2-13 exports; left and why: P1-6 to P1-10 country builds need Mike's keys or provider replies (Korea key, Spain DGT reply, NZTA reply, SANRAL key, Japan list, Latin America none found); P2-14 case file: Mike stopped ... [full text: archive item 36]
38. WAITING 2026-11-24 (host needed to test): ESRI WORLD IMAGERY IS REACHABLE BY VISITORS. Matrix docs/source-audits/gev-dependency-licence-matrix-2026-11-24.md row B01: the visitor browser fetches tiles from services.arcgisonline.com directly (GEV default when no Google key; "Esri Satellite" chip, ... [full text: archive item 38]
39. WAITING 2026-11-25 (everything Claude can do alone is done; what is left needs Mike: contact email (unlocks about, takedown, security.txt), DNS click, Search Console and Bing codes, R2 secrets, ads decision, the real host. DONE 2026-11-25 by Claude: (j) CI minutes: the repo is PUBLIC (gh repo ... [full text: archive item 39]
41. WAITING 2026-11-25 (step 1 built; step 3 waits on licence reads now running in an agent, docs/source-audits/road-data-licences-2026-11-25.md, and on the CBP reply; step 2 road pages need distinct data per road, built only where it exists; step 4 GeoJSON/KML BUILT 2026-11-25 (per-country and all ... [full text: archive item 41]
42. WAITING 2026-11-25 (agents building today: step 1 public source cards page /sources/ in worktree sources-page; Minnesota WZDx work zones in worktree mn-wzdx; next after they merge: Iceland briefing (needs Vegagerdin closure/road-condition feed licence read) and the coverage index definition; ... [full text: archive item 42]
43. WAITING 2026-11-25 (owner: "I will need final confirmation from you and ChatGPT that we have exhausted all data sources that Argos has. Ask for a master prompt for Gemini deep research"; ChatGPT round F, chat 6b06d7e7, read to END OF ANSWER; PROMPT: ... [full text: archive item 43]

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
- Ads go around the map on Astro pages, never inside the engine. Esri basemap: NOT disabled (corrected 2026-11-24, item 25: browser-direct, the iframe now selects OSM but Esri is still probed). OpenFreeMap with GEV: not a globe basemap option in GEV (it only feeds vector layers); fallbacks self-hosted OSM tiles or Natural Earth; a basemap manifest (licence, attribution, review date) gets the same fail-closed gate as sources.
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
| 2026-11-25 | SOURCES AND SPEED (ChatGPT, chat 6b0639b7 "Launch Strategy Advice", guest chat, no zip possible so key files were pasted; first answer stopped mid-sentence ("First, an important distinction") so I asked it to continue, then read the whole 57,687-character continuation to its last line "...Think"; PROMPT: docs/chatgpt-prompts/2026-11-25-argos-sources-and-speed.md) | OWNER ASKED: does Argos already list its sources, can we speed up, ask ChatGPT with everything. ChatGPT: Argos's attribution list is a lead list, not an inventory (SURE by its reading of Argos's methodology page, UNVERIFIED by me); the 226,203 cameras are probably hundreds of official portals, not a hidden aggregator (GUESS); ranked speed changes: worktrees, scaffold, licence checklist, CI sharding, batching, caching only after measuring; order: finish the real host, proxy, R2 alerts, rollback, contact page BEFORE more sources. AGREED and used in plan item 40. CHECKED: plan header counts stale = TRUE and fixed; pre-commit already path-conditional = TRUE (.githooks/pre-commit); scaffold missing = FALSE (ops/importers/new-source.mjs exists); Esri unused = PARTLY WRONG (GEV chips can still switch to Esri, item 38). MISSING: production host certification on a real host = UNKNOWN (owner steps); per-stage hook timings = UNKNOWN (to measure, item 40 step 4); Argos camera-level source inventory = UNKNOWN (needs a permitted sample of their public pages, not done); search demand per page type = UNKNOWN (needs Search Console after launch); mobile device test = UNKNOWN; trademark search on the name = UNKNOWN (owner); ASSUMPTION ChatGPT named as most likely wrong: that Argos's attribution list maps its camera acquisition (NOT MATERIAL: we already treat it as leads only). |
| 2026-11-25 | ARGOS MISSING DATA, ROUND D (ChatGPT chat 6b06d1d1 "Argos Gap Analysis", answer stopped mid-table once, continued, read to its last line END OF ANSWER; PROMPT: docs/chatgpt-prompts/2026-11-25-argos-missing-data-debate.md) | OWNER ASKED what Argos is missing and whether it is the best possible. ChatGPT: not the ceiling; build road intelligence (observability, status ladder, closures, RWIS, border waits) and chase integrated portals. AGREED, plan item 41. CHECKED: CBP border wait feed 200 keyless (curl 2026-11-25); WZDx registry URL 410. MISSING: Argos per-camera schema and layer inventory = UNKNOWN (public pages only); reuse terms of CBP, AFDC, FHWA, Avalanche Canada = UNKNOWN until read; search demand = UNKNOWN (Search Console after launch); ASSUMPTION ChatGPT named as most likely wrong: that Argos has little supporting data (NOT MATERIAL: agreed it has contextual layers, our edge is granularity and evidence). |
| 2026-11-25 | WHOLE-PROJECT CODE REVIEW (owner: "code review this entire project"; findings in docs/decisions/code-review-2026-11-25.md) | Batches A (importers, health, derive, robots), B (gates, hook, CI, licence closures) and C (site pages) merged and pushed; main green. Five GEV-side sources and OpenSnowMap now disabled (enabled 289); baseline and exclusion group updated on purpose. Open: C4 (noindex 6 one-region country hubs) and C9 (default noindex) are owner decisions; A16, C6, dist.test.mjs:105 early return, BK-1 not fixed. MISSING: C4/C9 owner call = UNKNOWN. |
| 2026-11-25 | BATCH REVIEW (ChatGPT chat 6b078480 "Batch Review and Next Steps", read to END OF ANSWER; PROMPT: docs/chatgpt-prompts/2026-11-25-batch-review-search-bc-iceland.md): says verify the batch, reword Iceland "changed" claim, then automatic feed refresh with per-source age limits, then closures, road weather, history, more sources. Applied: Iceland wording. Pushed back: the checker diffs header fingerprints between runs (ops/health/check.mjs:156), my packet understated it; its "missing vs stale health" point: the page text (no check newer than 24 hours) is true in both cases. Accepted next order: feed refresh job first. MISSING: browser rendering of new pages UNKNOWN; CI of 84a0fe2 VERIFIED(gh run list: tests and immutability success, site still running when read); expired events listed as active NOT MATERIAL for BC and MN because both list only feed-active items from a file under 24 h old (site/src/lib/live.mjs:168,183), an event ending inside that window stays listed until refresh; per-source age limits UNKNOWN; Argos comparison data UNKNOWN. |
| 2026-11-25 | EXHAUSTION CHECK AND GEMINI MASTER PROMPT, ROUND F (ChatGPT chat 6b06d7e7 "Compare Argos Data Sources", whole answer read to END OF ANSWER in three slices; PROMPT: docs/chatgpt-prompts/2026-11-25-exhaustion-check-and-gemini-master-prompt.md) | OWNER ASKED for final confirmation that Argos sources are exhausted and a Gemini Deep Research master prompt. ChatGPT: NO, cannot certify; attribution page is not the source inventory; five biggest gaps US state/local, Japan, Taiwan, regional Europe, tourism/mountain/weather cameras; wrote a 35,000 character prompt. AGREED, plan item 43, prompt condensed into docs/gemini-prompts/. CHECKED: nothing re-verified on primary pages; its share table is GUESS by its own label. MISSING: Argos per-camera operators = UNKNOWN; counting method differences between Argos and us = UNKNOWN (may not be 209,097 missing); the 51-country ledger is stale = VERIFIED(data/world-coverage.json shows 51 not-investigated while hunt docs cover about 38 of them); ASSUMPTION ChatGPT named as most likely wrong: that Argos supply comes mostly from the portals we search (NOT MATERIAL: agreed, tracing cameras to operators is the fix). |
| 2026-11-25 | BEYOND GEV, ROUND E (ChatGPT chat 6b06d4be "Beyond Argos Strategy Audit", first read stopped after section 3, then the full answer read to its last line END OF ANSWER; PROMPT: docs/chatgpt-prompts/2026-11-25-beyond-gev-engine-round-e.md) | OWNER ASKED ChatGPT and Claude to debate whether Argos is the best possible GEV product. ChatGPT: no; build a road-information evidence product (ledger, Iceland briefing, change feed, coverage index, provenance catalogues); refuse own cameras, public AI agent, 3D globe as main product. AGREED, plan item 42. CHECKED: 172 MB idle = our own measurement (docs/chatgpt-prompts/2026-11-24-free-hosting.md:18); licence reads by agent in docs/source-audits/road-data-licences-2026-11-25.md (not yet re-read by me on the primary pages = UNVERIFIED except CBP). MISSING: GEV layer-by-layer runtime proof = UNKNOWN (host needed); retention rights for history per source = UNKNOWN until each licence is read; search demand = UNKNOWN; ASSUMPTION ChatGPT named as most likely wrong: that Argos's weakness is a thin feature set (NOT MATERIAL: we already treat its source pipeline as possibly strong). |
| 2026-11-26 | Import GEV's 2,230 Oregon and Japan cameras? (ChatGPT, chat 6b0825ac, read to END OF ANSWER) | PROMPT: docs/chatgpt-prompts/2026-11-26-gev-world-subset-import.md. Its verdict: B for both (use GEV as a lead, reconcile with each provider's current catalogue, link to an official viewer page, no health requests to either provider, river cameras a separate category). It quotes ODOT and MLIT pages as allowing commercial reuse: UNVERIFIED by me, nothing imported. I accept B over my A. Its 'homepage noindex needs investigation' is wrong: noindex is the owner's hard rule. MISSING: overlap with our registry UNKNOWN; provider terms UNKNOWN; viewer URL per camera UNKNOWN; whether all rows are still listed UNKNOWN; health-checker exclusion UNKNOWN; GEV snapshot age UNKNOWN; indexability VERIFIED(live robots.txt Disallow / and meta noindex 2026-11-26). Import is blocked on the UNKNOWN rows. |

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
