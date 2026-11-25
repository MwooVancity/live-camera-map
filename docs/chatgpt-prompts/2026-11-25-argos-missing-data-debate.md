# ChatGPT prompt packet: what Argos Maps is still missing (round D, debate)

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome the owner wants. If the goal conflicts with a rule below, say so.

## 1. OWNER SAID (verbatim, typos kept, 2026-11-25)
> "Yeah, but we also need more shit than what Argos has. What is Argos missing for cameras and sources and data and etc, etc, etc? They're missing data. Find all the shit they're still missing. Unless you're telling me Argos Maps is the greatest possible GEV website you could have built. That's something for you and ChatGPT to debate. Does Argos Maps, the most comprehensive built possible, and there's nothing you can do to improve it?"
Earlier: "I want even more than Argos Maps, info gain like how Argos improved GEV."

## 2. GOAL
worldtrafficcameras.com: a free, no-sign-in world traffic-camera directory (link-out only, pictures never copied or cached) plus the open-source God's Eye View (GEV) map, earning from ads beside licensed data inside Google's rules. Rival: argosatlas.com (about 226,000 cameras, 79 countries on its country index, about 500k visits a month; an Argos-branded GEV derivative). We must win on information gain and helpfulness, not on imitation.

## 3. SITUATION (facts)
- We list 13,801 official camera links, 16 sources, 10 countries today (our status script, 2026-11-25). Argos US 74,502, Japan 24,158, Taiwan 23,964 (their public country index).
- We already built: per-camera health checks with timestamps (Argos has none that we found), driving-order corridor pages, an Iceland "road observability" index (share of main-road points within 5 km of a camera), CSV exports, licence evidence per source, links only.
- Argos attribution page names about 23 camera owners, far fewer than its total, so most cameras come from places it does not list (my GUESS: hundreds of portals plus aggregators).
- Earlier rounds (A, B, C, 2026-11-24) produced a 48-row feature matrix: 8 parity, 10 where we lead, 17 gaps, 13 skipped (paid or AI). Round B's principle: display, explain, connect, answer, distribute; ours = "what can I observe about this road right now, how reliable is it, where can I verify it".
- Source hunts today across 50+ countries found almost no keyless, clearly licensed camera lists outside the countries already built; licences are the bottleneck.

## 4. HARD RULES (verbatim)
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed. Default is unverified."
- "If a site blocks automated access (robots.txt, 403), stop. Do not work around it."
- "Copying IDEAS from argosatlas.com is allowed ... Still never copied word for word or file for file: their prose, source code, images, logos and brand name."
- GEV (upstream map code) is immutable; we only add around it.
- Every number on a page needs a source and a timestamp; nothing ships for a count or ranking trick.

## 5. WHAT I DID AND WHY (failures included)
Four rounds with you already; my first claim "nobody can reverse-engineer Argos's sources from outside" was wrong and the owner objected; I then sampled their public pages. I built sources one licence at a time. I also tend to treat Argos as the ceiling; the owner suspects it is not.

## 6. EVIDENCE
Argos facts above come from their public pages (country index, attributions page). Round B's 45-improvement list and the 48-row matrix exist in our repo but you cannot read them; I paste the principle only. Your earlier claims were not independently verified unless stated.

## 7. MY QUESTION (full)
Debate me. My position (attack it): Argos Maps is NOT the best possible GEV website; it is an aggregator whose weakest points are provenance, freshness and decision value per camera. Candidate gaps I see: (a) no per-camera reliability or uptime history, (b) no "is this road observable" coverage measure, (c) no ordered corridor view, (d) no open data exports of the licence-clean subset, (e) no verified link-health, (f) no official-source credit or licence shown per camera, (g) shallow local-language content. Challenge each. Then list EVERYTHING else that is missing from Argos Maps in four classes: 1 cameras and sources (which public official datasets worldwide exist that a camera directory could add beyond cameras: road weather stations RWIS, road closures and incidents DATEX II, traffic counts and speeds, bridge and tunnel status, ferry and border-wait cameras, ski pass and mountain pass conditions, avalanche, ports, airports, rail crossings, EV chargers, parking), 2 data quality (history, uptime, snapshot-free proof of liveness, duplicates), 3 product (per-road pages, per-trip pages, embeds, API, alerts, offline), 4 distribution and SEO (what queries Argos does not answer). For each: name the exact public source or standard if you know one (or write "no source known"), the licence family you expect (UNVERIFIED), and whether a link-out-only directory can use it. Then say whether anything in my rules prevents the best idea and what the owner should decide.

## 8. WHAT I WANT BACK
A table first (item, class, source, expected licence, link-out OK, build effort S/M/L, expected traffic or revenue effect GUESS/SURE). Then your verdict on my position (agree, disagree, why). Label every claim SURE or GUESS and say "could not verify" instead of guessing. Read to the end; no truncation.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
