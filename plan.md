# Plan: free world live-camera directory (Argos Atlas alternative)

**This is the ONLY plan, status and to-do file.** `docs/` holds evidence, never plans. Trimmed 2026-11-28 (owner: "I feel we're close now"); the full pre-trim copy with every old item is `docs/archive/plan-2026-11-28-before-trim.md`.

## NOW (work top to bottom; one short line per item)

Close to done: site live (noindex), 24,382 cameras from 31 sources in 15 countries, /map/ = static GEV, GEV layer parity confirmed by ChatGPT 2026-11-28 ("nothing new").

1. [ ] I-5 road weather text: "(unit not stated by Caltrans)" repeats; "humidity % 16" order wrong.
2. [ ] Phone-size screenshots of Seattle, I-5, SR-520 (Chrome resize failed; find another way or say unverified).
3. [ ] Map layers still to test on /map/ (no server): Panoramax, Ski Pistes stays off, Mapped ALPR (licence row first), NWS alert count, NASA recent imagery (draw a box), bundled dams/datacenters, USGS topo, night lights, visual styles/HUD/Director/share links, Stories, Submarine Cables toggle loads nothing.
4. [ ] Catalogue audit follow-ups: merge ~2,635 likely duplicate cameras (pairs within 10 m); confirm MLIT 32,983-byte placeholder picture.
5. [ ] Info-gain debate round 3 to ChatGPT (whole project; Gemini when its limit allows). DONE only when all say nothing new.
6. [ ] Build list, in order: reliability history, observed refresh interval, road fusion (observed/estimated/forecast), border and mountain-pass pages, Queensland importer (132, CC BY 4.0), 10 guides (docs/decisions/2026-11-28-guides-plan.md), /gods-eye-view/ page, Spanish.
7. [ ] Keys when stored by owner: wire Ontario and WSDOT (beyond 1,200).
8. [ ] Server deploy (when owner buys): workflow server-deploy is ready; block adsbdb callsign route lookups (DATA_SOURCES.md:32); then AIS ships, weather radar, transit, rail, news, Mapillary photos, Planespotters/vessel photos.

Done 2026-11-26 to 11-28 (detail in git log and section 9): GEV camera packs imported; static GEV on /map/; domain DNS; earthquakes, GDACS, EONET, air quality, wildfire outlines, satellites, launches, FIRMS fires, airspace, shipwrecks, wind, KartaView, Sea Marks, Acartia live; 46 city pages, 12 road pages, road search, river cameras counted apart, status explanations, nearest alternatives, road coverage gaps; 9 more sources HEAD-checked.

## 0. Header
- Goal: free world directory of live traffic cameras with road conditions, camera health and a free map, no sign-in. Link-out only until a source allows pictures.
- End game: beat argosatlas.com, godsviewai.com, godseyeview.space page for page; pass Argos traffic (Search Console vs Ahrefs). Money: ads, affiliate, donations beside data, never a paywall. A penalised site earns $0.
- Site: World Traffic Cameras, worldtrafficcameras.com (Cloudflare). Name and URL in site/src/config.mjs. Noindex until Mike says "go live".
- Counts are never kept by hand: `node ops/status-counts.mjs`.
- Debates: ChatGPT every round (owner 2026-11-28); DeepSeek dropped; Gemini when available.

## 1. OWNER TO-DO (Mike only; Claude must not attempt these)
1. Say "go live" when happy (removes noindex). Not before.
2. Buy the server last (Hetzner CX23 4 GB about EUR 6/month, or any 4 GB VPS); Claude's workflow does the rest.
3. Store keys with the Run line when you have them: `gh secret set NAME --repo MwooVancity/live-camera-map` (Ontario 511, WSDOT access code).
4. Sign in for key requests Claude cannot do: Georgia, Utah, Alaska, Wisconsin 511 developer pages.
5. Optional, paid: OpenSky commercial licence (99 USD/month, live flights, needs server and fixed IP).
6. Before ads: OK the licence rows in data/source-permissions.json; decide the Cesium ion credit (non-commercial plan).
Old owner table (TfL, DGT, Quebec, Alberta, Oregon, 511NY, Open-Meteo, basemap): archive copy, section 1.

