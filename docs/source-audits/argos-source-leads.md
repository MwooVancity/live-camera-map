# Argos Atlas source leads (read by hand 2026-11-22 from their public "Sources and methodology" page; names only, no text copied)
Rule (CLAUDE.md "Argos as our lead list"): free = candidate, paid = excluded, and every lead still needs its own row in data/source-permissions.json before any data ships. Argos using a source is not a licence.

| Lead (as Argos names it) | Free? | What we would use it for | Status for us |
|---|---|---|---|
| OpenStreetMap (ODbL) | yes, with attribution and share-alike on derived databases | roads, place names, corridor geometry, geocoding (Photon/Nominatim need their own terms) | CANDIDATE. Check: do not use openstreetmap.org's own tile servers commercially; OpenFreeMap (OSM-based) is the map plan. Needs a permission row. |
| Natural Earth (public domain) | yes | country and state outlines for hubs | CANDIDATE, low value for v1. Needs a row. |
| OurAirports (public domain) | yes | airport pages, airport-area road links | CANDIDATE, v2. Needs a row. |
| "Official portals of public traffic and mobility bodies" (cameras) | varies per body | cameras | Per body, never in bulk. Caltrans done (rows exist). Next: DriveBC, City of Calgary, City of Toronto, Ontario 511 and Alberta 511 (keys), other US state DOTs. Each: read terms, add row. |
| "Open tracking sources" (flights and ships) | unknown, they do not name them | live aircraft and vessels | OUT of v1 (plan section 9). OpenSky stays OFF. Re-open after v1. |

Argos serves camera images; we do not (link-out only until a source's image permission is `allowed`). That is a licence difference, not a technical one.
