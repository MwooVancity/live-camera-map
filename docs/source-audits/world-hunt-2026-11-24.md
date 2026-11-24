# World hunt, 2026-11-24 (Czechia, Switzerland, France, South Korea, Hungary, Poland, Indonesia, Austria)

Method: WebSearch (standard) then WebFetch of official pages, plus 3 curl calls (data.gouv.fr API, Lyon WFS, one Lyon picture HEAD, one ASFINAG HEAD), User-Agent `NearbyCams-build`, no key, no login, at most one request per second. VERIFIED = I opened the official page or endpoint and saw it. UNVERIFIED = search snippet or third party. "Could not open" = fetch failed or page gave no text. No Argos, gev/ or research-private/ read. Camera pictures: 1 HEAD request total (Lyon).

Result in one line: only France (Lyon) gave a clean, open, machine-readable list with working picture links, and it is tiny (15 cameras). The other seven countries gave no confirmed open camera list.

## France

| Source | URL | Count | Key | Licence quote + URL | Bot check | Verdict | Next action |
|---|---|---|---|---|---|---|---|
| Metropole de Lyon, "Cameras Web Criter" (city, not national) | Dataset: https://www.data.gouv.fr/datasets/cameras-web-criter-de-la-metropole-de-lyon . GeoJSON (WFS): `https://data.grandlyon.com/geoserver/metropole-de-lyon/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=metropole-de-lyon:pvo_patrimoine_voirie.pvocameracriter&outputFormat=application/json&SRSNAME=EPSG:4326` | 15 (numberMatched 15, 15 unique ids, all with point coords) VERIFIED | none | data.gouv.fr API field `license: lov2`; page shows "Licence Ouverte / Open Licence version 2.0". I could NOT read the licence text itself (PDF binary), so the commercial-use sentence is UNVERIFIED here; the licence is widely known to allow commercial reuse with attribution, but quote it before shipping. Page: https://www.data.gouv.fr/datasets/cameras-web-criter-de-la-metropole-de-lyon | No. `HEAD https://download.data.grandlyon.com/files/rdata/pvo_patrimoine_voirie.pvocameracriter/CWBR043.JPG` returned 200, `Content-Type: image/jpeg`, nginx, no challenge | BUILD NEXT (small) | Add source row; fields: `identifiant`, `nom`, `libellelong`, `url` (picture), `last_update`. Description says images refresh every minute (page text). Note: `libellelong` has broken accents (UTF-8 read as Latin-1), fix on import. Picture rights not stated separately from the dataset licence. |
| DIRNO "Camera vizir" (national road cameras, north-west) | https://www.data.gouv.fr/datasets/camera-vizir-1 | not stated; resources are shapefiles | none | "Licence Ouverte / Open Licence version 2.0" (page) | not tested (no picture URL known) | NEEDS EMAIL / unclear | Page did not say whether it holds pictures or only locations. Download the shapefile once and look for a picture or page field. Not done (no bulk download). |
| Bison Fute / DIR national traffic datasets | https://www.data.gouv.fr/datasets/626113a9e7a3010e25422e7f (traffic state), https://www.data.gouv.fr/datasets/62558686864eeafd3af07eac (events) | n/a | none for these | search snippet only: some DIR feeds need login and password (UNVERIFIED) | n/a | NOT FOUND for cameras | No national DIR picture feed found. Ask via transport.data.gouv.fr contact. |

## Czechia

| Source | URL | Count | Key | Licence quote + URL | Bot check | Verdict | Next action |
|---|---|---|---|---|---|---|---|
| RSD / NDIC national traffic information | https://www.ndic.cz/ (TLS error "self signed certificate" in fetch, could not open); https://dopravniinfo.gov.cz/ (opened, page returned only the heading "Dopravni informace") | unknown | unknown | could not read | not tested | NOT FOUND | Search snippet (UNVERIFIED) says NDIC formats are DATEX II and cameras are only a source for confirming events, not a stated output. Email NDIC/RSD to ask for camera list and image licence. |
| Prague Golemio open data API | https://operator-ict.gitlab.io/golemio/documentation/en/open-data-api/ (opened) | unknown; a GitLab issue (snippet, UNVERIFIED) lists "Traffic Cameras" as a datasource | YES, free API key by e-mail registration: "We use a JWT token / a generated API key." | Page says data "can be used further as Open Data" but names no licence | not tested | NEEDS KEY | Read https://api.golemio.cz/docs/public-openapi/ for a camera endpoint and licence. Prague stills are on the TSK site (UNVERIFIED). |

## Switzerland

| Source | URL | Count | Key | Licence quote + URL | Bot check | Verdict | Next action |
|---|---|---|---|---|---|---|---|
| ASTRA (FEDRO) traffic cameras | https://www.astra.admin.ch/en/mobility-data (snippet); opentransportdata.swiss search `?q=webcam` on data.opentransportdata.swiss: "No datasets found for webcam" (VERIFIED) | 0 found | n/a | n/a. ASTRA says Art. 57c/57d of the Road Traffic Act limit personal data processing (snippet, UNVERIFIED). ASTRA project page mentions about 60 new cameras (snippet) | not tested | NOT FOUND | Email ASTRA mobility data contact to ask if motorway camera images are public. |
| MeteoSwiss weather cameras (not road cameras) | https://opendata.swiss/en/dataset/wetterkameras (snippet only, could not open) | about 35 (snippet, UNVERIFIED) | unknown | could not read | not tested | Out of scope (weather, not traffic) | Skip unless the site adds weather cameras. |

