# Big-picture info-gain debate, round 2 (2026-11-28)

Packet: docs/chatgpt-prompts/2026-11-28-big-picture-round2.md. ChatGPT temp chat 6b0a4c95 read to its last line. Verdict: "not ready for an information-gain completeness sign-off".

## Accepted (build)
1. Split river cameras (MLIT, Taiwan WRA) from traffic cameras in totals and headlines. VERIFIED: sources.json describes MLIT as river cameras.
2. Order changed: unchecked gap -> catalogue + permission audit (duplicates, coordinates, missing fields, runtime use of each permission) -> reliability history -> road fusion -> border/pass -> countries.
3. Status words explained on every camera (ok / unknown / unavailable / stale / placeholder) and what the checker cannot see (wrong view, frozen scene).
4. Nearest working alternative on the same road and direction when a camera is down.
5. Route coverage on road pages: distance between cameras, longest gap.
6. Observed refresh interval per camera, separate from agency claim.

## Rejected or already done
- "plan.md says 9,457 cameras from 10 sources": WRONG, grep finds no such figure in plan.md.
- Camera direction field: already present (24,382 records carry direction/heading).
- Homepage still shows 14,169 unchecked: expected; fix 878e357 shows after the next health run.
- /src/ open on the proxy allowlist: server-only (not deployed); TeleGeography and UCS denied first. Re-checked when the server is bought.
- Localized names, WCAG, coverage confidence: kept as checks inside existing pages, not new features.
