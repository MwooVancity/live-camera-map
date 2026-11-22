# GEV baseline (Session 1)

Date: 2026-11-21. Windows 11, Node v24.18.0, git 2.54, no Docker. gev/ at aac6be77735f6bcad583204724a43302227abc4d, clean (`git status --porcelain` empty) before and after.
Logs: `ops/logs/baseline/`. Runner: `ops/run-baseline.sh`.

| # | Command | Exit | Verdict |
|---|---|---|---|
| 1 | npm ci | 0 | pass |
| 2 | npm run format:check | 0 | pass |
| 3 | npm run check:boundaries | 0 | pass |
| 4 | npm test | 1 | ENVIRONMENTAL FAIL, see below |
| 5 | npm run build | 0 | pass |
| 6 | npm run qa:stub-boot | 0 | pass |
| 7 | npm run qa:conformance | 0 | pass |
| 8 | npm run qa:stories | 1 | first run: no server on :4173 (script needs a preview server). Rerun with `vite preview --port 4173` up: exit 0 (log 08b). Pass with prerequisite |
| 9 | npm run test:perf | 1 | FAIL, unexplained, see below |

## 4 npm test: environmental (Windows)
`scripts/run-unit-tests.mjs` passes ~1,240 test paths on one command line to `spawnSync`; Windows rejects it: `Error: spawnSync ...node.exe ENAMETOOLONG`. No test ran. Fix needs an edit under gev/, which is forbidden. Not fixed.
Supplemental run (NOT a substitute): `node --test` with globs, with and without `--import=./build/registerVue.js`. Without the flag: 278 of 12,991 fail, mostly `.vue` unknown extension (my invocation was wrong). With the flag and `--test-concurrency=1` it exceeded 10 min and was stopped. So unit tests have NOT been shown to pass here. Real result needs Linux (CI) or WSL.

## 9 test:perf: FAIL, cause not proven
Run 1: 1 fail, `longest layer CPU slice 6.809ms exceeds 4ms` (wildlifeSightings render.perf). Rerun: 2 fail (10.802ms vs 8ms; 9.874ms vs 4ms). Tests are timing budgets; likely slow/noisy Windows machine, but unproven. Thresholds not changed. Open: rerun on Linux CI to separate environment from real regression.

## Linux CI result (GitHub Actions ubuntu-latest, Node 24, run 44970691034, 2026-11-22)
All steps passed, including `npm test` (so #4 was purely a Windows ENAMETOOLONG issue) and `qa:stories`, except `npm run test:perf`: 1 of 2 fail, `longest layer CPU slice 5.088ms exceeds 4ms`. So perf fails on Linux too, on a shared runner. Still unproven whether it is runner noise or a real upstream issue; thresholds untouched. Treat test:perf as a known-flaky/unresolved baseline item; do not use it as a gate until explained.

## Immutability
`node tests/immutability/check.mjs` exit 0. `node --test tests/immutability/immutability.test.mjs` 6/6 pass (real gev clean, control clone, deliberate edit, deletion, untracked file, wrong HEAD all caught). Note `node --test tests/immutability/` (directory form) fails on Node 24; use the file path.