## 2. STATUS
- Live: site and /map/ on Cloudflare Pages, noindex. Deploy: `gh workflow run production.yml --ref main`.
- Cameras 2026-11-26: 24,382 from 31 sources in 15 countries (23,198 traffic, 1,184 river). Biggest: Georgia 3,829, Caltrans 3,263, Taiwan 2,354, Iowa 1,252.
- Health: about 5,370 cameras unchecked (Cloudflare-blocked or HEAD-unsafe sources); the rest HEAD-checked by ops/health/check.mjs.
- Not built: server stack on a host, load tests, rollback rehearsal, real-phone test.

## Next (section 3, after NOW)
Old numbered items 2 to 43 (share links, launch security gaps, R2 health publish, NZTA, design sweep, country hunts, Argos matrix, road data licences) are WAITING on a server, a key or owner steps; full text in the archive copy, section 3. Pull one into NOW only when its blocker clears.

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
OWNER 2026-11-28: "We'll keep debating with ChatGPT then." Info-gain debate rounds continue with ChatGPT (minimum, every round). DeepSeek dropped (needs owner sign-in and CAPTCHA). Gemini joins when its usage limit allows; a round is not skipped waiting for it. Next: round 3 to ChatGPT after the I-5 weather-text fix.
When: before any plan-changing decision, for big research (source hunts, licence terms, teardowns, keyword and page ideas), and for a second opinion on a finished page or architecture. Not for small lookups or code edits.
1. One batched prompt per topic: goal in one line, exact questions, "give a table", "mark UNVERIFIED anything you could not open", "say 'could not open' instead of guessing". Public URLs and generic text only: no secrets or personal details. If a site blocks bots (staging does), paste the page text.
2. Guest chat in Chrome (chatgpt.com or gemini.google.com/app). Never log in or enter credentials for Mike. Browser blocked: say so in one line and carry on.
3. Read the WHOLE answer to its final line. Every fact is UNVERIFIED until checked on the primary source.
4. Where it disagrees with this plan, say where Claude agrees, where not, and why; report wrong claims back to it.
5. Log below; save long answers in `docs/source-audits/` or `docs/decisions/` marked UNVERIFIED or VERIFIED.

