# Argos Atlas feature inventory, 2026-11-24

Method: public pages only, read in a normal Chrome tab (own tab, no sign-in, no account), one page at a time, about 5 s apart. Own words, nothing copied. Confidence: VERIFIED = seen on a page I opened; INFERRED = deduced or only hinted. Pages opened: robots.txt, sitemap.xml, /en/ (home), /en/pricing/, /en/fuentes-y-metodologia/, /en/tools/, /en/tools/chokepoint-traffic/, /en/cameras/united-states-of-america/florida/, /en/country/united-arab-emirates/, /en/terms/, /en/affiliates/, /en/sobre/, /en/misiones/, /map/ (sign-in wall only), /en/attributions/.
Home-page figures are as read on 2026-11-24 at about 22:03 UTC (pricing page 22:03:38).

## Numbers on their home page (22:03 UTC, 2026-11-24)
| Counter | Value |
|---|---|
| Cameras | 226,203 (title says "200,000+") |
| of which live video | 25,317 (rest are refreshing stills) |
| Flights now (ADS-B) | 15,798 (pricing page 3 s later: 15,599; map gate: 15,672) |
| of which military | 451 |
| of which on estimated course | 3,812 |
| Ships now (AIS) | 19,932 (map gate: 19,898) |
| Ships tracked in total | 36,196 |
| Verified war events (90 days) | 1,661, of which 1,224 with video |
| Active frontlines | counter present, km of line of contact 894 |
| Airports | 47,927 |
| Ports | 1,078 |
| Power plants | 34,936 |
| Data centres | 4,072 |
| Dams | 5,356 |
| Companies | 4,123 |
| People (VIPs) | 1,594 |
| Financial assets | 15,583 |
| Risk zones | 221 |
| Geolocated news items | 400 |
| GDELT points (7 days) | 1,409 |
| OFAC-sanctioned vessels / aircraft | 1,969 / 342 |
| Historical conflict events (UCDP) | 6,000 |
| Tab cameras | 171 cameras "recorded 24 h by the community" (pricing page) |
| Black Friday banner | up to 80% off, through Fri 27 Nov |
Counters on the home page are described as "updated every minute" (VERIFIED).

## Map and layers
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| Web map at /map/ | Runs in the browser, nothing to install; asks for a sign-in (Google or emailed code) before anything loads | free account | | /map/ | VERIFIED |
| 2D map | Flat map with every layer | free | | home | VERIFIED |
| 3D globe | Relief, satellite, day/night, 3D aircraft, ships, satellites; toggle keeps position | paid from DISTRICT | | home, pricing | VERIFIED |
| First-person view | Ride on board a plane or ship on the globe | paid (globe) | | pricing, missions | VERIFIED |
| Satellite, relief, dark and light base maps | Choice of base | free (globe ones paid) | | home | VERIFIED |
| Cloud layer | Worldwide infrared cloud mosaic | free | | attributions | VERIFIED |
| Rain radar | Rain radar overlay (RainViewer) | free | | attributions | VERIFIED |
| Animated wind | Particle wind layer from NOAA GFS, ECMWF fallback | free | | attributions | VERIFIED |
| Lightning density | NOAA product layer | free | | attributions | VERIFIED |
| "What's here?" | Click anywhere and it says what is at that point; cards show what is around | free | | home | VERIFIED |
| Cards for everything | Country, state/province, US county, camera, plane, ship, frontline, event; each linked to neighbours | free | | home | VERIFIED |
| Convergences | Areas where 3+ kinds of events coincide in 24 h | free | | home | VERIFIED |
| Case files | Big events told on the map with evidence and before/after | free | | home | VERIFIED |
| Street-level photos on cards | Panoramax, KartaView, Mapillary photos, 360 viewer | free | | attributions | VERIFIED |
| Satellite image of events, before/after | NASA GIBS: HLS 30 m and VIIRS 375 m | free | | home, attributions | VERIFIED |
| Radio stations | Internet radio by place (Radio Browser) | free | | attributions | VERIFIED |
| Welcome tour and 4 "missions" | Port call, Fire line, Final approach, Military patrol: self-running guided tours; also under map Settings | free | 4 + welcome | /misiones/ | VERIFIED |
| Share link per card with place/region hash | /map/?via=ID#region=... or #c=cameraId | free | | affiliates | VERIFIED |

