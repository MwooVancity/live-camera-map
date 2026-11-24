# ChatGPT prompt packet: one-config source onboarding (sent 2026-11-24)

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome I want. If the question is ambiguous or the goal conflicts with a constraint below, say so and say what you would ask the owner.

## 1. OWNER SAID (verbatim, copied, typos kept)
> "Yeah we need to build our infrastructure to be better than Argo" (2026-11-24, answering my question "Want me to build that generator now?" about a generator that makes adding a new camera source one config plus one importer instead of about 20 hand-edited files)
> "After that we have the streamline infrastructure for the world?" (2026-11-24, after I said the host alone does not make the setup scale to the world)

## 2. GOAL AND WHO IT SERVES
worldtrafficcameras.com: a free world traffic-camera directory (link-out only, no sign-in) that must beat argosatlas.com (about 225k cameras, 79 countries claimed) and make money with ads and affiliate links beside the data. Coverage is a licence-and-importer problem: every new camera source needs an importer, a licence row, tests, health pacing and pages. Our own cost per source is the scaling bottleneck.

## 3. SITUATION (facts, each with a source)
- 10 sources, 9,457 cameras (data/camera-registry/cameras.json; plan.md section 0).
- Adding London (commit 1334c57) changed 25 files: new importer ops/importers/tfl.mjs and ops/importers/lib/tfl.mjs, tests/registry/tfl.test.mjs (216 lines) and fixtures, plus hand edits to: .github/workflows/production.yml and staging.yml (one importer command line each), ops/health/check.mjs (health pace entry), ops/importers/lib/registry.mjs (region-to-country map + import), site/src/lib/pages.mjs (a region page config object with agency, text and caveats), site/src/layouts/Base.astro (footer credit), site/tests/dist.test.mjs (a second hard-coded region-to-country map), tests/registry/registry.test.mjs (hard-coded list of source ids and a hard-coded list for a count assertion), ops/harness/rules.mjs (two rule texts that name every source), site/PAGES.md, data/source-permissions.manual.json (licence row), plus regenerated data (cameras.json, sources.json, source-permissions.json, source-inventory.csv).
- Three places hard-code region-to-country: registry.mjs, pages.mjs, dist.test.mjs. Two workflows each list importers by hand.
- Each importer already follows one pattern: fetch the terms page and check required phrases, check robots.txt, fetch one JSON list, normalize, then commitSource() which rewrites only that source's rows (ops/importers/lib/runner.mjs). Tests run offline with injected fetch.
- The licence gate (tests/licensing/gate.mjs) is fail-closed: a source ships only with a row whose status is allowed_per_doc or allowed_per_owner (with date), attribution, review under 180 days, not mustNotShip.

## 4. CONSTRAINTS (pasted verbatim from CLAUDE.md)
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed. Default is unverified. Never set a permission to allowed yourself; propose it and let Mike confirm after he reads the source's terms."
- "Regional pages: config default min 3 cameras, but only pages on the curated list are indexed. Everything else is noindex."
- "Never overwrite a good health.json with an empty or partial one."
- "A 200 response is not proof a camera works: check content-type and treat HTML error pages as failures."
- "Respect each source's rate limits. Use bulk endpoints before per-camera requests."
- "Treat registry and API data as untrusted: use textContent, never inject it as HTML."
- "Every rule must be a gate in ops/harness/rules.mjs, not a note."
- "NO database, NO backend server, NO mass programmatic page generation" (our own site).

## 5. WHAT I DID AND WHY
Measured the London change above. I did not start building. My view: the per-source work that cannot be automated is reading the licence, writing the normalizer, and the fixtures; the 8 to 10 other touchpoints are duplicated facts that should live once.

