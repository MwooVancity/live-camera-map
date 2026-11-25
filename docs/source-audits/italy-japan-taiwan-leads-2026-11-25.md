# Italy / Japan / Taiwan camera leads (read 2026-11-25)

Read-only research. Polite pace, no login, robots obeyed. VERIFIED(x) = read on that URL today; UNKNOWN = not read or not reachable. Search-engine summaries were used only to find URLs, never as evidence.

## Summary table

| # | Source | Verdict | Camera list with coordinates | Key | Count |
|---|--------|---------|------------------------------|-----|-------|
| T1 | Taiwan Highway Bureau (THB, provincial roads) CCTV, data.gov.tw 29817 | READY | Yes (XML, lon/lat, stream + snapshot URL) | none | 2,354 |
| T2 | Taiwan Freeway Bureau CCTV static v2.0, data.gov.tw 37666 | HOLD (fetch blocked from here) | Unknown | unknown | UNKNOWN |
| I1 | Autostrade per l'Italia webcams | HOLD (no terms, no list) | No public list found | none | UNKNOWN (">1,000" is third-party) |
| I2 | Italian NAP nap.mit.gov.it | HOLD (no camera datasets evidenced) | No | unknown | 0 seen |
| I3 | Autostrada dei Fiori, SATAP A4, Autovia Padana A21, SALT A15, A33 Asti-Cuneo, Concessioni del Tirreno | HOLD (page per operator, no terms, no list) | No (images only, no lat/lon in page) | none | roughly 7-13 image URLs per page (UNKNOWN exact) |
| I4 | Infoviaggiando (Autostrade Alto Adriatico, CAV, A4 BS-PD) | REJECT without written permission | Map data only, not read | none | UNKNOWN |
| I5 | ANAS (state roads) | HOLD (site unreachable from this machine) | UNKNOWN | UNKNOWN | UNKNOWN (3rd-party claims 2,534 / 6,230) |
| J1 | JARTIC road images | REJECT (paid B2B only, terms forbid) | No | contract | n/a |
| J2 | NEXCO East (Drapla live cameras) | REJECT for reuse; HOLD for link-out only | Map page, list not read | none | UNKNOWN |
| J3 | NEXCO Central | REJECT for reuse (same wording) | UNKNOWN | none | UNKNOWN |
| J4 | NEXCO West | HOLD (robots.txt returns 403, stopped) | UNKNOWN | UNKNOWN | UNKNOWN |
| J5 | MLIT Road Data Platform (xROAD) | HOLD (no camera dataset found) | UNKNOWN | UNKNOWN | UNKNOWN |

---

## 4. Taiwan

