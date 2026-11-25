# What is inside Argos Atlas's camera supply: estimate from public pages only (2026-11-25)

Our own notes. No Argos prose, images or code are copied; place names, camera names and operator names below are facts. Raw captures stay in the gitignored research-private/ folder.

## Correction first

The claim "nobody can reverse-engineer that list from outside" was false. Their public sitemap and their country index page give per-country camera counts and a good look at the operator mix. What stays hidden from outside is the exact per-camera operator and licence, because their individual cameras have no public page.

## What was read (rules obeyed)

- robots.txt: HTTP 200. User-agent * is Allow /; content signals search=yes, ai-train=no. Only named AI-training crawlers are disallowed. We are not training anything and sent a normal browser-style user agent at a polite pace. Sitemap line: https://argosatlas.com/sitemap.xml.
- Sitemap: ONE file, 692,823 bytes, 2,535 URLs, no shards. No individual camera URLs exist in it. Pattern counts (English and Spanish copies are mirrors): 323 place pages per language under /cameras/ (1 index, 78 country pages, the rest regions), 251 per language under /country/, 352 per language blog, a few tool and pricing pages. So the 226k cameras are not indexable one by one; only places are.
- Pages fetched (all HTTP 200, 20 seconds apart, no 403, no bot check, no login): 1 robots.txt, 1 sitemap, the cameras index page, and 19 country pages (Finland, Taiwan, Japan, Italy, Austria, United States, Canada, Spain, Germany, United Kingdom, France, Czechia, Switzerland, Australia, Indonesia, South Korea, Sweden, China, Norway). That is 19 of the 40 allowed. Nothing was stopped or worked around.
- Result shape: the task asked for 40 individual camera pages with a credit line. THAT COULD NOT BE DONE: there are no individual camera pages and the country pages show no operator, licence or credit line and link out only to themselves (external hosts on the page: Google Fonts only). Instead the sample is the 12 "featured cameras" each country page lists by name (19 x 12 = 227 names). The operator type is read from the name style (road numbers, river names, "AWEKAS Wetter-Cam #n", beaches, town squares). That is inference, not a credit line. Every operator below is UNVERIFIED.

## Exact numbers (country index page, 2026-11-25, VERIFIED by reading it)

Index title says 222,898 active public cameras in 79 countries (the owner's 226,203 is a different day or count; this page's own per-country rows add up to exactly 222,898). Top rows: United States 74,502; Japan 24,158; Taiwan 23,964; Italy 9,738; Canada 9,562; Spain 9,370; Austria 7,244; Germany 6,776; United Kingdom 5,841; France 5,207; Czechia 4,210; Switzerland 3,418; Australia 3,190; Indonesia 3,142; Finland 3,025; South Korea 2,736; Sweden 1,943; China 1,923; Norway 1,850. These 19 countries hold 201,799 (90.5 percent). The other 60 countries hold 21,099, most under 1,200 each.
Concentration: three places (US, Japan, Taiwan) are 122,624 = 55 percent. The US alone is 33 percent.
Their country pages say the cameras are mostly still images (Finland: 2,962 stills and 63 video of 3,025), refreshed from seconds to minutes.

## Table: the 227 featured camera names, by apparent type

| Apparent type | Count | Share of 227 | Where it showed |
|---|---|---|---|
| Government road or traffic camera (road numbers, junction names, highway ids) | 126 | 56% | US 12, Canada 11, UK 11, Norway 12, Finland 12, Australia 12, Sweden 10, Czechia 10, Spain 9, Japan 7, Taiwan 5, Korea 5, China/HK 5, others 3 |
| River, flood or pump-station camera | 10 | 4% | Japan 5, Taiwan 5 |
| AWEKAS weather-webcam network ("AWEKAS Wetter-Cam #n") | 17 | 7% | Spain 3, Switzerland 3, Italy 2, Austria 2, Germany 2, France 2, UK 1, Czechia 1, Sweden 1 |
| Tourism, town square, beach, ski, harbour or similar webcam (named venue) | 62 | 27% | Austria 10, Italy 9, Germany 9, France 9, Switzerland 7, Korea 7, China 5, Czechia 2, Taiwan 2, Canada 1, Sweden 1 |
| City or street CCTV, some named after shops or restaurants (apparently private or unclear owner) | 12 | 5% | Indonesia 12 |
| Credits a named government operator on that page | 0 | 0 | the page itself credits nothing; operator named only on their separate attributions page (about 23 owners) |
| Credits nothing | 227 | 100% | no credit line on any sampled page |
| Links out to an official operator page | 0 | 0 | none |

