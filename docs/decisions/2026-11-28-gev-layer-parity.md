# GEV layer parity check (ChatGPT temp chat 6b0ac4d3, 2026-11-28)

Owner asked: check against the GEV repo that we ported every layer except paid ones (like OpenSky).
Prompt: docs/chatgpt-prompts/2026-11-28-gev-layer-parity.md. Both answers read to the last line.

## ChatGPT verdict (after round 2)
"nothing new to add to the implementation backlog; investigate Acartia's permitted use before enabling it."

## Checked against GEV code (gev/ at aac6be7)
| Claim | Check | Result |
|---|---|---|
| KartaView, shipwrecks, FAA airspace missing | plan.md: seen live 2026-11-27 (KartaView 314 near Seattle, shipwrecks 8.0K, airspace 569) | WRONG (my packet left them out) |
| OpenSnowMap should be added | DATA_SOURCES.md:185 bulk download forbidden without agreement | Kept off |
| adsbdb route data restricted | DATA_SOURCES.md:32 "may not be copied, published, or incorporated" | VERIFIED: server deploy must block callsign route lookups at the proxy; aircraft type lookups only |
| iNaturalist: filter to CC0/BY records | gev/src/layers/wildlifeSightings/records.js:10-11 passes cc-by-nc | Needs an upstream edit or proxy filter; stays off |
| Acartia scope unclear | DATA_SOURCES.md:57 CC BY 4.0; row in data/source-permissions.json:1056 | Owner rule "GEV says usable = use it": stays on |
| "GEV says usable" is unsafe | Owner hard rule 2026-11-26; applies only where GEV's notes say usable | Disagree, rule kept |
| Upstream layer list | `ls gev/src/layers`: 35 folders | All accounted for below |

## Still to do (free)
- Panoramax street-level (DATA_SOURCES.md:26, CC BY-SA / Licence Ouverte): test if browser-direct on /map/.
- Sea Marks, OpenSeaMap (DATA_SOURCES.md:184, CC BY-SA 2.0 / ODbL): test on /map/.
- Mapped ALPR (OSM ODbL, tiles.dontgetflocked.com): licence row, then test.
- Non-layer features (visual styles, HUD, detection overlay, Director, share links): test on /map/ (already a plan item).
- With the server: Planespotters and Open Vessel photos (browser-direct, need tracked aircraft/ships), adsbdb aircraft-only.
