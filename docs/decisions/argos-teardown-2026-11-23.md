# Argos Atlas teardown, 2026-11-23 (Claude in Chrome, as a normal visitor; their public sitemap; own words only, nothing copied)
Their traffic per Ahrefs: ~500k visits/month (owner-reported). Ahrefs pages/keywords NOT yet read by Claude (this Chrome is not signed in to Ahrefs).

## What the product is
"Live cameras worldwide": 228,575 cameras on the day, ~14.5k flights (ADS-B), ~19.9k ships (AIS), war frontlines with verified events, OSINT analysed by AI, critical infrastructure, VIPs and celebrity jets, earthquakes / wildfires / storms / outbreaks. 3D globe. Paid tier (Black Friday -80%). The map app asks for a sign-in (Google or email) before showing the map. Home page: one H1, ~14 H2 (one per vertical), FAQPage + WebApplication + WebSite + Organization JSON-LD, hreflang es / en / x-default, ~2,500 words.

## Sitemap (2,521 URLs, fetched 2026-11-23)
| Type | Count | Note |
|---|---|---|
| Spanish camera pages /camaras/<pais>/<lugar> | 644 | Spanish is first class |
| English camera place pages /en/cameras/<country>/<place> | 564 | country > state/region/city |
| English camera country pages | 79 | |
| Country pages /country/<c> | 251 EN + 251 ES | "<Country> today": instability index, travel advisories, ports by activity, capital air quality, markets (~330 words, BreadcrumbList) |
| Blog guides | 348 ES + 346 EN | Spanish slugs; topics: traffic cameras, world webcams, OSINT/verification, live flights, ships/AIS, critical infrastructure, energy grids, urban mobility, maps tech, wealth jets/yachts |
| Tools | 5 | internet outages, chokepoint traffic (ships/day through 28 chokepoints vs normal and vs last year), military posture, "if a strait closes" |
| Other | ~15 | pricing, affiliates, about, sources and methodology, missions |

## What this changes for us (decided 2026-11-23)
1. Cameras are only part of their traffic. Flights, ships, celebrity jets, war, OSINT and "country today" queries are probably a large share. Ahrefs decides how large.
2. Spanish is half their camera pages and half their blog. Our old "no Spanish" line is superseded.
3. They use an account wall on the map; ours stays free with no account (plan section 1).
4. Their country "today" and tool pages are short data pages built from open data (ports, air quality, advisories, ship counts): data pages are our style too. Free licensed candidates to verify per vertical are listed in plan section 18.