## Cameras
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| Camera layer | Traffic, urban, coastal, mountain, weather cameras from official portals | free with daily quota and ad before opening (per our matrix) | 226,203 | home | VERIFIED |
| Video vs still | Some stream video, most are images refreshing on their own | free | 25,317 video | home | VERIFIED |
| Countries covered | 190+ | | | home | VERIFIED |
| Search by city, highway, beach | Camera search | free | | home | VERIFIED |
| Favourites and grid | Save cameras and open together | free (account) | | home | VERIFIED |
| Time-lapse clips | x100 and x5,000 sped-up day clips as marketing | free | | home | VERIFIED |
| Camera recording (24 h) | Keeps the last hours of chosen cameras; video scrub; clips and time-lapse download | paid: 15 (3 video) DISTRICT, 150 (8 video) DIVISION | | pricing | VERIFIED |
| Archive length | 24 h stills, 12 h video on DISTRICT, 24 h video on DIVISION | paid | | pricing | VERIFIED |
| Community-recorded cameras | 171 cameras already recorded 24 h for everyone on paid plans | paid | 171 | pricing | VERIFIED |
| Daily email video | 20-second video of your cameras' day, every morning | paid from DISTRICT | | pricing | VERIFIED |
| Videowall and TV mode | Up to 16 cameras, auto rotation, tabs per screen, record from wall | paid from DIVISION | 16 | pricing | VERIFIED |
| Camera API/embed | Embed any camera on your site | listed on all tiers as "not included" tick for OUTPOST/DISTRICT/DIVISION rows; detail unseen | | pricing | INFERRED (listed, not described) |
| Blurred background behind camera wall | Uses a frame of another public camera when one has none | free | | attributions | VERIFIED |
| Camera health per card | Time of last image on each camera card; page says a frozen camera looks like a quiet road | free | | Florida page | VERIFIED |
| Licence rows per camera owner | 26 owners credited with licence text (Fintraffic, DriveBC, HK, USGS, Norway, MLIT Japan, JMA, PhenoCam, Iceland, Taiwan WRA, Madrid, Toronto, NI, Catalonia, Tenerife, Vitoria, Gipuzkoa, AEMET, Lyon, Loire-Atlantique, GeoNet, Singapore LTA) | | 26 | attributions | VERIFIED |
| No face/plate recognition | Stated policy | | | sources, terms | VERIFIED |

## Aircraft
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| Live flights (ADS-B) | Position, altitude, speed | free | 15,798 | home | VERIFIED |
| Class split | Airliners, military, private jets told apart | free | 451 military | home | VERIFIED |
| Flight card | Registration, callsign, type, origin, destination; 3D model; 90-day routes shown on a sample card | free (history paid) | | home | VERIFIED |
| OFAC sanctions match | Aircraft matched by registration | free | 342 | home | VERIFIED |
| Emergency squawks | 7500/7600/7700 in red | free | | home | VERIFIED |
| Estimated position over ocean | Marked as estimate, never invented | free | 3,812 | home | VERIFIED |
| Airports | 47,927; arrivals, departures | free | | home | VERIFIED |
| Control tower live audio | Real ATC audio of major airports | free | | home | VERIFIED |
| Celebrity/VIP jets in gold | Jet linked to a person; lights up when flying | free | | home | VERIFIED |
| Flight history | Earlier flights per aircraft, observed in colour, estimated in grey; altitude/speed per point; per-airport arrivals/departures series | paid: 7 days DISTRICT, 90 days DIVISION | | pricing | VERIFIED |
| Your own ADS-B antenna | RTL-SDR over USB or dump1090/readsb/tar1090 aircraft.json address, decoded in browser, desktop Chrome/Edge only | paid DIVISION | | pricing | VERIFIED |
| Data sources | adsb.lol (ODbL) and OpenSky Network | | | attributions | VERIFIED |

## Ships
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| Live ships (AIS) | All vessel types | free | 19,932 live, 36,196 tracked | home | VERIFIED |
| Dark ships | AIS-off vessels drawn on estimated course and flagged | free | | home | VERIFIED |
| Ship card | Length, draught, cargo, destination, speed, 3D model, voyage | free (voyage history paid) | | home | VERIFIED |
| OFAC sanctioned vessels | Matched by IMO with reason | free | 1,969 | home | VERIFIED |
| Straits live | Gibraltar, Hormuz, Suez, Malacca, Panama with daily crossings | free | | home | VERIFIED |
| Ports | 1,078, with arrivals, congestion, daily calls vs normal | free | | home | VERIFIED |
| Voyage history | Past voyages of a ship | paid 7 d / 90 d | | pricing | VERIFIED |
| Hull drawn to scale | OpenCPN-style shape | free | | attributions | VERIFIED |
| Navigational warnings | UKHO, NGA and 11 national services | free | | attributions | VERIFIED |

