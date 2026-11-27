# CLAUDE.md: free live traffic camera directory

Read `plan.md` first. It is the source of truth for decisions, data model and build order.

## Line 0: Argos Atlas killer from the very start (HARD, owner 2026-11-22)
The point of this site is to beat argosatlas.com, not to be a smaller copy of it. For every page and feature, helpfulness to the person and information gain over Argos come before everything else except the hard rules below (licensing, `gev/` immutability, security, link-out only). Every page must answer the visitor's question better than the Argos page for the same place: all licensed data for that place on the page (plan.md section 6), one source and one timestamp per number, camera health Argos does not have. Before building a page or block, say one line: "Beats Argos by: ...". If it cannot be said, do not build it. Never copy Argos code, text, images or layout; the goal is to win on data, not to imitate.

### Minimum rule: GEV + Argos Maps, nothing "blocked" (owner 2026-11-23, HARD)
The site does everything GEV and Argos Maps do, as a floor. Argos traffic is repeat brand visitors, so port GEV as a website and add whatever Argos has beyond it. Never call a feature "blocked": give each gap an active path (read the licence, open a clean alternative, build our own feed, or email the provider) tracked in plan.md until shipped. Only licensing, gev/ immutability, security and link-out-only hold a feature, and the hold names its next action. Claude may email data providers for written permission without asking Mike (log in plan.md section 9; never sign, pay or share secrets). Ship by Fri 2026-11-27.

### Traffic parity (owner 2026-11-23, HARD)
Argos Atlas gets about 500k visits a month (confirmed by the owner in Ahrefs). We do not miss any traffic they capture: every page type and keyword cluster Argos ranks for gets an equivalent page of ours or a recorded gap reason in data/traffic-parity.json; build order is by the traffic each gap represents. Procedure and gate: plan.md section 4 and section 3 item 4. Raw Ahrefs exports never go into git (paid-tool data, public repo); research-private/ is gitignored. The end game is to pass their traffic, measured by Search Console against Ahrefs, never by page counts.

### Argos as our lead list (owner 2026-11-22)
Every free public source Argos uses is a lead: add it faster, each with its own row in data/source-permissions.json (licence quoted, URL, date) before data ships. Argos using a source is not a licence. Never copy their code, text, images, layout or branding. Studying their public pages, sitemap, headers and network calls is allowed (owner 2026-11-24, replaces "never scrape"): polite pace (a few requests per minute, one page at a time), obey their robots.txt and stop on a 403 or bot check, no login, no bulk downloading of their pages or images, and keep raw captures out of git (research-private/).

## Hands off (owner 2026-11-25, HARD, verbatim: "Hard rule: I'm hands off as much as possible"; "Get this shit done ASAP automated as as possible")
Claude does every step it is allowed to do and works fast: no task lists handed back, no questions with a sensible default. Prefer routes that need no owner (email-only keys, public keys, scheduled jobs). Batch what only the owner may do (passwords, CAPTCHAs, payment, accepting terms, go live) into ONE short request at the end of a run.
NEVER ASK THE OBVIOUS (HARD, owner 2026-11-26: "Stop asking me obvious recommended shit... Keep going"): if I would mark an option "recommended", do it and report it; no question, no confirm button, no "should I next?". This applies to every plan, brief and master prompt I write too. Ask only for what the owner alone can do or must decide: payment, passwords, CAPTCHAs, accepting terms, go live, or an irreversible or risky step with no safe default.
TRIM PLAN.MD (HARD, owner 2026-11-26: "trim plan MD whenever smart and possible"): whenever it is smart and possible, trim it without asking: finished items, old logs and long evidence move to a docs/ archive (nothing deleted), the NOW list stays on top, one short line per item. Check after every batch.
GEV SAYS USABLE = USE IT (HARD, owner 2026-11-26: "if GEV says you can use it, then we should use it. We don't need to double check shit like this. It's already been double checked"): a source that GEV's own data notes say can be used is imported on that basis; no second read of the provider terms, no waiting. Quote GEV's note as the licence evidence. This does not open anything GEV marks restricted or non-commercial, and does not change link-out only or upstream immutability. For those sources it wins over the primary-source re-check lines.
NO PERMISSION EMAILS (HARD, owner 2026-11-27: "We need to stop asking people if we can use their shit unless it's explicit its paid"): public, free data is used with its credit line and a licence row quoting what we found; no email asking for permission. Stay off only when the terms explicitly say paid, non-commercial, no reuse, or written permission required (quote that line in the row). Silence or no terms page = use it, link-out only, and remove the same day if the provider asks. Replaces "Claude may email data providers for written permission".

