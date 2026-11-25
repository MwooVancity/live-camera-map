# NOT SENT (owner distrusts ChatGPT prompts, 2026-11-24; read it, say go or delete): ChatGPT prompt packet, Argos pricing page and "free version" positioning

## 0. FIRST, before you answer
Restate in 3 lines what I am really asking and what outcome the owner wants. If the goal conflicts with a rule below, say so and say what you would ask the owner.

## 1. OWNER SAID (verbatim, typos kept)
> "https://argosatlas.com/en/pricing/ screenshot this with chatgpt this should all be free this is some bullshit"
> "make sure our site makes it clear to google we're the free version of this"

## 2. GOAL AND WHO IT SERVES
worldtrafficcameras.com: a free, no-sign-in, link-out world traffic-camera directory plus the GEV map embedded unmodified, earning from ads and affiliate beside data, inside Google's rules. Goal now: (a) decide which of the competitor's paid features we can offer free and legitimately, and (b) make it clear to Google and readers that we are the free option, without copying or naming the competitor wrongly.

## 3. SITUATION (facts, each with a source; I read the page in a normal browser on 2026-11-24, the screenshot of its top is attached)
- Their free map: says "The live atlas is free and will stay free", shows counters (226,203 cameras, 13,756 flights, 19,783 ships, 34,936 power plants, 1,661 verified events, 15,583 financial assets, 1,594 VIP people, 218 risk zones). Cameras on the free tier have a daily quota and an ad before a camera opens (their own pricing comparison table: "Cameras daily quota" versus "all", "An ad to open one yes" versus "never").
- Paid "Pro" tiers: OUTPOST $29.99 first month ($5.25/mo on 12 months), DISTRICT $79.99 ($15.83/mo), DIVISION $279 ($95.75/mo), AGENCY $4,999/mo (commercial use, API and MCP). Pro gives: unlimited cameras with no ads and no country blocks, camera recording (24 h archive, 15 to 150 cameras), AI assistant with monthly credits, flight and ship history (7 to 90 days), geofences with alerts, Telegram/Discord/Slack/email briefs, analyst panels, 3D globe, 16-camera videowall and TV mode, camera API embed, own ADS-B antenna on the map, CSV/GeoJSON/KML export (marked "coming soon"), API and MCP (AGENCY only).
- Our own facts: no sign-in, no quota, no ad before a camera click, each camera is a link to its official page (picture never copied), per-camera health stamp, new /data/ page with per-country CSV downloads of every licensed camera (free), GEV map embedded (GEV itself has 3D globe, wind, flights, ships key-gated, satellites, street level, AI assistant if keys set, 14 UI languages). Registry about 13,800 cameras in 10 countries versus their claimed 226,203 worldwide.
- The earlier merged GEV-versus-Argos table (docs/source-audits/gev-vs-argos-merged-2026-11-24.md) already classes recording, videowall and camera embed as SKIP because they need stored or embedded pictures, alerts as deferred (needs accounts or a backend), export as gap-with-edge (built today as /data/).

## 4. RELEVANT HARD RULES (verbatim from CLAUDE.md)
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed. Default is unverified."
- "NO database, NO backend server, NO mass programmatic page generation."
- "Copying IDEAS from argosatlas.com is allowed and encouraged: page types, features, data fields, page structure, layout patterns and UX flows may be matched or beaten. Still never copied word for word or file for file: their prose, source code, images, logos and brand name (copyright and trademark are real even when scraping is fine, a takedown would hit our host and domain, and duplicate text fails Google's helpful-content review)."
- Our own test tests/parity/no-argos-in-site.test.mjs fails the build if the built site contains the competitor's name.
- Three tests: maximum helpfulness, information gain over what ranks, passing Google's helpful-content review.
- NOINDEX STAYS ON until the owner says go live in chat.

## 5. WHAT I DID, DECIDED AND WHY
The owner's two lines conflict with rules: "make it clear to Google we're the free version of this" would naturally name the competitor, which our gate and the trademark rule forbid. My plan: do not use their brand name anywhere on the site; instead make "free, no sign-in, no quota, no ad before a camera" explicit in the title, H1, meta description, a plain comparison line without their name, and Organization/WebSite/Dataset structured data, so Google and readers get the "free" signal for the queries people type. I do NOT yet know whether comparative pages that name a competitor are lawful and safe for us (nominative fair use), so I ask below. Also "this should all be free": most of the paid list needs stored pictures, accounts or servers that our hard rules or costs forbid; I want your view on which are legitimately free for us and which are not.

## 6. EXACT EVIDENCE
Screenshot attached (top of https://argosatlas.com/en/pricing/, 2026-11-24): headline "The map sees everything. Pro opens all of it, remembers it and understands it.", line "The live atlas is free and will stay free.", Black Friday banner up to 82 percent off through Friday November 27. Plan names and prices and the comparison rows are as listed in section 3, read from the page text.

## 7. MY QUESTION (full)
(1) Row by row, for each paid feature in section 3: can a free, link-out-only, no-account site offer an honest equivalent, which part, and at what cost (data licence, hosting, hard rule)? Say "not legitimately free" where true (recording needs stored pictures; geofence alerts need accounts and a backend; AI credits cost money) and what the closest free substitute is (for example free per-city CSV, a read-only data file, a GEV link for the 3D globe, an RSS or static "what changed" page).
(2) How should the site tell Google and readers we are the free alternative WITHOUT naming the competitor: exact title, H1, meta description, comparison copy, structured data, and which queries ("free live traffic cameras", "free traffic cameras no sign up", and competitor-brand queries) each targets. Is a page that names the competitor ("X alternative", "free X") allowed under nominative fair use and useful under the three tests, and what is the legal risk for our host and domain? My recommendation: no brand name on the site; target the generic free queries; revisit a named comparison page only after a lawyer check.
(3) What claims about being free could mislead or fail Google's review (for example "free" while ads show, or comparing counts when our registry is far smaller)? Give safe wording.
(4) The five concrete edits to make first, each testable.

## 8. WHAT I WANT BACK
Short restatement; (1) a table with verdict per feature; (2) copy and markup suggestions with the risk; (3) a short list of wording to avoid; (4) five testable edits. Label SURE or GUESS. Say "could not verify" instead of guessing.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
