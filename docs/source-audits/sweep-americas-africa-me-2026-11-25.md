# Sweep: Latin America, Africa, Middle East, remaining US/Canada (2026-11-25)

Method: curl with User-Agent `worldtrafficcameras-research`, 3-5 s between requests, no key, no login. VERIFIED = I queried it. UNVERIFIED = search snippet. Short round (about 35 requests). Result: no new clean, keyless, licensed live-camera feed in this region.

## Best candidate first

| # | Place | Feed | Count | Key | Licence | Picture GET | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Minnesota (MnDOT) via Carver County copy | https://gis.co.carver.mn.us/arcgis_ea/rest/services/OpenAccess/CC_Transportation/MapServer/10 (VERIFIED) | 1147 (count query). Fields: name, lat/lon, route, views__url (https://video.dot.state.mn.us/video/image/metro/C602), views__type STILL_IMAGE or WMP. lastUpdated stamps are 2017 (stale copy) | no | None for MnDOT cameras. County layer text: "1.01 Limited Warranty. The GIS Data provided by the County are made available to User subject to the following limitations and restrictions" (a county warranty clause, not a reuse grant). MnDOT disclaimer (https://www.dot.state.mn.us/information/disclaimer.html): "The user accepts the data "as is" and assumes all risks associated with its use." No reuse grant | https://video.dot.state.mn.us/video/image/metro/C602: GET 200 image/jpeg 12456 bytes, JFIF header (VERIFIED). robots.txt on that host returned 503 (no rules readable) | HOLD. Real pictures, but licence absent and the list is a county copy from 2017. Next: email MnDOT data practices (DataPractices.DOT@state.mn.us, from MnDOT policy page, UNVERIFIED address) for written permission; ask for the official feed. |

## US and Canada

| Place | What I tried | Result |
|---|---|---|
| Washington WSDOT | https://data.wsdot.wa.gov/arcgis/rest/services (200): folders Shared, EOC_TrafficEvents, Maintenance etc. | No camera layer found in Shared/EOC/Maintenance listings. WSDOT camera API needs an access code (UNVERIFIED). Already closed earlier. |
| Bellevue WA (city) | https://services1.arcgis.com/EYzEZbDhXZjURPbP/arcgis/rest/services/TrafficCameras_Public_View/FeatureServer/0 | VERIFIED 235 cameras, fields ID, Address, lat/lon, Media ("Stream"), no picture URL, no licence text. SMALL, no link per camera. Skip unless City gives a link. |
| Tallahassee-Leon County FL | https://cotinter.leoncountyfl.gov/cotinter/rest/services/Vector/COT_DriverInfoCenter_D_WM/MapServer/0 | VERIFIED 249 records, but the sample row has junk fields (CAMWEBADD "035", coordinates 2019555 for both X and Y). Data quality bad, no licence. Skip. |
| Colorado COtrip | https://data.cotrip.org/robots.txt 404; www.cotrip.org serves a JS app shell | No keyless feed found. Key page not opened. Unchanged from hunt 3. |
| Oregon TripCheck | tripcheck.com/robots.txt 404 | Closed earlier; nothing new. |
| Virginia, New Jersey | 511virginia.org/robots.txt 301; 511.nj.gov host gave no response (curl code 000) | Not opened further. UNKNOWN. |
| Massachusetts | https://www.mass.gov/service-details/highway-data-for-developers | WebFetch returned 403. STOPPED, not worked around. |
| Minnesota (official) | 511mn.org robots.txt returns a JS app shell | No official open feed found (see table above). |
| Pennsylvania | PennDOT page (search snippet): traffic camera streams governed by a separate video sharing licence agreement; access by request form | UNVERIFIED. Needs Mike. |
| Nova Scotia | https://data.novascotia.ca/api/views.json?q=traffic camera (200) | Results were unrelated maps; no camera dataset seen in the first page only. UNKNOWN. |
| Saskatchewan, Manitoba, Alberta, Ontario, NC, GA, UT, NV, AZ, MI, WI, OH | ArcGIS Hub search "traffic cameras <place>" | Only the same generic US layers returned (Carver, Bellevue, Tallahassee, Donegal, Washington County OR 798 rows UNVERIFIED). No new official layer. Key-gated ones stay in hunt 3. |

## Latin America, Africa, Middle East

| Country | What I tried | Result |
|---|---|---|
| Argentina (Buenos Aires city) | CKAN https://data.buenosaires.gob.ar/api/3/action/package_search?q=camaras+transito (200) | Dataset "camaras-fijas-control-vehicular", licence field CC-BY-2.5-AR, CSV https://cdn.buenosaires.gob.ar/datosabertos/datasets/transporte-y-obras-publicas/camaras-fijas-control-vehicular/camaras-fijas-de-control-vehicular.csv. These are vehicle enforcement cameras (locations only), not live views. Not a live camera source. Row count not fetched. |
| Argentina national | datos.gob.ar CKAN, q=camaras | Unrelated results. None. |
| Chile | datos.gob.cl CKAN, q=camaras: 3 results | Valdivia surveillance camera locations, licence cc-nc (non-commercial: not usable). No road camera feed. |
| Colombia | datos.gov.co catalog q=camaras transito: 2 results | Bogota "Camaras Salvavidas" (federated link) and a road-safety survey. No live road feed. |
| Uruguay | catalogodatos.gub.uy, q=camaras: 29 results | First 8 are parliament datasets. Not paged further. None seen. |
| Israel | data.gov.il q=traffic camera: 1 result | Enforcement cameras (A-3 programme) XLSX, not live views. None. |
| Brazil ARTESP | CKAN API base https://dadosabertos.artesp.sp.gov.br/api/3/action/ ; search found CFTV equipment-availability data and technical-spec PDFs | No public camera locations or images (search snippet, same as hunt 2). ~2,966 cameras exist (press, UNVERIFIED). Next: email ARTESP. |
| Brazil Rio | Hub search: only a "Tráfego online" web map by PrefeituraRio, no layer | None. |
| Mexico, Peru, Morocco, Egypt, UAE, Saudi, Cape Town, Johannesburg, SANRAL | Hub search for Cape Town/Johannesburg/Mexico returned only unrelated items (Cape Town industrial survey, Vigo Spain). No direct portal probe for Mexico, Peru, Morocco, Egypt, UAE, Saudi, SANRAL | **NOT DONE / UNKNOWN**: no source found, not searched deeply. |

## Not verified
- No licence sentence granting commercial reuse found for any camera feed this round.
- Count on Bellevue 235, Tallahassee 249, Carver 1147 are my own count queries; none has a licence.
- Mass.gov 403 recorded as a stop.
- Hub search returns the same generic layers for any query, so "no new layer" is weak evidence.

## Next actions
1. Email MnDOT data practices for permission (Claude may draft per project rule; log in plan.md section 9).
2. Email ARTESP and ANTT for camera locations and image terms.
3. Deeper portal-by-portal probes still to do: Mexico (CAPUFE, CDMX), SANRAL, Peru MTC, Morocco, Egypt, UAE, Saudi.
