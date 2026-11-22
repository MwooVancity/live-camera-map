# Red-team round 3 (ChatGPT, 2026-11-21): decisions and gates

Status: ChatGPT's full reply read (sections 1 to 8 and the whole master prompt).

## ChatGPT's single biggest disagreement
It disagrees with treating "untouched GEV in Docker behind a public reverse proxy" as the default deployment. Docker runs `npm run dev` via `scripts/docker-start.mjs`, GEV is local-first not hardened, and its proxy protections reject some forwarded requests and share rate buckets behind a proxy. Also OpenSky says ads on an app using its API are commercial use needing consent, so live flights cannot just be switched on for an ad-supported launch.
Its alternative: keep GEV pinned and untouched for the feasibility test; prove the public proxy and required routes work without bypassing protections; if that fails, choose between a minimal documented GEV patch series or a different public map engine; build Astro and the camera registry only after that decision; launch only with sources whose commercial rights and limits are established. "Do not spend a month building SEO pages around a map engine that cannot safely serve the public."
Our consequence: do Sessions 1 to 3 first. Do NOT start Session 6 (Astro) until Session 3 passes.

Verified against the pinned repo (aac6be7): Dockerfile `CMD ["node","scripts/docker-start.mjs"]`, whose own comment says it runs like `npm run dev`; SECURITY.md line 3 says "not a hardened production service"; `GEV_EMBED_FRAME_ANCESTORS` exists (SECURITY.md); `/share/<code>` links exist (CHANGELOG.md).
Claims from ChatGPT only (not yet verified by us): proxy/CDN forwarding headers cause 403 on cost/quota routes; Overpass 300 req/min global; adsb.lol 500/day per IP; AISStream 3 connections; OpenSky FAQ says ads = commercial.

## Architecture (current)
- Astro owns `/` and `/map/` (pre-rendered H1, real links, noscript fallback). All SEO content lives in Astro.
- Untouched GEV on its own subdomain (`map-engine.<domain>`), embedded by iframe, `GEV_EMBED_FRAME_ANCESTORS` = our origin only, `allow="fullscreen"`.
- Engine subdomain: `noindex` (test `indexifembedded`), never in sitemap or internal links.
- Google may associate iframe content with the parent but does not guarantee it. Do not rely on it.
- Same-origin path mounting (`/map-engine/`) is only a throwaway proof of concept. The real fallback is a native `/map/` document.

## Top risks (ranked)
1 Restricted data ships (TeleGeography etc). 2 GEV server not hardened (dev server in Docker). 3 Provider quotas. 4 API key leak. 5 Cloudflare shared-IP rate limits. 6 Iframe/browser conflicts. 7 Cache stampede. 8 Cesium Core Web Vitals. 9 Mobile Safari crashes. 10 Parent/child share-state divergence. 11 Engine subdomain indexed. 12 Camera "200 but stale". 13 Ads next to third-party data. 14 Upstream update breaks wrapper. 15 Path-mounting assumed easy.

## Kill criteria (agreed BEFORE building; do not debate after a test)
| Test | Threshold | Decision |
|---|---|---|
| Iframe boot | >1% failures in 1,000 loads, or repeatable failure on a supported mobile browser | Abandon iframe, test native /map/ |
| Iframe interaction | fullscreen/touch/keyboard/share cannot work after 2 focused fixes | Abandon iframe |
| Cloudflare/API | any must-have route 403s from proxy-header checks, or shared limits cause cross-user failure | Abandon this topology. Never bypass GEV security checks |
| Public security | visitor reaches credential setup, sensitive routes, arbitrary fetch, or unprotected origin | No public launch |
| Restricted data | any prohibited dataset in bundles, responses or direct endpoints | No public launch |
| Licensing | must-have source lacks commercial/ad permission | Remove it or get written permission |
| Load 100 clients | >1% 5xx, p95 >2s cached reads, OOM, CPU >70% sustained | Fix architecture before scaling |
| Load 1,000 | same, after 100 and 250 pass | Do not claim 1,000-user capacity |
| Mobile | repeatable crash/WebGL loss in 10-min session on a representative phone | Lighter default map or drop device class |
| Upstream update | pinned update breaks a critical, exclusion or security test | Roll back. Never auto-deploy upstream |
| Immutable upstream | required security/production behaviour not achievable externally after 2 proof-of-concept sessions | **MIKE DECIDES**: accept a small documented patch series, or drop GEV as the public engine |

## Session order (one Claude Code session each; each has inputs, files, acceptance, rollback, must-not-touch)
1 Freeze and baseline (pin commit, run GEV tests, immutability CI). 2 Commercial-use and source audit (OpenSky disabled, unknown = fail closed, bundled datasets included). **3 Public-deployment feasibility spike: MANDATORY GO/NO-GO.** 4 Restricted-source exclusion proof. 5 Deployment and monitoring. 6 Astro SEO shell. 7 Camera registry and permission gate. 8 Camera browser and SEO directories. 9 Share-link and freshness panels. 10 Launch certification.
Session 3 stop condition: if core routes fail because of proxy restrictions, do not build the full site around this deployment.

## Test plan (commands)
- GEV baseline: `npm ci`, `npm run format:check`, `npm run check:boundaries`, `npm test`, `npm run build`, `npm run qa:stub-boot`, `npm run qa:conformance`, `npm run qa:stories`, `npm run test:perf`. All exit 0, logs saved.
- Added code: schema validation, permission fail-closed, duplicates, stable IDs, UTC, health classification, removed-camera share links, sitemap/canonical.
- E2E: Playwright in `site/` only (not GEV deps). Mobile viewport, fullscreen, back/forward, share links, cookies blocked, localStorage blocked, JS disabled, engine down, removed camera. Plus real iPhone Safari and Android Chrome by hand.
- Security: `npm audit --omit=dev`, `docker build`, `trivy image`, `curl -sSI` on engine and site headers, secretlint, gitleaks, grep bundles for key values.
- Load: k6 against staging with mocked/cached upstreams, stages 25 -> 100 -> 250. Never load-test provider APIs.
- SEO: raw-HTML check of `/map/`, rendered check (Playwright / URL Inspection), crawler (Screaming Frog or Sitebulb).
- Immutability CI: `git diff --exit-code $BASE -- gev/`, cached diff, and no untracked files under `gev/`.
- Licensing gate: reject unknown licence, unknown commercial status, missing attribution/provenance, expired review, image rights not granted.

## 25 edge cases (summary)
Stale 200 image; URL moved; same camera in two catalogues; identical names; redirect to new host; HTML error with 200; provider blocks probes (blocked, not offline); removed camera behind saved link; share link to removed camera; share link in another browser; share link inside iframe; third-party cookies blocked; localStorage blocked; JS disabled; Googlebot without JS; engine indexed alone; bot on /api/flights; random API paths; Cloudflare single peer; origin IP bypass; cache expiry stampede; 429 with Retry-After; AISStream drop and backoff; DST/timezones (store UTC); licence change after launch. Also: expired key, quota exhaustion, malformed JSON, Node restart, R2 outage, disk full, DNS/TLS expiry, failed rollback.
