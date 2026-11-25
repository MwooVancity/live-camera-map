# Sweep: Eastern Europe, Baltics, Balkans, Turkey, 2026-11-25 (plan item 33)

Method: curl (User-Agent `worldtrafficcameras-research`, one host at a time, 3 to 4 s between requests, no key, no login, no download over 5 MB, temp files in a scratch folder), WebFetch of official pages, WebSearch for leads. VERIFIED(evidence) = I opened the endpoint or page and saw it. UNVERIFIED = search snippet or small-model page summary. No gev/, Argos, data/ or research-private/ read. No 403 or bot check was hit; failures were timeouts, 404s and one 503 (recorded below, not worked around).

Result in one line: NO country in this region gave a buildable open camera list. Nothing here beats Finland, Quebec or Spain. The most useful new finding is negative and precise: Latvia's national access point has 58 datasets (VERIFIED, counted) and none is a road webcam list.

| Country | Verdict |
|---|---|
| Latvia | NONE FOUND as open data (58 NAP datasets read, no camera list; LVC map has a "Kameras" layer on an internal backend; email LVC) |
| Lithuania | NONE FOUND (eismoinfo.lt has cameras in its app, no documented feed; open-data portals unreachable) |
| Estonia | still PARKED (tarktee.ee has no robots file and no documented API; email tmc@transpordiamet.ee) |
| Turkey | BLOCKED by terms (KGM terms: no commercial use, no republishing; no camera list page found) |
| Romania | NONE FOUND (data.gov.ro unreachable from here; cnadnr.ro webcam page returned 503) |
| Serbia | NONE FOUND (data.gov.rs search "kamere" = 0 datasets) |
| Bulgaria | NONE FOUND (only a toll-system lead, unread) |
| Slovakia, Slovenia, Croatia, Greece | no change from world-hunt-2; re-tries below |
| Ukraine | not searched beyond one note (no clean open source known; skipped as the brief allows) |

## Latvia

| Source | URL | Format / count | Key | Licence | robots.txt | Verdict |
|---|---|---|---|---|---|---|
| National Access Point (NAP) catalogue | https://transportdata.gov.lv/ (React app). Sitemap https://transportdata.gov.lv/api/v1/fetch/sitemap.xml (gzip) lists 58 dataset cards. Per-dataset metadata JSON: `https://transportdata.gov.lv/api/v1/metadata/data/<card-id>` (VERIFIED, HTTP 200 JSON for all 58 ids on the sitemap that I fetched) | 58 datasets, read one by one. Camera-related: ONLY "Riga City Municipal Police Traffic enforcement cameras" (XML, publisher Rigas valstspilsetas pasvaldibas policija; enforcement cameras, not view cameras; endpoint not opened). All other LVC datasets are DATEX II V3 events, weather stations (locations XML, real-time XML), traffic counters, VMS, road network GeoJSON, charging points. No webcam list. | no (metadata read without a key; data endpoints not tested) | LVC datasets carry `field_licence_conditions` = "Creative Commons CC Zero" (VERIFIED, read for "Weather station locations" and "Real time measurements of weather stations"; other LVC rows not individually read). URL of licence text not opened. | transportdata.gov.lv/robots.txt: `User-agent: *` `Disallow: /textual` (VERIFIED) | NONE for cameras. Weather-station datasets are CC0 and could carry a camera link, but the fields were not checked. |
| LVC public map (winter/summer) | https://map.transportdata.gov.lv/public | The map's JavaScript (3.6 MB, read by grep only) has a layer named "Kameras" and a database table `kafkamessages_camera`, so cameras exist behind the map. The feed it uses is an internal backend (`/layer/layers` returned the HTML shell, not data). Not a published dataset, no licence, no documentation. | unknown | none found | map host robots.txt returned the HTML shell (no robots file) | Not built on: reverse engineering an undocumented app endpoint is not an open feed. Next action: email LVC (lvceli@lvceli.lv, the publisher address in the NAP metadata, VERIFIED) asking for the camera list as an open dataset and its licence. |
| data.gov.lv (CKAN) | https://data.gov.lv/dati/api/3/action/package_search | q=camera: 0. q=kameras: 14, all ortophoto map services (unrelated). q=ceļu kameras and q=satiksmes uzraudz: 0 (VERIFIED). | no | n/a | not tested | NONE FOUND |
| Old LVC open-data portal | https://data.lvceli.lv/opendata/EN/... | A search snippet pointed to this; every path now returns 404 (VERIFIED). The site root redirects content to lvceli.lv and the NAP. | n/a | n/a | n/a | Dead path. Aggregator claim that "TrafficVision has real-time access to the LVC camera network" is UNVERIFIED and irrelevant to licence. |

## Lithuania

| Source | URL | Format / count | Key | Licence | robots.txt | Verdict |
|---|---|---|---|---|---|---|
| Lithuanian Road Administration (LAKD) eismoinfo.lt | https://eismoinfo.lt/ (SPA). `/config.js` says `BACKEND_URL: "/eismoinfo-backend-v2"` (VERIFIED). The app has routes `cameras`, `cameras/:id`, `cameras/:id/history`, so cameras exist in the app (VERIFIED, read in the bundle). | Backend camera endpoint not found: `/eismoinfo-backend/feed/cameras` and `/eismoinfo-backend-v2/cameras` both returned 404 JSON. Count not verified. | unknown | none found | `eismoinfo.lt/robots.txt` returns the app HTML (no robots file) | NONE FOUND as a documented feed. I stopped before guessing more endpoints (undocumented API). Next action: email LAKD (Traffic Information Centre, via eismoinfo.lt contacts) for a camera list and licence. |
| Open-data portals | https://get.data.gov.lt/datasets/gov/lakd/ returned HTTP 500; https://opendata.gov.lt/robots.txt timed out (could not open, both). | n/a | n/a | n/a | n/a | UNKNOWN. Retry in a later round. |