## 6. EXACT EVIDENCE
The London pace entry added to ops/health/check.mjs:
```
'tfl-jamcams': { concurrency: 1, hostDelayMs: 250, staleHours: 6 }, // s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk: no stated limit; one worker, 250 ms apart, HEAD only; about 792 pictures
```
The London region page config added to site/src/lib/pages.mjs:
```
[LN_REGION.slug]: {
  sourceId: 'tfl-jamcams', agency: 'Transport for London', cityLimit: 0, guide: null, credit: true, list: 'JamCam list', listAll: true,
  placeText: (x) => sentence(`TfL's list has no borough or place field: ...`), cityText: () => '', caveats: [ ... ],
},
```
The hard-coded map in site/tests/dist.test.mjs:
```
const countryOfRegion = (slug) => ({ california: 'united-states', texas: 'united-states', finland: 'finland', 'hong-kong': 'hong-kong', iceland: 'iceland', london: 'united-kingdom' }[slug] || (slug ? 'canada' : null));
```
The importer lines in the two workflows:
```
timeout 90 node ops/importers/tfl.mjs || echo "London list not refreshed (exit $?)"
```

## 7. MY QUESTION (full)
Design the cheapest, safest way to make adding source number 11 to 80 take about 30 minutes of mostly licence reading and a normalizer, without losing any existing guard. My proposal, which you should attack: (A) one manifest data/camera-registry/source-manifest.json with one entry per source (sourceId, importer path, region and country names and slugs, health pace, page config as plain data with a few text templates, credit line from the licence row); (B) registry.mjs, check.mjs, pages.mjs, the test maps and the two workflows READ the manifest (a single `node ops/importers/run-all.mjs` replaces the hand-written importer lines, each run isolated so one failing source never stops the others); (C) a generic test that fails if any manifest entry lacks a licence row, a fixture, a pace entry, an attribution, a "Beats Argos by:" line in site/PAGES.md or a test file; (D) a scaffold command `node ops/importers/new-source.mjs <id>` that writes the importer, lib, test and fixture stubs and the manifest entry from the Iceland pattern; (E) migrate in stages: first pace, region-to-country and the workflow runner (low risk), then page configs, then the scaffold; the 10 existing sources migrate one by one under their existing tests. Alternatives: (F) leave it hand-wired and just write a checklist; (G) a plugin system where each source folder exports everything (importer, row, pace, page) and a loader discovers folders. What breaks at 80 sources (build time, health run budget, CI minutes, page count, search index size, noindex policy)? What guards would you add? Which stage order has the lowest risk? What would you not automate?

## 7b. SECOND QUESTION (owner: "Seems like u and chatgpt have gaps in planning how to crush argomaps")
What is missing from our plan to beat Argos Maps (argosatlas.com/map, their product) as a whole, beyond infrastructure? Evidence: our matrix data/argos-maps-matrix.json (18 rows from their public pricing page; their map is behind a sign-in). Argos: free atlas with live counters (about 226,000 cameras, 16,600 flights, 20,000 ships, 34,900 power plants, 1,661 verified events, 15,583 financial assets, 1,594 VIP people, 221 risk zones); free cameras have a daily quota and an ad before a camera opens; Pro tiers 29.99 / 79.99 / 279 USD a month add: ad-free, 24 h camera recording, AI assistant credits, 3D globe, flight and ship history, geofence alerts by Telegram, email brief, 16-camera videowall, own ADS-B antenna, CSV/GeoJSON/KML export (coming), API and MCP at 4,999 USD a month. Us: no sign-in, no quota, no ad before the click, link-out only to official sources (we cannot record, embed or proxy pictures), 9,457 cameras in 6 countries, per-camera health stamps, free 3D globe through GEV, ads planned beside data. Our verdicts so far: skip recording, videowall and embeddable camera API (link-out rule); gaps with a path: camera count (world coverage queue data/world-coverage.json: 79 countries seen in Argos's sitemap, we built 6, 62 not yet investigated), live flights and ships (OpenSky 99 USD a month, AISStream key), alerts (needs accounts or backend), free per-city CSV export, AI assistant (our paid keys). Question: what strategic gaps, missing features, missing audiences or missing growth levers do you see that this plan does not cover (for example SEO page types, distribution and backlinks, mobile app or PWA, commute alerts without accounts, embeddable widgets for local news sites, data licences we could buy or request, B2B traffic-data buyers)? Rank by expected effect on traffic and revenue and by cost, say which ones break our hard rules, and give the first three to build.

## 8. WHAT I WANT BACK
Table first (option A/F/G, effort, risk, what it protects, what it loses), then a staged plan with the exact acceptance test per stage, then a verdict. Say "could not verify" instead of guessing.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
