# Argos Atlas infrastructure study, 2026-11-24

Allowed by the owner on 2026-11-24 (CLAUDE.md: studying public pages, headers and network calls; never copying). Method: 5 requests at a polite pace with a plain browser user agent: robots.txt, the home page (headers and HTML), /map/ (headers and HTML), one map JavaScript file. Raw captures are in the gitignored `research-private/` (argos-home.html, argos-map.html, argos-map.js). Nothing below is their text, code or layout; these are our notes about what they run.

## KNOWN (read from the responses)
| Finding | Evidence |
|---|---|
| Fronted by Cloudflare | `Server: cloudflare`, `CF-RAY`, `cf-cache-status: DYNAMIC`, robots.txt is the "Cloudflare Managed content" block, `/cdn-cgi/` scripts |
| Pages are hand-built static HTML, no framework runtime | Home page 128 KB of plain HTML; plain script tags with `?v=` cache-busters (`consent.js`, `analytics.js`, `gtag.js`, `cuenta-nav.js`); no Next, Nuxt or Astro markers; `Last-Modified: 2026-11-24 09:36` on both pages, so a static build deployed together |
| `Cache-Control: no-cache` on HTML | headers; Cloudflare does not cache the HTML at the edge (`DYNAMIC`), it revalidates each time |
| Bilingual by URL folder, Spanish first | `/es/`, `/en/`, Spanish slugs under `/en/` (`/en/blog/camaras-dgt-guia-completa/`) |
| The /map/ page is a separate Vite app | one `<script type="module" src="/assets/index-<hash>.js">`, MapLibre and Cesium named in the page |
| They run a real backend for accounts | the map bundle calls `/api/account/me`, `/api/account/favoritos`, `/api/account/ajustes`, `/api/auth/google/inicio`, `/api/auth/magic`, `/api/pro/ping`, `/api/landing/stats` |
| Paid tier exists | `/en/pricing/`, `/api/pro/ping` |
| Analytics and consent | own consent script, Google tag (`gtag.js`), Google Fonts (third-party font request) |
| Content engine | 694 guides in the sitemap (teardown 2026-11-23), blog slugs on cameras, flights, ships, cables, privacy |
| AI training bots blocked | robots.txt disallows GPTBot, ClaudeBot, CCBot, Google-Extended and others; `Content-Signal: search=yes, ai-train=no` |

## NOT FOUND in 5 requests (UNKNOWN, do not assume)
Where camera images come from at runtime, tile provider, where the camera data JSON lives, origin host behind Cloudflare, database, whether they cache or proxy images. Those calls happen after login or in lazy chunks I did not fetch. One more step would be a browser network capture of an anonymous map session (still allowed: public, polite, no login).

## What it means for us (our own conclusions)
1. Their cheap part is the same idea as ours: static HTML on Cloudflare. Their 500k visits do not hit an app server; the map app and the account API are the only dynamic parts.
2. Their moat is accounts, favourites and a paid tier, not infrastructure. We have none of that by design (no database), so our edge must stay data coverage, honest health and licensing.
3. They load Google Fonts from Google; we self-host fonts (our design test pins it). A small privacy and speed edge to say on our own pages.
4. Their HTML is not cached at the edge (no-cache). Ours can be: Cloudflare Pages caches static assets by default.
5. Blocking AI crawlers is their choice; we do not copy it, but note any traffic from AI answers will not credit them.

## Addendum: one anonymous browser load of /map/ (2026-11-24, owner: a normal browser is fine)
Method: a normal Chrome tab, no login, one load, network list read once. No account was created and nothing was clicked.
| Finding | Evidence |
|---|---|
| The map needs an account | the page shows "Sign in or create your account" (Google or an emailed code) over a blurred picture; `/api/account/me` returned 401 |
| The globe behind the sign-in box is a pre-made picture, not live data | the only image requested was `/img/registro/mapa-escritorio.webp`; no tile, camera or data request left the argosatlas.com domain before login |
| Map stack | Vite chunks `maplibre-*.js` (+ css) and `deck-*.js` (deck.gl), `boot`, `main`, `insignias` (badges), `flechas`, `experiments`; all same origin |
| Everything is same origin | no third-party map, tile or image host seen before login |
| Analytics and testing | Amplitude (`api2.amplitude.com`), Google tag, Cloudflare Web Analytics beacon, their own `/api/exp/config`, `/api/exp/cuenta`, `/api/exp/event` (a home-made A/B test system), `/api/landing/stats` for the live counters |
| Third parties | Google Fonts (Michroma) only |
STILL UNKNOWN (needs a login, which we do not do): camera image origin, tile provider, whether images are proxied.
Our edges from this: we need no account for the map (their map is login-walled for every visitor, so none of their map shows to a search crawler either), we self-host fonts, we have no third-party analytics. Their landing counters (200,000+ cameras, 17,042 flights, 20,061 ships) are their own numbers.