## Estonia

| Source | URL | Format / count | Key | Licence | robots.txt | Verdict |
|---|---|---|---|---|---|---|
| Tarktee (Transpordiamet) | https://www.tarktee.ee | `tarktee.ee/robots.txt` returns a 404 JSON error from the app (VERIFIED, so no robots file). Already parked in earlier rounds. | unknown | none found | none | Still parked. avaandmed.ee CKAN path `/api/3/action/package_search` is not valid (404 wiki page), so the Estonian portal needs another API route; not found this round. Next action unchanged: email tmc@transpordiamet.ee. |

## Turkey

| Source | URL | Format / count | Key | Licence | Verdict |
|---|---|---|---|---|---|
| General Directorate of Highways (KGM) | https://www.kgm.gov.tr and its Traffic and Transport page | Home page and the traffic page list road works, traffic volume maps, annual PDF reports. No camera list, no API, no open data link (UNVERIFIED: WebFetch small-model summary of both pages). | n/a | KGM site terms (https://www.kgm.gov.tr/Sayfalar/KGM/SiteTr/Root/SiteKullanimSartlari.aspx), as returned by WebFetch (UNVERIFIED wording, small-model extract): "Ticari amaçla kullanılamaz." (cannot be used commercially) and content may not be "çoğaltılamaz, dağıtılamaz veya başka bir platformda yayımlanamaz" (copied, distributed or published on another platform). | BLOCKED by terms even if a list existed. Ads on our site count as commercial. Next action: none until KGM publishes an open licence; optional email only. Search for acikveri.gov.tr was not done (UNKNOWN). |

## Romania, Serbia, Bulgaria

| Country | What I tried | Result | Next action |
|---|---|---|---|
| Romania | WebSearch (CNAIR cameras, open data); curl data.gov.ro CKAN `package_search` (2 tries); WebFetch https://www.cnadnr.ro/ro/camere-web | Search found only the e-SIGUR speed-camera tender (400 radar cameras, not a public feed). data.gov.ro: connection timed out twice (could not open). cnadnr.ro page: HTTP 503. | Retry data.gov.ro and cnadnr.ro in a later round; if still dead, email CNAIR. |
| Serbia | WebSearch (Putevi Srbije web kamere); curl data.gov.rs `/api/1/datasets/?q=kamere` | Search: Putevi Srbije has a GIS portal and AADT counts; 56 toll-portal cameras that are enforcement-type, no webcam list. data.gov.rs: HTTP 200 JSON, total 0 (VERIFIED). | Email Putevi Srbije information centre; low priority. |
| Bulgaria | WebSearch (road cameras, Bulgaria) | Snippets (UNVERIFIED): MRRB says the toll system (bgtoll.bg, National Toll Administration) provides traffic data free of charge and "becomes one of the largest providers of free spatial data" (https://www.mrrb.bg/en/toll-system-becomes-one-of-the-largest-providers-of-free-spatial-data/). Not opened; unclear whether it includes camera images. www.api.bg refused the connection (ECONNREFUSED). | Open the MRRB page and bgtoll.bg developer area next round (UNKNOWN whether a camera dataset exists). |

## Re-tries of countries already in world-hunt-2

| Country | Result this round |
|---|---|
| Slovakia | data.gov.sk `/api/3/action/package_search` returns the SPA HTML, not CKAN JSON (VERIFIED); dopravneinfo.sk fails TLS (certificate name mismatch, SEC_E_WRONG_PRINCIPAL). Not bypassed. Status unchanged: none found. |
| Slovenia | promet.si robots.txt timed out again (could not open). DRSI list (649 rows, no coordinates) from world-hunt-2 stands. |
| Croatia | WebSearch again found no HAK licence or JSON API. Only lead: HAK uses Axis cameras, images viewable on hak.hr (UNVERIFIED, 2007 case study). A separate border-queue API exists at nakordoni.eu (not cameras; free tier requires a credit link; UNVERIFIED press item). Status unchanged: blocked, email HAK (hak@hak.hr, UNVERIFIED from app-store listing). |
| Greece | data.gov.gr `/api/v1/query/` returned a 404 HTML page; nothing new. Status unchanged. |

## Ranked next actions (best first)

1. Latvia: email LVC (lvceli@lvceli.lv) for the "Kameras" layer as a CC0 dataset. It is the only country where a camera layer demonstrably exists on an official open-data platform whose other datasets are CC0.
2. Lithuania: email LAKD for the eismoinfo.lt camera list and licence; retry get.data.gov.lt later.
3. Estonia: email tmc@transpordiamet.ee (already the standing action).
4. Bulgaria: open the MRRB toll page and bgtoll.bg developer area (cheap, not yet read).
5. Romania: retry data.gov.ro and cnadnr.ro, then email CNAIR.
6. Turkey: dropped (terms forbid commercial reuse).

## What I could not verify

- Any camera count: no country gave a list I could count. No picture URL was tested (GET or HEAD), so no stable-link check was possible anywhere.
- Latvia: whether the weather-station datasets carry camera picture links; the CC0 licence on LVC rows other than the two I read; the Riga police enforcement XML.
- Lithuania and Estonia: the real backend routes (undocumented, not guessed).
- Turkey: the terms quotes are from a WebFetch summary, not read raw.
- Romania, Lithuania portals, Slovenia promet.si: timeouts or 5xx, not blocks; retry later.
- Ukraine: not searched.
- Searches ran in English plus a few Latvian, Lithuanian, Romanian, Turkish, Serbian, Bulgarian and Croatian terms; coverage was thin in Bulgarian and Greek.
