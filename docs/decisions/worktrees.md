# Per-agent worktrees (plan item 40 step 1)

## The problem, in plain words
Several agents working in one folder share one git "staging area" (the index) and one `site/.astro` build folder. When two of them commit or build at the same time, one blocks or breaks the other (the pre-commit hook failed with `.astro` errors). Each agent should work in its own copy of the repo, and one person (the merger) puts the finished work together.

## How to use it
- Make a workspace: `node ops/worktree/worktree.mjs create <agent>`. This makes branch `agent/<agent>` and the folder `C:\Users\mwoo7\Desktop\live-camera-map-worktrees\<agent>` (beside the repo, never inside it). The upstream clone (`gev/`) and `site/node_modules` are Windows junctions (folder shortcuts) to the main tree, so nothing is copied or installed.
- Work and commit in that folder. The normal pre-commit hook runs there.
- Merge: from the main repo, `node ops/worktree/worktree.mjs merge <agent>`. It refuses a dirty main tree, refuses a branch that touches `gev/` or a shared file, rebases the branch on main, runs the pre-commit suite once, then fast-forwards main (no merge commits).
- Clean up: `node ops/worktree/worktree.mjs remove <agent>`. It removes the junctions first so nothing in the main tree is deleted.

## What an agent may edit
Only its own files: `ops/importers/<id>.mjs`, `ops/importers/lib/<id>.mjs`, `tests/registry/<id>.test.mjs`, `tests/registry/fixtures/<id>-*`, source notes under `docs/`, and its patch `ops/importers/patches/<id>.patch.json`.

## Shared files (nobody edits them directly in a worktree)
`data/camera-registry/cameras.json`, `data/camera-registry/sources.json`, `data/source-permissions.json`, `data/source-permissions.manual.json`, `ops/importers/run-all.json`, `data/world-coverage.json`, `plan.md`, `site/PAGES.md`, `site/src/layouts/Base.astro`, `site/src/lib/pages.mjs` (and `gev/`, which nobody edits at all).

The edits those files need for a new source are produced by the scaffold (`node ops/importers/new-source.mjs <id> ...`) as a reviewable patch file. The merger applies it in the main tree (`--apply`), so two agents never edit the same shared file. The generated files (`cameras.json`, `sources.json`, `source-permissions.json`) come from running the importer and `ops/audit/build-inventory.mjs` once, in the merger's tree.

`--allow-shared` on merge overrides the shared-file refusal for one deliberate case (for example a plan.md update). It never overrides the `gev/` refusal.

## Limits and costs (measured 2026-11-24, see plan.md item 40)
See the numbers recorded in plan.md item 40. Junctions share one `site/node_modules`: if one agent runs `npm install` it changes it for all, so installs happen in the main tree only.