## Space and satellites
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| ISS and satellites | Overhead passes for a chosen place, orbits from CelesTrak | free (3D models paid) | | home, attributions | VERIFIED |
| Space launches | Launches, milestones, stages, landings (Launch Library 2) | free | | home, attributions | VERIFIED |

## Weather and hazards
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| Earthquakes | USGS | free | | home | VERIFIED |
| Wildfire hotspots | NASA FIRMS; official US perimeters mentioned in Fire line mission | free | | home, missions | VERIFIED |
| Volcanoes and storms | NASA EONET | free | | home | VERIFIED |
| Hurricanes | Cone and five-day forecast (NOAA) | free | | home | VERIFIED |
| Official weather warnings | NWS and WMO register | free | | home | VERIFIED |
| WHO outbreaks | Risk, cases, status | free | | home | VERIFIED |
| Disaster alerts | GDACS | free | | attributions | VERIFIED |
| Place weather on cards | Feels-like, rain, gusts, visibility (Open-Meteo) | free | | home | VERIFIED |
| Air quality | Capital air quality on country pages | free | | country page | VERIFIED |
| Radiation | Safecast and EPA RadNet stations, rising ones flagged | free | | home | VERIFIED |
| Events to context | Nearby cameras, country, flights, ships around an event | free | | home | VERIFIED |

## Geopolitics and events
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| Frontlines | Line of contact, pressure, initiative; Ukraine to Sahel; from ISW/CTP, DeepStateMap | free | 894 km | home, attributions | VERIFIED |
| Verified events | GeoConfirmed with photo/video, last 90 days | free | 1,661 / 1,224 video | home | VERIFIED |
| GPS jamming | Live interference last 30 min | free | | home | VERIFIED |
| Military bases | OSM outlines, operator, branch; HQ photos from Wikimedia | free | | attributions | VERIFIED |
| Military posture by theatre | Military aircraft and ships per theatre vs normal | free | | tools | VERIFIED |
| UCDP history | Past conflict events for context | free | 6,000 | home | VERIFIED |
| Air raid alerts | Ukraine regional and Israel Home Front Command | free | | attributions | VERIFIED |
| Equipment losses, spending, firepower | WarSpotting, SIPRI, Global Firepower | free | | attributions | VERIFIED |
| Hormuz state | hormuz.now data (CC BY 4.0) | free | | attributions | VERIFIED |
| Cyber threats | Active C2 servers on map; intrusion groups per country (MITRE ATT&CK) | free | | home, attributions | VERIFIED |
| Internet outages | Country outage tool (IODA) | free | | tools, country page | VERIFIED |
| Chokepoint closure what-if | What stops if Hormuz, Red Sea, Panama, Taiwan, Malacca or Bosporus closes | free | 6 named | tools | VERIFIED (index text only; sub-page unopened) |
| Chokepoint traffic table | 28 chokepoints, ships/day 7-day vs 90-day vs year ago, "against normal" % | free | 28 | tools/chokepoint-traffic | VERIFIED |
| Energy: pipelines, storage, fuel shortages | Global Energy Monitor, EIA, JODI-Oil, UN Comtrade | free | | attributions | VERIFIED |

## Finance and assets
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| Financial markets | Stocks, ETFs, commodities, crypto with live prices linked to companies; world exchanges | free | 15,583 | home | VERIFIED |
| Company cards | At HQ; chart, sector, index, news, SEC EDGAR material events | free | 4,123 | home, attributions | VERIFIED |
| Country stock market and central bank | On country page | free | | country page | VERIFIED |
| Financial centres rank | Z/Yen GFCI | free | | attributions | VERIFIED |
| Strategic resources and export routes | USGS, WNA data | free | | home, attributions | VERIFIED |

## People (VIPs)
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| VIP layer | High-profile people with reference net worth (Forbes), news, connections | free | 1,594 | home | VERIFIED |
| Jet and yacht link | Their aircraft and yacht in gold when moving | free | | home | VERIFIED |
| Leaders on country cards | Per country | free | | home | VERIFIED |

