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


---

# Second audit, 2026-11-23 about 17:20 UTC (round 2: 20 more candidates)

Method as above: User-Agent `NearbyCams-build`, `curl --compressed`, no key, no account, no cookie. Counts computed by script on the saved response. Licence sentences quoted only where I read the official page text myself; anything that came from a search snippet is marked SEARCH-ONLY (UNVERIFIED). Nothing read from gev/ or argosatlas.com. Where an official site answered with a bot challenge or 403 (nzta.govt.nz pages, michigan.gov) I stopped and did not work around it.

Scoring for the rank: VERIFIED value = real camera count x licence clarity (1.0 = licence sentence read on official page and it covers the dataset; 0.5 = official page names the licence but I could not read its terms or it does not clearly cover images; 0.25 = terms exist but restrict or are only seen second-hand; 0 = none found or conflict) x no key (0 if a key or account is needed).

## Ranking, round 2

| Rank | Source | Unique cameras | Coords | Link/image field | Key | Licence status | Score |
|---|---|---|---|---|---|---|---|
| 1 | UK TfL JamCams | 889 (810 flagged available) | 889 | 889 image URLs (jpg) + 889 video URLs (mp4); sample image 200 image/jpeg | none for this call (TfL recommends registering for rate limits) | OGL v2 linked on TfL open-data policy page; feed-specific conditions read: no cropping, no extra branding. The Transport Data Service terms page is JavaScript-only, so the terms text was NOT read | about 445 (PARTLY) |
| 2 | Toronto Traffic Cameras | 336 | 336 | 336 image URLs; sample returned 200 image/jpeg | none | "Open Government Licence - Toronto": commercial use quoted, VERIFIED | about 336 (YES) |
| 3 | Calgary Traffic Cameras | 222 | 222 | 222 image URLs; 3 of 3 sampled 200 image/jpeg, Last-Modified within seconds | none | Portal says "See Terms of Use"; licence name only from search snippet | about 111 (PARTLY) |
| 4 | NZTA Traffic cameras (trafficnz.info) | 313 | 313 | 313 relative image paths; sample 200 image/jpeg | none for the call, but NZTA terms say registration accepts API terms | terms only SEARCH-ONLY; official pages blocked curl | about 78 (UNVERIFIED) |
| 5 | Michigan MiDrive | 808 | 808 (lat/lon only inside an HTML link in a text field) | 808 image tags (HTML inside JSON); sample 200 image/jpeg after a redirect | none | NO licence or terms found; michigan.gov returned 403 | 0 (do not build) |
| 6 | Germany Autobahn API | 0 | 0 | none | none | no official licence page found | 0 (feed empty) |
| 7 | Norway Vegvesen DATEX CCTV | not counted | not counted | not counted | registration or key | NLOD named on data.norge.no | Mike-only |
| 8 | Estonia Tark Tee | not counted | not counted | not counted | unknown | not found | blocked: no official feed URL found |
| 9 | Netherlands NDW | no camera file in the real-time directory | 0 | 0 | none | n/a | 0 |
| 10 | Japan MLIT river/road cameras | not counted | not counted | not counted | unknown | PDL 1.0 general MLIT terms only; camera service terms not read | blocked: no open feed found |
| 11 to 20 | VicTraffic, Ireland TII, Czechia, Poland, Edmonton, Vancouver, MnDOT, VDOT, Georgia, Pennsylvania | 0 verified | | | see rows | | 0 |

