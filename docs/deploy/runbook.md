# Deploy runbook

Everything here is written but not yet run on a real host. Proof so far: the offline lint (`tests/deploy/compose-lint.test.mjs`). The Docker proof is the manual workflow `session5-compose` (run it first and read it).

Stack: `ops/deploy/docker-compose.yml` = `gev` (pinned upstream, built from `./gev`, no published port) + `proxy` (nginx allowlist, only `127.0.0.1:8080`). A tunnel or host proxy connects to `127.0.0.1:8080`; nothing else ever connects to gev.

## Deploy
One command on a fresh Ubuntu server, from a clone of this repo (does steps 1 to 3; CI workflow `session5-compose` runs the same script):
`sudo bash ops/deploy/server-setup.sh <map hostname> https://worldtrafficcameras.com`
Then steps 4 and 5. By hand:
1. On the host: clone the repo, then clone upstream into `gev/` and check out the hash in `ops/upstream-base.txt` (`git clone https://github.com/bilawalsidhu/gods-eye-view gev && git -C gev checkout <hash>`). Never edit `gev/`.
2. `cp ops/deploy/.env.example ops/deploy/.env`, set `GEV_ALLOWED_HOSTS` (public hostname) and `GEV_EMBED_FRAME_ANCESTORS` (the Astro site origin). No keys or passwords in that file.
3. `docker compose -f ops/deploy/docker-compose.yml up -d --build --wait`
4. `node ops/monitoring/healthcheck.mjs http://127.0.0.1:8080 <your hostname>` must print four `HEALTH OK`.
5. Point the tunnel/proxy at `127.0.0.1:8080`, then run the healthcheck against the public URL and set the repo variable `HEALTH_BASE_URL`.

## Rollback
Fast (previous image still on the host): before every deploy run `docker tag gev-pinned:current gev-pinned:previous`. To roll back: `GEV_IMAGE_TAG=previous docker compose -f ops/deploy/docker-compose.yml up -d --no-build --force-recreate --wait`.
By digest: note `docker image inspect gev-pinned:current --format '{{.Id}}'` after each good deploy (keep it in the commit message or a note); to return, `docker tag <that id> gev-pinned:previous` and use the command above.
Config/code change: `git revert <commit>`, push, pull on the host, redeploy (step 3). Then run the healthcheck.

## Kill switch (turn the public site off, keep gev private)
- Fastest: `docker compose -f ops/deploy/docker-compose.yml stop proxy`. Public gets a connection error; gev stays unreachable.
- Or stop the tunnel / remove the DNS record (Mike). Do not publish gev's port as a "temporary fix".
- Back on: `docker compose -f ops/deploy/docker-compose.yml start proxy`.

## A restricted source is found live
1. Kill switch first (above). Do not debug while it is public.
2. Find the route/asset; add it to `deny` in `data/proxy-allowlist.json` and the matching `$deny_asset` line in `ops/proxy/nginx.allowlist.conf` (both, they must stay in sync), and the source's switch to `ops/deploy/gev-exclusion.env` if one exists. Never edit `gev/`.
3. Add the path to `data/exclusion-map.json`; run `tests/exclusion` and `tests/security/methods.mjs` (the `session4-exclusion` workflow); confirm a failing-then-passing result.
4. Redeploy, run the healthcheck, switch the proxy back on. Record what happened in `docs/decisions/`.
5. If the source's permission is unknown, it stays disabled (CLAUDE.md rule). Austin and Caltrans packs have no env switch (gap CCTV-NOSWITCH): only the proxy blocks them.

## Mike-only steps
- Choose the host and domain/subdomain; create the host account (spending decision).
- Cloudflare Tunnel and DNS (account, tunnel token stays on the host, never in git).
- Decide the final `GEV_ALLOWED_HOSTS` and `GEV_EMBED_FRAME_ANCESTORS` values.
- Set the GitHub repo variable `HEALTH_BASE_URL` after the site is live.
- Run `session5-compose` once from the Actions tab and say whether it is green.

## Known unverified
`read_only` is deliberately off for gev (Vite writes next to its config); not tested whether it could be on. The `proxy` read-only root and tmpfs list are untested until `session5-compose` runs. The nginx image is pinned by tag, not digest.
