# Testing like a first-time human, 2026-11-26 (live pages read about 03:15-03:30 UTC on 11-27)

## Method
- Our site: scripted headless Chromium (Playwright, local build 1223), phone 375x812 with touch, and desktop 1366x768. Hard timeout on every script. Map run with software WebGL (SwiftShader); it rendered. Speed, smoothness, pinch/drag and real phones are NOT tested.
- A script with screenshots is not a person. It finds broken tasks, not confusion or taste.
- Argos: no argosatlas.com page was loaded. Third-party pages only, plus our own notes. One early web search was not domain-filtered and returned search-engine summaries of Argos blog posts; nothing below relies on them.
- robots.txt on worldtrafficcameras.com read live: "Disallow: /" (still hidden). The meta noindex tag was not checked.

## Findings on our site, worst first
1. **The map is missing whole cities.** The live map feed holds 8,000 cameras (CAMERA_CAP in ops/deploy/build-static-map.mjs, shared round-robin across sources). Within about 20 km of the city centre: Seattle 0 on the map of 432 in our list; Atlanta 0 of 1,330; London 576 of 752; Sacramento 98 of 98. A Seattle map link showed a street map with no camera markers seen. Yet /map/ says "The map shows 24373 official traffic camera locations". That sentence is false.
2. **"Cameras near me" fails for big covered areas.** Seattle gave only "Mission (city) 170 km away" (British Columbia). Atlanta gave "No camera pages within 300 km of you yet", with 3,829 Georgia cameras listed. It searches city/road pages, not cameras; Washington and Georgia have no city pages. Berlin's "none" may be correct.
3. **City search fails.** Nothing for Seattle, Vancouver, Houston, Atlanta, sacremento (typo, a stated limit), New York, 98101, Taipei, M25. Our list has hundreds of Atlanta-named cameras. Code cause for part of it: site/src/lib/search-core.mjs reads only the 3 smallest data pieces when the first lookup finds nothing, and these regions have no city entries. "Peachtree", "Georgia" and "I-5 at MP 165.4" do work.
4. **A failed search shows nothing.** The "No results" message has class "sr" at 1x1 pixel (screen readers only). A sighted visitor sees an unchanged page and thinks search is broken. Enter does nothing.
5. **Map opens a camera card nobody asked for,** on load, covering much of the phone map. World view: a Maryland camera. Seattle view: a Victoria, BC camera. Sacramento view: a nearby one. The scripted click on its close button did not complete (selector or app, unknown); a click on empty map did dismiss it.
6. **The map has almost no controls.** The only visible buttons found in the frame were "Data attribution" and the card's close button: no search, zoom buttons, layer menu, locate or reset. A dark circular mask hides the corners. So the GEV feature set is not reachable by a visitor on /map/ as seen (embed mode; hidden gestures or keys not tested). Local GEV was not run for a side-by-side.
7. **Map clicks, partly checked.** A single marker click left a camera card open (same camera as the auto card, so weak proof). A 6-camera cluster click closed the card and moved to a tilted close-up; no list. Wheel over the map did not scroll the page.
8. **Phone: the map starts about 860 px down,** below the 812 px screen, after a paragraph listing about 45 region names. First screen of /map/ has no map.
9. **Huge region pages with no filter or Save.** Georgia: about 421 phone screens, 3,829 links, no filter box in the page body; About/contact link sits at about 341,600 px. Washington: no Save buttons. The header search is the only shortcut (see 3).
10. **Save works only where tested on a city page.** Sacramento: Save, then /saved/ listed it: pass. Cityless regions (Washington, Georgia checked) offer no Save, although /saved/ tells people to use city or road pages.
11. **Official link is a bare picture.** Sampled Caltrans and WSDOT links answer 200 with a JPEG; there is no way back except the browser Back button (links have no target). 511GA: 5 sampled links returned PNG with 200; one of the 5 was a "Stream not available" placeholder (only that one image was viewed). A 200 check would miss it.
12. **Console noise on /map/:** 404s on several /api/ calls (including terrain heights), one 405, and in one run a USGS earthquake feed blocked by our own security policy. No visible harm confirmed.
13. Minor: homepage lists countries in no obvious order; many tap targets are under 24 px high (34-91 per page, mostly footer text links; not judged one by one); source credit links all read "licence".

**Passed:** home, /cameras/, /saved/, /about/ had no sideways scroll or console errors; /status/, /sources/, /data/ and a guide loaded; a bad address gives a real 404; contact@ address and removal route are on /about/; denied location gives a clear message; Toronto, London, Montreal (with or without accent), I-5 and Highway 99 searches work; Enter opens the first result when there is one.