## Risk zones
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| AI risk zones | Drawn from geocoded news with 0-10 severity | free | 221 | home | VERIFIED |
| Instability index | 0-100 per country from conflict, unrest, security, information parts plus advisories | free | UAE 45 | country page | VERIFIED |
| Travel advisories | US, UK, Australia levels per country | free | | country page | VERIFIED |
| Theatre situation analysis | AI text per theatre (8 theatres) | free | 8 | home | VERIFIED |
| Outlet reliability level | 1 to 4 per news outlet | free | | home | VERIFIED |
| Geocoded news | GDELT every 15 min plus own AI-geocoded 400 | free | | home | VERIFIED |

## AI assistant
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| ARGOS AI | Plain-language questions answered from map indexes; sees the map view; flies, toggles layers, follows flights/ships, marks areas, measures distances; results are clickable chips; cameras play inside answer | paid from DISTRICT | 10,000 credits/mo DISTRICT, 100,000 DIVISION, 250,000 AGENCY | pricing | VERIFIED |
| AI builds analyst panels | Panel from a sentence | paid DISTRICT | | pricing | VERIFIED |
| Terms warning | AI can be wrong; no personal data | | | terms | VERIFIED |

## Alerts and notifications
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| "Alert me" | Follow vessel, aircraft, port, country from its card | paid DISTRICT 10 things, DIVISION 50 | | pricing | VERIFIED |
| Telegram delivery | With quiet hours | paid DISTRICT+ | | pricing | VERIFIED |
| Discord, Slack, email brief | | paid DIVISION | | pricing | VERIFIED |
| Daily/weekly brief | What changed in geofences and followed items | paid | | pricing | VERIFIED |
| Alert types | Sanctioned vessel to your port with ETA; watched jet takeoff or emergency; event in your country; per-item immediate vs digest rules | paid | | pricing | VERIFIED |
| Geofences | Polygon/circle; region-as-geofence; import GeoJSON/KML/KMZ/GPX read in browser | paid: 5 (1,000,000 km2) DISTRICT, 50 (10,000,000 km2) DIVISION, 100 AGENCY | | pricing | VERIFIED |
| Searchable history | Events, briefs, outbreaks kept and searchable backwards | paid | | pricing | VERIFIED |

## Recording, history and replay
See Cameras (recording, 24 h archive, timeline with zoom/speed, clip and timelapse download, auto-delete) and Aircraft/Ships (history). Terms say recording only for cameras whose licence allows it; the rest are live-only and the card says so (VERIFIED, terms). Public methodology page says the free map keeps no history, only paid rolling 24 h max (VERIFIED).

## Export and API
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| CSV, GeoJSON, KML export | Of the current view with filters | "coming soon", DIVISION and up; marked "when it ships" | | pricing | VERIFIED |
| REST API | /api/v1/search?type=cam&bbox=...&verify=1 with bearer key; sample reply shows total 10,412, count 50, truncated flag | AGENCY only | | pricing | VERIFIED |
| MCP server | Plug into Claude or own model | AGENCY only | | pricing | VERIFIED |
| Commercial use right | Business use of data incl. API; no resale or bulk redistribution | AGENCY only | | terms | VERIFIED |

## Team and enterprise
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| ARGOS AGENCY | For registered companies: 300 cameras, 20 streams, 250,000 credits, 100 geofences, commercial use, API and MCP | $4,999/mo or $49,999/yr; paid by bank transfer, 365-day year, no auto-renew | | pricing, terms | VERIFIED |
| Team use-case copy | Videowall, many cameras recording, AI in depth | | | pricing | VERIFIED |
| Account sharing barred | One person or entity per account | | | terms | VERIFIED |

## Mobile and apps
| Feature | What it does | Free/paid | Number | Page | Conf |
|---|---|---|---|---|---|
| Phone support | "For any computer and your phone" on 2D map; globe is for powerful machines | free | | home | VERIFIED |
| Native app | None mentioned on any page opened | | | | INFERRED (absence) |
| Analyst mode | Desktop only | paid | | pricing | VERIFIED |
| Antenna | Desktop Chrome/Edge only | paid | | pricing | VERIFIED |

## Languages
Spanish and English only (ES/EN switch on every page, hreflang pairs in sitemap) (VERIFIED). Camera, country and blog pages exist in both.

