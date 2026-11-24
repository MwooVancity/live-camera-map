# ChatGPT prompt packet: beyond Argos, round C (the debate: pushback, then worldwide sources) (sent 2026-11-24)

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome I want. If the question is ambiguous or the goal conflicts with a constraint below, say so and say what you would ask the owner.

## 1. OWNER SAID (verbatim, copied, typos kept)
> "Yeah I want even more shit than argosmaps. Info gain like how argos improved gev. Should be part of the debate right. I want chztgpt to thoroughly improve argosmaps features. Especially worldwide"
> "Inprove that and then debate. Once u done debate add the shit to planmd" (2026-11-24)
> Standing owner rule (CLAUDE.md, 2026-11-23): "The site does everything GEV and Argos Maps do, as a floor... Never call a feature 'blocked': give each gap an active path (read the licence, open a clean alternative, build our own feed, or email the provider). Only licensing, gev/ immutability, security and link-out-only hold a feature, and the hold names its next action."

## 2. GOAL AND WHO IT SERVES
Same as round B: worldtrafficcameras.com, free link-out world traffic-camera directory plus the GEV map embedded unmodified, ads and affiliate beside data, inside Google's rules. The owner wants a FLOOR of everything Argos does plus real information gain, worldwide.

## 3. SITUATION (facts, each with a source)
- Your round B answer (read whole): principle = from display to explain to connect to answer to distribute; 45 improvements; recommended five pillars (cameras, road intelligence, worldwide corridors, open data, GEV exploration); decision: defer flights, ships and geopolitical layers, leave VIPs, finance, cyber and strategic resources alone, avoid a country instability composite.
- GEV is already embedded: GEV itself ships conflict (GDELT) layers, GPS integrity, flights, ships (key-gated), satellites, weather, wind, hazards, data library. So on the MAP the geopolitical and flight layers come free once the host is live; the open question is only our own public pages and what we endorse.
- Checked since round B: Singapore LTA traffic-images API https://api.data.gov.sg/v1/transport/traffic-images answers 200 with camera id, latitude, longitude, timestamp and a picture URL; BUT it returned only 8 cameras in the response I read, and every picture URL is a new timestamped file (images.data.gov.sg/api/traffic-images/<year>/<month>/<uuid>.jpg), so there is NO stable link to give a reader; the Singapore Open Data Licence page (data.gov.sg/open-data-licence) allows use "whether commercially or non-commercially". So "open licence plus API" did not equal "linkable camera directory entry".
- Measured today: 48 percent of GEV's served cameras are already in our registry; Taiwan Highway Bureau list (2,354 cameras) was missing from GEV's docs table and is now built; Iowa DOT (1,253, CC BY 4.0) is next; Argos's own attributions page lists about 25 camera owners under open licences, 12 of them new leads for us.
- Our registry: 12,061 cameras, 8 countries. Hunts so far: 79 countries in Argos's sitemap, built or partial 9, blocked 16 with a named next step, 52 not investigated; three agent hunts found little in Europe, Asia and South America beyond Spain, France, Singapore and Northern Ireland leads.

## 4. CONSTRAINTS (pasted verbatim from CLAUDE.md)
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed. Default is unverified."
- "NO database, NO backend server, NO mass programmatic page generation."
- "Every source ships only with its own licence row; a source ships only with a quoted licence that allows republishing the list."
- "If a site blocks automated access (robots.txt, 403), stop. Do not work around it."
- Three tests: maximum helpfulness, information gain over what already ranks, passing Google's helpful-content review.

## 5. WHAT I DID AND WHY
I read your round B reply to its last line. I agree with: provenance and quality first, corridor pages, CSV and GeoJSON, source-change log, Ask-about-this-road via GEV tools, shareable views, sponsored widgets, no instability composite. I DISAGREE or want to test: (a) your advice to "leave alone" Argos's non-camera layers conflicts with the owner's floor rule unless a hard rule blocks them; (b) you gave region-level source families but almost no concrete agency, URL and feed for countries we have not built; (c) you did not say what a transparent version of each Argos layer would look like when the answer is "build it"; (d) your table assumed licences are "expected" without telling me which are likely to fail the "stable link-out" test like Singapore.

## 6. EXACT EVIDENCE
Singapore response sample: {"timestamp":"2026-11-25T06:21:30+08:00","image":"https://images.data.gov.sg/api/traffic-images/2026/11/cd94272d-....jpg","location":{"latitude":1.447023728,"longitude":103.7716543},"camera_id":"2701", ...}; 8 cameras in items[0]. Licence sentence: "download, copy, distribute, transmit, modify and adapt the datasets, or any derived analyses or applications, whether commercially or non-commercially".

## 7. MY QUESTION (full)
(1) DEBATE (a): for EACH Argos non-camera layer (finance and company cards, VIP people with jets and yachts, AI risk zones, instability index, frontlines, verified war events, GPS jamming, sanctions matching, air-raid alerts, cyber threats, internet outages, travel advisories, energy and pipelines, ports and straits, chokepoint traffic, case files, convergences) give a verdict under the owner's floor rule: (i) BUILD A TRANSPARENT VERSION (say exactly what: sources with licences, what the reader sees, the method note, uncertainty), (ii) MAP-ONLY through GEV with no public page of ours (say why that is enough), or (iii) HOLD because a hard rule blocks it (name the rule, the next action, and who acts). "Leave alone" is not an allowed verdict. Defend each against the HCU and legal risks you named.
(2) WORLDWIDE: give a concrete candidate-source table for the 40 countries with the most road traffic or Spanish, German, French, Portuguese, Japanese, Korean, Chinese, Arabic, Hindi and Indonesian search demand where I have NOT yet built a source (exclude US, Canada, UK, Finland, Iceland, Hong Kong, Taiwan, Australia NSW): country, road agency, the exact portal or API page you believe publishes camera locations, expected format, expected licence family, whether a key or registration is needed, and your confidence SURE or GUESS. Mark which entries you could not name a real URL for; do not invent URLs. I will verify each by tool and report wrong ones back.
(3) STABLE LINK-OUT TEST: which of your 45 improvements fail the rule that every camera needs a stable official link (like Singapore's changing picture URLs), and how should such sources be represented honestly (listing without link, or excluded)?
(4) INFORMATION GAIN THAT ARGOS CANNOT COPY: after my pushback, list the five improvements you now rank highest, each with the reader question, the exact data, the licence family, the measurable success number, and the cheapest first version.
(5) WHAT TO PUT IN THE PLAN: write the top 15 plan items as one-line, testable tasks (what ships, the test that fails without it, the hard rules checked, owner action if any).

## 8. WHAT I WANT BACK
Short restatement; (1) as a table with verdict and reason; (2) as a table; (3) a short list; (4) five blocks; (5) 15 lines. Label SURE or GUESS. Say "could not verify" and "no URL known" instead of guessing.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