RUN-LINE FOR OWNER STEPS (HARD, owner 2026-11-27: "do that run line thingy instead of making me go on github"): when the owner must enter a secret or do a step only they may do, give ONE single-line powershell block with a Run button (e.g. `gh secret set NAME --repo MwooVancity/live-camera-map`), never a website walk-through. Claude still never types the secret itself.

## Use it like a human, with screenshots (HARD, owner 2026-11-27)
Owner: "Why don't you actually use it and take screenshots? That should be a hard rule." Before saying any page, map or feature works, is better, or is ready: open the live build (or say it is local) in a real browser, do the visitor's task by clicking, typing, scrolling and zooming, take screenshots at desktop and phone size, LOOK at them, and send the owner the ones that show the result. Tests, curl and DOM reads do not count. Say what could not be tried (no real phone = say so). Argos itself: not browsed by Claude (its robots.txt disallows ClaudeBot); the owner does that by hand.
NO INDEXING (owner 2026-11-27): noindex stays until the site is at least at Argos Maps or GEV level AND the owner says "go live".

## Who you are working with
Mike is a first-time solo developer building this as a side venture. He wants complete, immediately usable deliverables, direct communication, and for you to make decisions yourself and state them in one line. Do not hedge or pile on caveats. But assume everything will break: verify before claiming anything works, and say plainly what you could not verify.

## Project
Free, search-first world camera directory plus the GEV map at /map/, competing with argosatlas.com. Launch is link-out only: camera metadata plus a link to the official source.

