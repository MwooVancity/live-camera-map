# Sweep: Asia-Pacific, 2026-11-25 (plan item 33)

Method: curl with User-Agent `worldtrafficcameras-research`, a few requests a minute, one host at a time, no key, no login, no downloads over 5 MB, temp files deleted. WebSearch snippets are UNVERIFIED. Already known and not redone: Hong Kong, Taiwan, NSW built; Queensland key (401); Indonesia counts only; Singapore LTA 8 cameras with changing URLs; South Korea MOLIT 3068943 and UTIC need keys. No Argos pages opened; the upstream GEV folder was only searched read-only once for the river picture URL pattern.

Honest slip: one query to opendata.transport.vic.gov.au (`package_search?q=camera`) matched its robots.txt line `Disallow: /*?q=`. It returned 0 results; I made no further requests to that host.

## Summary, best buildable first

| # | Country | Source | Count | Verdict |
|---|---|---|---|---|
| 1 | Japan (rivers, not roads) | MLIT river cameras (river.go.jp, picture host cam.river.go.jp) | 11,307 per a third-party mirror (UNVERIFIED against MLIT) | BUILD CANDIDATE: licence is CC BY 4.0 compatible incl. commercial, picture path stable. Needs MLIT's data-delivery route for the list. River, not traffic. |
| 2 | New Zealand | NZTA trafficnz.info REST + NZTA ArcGIS layer | 313 (REST), 224 (ArcGIS) | HELD: commercial terms unreadable (bot check), email already sent |
| 3 | Tasmania | transport.tas.gov.au traffic cameras pages | 4 | SMALL, licence looks non-commercial (general site notice) |
| 4 | South Korea | data.go.kr file lists (Cheonan etc.) | not counted | NOT BUILDABLE: location lists, no stable public picture link |
| 5 | Victoria, SA, WA, NT, ACT | open data portals | 0 camera feeds | NONE FOUND |
| 6 | Malaysia, Philippines, India, Vietnam, China | searches | 0 | NONE FOUND |

## Japan

