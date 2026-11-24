# GEV versus Argos Maps versus our site, merged (2026-11-24)

Built from two independent inventories: docs/source-audits/argos-feature-inventory-2026-11-24.md (about 235 rows, public pages only, own words) and docs/source-audits/gev-feature-inventory-2026-11-24.md (about 360 rows from GEV's code, 40 of 40 sampled parity rows matched), plus the live local GEV run (cameras: 7,350 served by default, about 17,950 available). Our map at /map/ IS GEV embedded unmodified, so a GEV feature is "ours" once the map host is deployed (plan item 23, Mike buys the host), except routes closed by our allowlist (plan item 22).

Key fact (VERIFIED on Argos's attributions page 2026-11-24): Argos says its 3D globe code and its particle wind layer are adapted from God's Eye View under MIT (frame governor, atmosphere, trackpad zoom, camera icon, aircraft classification, imagery sharpening, event imagery, street-level viewer). Argos's free map core is a GEV derivative.

Verdict key: EDGE we are better, PARITY same once GEV is deployed, GAP they have it and we do not (with a path), SKIP fails a test or a hard rule (reason), UNKNOWN not verified.

| # | Class | Argos Maps | GEV (code or live run) | Our site today | Verdict and reason |
|---|---|---|---|---|---|
| 1 | 3D globe | paid from DISTRICT ($79.99) | yes, Cesium, 14 UI languages, 39 layer ids | embedded map, free once host is live | EDGE: free vs paid |
| 2 | Wind, cloud, rain radar, lightning, quakes, fires, storms | free, from NOAA, RainViewer, USGS, EONET, FIRMS | wind and weather layers, cyclones, FIRMS (key), quakes in the library | via GEV once deployed | PARITY |
| 3 | Satellites, ISS, launches | free (3D models paid) | satellites layer (CelesTrak, our proxy opens it), launches (opened) | via GEV | PARITY |
| 4 | Street-level photos (Panoramax, KartaView, Mapillary) | free on cards | street-level layer, same three providers (CC BY-SA) | via GEV | PARITY |
| 5 | Camera count | 226,203 (25,317 live video), 190+ countries | 7,350 served by default, about 17,950 available, 14 countries | 9,707 now (10 sources plus NSW), Taiwan 2,354 and Iowa 1,253 queued | GAP: about 8 to 20 times fewer than Argos; path: plan items 30, 31, 33 |
| 6 | Camera pictures inside our pages | opens inside their wall with an ad and a daily quota | frames shown through GEV's own proxy | link-out only to official source | EDGE (no quota, no ad before the click, no sign-in) and a hard SKIP of embedding |
| 7 | Camera health | shows last image time on each card | none per camera history | health stamp per camera, 3-hourly, plain unknown when a host blocks checks | EDGE (published per-source freshness); parity on last-image time |
| 8 | Camera recording, 24 h archive, time-lapse | paid DISTRICT (15 cameras) and DIVISION (150) | none (screen-record friendly mode only) | none | SKIP: needs stored pictures, link-out rule |
| 9 | Videowall, TV mode (16 cameras) | paid DIVISION | none | none | SKIP: embeds pictures |
| 10 | Camera embed API for other sites | listed as a paid feature (detail unseen, INFERRED) | none | none | SKIP: embeds pictures |
| 11 | Live flights (ADS-B) | free, 15,798 now, 451 military | flights layer: OpenSky (non-commercial, stays OFF) with adsb.lol fallback (ODbL); military layer adsb.lol | via GEV; OpenSky OFF | GAP: path plan items 19, 20, 22 (adsb.lol licence for ads is UNKNOWN) |
| 12 | OFAC sanctions match on ships and aircraft | free, 1,969 vessels and 342 aircraft | not found | none | GAP, UNKNOWN value: public lists exist (US, UK, EU), HCU risk of naming vessels: decide after launch |
| 13 | Live ships (AIS) | free, 19,932 now, 36,196 tracked, dark-ship flags | AISStream layer, needs a free key, 64 fixes per ship | via GEV once key is set | GAP: key sign-up is Mike's (plan item 20) |
| 14 | Ports, straits, chokepoint traffic table (28 straits) | free; IMF PortWatch based; has a public tools page | IMF PortWatch only as a library entry, off | none | GAP: IMF PortWatch is public; a /tools/ page is possible; Helpful for a camera directory is weak: UNKNOWN |
| 15 | Frontlines, verified war events, GPS jamming, UCDP history, air-raid alerts | free on map only; no public pages | GDELT conflicts layer; GPSJAM aggregation (GNSS layer); GhostMaps (non-commercial) | via GEV, partly | SKIP for now: not camera-related, no public page ranks for them, licences mixed |
| 16 | Finance (15,583 assets), company cards, VIP people (1,594), risk zones (221), instability index | free on map; instability index appears on country pages | none by design; GEV's policy forbids person tracking | none | SKIP: no SEO page of theirs for finance, VIP or risk zones, person data and AI-drawn risk zones fail Helpful and HCU for a camera directory |
| 17 | Country pages (251) with ports, advisories, internet status, markets | yes, public SEO pages | none | country camera hubs only | GAP, partly: our country hubs list cameras; non-camera context (advisories, weather) needs licences and a reader reason: UNKNOWN |
| 18 | Public camera pages | 646 EN pages (79 country, 566 region or place), same in Spanish | none (app, not a content site) | country, region, city, road pages; noindex until go-live | GAP on volume and on Spanish; our pages carry health, roads in order, per-source credit |
| 19 | Blog | 351 EN and 353 ES posts, 6 named authors | none | guides (few) | GAP: volume; HCU risk of mass posts: only posts with real data |
| 20 | Spanish and other languages | ES and EN only | 14 UI languages | English only | GAP: Spanish pages (their second market); path: translate the camera hubs only after launch data shows demand |
| 21 | AI assistant | paid, 10,000 to 250,000 credits | chat and voice with the user's own OpenAI or Gemini key, 61 voice tools | via GEV, key-gated | PARITY if key set; our paid keys are plan item 22 d |
| 22 | Alerts (Telegram, Discord, Slack, email), geofences, daily brief | paid DISTRICT and DIVISION | none (no accounts, no email, no webhook code) | none | GAP, deferred: needs accounts or a backend, forbidden by CLAUDE.md for now; revisit after launch (commute alerts without accounts is an idea) |
| 23 | Export CSV, GeoJSON, KML | "coming soon", DIVISION and up | import only (KML, GPX, CSV import), no export | none | GAP and EDGE chance: free per-city CSV of camera lists, needs a licence read per source for redistribution (plan item 29 NEXT) |
| 24 | API and MCP | AGENCY $4,999 a month only | MCP server with 30 tools, local, free (route closed on our host, plan item 22) | none | EDGE chance: a read-only public data file per country; MCP route stays closed (security) |
| 25 | Accounts, quotas, ads | sign-in wall, daily camera quota, ad before camera, country blocks, 24 h pass, 10-year pass | none | none, no ads yet | EDGE |
| 26 | Growth engine | affiliate 20 percent forever, per-card affiliate links, creator playbook, templates, Black Friday, free plan for 10,000-follower creators, community votes | none | none | SKIP for the engine (needs accounts and payments); we ARE a possible affiliate of others (plan item 6) |
| 27 | Mobile | 2D map works on phones, globe needs a strong machine, no native app | desktop-first, phone support partial (UNVERIFIED) | phone-first site, Lighthouse 100 on four pages (lab) | EDGE for the directory; map on phone UNKNOWN |
| 28 | Data library (airports 47,927, power plants 34,936, data centres 4,072, dams 5,356, companies) | free layers | 96 library entries (power plants, datacenters 4,352, dams 706, cables 712, transit feeds 53, rail about 27 to 30) | via GEV | PARITY on some, GAP on counts; several GEV sets are non-commercial (TeleGeography, GhostMaps, volcanoes) so they stay off |
| 29 | Time and history | paid history 7 or 90 days | 64 AIS fixes, 15-minute transit history, no archive | none | SKIP (stored data) |
| 30 | Licensing of their own camera list | publishes a page naming about 25 camera owners with licences | 25 CCTV pack flags, licence column in docs | licence row per source, gate fails closed | EDGE on rigour; Argos's list is our lead list (plan item 33 round 0) |

## Counts that decide the argument
- Argos cameras 226,203 (their counter, not verified by us); GEV 7,350 served and about 17,950 available (measured locally); us 9,707 (plus 2,354 Taiwan and 1,253 Iowa queued).
- Argos public pages 2,535 URLs (EN 646 camera pages, 251 country pages, 351 posts, tools, authors); flights, ships, VIPs and risk zones have none.
- Argos languages 2; GEV 14; us 1.

## Ranked by effect on traffic and revenue, then cost (our reading, to be argued with ChatGPT)
1. Camera count: new licensed sources (items 31 to 33), biggest first.
2. Spanish camera hub pages (Argos's second market), after launch data shows demand.
3. Free per-city CSV and per-country data files (EDGE vs their paid export).
4. Country pages with non-camera context that has a licence and a reader reason.
5. Flights and ships (needs Mike's keys, adsb.lol licence for ads unknown).
6. Alerts without accounts (idea only).
SKIPPED on rules: recording, videowall, embed, finance, VIP, risk zones, growth engine needing accounts.

## Not verified (named so nothing is hidden)
Argos map internals (behind sign-in), Argos quota size and ad network, Argos's pricing tier ticks (partly inferred), GEV UI features beyond the first screen (not clicked through), GEV flights and ships layers live (keys unset on this machine: 12 keys waiting), GEV per-layer defaults, duplicates between GEV camera packs, how many GEV pictures load.
