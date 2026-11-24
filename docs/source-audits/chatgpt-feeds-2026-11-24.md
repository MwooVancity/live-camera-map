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
