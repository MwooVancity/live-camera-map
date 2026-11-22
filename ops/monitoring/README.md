# Monitoring

`healthcheck.mjs <baseUrl> [hostHeader]` checks the public site: `/` is 200, `/?embed=1` sends a `frame-ancestors` CSP, `/api/setup/status` is 403, one restricted route (`/api/ghostmaps/catalog`) is 403. It prints one `HEALTH FAIL` line per problem and exits 1.

Scheduled run: `.github/workflows/health.yml` runs every 30 minutes (the fastest we allow; the repo is public so Actions minutes are free). It reads the base URL from the repo variable `HEALTH_BASE_URL` (Settings > Secrets and variables > Actions > Variables; a variable, not a secret, because the URL is public). Unset = the job is skipped, no failure.

When it fails GitHub emails the person who last edited the workflow. Caveats: GitHub switches scheduled workflows off after 60 days with no repo activity, and cron runs can be delayed or dropped under load, so this is a coarse alarm, not an uptime guarantee. It checks only the proxy front door from GitHub's network; it cannot see inside the host.