**Map weight:** the map frame reported 7.6 MB sent and 24 MB unpacked over 156 files (tiles from other hosts may count as 0). Another counter gave 150-290 MB; the two disagree, so total data use is unverified. Test on a real phone.

## Ways to learn how Argos behaves
| Route | Verdict |
|---|---|
| Owner uses it by hand (docs/argos-hands-on-checklist.md) | Best. Free, first-hand, covers the signed-in map. Whether to accept their terms is the owner's choice. Add: count free camera views before a wall or ad; try Seattle and Atlanta on both sites. |
| 3-5 friends doing the same tasks on their own | Good, free. Each decides about their terms. Ask for notes about their experience, not copies of Argos text, images or data. |
| Paid testers | Possible, not needed yet. Userbrain: a search summary says plans from about 49 USD a month; per-tester price unclear (UNVERIFIED, https://www.userbrain.com/pricing). Check that the service's rules and Argos terms allow the task; testers do not make banned automation or extraction acceptable. Needs owner payment. Better spent first on testing our site. |
| Public reviews, posts, videos | Useful leads, weak proof. Used below. Videos were not watched. |
| Ask Argos for permission | Legitimate. Low chance from a rival and it announces us (my guess). Owner's decision; nothing sent. |
| Our notes | docs/source-audits/argos-feature-inventory-2026-11-24.md is detailed; also docs/decisions/ and data/argos-maps-matrix.json. Their map itself was not seen. The 11-23/24 notes came from loading their pages; CLAUDE.md still permits "studying", which conflicts with their robots.txt and terms as recorded on 11-25. Owner/lead should reconcile that line. |

## Third-party leads (all UNVERIFIED)
Not found in the files above (word search of docs, matrix, plan):
- Prediction markets layer: https://godsviewai.com/blog/godsview-vs-argos-atlas (a competitor).
- One Trustpilot review (Nov 2026, 1 star): only one camera viewable, then asked to pay: https://www.trustpilot.com/review/argosatlas.com
- A user found coverage thin in Russia and North Africa; found it through TikTok: https://bendunn.substack.com/p/stuff-i-find-401
- A company surveillance documentary (search summary only, no page opened).

Adds detail to or conflicts with our notes:
- Company post: 5 free camera views a day without an account, or watch an ad; 90-day flight archive since 18 Sep; airport departures/arrivals; zone alerts; 30-day Pro code with no card (our notes record trials needing a card): https://www.linkedin.com/posts/argos-atlas_flight-history-is-live-on-argos-atlas-until-activity-7508250173274394624-BKCZ
- Free-account requirement for the map (godsviewai, matches our notes) versus "no account" (https://djigearportal.com/blog/argos-atlas-drone-operators-2026.html, repeating Argos statements). The same page says no face or plate recognition, 24-hour paid recordings, and a removal route.
- godsviewai lists prices in euros, VAT included; compare by hand with our dollar notes.
- OSINT post: some aircraft and ship tracks are estimates; a commenter liked AIS gap marking: https://www.linkedin.com/posts/the-osint-exchange_osint-opensourceintelligence-geoint-activity-7515340952291553282-0avV

**Still unknown:** everything behind the map sign-in, first-load experience on a phone, what a camera card really shows, when the quota or ad appears, whether pictures are current, search quality, annoyances.

## Reusable test script (phone, private window, 15 minutes; also give to a friend)
Say what you expected and what you saw. Do not help each other. For Argos, only a person does this, by hand.
1. Open the home page. In 5 seconds, say what the site is for.
2. Find a camera in your own city. Count taps and seconds. Then try Seattle and Atlanta.
3. Misspell a city. Does the site tell you what happened?
4. Tap "Cameras near me" and allow location. Is the answer sensible? Repeat with it denied.
5. Open a camera. Is the picture there and current? Can you get back?
6. Open the map. Seconds until usable? Can you see it without scrolling? Did anything pop up unasked?
7. On the map, find your city, zoom, tap a group, tap one camera, close its card.
8. Save a camera, close the browser, find it again. (A private window erases saves: use a normal one for this step.)
9. Find how to report a broken camera.
10. Name one thing that annoyed you and one reason to return.

For automated reruns on our site only: repeat findings 1-4 with the same cities, and compare per-city counts in the map feed (/api/cctv/sources on the map host) with data/camera-registry/cameras.json. That count check should become a deploy gate.