| Date | Asked | Outcome (file) |
|---|---|---|
| 2026-11-28 | Server deploy review (ChatGPT temporary chat 6b0a2731 read to its 3-line verdict; Gemini chat 1d19c7f7 read to its last line; Claude.ai chat 1e2d3332 read whole) | PROMPT: docs/chatgpt-prompts/2026-11-28-server-infra-review.md (GitHub link failed for ChatGPT: 'could not open'; file attached instead). AGREED and built: tunnel failure fatal, Cloudflare success checked, jq-built JSON, MAP_HOST validated, main-only, 5 GB disk gate, public healthcheck required, X-Robots-Tag noindex on the server proxy plus a healthcheck for it, ufw deny-incoming. DISAGREED: non-root deploy user (ChatGPT itself says docker group is root-equivalent; owner hands-off) and Hetzner-console host fingerprint (owner step) = accepted risks, written in the workflow header; production environment with reviewer = would block hands-off. Gemini 2 GB memory cap: rejected, ChatGPT's measure-first wins. Claude.ai: many /api routes are closed by our own allowlist, so the server unlocks nothing until each is opened (audit running). ChatGPT printed no GAP CHECK block. MISSING: Cloudflare token Tunnel/DNS scope UNKNOWN (first deploy shows it); GEV RAM UNKNOWN (measure on box); Vite dev-server exposure NOT MATERIAL now (allowlist tests exist, tests/security), recheck on box; Hetzner backups +20% VERIFIED(ChatGPT cites Hetzner docs; not opened by me = UNVERIFIED). |
| 2026-11-28 | Beat competitors, four-way (ChatGPT temp chat 6b0a3164 read to its verdict; Gemini chat 2b8017ae read to last line; deep-research agent report; two teardowns) | PROMPT: docs/chatgpt-prompts/2026-11-28-destroy-competitors-research.md. Agreed plan: docs/decisions/2026-11-28-four-way-plan-beat-competitors.md. Main threat godsviewai.com (3,869 city camera pages). Free fixes first, /gods-eye-view/ explainer under our brand, pictures per licence, server last. Go-live timing split: ChatGPT now, Gemini/deep-research after fixes. MISSING: Argos counts and prices UNKNOWN (Claude may not browse Argos; ChatGPT's figures unverified); GodsViewAI 128k views UNKNOWN (self-report); brand terms VERIFIED(godseyeview.ai/brand/ 'based on, or compatible with'); GEV map-tile token non-commercial UNKNOWN until checked in our build; real Google top 10 UNKNOWN (no tool got live Google). |
| 2026-11-28 | Guides debate (ChatGPT temp chat 6b0a33d9 read to verdict; Gemini chat 8b4ddbfe read to end, then Gemini usage limit) | PROMPT: docs/chatgpt-prompts/2026-11-28-guides-debate.md. Plan: docs/decisions/2026-11-28-guides-plan.md (10 guides ranked, cut list). Both: knowledge base not blog; troubleshooting + find-near-you first. Split: refresh-by-agency, GEV explainer, comparison (ChatGPT yes, Gemini cut; Claude keeps GEV explainer). ChatGPT wrong claim: Photocraft date 'in the future'. MISSING: search volumes UNKNOWN (no Keyword Planner); agency refresh figures UNVERIFIED until read on agency pages; whether our checker detects stale images NOT MATERIAL now (guide must state what it does); Argos GEV-online page UNKNOWN (cannot open Argos). |
| 2026-11-28 | Big-picture round 2, file audit (ChatGPT temp chat 6b0a4c95 read to last line) | PROMPT: docs/chatgpt-prompts/2026-11-28-big-picture-round2.md. Decision: docs/decisions/2026-11-28-big-picture-round2.md. Not dry: split river from traffic cameras, catalogue+permission audit before reliability history, status words, nearest working alternative, road coverage gaps, observed refresh. ChatGPT wrong claim: plan.md '9,457 cameras' (not in file). MISSING: full catalogue audit UNKNOWN (ChatGPT could not read 4 MB file; Claude to run it); health after 878e357 UNKNOWN until next run; deployed SHA vs main UNKNOWN until deploy 46103432337 ends; direction field VERIFIED(24,382 records in cameras.json); /src/ exposure NOT MATERIAL (server not running). |
| 2026-11-28 | GEV layer parity (ChatGPT temp chat 6b0ac4d3, both answers read to last line) | PROMPT: docs/chatgpt-prompts/2026-11-28-gev-layer-parity.md. Decision: docs/decisions/2026-11-28-gev-layer-parity.md. ChatGPT round 2: "nothing new" beyond Panoramax, OpenSeaMap, ALPR, server-only photos, UI features. Wrong claims reported back (KartaView/shipwrecks/airspace already live). MISSING: upstream layer list VERIFIED(ls of GEV src/layers, 35 folders); adsbdb route restriction VERIFIED(DATA_SOURCES.md:32); iNaturalist NC records VERIFIED(wildlifeSightings/records.js:10); Acartia NOT MATERIAL (CC BY 4.0, owner rule); server route inventory UNKNOWN (not blocking: server not bought). |
Older rows (2026-11-25 to 11-27): docs/archive/plan-2026-11-28-before-trim.md section 9.

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
