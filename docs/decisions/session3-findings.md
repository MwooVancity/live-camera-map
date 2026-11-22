# Session 3 findings (Linux CI, 2026-11-22)

Runs: 44977775161 and 44978007540 (workflow `session3-deploy-spike`). Pinned gev commit aac6be7, image built from gev/Dockerfile unchanged. gev/ unchanged (immutability check green in both). Artifacts: `session3-results` (not committed).
Windows local test not possible: Docker Desktop install fails on this PC (admin prompt, exit 4294967291). Linux CI is the real target anyway.

Scenarios (public visitor, Host `map.example.test`):
- A: proxy is a container on a private network, GEV port NOT published. Proxy adds X-Forwarded-For.
- B: GEV port published on the host (what a host-side proxy or tunnel connects to).
- C: like B with `GEV_KEY_SETUP_TRUSTED_PEERS=none`.

## Results
| Check | A | B | C |
|---|---|---|---|
| Credential setup (`/api/setup/status`, `/api/setup/keys`) as public visitor, incl. spoofed loopback headers | denied 403 | denied 403 | denied 403 |
| Same, Host rewritten to `localhost:4173`, no forwarding headers | denied | **OPEN 200, key list returned** | denied |
| `/@fs/` marker outside app root, `/@fs/etc/passwd`, encoded traversal | blocked | blocked | blocked |
| `.env` with marker in app root (direct, `/@fs/app/.env`, encoded) | not served | not served | not served |
| Host `evil.example` | 403 | 403 | 403 |
| Embed framing: `/?embed=1` gets `frame-ancestors https://www.example.test`; `/` keeps frame-ancestors 'none' | pass | pass | pass |

Critical failures: 0 in every scenario (the probe's CRITICAL list). Scenario B's OPEN row is a non-critical probe by design; it IS the finding.

## Findings
1. **Credential setup is open in scenario B** when a proxy on the Docker host sends `Host: localhost` and no forwarding headers: the Docker gateway is trusted (`scripts/docker-start.mjs`). Constraint: GEV must be reached only by a proxy container on a private network, never a published port, and `GEV_KEY_SETUP_TRUSTED_PEERS=none` must always be set (verified read in `src/keySetupCore.mjs`; scenario C shows it works). Add a deploy-time test.
2. **Dev-server surface is public and cannot be blocked**: `/@vite/client`, `/src/*`, `/server/*`, `/vite.config.js`, `/package.json`, `/node_modules/.vite/*` return source, because the app itself loads from them. Accepted only because the code is MIT and no secret is served (marker tests pass). Rule: no secret may ever be in the image, repo or env of this container; any key GEV needs must be a browser-restricted key. Cost: unbundled dev modules mean many requests on first load (performance not yet measured).
3. **Restricted data routes are live** and answer from the origin: `/api/ghostmaps/catalog` 200, iNaturalist routes active (400 on bad input), news routes 403 only because of the proxy check. Session 4 must block these at the proxy (denylist) and prove it. Cannot disable inside gev/ without editing it.
4. **GEV refuses proxied requests on 14 routes** (`src/localRequestGate.mjs`: "Proxied requests are not accepted"): geocode, Google geocode/places/search, Mapillary, TomTom, military-installations (+ news, OpenAI, realtime). This confirms ChatGPT's claim. These are key/cost routes we do not plan to ship; we do NOT bypass the check. `/api/geocode` (search box) and `/api/military-installations` are the only plausible wants; both defer to Session 5 as "not available in public build".
5. Must-have routes defined here (Mike may amend): app boot, camera sources and health (`/api/cctv/*`), static/library layers, weather. These returned 200 through the proxy (30 routes 200 in scenario A). Flights/vessels/satellites are licence-gated (Session 2) and are out of scope until permitted.
6. Not yet tested: WebSocket (HMR) through the proxy, real browser boot and mobile, load at 10/25/50/100, container restart/rollback, IPv6/direct-origin on a real host, image vulnerability scan. These are Session 3B-continued and Sessions 5 and 10.

## ChatGPT review of these results (2026-11-22)
Agrees: conditional GO for staging, NOT approved for public launch. Changes adopted:
- Proxy uses an ALLOWLIST of routes and HTTP methods; the restricted-route denylist stays as a second layer.
- Next session tests: all methods (POST/PUT/DELETE/OPTIONS), proxy-bypass encodings (encoded paths, case, `//`, trailing slash, query), CSRF/CORS/Origin, WebSocket/HMR in a real browser, container-to-container reachability, `GEV_KEY_SETUP_TRUSTED_PEERS=none` verified after a clean restart, dependency and image vuln scan, restart and rollback.
- GEV port stays unpublished, plus a host firewall rule.
- Search: build it outside GEV (Astro search box + OSM-based geocoder such as Photon or Pelias, licence to be checked) and move the map with GEV's own URL hash (`#v=2&lat=..&lon=..&alt=..`, seen in `gev/scripts/qa-stories.mjs`); verify the hash is honoured in the embed.
Disputed: ChatGPT would keep a public dev server only as "documented residual risk" for a controlled beta. Agreed for beta only.

## Verdict so far
No kill criterion triggered. CONDITIONAL GO: continue only with (a) proxy container on private network, no published GEV port, (b) trusted peers `none` + `GEV_ALLOWED_HOSTS`, (c) proxy denylist for restricted routes, (d) no secrets in the container, (e) a browser boot and load test before any public launch.
