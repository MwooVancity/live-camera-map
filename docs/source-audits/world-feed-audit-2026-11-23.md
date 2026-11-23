# World feed live audit, 2026-11-23

Method: every number below comes from a live request made 2026-11-23 about 14:40 UTC with User-Agent `NearbyCams-build` (no key, no account, no cookie). Counts were computed by a script on the saved response (unique ids, finite lat/lon, link/image field present). Licence sentences were read on the official page named. Nothing was read from gev/ or argosatlas.com. ChatGPT claims are UNVERIFIED unless a row says VERIFIED here.

## Ranking (camera count x licence clarity x no key)

| Rank | Source | Unique cameras | Coords | Link/image field | Key | Licence | VERIFIED? |
|---|---|---|---|---|---|---|---|
| 1 | Finland Digitraffic weathercam | 808 stations (2,281 presets) | 808 | image URL built from preset id (docs), 808 have presets | none (header needed) | CC BY 4.0, commercial use stated | YES, licence and feed |
| 2 | Quebec MTMD Camera de circulation | 683 | 683 | 683 page links (no still-image URL) | none | CC BY 4.0 (dataset level) | YES, feed and dataset licence; link page returned 403 to curl |
| 3 | NSW Live Traffic Cameras (open copy) | 250 | 250 | 250 image URLs, but 0 of 15 sampled returned an image | none for this copy; official API needs key | CC BY 4.0, image rights not stated | PARTLY: feed and portal licence yes; images and unofficial-endpoint status no |
| 4 | Spain DGT NAP DATEX2 v3.7 | 1,980 | 1,980 | 1,980 image URLs (jpg, sample returned 200 image/jpeg) | none | Dataset page says CC Attribution, but its linked legal notice says unauthorised commercialisation infringes rights | CONFLICT, do not ship until DGT answers |
| 5 | Singapore data.gov.sg Traffic Images | 8 (feed returned only 8) | 8 | 8 image URLs | none | Open Data Licence, commercial use allowed | YES for licence; feed is tiny |

Ranking logic: Finland first (largest cleanly licensed). Quebec second. Spain has the most cameras but its licence is contradictory on the agency's own pages, so it ranks below the clean ones. Singapore is clean but 8 cameras.

