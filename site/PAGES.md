# Page list (provisional, from real coverage)

Mike delegated the page list to Claude (2026-11-22). Status: PROVISIONAL. It comes from the real camera registry, not from keyword research. Replace it when Mike's keyword research arrives.

Rules used to choose it:
- A city page exists only if the registry holds at least 3 cameras for that city. The 10 cities with the most cameras are picked (ties broken A to Z). Rule lives in `src/lib/pages.mjs` (`curatedCities`).
- A region hub exists only if the registry holds at least 3 cameras for that region. Ontario and Alberta have none yet, so they are not generated.
- Any page whose count is below 3 is `noindex` and left out of the sitemap (`isIndexable`, tested).
- Coverage today is partial: Caltrans districts 10, 11 and 12 only (districts 01-09 returned a server error on import). Cities here are all in the south and the Central Valley. Re-run `node ops/importers/caltrans.mjs` to widen it; the list then recomputes at the next build.

Every line carries "Beats Argos by:". The Argos pages for the same places were not opened; the claims below are about what our page contains.

## Pages (18 indexable)
- `/` Beats Argos by: one short answer with the real camera total and the date it was counted, then straight links to the busiest cities.
- `/map/` Beats Argos by: real crawlable links to every region and city page next to the map, and a page that still works when the map engine is down.
- `/cameras/` Beats Argos by: one registry number for every count, so the hub, region and city counts cannot disagree.
- `/cameras/california/` Beats Argos by: says which Caltrans districts loaded and which failed, so the count is never presented as complete when it is not.
- `/cameras/california/anaheim/` Beats Argos by: every camera as a named official link, roads with counts and direction splits, source and registry date, and an honest "not checked yet" health line.
- `/cameras/california/corona/` Beats Argos by: every camera as a named official link, roads with counts and direction splits, source and registry date, and an honest "not checked yet" health line.
- `/cameras/california/irvine/` Beats Argos by: every camera as a named official link, roads with counts and direction splits, source and registry date, and an honest "not checked yet" health line.
- `/cameras/california/los-angeles/` Beats Argos by: every camera as a named official link, roads with counts and direction splits, source and registry date, and an honest "not checked yet" health line.
- `/cameras/california/oakland/` Beats Argos by: every camera as a named official link, roads with counts and direction splits, source and registry date, and an honest "not checked yet" health line.
- `/cameras/california/riverside/` Beats Argos by: every camera as a named official link, roads with counts and direction splits, source and registry date, and an honest "not checked yet" health line.
- `/cameras/california/sacramento/` Beats Argos by: every camera as a named official link, roads with counts and direction splits, source and registry date, and an honest "not checked yet" health line.
- `/cameras/california/san-bernardino/` Beats Argos by: every camera as a named official link, roads with counts and direction splits, source and registry date, and an honest "not checked yet" health line.
- `/cameras/california/san-diego/` Beats Argos by: every camera as a named official link, roads with counts and direction splits, source and registry date, and an honest "not checked yet" health line.
- `/cameras/california/san-jose/` Beats Argos by: every camera as a named official link, roads with counts and direction splits, source and registry date, and an honest "not checked yet" health line.
- `/guides/how-to-read-last-checked-status/` Beats Argos by: explains camera health statuses (reachable, stale, unavailable, unknown) that Argos does not report.
- `/guides/what-link-out-only-means/` Beats Argos by: states plainly what we show and do not show, and why, with the permission status of the data.
- `/guides/how-caltrans-cameras-work/` Beats Argos by: describes the real source, which districts we hold, what was dropped and what the "city" field really is.
- `/guides/camera-link-is-dead/` Beats Argos by: a short fix-it path for a dead link, tied to our own health statuses.

## Not indexed
- `/404.html` (noindex, not in sitemap).
- Any city or region that falls below 3 cameras after a re-import.