## Accounts, sign-in, quotas and ads
| Feature | What it does | Free/paid | Page | Conf |
|---|---|---|---|---|
| Sign-in | Google, or single-use link by email; no passwords | free | terms, /map/ | VERIFIED |
| Terms tick box | "Accept terms and privacy" mandatory; "email me product news" optional | | /map/ | VERIFIED |
| Free map supported by ads | Terms say so | | terms | VERIFIED |
| Daily camera quota and ad before a camera opens | Stated as what Pro removes | free tier | pricing | VERIFIED |
| Country blocks | Pro removes "country blocks" on cameras | | pricing | VERIFIED |
| 24-hour pass | One-off payment opening every camera, no ads, 24 h; 7-day pass stopped 28 Sep 2026; stackable | paid one-off | terms | VERIFIED |
| Founding Member 10-year pass | One-off payment, plan for 3,650 days; 3-year service guarantee (refund pro-rata or local software without API keys) | paid one-off | terms, pricing | VERIFIED |
| Payments | Freemius (merchant of record) or Whop; EUR/USD/GBP; VAT added | | terms | VERIFIED |
| Free trial | Some plans, card required | | terms | VERIFIED |
| Waitlist invitations | Emailed with different trial lengths | | terms | VERIFIED |
| Free ARGOS for creators with 10,000+ followers | Ask from affiliate panel | free | affiliates | VERIFIED |
| Privacy claim | Does not track location or store searches | | home | VERIFIED |
| Cookie settings link | Footer | | home | VERIFIED |

## SEO and public page types (sitemap fetched 2026-11-24, 2,535 URLs; one single urlset, no sub-sitemaps)
| Section | URL count | Example | Conf |
|---|---|---|---|
| Home / map / ES home | 3 | /, /map/, /es/ | VERIFIED |
| Spanish camera pages /camaras/ | 646 | | VERIFIED (counted) |
| English camera pages /en/cameras/ | 646 (1 index, 79 country, 566 region/place) | /en/cameras/united-states-of-america/florida/ | VERIFIED |
| Country pages /country/ | 251 (+ index) EN, 251 ES | /en/country/united-arab-emirates/ | VERIFIED |
| Blog | 353 ES, 351 EN | | VERIFIED |
| Tools | 5 EN (index, internet-outages, chokepoint-traffic, military-posture, chokepoint-closures), 5 ES | | VERIFIED |
| About /sobre/ | 7 EN, 7 ES: about plus 6 author pages (Elena Castel, Marcos Veiga, Nora Brull, Hugo Leal, Adria Monfort, Sofia Renau) | | VERIFIED |
| Affiliates and affiliate terms | 2 EN, 2 ES | | VERIFIED |
| Sources and methodology, missions, pricing | 1 each per language | | VERIFIED |
| Total | 2,535 | | VERIFIED |
No flight, ship, VIP, financial-asset or risk-zone pages exist in the sitemap: those verticals are map-only plus blog (VERIFIED by the section counts). No separate sitemap-index, no changelog, release notes, docs, help or FAQ pages in the sitemap (FAQ is on the home page). Blog entries carry video sitemap tags (own clips and YouTube embeds). Camera region page structure: H1 with count and month, essentials block, featured cameras with timestamps, roads ranked by camera count with a one-line meaning, 30 further camera links, how-to-read text, "what you won't see", FAQ (3 Qs), related guides, sibling regions with counts, all-countries list. Country page: instability index with four sub-scores and "what it rests on", advisories, internet status, ports by activity vs normal, capital air quality, markets, neighbours with their index.
robots.txt: allows all, Cloudflare content signals (search yes, ai-train no, use reference); blocks AI training crawlers including ClaudeBot, GPTBot, Google-Extended, CCBot (VERIFIED).

## Growth and distribution
| Mechanism | Detail | Page | Conf |
|---|---|---|---|
| Affiliate programme | 20% of every payment forever, up to $9,999 per sale, USD, joined with one click from the account; panel with balance and payouts | affiliates | VERIFIED |
| Per-card affiliate link | Every camera/event/ship card has "Affiliate link" with via=ID plus UTM | affiliates | VERIFIED |
| Creator playbook | Shows six creator videos totalling over 1.2 million views, accounts of 8K-88K followers reaching 7x-18x their followers (Instagram, TikTok; EN, PL, TR); tells affiliates to copy the hook and to use ManyChat comment-to-DM automation with a camera link | affiliates | VERIFIED |
| Ready-made post templates | Sample Telegram channel post, a reply to a Reuters news post on X with an event link, Instagram DM | affiliates | VERIFIED |
| Black Friday promo | Up to 80% off, banner on every page | home | VERIFIED |
| Founding Member/lifetime passes | Cash-up-front pricing | terms | VERIFIED |
| Waiting list and community votes | "Coming" features open in order the subscribers vote | pricing | VERIFIED |
| Blog and author bylines | 6 named authors by topic; YouTube embeds | about, sitemap | VERIFIED |
| Newsletter | Only "product news" opt-in tick and daily brief email (paid) | /map/, pricing | VERIFIED |
| Embeds | Camera API/embed listed as a paid feature | pricing | INFERRED |
| Social accounts | An X account @argos_map appears in a sample post | affiliates | VERIFIED |
| Video sitemap | Own MP4 clips on /clips/ | sitemap | VERIFIED |
| Our reading | Traffic mix (earlier teardown): mostly brand, direct, social; the affiliate page confirms a paid-creator engine | | INFERRED |

