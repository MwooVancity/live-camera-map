# Road data feed licences (read 2026-11-25), ads = commercial use

Method: pages fetched whole by curl/WebFetch, no login, no sign-up, no keys requested. robots.txt: wsdot.wa.gov (generic Drupal file, nothing blocking the pages read), 511on.ca and 511.alberta.ca (only /my511, /map, /list/getdata, /eventdetails etc. blocked; developer pages not blocked), avalanche.ca (only MJ12bot blocked), developer.nlr.gov (none). No 403 or bot check met.
Labels: VERIFIED(url) = read on that page today; UNKNOWN = not found.

## Summary

| # | Feed | Key | Verdict | Next action |
|---|------|-----|---------|-------------|
| 1 | NLR (ex-NREL) AFDC alt-fuel stations API | free key, self-serve signup | READY | Mike signs up for a key (we must not); add source row |
| 2 | WSDOT Traveler Information API | free access code by email | HOLD | email WSDOT for written commercial/ads answer |
| 3 | Avalanche Canada public API | none stated | HOLD | email research@avalanche.ca / info@avalanche.ca |
| 4 | WZDx registry + MN feed | none | READY (MN CC0); registry READY | build from MN; Iowa HOLD |
| 5a | NWS api.weather.gov alerts | none (User-Agent string) | READY | add source row, credit NWS |
| 5b | Environment Canada MSC open data | none | READY | add row, keep alert text unaltered, attribute |
| 6a | Ontario 511 developer API | token by request, ministry reviews | HOLD (licence ok, access is discretionary) | Mike requests token with our use described |
| 6b | 511 Alberta developer API | key | HOLD | email 511 Alberta for commercial permission |

