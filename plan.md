# Plan: Free live traffic camera directory (Argos Atlas alternative)

Status: direction agreed after a 3-round Claude vs ChatGPT debate, 2026-11-21.
Owner: Mike. Site name is a placeholder ("NearbyCams"); no domain chosen yet.

## 1. Goal
A free, no-paywall, search-first camera directory with a simple 2D map. English first, regional first.
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
`cameras.json` entry: `id`, `sourceId`, `name`, `road`, `direction`, `city`, `regionSlug`, `regionName`, `lat`, `lon`, `feedType` (still|video), `officialUrl`, `officialUrlLastVerified`, `lastSeen`.

`sources.json` entry: `id`, `name`, `api` {auth, rateLimit, docsUrl}, `permissions` {`metadata_commercial`, `image_display`, `image_caching`, `image_redistribution`: each allowed|not_allowed|unverified}, `attribution`, `license`, `licenseUrl`, `reviewedAt`.

`health.json`: top level `generatedAt`, `runOk`; per camera `status`, `httpStatus`, `contentType`, `lastChecked`, `lastSuccess`, `lastChanged`, `consecutiveFailures`. A 200 response with an HTML error page must NOT count as working (check content-type, preferably dimensions).

## 5. Build order
Run in parallel from day 1: keyword research (Google Keyword Planner or Ahrefs free) to choose which pages to index. The Gemini Deep Research run also exists in Mike's Gemini history (its UI never finished rendering).

- [ ] **Day 1: Foundation.** Astro + MapLibre + OpenFreeMap, the three data files, sample cameras. Done when: map renders sample cameras and `npm run build` passes.
- [ ] **Day 2: Importer 1 (Ontario 511).** Auth, normalize, validate coordinates, dedupe, attribution, official URLs. Done when: real Ontario cameras on the map. If API approval is pending, build against saved sample responses and use Alberta 511 or another keyed source meanwhile.
- [ ] **Day 3: Importer 2 (Caltrans).** Different API shape, same schema. Metadata only; image permissions stay `unverified`.
- [ ] **Day 4: Discovery UX.** Search by city, highway and place; filters; clustering; camera detail; nearby cameras; corridor navigation. Mobile first.
- [ ] **Day 5: Health monitoring.** Actions cron, per-source throttling and backoff, R2 publish, statuses on camera cards, workflow failure alerts. Start intervals at 30-60 min for still cameras; prefer bulk endpoints over per-camera requests.
- [ ] **Day 6: SEO pages.** Homepage, major city pages, major highway pages, a few camera pages. Canonical, sitemap, BreadcrumbList, internal links, crawlable HTML that works without the map. No near-empty pages.
- [ ] **Day 7: Test and deploy.** 1,000+ markers, broken official URLs, source API outages, duplicate cameras, mobile search, health failure, sitemap correctness.

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
3D globe, flights, ships, conflict layers, voice/AI, Spanish, image proxy or caching, historical images, a database, a backend, global expansion, mass programmatic SEO pages, copying anything from argosatlas.com (code, text, images, layout) or scraping it.

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
- Expand only when Search Console shows impressions, a new source adds real coverage, or a page can be made clearly more useful. Never because more camera records exist.
