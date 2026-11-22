# live-camera-map

A fully free live world map and camera directory (no paywall, no account wall), built on God's Eye View with Argos Atlas as the blueprint.

Read first: `CLAUDE.md` (rules), `plan.md` (decisions and build order), `docs/decisions/red-team-round3.md` (gates and kill criteria).

## Layout
- `gev/` upstream God's Eye View. NOT in this folder yet. Clone it and pin: `git clone https://github.com/bilawalsidhu/gods-eye-view gev && cd gev && git checkout $(cut -d' ' -f1 ../ops/upstream-base.txt)`. Never edit it.
- `site/` Astro SEO site (`/` and `/map/`).
- `ops/` deploy, proxy, monitoring, camera-health, `upstream-base.txt`.
- `data/camera-registry/` sources, permissions, cameras.
- `tests/` immutability, licensing, integration, e2e, security.
- `docs/` decisions, source audits, research (ChatGPT transcripts).
- `prompts/` master prompts for Claude Code sessions.

## Next step
Session 1: freeze and baseline. Session 3 is the go/no-go for the whole GEV approach.
