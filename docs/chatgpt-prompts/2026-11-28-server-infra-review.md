# Review my server deployment before the owner buys the server

First restate in 3 lines what I am really asking.

## OWNER SAID
"k do the rest of the infrastucture. ask gemini and chatgpt to scrutinize ill buy shit last. also i wanna rank for 'godseyeview'. does that have a lot of kyp research do that shit too"

## Goal
Money first: an ad-funded site (worldtrafficcameras.com) embeds the open-source God's Eye View (GEV) map. Static copy runs today on Cloudflare Pages. Next: one Hetzner CX23 (2 vCPU, 4 GB, 40 GB disk, Ubuntu 24.04) runs GEV's own server code unchanged in Docker, reached only through a Cloudflare Tunnel, deployed hands-off from GitHub Actions. The owner is a non-coder and does nothing except buy the server and paste one SSH public key.

## Facts (sources)
- GEV repo: https://github.com/bilawalsidhu/gods-eye-view (MIT code; name is a trademark). No RAM figure in its docs; its compose sets no memory limit.
- Keys: AISStream (server only), FIRMS, Mapillary client token (public by design) are GitHub secrets. CLOUDFLARE_API_TOKEN / ACCOUNT_ID secrets exist; whether the token has Tunnel + DNS edit permission is UNKNOWN.
- gev/ must never be edited; a proxy (nginx allowlist) is the only thing that talks to GEV.

## Hard rules (verbatim)
- "gev/ files must NEVER be edited, deleted, renamed, reformatted or patched."
- "Never commit secrets."
- "Never strip proxy headers or weaken GEV security to make embedding work."
- "NOINDEX STAYS ON until Mike says "go live""

## What I did
Added keys pass-through, a cloudflared service (profile "tunnel", no ports), log caps, weekly image prune, 2 GB swap, and a workflow that creates the tunnel via API, then SSHes in as root and runs the setup script with keys on stdin. Tests: compose lint passes (tunnel may not publish ports). Not run on a real server yet.

## Exact evidence