| Item | Finding |
|---|---|
| Operator | MLIT (Ministry of Land, Infrastructure, Transport and Tourism), "Kawa no bousai joho" (river disaster information) |
| Feed | No official list endpoint found. Site https://www.river.go.jp/ is a JavaScript app (HTML has no data). Third-party mirror: https://svgmap.github.io/mlit-river-cctv-data/cctv_list.csv (GET: 11,308 lines = header + 11,307 rows, matches its update_status.json total_cameras 11307, last update 2026-11-15; VERIFIED the mirror, UNVERIFIED that it equals MLIT's list). Columns: longitude, latitude, id, name, ofc_cd, sys_id, sys_cam_id, cam_kind, own_cd. The mirror is a scrape by a private user (MPL-2.0 on their code and file); it is not an MLIT licence. |
| Key | none for the mirror or for pictures |
| Licence (primary, VERIFIED, I read it) | https://www.river.go.jp/kawabou/kwb_apend/html/caution.html : "当ホームページで公開している情報（以下「コンテンツ」といいます。）は、どなたでも以下の１）～７）に従って、複製、公衆送信、翻訳・変形等の翻案等、自由に利用できます。商用利用も可能です。" The page says the rule is compatible with Creative Commons Attribution 4.0 International. Source line required: 出典：国土交通省 川の防災情報ホームページ（当該ページのURL）. The same page asks: "ツール等による定期的なデータ収集は、サーバに過度の負担がかかり...お控えいただきますようお願いいたします" and points regular collectors to a data-delivery service via a link on that page (link not followed). Caution: whether camera pictures count as "content" or carry third-party rights is not stated (UNKNOWN). |
| Commercial reuse and listing | Page says commercial use is allowed. Listing the camera list is not addressed separately. |
| Stable official link | GET https://cam.river.go.jp/cam/now/100257123.jpg = 200 image/jpeg 40,706 bytes; GET .../310497008.jpg = 200 image/jpeg 32,983 bytes (both VERIFIED; same path pattern GEV's config uses). Path is per camera id. cam.river.go.jp/robots.txt: 404 (no rules). river.go.jp/robots.txt returned the app HTML (no rules). |
| Road cameras | MLIT road live cameras are per regional bureau and office pages (https://www.mlit.go.jp/road/bosai/LIVEcamera.html lists them, from search); no CSV and no picture licence found (UNVERIFIED). NEXCO East driveplaza camera pages: no reuse licence seen; NEXCO photo library forbids alteration and redistribution (search snippet, UNVERIFIED). No prefecture CKAN camera set found. |
| Next action | Follow the data-delivery link on the caution page (or email the MLIT river bureau) to get the official camera list instead of scraping the app; ask in writing whether pictures are covered. GEV already ships 1,054 of these as river cameras. Record in source-permissions as river, not traffic. |

## New Zealand

| Item | Finding |
|---|---|
| Operator | NZ Transport Agency Waka Kotahi |
| Feed A | https://trafficnz.info/service/traffic/rest/4/cameras/all : 200 application/xml, 331,602 bytes, 313 `<camera>` records (VERIFIED, counted by me), fields id, name, description, direction, latitude, longitude, imageUrl `/camera/<id>.jpg`. No key. robots.txt 404. |
| Feed B | NZTA open data ArcGIS layer https://services.arcgis.com/CXBb7LAjgIIdcsPt/arcgis/rest/services/LiveCamerasNZTA_Public_View/FeatureServer/0 : returnCountOnly = 224 (VERIFIED). Fields id, name, direction, viewurl `http://www.trafficnz.info/camera/view/<id>`, imageurl `http://www.trafficnz.info/camera/<id>.jpg`. Item modified 2026-07-20. |
| Licence | Item licenseInfo (VERIFIED from the arcgis.com item JSON) holds only: "For access to the Traffic Cameras API and the associated documentation please send a request to Infoconnect@nzta.govt.nz". A sibling item says "Prototype only at this time". No CC licence stated on either item. The nzta.govt.nz terms page returned an Incapsula bot challenge to curl; I stopped and did not work around it. The earlier SEARCH-ONLY note of a personal, non-assignable licence stands. |
| Stable link | GET https://trafficnz.info/camera/714.jpg = 200 image/jpeg 68,657 bytes (VERIFIED). Id-based path. |
| Commercial reuse | UNKNOWN (terms unreadable). Do not build before the reply to the 2026-11-24 email. |
| Councils | Wellington City Council (general GIS data under CC BY 4.0; a "City Safety CCTV" layer of 173 per search) is a security-camera layer, UNVERIFIED, not opened, not traffic pictures. Auckland Transport and Christchurch: nothing found. |
| Next action | Wait for the NZTA reply; if none in 7 days, send a short second email naming the feed URL and our link-out-only use. |

## Australia (other than NSW and QLD)

| State | What I tried | Result |
|---|---|---|
| Victoria | discover.data.vic.gov.au CKAN search "traffic camera": 17 hits, all road-safety (speed and red-light) camera statistics and locations, CC BY, no live pictures (VERIFIED list). VicRoads open data API http://api.vicroads.vic.gov.au/ returned HTTP 403 to curl: stopped, not retried. opendata.transport.vic.gov.au camera search: 0 (see slip above). A 2014 blog (search, UNVERIFIED) says VicRoads supplies feeds to commercial customers under individual agreements. | NONE FOUND. Next: email Transport Victoria open data asking whether VicTraffic camera stills are licensed. |
| South Australia | data.sa.gov.au CKAN "traffic camera": 1 hit, SAPOL expiation (fine) data. | NONE FOUND |
| Western Australia | catalogue.data.wa.gov.au CKAN: 0 camera datasets under Main Roads WA for camera, cctv, webcam. Main Roads ArcGIS hub search returned only other jurisdictions. Search: Main Roads open data lists traffic counts and incident feeds, no cameras. | NONE FOUND |
| Tasmania | https://www.transport.tas.gov.au/managing_the_roads/traffic-cameras (GET 200; robots allow all except admin paths). 4 camera pages with per-camera URLs (argyle-davey-st, davey-st-sandy-bay-rd, railway-roundabout, tasman-bridge). GET https://www.transport.tas.gov.au/__traffic_updates/204_Tasman_Bridge.jpeg = 200 image/jpeg 88,909 bytes (VERIFIED). Licence: the footer links https://www.tas.gov.au/codi, whose copyright text I read grants users "a licence to download, print and reproduce the information for non-com..." (my extraction cut the sentence, so non-commercial, full text UNVERIFIED). Press says Greater Hobart has 134 live cameras but no list is published (news, UNVERIFIED). | SMALL (4). Commercial use unclear. Next: email Transport Tasmania for the full camera list and terms. |
| Northern Territory | data.nt.gov.au CKAN search: 0 | NONE FOUND |
| ACT | data.act.gov.au Socrata catalogue "traffic camera": only other cities' datasets (Calgary, Austin, Baton Rouge, Maryland, New Orleans) | NONE FOUND |

## South Korea (keyless sources only)

| Item | Finding |
|---|---|
| Source | data.go.kr file-data lists by city, found by search: Cheonan "traffic information CCTV" https://www.data.go.kr/data/15063717/fileData.do (page opened, 200); also Ansan, Chungju, Seoul Facilities Corp tunnels, a KOTSA hazmat list of 14,562 rows (search only, UNVERIFIED) and Jinju 5,531 rows mixed with security CCTV. |
| Cheonan facts (VERIFIED from page JSON-LD) | Licence name "이용허락범위 제한 없음" (no use restriction; https://www.data.go.kr/ugs/selectPortalPolicyView.do), modified 2026-03-10, fields CCTV id, longitude, latitude, install location name. The description warns the city streaming service auto-blocks IPs with fixed multi-connection access. Row count not obtained (the file download is a script-driven form; not attempted). |
| Stable link | None: the files are location lists with no public picture or page link. Fails the stable-link test. |
| robots.txt | data.go.kr rules read: Disallow lines listed for Googlebot only (/tcs/dss/..., /tcs/vas/ etc.); file-data page paths not among those I saw (head of file only). |
| Next action | Mike's key for MOLIT 3068943 stays the main route. The city lists need each city to name a public viewer URL per camera; email Cheonan traffic information centre. |

## No source found

| Country | What I tried | Result |
|---|---|---|
| Malaysia | Search for data.gov.my, JKR, PLUS, LLM camera feeds. data.gov.my open API lists GTFS-realtime (CC BY 4.0) and statistics, no camera dataset seen (catalogue not opened directly, UNVERIFIED). A third-party site says LLM and PLUS cameras exist and belong to the providers. | NONE FOUND. Next: email LLM and PLUS for a feed. |
| Philippines | Search: MMDA "Traffic Mirror" is a web viewer (9 cameras in 2013); no API or licence found; a commentary raises the Data Privacy Act (secondary). | NONE FOUND |
| India | Search: Bengaluru CCTV locations on OpenCity are crowdsourced OSM KML (locations only); no official live camera API for Delhi, Pune or Bengaluru. data.gov.in not opened. | NONE FOUND |
| Vietnam | Search in English and Vietnamese: only computer-vision datasets. | NONE FOUND |
| China | Search: no official open expressway camera catalogue; provincial viewers only. | NONE FOUND, defer |
| Thailand, Indonesia, Singapore, Hong Kong, Taiwan | Not redone (see earlier audits). | skipped |

## What I could not verify

- Japan: that the mirror's 11,307 rows equal MLIT's list; whether river pictures carry third-party rights; the terms of MLIT's delivery service (link on the caution page not followed).
- New Zealand: the actual NZTA terms text (bot challenge); why the ArcGIS layer holds 224 and the REST feed 313.
- Tasmania: the full copyright sentence, and any camera count beyond 4.
- Korea: row counts and any picture link in the city files.
- Victoria: the API answered 403, so I never saw its dataset list. Malaysia data.gov.my and India data.gov.in catalogues were not opened.
