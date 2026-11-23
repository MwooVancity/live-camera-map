# ChatGPT source hunt, 2026-11-22 (guest chat). EVERYTHING HERE IS UNVERIFIED until checked on the agency page and recorded in data/source-permissions.json.
ChatGPT itself marked several items UNVERIFIED (Colorado, Utah, Arizona, Florida, CHP) because it could not open their pages.

| Jurisdiction | ChatGPT's claim (unverified) | Key / account | Our next step |
|---|---|---|---|
| Oregon TripCheck | FAQ says businesses, private citizens and organizations may use data and images; credit "Camera courtesy of ODOT"; CCTV inventory has still-image URLs | account/registration | Verify FAQ quote. MIKE: register for the TripCheck data API |
| British Columbia DriveBC | Open511 API governed by Open Government Licence BC; HighwayCams dataset (camera page + image URL) under OGL-BC | no key found | Verify; first non-California candidate (no Mike step if no key) |
| Ontario 511 | free developer service, OGL default, developer agreement asks who redistributes | key + agreement | MIKE (already in todo) |
| New York 511NY | developer agreement allows redistribute / repackage with approval; source integrity must be kept | key + application | Verify quote. MIKE: apply |
| Caltrans CWWP2 | commercial information providers are an intended audience; public domain wording | none | done (rows exist, flagged for Mike) |
| Alberta 511 | commercial reproduction prohibited without written permission; 10 calls / 60 s | key | MIKE: written permission before any use |
| Texas DriveTexas | data "should not be sold, rebranded, redistributed"; emergency-management purpose | key + approval | EXCLUDED unless TxDOT grants written permission |
| Washington WSDOT | photo reuse criteria equal CC BY-NC-ND, no commercial gain | key/access code | Link-out only; structured data terms UNVERIFIED |
| Colorado, Utah, Arizona, Florida | terms UNVERIFIED (pages not opened by ChatGPT) | key | read each terms page ourselves |
| California CHP incidents | public web page refreshing every 60 s; no verified API or licence | none | link-out only, no scraping |
| Caltrans QuickMap speeds | speed layer uses Google Maps traffic data, not a Caltrans feed | n/a | NOT a source; use CWWP2 travel-time files if licensed |

Order ChatGPT suggested: Oregon, BC, Ontario, New York, CWWP2, then Colorado, Utah, Arizona; Washington image-restricted; Alberta and Texas blocked on permission.
Rule reminder: a feed that is free is not licensed; image rights are a separate permission from data rights (CLAUDE.md hard rule).
