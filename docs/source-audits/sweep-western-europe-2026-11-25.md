# Sweep, Western Europe (plan item 33), run 2026-11-24 evening, filed 2026-11-25

Countries: Germany, Netherlands, Belgium, France, Portugal, Ireland, Norway, Sweden, Denmark.
Method: curl with User-Agent `worldtrafficcameras-research`, one host at a time, 2 to 4 seconds between requests, no login, no key sign-up, no file over 5 MB, temp files in the session scratchpad. CKAN, udata, Opendatasoft and OGC API endpoints plus WebSearch (standard). VERIFIED(evidence) = I fetched it myself and name the response. UNVERIFIED = search snippet or third party. No 403 or bot check hit on any host I called. One HTTP 429 (metaver.de, Hamburg metadata catalogue) after one request: I stopped there and did not retry. Two hosts refused connections from this machine (gdk.gdi-de.org port 443 timed out, then ECONNREFUSED; www.govdata.de timed out): recorded as "could not open", not worked around. No Argos, gev/, data/, plan.md or site/ touched.

One line result: the only new open list I could count is Hamburg (18 cameras, OGC API, no key, but locations only, no picture link in the records, licence not read on a primary page). Norway is the biggest official source (NLOD sentence read) but needs a Statens vegvesen DATEX account. Everything else: no source found, with what I tried.

## Ranked, best buildable first

| # | Country | Source | Count | Key | Licence | Verdict |
|---|---|---|---|---|---|---|
| 1 | Norway | Statens vegvesen DATEX II webcam (CCTV site table + updates) | not counted (needs account) | YES: "Man må bestille tilgang til statens vegvesen sin DATEX node" | NLOD, sentence read | OWNER STEP: request DATEX access, then count and build |
| 2 | Sweden | Trafikverket open API, object Camera | not counted (needs key) | YES, anonymous POST returned `Invalid authentication` | CC0 per earlier audit (text still unread) | OWNER STEP: free key (already in plan) |
| 3 | Germany | Hamburg Verkehrskameras OGC API | 18 (VERIFIED) | no | dl-de/by-2-0 from a search snippet only (UNVERIFIED) | SMALL: 18 locations, no picture link, "Livestream" only |
| 4 | Ireland | Dublin City "Traffic Poles with CCTV" | 241 poles (dataset text, CSV not downloaded) | no | CC-BY-4.0 (CKAN field, VERIFIED) | NOT USABLE: poles of a surveillance network, no public pictures |
| 5 | France, Belgium, Netherlands, Portugal, Denmark | national road agency camera feed | 0 | n/a | n/a | NONE FOUND (see tables) |

## Germany

| Source | Feed URL | Format | Count | Key | Licence | Commercial and listing | Stable official link per camera | Next action |
|---|---|---|---|---|---|---|---|---|
| Autobahn GmbH Autobahn API | https://verkehr.autobahn.de/o/autobahn/{road}/services/webcam | JSON | 0. Re-tested 2026-11-24: A1, A7, A3, A9 each returned `{"webcam":[]}` (VERIFIED). Earlier audit: all 113 roads empty. | no | none found (https://verkehr.autobahn.de/robots.txt returned 404, no licence page) | unknown | none | Drop. Re-check only if Autobahn GmbH announces webcams again. |
| Hamburg Verkehrsleitzentrale "Verkehrskameras Hamburg" | https://api.hamburg.de/datasets/v1/verkehrskameras/collections/verkehr_kameras_internet/items?f=json | GeoJSON (OGC API Features, EPSG:25832 storage, CRS84 output) | 18 (numberMatched 18, VERIFIED). Properties only `lage` (e.g. "A1 AK Hamburg-Süd") and `anmerkung`. NO image URL, NO page URL. | no | Snippet from the geodata catalogue (gdk.gdi-de.org record 1d81bc30-a4cf-438f-8b9d-a9a574b1e43b, could not open): "Datenlizenz Deutschland Namensnennung 2.0", source "Behörde für Verkehr und Mobilitätswende" (UNVERIFIED). The API landing page has no licence field (VERIFIED by reading it). | UNKNOWN until the licence text is read; dl-de/by-2.0 normally allows commercial use with attribution | none in the data. Dataset description says: "die dazugehörigen Kamerabilder im Livestream", transmission "gelegentlich aus Datenschutzgründen ... unterbunden" (VERIFIED, API text). No stream URL is given in the records. | Email Hamburg (Behörde für Verkehr und Mobilitätswende / LGV) for the stream or page URL per camera and the licence page. Until then 18 points without a link is thin; do not build. robots.txt: api.hamburg.de allows all except `User-agent: spatineo` (VERIFIED). |
| Berlin VIZ, Straßen.NRW, Verkehrsinfo BW, Bavaria, Mobilithek | not found | | 0 | | | | | One search each, found only detector-count data (Berlin) and academic papers (DLR notes about 500,000 open webcam scenes, not an official list). Mobilithek robots.txt returned an HTML app page, no robots file (VERIFIED). Mobilithek, govdata.de and the German geodata catalogue were not searchable by API from here (govdata.de timed out). Next: search the Mobilithek catalogue in a real browser for "Webcam" and "Kamera". |

