# CBP border wait times feed (read 2026-11-25) - verdict HOLD

- Feed: https://bwt.cbp.gov/xml/bwt.xml answers 200 application/xml, no key, 85 ports, last_updated_date 2026-11-25 (VERIFIED, curl).
- bwt.cbp.gov/robots.txt: 404 (no rules). The site page is a script app with no terms of its own.
- Terms found are on www.cbp.gov/site-policy-notices/privacy-policy and they conflict:
  1. "Information presented on the site is considered public information and may be distributed or copied for non-commercial purposes, except where third party copyright notification exists."
  2. "Unless a copyright is indicated, information on the U.S. Customs and Border Protection website is in the public domain and may be reproduced, published or otherwise used without the permission of the CBP. We request only that the CBP be cited as the source."
- Neither names bwt.cbp.gov or the XML feed. Ads make our use commercial, so sentence 1 would forbid it and sentence 2 would allow it. Same pattern as the DGT hold: conflicting statements = HOLD.
- Next action: email CBP (draft in docs/outreach/us-states.md style) asking whether the XML feed may be linked and its wait times shown beside ads, credit "Source: U.S. Customs and Border Protection". Build nothing until written reply; a page that only links to the official bwt.cbp.gov page without the numbers needs no feed permission.
