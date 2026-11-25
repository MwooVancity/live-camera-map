# ChatGPT prompt packet: what is the ceiling of a God's Eye View based product? (round E, debate)

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome the owner wants. If the goal conflicts with a rule below, say so.

## 1. OWNER SAID (verbatim, typos kept, 2026-11-25)
> "I refuse to believe that Argo's Maps is the greatest end product that you could possibly build with God's eye view. That there is nothing more in the entire universe to improve God's eye view. That's something for you and ChatGPT to debate with."
Earlier today: "Does Argos Maps, the most comprehensive built possible, and there's nothing you can do to improve it?" and "I want even more than Argos Maps, info gain like how Argos improved GEV."

## 2. GOAL
worldtrafficcameras.com: a free, no-sign-in world traffic-camera directory (link-out only, pictures never copied or cached) plus the open-source God's Eye View (GEV) map at /map/, earning from ads beside licensed data inside Google's rules. Rival: argosatlas.com (an Argos-branded product on top of GEV, about 226,000 cameras). The owner wants the strongest possible end product built on GEV, not a copy of Argos.

## 3. SITUATION (facts, each checkable)
- GEV (MIT, package gods-eye-view 0.3.0): 39 registered layers, 39 server provider plugins, 40 core tools shared by an MCP server (30 tools), voice (61 tools) and chat, 96 Data Library entries, 129 documented env variables, a CCTV catalogue with opt-in packs, share links, saved layer state. Source: our read-only inventory docs/source-audits/gev-feature-inventory-2026-11-24.md (files opened, nothing run).
- Argos Atlas: GEV-based map plus paid features (alerts, AI assistant, exports "coming"), 222,898 cameras in 79 countries on its country index, no per-camera pages found, no per-camera uptime history found. These come from its public pages only.
- Ours today: 13,801 official camera links in 10 countries, health checks with per-source answered share, driving-order corridor pages, a road observability index for Iceland, CSV exports, per-source licence evidence, link-out only.
- Source hunts today: licences, not discovery, are the bottleneck for more cameras.
- Round D today (you, same day) agreed: build road intelligence (observability, status ladder, closures, RWIS, border waits), chase integrated 511/DATEX portals, never claim "live" from an HTTP 200.

## 4. HARD RULES (verbatim)
- "God's Eye View (GEV) is proven upstream code. Its files must NEVER be edited, deleted, renamed, reformatted or patched." Allowed: new files and folders, external deploy/env config, a separate site, reverse-proxy config, wrapper services, registries, CI checks.
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed."
- "Never strip proxy headers or weaken GEV security to make embedding work."
- "Unknown commercial-use permission = disabled." (live flights stay OFF until a paid commercial licence)
- "NO database, NO backend server" for the directory itself (static site plus scheduled jobs); the GEV server runs separately behind an allowlist proxy.
- "If a site blocks automated access (robots.txt, 403), stop."
- Never copy Argos's prose, code, images, logos or brand name; ideas may be matched or beaten.

## 5. WHAT I DID AND WHY (failures included)
Embedded GEV at /map/ behind an allowlist proxy; built site pages around it; held every restricted GEV layer off; ran four ChatGPT rounds; today I mistakenly said "nobody can reverse-engineer Argos's source list" and was wrong; I measured their country index. I may be over-focused on cameras and roads because that is what we can license.

## 6. EVIDENCE
Counts above are from our inventory file (VERIFIED by opening files). I cannot paste GEV's code here. Argos facts: public pages only.

## 7. MY QUESTION (full)
Debate me honestly; do not flatter. Owner's claim: Argos is not the greatest possible product on GEV. My position: correct, because Argos mostly adds a brand, paid alerts and a country/blog layer; real upside lies in (1) decision products built around the map (route briefings, "what changed in the last hour" feeds, comparison views, saved watchlists without sign-in, shareable scenes), (2) a data layer around GEV that GEV does not have (provenance, freshness evidence, history, observability, closures/RWIS/ferries/borders from official sources), (3) performance and reach (mobile first, offline, accessibility, 40+ languages done properly, embeds for publishers, an open API and exports), (4) trust (a public methodology, an inspectable licence per source, correction process), (5) editorial and research outputs (annual reports, regional case files) that earn links, (6) tools that use GEV's own MCP server and agent tools for useful answers without paid credits (careful with cost and abuse).
Now: attack each of the six; then list EVERYTHING else that could improve a GEV-based product in the whole space (map engine features, time controls and replay, analytics, 3D and terrain, vehicle-view simulations, correlation views, community contribution with moderation, partnerships with road authorities, B2B data licensing, hardware/IoT, accessibility, privacy, performance budgets, SEO, monetisation beyond ads). For each: exact source or standard where data is involved (or "no source known"), does it fit my hard rules (especially immutability and link-out only), build effort S/M/L, and expected effect GUESS/SURE. Finish with: the five ideas you would build first if you were the owner, the three you would refuse and why, and what you need from me to be sure.

## 8. WHAT I WANT BACK
Restatement; table; verdict on the six; ranked five and three; "could not verify" instead of guessing; every claim SURE or GUESS. Read to the end and finish with the line END OF ANSWER.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
