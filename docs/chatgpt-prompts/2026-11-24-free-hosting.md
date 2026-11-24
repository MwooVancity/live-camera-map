# ChatGPT prompt packet: free hosting for the GEV map server (sent 2026-11-24)

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome I want. If the question is ambiguous or the goal conflicts with a constraint below, say so and say what you would ask the owner.

## 1. OWNER SAID (verbatim, copied, typos kept)
> "What's ur decision.  Is free not rly a good option here long term" (2026-11-24, after I presented the Hetzner paid option)
> "Oh k. Update plan MD with chattpt give it the file. What's the verdict on free)howster rtc did u preview it with chatgpt" (2026-11-24; I read this as: what is the verdict on free hosters, and did you check them with ChatGPT?)
> "Ok I'll pay for it when I'm home." (2026-11-24, about the paid server)

## 2. GOAL AND WHO IT SERVES
worldtrafficcameras.com is a free world traffic-camera directory (link-out only to official camera sources, no sign-in) with an interactive map. The point of the project is to earn as much money as possible with ads and affiliate links beside the data, inside Google's rules. The map is an open-source app (God's Eye View, "GEV") that we embed in an iframe on /map/. The owner is a solo non-coder with almost no budget; he asked whether a FREE host is a real long-term option for the always-on map server.

## 3. SITUATION (facts, each with its source)
- The directory pages are static files on Cloudflare Pages (free). Only the GEV map server needs a host (plan.md item 23).
- GEV is one Node process (Vite) that serves the client and its API routes; we run `vite build` then `vite preview`, behind an nginx allowlist proxy in Docker, reached through a Cloudflare Tunnel (docs/deploy/runbook.md, ops/deploy/docker-compose.preview.yml).
- Measured on a GitHub Linux runner (workflow session6-preview, run 45465254407): GEV container 286 MiB after start, 459 MiB after 200 requests at 20 at a time (light test, not a real load test). nginx proxy 2.8 MiB. The `vite build` step needs more RAM than steady state; it was NOT measured. The built main JavaScript bundle is 8.9 MB (2.99 MB gzipped).
- Windows measurement: preview Node process about 172 MB idle, dev server about 302 MB.
- GEV makes outbound requests to public data APIs (weather, radio, CelesTrak and others) from the server. It loads basemap tiles straight from the visitor's browser.
- The site shows ads, so use is commercial. Visitors target: 10k to 500k site visits a month; assume about 10 percent open the map (UNVERIFIED planning assumption).
- A paid option already identified: Hetzner CX23 about 6.49 USD a month (price UNVERIFIED), Fly.io shared 1 GB about 8.78 USD a month (UNVERIFIED), Cloudflare Containers about 11 USD a month if always on (your own calculation, UNVERIFIED).
- I answered the owner's "is free a good option" from my own memory, WITHOUT checking each free provider's current terms: Oracle Cloud Always Free VM can be reclaimed if idle, Render free web services sleep when idle, Google Cloud free tier e2-micro is 1 GB. None of that was verified today.

## 4. CONSTRAINTS (pasted verbatim from the project CLAUDE.md)
- "NO database, NO backend server, NO mass programmatic page generation," (our own site; the GEV map server is the one running service we allow, project line: "Free, search-first world camera directory plus the GEV map at /map/.")
- "God's Eye View (GEV) is proven upstream code. Its files must NEVER be edited, deleted, renamed, reformatted or patched."
- "Never strip proxy headers or weaken GEV security to make embedding work."
- "Unknown commercial-use permission = disabled."
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed."
- "Never commit secrets. API keys live in .env (gitignored)."
- "NOINDEX STAYS ON until Mike says 'go live' in chat."

## 5. WHAT I ALREADY DID, DECIDED AND WHY
- Proved the preview setup on Linux Docker in CI (1531 route checks, gzip, cache, restricted data refused).
- Asked you earlier (chat "Debate Deployment Strategy"): you picked Hetzner first, Fly second, Cloudflare Containers third; you said 1 GB is a testable start, not proven.
- My recommendation to the owner: pay for a small Hetzner server (2 GB because the build step RAM is unknown), because free hosts sleep, can reclaim idle accounts, or ban ads or commercial use. That reasoning came from memory, not from reading terms.

## 6. EXACT EVIDENCE
Docker compose command that runs GEV (ops/deploy/docker-compose.preview.yml):
```
gev:
  command: sh -c "./node_modules/.bin/vite build && exec ./node_modules/.bin/vite preview --host 0.0.0.0 --port 4173 --strictPort"
  healthcheck: start_period: 300s
```
CI memory lines (session6-preview, run 45465254407):
```
deploy-proxy-1   2.355MiB / 15.61GiB
deploy-gev-1     286.3MiB / 15.61GiB   (after start)
deploy-gev-1     459MiB  / 15.61GiB   (after 200 requests, 20 at a time)
```

## 7. MY QUESTION (full)
Is any FREE host a real option for running this always-on GEV map server (1 Node process plus nginx plus a Cloudflare Tunnel client), commercially (ad-supported), for the first months and ideally long term? Evaluate each candidate against: always on (no sleeping), enough RAM for the build and the steady state, outbound internet from the server, allowed for commercial or ad-supported sites, account reclamation or ban risk, bandwidth limits, and how long the free offer has lasted. Candidates I can think of: Oracle Cloud Always Free (ARM or AMD VM), Google Cloud e2-micro free tier, Render free web service, Koyeb free instance, Fly.io (if any free allowance remains), Railway or similar trials, Hugging Face Spaces (Docker), AWS or Azure 12-month free tiers, and a spare computer at home behind the Cloudflare Tunnel. Tell me about any candidate I missed. My recommendation, which you should attack: pay about 6 USD a month for Hetzner (2 GB) because the map is the main differentiator and downtime or a sudden account reclaim costs more than 6 USD; a free host is acceptable only as a short bridge. Options I see: (A) pay Hetzner now, (B) free bridge on a home computer plus Cloudflare Tunnel until revenue, (C) Oracle Always Free if its terms and reclaim risk are acceptable, (D) wait and launch the directory without the map.

## 8. WHAT I WANT BACK
A table first (candidate, always on, RAM, commercial use allowed, reclaim or ban risk, source you used), then a verdict with my recommendation attacked. Say "could not verify" instead of guessing, and give the page or document you used for each term.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