### .github/workflows/server-deploy.yml
```yaml
# Deploy the map engine (GEV, unchanged) to the rented server, hands-off.
# Needs repo secrets: SERVER_HOST (IP), SERVER_SSH_KEY (private key whose public half is on the server for root),
# plus the existing CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID and the free keys AISSTREAM_API_KEY, FIRMS_MAP_KEY,
# MAPILLARY_CLIENT_TOKEN. With no SERVER_HOST it says so and stops green: nothing is bought yet.
# Public hostname: repo variable MAP_HOST, default live.worldtrafficcameras.com. noindex is untouched by this workflow.
name: server-deploy
on:
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: server-deploy
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      HOST_IP: ${{ secrets.SERVER_HOST }}
      MAP_HOST: ${{ vars.MAP_HOST || 'live.worldtrafficcameras.com' }}
      SITE_ORIGIN: https://worldtrafficcameras.com
      CF_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CF_ACCOUNT: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - name: No server yet?
        id: gate
        run: |
          if [ -z "$HOST_IP" ]; then echo "No SERVER_HOST secret: nothing to deploy yet."; echo "go=0" >> "$GITHUB_OUTPUT"; else echo "go=1" >> "$GITHUB_OUTPUT"; fi

      # Cloudflare Tunnel: find or create "wtc-map", route MAP_HOST to the proxy container, add the DNS record.
      # If the API token lacks Tunnel or DNS permission this step warns and the server still deploys (reachable only by IP:none).
      - name: Tunnel (Cloudflare API)
        id: tunnel
        if: steps.gate.outputs.go == '1'
        continue-on-error: true
        run: |
          set -euo pipefail
          api() { curl -fsS -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" "$@"; }
          base="https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/cfd_tunnel"
          id=$(api "$base?name=wtc-map&is_deleted=false" | jq -r '.result[0].id // empty')
          if [ -z "$id" ]; then
            id=$(api -X POST "$base" -d '{"name":"wtc-map","config_src":"cloudflare"}' | jq -r '.result.id')
          fi
          api -X PUT "$base/$id/configurations" -d "{\"config\":{\"ingress\":[{\"hostname\":\"$MAP_HOST\",\"service\":\"http://proxy:8080\"},{\"service\":\"http_status:404\"}]}}" >/dev/null
          token=$(api "$base/$id/token" | jq -r '.result')
          echo "::add-mask::$token"
          echo "token=$token" >> "$GITHUB_OUTPUT"
          zone=$(api "https://api.cloudflare.com/client/v4/zones?name=worldtrafficcameras.com" | jq -r '.result[0].id')
          rec=$(api "https://api.cloudflare.com/client/v4/zones/$zone/dns_records?name=$MAP_HOST" | jq -r '.result[0].id // empty')
          body="{\"type\":\"CNAME\",\"name\":\"$MAP_HOST\",\"content\":\"$id.cfargotunnel.com\",\"proxied\":true}"
          if [ -z "$rec" ]; then api -X POST "https://api.cloudflare.com/client/v4/zones/$zone/dns_records" -d "$body" >/dev/null
          else api -X PUT "https://api.cloudflare.com/client/v4/zones/$zone/dns_records/$rec" -d "$body" >/dev/null; fi
          echo "Tunnel $id routes $MAP_HOST to the proxy."

      - name: Deploy over SSH
        if: steps.gate.outputs.go == '1'
        env:
          SSH_KEY: ${{ secrets.SERVER_SSH_KEY }}
          TUNNEL_TOKEN: ${{ steps.tunnel.outputs.token }}
          AISSTREAM_API_KEY: ${{ secrets.AISSTREAM_API_KEY }}
          FIRMS_MAP_KEY: ${{ secrets.FIRMS_MAP_KEY }}
          MAPILLARY_CLIENT_TOKEN: ${{ secrets.MAPILLARY_CLIENT_TOKEN }}
        run: |
          set -euo pipefail
          install -m 700 -d ~/.ssh
          printf '%s\n' "$SSH_KEY" > ~/.ssh/id && chmod 600 ~/.ssh/id
          ssh-keyscan -T 20 "$HOST_IP" >> ~/.ssh/known_hosts 2>/dev/null
          # Values travel on stdin (not the command line), so they never show in the server's process list.
          {
            printf 'export AISSTREAM_API_KEY=%q FIRMS_MAP_KEY=%q MAPILLARY_CLIENT_TOKEN=%q TUNNEL_TOKEN=%q\n' \
              "$AISSTREAM_API_KEY" "$FIRMS_MAP_KEY" "$MAPILLARY_CLIENT_TOKEN" "$TUNNEL_TOKEN"
            cat <<EOF
          set -euo pipefail
          command -v git >/dev/null || { apt-get update; DEBIAN_FRONTEND=noninteractive apt-get install -y git; }
          [ -d /opt/live-camera-map/.git ] || git clone https://github.com/${GITHUB_REPOSITORY}.git /opt/live-camera-map
          cd /opt/live-camera-map && git fetch --quiet origin && git reset --quiet --hard origin/main
          bash ops/deploy/server-setup.sh "$MAP_HOST" "$SITE_ORIGIN"
          node --version >/dev/null 2>&1 && node ops/monitoring/healthcheck.mjs http://127.0.0.1:8080 "$MAP_HOST" || true
          EOF
          } | ssh -i ~/.ssh/id -o BatchMode=yes "root@$HOST_IP" bash -s

      - name: Public check
        if: steps.gate.outputs.go == '1' && steps.tunnel.outcome == 'success'
        run: |
          sleep 20
          code=$(curl -s -o /dev/null -w '%{http_code}' "https://$MAP_HOST/")
          echo "https://$MAP_HOST/ answered $code"
          [ "$code" = 200 ]
```
### ops/deploy/server-setup.sh
```bash
#!/usr/bin/env bash
# One command to turn a fresh Ubuntu server (or the CI runner) into the map engine host:
#   sudo bash ops/deploy/server-setup.sh <public hostname> <site origin>
# Run from a clone of this repo. Safe to run again (update = git pull, then this). Never edits gev/, never takes a key.
# The result listens on 127.0.0.1:8080 only; connecting a tunnel to it is a separate step (docs/deploy/runbook.md).
set -euo pipefail
host="${1:?usage: server-setup.sh <public hostname> <site origin, e.g. https://worldtrafficcameras.com>}"
origin="${2:?usage: server-setup.sh <public hostname> <site origin>}"
[[ "$host" =~ ^[A-Za-z0-9.-]+$ ]] || { echo "bad hostname: $host" >&2; exit 2; }
[[ "$origin" =~ ^https://[A-Za-z0-9.-]+$ ]] || { echo "site origin must be https://name, no path: $origin" >&2; exit 2; }
cd "$(dirname "$0")/../.."

if ! docker compose version >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 git
fi

# Nothing piles up on a 40 GB disk: container logs capped at 3 x 10 MB each, unused images pruned weekly,
# and 2 GB of swap so a memory spike slows the box instead of killing it (4 GB RAM, no measured GEV figure yet).
if [ ! -f /etc/docker/daemon.json ] && [ -d /etc/docker ]; then
  printf '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}\n' > /etc/docker/daemon.json
  systemctl restart docker || true
fi
if [ -d /etc/cron.weekly ] && [ ! -f /etc/cron.weekly/wtc-docker-prune ]; then
  printf '#!/bin/sh\ndocker image prune -af --filter until=168h >/dev/null 2>&1\ndocker builder prune -af --filter until=168h >/dev/null 2>&1\n' > /etc/cron.weekly/wtc-docker-prune
  chmod +x /etc/cron.weekly/wtc-docker-prune
fi
if [ ! -f /swapfile ] && [ -z "${CI:-}" ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

base="$(cut -d' ' -f1 ops/upstream-base.txt)"
[ -d gev/.git ] || git clone https://github.com/bilawalsidhu/gods-eye-view gev
git -C gev cat-file -e "$base^{commit}" 2>/dev/null || git -C gev fetch origin
git -C gev checkout --quiet "$base"
[ -z "$(git -C gev status --porcelain)" ] || { echo "gev/ has local changes: refusing to build" >&2; exit 1; }

printf 'GEV_ALLOWED_HOSTS=%s\nGEV_EMBED_FRAME_ANCESTORS=%s\nGEV_IMAGE_TAG=current\n' "$host" "$origin" > ops/deploy/.env

# Keep the running image for rollback (runbook "Rollback").
docker image inspect gev-pinned:current >/dev/null 2>&1 && docker tag gev-pinned:current gev-pinned:previous
# Free keys (AISSTREAM_API_KEY, FIRMS_MAP_KEY, MAPILLARY_CLIENT_TOKEN) and TUNNEL_TOKEN arrive as environment variables
# from the deploy workflow (`sudo -E`); compose reads them from the environment, so they are never written to disk here.
profile=""; [ -n "${TUNNEL_TOKEN:-}" ] && profile="--profile tunnel"
docker compose -f ops/deploy/docker-compose.yml $profile up -d --build --wait --wait-timeout 600
echo "UP: http://127.0.0.1:8080 serves $host"
docker stats --no-stream --format '{{.Name}} {{.MemUsage}} {{.CPUPerc}}' || true
df -h / | tail -1
```
### ops/deploy/docker-compose.yml
```yaml
# Public deployment: pinned GEV (built from ./gev, unchanged) behind the allowlist proxy.
# Run from anywhere:  docker compose -f ops/deploy/docker-compose.yml up -d --build --wait
# Config comes from ops/deploy/.env (copy .env.example). No secrets belong in this file or in that .env.
# Rules checked by tests/deploy/compose-lint.test.mjs: gev publishes NO port, trusted peers = none, proxy exists.
services:
  gev:
    build:
      context: ../../gev
    image: gev-pinned:${GEV_IMAGE_TAG:-current}
    restart: unless-stopped
    # Which restricted sources are switched off (generated from data/exclusion-map.json). No secrets in it.
    env_file:
      - gev-exclusion.env
    environment:
      # Session 3 finding 1: credential setup is open to a published port unless this is none. Never remove.
      GEV_KEY_SETUP_TRUSTED_PEERS: none
      GEV_ALLOWED_HOSTS: ${GEV_ALLOWED_HOSTS:?set GEV_ALLOWED_HOSTS in ops/deploy/.env}
      GEV_EMBED_FRAME_ANCESTORS: ${GEV_EMBED_FRAME_ANCESTORS:?set GEV_EMBED_FRAME_ANCESTORS in ops/deploy/.env}
      # Free keys, passed through from the server's environment by .github/workflows/server-deploy.yml (GitHub secrets).
      # Empty = that layer stays off. They are never written into git.
      AISSTREAM_API_KEY: ${AISSTREAM_API_KEY:-}
      FIRMS_MAP_KEY: ${FIRMS_MAP_KEY:-}
      MAPILLARY_CLIENT_TOKEN: ${MAPILLARY_CLIENT_TOKEN:-}
    # NO ports: only the proxy container can reach gev:4173 over the private network.
    expose:
      - "4173"
    # read_only is NOT set (documented, not tested here): GEV runs the Vite dev server, and Vite 6 writes a temp copy
    # of vite.config.js next to it in /app on every start; the app also writes .gev-cache and .gev-logs under /app.
    # A read-only root would very likely stop it booting. Hardening that does not need writes instead:
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:4173/').then((r)=>process.exit(r.ok?0:1),()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - private

  proxy:
    image: nginx:1.27-alpine
    restart: unless-stopped
    depends_on:
      gev:
        condition: service_healthy
    volumes:
      - ../proxy/nginx.allowlist.conf:/etc/nginx/nginx.conf:ro
    ports:
      # The only published port, loopback only. A tunnel or host proxy connects here.
      - "127.0.0.1:8080:8080"
    read_only: true
    tmpfs:
      - /tmp
      - /var/cache/nginx
      - /var/run
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - private

  # Cloudflare Tunnel (outbound only, no open port on the server). Started only with `--profile tunnel`;
  # its public hostname points at http://proxy:8080. The token comes from the deploy workflow, never from git.
  tunnel:
    image: cloudflare/cloudflared:2025.11.1
    profiles:
      - tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: ${TUNNEL_TOKEN:-}
    depends_on:
      - proxy
    networks:
      - private

# Ordinary bridge, not `internal`: GEV must reach the public weather/data APIs. It still has no published port.
networks:
  private: {}
```

## My question
Find what breaks or is unsafe before money is spent: security (root SSH, key handling, tunnel token, CI exposure), reliability on a 4 GB box, cost traps, anything that needs the owner that I missed. Options: (a) ship as is, (b) fix listed issues first, (c) different design (e.g. Docker image built in CI and pulled, non-root deploy user). My recommendation: (b) with a non-root deploy user and an image built on the box as now.

## Answer format
Numbered findings, worst first: problem / why / exact fix (code). Then a 3-line verdict.

GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
