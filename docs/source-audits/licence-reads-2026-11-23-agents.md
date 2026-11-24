# Licence reads by research agents, 2026-11-23 (UNVERIFIED: re-open each page before any row in data/source-permissions.json)

Read-only workflow. Quotes below are as the agents reported them; none is yet checked by Claude on the primary page.

| Feed | Agent finding | Status |
|---|---|---|
| CHP incidents (media.chp.ca.gov/sa_xml/sa.xml) | Opens, no key. No terms text found; CHP terms pages returned 403 and 500. Feed URL came from agent memory. Feed carries dispatch log text (check for personal details). | Licence UNKNOWN: disabled. Needs CHP written confirmation. |
| Caltrans CWWP2 travel times (District 3, 8, 11, 12 only) | "There is no charge for the use of this data. Please read the Conditions Of Use before using these data sets." Conditions of Use (dot.ca.gov/conditions-of-use) call site information generally public domain, third-party material excluded; nothing on CWWP, commercial use or attribution. Updates every 5 min. | Unclear, leaning yes. Same family as our Caltrans rows: next step is to compare with the existing Caltrans row text. |
| USGS earthquake GeoJSON | "USGS-authored or produced data and information are considered to be in the U.S. Public Domain." Credit requested, not required. No key. Updates every minute. | Likely clean. Re-open usgs.gov/copyrights-and-credits and the feed policy page, then add a row. |
| AirNow API | Key needed. Quote: data "are for the express purpose of reporting and forecasting the AQI." Guidelines say nothing on commercial use. | Unclear. Needs a key (owner) and written confirmation. |
| CAL FIRE incidents | No licence text; terms page not opened; first fetch 403; feed URL from a forum post, never fetched. | Licence UNKNOWN: disabled. |

Coverage stats for the research piece (agent script outside the repo, run against data/camera-registry/cameras.json, 6,332 cameras): road named 6,293 (99.4%); direction 4,283 (67.6%); 607 distinct road strings; top roads I-5 367, US-101 339, Highway 1 (BC) 227, I-15 185, I-10 153, I-80 148, SR-99 147, SR-1 113, I-210 106, Autoroute 40 99. Caveat: road naming differs per source, so rankings across sources compare different schemes. Quebec is all video, every other source all still.

## VERIFIED by Claude 2026-11-24 (page opened through a fetch agent, text matches)
USGS, https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits: "USGS-authored or produced data and information are considered to be in the U.S. Public Domain." Credit: "we ask that proper credit be given." Third-party material: "you must obtain permission from the copyright holder". The page does not mention the earthquake feeds themselves (only a link to earthquake.usgs.gov), so the feed's own policy page (earthquake.usgs.gov/earthquakes/feed/policy.php) is still to be read before a row is written. No block built: a quake list near a city only weakly serves a road-camera reader (Helpful test not yet passed).

## DECIDED 2026-11-24: Caltrans CWWP2 travel times NOT built
Live sample (https://cwwp2.dot.ca.gov/data/d12/tt/ttStatusD12.json, opened by Claude): begin and end coordinates are placeholders (0.000001 / 0.000002) and the nearby-place fields hold filler ("here", "sdf"). A segment cannot be placed on a city or road page without guessing, and only Districts 3, 8, 11 and 12 publish travel times. Shows nothing true we could attach to a page, so it fails the Helpful test. Revisit if Caltrans publishes real segment coordinates.

## Singapore traffic images (checked by Claude 2026-11-24; Singapore is a top-5 Argos country)
- Licence (https://data.gov.sg/open-data-licence, opened through a fetch agent): "worldwide, perpetual, royalty-free, non-exclusive licence", use "whether commercially or non-commercially", a conspicuous notice is required ("made available under the terms of the Singapore Open Data Licence version 1.0" plus a link to the licence). Excludes personal data and third-party rights the agency cannot license. The dataset's own page could not be opened by the agent, so the dataset-level licence row is still UNVERIFIED.
- Feed (https://api.data.gov.sg/v1/transport/traffic-images, opened by Claude, no key): returned 8 cameras at 2026-11-24 08:26 +08:00, each with a one-snapshot image URL (a new file per snapshot) and no stable per-camera page.
- DECIDED not built: 8 cameras and no stable link-out target. Revisit if the API lists more cameras or LTA publishes stable camera pages.
