# ChatGPT feed hunt 2026-11-24 (guest chat, read to its last paragraph; every claim UNVERIFIED unless a line says Claude checked)

Asked: free, commercially usable, keyless, stable-link, machine-readable road camera feeds in the top Argos countries plus US states and Europe.

| Lead | ChatGPT said | Claude's check | Result |
|---|---|---|---|
| Transport for NSW | CC BY, GeoJSON | Already audited 2026-11-23 (`world-feed-audit-2026-11-23.md`): official API needs a key; the no-key copy was 3 days old and 0 of 15 sampled image links worked | Not building (decision stands) |
| Spain DGT | CC BY listing, about 1,932 cameras | Already audited: the DGT legal notice conflicts with the CC BY listing; email sent, no reply | Blocked on DGT |
| TfL | OGL v3.0 | Already known: free registration needed | Waits on Mike (registration) |
| Germany Autobahn GmbH | "Technically excellent": no auth, ids, coordinates, player links; licence Datenlizenz Deutschland 2.0 only from a third party | Claude called https://verkehr.autobahn.de/o/autobahn/ (112 roads) and the webcam endpoint for the first 70 roads: EVERY response has an empty `webcam` list, 0 cameras, 0 with coordinates | REFUTED for the live API today: nothing to import. Revisit only if the endpoint lists cameras again |
| Norway Statens vegvesen | NLOD, DATEX II, registration | Not opened by Claude | Registration (Mike) then licence read |
| Sweden Trafikverket | Open API, registration | Not opened | Registration (Mike) |
| Ireland TII | CC BY 4.0 default for portal datasets | Not opened; ChatGPT could not find a camera catalogue | Unknown |
| National Highways (England) | about 4,000 cameras, bespoke licence | Not opened | Bespoke paid-pathway licence: out |
| Queensland, Arizona, Virginia | key or agreement needed | Not opened | Out for now |
| Everything else (Italy, India, Japan, Netherlands, France, Czechia, Poland, Estonia, Austria, Switzerland, most US states) | "could not open" | n/a | No evidence either way |

Net result: no new buildable source. Wrong claim reported: the Autobahn API has no cameras. Next real unblockers are owner steps (TfL and Norway and Sweden registration, DGT reply).

## California city, county and port cameras (research agent 2026-11-24, UNVERIFIED by Claude beyond the agent's own opened pages)
No qualifying open-data camera list. Confirmed empty by catalog search: San Francisco (data.sf.gov, 0 results), Los Angeles (data.lacity.org, no camera dataset), San Diego (data.sandiego.gov, 124 datasets, only police body-worn cameras and traffic counts). Failed fetches, so NOT confirmed absent: Sacramento, Long Beach, San Jose (its layer is speed/red-light enforcement, not live cameras). Not checked: Oakland, Orange County, Riverside, Fresno, the ports. Result: Caltrans stays the only California camera source until a city publishes a list or is asked directly.

## Round 2, Claude, 2026-11-24 (Socrata catalog search plus a normal browser)
Method: api.us.socrata.com catalog search "traffic cameras" (free, public), then the dataset page and the owner site in a normal browser. Nothing was bypassed.
| Source | Count | Link | Licence | Verdict |
|---|---|---|---|---|
| Maryland CHART (opendata.maryland.gov hua3-qc8n) | 451 | official CHART video page per camera (chart.maryland.gov/video/video.php?feed=...) | dataset page says "The license for this dataset is unspecified"; CHART's own site answers a Cloudflare "Attention Required" bot check to the browser tool | NOT built: unknown licence and the official video pages block automated access, so our health checker would fail all 451 (same case as Quebec); revisit if CHART publishes terms or a feed we may read |
| Seattle (data.seattle.gov) | none found | n/a | n/a | no camera dataset in the catalog |
| Baton Rouge, New Orleans, Honolulu | small, mostly camera locations or enforcement cameras | not live views | not read | skipped |
