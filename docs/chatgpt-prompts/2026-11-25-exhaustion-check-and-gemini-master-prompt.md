# ChatGPT prompt packet: have we exhausted Argos's data sources, and write the master prompt for Gemini Deep Research (round F)

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome the owner wants. If the goal conflicts with a rule below, say so.

## 1. OWNER SAID (verbatim, typos kept, 2026-11-25)
> "Ok. I'll need final confirmation from your and chatgpt that we have exhausted all data sources that argos has. Ask for a master prompt for Gemini deep research scrape the entire world to crush argos maps"
Just before: "Where are they getting all this data / Do u think argos is lying about the number of data sources they have" and "Ok but still are missing a ton of data. We are missing a ton of cameras and other shit".

## 2. GOAL
worldtrafficcameras.com: a free, no-sign-in world traffic-camera directory (link-out only, pictures never copied or cached) plus the God's Eye View (GEV) map, earning from ads beside licensed data inside Google's rules. Rival argosatlas.com. The owner wants (a) a rigorous answer to "have we exhausted every data source Argos uses", and (b) one master prompt he can paste into Gemini Deep Research to find every legally usable source in the world.

## 3. SITUATION (facts, each with its source)
- Argos public country index (read 2026-11-25): 222,898 active public cameras in 79 countries; US 74,502, Japan 24,158, Taiwan 23,964, Italy 9,738, Canada 9,562, Spain 9,370, Austria 7,244, Germany 6,xxx. Three places = 55%.
- Argos has no individual camera pages and no operator or licence on country pages. Its separate attributions page names about 23 camera owners (list below).
- Our sample of 227 featured camera names across 19 country pages (public pages only, polite pace): about 56% government road cameras, 27% tourism/town/beach/ski webcams, 7% a weather-webcam network (AWEKAS), 5% city CCTV in Indonesia of unclear ownership, 4% river/flood cameras. Sample is 0.1% and chosen by Argos, so these shares are a GUESS.
- Our registry today: 13,801 official camera links, 16 sources, 10 countries, plus 3 more being added (Georgia 3,829, Maryland 451 with owner approval for link-only listing).
- Today's hunts: 50+ countries checked; almost no keyless, clearly licensed national camera lists outside countries already built. Findings: Andorra 70 cameras keyless but the site's legal notice bans commercial use; Spain DGT 1,980 (dataset says CC BY, legal notice forbids commercial reuse); Wisconsin and Alberta 511 require written consent; Ohio, Utah, Ontario, NY, Korea and others need free keys; Denmark removed its public webcams; South Africa SANRAL terms forbid reuse; Medellin 80 and DAER-RS Brazil have no licence text. Free keys we have NOT yet obtained (owner step): South Korea MOLIT, Ontario 511, Ohio OHGO, Utah, Oregon TripCheck, NY 511, Queensland, Sweden Trafikverket, Norway DATEX.
- Argos attributions page owners (their stated licences) and our status: Fintraffic (have), DriveBC (have), HK Transport Dept (have), Statens vegvesen Norway (needs registration), Icelandic Road Admin (have), City of Toronto (have), Servei Catala de Transit (36 cameras, terms unread), MLIT regional bureaus Japan (river cameras, Public Data License 1.0, not built), JMA Japan weather cameras (not built), Water Resources Agency Taiwan river cameras (not built), Madrid city (built 357), Vitoria-Gasteiz (not found on national access point), Gipuzkoa (same), Tenerife Cabildo (legal notice, unread), TrafficWatchNI N. Ireland (no dataset found), Metropole de Lyon (15, small), Loire-Atlantique (tiny), Singapore LTA (8 cameras returned, picture URLs change), GeoNet NZ (hazard), USGS (hazard), PhenoCam (vegetation), Ohio DOT (needs key), Queensland TMR (needs key).

## 4. HARD RULES (verbatim)
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed. Default is unverified. Never set a permission to allowed yourself."
- "If a site blocks automated access (robots.txt, 403), stop. Do not work around it."
- "Copying IDEAS from argosatlas.com is allowed ... Still never copied word for word or file for file: their prose, source code, images, logos and brand name."
- Studying Argos public pages is allowed at a polite pace; no login, no bulk downloading, no bypass.
- Argos using a source is not a licence: every source needs its own quoted licence sentence.

## 5. WHAT I DID AND WHY (failures included)
I worked the attribution list ("round 0"), sampled Argos pages, ran hunts by region, and built what was clean. I should not claim exhaustion: 51 countries are still marked not-investigated in our ledger (some were hunted today but the ledger is not updated), per-camera operators of Argos are invisible from outside, and our hunts used web search plus agents with no JavaScript browser on several portals.

## 6. EXACT EVIDENCE
Numbers and tables above are pasted from our notes (docs/decisions/argos-camera-supply-sample-2026-11-25.md, docs/source-audits/argos-camera-owners-2026-11-24.md, hunt-batch1..8 docs). You cannot open our repo.

## 7. MY QUESTION (full)
Part A, exhaustion. My honest position: we CANNOT certify that we have exhausted Argos's sources, only that we have exhausted the 23 owners it names, and even those have gaps (several unbuilt for key or licence reasons). Attack that. Then list every source FAMILY Argos plausibly draws on beyond its attributions page (national road agencies, US state DOTs and 511 platforms, city CCTV portals, river and flood agencies in Japan and Taiwan, municipal and tourism webcams, weather webcam networks such as AWEKAS, windy/webcams-style aggregators, ski resort feeds, harbour authorities, university cameras, private networks), and for each say: what share of their 222,898 it plausibly supplies (GUESS), whether a link-out directory could lawfully use it, and what we have or have not covered. Rank the biggest remaining gaps by cameras gained. Say plainly whether the owner can be told "exhausted", and if not, what evidence would let us say it.
Part B, the Gemini Deep Research master prompt. Write ONE complete, paste-ready prompt (not an outline) for Gemini Deep Research whose job is: find every free, official, legally reusable (including with advertising) camera, road-condition and transport data source in the world, country by country, with exact URLs. It must: forbid bypassing robots/403/logins, require a verbatim quoted licence sentence plus URL for every source, separate "licence says commercial OK" from "licence silent" from "licence forbids or conflicts", record key requirements and how free the key is, count cameras where visible, give coordinates availability, stable link pattern, update frequency, and say "could not open" instead of guessing; produce a table in a fixed schema (country, region, operator, dataset name, URL, access method, key needed, licence name, quoted sentence, commercial OK, camera count, coordinates, picture URL pattern, last updated, evidence URL, confidence); be split into runs (continent by continent, then by country tier) so each run fits Gemini's output limits, with an instruction to continue until a "DONE" marker; include a sampling check against known truths I give it (our built sources, so it can verify it finds them); exclude non-official aggregators as sources but list them as leads separately; exclude private cameras; and end with a gap list of countries where it found nothing, with the likely agency to email. Include the hard rules above inside the prompt.

## 8. WHAT I WANT BACK
Part A: a table (source family, plausible share, lawful for link-out?, our coverage, gap size) and a verdict sentence on "exhausted". Part B: the master prompt in a single code block I can copy. Label claims SURE or GUESS. Read to the end and finish with the line END OF ANSWER.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