## Pricing tiers (USD, no VAT; pricing page 2026-11-24, Black Friday)
| Tier | 1-month | 12-month | Cameras recorded | AI credits/mo | Archive | History | Geofences | Alerts | Extras |
|---|---|---|---|---|---|---|---|---|---|
| Free | 0 | | none | none | none | none | none | none | 2D map, camera quota, ads |
| OUTPOST | $29.99 list, welcome price shown as $5.25/mo for 12-month plan (-82%) | $62.99 for 12 months (valued $359.88) | none | none | none | none | none | none | every camera, no ads, no country blocks, live map |
| DISTRICT (recommended) | $79.99 list (-80%) | $189.99 (valued $959.88), $15.83/mo | 15 (3 live video) | 10,000 | 24 h (12 h video) | 7 days | 5 (1,000,000 km2) | 10 items, Telegram | globe, analyst mode, daily email, 171 community cameras |
| DIVISION | $279 list (-65%) | $1,149 (valued $3,348), $95.75/mo | 150 (8 live video) | 100,000 | 24 h | 90 days | 50 (10,000,000 km2) | 50 items, Telegram, Discord, Slack, email | videowall 16, antenna, export (when shipped) |
| AGENCY | $4,999/mo or $49,999/yr | | 300 cameras, 20 streams | 250,000 | | | 100 | | API, MCP, commercial use, bank transfer |
Other: first-month welcome discount on OUTPOST/DISTRICT (up to 65% off first month); 12-month up to 82% off; "founding member" 10-year pass (shown as a tab); 24-hour pass; cancel anytime. Affiliate table (EN) shows first-month commission prices: OUTPOST $1.79, DISTRICT $4.40, DIVISION $29.34 and from month 2 monthly full prices; annual $9.99, $29.99 (affiliates page, partly read). Note: the OUTPOST column on the pricing page lists only "no wall, no ads, live map" as its content (the other rows show without a tick in the text export; whether each row is on or off per tier is not recoverable from text, so tier-by-feature ticks are INFERRED from the intro sentence "from DISTRICT: globe, AI, analyst, recording, geofences, email, history").

## Not visible without sign-in
- The map itself (all layer controls, filters, panel list, camera card UI, search, settings, "Alert me" button, "Affiliate link" button, analyst-mode rail, welcome tour in action).
- Real camera quota size, which ad appears before a camera, the ad network.
- Account panel, affiliate panel, Dashboard of alerts.
- Whether country "blocks" are geo-restrictions on camera owners.
- The map's own right-hand panel list (a blurred rail of about 12 counters was visible behind the sign-in box: not readable).
- Mobile layout of the map.

## Things I might have missed
- Not opened: /en/privacy/, /en/legal-notice/, /en/terms/#refunds, /en/country/ index, /en/cameras/ index and a camera country page, /en/tools/internet-outages/, /en/tools/military-posture/, /en/tools/chokepoint-closures/, /en/blog/ index and any single blog article, /en/sobre/<author> pages, /affiliates/terms/, /es/ pages, /en/account/.
- Pricing FAQ answers (6 questions) were collapsed and not read; same for the home FAQ answers beyond the first line.
- "Coming" features and the voting mechanism, the "Founding Member" tab price, the 24-hour pass price: the price list is not in the text I read.
- Public API docs: only the AGENCY sample on the pricing page; no developer docs page found in the sitemap.
- Apps: no App Store or Play link seen; not searched in their footer beyond the home page.
- Languages beyond ES/EN: none on the site, but blog videos in other languages are linked from affiliates.
- Blog topics seen only as slugs in the sitemap (about 175 per language): traffic, webcams, OSINT, jets, AIS, cables, regional guides (US, Florida, UK, Europe), seasonal (hurricane cameras, eclipse August 2026 Spain, DGT summer exit operation), Puerto Rico blackout durations, APRR webcams.
- Credit to God's Eye View: their attributions page states their 3D globe code is influenced by GEV (MIT) and adapted pieces, so anything we ship from GEV is something Argos already ships.
