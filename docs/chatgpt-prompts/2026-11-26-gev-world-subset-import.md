# ChatGPT prompt packet: should we import GEV's 2,230 Oregon and Japan cameras as link-only listings?

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome I want. If the goal conflicts with a constraint below, say so.

## 1. OWNER SAID (verbatim, typos kept, 2026-11-26)
> "Fix it all.  And just use gev for maps etc load it in terminal and take screenshot of laptop and rea etc etc improve this prompt"
Earlier (2026-11-25): "You do it all / Hard rule: I'm hands off as much as possible"

## 2. GOAL AND WHO IT SERVES
worldtrafficcameras.com: free link-out traffic camera directory plus the God's Eye View (GEV) map, funded by ads, meant to beat argosatlas.com on helpfulness and information gain. A driver finds an official camera for a road or river and opens the official source.

## 3. SITUATION (facts, with sources)
- Live home page title today says 18,377 official links, noindex (read from https://worldtrafficcameras.com/ 2026-11-26).
- The pinned GEV repo has config/cctv_sources.world-image-cameras.json: 2,230 rows, 1,054 "mlit-river" (Japan, cam.river.go.jp/cam/now/<id>.jpg) and 1,176 "tripcheck-odot" (Oregon, tripcheck.com/roadcams/cams/<name>.jpg), each with id, name, city, lat, lon, url, credit (file read). I searched our registry only by pack name for other packs, not by coordinate, so overlap with what we already list is UNVERIFIED.
- GEV DATA_SOURCES.md line 422: "Mixed: ODOT TripCheck public images (ODOT permits use with credit) and MLIT site content under terms compatible with CC BY 4.0. Frames are not bundled or persisted". That is GEV's author's claim. I have NOT yet re-read the ODOT or MLIT terms pages.
- Our permission row: commercialStatus allowed_per_doc, needsHumanReview true, imagePermission unverified.
- GEV's code comment: "The provider asks clients to avoid frequent repeated image collection" (MLIT), and one fixed maintenance JPEG is served by paused MLIT cameras.
- Our camera health checker runs every 3 hours in CI.
- Our earlier notes say Oregon TripCheck needs a free key for its API. The GEV list needs none.

## 4. CONSTRAINTS (verbatim from CLAUDE.md)
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed. Default is unverified. Never set a permission to allowed yourself"
- "Every free public source Argos uses is a lead: add it faster, each with its own row in data/source-permissions.json (licence quoted, URL, date) before data ships."
- "A 200 response is not proof a camera works"
- "Respect each source's rate limits. Use bulk endpoints before per-camera requests."
- "God's Eye View (GEV) is proven upstream code. Its files must NEVER be edited"
- "Unknown commercial-use permission = disabled."

## 5. WHAT I DID AND DECIDED (including failures)
Ran GEV locally and turned on its camera layer (clusters drew; the log shows "World camera image sources: 2230/2230"). I had not noticed this bundled list as a directory source before today. Added the two missing DNS records, so the apex and www now answer. GEV also loads packs we do not list (Tallinn 255, DelDOT 368, WSDOT 1,635, TxDOT 575); their rows rest on an owner approval, not on a quoted licence.

## 6. EXACT EVIDENCE
```
{"id":"world-jp-river-310497008","name":"中津隈8号橋","city":"佐賀県, JP","provider":"MLIT river cameras","lat":33.321083,"lon":130.449028,"sourceKind":"mlit-river","license":"MLIT 川の防災情報 river camera (CC BY 4.0 compatible; see site terms)","url":"https://cam.river.go.jp/cam/now/310497008.jpg","frameRefreshMs":600000}
{"id":"world-or-1267","name":"Yaquina Bay Newport (USCG)","provider":"TripCheck (ODOT)","lat":44.62413,"lon":-124.06289,"license":"Oregon DOT TripCheck public CCTV inventory","url":"https://www.tripcheck.com/roadcams/cams/Yaquina Bay Newport USCG_pid4904.jpg"}
```

## 7. MY QUESTION
Options: (A) import all 2,230 now from GEV's file as link-only, no image shown, no health requests to these hosts, labelled "not checked by us", after I re-read both providers' own terms; (B) import only from the providers' own current catalogues with their terms, ignoring GEV's snapshot; (C) wait. My recommendation: A, only for whichever provider's own terms page I can quote for commercial reuse of the listing, and with an official viewer page as the link target if one exists per camera, since a bare JPEG is a poor destination and MLIT river cameras are not road cameras. Attack this: licence, hotlinking a bare image URL, snapshot staleness, river cameras on a traffic site, Google helpful-content risk, and what I should check first.

## 8. WHAT I WANT BACK
A short table (risk, severity, how to check), then a verdict A, B or C per provider. Say "could not verify" instead of guessing. End with the line END OF ANSWER.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
