# Big-picture info-gain debate, round 1 (2026-11-28)

Packet: docs/chatgpt-prompts/2026-11-28-big-picture-info-gain.md. ChatGPT temp chat 6b0a43a7 read to its last line (about 51,000 characters). Gemini: pending (usage limit). DeepSeek: pending (owner robot check).
ChatGPT read GEV's README.md and DATA_SOURCES.md itself. Verdict: "We are nowhere near being able to declare nothing missing."

## Its biggest points (Claude agrees unless marked)
1. Our own weakness first: 14,169 of 24,561 camera links are not covered by our link check (42.3% coverage). Find why per source (blocked, auth, unsupported, dead), keep outage history, publish per-source reliability. Only we can generate this.
2. Information fusion beats more layers: per road/place, answer "is it open, since when, what happened, alternatives, see it", each fact with source, observed time, retrieval time, and observed vs estimated vs forecast vs unknown labels.
3. Road history and closure/reopening timelines (we already poll Caltrans closures; keep history).
4. Camera uptime history (our own health checks over time).
5. Incident-to-camera matching (official incident -> nearest cameras).
6. New page types: mountain passes, border crossings (CBP wait times, public domain), bridges/tunnels, ferry terminals, airport and port access, freight corridors, agency source pages, "what happened on road X".
7. Hazard context on roads: flood extent (Copernicus GloFAS), water levels at crossings (USGS), tides/surge (NOAA), landslides (USGS), ShakeMap road impact (USGS), avalanche bulletins (EAWS), visibility/fog (METAR), road weather.
8. Country expansion by useful road coverage, not country count: Germany, France, Netherlands, Belgium, Switzerland, Austria; Brazil, Mexico, Chile; India, Singapore, Thailand, Malaysia; South Africa, Kenya, Nigeria; New Zealand; Poland, Czechia; UAE, Turkey.
9. Licence register per source (already exists: data/source-permissions.json). Warnings it confirmed: Open-Meteo free tier = no for ad-funded; Global Fishing Watch = non-commercial; iNaturalist per-record.
10. Lower: WorldPop exposure (CC BY 4.0), schools/hospitals near hazards (OSM ODbL), Sentinel change detection, crash history (NHTSA), accessibility, time zones.

## What it asked for in round 2 (file audit, not brainstorm)
sources.json, full camera catalogue, health-check code and results, deployed GEV commit and enabled layers, route inventory, Cloudflare config, licence register, Search Console exports.

## Claude's view
Agree on the order: (1) close the 14,169 unchecked gap and keep history, (2) fusion per road/place with provenance labels, (3) border crossings and mountain passes as page types, (4) country expansion by road coverage, (5) hazard-on-road context. Its "Argos advertises 190+ countries, 200k cameras" is UNVERIFIED (Claude may not open Argos).
