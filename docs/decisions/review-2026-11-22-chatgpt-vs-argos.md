# ChatGPT page-by-page comparison with Argos Atlas (2026-11-22, guest chat; I pasted our page text because staging blocks bots)

## Argos facts ChatGPT says it opened (UNVERIFIED by me until I open them)
- /en/cameras/united-states-of-america/los-angeles/ : 489-493 cameras (319 still, 170 video). Count differed between crawls (493 vs 490).
- /en/cameras/united-states-of-america/california/ : 710 cameras (598 still, 112 video).
- /en/cameras/united-states-of-america/washington/ : 2,655 cameras, with an I-405 row of 99 cameras. No California I-405 page found.
- Our registry already has 3,263 California cameras (Caltrans only), so California is NOT an inventory gap; the Los Angeles page is, because we count only cameras whose nearest town is Los Angeles (54). Caltrans district 7 alone has about 487 cameras.

## ChatGPT mistakes caused by my paste (not site defects)
- "5 closures but 4 listed": the live page lists I-110 twice. "SR-134/SR-2 lack end dates": the page prints "ends no set end". Truncated forecast "Tonight: ..." was my paste.

## Real defects and fixes, in order (each must pass Line 0: "Beats Argos by: ...")
1. LA page counts only exact-town cameras. Add a "Greater <city>" list: cameras within a stated radius of the city centre (say 30 km), grouped by nearby town, with the definition printed on the page ("near X means ..."). Scope note when a road count differs between pages (LA page 8 I-405 cameras vs road page 87).
2. Contradiction on city pages: coverage block still says "Link check by us: never run yet" while health markers exist. Fix the text from the same health function.
3. Put conditions first: closures, chain controls and signs ABOVE the camera lists on city and road pages (reader first: urgency before inventory).
4. Road page: quick index at the top (northbound / southbound counts with jump links), per-camera last-checked time, and the three timestamps kept apart (feed updated, record changed, page built).
5. Health words defined on the page: reachable = official URL answers with an image; stale = server says the file is old; unavailable = it does not answer; unknown = we could not check. Do not claim a frame is fresh unless Last-Modified says so.
6. Driving-order wording: say "estimated from camera positions along the road" (not "ordered by position").
7. Cleaner camera labels ("South of Irvine Center Drive, Irvine").
8. A short "do not use while driving" notice.
Not doing: featured-camera section (would be padding without images); mass pages.
