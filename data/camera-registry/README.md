# Camera registry

`cameras.json` is the list of cameras the site shows. `sources.json` says where each came from and what we are allowed to do with it. `import-report.json` is the last run's log (which districts worked, what was dropped).

## Refresh (on your own machine)

    node ops/importers/caltrans.mjs

It asks all 12 Caltrans districts for their camera list, cleans it, and writes the files here. If any district fails (Caltrans sometimes returns "500 Internal Server Error"), it writes nothing and keeps the old files. Try again later. `--allow-partial` only works when no file exists yet.

Check it: `node --test tests/registry/registry.test.mjs`

## Link-out only

Each camera has a link to the official Caltrans source. We store no pictures, thumbnails or video addresses beyond that one link, and the site must not show or copy camera images. Every permission in `sources.json` is `unverified` until Mike reads the source's terms and confirms. Until then, link-out is all we do.

## Known gaps

- Ontario 511 and Alberta 511 are placeholders waiting for API keys.
- `officialUrlLastVerified` is empty: the importer does not check that links work (the health checker will).
- Camera cities come from Caltrans' "nearby place" text, which can be blank. Those cameras are in the totals but in no city count.

## British Columbia (DriveBC), added 2026-11-22

    node ops/importers/drivebc.mjs                (cameras + road events)
    node ops/importers/drivebc.mjs --only=cameras (the camera list only; rewrites only the drivebc rows of cameras.json)
    node ops/importers/drivebc.mjs --only=events  (Open511 road events -> data/conditions/bc-events.json)

`cameras.json` holds every source. Each importer rewrites ONLY its own `sourceId` rows and keeps the others as they were (`mergeSource` in `ops/importers/lib/registry.mjs`, tested). `import-report-drivebc.json` is the BC log. The importer reads the BC Data Catalogue record first and stops if its licence title is no longer "Open Government Licence - British Columbia". DriveBC gives no city field: a camera's `city` is the place in its own name, kept only when DriveBC's own caption also names it as a location (`bcPlace`); `direction` is the way the camera looks ("Facing South"), not traffic direction; `locationText` is DriveBC's caption.