## Netherlands

| Source | Feed URL | Format | Count | Key | Licence | Commercial and listing | Stable link | Next action |
|---|---|---|---|---|---|---|---|---|
| NDW opendata | https://opendata.ndw.nu/ | directory | 0 cameras (earlier audit read the whole real-time directory: no camera file) | no | n/a | n/a | n/a | none |
| Rijkswaterstaat | Google Earth file "Cameralocaties Nederland.kmz" on open.rijkswaterstaat.nl (snippet) | KMZ, dated 2017 | not opened | no | "Hergebruik mag meestal zonder bronvermelding" (snippet, UNVERIFIED) | locations only, 2017, includes manual counts | no pictures | Skip: stale, no pictures. Privacy statement (snippet): cameras are only "live gestreamd naar de verkeerscentrale(s)", not published. |
| data.overheid.nl CKAN | https://data.overheid.nl/data/api/3/action/package_search?q=verkeerscamera | JSON | 0 results for "verkeerscamera" and for "webcam" (VERIFIED, count 0 both) | no | | | | none |

## Belgium

| Source | Feed URL | Format | Count | Key | Licence | Commercial and listing | Stable link | Next action |
|---|---|---|---|---|---|---|---|---|
| Flanders Traffic Centre (Verkeerscentrum / VDV portal) | https://www.vlaanderen.be/DataCatalogRecord/8af79acb-d6e2-39fb-be07-65f873dcd453 (DATEX2 feed, catalogue snippet) | DATEX2 | 0 cameras. Snippet: feed is traffic data, "created for internal use", no fitness guarantee (UNVERIFIED). A May 2026 article says a Flemish Traffic Data Portal now opens highway data (https://newmobility.news/en/2026/05/07/flemish-traffic-center-makes-its-data-publicly-available/, UNVERIFIED, not opened). | unknown | n/a | n/a | n/a | Email the Verkeerscentrum to ask for a camera list. |
| Wallonia SPW Mobilité (cameras on motorways) | none found | | 0 | | An ODbL French translation is published by SPW Mobilité (https://mobilite.wallonie.be/files/ODbL-fr.pdf, snippet), but no camera dataset linked to it was found | | | One search only (Walloon motorway cameras, press says about 100 planned, 104 ANPR cameras at 51 sites in the 2024 report: these are enforcement cameras, not public pictures, UNVERIFIED). Next: look at metawal.wallonie.be in a browser. |
| Ghent, Antwerp open data | https://data.stad.gent/api/explore/v2.1/catalog/datasets?q=camera | Opendatasoft JSON | search "camera" returned 317 loosely matched datasets, the first ten were bike counters and points of interest (VERIFIED); no traffic camera dataset seen in those ten. Antwerp portal URL I guessed returned 404. | no | "Modellicentie Gratis Hergebruik" on the Ghent rows | | | Low value, not pursued. |

## France

| Source | Feed URL | Format | Count | Key | Licence | Commercial and listing | Stable link | Next action |
|---|---|---|---|---|---|---|---|---|
| Bison Futé / DIRs | https://www.bison-fute.gouv.fr/ | DATEX II | 0 cameras. Earlier audit read three pages, no word "camera" (docs/source-audits/france-bison-fute-2026-11-24.md). | no | own re-use licence | n/a | n/a | Email Bison Futé (already queued in that file). |
| data.gouv.fr API search "webcam" | https://www.data.gouv.fr/api/1/datasets/?q=webcam | udata JSON | total 3 (VERIFIED), all local: Orléans Métropole (dataset om-webcam-dispositif, CSV/JSON/GeoJSON, last modified 2024-05-17; records endpoint HTTP 200, rows not counted), Anglet beach webcam locations (not road), Loire-Atlantique Saint-Nazaire bridge and Loire ferry queue webcams | no | all three labelled `lov2` (Licence Ouverte 2.0) in the udata metadata (label only, text unread) | likely yes (Licence Ouverte permits reuse incl. commercial; text not read here) | Loire-Atlantique: 5 records (VERIFIED, total_count 5), each a stored JPEG file (psn.jpg, indre1, indre2, coueron1, coueron2) on data.loire-atlantique.fr, dataset dated 2018-12-04, no coordinates in the record. Orléans: not tested. | Orléans: read the rows and licence page and check what a webcam record links to (not done). Loire-Atlantique: 5 rows with no coordinates and a 2018 date: do not build. |
| data.gouv.fr search "caméras routières", "cameras circulation" | same | | total 0 each (VERIFIED) | | | | | none |

## Portugal

| Source | Feed URL | Format | Count | Key | Licence | Commercial and listing | Stable link | Next action |
|---|---|---|---|---|---|---|---|---|
| dados.gov.pt | https://dados.gov.pt/api/1/datasets/?q=cameras | udata JSON | "cameras", "webcam" and "câmaras trânsito" returned 0 (VERIFIED). "camaras" returned 179 results, the first 15 were INE statistics about "câmaras municipais" (town councils), not cameras. | no | cc-by on the INE rows only | | | none |
| Infraestruturas de Portugal, Brisa, Lisbon | https://www.infraestruturasdeportugal.pt/pt-pt/acesso-gratuito-dados-digitais-das-infraestruturas-rodoferroviarias | page (snippet only) | 0. IP says its digital datasets are free and listed on dados.gov.pt, no camera data mentioned (UNVERIFIED). | | | | | NONE FOUND. Email IP (Gabinete de dados) to ask whether a camera list exists. |

## Ireland

| Source | Feed URL | Format | Count | Key | Licence | Commercial and listing | Stable link | Next action |
|---|---|---|---|---|---|---|---|---|
| TII traffic.tii.ie | https://traffic.tii.ie/cams (earlier audit: JavaScript shell) | none | 0 | | data.tii.ie shapefiles and counters are CC BY 4.0 (snippet), no camera feed named | | | A data.gov.ie request "Traffic Data API" was sent to TII on 2025-10-06 (snippet, UNVERIFIED, outcome unknown). Email opendata@tii.ie (address from the data.gov.ie listing, snippet) to ask for a camera list. |
| Dublin City Council "Traffic Poles with CCTV DCC" | https://data.gov.ie/api/3/action/package_search?q=traffic+cameras+dublin+OR+cctv | CSV/GeoJSON/KML/WMS on data.smartdublin.ie | 241 (dataset text: "Location of 241 CCTV traffic poles"; files not downloaded). Fields: Road_1, latitude, longitude only. File date in the name 2022-11-30. | no | CKAN field `CC-BY-4.0` (VERIFIED) | locations allowed, but these are police/council surveillance poles, not public cameras | no picture | Do not list: no public picture exists. The older "Dublin City Council Traffic Cameras" dataset (id 1fade90c-...) returned 404 on package_show, and a community note says it was not updated for 2 years (snippet). |
| data.gov.ie search | https://data.gov.ie/api/3/action/package_search?q=camera | CKAN | 59 results, none a road camera feed (marine, wildlife, footfall) | | | | | none |

## Norway

| Source | Feed URL | Format | Count | Key | Licence | Commercial and listing | Stable link | Next action |
|---|---|---|---|---|---|---|---|---|
| Statens vegvesen DATEX II webcam publication | https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetCCTVSiteTable/pullsnapshotdata (locations) and .../GetCCTVStatus/pullsnapshotdata (status); updates (images) at the same host, listed on https://data.norge.no/en/datasets/89fd8f16-3132-443a-8117-1ba71d95d6e0 | DATEX II XML (also SOAP, WFS, WMS per the catalogue) | not counted. Earlier audit: GetCCTVSiteTable returned 401 with empty body. Catalogue: "You have to request a user account before you connect to the endpoint." (VERIFIED, data.norge.no page) | YES, request a user account (Mike-only). Catalogue record in the Statens vegvesen CKAN (https://dataut.vegvesen.no/api/3/action/package_search?q=webkamera, 8 results, VERIFIED): "Man må bestille tilgang til statens vegvesen sin DATEX node før man kan kople seg på publikasjonen." Contact in search result: webkamera@vegvesen.no (UNVERIFIED) | Norsk lisens for offentlig data (NLOD) 2.0, CKAN `license_url` https://data.norge.no/nlod/no. Sentence read at https://data.norge.no/nlod/en/2.0 : "This licence grants you the right to copy, use and distribute information, provided you acknowledge the contributors and comply with the terms and conditions stipulated in this licence." (VERIFIED) | Copy, use and distribute with attribution: commercial reuse and listing a camera list look allowed (the sentence has no non-commercial limit), but the rest of the NLOD text was not read in full, so label UNVERIFIED for the full terms | Unknown until the account exists. Statens vegvesen says a camera "iblant vere ute av drift i nokre dagar eller vise eit gamalt bilete" (search result, UNVERIFIED). | Mike: request DATEX access (https://www.vegvesen.no/fag/teknologi/apne-data/slik-far-du-tilgang-til-et-api/). Then count the site table, test one picture URL with GET, read the rest of NLOD, add the source row. The SPA at https://webkamera.atlas.vegvesen.no/ is a JavaScript app that returned HTML for guessed `/public/webkamera/v1/...` paths: I did not look inside the app (viewer, not an API). |

robots.txt of www.vegvesen.no: disallows /_services/portal/, /s/, /globalassets/ and similar, not the data pages (VERIFIED).

## Sweden

| Source | Feed URL | Format | Count | Key | Licence | Commercial and listing | Stable link | Next action |
|---|---|---|---|---|---|---|---|---|
| Trafikverket open API, object Camera | https://api.trafikinfo.trafikverket.se/v2/data.json (POST XML) | XML request, JSON response | not counted. An anonymous POST with an empty key returned HTTP 401 `{"ERROR":{"SOURCE":"Security","MESSAGE":"Invalid authentication"}}` (VERIFIED). | YES, free Trafikverket account (Mike-only) | CC0 link on the API page per docs/source-audits/world-hunt-2-2026-11-24.md (licence text itself still unread) | CC0 would allow everything; UNVERIFIED for the Camera dataset | unknown, needs key | Already a plan item: Mike signs up, then count, test one PhotoUrl with GET, read CC0 text. api.trafikinfo.trafikverket.se/robots.txt returned HTTP 302 (not followed, nothing read). |

## Denmark

| Source | Feed URL | Format | Count | Key | Licence | Commercial and listing | Stable link | Next action |
|---|---|---|---|---|---|---|---|---|
| Vejdirektoratet, national portal | none found | | 0 | | | | | NONE FOUND. One English-plus-Danish WebSearch returned only Norwegian pages. https://portal.opendata.dk/api/3/action/package_search?q=kamera returned 2 results, both Aarhus (a library door counter and its opening-hours data, CC-BY-4.0), no road cameras (VERIFIED). www.opendata.dk API path returned 404 (wrong host). Earlier ChatGPT audit says Denmark reported a fee in an old study (UNVERIFIED). Next: email Vejdirektoratet (trafikinformation) asking for a camera list and terms. |

## What I did not read or verify

- The Hamburg licence on a primary page (catalogue hosts refused the connection; metaver.de gave HTTP 429 after one request and I stopped). Whether the Hamburg stream is public and where, not found.
- The full NLOD text beyond the "right to copy, use and distribute" sentence, and the CC0 text for Sweden.
- Any count for Norway and Sweden (both key-gated). No picture was tested for any source: none gave a picture URL I could GET (Hamburg has none, Dublin is poles, Loire-Atlantique files are 2018 snapshots, not tested).
- Orléans webcam rows (HTTP 200 on the records endpoint, contents not read).
- Wallonia, Flanders, Mobilithek, German state portals, Portuguese city portals, Vejdirektoratet: thin (search only, or one API probe).
- "None found" means a search and one API probe came back empty, not that no data exists.

## Next actions

1. Mike: request the Statens vegvesen DATEX user account (biggest official source in this region, NLOD).
2. Mike: Trafikverket key (already in plan).
3. Email, Claude may send per project rule (log in plan.md section 9, not done here): Hamburg Verkehrsleitzentrale (picture URL and licence), Flanders Verkeerscentrum, TII (opendata@tii.ie, from a snippet), Infraestruturas de Portugal, Vejdirektoratet.
4. Browser step: Mobilithek catalogue search "Webcam" and Wallonia metawal search.