Data-quality note: the China page features a Georgia (US) camera id (DUN-0173 Dunwoody) and the Spain page has two Madrid street entries with a "#" duplicated in the name, so their geocoding or labelling has mistakes.

## New operator leads seen in the sample but NOT on their attributions page (all UNVERIFIED: inferred from names only, licences NOT read)

- AWEKAS weather-camera network (community weather-station webcams, Europe-wide): 17 of 227 names; a commercial or community network, treat as high licence risk until its terms are read.
- Sweden road cameras (names like "Härlöv norrut" suggest Trafikverket): not on their attributions page.
- Czechia road cameras (names by road class and km, suggest the national road agency): not on the attributions page.
- US state and city DOT feeds seen by id style: Pennsylvania ("PA 283 @ ..."), Michigan ("I-75 @ S of M-59"), Georgia (ids like ATL-0944, GWIN-547, FULT-0018), New York City ("Grand Concourse @ ..."), Texas ("US-54 @ Hondo Pass"), Hawaii ("H-1 & KAAHUMANU"). Only Ohio is on their attributions page.
- Canada: Alberta ("Hwy 16: West of Hwy 834"), Ontario ("Highway 401 at ..."); BC and Toronto are on their page.
- Australia: New South Wales, Victoria (Burnley Tunnel), Northern Territory (Katherine Bridge); only Queensland is on their page.
- Spain: Navarra and Basque roads (Belate, Pagozelai), Catalonia (AP-7, listed there), Madrid street cameras (Madrid is on their page).
- Taiwan national freeway bureau ("國道3號 N 47K+550") and Taiwan city and township street cameras.
- South Korea beach cameras (Haeundae, Daecheon, Jungmun and others) and Gyeonggi-style city cameras: operator unknown.
- Indonesia city CCTV (Bandung, Yogyakarta, Jakarta, Sleman): operator unknown, several look private. Treat as do-not-use until proven.
- Germany and Austria town and tourism webcams: many small private or municipal owners, no single licence.

## What this sample can and cannot show

- It cannot show the operator or licence of any individual camera, the counts per operator, or video versus still per place beyond what a page states.
- Sample bias: featured cameras are chosen by Argos (probably most-viewed or most-fresh), not random. 227 names are 0.1 percent of 222,898. Two countries (Japan, Taiwan) show only 12 names for 48,000 cameras. Pages for 60 small countries were not read. Counts are as shown on one day.
- Strength: country totals are exact. Within the 19 countries read, the operator type of the biggest blocks (US, Japan, Taiwan, Canada, Spain) is clear from naming style.

## Estimate (GUESS, weighted by each country's real count times that page's type shares; the 60 unread countries add 9.5 percent and are assumed to look like their neighbours)

| Category | Share of 222,898 | Rough count |
|---|---|---|
| Road and traffic cameras | 58 to 72 percent | 130,000 to 160,000 |
| River, flood and pump cameras (Japan MLIT and Taiwan Water agency) | 6 to 12 percent | 14,000 to 27,000 |
| Weather, tourism, town, beach, ski, AWEKAS and other webcams | 14 to 26 percent | 30,000 to 58,000 |
| City CCTV with unclear owner (Indonesia, parts of Taiwan) | 2 to 6 percent | 4,000 to 13,000 |

Reading: the supply is dominated by government road cameras, about one third from the US alone, with Japan and Taiwan adding a large block of road and river cameras. The long unlisted tail beyond their roughly 23 named owners is mostly (1) many US state and city DOT feeds, (2) Japanese and Taiwanese road and river agencies, (3) AWEKAS-type weather webcams and tourism webcams in Europe, and (4) unclear city CCTV in Indonesia.

## For us

- Ranking of blocks worth a licence read first (by camera count, then licence cleanliness): US state DOTs (74,502), Japan MLIT plus Taiwan freeway and water agencies (48,000), Canada provinces (9,562), Spain regions (9,370), UK and Nordic road agencies, Czechia, Australia states.
- Do not touch: AWEKAS, Indonesia private-looking CCTV, Korean and European tourism webcams, until each has its own quoted licence row in data/source-permissions.json. Argos showing a source is not our licence.
- Not done: no operator licence read (told not to), no Spanish-language pages, no region pages, no per-camera checks.
