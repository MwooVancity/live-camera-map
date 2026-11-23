# Mike-only tasks (Claude must not attempt)
- [ ] Email OpenSky for written commercial permission (ads count as commercial)
- [ ] Register Ontario 511 and Alberta 511 API keys
- [ ] Create GitHub and Cloudflare accounts
- [ ] Choose domain, site name and host
- [ ] Keyword research and the 16-20 curated page list (blocks Sessions 6 to 8)
- [ ] Decide ad placement next to third-party data
- [ ] Install Docker Desktop (needed for Session 3)
- [ ] Re-run Gemini Deep Research after Nov 21 8:01 PM (usage limit hit; it never produced a report). Paste the report into docs/research/.
- [ ] Pick host + domain for deployment (Session 5); set GEV_ALLOWED_HOSTS and GEV_EMBED_FRAME_ANCESTORS in ops/deploy/.env on the host
- [ ] Cloudflare Tunnel + DNS pointing at 127.0.0.1:8080 on the host (token stays on the host, never in git)
- [ ] After launch: set repo variable HEALTH_BASE_URL (enables .github/workflows/health.yml)
- [ ] Run workflow session5-compose once from the Actions tab and confirm green
- [ ] Confirm licence: Caltrans Lane Closure feed (caltrans-lcs). Marked allowed_per_doc from "public domain" + "no charge" + "available for integration into your application" (cwwp2.dot.ca.gov, dot.ca.gov/conditions-of-use). The text never says "commercial" either way.
- [ ] Confirm licence: Caltrans Chain Control feed (caltrans-cc), same text as above.
- [ ] Confirm licence: Caltrans Changeable Message Sign feed (caltrans-cms), same text as above.
- [ ] Confirm licence: Caltrans Road Weather (RWIS) feed (caltrans-rwis), same text as above; also units of the readings are not stated by Caltrans.
- [ ] Confirm licence: NWS forecast (nws-forecast). weather.gov/disclaimer: public domain, any lawful purpose, no implied endorsement, no modified data passed off as official; API page says open data free for any purpose.
- [ ] Confirm licence: NWS active alerts (nws-alerts), same text as above.

## Source registrations (from the ChatGPT source hunt, 2026-11-22; claims unverified until checked)
- Register for the Oregon TripCheck data API (strongest permission found: businesses may use data and images).
- Apply for 511NY developer access (agreement says redistribution allowed with approval).
- Ontario 511: register the developer key and agreement (already listed).
- Alberta 511: ask Alberta Transportation for WRITTEN permission for commercial use (terms prohibit commercial reproduction without it).
- Do not use DriveTexas (terms limit it to emergency management).
- [ ] Confirm licence: DriveBC HighwayCams camera list (drivebc-cameras) and DriveBC Open511 events (drivebc-events). Marked allowed_per_doc from the Open Government Licence - British Columbia ("including for commercial purposes", attribution required; Open511 help page says the API information is governed by it). The licence covers the LIST: whether the camera pictures themselves are covered is NOT stated, so image display/caching stay unverified and we link out. Optional: ask DriveBC whether pictures may be shown beside ads.
- [ ] Confirm licence: Fintraffic Digitraffic weather cameras, Finland (digitraffic-weathercam). Marked allowed_per_doc from the terms page sentence "Fintraffic's open data is licensed under the Creative Commons 4.0 By license ... even commercially, as long as you credit the source" (https://www.digitraffic.fi/en/terms-of-service/, read 2026-11-23). The sentence speaks of open data in general: whether the camera PICTURES are covered is not stated, so we only link out. Optional: ask Fintraffic whether pictures may be shown beside ads.
- [ ] Confirm licence: Quebec Camera de circulation, MTMD (quebec-cameras). Marked allowed_per_doc from the Donnees Quebec record (license_id cc-by, "Attribution (CC-BY 4.0)") and the licence page ("meme a des fins commerciales", credit required, read 2026-11-23). The 7 resources carry no licence of their own; pictures and video are not covered by anything we read, so link-out only.
- [ ] Quebec: open one quebec511.info camera link (for example https://www.quebec511.info/Carte/Fenetres/FenetreVideo.html?id=3998) in a normal browser and tell Claude whether it loads. Our automated request got a Cloudflare bot-check page (HTTP 403, Cf-Mitigated: challenge) on 2026-11-23; we do not work around it, never request those links, and every Quebec camera shows status unknown by design.
- [ ] Confirm licence: City of Toronto Traffic Cameras (toronto-traffic-cameras). Marked allowed_per_doc from the Open Government Licence - Toronto page (https://open.toronto.ca/open-data-licence/): "...licence to use the Information, including for commercial purposes..." with the required statement "Contains information licensed under the Open Government Licence – Toronto." Claude read the page; you confirm. Picture files are NOT confirmed as "Information" (link-out only).

## Update 2026-11-23 (Claude did these himself)
- DONE by Claude: read TfL, Calgary and NZTA terms in a browser; emailed nap@dgt.es (Spain); decided NSW = not now.
- STILL YOURS: register a free TfL developer account (needed for its licence; then Claude builds London, 889 cameras). Watch your Gmail for the DGT reply and paste it to Claude.
- [ ] Confirm licence: City of Calgary Traffic Cameras (calgary-traffic-cameras). Marked allowed_per_doc from the Open Calgary Terms of Use page (https://data.calgary.ca/stories/s/Open-Data-Terms/u45n-7awa): "...licence to use the Information, including for commercial purposes..." with the required statement "Contains information licensed under the Open Government Licence – City of Calgary." Claude read the page in a browser and the importer re-reads it each run; you confirm. Picture files are NOT confirmed as "Information" (link-out only).
