# Page list (provisional, from real coverage)

Mike delegated the page list to Claude (2026-11-22). Status: PROVISIONAL. It comes from the real camera registry, not from keyword research. Replace it when Mike's keyword research arrives.

Rules used to choose it:
- A city page exists only if the registry holds at least 3 cameras for that city. The 10 cities with the most cameras are picked (ties broken A to Z). Rule lives in `src/lib/pages.mjs` (`curatedCities`).
- A region hub exists only if the registry holds at least 3 cameras for that region. Ontario and Alberta have none yet, so they are not generated.
- Any page whose count is below 3 is `noindex` and left out of the sitemap (`isIndexable`, tested).
- Coverage: all 12 Caltrans districts loaded on the 2026-11-22 import (data/camera-registry/import-report.json, failedDistricts empty). An earlier note blamed a server error for districts 01-09; that was a wrong URL (unpadded district in the folder, padded in the file name), not an outage. Re-run `node ops/importers/caltrans.mjs` to widen it; the list then recomputes at the next build.

Every line carries "Beats Argos by:". The Argos pages for the same places were not opened; the claims below are about what our page contains.

## Pages (19 indexable)
- `/` Beats Argos by: one short answer with the real camera total and the date it was counted, then straight links to the busiest cities.
- `/map/` Beats Argos by: real crawlable links to every region and city page next to the map, and a page that still works when the map engine is down.
- `/cameras/` Beats Argos by: one registry number for every count, so the hub, region and city counts cannot disagree.
- `/cameras/california/` Beats Argos by: lists the age and state of every live feed (fresh, older than its limit, licence not enabled, districts that did not load) next to the count, and says which Caltrans districts loaded and which failed, so the count is never presented as complete when it is not.
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
- `/guides/what-live-road-conditions-mean/` Beats Argos by: explains each live block (closures, chain controls, signs, road weather, forecast, alerts) from the feed owners' own documentation, with its update rhythm and the exact rule for when a block is hidden, which Argos does not publish.
- `/guides/camera-link-is-dead/` Beats Argos by: a short fix-it path for a dead link, tied to our own health statuses.

## Not indexed
- `/404.html` (noindex, not in sitemap).
- Any city or region that falls below 3 cameras after a re-import.

## Live blocks on city pages (plan section 12, built 2026-11-22)
Each block is a server-rendered `<section data-block data-source data-asof>` with source link, attribution and an "Updated" time, text only. It is omitted when its licence row is not enabled (`tests/licensing/gate.mjs`), when its data is older than its max age at build, or when nothing is within 15 km of the city centre. One function (`site/src/lib/live.mjs`, `cityBlocks`) decides all of that and produces every number shown. No block appears on pages without data, so the blocks present differ per city.
- `road-conditions` (max age 15 min) Beats Argos by: shows only closures in effect now plus chain controls, each with its own distance from the city, delay and end time from Caltrans, instead of a flat statewide list.
- `message-signs` (15 min) Beats Argos by: the exact sign wording with the time the message was set, and a warning that a sign can keep an old message, so an old message is never passed off as current.
- `road-weather` (60 min) Beats Argos by: stations on the nearby roads with the reading time, and an honest note that Caltrans does not state the units; stations that stopped reporting are dropped.
- `forecast` (180 min) Beats Argos by: the next 48 hours from the National Weather Service on the same page as the cameras and road data, with source link and fetch time.
- `weather-alerts` (180 min) Beats Argos by: official active alerts for the city point beside the road conditions, hidden when none are active rather than shown as an empty box.
- `feed-freshness` (region page) Beats Argos by: one line per live feed with its last fetch time and which Caltrans districts failed to load.
Not built: CHP incidents and Canadian 511 (no licence row or importer yet).
