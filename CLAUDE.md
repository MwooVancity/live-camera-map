# CLAUDE.md: free live traffic camera directory

Read `plan.md` first. It is the source of truth for decisions, data model and build order.

## Line 0: Argos Atlas killer from the very start (HARD, owner 2026-11-22)
The point of this site is to beat argosatlas.com, not to be a smaller copy of it. For every page and feature, helpfulness to the person and information gain over Argos come before everything else except the hard rules below (licensing, `gev/` immutability, security, link-out only). Every page must answer the visitor's question better than the Argos page for the same place: all licensed data for that place on the page (plan section 12), one source and one timestamp per number, camera health Argos does not have. Before building a page or block, say one line: "Beats Argos by: ...". If it cannot be said, do not build it. Never copy Argos code, text, images or layout; the goal is to win on data, not to imitate.

## Who you are working with
Mike is a first-time solo developer building this as a side venture. He wants complete, immediately usable deliverables, direct communication, and for you to make decisions yourself and state them in one line. Do not hedge or pile on caveats. But assume everything will break: verify before claiming anything works, and say plainly what you could not verify.

## Project in one paragraph
A free, search-first camera directory with a simple 2D map (English, regional first), competing with argosatlas.com. Launch is link-out only: show camera metadata and link to the official source.

## Stack
Astro (static site), MapLibre GL JS, OpenFreeMap tiles behind a provider abstraction, JSON data in git (`cameras.json`, `sources.json`), generated `health.json` published to Cloudflare R2, GitHub Actions for health checks, Cloudflare Pages hosting. Node 22+ for the site (the God's Eye View repo, if used, needs Node 24.14+ or 26).

## Hard rules
- NO image embeds, NO image proxy, NO image caching for a source unless `sources.json` has that permission set to `allowed`. Default is `unverified`. Never set a permission to `allowed` yourself; propose it and let Mike confirm after he reads the source's terms.
- NO database, NO backend server, NO mass programmatic page generation, NO global expansion in v1.
- Regional pages: config default min 3 cameras, but only pages on the curated list are indexed. Everything else is `noindex`.
- Never copy code, text, images, layout or branding from argosatlas.com, and never scrape it.
- Never commit secrets. API keys live in `.env` (gitignored); keep `.env.example` up to date.
- Never overwrite a good `health.json` with an empty or partial one.
- A 200 response is not proof a camera works: check content-type and treat HTML error pages as failures.
- Respect each source's rate limits. Use bulk endpoints before per-camera requests.
- Treat registry and API data as untrusted: use `textContent`, never inject it as HTML.
- If a site blocks automated access (robots.txt, 403), stop. Do not work around it; tell Mike and ask him to supply the data.

## UPSTREAM IMMUTABILITY: ABSOLUTE RULE
God's Eye View (GEV) is proven upstream code. Its files must NEVER be edited, deleted, renamed, reformatted or patched. Pinned base: `ops/upstream-base.txt`.
- Allowed: new files and folders, external deploy/env config, the separate Astro site (`site/`), reverse-proxy config, wrapper services, registries, CI checks.
- gev/ is a separate clone ignored by the outer repo. Immutability check: inside gev/, `git status --porcelain` is empty and `git rev-parse HEAD` equals ops/upstream-base.txt.
- Before every commit: run that check, run GEV's own tests and build, run the new tests, report failures honestly. On Windows, an environmental baseline failure is logged in docs/decisions/baseline.md, never fixed by editing gev/.
- Mike-only tasks go in docs/decisions/mike-todo.md (OpenSky permission, 511 keys, accounts, domain/host, keyword research and page list, ads placement). Never attempt them.
- Never assume a GEV env var or flag exists. Verify it in the code that reads it.
- If a feature needs an upstream edit: STOP, explain the exact blocker, offer an external workaround. Never edit silently.
- A hidden button is not a disabled feature. Verify the endpoint and data route are unreachable too.
- TeleGeography stays in the checkout but must not ship in the public build or be reachable by any route.
- Never strip proxy headers or weaken GEV security to make embedding work. A 403 behind Cloudflare is a failed test, not a bug to bypass.
- Unknown commercial-use permission = disabled. OpenSky stays OFF until written commercial permission (ads count as commercial).
- Kill criteria and the 10-session order are in `docs/decisions/red-team-round3.md`. Session 3 is a mandatory go/no-go.

## Environment limits
The Claude cloud sandbox cannot reach most camera APIs (only package registries and GitHub). Importers and live data tests run on Mike's machine. Build importers against saved sample responses and mark them "untested against live API" until Mike confirms a real run.

## Workflow
1. Check `plan.md` for the current day and its "Done when" criteria.
2. Make the smallest working change, then run `npm run build` (add `npm run validate` for data) before saying it is done.
3. Update checkboxes in `plan.md` only for things actually verified.
4. End each task with: what changed, what was verified, what is still unverified, what will break next.

## Commands (fill in as built)
- `npm run dev`: local dev server
- `npm run build`: validate data + build site
- `npm run validate`: check `cameras.json` / `sources.json`
- `npm run import:<source>`: run an importer (on Mike's machine)

## Data conventions
Camera ids are stable and prefixed by source (`ontario-511-123`). Source ids are kebab-case. Dates are ISO 8601 UTC. Coordinates are decimal degrees, validated to lat -90..90 and lon -180..180.

## Naming
Site name "NearbyCams" is a placeholder. Keep it in one config constant so it is a one-line change.
