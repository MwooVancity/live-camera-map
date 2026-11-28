# CLAUDE.md: World Traffic Cameras (worldtrafficcameras.com)

Read `plan.md` first (NOW list on top). Full pre-trim rules with every dated owner quote: `docs/archive/CLAUDE-2026-11-28-before-trim.md`. Rules that a test can check live in `ops/harness/rules.mjs`; this file keeps only what a test cannot check. A new owner correction goes in `ops/harness/failures.jsonl` with a test, not a new paragraph here.

## Goal
Free, search-first world traffic-camera directory plus the GEV map at /map/. Beat argosatlas.com, godsviewai.com and godseyeview.space on helpfulness and information gain; pass Argos traffic (Search Console vs Ahrefs, ~500k visits/month). Before building a page or block, one line "Beats Argos by: ...", else do not build it. Floor: everything GEV and Argos Maps do. Never call a feature "blocked": give it a next action in plan.md.

## Hard rules
- **Link-out only.** No image embed, proxy or cache unless `sources.json` permission is `allowed`; only Mike sets `allowed` (data/owner-approvals.json).
- **Licences.** Every source ships with a row in data/source-permissions.json quoting its terms. Public free data with no terms = use it with credit, remove same day if asked. Off only if terms say paid, non-commercial, no reuse or written permission needed. If GEV's own data notes say a source is usable, use it (quote GEV). No permission emails. Unknown commercial use = disabled. OpenSky OFF until written commercial permission. TeleGeography never ships or is reachable.
- **gev/ is immutable.** Never edit, delete, rename, reformat or patch it. Check: in gev/, `git status --porcelain` empty and `git rev-parse HEAD` = ops/upstream-base.txt. Upstream edit needed = stop, explain, offer an external workaround. A hidden button is not a disabled feature: the route must be unreachable too. Never weaken GEV security or strip proxy headers.
- **Argos:** copy ideas, page types, fields and UX freely; never their prose, code, images, logos or brand. Claude does not browse argosatlas.com (robots.txt disallows ClaudeBot). Other public sites: polite pace, obey robots.txt, stop on 403 or bot check, raw captures only in gitignored research-private/.
- **Noindex stays** until Mike says "go live" in chat. Never set LAUNCH=live or remove noindex/robots Disallow on silence or a green deploy.
- **Secrets:** never commit; `.env` gitignored, keep `.env.example` current. Owner stores keys with one Run line: `gh secret set NAME --repo MwooVancity/live-camera-map`.
- **Data safety:** never overwrite a good health.json with an empty or partial one; a 200 is not proof (check content-type, HTML error pages fail); bulk endpoints before per-camera requests; respect rate limits; registry text goes in via textContent, never as HTML.
- **No** database, backend server for the site, or mass page generation. Regional pages need 3+ cameras; only curated pages are indexed.

## Working style
- Mike is a solo non-coder. Hands off: do every step allowed, no questions with a sensible default. Ask only for passwords, CAPTCHAs, payment, accepting terms, go live, or an irreversible step. Batch those into one short request.
- **Proof:** before saying a page, map or feature works, use the live build in a real browser and look at desktop and phone screenshots. Tests and curl do not count. Say what could not be tried.
- **ChatGPT** (Chrome guest/temporary chat) for plan-changing decisions and big reviews, not small lookups. Save the packet first as docs/chatgpt-prompts/YYYY-MM-DD-slug.md from TEMPLATE.md (owner's exact words, facts with sources, evidence, question, GAP CHECK block); read the whole reply; verify claims; log in plan.md section 9 with PROMPT: and MISSING: (harness test enforces). Gemini on "Deeper analysis" when available.
- **Info-gain debate:** each page type goes through ChatGPT rounds until a round where nobody names anything new that is helpful, true and sourced.
- Commit and push after every batch. Pre-commit runs the site tests (~6-8 min). Deploy: `gh workflow run production.yml --ref main`.
- End each task with: what changed, what was verified, what is unverified.

## Stack and commands
Astro static site in site/, MapLibre, OpenFreeMap tiles, JSON data in git (data/camera-registry/cameras.json, sources.json), health checks in GitHub Actions (ops/health/check.mjs), Cloudflare Pages. Node 22+ (GEV needs Node 24). `npm run dev | build | validate | import:<source>`. Run GEV locally in the Terminal panel: `npm --prefix gev run dev -- --port 5173 --host 127.0.0.1` (the Bash hook blocks write verbs mentioning gev/).

## Data conventions
Camera ids stable, prefixed by source (`ontario-511-123`). Source ids kebab-case. Dates ISO 8601 UTC. Coordinates decimal degrees, lat -90..90, lon -180..180. Site name and URL only in site/src/config.mjs.
