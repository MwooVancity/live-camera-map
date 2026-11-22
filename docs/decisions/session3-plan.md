# Session 3 plan (after ChatGPT red-team, 2026-11-22)

Go/no-go for GEV-behind-proxy. Split in two sessions. All tests run against the pinned commit and one image digest, not GEV's current main.

## 3A Functional compatibility
1. Route and surface inventory from the pinned commit (HTTP routes, WebSockets, credential operations, filesystem exposure, proxy dependencies), each classified public / private / blocked / unnecessary. This file becomes the permanent acceptance test.
2. Docker Desktop on Windows, GEV image, reverse proxy in front on a private Docker network (no published container port).
3. Must-have API routes through the proxy: status codes, 403 from proxy-header checks, client-IP seen by GEV, forged X-Forwarded-For.
4. Iframe: `GEV_EMBED_FRAME_ANCESTORS` set to the Astro origin only, frame-ancestors vs X-Frame-Options, fullscreen, WebSocket upgrade held open.
5. Disabled providers stay disabled (OpenSky etc.): route unreachable, not just hidden.

## 3B Security and abuse
1. Vite dev-server surface: `/@vite/client`, HMR WebSocket, `/@fs/` with a harmless marker file outside the app root (`GEV_SECURITY_TEST_<random>`), `/src/` source, source maps, error stack traces.
2. Direct-origin access (published port, IPv6), Host-header injection, forged forwarding headers.
3. Credential setup denial. FINDING FROM CODE (scripts/docker-start.mjs): Provider Settings admits loopback only, plus the Docker default gateway, which the launcher adds as a trusted peer so the host browser works. A reverse proxy running on the Docker host reaches the container FROM that gateway, so public visitors could count as trusted. Must test through the proxy with `GEV_KEY_SETUP_TRUSTED_PEERS` set to `none` (verify in code that the variable is read) and with the proxy as a container on a separate network.
4. Resource use at 10 / 25 / 50 / 100 clients; container crash, restart, rollback to the pinned image.

## Decisions
- Iframe stays, cross-origin subdomain (not same-origin `/map-engine/` path mounting), pending 3A/3B.
- Ads go on Astro pages around the map, never in the engine, never a dependency of it.
- Default Esri basemap stays disabled in public. Test OpenFreeMap compatibility first (it is a vector service; GEV may not consume it without code changes). Fallbacks: self-hosted OSM-derived raster tiles, low-detail Natural Earth. A basemap manifest (provider, dataset, licence, commercial permission, attribution, review date) gets the same fail-closed gate as the 291 sources.
- Kill: any sensitive route public, a must-have route needing weakened security, or safe operation needing an edit under gev/. Then STOP and ask Mike (patch series vs drop GEV).
- Record image digest, dependency inventory and a vulnerability scan with each run.

Source: ChatGPT red-team chat (claims about GEV internals are checked against the pinned repo, not taken from ChatGPT).
