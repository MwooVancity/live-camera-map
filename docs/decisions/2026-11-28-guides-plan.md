# Guides plan (2026-11-28): ChatGPT + Gemini + Claude

Packet: docs/chatgpt-prompts/2026-11-28-guides-debate.md. ChatGPT temp chat 6b0a33d9 read to its verdict; Gemini chat 8b4ddbfe read to the end (Gemini then hit its usage limit until 21:01).
Both say: Photocraft wins on product usefulness, not URL count; build a knowledge base, not a blog. Each guide must carry our own data (health checks, inventory, agency sources) or it is not built.

## Build, in order (all agreed unless marked)
1. Why is a traffic camera black, frozen or showing an old picture? (troubleshooting with our health-check states; say exactly what the checker can and cannot detect) - both P1
2. How to find traffic cameras near you / along your route (city + road pages, I-5 example) - both P1
3. How to tell if a road is really closed (cameras support, official reports decide) - Gemini P1, ChatGPT P2
4. How to read the map layers: live vs simulated vs estimated (only layers our build actually has) - both P1/P2
5. How we check 24,561 camera links (method, frequency, limits; dated count) - ChatGPT add, Claude agrees
6. How often traffic cameras refresh, by agency: published figure vs our observed figure, each dated (WSDOT ~2 min, ODOT 5 s, DriveTexas 5 min per ChatGPT: UNVERIFIED until read on the agency pages) - ChatGPT P1, Gemini would fold into #1; Claude: build only for agencies with a published figure
7. Agency guides (WSDOT, then ODOT, TxDOT) only where facts differ per agency - both P2
8. Winter driving: merge into the existing chain-control guide, not a new page - both
9. God's Eye View explained (official project, compatible maps, us; "based on" wording) - ChatGPT P2, Gemini cut; Claude: build, owner wants the query and the brand page allows it
10. One dated, hands-on comparison (us, Argos, GodsViewAI, godseyeview.space) - ChatGPT P2, Gemini cut; Claude: later, after 1-5

## Cut (agreed)
Separate /online page (the map is the product); release-note pages; per-city or per-country "how to use cameras" clones; rewrites of the 9 existing guides; generic "what is a traffic camera"; best/top-10 lists; machine translations. Spanish only after the English page passes the info-gain debate. Legal guide: ChatGPT cut, Gemini P3 -> cut for now (jurisdiction-specific).

## Corrections sent back / noted
- ChatGPT said the Photocraft fetch date (2026-11-28) is in the future; wrong, today is 2026-11-28 here.
- ChatGPT says Argos already has a "God's Eye View online" comparison page (UNVERIFIED; Claude may not open Argos).