## Stack
Astro (static site), MapLibre GL JS, OpenFreeMap tiles behind a provider abstraction, JSON data in git (`cameras.json`, `sources.json`), generated `health.json` published to Cloudflare R2, GitHub Actions for health checks, Cloudflare Pages hosting. Node 22+ for the site (the God's Eye View repo, if used, needs Node 24.14+ or 26).

## Hard rules
- NO image embeds, NO image proxy, NO image caching for a source unless `sources.json` has that permission set to `allowed`. Default is `unverified`. Never set a permission to `allowed` yourself; propose it and let Mike confirm after he reads the source's terms.
- NO database, NO backend server, NO mass programmatic page generation, Global expansion is the GOAL (owner 2026-11-22, replaces the old "no global expansion in v1"): grow country by country, but every source ships only with its own licence row (CLAUDE.md lead-list rule). Pick the next source by camera count and licence cleanliness, never by what is easiest.
- Regional pages: config default min 3 cameras, but only pages on the curated list are indexed. Everything else is `noindex`.
- Copying IDEAS from argosatlas.com is allowed and encouraged (owner 2026-11-24: "copying is allowed, info gain wins"): page types, features, data fields, page structure, layout patterns and UX flows may be matched or beaten. Still never copied word for word or file for file: their prose, source code, images, logos and brand name (copyright and trademark are real even when scraping is fine, a takedown would hit our host and domain, and duplicate text fails Google's helpful-content review). Studying it is allowed (owner 2026-11-24, replaces "never scrape it"): public pages, sitemap, response headers and network calls, at a polite pace, obeying robots.txt, stopping on a 403 or bot check, no login, no bulk page or image downloads, raw captures only in gitignored research-private/. Findings go in docs/decisions/ as our own notes, never their text.
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
- Mike-only tasks live in plan.md section 1 (OpenSky permission, 511 keys, accounts, domain/host, licence confirmations, ads placement). Never attempt them.
- Never assume a GEV env var or flag exists. Verify it in the code that reads it.
- If a feature needs an upstream edit: STOP, explain the exact blocker, offer an external workaround. Never edit silently.
- A hidden button is not a disabled feature. Verify the endpoint and data route are unreachable too.
- TeleGeography stays in the checkout but must not ship in the public build or be reachable by any route.
- Never strip proxy headers or weaken GEV security to make embedding work. A 403 behind Cloudflare is a failed test, not a bug to bypass.
- Unknown commercial-use permission = disabled. OpenSky stays OFF until written commercial permission (ads count as commercial).
- Kill criteria and the 10-session order are in `docs/decisions/red-team-round3.md`. Session 3 is a mandatory go/no-go.

## Environment limits
Cloud sandbox reaches only package registries and GitHub; importers and live tests run on Mike's machine, marked "untested against live API" until he confirms.

## Workflow
0. CORE (owner 2026-11-24, HARD): ask ChatGPT at EVERY chance: before each plan-changing decision, after each finished batch, when a page or design is built (upload screenshots; guest chat takes images only), and whenever unsure. It is a free second strong reviewer for decisions. Procedure and log: plan.md section 9. Its facts are UNVERIFIED until checked on the primary source or the live endpoint (one of its leads, Autobahn webcams, was empty); report wrong claims back to it. If Chrome is not connected or a bot check appears: say so in one line, never bypass, retry at the next chance. The UserPromptSubmit hook prints this every request.
0b. GAP CHECK (owner 2026-11-24, HARD: "what if your prompt was lacking"): Claude's prompt can be incomplete, so ChatGPT must say what is missing, every time. (1) Before sending, Claude writes one line: what the prompt probably omits and which assumption in it is most likely wrong. (2) Every ChatGPT prompt ends with this block, word for word: "GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses." (3) Claude reads the list whole, checks each item that could change the answer with a tool (repo, browser, CI, live endpoint) BEFORE acting, sends the facts back, normally 2 rounds. Each item is labelled `VERIFIED(evidence)` (file:line, command output, CI run, URL or endpoint response), `UNKNOWN`, or `NOT MATERIAL` (with the reason); never VERIFIED from a plausible story, never a bare "none" (write "nothing missing; checked: ..."). (4) The plan.md section 9 row carries a `MISSING:` line with those labels. A decision-changing UNKNOWN blocks a plan-changing or irreversible decision: ask the owner or take a reversible alternative. (5) Effort scales with risk: a typo or rename needs a scope check; deploys, licensing, money, security and plan changes need the full pass. Gate: `ops/harness/harness.test.mjs` fails any section 9 ChatGPT row dated 2026-11-25 or later whose `MISSING:` has no label or is a bare none; the hook prints the block every request. (6) FULL QUESTION PACKET (owner 2026-11-24: "you never paste full questions"): a short prompt hides what Claude assumed, so every ChatGPT prompt is a stand-alone packet saved FIRST as `docs/chatgpt-prompts/YYYY-MM-DD-slug.md` from `docs/chatgpt-prompts/TEMPLATE.md` and sent as that file's whole text: ChatGPT restates what I am really asking; OWNER SAID = the owner's exact words pasted verbatim (never a summary); goal; situation facts each with a source; the relevant hard rules pasted verbatim; what I did, decided and why, failures included; EXACT EVIDENCE pasted (code, config, log, table rows; attach a file if long); my full question with my options and recommendation; the answer format; the GAP CHECK block. The section 9 row carries `PROMPT: docs/chatgpt-prompts/<file>`; the harness test fails a row dated 2026-11-25 or later whose file is missing or lacks "OWNER SAID" and the GAP CHECK block. Added after ChatGPT critiqued this very rule (2026-11-24, chat 6b05ecb0).
1. Check `plan.md` for the current day and its "Done when" criteria.
2. Make the smallest working change, then run `npm run build` (add `npm run validate` for data) before saying it is done.
3. Update checkboxes in `plan.md` only for things actually verified.
4. End each task with: what changed, what was verified, what is still unverified, what will break next.

## Commands
npm run dev | build | validate | import:<source> (importers run on Mike's machine).

## Data conventions
Camera ids are stable and prefixed by source (`ontario-511-123`). Source ids are kebab-case. Dates are ISO 8601 UTC. Coordinates are decimal degrees, validated to lat -90..90 and lon -180..180.

## Naming
Site name: World Traffic Cameras; domain worldtrafficcameras.com (bought 2026-11-23). Name and URL live in site/src/config.mjs only. The launch switch PUBLIC_NOINDEX=1 hides the whole site until the repo variable LAUNCH=live (production workflow). NOINDEX STAYS ON until Mike says "go live" in chat (owner 2026-11-24, HARD): never set LAUNCH=live, never remove noindex or the robots Disallow on his silence, a green deploy or a resolving domain; read robots.txt and the meta tag live and report them.
Run GEV locally (owner 2026-11-24): `npm --prefix gev run dev -- --port 5173 --host 127.0.0.1` in the Terminal panel (launch config `gev-dev`; Node 24+, gev/node_modules exists; the Bash tool's pretool hook blocks any command mentioning gev/ with a write verb, so use the Terminal panel). Compare it with our /map/ for "identical to GEV": the public /map/ is the GEV iframe behind the allowlist proxy, so differences must be only the closed routes listed in plan.md item 22.