## Finland, Fintraffic Digitraffic weathercam
- Command: `curl -s --compressed -A NearbyCams-build -H "Accept: application/json" -H "Digitraffic-User: NearbyCams-build" https://tie.digitraffic.fi/api/weathercam/v1/stations` -> HTTP 200, `application/json;charset=UTF-8`, 37,218 bytes. Header `Last-Modified: Mon, 23 Nov 2026 14:33:23 GMT`, `Cache-Control: max-age=60`.
- Why the lead saw 406: the service requires `Accept-Encoding: gzip`. Digitraffic instructions page (https://www.digitraffic.fi/en/support/instructions/, 200): "If compression is not allowed in the request, the service returns error code 406." Fix: `--compressed`. It also documents a `Digitraffic-User` identifying header.
- Unique camera ids: 808 (808 features). Valid coords: 808. With presets: 808 (2,281 preset images total). collectionStatus GATHERING: 807.
- Fields: id, name (e.g. `kt51_Inkoo`, road code + place), collectionStatus, dataUpdatedTime, presets[id, inCollection], state, point geometry. No separate direction field; place is inside `name`.
- Image URL: no URL in stations response. Docs (https://www.digitraffic.fi/en/road-traffic/, 200) say preset images are at a `weathercam.digitraffic.fi` URL from the preset id; `HEAD https://weathercam.digitraffic.fi/C0150301.jpg` -> 200 `image/jpeg`. We would link out only.
- Update evidence: feed `dataUpdatedTime` 2026-11-23T14:33:23Z; per-station times range 03:25Z to 12:31Z the same day (stations update at different rates).
- Samples: C01503 kt51_Inkoo; C01504 vt2_Karkkila_Korpi; C01505 kt52_Raasepori_Tenhola.
- Licence (VERIFIED, https://www.digitraffic.fi/en/terms-of-service/, HTTP 200): "Fintraffic's open data is licensed under the Creative Commons 4.0 By license. It gives the right to distribute, remix, tweak, and build upon our data, even commercially, as long as you credit the source for the original creation." Attribution example on the page: "Source: Fintraffic / digitraffic.fi, license CC 4.0 BY".
- Not verified: whether camera IMAGES are covered by the same sentence (the page speaks of "open data" generally). Link-out only makes this moot.
- Key/account: none.

## Spain, DGT NAP "Camaras DGT DATEX2 v3.7"
- Real download URL: `https://nap.dgt.es/datex2/v3/dgt/DevicePublication/camaras_datex2_v37.xml` (found via https://nap.dgt.es/dataset/camaras-dgt-datex2-v3-7, 200; directory index `https://nap.dgt.es/datex2/v3/dgt/DevicePublication/` also 200).
- Command: `curl -s -L --compressed -A NearbyCams-build <url>` -> HTTP 200, `text/xml; charset=utf-8`, 96,634 bytes. publicationTime 2026-11-23T15:00:01+01:00.
- Unique ids: 1,980 devices, all typeOfDevice camera. Coords: 1,980. Image URL (`fse:deviceUrl`): 1,980, form `https://etraffic.dgt.es/camarasEtraffic/<id>.jpg`; `GET` of id 176130 -> 200 `image/jpeg` 69,848 bytes.
- Fields: id, roadName (1,980), roadDestination, kilometerPoint, province, tpegDirectionRoad (positive/negative road direction, direction text "unknown" in all 1,980), lat/lon, lastUpdateOfDeviceInformation (2024-02-13 to 2026-11-19, that is device metadata age, not image age).
- Update frequency: ChatGPT said hourly; not shown in the data. UNVERIFIED. The file itself was published 15:00 local, about one hour before this check.
- Samples: 176130 A-62; 176131 A-62; 2 A-62.
- Coverage: dataset description (NAP page, 200): traffic information for the state road network "excepto Cataluna y Pais Vasco" (except Catalonia and the Basque Country).
- Licence, CONFLICT: the NAP dataset page shows "Licencia Creative Commons Attribution" (link http://www.opendefinition.org/licenses/cc-by, 200) and lists terms of use at https://www.dgt.es/contenido/aviso-legal/ (200). That legal notice says: "La reproduccion, distribucion, comercializacion o transformacion no autorizadas de dichas obras, a no ser que sea para uso personal y privado, constituye una infraccion de los derechos de propiedad intelectual de la Direccion General de Trafico" (unauthorised reproduction, distribution, commercialisation or transformation, other than personal private use, infringes DGT rights). The notice does not mention the open data licence. The two official pages disagree, so status = UNVERIFIED for commercial use.
- Key/account: none for the download. Mike-only: ask nap@dgt.es (listed contact) to confirm CC BY applies to commercial use of the camera dataset and the image URLs.

## Singapore, data.gov.sg Traffic Images (LTA)
- Command: `curl -s -A NearbyCams-build https://api.data.gov.sg/v1/transport/traffic-images` -> HTTP 200, `application/json`, 2,620 bytes, repeated twice (same 8 ids). The newer guess `api-open.data.gov.sg/v2/real-time/api/traffic-images` -> 404 (a wrong URL on my part, not an outage).
- Unique cameras: 8 (ids 2701, 2702, 2704, 4703, 4712, 4713, 4798, 4799). Coords 8, image URL 8 (`images.data.gov.sg/...jpg`, one `GET` returned 200 `application/octet-stream`, so content type is NOT image/jpeg: treat as unverified image). Fields: camera_id, timestamp, image, location lat/lon, image_metadata (height, width, md5). No road name or direction.
- Update evidence: snapshot timestamp 2026-11-23T22:40:20+08:00, camera timestamps one to five minutes older, so about 1 to 5 minute refresh.
- Dataset metadata (https://api-production.data.gov.sg/v2/public/api/datasets/d_6cdb6b405b25aaaacbaf7689bcc6fae0/metadata, 200): name "Traffic Images", managedBy "Land Transport Authority", lastUpdatedAt 2025-07-31. I did NOT find why only 8 cameras are returned; Singapore is known to have many more, so the old v1 endpoint may be cut down or replaced. UNVERIFIED.
- Licence (VERIFIED, https://data.gov.sg/open-data-licence, 200): "You can use, access, download, copy, distribute, transmit, modify and adapt the datasets, or any derived analyses or applications, whether commercially or non-commercially".
- Key: none needed for this call.

## Quebec, MTMD "Camera de circulation"
- Package API (`https://www.donneesquebec.ca/recherche/api/3/action/package_search?q=camera+circulation`) -> 200 `application/json`. Package `camera-de-circulation`, license_id `cc-by`, license_title "Attribution (CC-BY 4.0)", license_url https://www.donneesquebec.ca/licence/#cc-by, modified 2026-11-23T13:19Z. The 7 resources list no per-resource licence field (blank), so the dataset-level licence is the only one stated.
- Feed: `https://ws.mapserver.transports.gouv.qc.ca/swtq?service=wfs&version=2.0.0&request=getfeature&typename=ms:infos_cameras&outfile=Camera&srsname=EPSG:4326&outputformat=geojson` -> HTTP 200, `application/geo+json`, 455,994 bytes, numberMatched 683.
- Unique ids (IDEcamera): 683. Coords: 683. Link (`URL_FLUX_DONNEE`, a quebec511.info video page): 683. No still-image URL.
- Fields: IDEcamera, NumeroCamera, DescriptionLocalisationFr/En (road, direction in words and cross street, often the town in brackets), DateDebutDiffusion, NumeroRoute, NomRegionDiffusion (14 regions), border post/bridge names.
- Update evidence: DateDebutDiffusion latest 2026/11/02 (when a camera began publishing); package modified today. Image refresh rate not in the data.
- Samples: 3998 Aut. 540 (westward) at boul. Wilfrid-Hamel; 3887 Route 289 at chemin du Mont-Bleu (Pohenegamook); 4057 Route 241 at boulevard de Bromont (Bromont).
- Link target check: `GET https://www.quebec511.info/Carte/Fenetres/FenetreVideo.html?id=3998` -> 403 `text/html` to curl. Not worked around. Users' browsers may be fine; UNVERIFIED. Per CLAUDE.md, a 403 is reported, not bypassed.
- Licence (VERIFIED at the catalog, not read as a sentence): the portal's own metadata says CC-BY 4.0. I did not read the full text on the licence page beyond the id; ChatGPT's remark that some resources show licence unspecified is confirmed (all 7 blank).
- Key: none.

## NSW, Transport for NSW Live Traffic Cameras
- Official API `https://api.transport.nsw.gov.au/v1/live/cameras` -> 401 `application/json` (key required; Mike-only for that route).
- Open copy found, no key: `https://data.livetraffic.com/cameras/traffic-cam.json` -> HTTP 200, `application/json`, 146,467 bytes, `Last-Modified: Fri, 20 Nov 2026 03:57:39 GMT` (3 days old at time of check), served from CloudFront cache. Its own `rights` block: copyright "Transport for NSW", licence URL = the portal dataset page. How this URL is meant to be used (public or internal) is UNVERIFIED; it is not listed on the portal dataset page I read.
- Unique ids: 250. Coords: 250. image `href`: 250. direction: 250 (letters like W). Fields: region, title, view (sentence describing view and direction), direction, href.
- Image check: 15 evenly spaced hrefs, `GET` -> 15 of 15 returned HTTP 200 with `text/html` "Page not found ... camera image is temporarily unavailable", 0 images. Cause UNVERIFIED (user-agent, hotlink rule, or genuine outage). I did not try other headers. So camera health cannot be confirmed.
- Update frequency: not in the data; feed file 3 days old.
- Samples: 023651ee-389c-4677-978e-d39b6c24c1e7 5 Ways (Miranda); 9ca3da77-7d9c-4820-a23a-df48d4712522 Airport Drive (Mascot); d103f206-1abb-4056-bf3d-2da06e579be4 Alison Road (Randwick).
- Licence (VERIFIED, https://opendata.transport.nsw.gov.au/datalicence, 200): "Unless otherwise stated, the data on the Open Data Hub is made available under the Open Data Policy and is licensed under a Creative Commons Attribution 4.0 License." and "The Creative Commons Attribution license for the datasets allows for redistribution and reuse of a licensed work on the condition that Transport for NSW is attributed as the source." Dataset page (https://opendata.transport.nsw.gov.au/data/dataset/live-traffic-cameras, 200): "License Creative Commons Attribution". The page says "Login to download" for the API resource, so the portal route needs an account.

## What I did NOT verify
- Whether any importer works end to end; no importer was written.
- Image rights separate from data rights (all five).
- robots.txt for data.livetraffic.com (the request returned an HTML page, not a robots file).
- Quebec and Spain licence text beyond the quoted sentences; Spain's terms may have a separate open-data page I did not find.
- Singapore's full camera list (only 8 returned).
- Update intervals for Finland, Spain, Quebec images.

## Mike-only list
1. Email nap@dgt.es: does CC BY apply to commercial reuse of the camera dataset and image URLs, given the legal notice? (Blocks Spain.)
2. NSW: decide whether to register for a free Transport for NSW Open Data Hub account and API key (official route, needs login); or ask Transport for NSW if `data.livetraffic.com/cameras/traffic-cam.json` is a public feed. Neither done by Claude.
3. Singapore: ask LTA/data.gov.sg why the traffic-images feed has 8 cameras and whether a fuller feed exists (optional; low value).
4. Quebec: in a normal browser, open one quebec511.info camera link to confirm it loads for visitors (curl got 403).
5. Approve setting each source's `permissions` row to allowed (never set by Claude).