## South Korea

| Source | URL | Count | Key | Licence quote + URL | Bot check | Verdict | Next action |
|---|---|---|---|---|---|---|---|
| National Transport Information Center (NTIC/ITS) CCTV open API | https://www.its.go.kr/opendata/openApiInfo: fetch failed `ECONNREFUSED 61.43.91.8:443` (could not open). `curl -I` to its.go.kr and openapi.its.go.kr returned nothing within 15 s (possibly geo-blocked from this network) | unknown | YES (typical: key from portal) UNVERIFIED | could not read | not tested | NEEDS KEY (and UNVERIFIED) | Retry from a Korean-reachable route is not possible here; ask Mike only if Korea matters. Search snippets showed no ITS page. |
| data.go.kr local CCTV APIs (example: Geoje city traffic info) | https://www.data.go.kr/data/3065177/openapi.do (opened, VERIFIED) | not stated | YES: "ServiceKey ... 공공데이터포털에서 받은 인증키" | "이용허락범위 제한 없음" (licence scope: no restriction). No separate commercial-use sentence. Quota not stated | not tested | NEEDS KEY (city-level, one example) | Many city CCTV APIs exist on data.go.kr, each with its own key, scope and RTMP-style video address (snippet). Pictures are video streams, not stills: poor fit for link-out. |

## Hungary

| Source | URL | Count | Key | Licence quote + URL | Bot check | Verdict | Next action |
|---|---|---|---|---|---|---|---|
| Magyar Kozut NAP portal | https://napportal.kozut.hu/ (opened; returned only the title "NAP - Kozuti kozlekedes nemzeti adathozzaferesi pontja", no catalogue text) | none found | unknown | could not read | not tested | NOT FOUND | 2019 OSM mailing list (UNVERIFIED) lists parking, charging and roadworks data, no cameras. Email Magyar Kozut to ask for camera list and terms. A commercial blog says it uses Magyar Kozut cameras (UNVERIFIED, not a licence). |

## Poland

| Source | URL | Count | Key | Licence quote + URL | Bot check | Verdict | Next action |
|---|---|---|---|---|---|---|---|
| GDDKiA KPD (national access point) | https://kpd.gddkia.gov.pl/ (opened) | not stated | registration exists ("Rejestracja" link); API not described on the page | Page states no reuse terms (only a privacy policy link) | not tested | NEEDS KEY / NEEDS EMAIL | KPD user manual (snippet, UNVERIFIED) shows a "camera point" detail view, so cameras likely exist behind registration. Register is Mike-only; ask GDDKiA for reuse terms in writing. |

## Indonesia

| Source | URL | Count | Key | Licence quote + URL | Bot check | Verdict | Next action |
|---|---|---|---|---|---|---|---|
| Kemenhub RTTMC CCTV | rttmc.dephub.go.id: `ENOTFOUND` (could not open; domain may have changed) | unknown | unknown | could not read | not tested | NOT FOUND | none verified |
| Bina Marga toll CCTV page | https://binamarga.pu.go.id/contents/cctv_tol (snippet only; says toll operators manage it; no API or licence mentioned) | online counts per segment (UNVERIFIED) | n/a | none | not tested | NOT FOUND | Skip until a licence page is found. |
| Jakarta Satu Data | https://data.jakarta.go.id/ (fetch returned binary junk, could not read) | A "CCTV location mapping" dataset is listed on a TUMI mirror (snippet, UNVERIFIED); locations, no picture links known | unknown | The mirror warns licence info may be outdated | not tested | NEEDS EMAIL | Open data.jakarta.go.id in a browser later to find the dataset and its licence. |

## Austria

| Source | URL | Count | Key | Licence quote + URL | Bot check | Verdict | Next action |
|---|---|---|---|---|---|---|---|
| ASFINAG webcams | https://www.asfinag.at/verkehrsinformation/webcams/ | app advertises 1,800+ webcams (snippet, UNVERIFIED) | n/a | could not read | YES: `HEAD` returned HTTP 403, header `server: volt-adc`, `x-volterra-location` (F5 Distributed Cloud style protection). STOPPED, not worked around. | BLOCKED (bot protection) | Email ASFINAG for a licensed feed. data.gv.at search found no ASFINAG webcam dataset (snippet, UNVERIFIED). |

## Ranking: single best next source to build

1. **Metropole de Lyon, Cameras Web Criter (France)**. The only source in this batch that I fully verified: open GeoJSON, no key, 15 cameras with coordinates, name, direction and picture URL, picture host returns `image/jpeg` with no bot check, licence listed as Licence Ouverte 2.0. Weak on size (15). Before shipping, read the LO 2.0 text and quote the commercial-use and attribution lines in data/source-permissions.json.

Nothing else in this batch beats the existing leaders (Finland 808, Quebec 683, Spain 1,980 pending DGT).

## Three caveats

1. Seven of eight countries are "not found" mostly because official pages gave no text, timed out or blocked (Korea ITS refused connection, Czech NDIC cert error, ASFINAG 403, Hungary NAP empty). That is not proof no data exists; Hungary, Poland, Czechia and Korea need a browser check or an email.
2. The Lyon licence is shown as "Licence Ouverte 2.0" by data.gouv.fr metadata, but I could not read the licence sentences, and picture-specific rights are not stated.
3. Anything labelled "snippet" (ASFINAG 1,800 cameras, KPD camera view, Golemio traffic cameras, MeteoSwiss 35 cameras) comes from search summaries and is UNVERIFIED.
