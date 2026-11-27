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

base="$(cut -d' ' -f1 ops/upstream-base.txt)"
[ -d gev/.git ] || git clone https://github.com/bilawalsidhu/gods-eye-view gev
git -C gev cat-file -e "$base^{commit}" 2>/dev/null || git -C gev fetch origin
git -C gev checkout --quiet "$base"
[ -z "$(git -C gev status --porcelain)" ] || { echo "gev/ has local changes: refusing to build" >&2; exit 1; }

printf 'GEV_ALLOWED_HOSTS=%s\nGEV_EMBED_FRAME_ANCESTORS=%s\nGEV_IMAGE_TAG=current\n' "$host" "$origin" > ops/deploy/.env

# Keep the running image for rollback (runbook "Rollback").
docker image inspect gev-pinned:current >/dev/null 2>&1 && docker tag gev-pinned:current gev-pinned:previous
docker compose -f ops/deploy/docker-compose.yml up -d --build --wait --wait-timeout 600
echo "UP: http://127.0.0.1:8080 serves $host"
