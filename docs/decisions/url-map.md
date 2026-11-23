# URL map: country level added (2026-11-23)

Old scheme: `/cameras/<region>/` and `/cameras/<region>/<city>/`. New scheme: `/cameras/` (world hub) -> `/cameras/<country>/` -> `/cameras/<country>/<region>/` -> `/cameras/<country>/<region>/<city>/`.
No redirects: nothing was ever indexed (staging is noindex, no real domain yet). Checked 2026-11-23: no built page, test or doc links an old address (site/tests/dist.test.mjs "old two-level addresses are gone and nothing links them"). Add redirects only if a real domain ever indexed the old ones.

Roads: decided to keep `/roads/` and `/roads/<slug>/`. Why: every road page is California-only (I-, SR-, US- roads; the BC source has no such roads), so `/roads/<country>/<slug>/` would be a folder holding one country, and it would touch the road silo gate, the road tests and every road link for no reader gain. Each road page and the roads hub now say "California, United States" in title and text. When a second country has road pages, move roads under the country then and add the redirects.

New pages (no old address): `/cameras/united-states/`, `/cameras/canada/`.

| Old URL | New URL |
|---|---|
| /cameras/british-columbia/ | /cameras/canada/british-columbia/ |
| /cameras/british-columbia/campbell-river/ | /cameras/canada/british-columbia/campbell-river/ |
| /cameras/british-columbia/dawson-creek/ | /cameras/canada/british-columbia/dawson-creek/ |
| /cameras/british-columbia/elkford/ | /cameras/canada/british-columbia/elkford/ |
| /cameras/british-columbia/fort-st-john/ | /cameras/canada/british-columbia/fort-st-john/ |
| /cameras/british-columbia/mission/ | /cameras/canada/british-columbia/mission/ |
| /cameras/california/ | /cameras/united-states/california/ |
| /cameras/california/anaheim/ | /cameras/united-states/california/anaheim/ |
| /cameras/california/corona/ | /cameras/united-states/california/corona/ |
| /cameras/california/irvine/ | /cameras/united-states/california/irvine/ |
| /cameras/california/los-angeles/ | /cameras/united-states/california/los-angeles/ |
| /cameras/california/oakland/ | /cameras/united-states/california/oakland/ |
| /cameras/california/riverside/ | /cameras/united-states/california/riverside/ |
| /cameras/california/sacramento/ | /cameras/united-states/california/sacramento/ |
| /cameras/california/san-bernardino/ | /cameras/united-states/california/san-bernardino/ |
| /cameras/california/san-diego/ | /cameras/united-states/california/san-diego/ |
| /cameras/california/san-jose/ | /cameras/united-states/california/san-jose/ |
