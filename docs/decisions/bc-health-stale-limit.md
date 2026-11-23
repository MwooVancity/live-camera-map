# BC camera health: pace and stale limit (2026-11-22)

Config lives in `ops/health/check.mjs` (`CONFIG.perSource.drivebc`), tested in `tests/health/health.test.mjs`.

- Pace: 3 workers, at least 300 ms between requests to www.drivebc.ca (about 3 requests a second), HEAD only. Why: DriveBC publishes no rate limit and the BC API terms say the provider "may, without notice, impose and or adjust limits". The 1,036 BC cameras take about 6 minutes at this pace, in parallel with Caltrans (different host). Global request cap raised from 4,000 to 6,000 (3,263 Caltrans + 1,036 BC + retries), otherwise the cap would turn the run into a partial one and the old health.json would stay.
- Real run on 2026-11-22 (HEAD, 20 evenly spaced BC cameras, `--source drivebc --sample 20`): 20 of 20 reachable, 20 requests, 5.9 s, no 429, all `image/jpeg` of 8 to 74 KB.
- Stale limit: 4 hours. It cannot trigger today. A stale check needs the server's `Last-Modified`, and www.drivebc.ca sends only `ETag`, `Date` and `Expires` on the picture URLs (read with curl -I on 3 cameras). So a BC camera is `reachable` or `unavailable`; it is never `stale`, and `reachable` for BC means "answered with a JPEG", not "the picture is recent". The checker still fills `lastChanged` from the ETag.
- Observation, UNVERIFIED: the first part of the ETag decodes (as a hex Unix time) to a moment 0 to 10 minutes before `Date`, which looks like nginx's "mtime-size" format. It is not a DriveBC promise, so the checker does not use it. If DriveBC confirms it, staleness for BC could be derived from it.
- Runs that name one source (`--source`) never write `health.json`.
