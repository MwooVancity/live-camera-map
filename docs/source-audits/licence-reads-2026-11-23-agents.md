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