## 1. NLR (formerly NREL) Alternative Fuels Data Center station API: READY
- developer.nrel.gov moved: it no longer resolves from here; the live host is https://developer.nlr.gov (National Laboratory of the Rockies). Station endpoint: https://developer.nlr.gov/api/alt-fuel-stations/v1.json (VERIFIED(https://developer.nlr.gov/docs/api-key)).
- Deciding sentence, VERIFIED(https://developer.nlr.gov/terms/): "These data and software code ("Data") are provided by the National Laboratory of the Rockies ("NLR"), which is operated by the Alliance for Energy Innovation, LLC ("Alliance"), for the U.S. Department of Energy ("DOE"), and may be used for any purpose whatsoever."
- Conditions: "The names DOE/NLR/Alliance shall not be used in any representation, advertising, publicity or other manner whatsoever to endorse or promote any entity that adopts or uses the Data." (so credit the source factually, never imply endorsement). Indemnity clause exists for our use of the Data.
- Key: free, "After signing up, you'll be given your own, unique API key" (VERIFIED(https://developer.nlr.gov/docs/api-key)); rate limits page not read (UNKNOWN exact numbers; DEMO_KEY is low-limit). Not signed up.
- Next action: Mike signs up (key into .env, gitignored); add row to data/source-permissions.json quoting the sentence; cache nightly, not per visitor.

## 2. WSDOT Traveler Information API: HOLD
- https://wsdot.wa.gov/traffic/api/ lists WSF Fares/Schedule/Terminals/Vessels, Mountain Pass Conditions, Border Crossings, Highway Alerts. VERIFIED(that url).
- Access: "To use WSDL services you must be assigned an Access Code." Code is emailed after entering an email on that page; "Your email address will not be shared and will be used only to notify you of changes to our services." (Not requested.)
- The API page has no commercial-use sentence; it links to https://wsdot.wa.gov/about/policies/travel-information-disclaimer, which was read whole: it is only a warranty/liability disclaimer ("as-is" and "as available"), nothing on commercial reuse, ads or attribution. VERIFIED.
- Deciding sentence: none exists. Silence is not a licence (and ferry schedules/fares may carry other terms: UNKNOWN).
- Next action: email WSDOT (webmaster/traveler API contact) asking if API data may be shown on an ad-supported site with credit "Source: WSDOT". Build nothing until written reply. Link-out to wsdot.wa.gov pages needs no permission.

## 3. Avalanche Canada public API: HOLD
- Docs: https://avalanche.ca/api-docs (the docs.avalanche.ca host does not resolve from here). Base URL https://avcan-services-api.prod.avalanche.ca; endpoints /forecasts/{lang}/areas, /metadata, products. VERIFIED(https://avalanche.ca/api-docs). No key mentioned; no terms or licence on that page.
- https://avalanche.ca/terms-of-use: "The material on this site may not be reproduced or copied without prior written consent from Avalanche Canada or the Avalanche Canada Foundation." VERIFIED. That sentence is about the website; whether it covers API output is UNKNOWN, but it is the only stated rule and is restrictive.
- https://avalanche.ca/data-sharing-policy (updated 2026-02-12): "In some cases, we may require users to disclose how data is going to be used and sign an agreement or disclaimer..."; requests go to research@avalanche.ca. VERIFIED.
- Verdict: HOLD, conflicting/absent API licence plus a no-copy sentence. Avalanche danger ratings are safety-critical, so an error or stale value also carries liability.
- Next action: email research@avalanche.ca asking written permission to display danger ratings per area beside ads with credit and link; until then link-out only to avalanche.ca forecast pages.

## 4. WZDx work zone feeds
- Old datahub link: the registry is now https://data.transportation.gov/d/69qe-yiui (the view API https://data.transportation.gov/api/views/69qe-yiui answered 200 JSON today; row-level CSV: https://data.transportation.gov/resource/69qe-yiui.csv). Landing: https://catalog.data.gov/dataset/work-zone-data-exchange-wzdx-feed-registry. Last row update in metadata is stamped well ahead, so treat as live. VERIFIED.
- Registry licence: licenseId USGOV_WORKS (US Government work, no copyright) with the requested citation "U.S. Department of Transportation Intelligent Transportation Systems Joint Program Office. (2020). Work Zone Data Exchange (WZDx) Feed Registry." VERIFIED(https://data.transportation.gov/api/views/69qe-yiui). That covers the list, not each state's data.
- Registry carries ~50 rows with needapikey true/false per feed. WARNING: some rows (Oklahoma, Florida) embed an access token inside the feed URL; do not copy those into git or logs.
- Feed A, Minnesota DOT https://mn.carsprogram.org/carsapi_v1/api/wzdx: 200 application/json, no key; the feed itself states "license":"https://creativecommons.org/publicdomain/zero/1.0/" (CC0). VERIFIED(that feed). READY: public domain, ads fine. Credit MnDOT anyway as courtesy.
- Feed B, Iowa DOT https://iowa-atms.cloud-q-free.com/api/rest/dataprism/wzdx/wzdxfeed: 200, no key, v4.0 GeoJSON updated 2026-11-25, but the feed has no license field and I found no Iowa DOT data terms page. UNKNOWN, HOLD. Next action: email Iowa DOT for written permission, or ask via the registry contact avdx@dot.gov.
- Other feeds: licence not checked per feed (UNKNOWN). Each needs its own source-permissions row, as with MN.
- Next action: build MN first; loop other keyless feeds for a `license` field before adding.

## 5. Public-domain weather alerts
- NWS: https://www.weather.gov/disclaimer VERIFIED: "The information on National Weather Service (NWS) Web pages are in the public domain, unless specifically noted otherwise, and may be used without charge for any lawful purpose so long as you do not: 1) claim it is your own..., 2) use it in a manner that implies an endorsement" (list continues; read to that point only for the quote, remainder of the page not exhaustively checked). API: https://www.weather.gov/documentation/services-web-api VERIFIED: "All of the information presented via the API is intended to be open data, free to use for any purpose." Needs a User-Agent string with our contact, no key. READY. Alerts at api.weather.gov/alerts/active. Credit NWS, imply no endorsement.
- Environment Canada: https://eccc-msc.github.io/open-data/licence/readme_en/ (Data Services End-use Licence v2.1.1) VERIFIED: "The Information Provider grants you a worldwide, royalty-free, perpetual, non-exclusive licence to use the Information, including for commercial purposes, subject to the terms below." The note on weather alerts says alert information must be reproduced in a prescribed way (page cut at that point in my read: the exact alert rule is UNKNOWN, read it before building). READY with that check. Not strictly public domain, it is a licence with attribution.

## 6. Ontario 511 and 511 Alberta
- Ontario 511: https://511on.ca/developers/resources VERIFIED: "Unless otherwise specified, Ontario 511 data made available through the Developer Resource Area is provided under the Open Government License." and "Additional requirements respecting attribution, redistribution, acceptable use, and the use of Ontario 511 trademarks and logos are outlined in this Agreement." The Open Government Licence - Ontario (https://ontario.ca/page/open-government-licence-ontario) says: "The Information Provider grants you a worldwide, royalty-free, perpetual, non-exclusive licence to use the Information, including for commercial purposes, subject to the terms below." VERIFIED. Attribution: "Contains information licensed under the Open Government Licence – Ontario." (default statement). Access: https://511on.ca/developers/doc says "Requires a developer key", "Ten calls every 60 seconds", account needed; the agreement says the Ministry "reserves the right to review requests on a case-by-case basis and determine whether access will be granted" and asks for the intended use and any third parties that display the data. The agreement's own attribution/redistribution/acceptable-use clauses were only partly read (the page body is script-rendered): UNKNOWN whether ads or camera images are restricted. Cameras images likely separate: do not assume.
  Verdict: HOLD (licence says commercial ok, but token is discretionary and agreement fine print unread). Next action: Mike creates account and requests a token describing an ad-supported directory, then reads the full agreement; do not sign up from here.
- 511 Alberta: https://511.alberta.ca/developers/doc says "Requires a developer key" and "Ten calls every 60 seconds"; no licence text. Terms on https://511.alberta.ca/about/about VERIFIED: "Reproduction of multiple copies of materials and information on this site, in whole or in part, for the purposes of commercial distribution or promotion is prohibited, except with written permission from the Government of Alberta." and the non-commercial sentence "...may be reproduced, in part or in whole and by any means, without charge or further permission..." for personal and public non-commercial (educational) use. Ads make us commercial, so this is the same conflict pattern as CBP/DGT. The Alberta Open Government Licence (https://open.alberta.ca/licence) is NOT stated for 511 data (UNKNOWN). Verdict HOLD. Next action: email 511 Alberta (Alberta Transportation and Economic Corridors, address on the About page) for written permission; link-out only meanwhile.

## Not done / unverified
- Rate limit numbers for NLR; WSDOT per-API terms for ferries; full OGL-Ontario attribution tail and the Ontario agreement's acceptable-use text; ECCC alert reproduction rule; licences of registry feeds beyond MN and Iowa; Avalanche Canada terms for the API specifically.
- Nothing signed up, no keys requested, no git.