## UK, TfL JamCams (rank 1)
- Command: `curl -s -L --compressed -A NearbyCams-build https://api.tfl.gov.uk/Place/Type/JamCam` -> HTTP 200, `application/json; charset=utf-8`, 1,144,842 bytes. Headers: `Cache-Control: public, must-revalidate, max-age=43200, s-maxage=86400`, `X-Cache: HIT` (so this endpoint can be up to a day stale; use TfL's own refresh rules).
- Unique ids: 889 of 889 entries. Coords: 889. `imageUrl`: 889, `videoUrl`: 889, `view` (compass word such as "West"): 889. `available` = "true" for 810, so 79 are flagged not available. Name field `commonName` carries road and place ("A406 Billet Upass E"). No separate road or direction field beyond `view`.
- Image check: `GET https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00865.jpg` -> 200 `image/jpeg`, 17,387 bytes, `Last-Modified: Mon, 23 Nov 2026 17:17:19 GMT` (about 2 minutes before the check). Strong health signal: image age is readable.
- Per-property `modified` date was 2026-11-20 (metadata age, not image age).
- Samples: JamCams_00002.00865 A406 Billet Upass E; JamCams_00001.02151 Romford Rd / Tennyson Rd; JamCams_00001.07450 Piccadilly Circus.
- Licence: https://tfl.gov.uk/info-for/open-data-users/open-data-policy (200) links the Open Government Licence v2 (http://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/). https://tfl.gov.uk/info-for/open-data-users/our-open-data (200) lists "Live traffic camera images (CCTV)" with: "No additional branding (all TfL CCTV images already contain TfL branding)", "You must not crop images", "Content provider TfL Traffic Operations". https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service (200) says only "These terms and conditions apply to TfL's free Transport Data Service" in the rendered text I could read; the terms body did not load without JavaScript. SEARCH-ONLY (UNVERIFIED): licence is OGL v2 with TfL amendments, attribution "Powered by TfL Open Data".
- Key: none needed for this call. Not verified: rate limits without a key, and whether the image bucket has its own terms.
- Link-out fit: images carry TfL branding and must not be cropped, which is another reason to link out and never crop or embed.
- Beats Argos by: a London page showing which of 889 cameras TfL itself flags unavailable plus image age from `Last-Modified` (unverified that Argos shows either).

## Canada, Toronto Traffic Cameras (rank 2, cleanest licence)
- Dataset package: `https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=traffic-cameras` -> 200, 11,729 bytes. `license_title` id `open-government-licence-toronto`. Dataset page https://open.toronto.ca/dataset/traffic-cameras/ (200) shows "Licence : Open Government Licence - Toronto". Package `refresh_rate` "As available", `last_refreshed` 2026-02-20 (location list), metadata modified 2026-10-29.
- Feed: `.../resource/4a568300-c7f8-496d-b150-dff6f5dc6d4f/download/traffic-camera-list-4326.geojson` -> 200. 336 features, 336 unique REC_ID, 336 point coordinates (MultiPoint, one point each). Fields: REC_ID, MAINROAD, CROSSROAD, DIRECTION1..4 (up to four compass views), IMAGEURL (live jpg), REFURL1..4 (comparison images).
- CORRECTION (checked by the build step, 2026-11-23): `https://ckan0.cf.opendata.inter.prod-toronto.ca/robots.txt` (HTTP 200) says `User-agent: *`, `Disallow: /dataset/*/resource/*/download/*` and `Allow: /api/`. The geojson download URL above is therefore Disallowed for robots; the importer reads the same 336 rows through `/api/3/action/datastore_search?resource_id=824d2986-2fe0-4513-bdfb-e37e2499e7a9&limit=1000` instead (HTTP 200, `total` 336, 253,225 bytes, geometry is a JSON string). The picture host `opendata.toronto.ca/robots.txt` answers 302 to www.toronto.ca, whose robots.txt names no /transportation/ path.
- Image check: `https://opendata.toronto.ca/transportation/tmc/rescucameraimages/CameraImages/loc8001.jpg` -> 200 `image/jpeg` 111,178 bytes, `Last-Modified` 17:21:17 GMT (current). Only 1 sampled, not all 336.
- Samples: 8001 York St / Bremner Blvd; other ids are in the geojson.
- Licence (VERIFIED, https://open.toronto.ca/open-data-licence/, 200): "The Information Provider grants you a worldwide, royalty-free, perpetual, non-exclusive licence to use the Information, including for commercial purposes, subject to the terms below." Condition: acknowledge the source and, where possible, link to the licence. Not verified: whether camera images are "Information" under this licence (the IMAGEURL is a field of the licensed dataset, so probably yes; still, link out).
- Key: none.
- Beats Argos by: up to four labelled compass views per intersection (N/E/S/W) with one source and one licence.

## Canada, Calgary Traffic Cameras (rank 3)
- Command: `curl -s -L --compressed -A NearbyCams-build "https://data.calgary.ca/resource/k7p9-kppz.json?\$limit=5000"` (Socrata; the dollar sign is escaped for the shell) -> 200. 222 rows, 222 unique image URLs, 222 coordinates. Fields: camera_url (url + description "Camera 1"), quadrant, camera_location (road / cross road), point.
- Images: 3 of 3 sampled `https://trafficcam.calgary.ca/loc0.jpg`, `loc100.jpg`, `loc101.jpg` -> 200 `image/jpeg`, Last-Modified 17:20:03 to 17:20:13 GMT (seconds old).
- Metadata (https://data.calgary.ca/api/views/metadata/v1/k7p9-kppz, 200): attribution "The City of Calgary", `dataUpdatedAt` 2026-11-23T03:50Z, `license` "See Terms of Use". Description: "These cameras are solely for traffic monitoring and not enforcement. Camera footage is not recorded."
- Licence: the Open Calgary terms page (https://data.calgary.ca/stories/s/Open-Data-Terms/u45n-7awa) is JavaScript-only; text not readable. SEARCH-ONLY (UNVERIFIED): "Open Government Licence - City of Calgary", and the City says open data may be used for any purpose subject to the Open Calgary Terms of Use. Mike-only or next step: read that page in a browser and paste the sentence.
- Key: none.

## New Zealand, NZTA traffic cameras (rank 4, UNVERIFIED licence)
- Answer to "does a no-key feed exist": yes for the call. `curl -s -L --compressed -A NearbyCams-build https://trafficnz.info/service/traffic/rest/4/cameras/all` -> 200 `application/xml`, 331,607 bytes. 313 cameras, 313 unique ids, 313 coordinates, 313 `imageUrl` (relative, e.g. `/camera/714.jpg`). Fields: description (view and place, e.g. "South along Hinds Highway from Lagmhor Rd"), direction, highway, id, lat/lon, journey/leg names.
- Image check: `https://trafficnz.info/camera/714.jpg` -> 200 `image/jpeg`, 76,791 bytes, Last-Modified 17:22:40 GMT.
- Samples: 714 SH1 Southbound; 831 SH1 Northbound; 653 SH20 Northbound.
- Terms: nzta.govt.nz pages (terms of use, traffic-cameras API page) returned an Incapsula bot-challenge stub (212 bytes) to curl; I did not work around it. SEARCH-ONLY (UNVERIFIED): the terms say registering means accepting API terms and grant "a personal, worldwide, royalty free, non-assignable and non-exclusive" licence; InfoConnect camera API described as closed to new accounts and decommissioned 1 October 2024. So the endpoint answers today but the permitted use is unconfirmed and a personal, non-assignable licence is a red flag for a public site. Do not build until someone reads the terms in a browser.

## USA, Michigan MiDrive (rank 5, no licence)
- `https://mdotjboss.state.mi.us/MiDrive/camera/list` -> 200 `application/json`, 548,748 bytes. 808 cameras, 808 unique ids (taken from the id in the image tag), 808 with lat/lon (inside an HTML "Go to" link in the `county` field), fields route, county, location, direction, image (a full HTML string with an `<img>` tag: untrusted markup, extract the URL, never inject).
- Image: `https://micamerasimages.net/thumbs/semtoc_cam_253.flv.jpg?item=1` -> a redirect then 200 `image/jpeg`, 15,397 bytes, Last-Modified 17:23:32 GMT.
- Licence: none found. `https://www.michigan.gov/mdot/travel/mi-drive` -> 403 (stopped, not bypassed). No open-data catalogue entry found. This is a private-looking JSON used by their own map, so it is NOT a documented public feed. Do not build. Mike-only: ask MDOT whether a documented, licensed feed exists.

## Germany, Autobahn API (rank 6, empty)
- `https://verkehr.autobahn.de/o/autobahn/` -> 200, lists 113 roads. I requested `.../<road>/services/webcam` for all 113 roads: 113 x HTTP 200, 0 failures, and every response was `{"webcam":[]}`. Total webcams: 0.
- Official docs/licence: `https://www.autobahn.de/api` -> 404; I did not find an official licence page. The only documentation I found is the community project bundesAPI/autobahn-api (not official) and a PC-WELT report (third party, 2022, UNVERIFIED) that the Autobahn GmbH switched webcam images off for security reasons. Consistent with the empty arrays but not proof of cause.
- Verdict: nothing to import now. Re-check monthly only if it is cheap (one request per road).

## Norway, Statens vegvesen DATEX CCTV (Mike-only)
- `https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetCCTVSiteTable/pullAsClient` -> HTTP 401, empty body: credentials required, confirmed.
- Catalogue page https://data.norge.no/en/datasets/89fd8f16-3132-443a-8117-1ba71d95d6e0/cctv (200) says: "Access may still require registration and an API key request, as long as anyone can request such registration and/or API keys." Licence listed: https://data.norge.no/nlod/no (NLOD). Version of NLOD and whether images are covered not checked.
- Mike-only: registering for access (I will not create accounts or keys).

## Estonia, Transport Administration (blocked)
- I could not find the official DATEX II endpoint or licence. https://tarktee.ee/ (200) is a JavaScript app with no readable text. The only text found is on a University of Tartu page (https://imo.ut.ee/en/smart-road-tark-tee-open-data/, 200, a third-party summary, not the agency): lists "Traffic camera images (updated every 10 minutes)" and "Locations of traffic cameras", DATEX II, contact tmc@transpordiamet.ee. No licence stated there. Mike-only (optional): email tmc@transpordiamet.ee for the endpoint and licence.

## Netherlands, NDW (0)
- `https://opendata.ndw.nu/` (200) real-time directory read in full: no camera file. `actueel_beeld.xml.gz` is the traffic-sign "current display" file, not camera images. A third-party forum post (https://data.europa.eu/dashboard/et/community/data-reusers/data-reuse/road-cameras-european-open-data-737-published-location-and-no, 200, UNVERIFIED) says the Netherlands publishes 26 camera locations with no images. Not a source.

## Japan, MLIT (blocked)
- https://www.river.go.jp/ (200) is a JavaScript app that lists "River camera" in its menu text but exposes no documented feed or terms in the HTML. https://www.river.or.jp/ (200) is the foundation site. SEARCH-ONLY (UNVERIFIED): MLIT said in 2021 that river camera images would be distributed through the 水防災オープンデータ提供サービス, and an e-Gov entry mentions paid distribution for rainfall radar. MLIT site terms say PDL 1.0 / CC BY 4.0 compatible for general content (search only). I could not confirm a free, no-key camera feed. Not built.

## Others
- Victoria (VicTraffic): no public camera feed found; data.vic.gov.au searches returned road-safety (enforcement) camera datasets only, which are not live traffic cameras and must not be used. `https://traffic.vicroads.vic.gov.au/` did not respond (curl code 000). Not built.
- Queensland (not asked, quick probe): `https://api.qldtraffic.qld.gov.au/v1/webcams` -> 401, key required (Mike-only).
- Ireland TII: `https://traffic.tii.ie/cams` and `/api/cameras` return a JavaScript app shell (HTML), not a feed. data.tii.ie is CC BY 4.0 for shapefiles and traffic counters (search-only) but I found no camera feed. Not built.
- Czechia ŘSD (NDIC) and Poland GDDKiA: no open camera feed or licence found. https://www.rsd.cz/ did not respond (curl code 000). GDDKiA has a "Punkty kamerowe" layer inside its KPD map (search-only); no open camera API found. Not built.
- Edmonton: Socrata catalogue search (domain data.edmonton.ca) returned no traffic camera dataset. Vancouver: portal search returned no camera dataset (the query filter looked unreliable, so absence is not proven). Not built.
- Minnesota: `https://511mn.org/api/v2/get/cameras` returned the site's HTML app, not a feed; no open MnDOT camera dataset found. Virginia: my guessed VDOT URL gave 404 and `data.virginiadot.org` did not respond (code 000); the Virginia 511 service is key-based (UNVERIFIED). Georgia `511ga.org/api/v2/get/cameras` -> 400 "Invalid Key"; Pennsylvania `511pa.com/api/v2/get/cameras` -> 400 "Invalid Key": both Mike-only (key). Washington skipped as instructed.

## Not verified this round
- Image rights separate from metadata rights (all rows); robots.txt for every host; rate limits.
- TfL Transport Data Service terms body; Calgary Open Calgary Terms body; NZTA terms body (all not readable without JavaScript or blocked).
- Toronto and Calgary and NZTA image health beyond 1 to 3 sampled images; TfL beyond 1 image.
- That any importer works; none written.
- Whether other roads on Michigan, Minnesota, Virginia have documented feeds under different URLs than the ones I guessed; I only tried one URL each, so those rows say "not found", never "does not exist".

## Mike-only list, round 2
1. Read in a browser and paste: TfL terms https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service (does it cover JamCams, attribution wording); Open Calgary Terms of Use https://data.calgary.ca/stories/s/Open-Data-Terms/u45n-7awa; NZTA terms https://nzta.govt.nz/traffic-and-travel-information/use-our-data/terms-of-use (my tool was blocked).
2. Norway: registration for DATEX credentials (key/account).
3. Georgia 511GA, Pennsylvania 511PA, Queensland, Minnesota 511: keys (not requested).
4. Email tmc@transpordiamet.ee (Estonia endpoint and licence); ask MDOT for a licensed Michigan feed.
5. Approve any `permissions` row for Toronto, TfL, Calgary (never set by Claude).

## Terms read in a real browser (2026-11-23, Claude in Chrome, read by Claude; cookie dialogs set to essential only)
- **Calgary VERIFIED (fully read)**: https://data.calgary.ca/stories/s/Open-Data-Terms/u45n-7awa : Open Government Licence - City of Calgary v2.1: "The Information Provider grants you a worldwide, royalty-free, perpetual, non-exclusive license to use the Information, including for commercial purposes". Attribution: "Contains information licensed under the Open Government Licence – City of Calgary." Excludes third-party rights, official logos. => BUILDABLE (222 cameras, no key).
- **TfL (read except ~240 chars of the opening conditions)**: https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service : "You are free to ... Exploit the Information commercially and non-commercially for example, by combining it with other Information, or by including it in Your own product or application". Must show "Powered by TfL Open Data" and the Ordnance Survey notice; branding guidelines; max 500 calls per minute per feed; licence applies "from the date of registration". => needs a free TfL registration (account: Mike-only). Not built yet.
- **NZTA EXCLUDED**: https://www.nzta.govt.nz/about-us/our-data-and-official-information/use-our-data/terms-of-use (the old /traffic-and-travel-information/... address is 404; the site moved): "Other than as expressly permitted in these Terms of Use, these Terms of Use do not allow you to use the Travel Information for commercial purposes." Registration required; imagery must not be displayed differently from the API. We plan ads => excluded. (18,000-character page: read the commercial/image/attribution passages, not every clause.)
- **NSW decision (Claude, owner delegated 2026-11-23)**: NOT building now. The official API needs an account/key (account creation is the owner's), and the no-key copy at data.livetraffic.com had a 3-day-old file and 0 of 15 sampled image links working, with unverified public status. Revisit only after TfL and Calgary are live.
- **Spain**: email sent to nap@dgt.es on 2026-11-23 from the owner's Gmail asking whether CC BY covers commercial reuse (EN + ES). Waiting for a reply; Spain stays blocked until it arrives.