### T1. THB (Highway Bureau, MOTC) provincial-road CCTV: READY
- Dataset page: https://data.gov.tw/dataset/29817 "省道交控路側設備資料", provider 交通部公路局, licence 政府資料開放授權條款-第1版, update every 5 min (page) (VERIFIED, https://data.gov.tw/dataset/29817 and https://data.gov.tw/en/datasets/29817).
- The dataset's CSV is a pointer list (5 rows). Row 1: CCTV資料, update 1 day, "影像串流URL+文字", https://cctv-maintain.thb.gov.tw/opendataCCTVs.xml (VERIFIED, curl of the CSV at https://www.motc.gov.tw/uploaddowndoc?file=datagov/1513792612908142592.csv).
- Feed: HTTP 200 application/xml, no key, UpdateTime 2026-11-25T22:10:02+08:00, UpdateInterval 86400, 2,354 `<CCTV>` records (VERIFIED, curl https://cctv-maintain.thb.gov.tw/opendataCCTVs.xml). Each record has CCTVID, PositionLon, PositionLat, VideoStreamURL, VideoImageURL (snapshot), RoadName, RoadDirection, LocationMile, SurveillanceDescription, SubAuthorityCode. LocationType counts: 6 = 1,835; 1 = 416; 4 = 59; 2 = 42; 3 = 2 (code meanings UNKNOWN; read the TDX standard before filtering).
- robots: cctv-maintain.thb.gov.tw/robots.txt 404 (no rules); thbapp.thb.gov.tw/robots.txt 301 to 168.thb.gov.tw (not followed) (VERIFIED, curl).
- Licence page: https://data.gov.tw/license (VERIFIED, curl 200, English text). Commercial-use sentence, Article 2.1, verbatim:
  "The Data Providing Organization grants User a perpetual, worldwide, non-exclusive, irrevocable, royalty-free copyright license to reproduce, distribute, publicly transmit, publicly broadcast, publicly recite, publicly present, publicly perform, compile, adapt to the Open Data provided for any purpose, including but not limited to making all kinds of Derivative Works either as products or services."
  Attribution, Article 3.2, verbatim: "When User makes use of the Open Data and its Derivative Work, he/she must make an explicit notice of statement as attribution requested in the Exhibit below by the Data Providing Organization. If User fails to comply with the attribution requirement, the rights granted under this License shall be deemed to have been void ab initio."
  Article 4.2: the licence is compatible with CC BY 4.0.
- No conflicting statement found on the dataset page (single licence). The licence covers "Open Data provided"; the live snapshot images are served from cctv-ss02.thb.gov.tw and are listed inside the open feed (VideoImageURL), so they are part of it; whether hotlinking load is acceptable is UNKNOWN (our plan is link-out only anyway).
- Attribution to show: the Exhibit format (agency, year, dataset name/version, link to https://data.gov.tw/license). Read the Exhibit text on the licence page before shipping the credit line.
- Verdict READY. Our rule needs the owner to flip permission to `allowed` for images; the metadata + link-out can ship on this licence row.
- Next action: owner confirms; then an importer for the XML (daily refresh) and a source-permissions row quoting Article 2.1. Courtesy email (optional, not needed for the licence): THB open data contact on the dataset page (name/address not captured, UNKNOWN).

### T2. Freeway Bureau CCTV: HOLD
- https://data.gov.tw/dataset/37666 "CCTV 動態資訊(cctv_value.xml.gz)", provider 交通部高速公路局, licence 政府資料開放授權條款-第1版, marked taken down (已下架), "已整併納入「CCTV 靜態資訊」" (VERIFIED, curl https://data.gov.tw/dataset/37666).
- Its distribution points to https://www.freeway.gov.tw/Upload/DownloadFiles/CCTV 靜態資訊(v2.0).csv. That file is a 2-line pointer to https://tisvcloud.freeway.gov.tw/history/motc20/CCTV.xml (VERIFIED, curl). The CSV sits under /Upload/, which https://www.freeway.gov.tw/robots.txt disallows for User-agent * (VERIFIED); I read one small file only and stopped.
- tisvcloud.freeway.gov.tw did not connect from this machine (timeout, port 443) so the camera count and coordinates are UNKNOWN.
- Next action: retry from the owner's network or CI; if the XML lists coordinates and the same licence applies, upgrade to READY. If robots on that host disallow, email the Freeway Bureau (contact on the dataset page, UNKNOWN address) for written permission.

---

## 1. Autostrade per l'Italia (ASPI): HOLD
- Pages: https://www.autostrade.it/en/webcam (200) and https://www.autostrade.it/it/webcam (map app at https://viabilita.autostrade.it/en/viabilita/webcam, an Angular app; list/API not read) (VERIFIED, curl).
- robots: https://www.autostrade.it/robots.txt allows all except /static/procurement/ (VERIFIED). viabilita.autostrade.it/robots.txt is a 404 (no rules).
- Terms: only "© 2026 Autostrade per l'Italia Spa, All rights reserved" in the footer (VERIFIED, curl of /en/webcam). The page's "Terms and Conditions of Use" menu link goes to the MUOVY cashback terms, not webcams (VERIFIED, link href .../muovy/cashback/termini-condizioni). No webcam terms, no open dataset, no public per-camera pages found. Count: the "4,000+" in the app is UNKNOWN; "more than 1,000" is from a third-party article (https://www.sicurauto.it/news/traffico-e-viabilita/webcam-autostrada-per-controllare-la-viabilita-siti-e-app/), UNVERIFIED.
- Verdict HOLD: all-rights-reserved with no reuse grant. A link to the official webcam page needs no permission; per-camera pages with ASPI images or a copied list do.
- Next action: email ASPI customer/web contact (address on https://www.autostrade.it/en/contatti, not captured, UNKNOWN) asking: may we list your webcam locations and link each to the official page, and is a machine-readable list available. Ask the DATEX II node team as well, since ASPI is a DATEX II node (third-party claim, UNVERIFIED).

## 2. Italian NAP and regional operators

### I2. NAP (Ministero Infrastrutture): HOLD
- https://nap.mit.gov.it/ returns 200, an Angular app titled "NAP" (VERIFIED). robots.txt returns the app shell, no rules. From the app bundle strings (VERIFIED, curl of main.*.js) the catalogue is a CKAN of GTFS and NeTEx public-transport datasets by region, mode and operator ("La mappa mostra la copertura dei dataset GTFS/NeTEx"). No camera, webcam or DATEX dataset seen. Where the CKAN API lives is UNKNOWN (api/3/action on this host returns the app shell). https://dati.mit.gov.it returned HTTP 500.
- Real-time road data in Italy is described elsewhere as run by CCISS under MIT (UNVERIFIED, 2026 overview article); https://www.cciss.it redirects to a login (SSO), so stopped.
- Verdict HOLD: no camera feed evidenced. Next action: email MIT NAP desk via the contact on https://nap.mit.gov.it (UNKNOWN address) asking whether any DATEX II camera/CCTV publication exists and under what licence. Low priority.

### I3. Operator webcam pages (each is its own page; no terms page found beyond privacy)
All VERIFIED by curl 200 on 2026-11-25, robots allow all (Yoast `Disallow:` empty or uploads only; salt.it, autostrade-salt.it, autostradadelbrennero.it robots not read, UNKNOWN):
| Operator | Webcam page | Images found in page source |
|----------|-------------|-----------------------------|
| Autostrada dei Fiori A6 | https://www.autostradadeifiori.it/webcam/ | 12 distinct jpg URLs (wp-content/uploads/webcam/a6/NNN.jpg) |
| Concessioni del Tirreno A10 | https://www.concessionideltirreno.it/webcam-a10/ (A12 at /webcam-a12/, not read) | 13 |
| SATAP A4 | https://www.satapweb.it/webcam-a4/ | 12 |
| Autovia Padana A21 | https://www.autoviapadana.it/webcam/ | 8 |
| A33 Asti-Cuneo | https://www.asticuneo.it/webcam/ | 7 |
| SALT A15 | https://www.salt.it/webcam/ (redirect from /autocisa/webcam/) | 8 |
These counts are image-URL regex hits and may include non-camera images or miss lazy-loaded ones (UNVERIFIED). No latitude/longitude in any page; no terms, only /privacy/ links. Operator list came from the third-party sicurauto article, the pages themselves are verified.
- Verdict HOLD each: no licence, no coordinate list. Linking to the official page is allowed without permission. Combined camera count is small (tens), so low value versus the email cost. Next action: one email to each concessionaire's info address (UNKNOWN, take from each site's contact page) only after ASPI answers; otherwise link-out pages by hand-entered coordinates are our own data (camera location facts) with a link to the official page.
- A22 Brennero (already in our site): https://www.autobrennero.it/it/in-viaggio/webcam/ per the third-party list, not re-read here.

### I4. Infoviaggiando (Autostrade Alto Adriatico, CAV, A4 Brescia-Padova): REJECT without written permission
- https://www.infoviaggiando.it/it/webcam (200) is a map app ("Telecamere"). robots for * disallow admin paths only (VERIFIED, curl).
- Terms page https://www.infoviaggiando.it/it/disclaimer, verbatim: "Testi, foto, grafica, materiali audio e video inseriti da Società Autostrade Alto Adriatico S.p.A. nel proprio portale non potranno essere pubblicati, riscritti, commercializzati, distribuiti, radio o videotrasmessi, da parte degli utenti e dei terzi in genere, in alcun modo e sotto qualsiasi forma." and "Ne è vietata quindi ogni riproduzione, anche parziale, senza l'autorizzazione scritta di Società Autostrade Alto Adriatico S.p.A." (VERIFIED, curl).
- Next action: email Autostrade Alto Adriatico (contact on the site, address UNKNOWN) asking written permission to list locations and link out; do not use images or the map data until answered.

### I5. ANAS: HOLD (unreachable)
- https://www.stradeanas.it did not connect from this machine (curl timeout; WebFetch ECONNREFUSED to 185.121.36.88:443), so robots, camera list, terms are UNKNOWN. A search result shows ANAS PDFs "Lista Postazioni" (lat/lon, km) and "Lista Tratte" dated 2023 on stradeanas.it/sites/default/files/viabilita/doc/, but I could not open them, so whether the posts are cameras or traffic counters is UNKNOWN. Counts quoted by third parties (2,534; 6,230) are UNVERIFIED.
- Next action: retry from the owner's network/CI; open the VAI page and the two PDFs; read the site's terms; email ANAS (address UNKNOWN) if a list exists.

---

## 3. Japan

### J1. JARTIC: REJECT
- Open data page https://www.jartic.or.jp/service/opendata/ lists only traffic regulation, cross-section traffic volume, MLIT traffic volume, intersection control (VERIFIED, curl). No cameras. robots.txt 404 (no rules); /d/traffic_info/ returned 403 (stopped, not retried).
- Road images are a paid service for traffic-information businesses: https://www.jartic.or.jp/s/service/forcorporation/forcorporation02/ "道路管理者が設置した道路管理用カメラによる静止画を、提供箇所単位にJPEG形式で提供します", monthly fee, one month minimum (VERIFIED, curl).
- Terms https://www.jartic.or.jp/attention/terms/ verbatim: "当サイトのコンテンツを営利・非営利の目的を問わず、情報センターに無断で第三者に閲覧、表示、提供、転売、公衆送信をすること" and "コンテンツの複製、改変、翻訳、翻案又は二次著作物の作成をすること" are prohibited; links need no procedure but "インラインフレームを利用するなど、運営主体の誤認混同などを生じさせるような形式によりリンクし...公開することはお断りします" (VERIFIED, curl). No camera coordinate list.
- Verdict REJECT. Next action: none; do not iframe JARTIC.

### J2/J3. NEXCO East and Central
- NEXCO East Drapla live cameras: https://www.driveplaza.com/traffic/camera/ (200, map-based; list/coordinates not read). robots.txt returns a 404 page (no rules) (VERIFIED, curl). Terms https://www.driveplaza.com/site_info/usage.html Article 4 verbatim: "これを他のサイトや印刷媒体に転載したり、商用目的として利用することはできません。" (VERIFIED, curl).
- NEXCO Central site policy https://www.c-nexco.co.jp/site_policy/, verbatim: "これを他のサイトや印刷媒体に転載したりすることはできません。" ; links are free but must be identifiable as links to their site (VERIFIED, curl). robots: only /favorite.php, /emergency.php, /common_html/footer.php disallowed. I did not find the Central live-camera page itself (UNKNOWN).
- Both say service-specific guidelines may add rules; the live-camera guideline text was not found (UNKNOWN).
- Verdict REJECT for images or copied lists; link-out to the official camera page is allowed ("原則リンクフリー"). Next action: email NEXCO East customer centre (address on https://www.driveplaza.com/site_info/, UNKNOWN) asking if camera locations may be listed and linked.

### J4. NEXCO West: HOLD
- https://www.w-nexco.co.jp/robots.txt returned 403 AccessDenied (VERIFIED). Stopped per rule; terms and cameras not read.
- Next action: owner or email NEXCO West; do nothing automated.

### J5. MLIT Road Data Platform (xROAD)
- MLIT site terms https://www.mlit.go.jp/links/terms-of-use.html, verbatim: "権利表記の記載がない限り「公共データ利用規約（第1.0版）」（PDL1.0）に準拠した利用条件の下で、利用することができます。" and "国土交通省総合政策局情報政策課は、本利用ルールが適用される本コンテンツについて、利用者がCC BYに従って利用することを許諾します。" (VERIFIED, WebFetch). Logos and content with a separate stated rule are excluded.
- Road Data Platform https://www.xroad.mlit.go.jp/ opened 2025-05 with traffic counts (about 2,600 points) and ETC2.0 speeds; a CCTV dataset was not found; CCTV appears only in a planning diagram (search summary, UNVERIFIED). robots.txt returned a 404 page (no rules).
- Regional bureau live-camera pages (e.g. road-info-prvs.mlit.go.jp, robots 404) were not opened (UNKNOWN); their images may carry a separate notice.
- Verdict HOLD. Next action: open the xROAD data catalogue list and each regional bureau live-camera page and read their notices; if a camera list with coordinates is under PDL1.0/CC BY it becomes READY (MLIT is the largest Japanese camera owner). Email target if unclear: MLIT Road Bureau via https://www.mlit.go.jp/road/ inquiry form (UNKNOWN address).

## Order to act
1. T1 THB Taiwan (READY, 2,354 cameras, no key).
2. Retry T2, I5 from the owner's network; read the ANAS PDFs.
3. J5 MLIT: catalogue read (cheap, potentially thousands).
4. One ASPI email; others wait on its answer.
