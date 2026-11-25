# SENT VERSION NOTE: the guest chat cannot take zip files, so the packet below was sent as pasted text with three attachments inlined (Argos owner table, pre-commit hook, plan item list); chat 6b0639b7. Original packet text follows.

## 0. FIRST, before you answer
Restate in 3 lines what you think I am really asking and what outcome the owner wants. If the goal conflicts with a rule below, say so and say what you would ask the owner. Then read the attached zip (worldtrafficcameras-context.zip, 55 files: plan.md, CLAUDE.md, docs/source-audits, docs/decisions, earlier prompt packets, data/world-coverage.json, data/argos-maps-matrix.json, data/source-permissions.json, data/registry-sources.json, ops/run-all.json, ops/pre-commit-hook.sh, ops/production-workflow.yml, site/PAGES.md). Say at the top which files you could open and which you could not. Emails and the account id were redacted; the repository itself is public.

## 1. OWNER SAID (verbatim, typos kept)
> "Doesn't argos already list the shit they use for all their shit"
> "Can't we speed anything up"
> "Ask chatgpt"
> "Tell ChatGPT literally everything you can, including zip files, a PlanMD, etc. I want to hurry this shit up."
> Earlier today: "I keep getting adhd. are we getting sidetracked from the proper order of the plan"; "the problem is i dont trust you talking to chatgpt. i dont trust ur prompts"; "this is taking forever can we spawn multiple agents"; "I'm lazy do as much as possible for me and continue either then plan.md"; "make sure no infrastructure is missed ... not a single thing."

## 2. GOAL AND WHO IT SERVES
Mike (solo, non-coder) wants worldtrafficcameras.com live and ahead of argosatlas.com: a free, no-sign-in world traffic-camera directory (link-out only, pictures never copied) plus the GEV map embedded, earning from ads beside licensed data inside Google's rules. Target ship date in CLAUDE.md: Friday 2026-11-27 (needs his host, DNS and contact email, see plan.md section 1). He is frustrated by slowness and by being asked to repeat himself.

## 3. SITUATION (facts, each with a source: all in the zip)
- Registry today: 13,801 cameras in 10 countries, 16 sources (plan.md section 2, ops status script). Argos claims 226,203 cameras on its public pricing page (read 2026-11-24).
- Argos publishes an attributions page listing about 25 camera owners under open licences and the sources of its other layers (our notes: docs/source-audits/argos-camera-owners-2026-11-24.md, argos-feature-inventory-2026-11-24.md). We worked those leads in "round 0" (plan item 33): built Madrid city (357 cameras), parked Queensland (needs key), Northern Ireland (no dataset on OpenDataNI), Vitoria-Gasteiz and Gipuzkoa (not on the national access point), Tenerife, Singapore (8 cameras, changing picture URLs), Lyon, Loire-Atlantique, Taiwan Water Resources river cameras, MLIT regional bureaus. Argos's listed owners cannot explain 226,203 cameras, so most of its camera count comes from somewhere it does not list: I have not verified where.
- Built today from hunts: Iowa DOT 1,252, A22 Italy 13, Baton Rouge 118, Madrid 357; held for licence conflicts: Spain DGT national feed (legal notice vs CC BY), Madrid Calle 30 (mc30.es legal notice); four regional sweeps (docs/source-audits/sweep-*-2026-11-25.md) found no new clean source; key-gated leads: South Korea MOLIT dataset 3068943, Queensland, Sweden Trafikverket, Norway DATEX, Ontario 511, several US 511 sites.
- Speed facts measured today: each commit runs a pre-commit hook (ops/pre-commit-hook.sh: preflight, harness selftest, unit tests, immutability check, site build, 200+ site tests) that takes 2 to 10 minutes; several parallel agents collided on the single git index and on site/.astro builds; research agents (read-only, write one new doc each) ran 4 in parallel fine, build agents must run one at a time; one agent run per source takes 10 to 20 minutes; the licence read per source is the real bottleneck (terms pages that load by script, 403 bot walls, conflicting statements between a dataset tag and a legal notice).
- Already built today: structured metadata and image permission evidence per licence row (313 rows), camera CSV exports on /data/, five driving-order corridor pages, an Iceland road observability index, privacy page and headers.

## 4. RELEVANT HARD RULES (verbatim from CLAUDE.md, also in the zip)
- "NO image embeds, NO image proxy, NO image caching for a source unless sources.json has that permission set to allowed. Default is unverified. Never set a permission to allowed yourself."
- "If a site blocks automated access (robots.txt, 403), stop. Do not work around it."
- "Copying IDEAS from argosatlas.com is allowed ... Still never copied word for word or file for file: their prose, source code, images, logos and brand name."
- "God's Eye View (GEV) ... files must NEVER be edited." Pinned base ops/upstream-base.txt.
- "NOINDEX STAYS ON until Mike says go live in chat."
- Every licence row, quoted sentence and the three tests (helpful, information gain, helpful-content review) gate what ships.

## 5. WHAT I DID AND WHY, INCLUDING FAILURES
Worked plan items in order, used agents for builds one at a time and for research four at a time, never bypassed a 403 or bot check, held sources whose licence statements conflict. Failures: my first "Spain: build next" call was too strong and an agent correctly stopped it; four hunt agents' commits collided and I committed their files myself; I mis-stated stale counts earlier in the session; Gmail sending was refused by the permission check so provider emails are drafts only (docs/outreach). The owner distrusts my earlier ChatGPT prompts, so this packet pastes his exact words and attaches the real files instead of summaries.

## 6. EXACT EVIDENCE
In the zip. Most useful: plan.md (items 28 to 39, section 1 owner steps, section 9 ChatGPT log), docs/source-audits/argos-camera-owners-2026-11-24.md, argos-feature-inventory-2026-11-24.md, world-coverage.json (80 rows with next actions), sweep files, ops/pre-commit-hook.sh and ops/production-workflow.yml (for the speed question).

## 7. MY QUESTIONS (full)
(1) ARGOS'S SOURCE LISTS: from the Argos notes in the zip, list EVERY source Argos itself names (camera owners and every non-camera layer source), mark which ones we have NOT worked, and for each give the most likely free, licensed, keyless way for a link-out directory to use it, saying "no URL known" instead of guessing. Also tell me which of Argos's categories might supply their 226,203 total (aggregators, webcam networks, private cameras) and which of those would be legal for us.
(2) SPEED, SAFELY: given section 3's measurements, what are the five changes that would cut elapsed time most without weakening any gate? Cover: running the pre-commit hook on changed paths only, per-agent git worktrees for parallel builds, batching several sources per commit, a source-onboarding template/generator so one agent does a source in minutes, a licence-read checklist or helper, CI sharding, caching. For each: time saved, risk, which hard rule it touches, how to test it, and your recommendation.
(3) ORDER: look at plan.md items 28 to 39 and the owner's sign-up list (section 1 row 19). Are we in the right order for shipping Friday 2026-11-27 and then growing traffic? What should be cut, merged or moved up? Be specific.
(4) WHAT AM I MISSING: any infrastructure, legal, SEO or data gap in plan.md that an expert would ask about first.

## 8. WHAT I WANT BACK
Short restatement and the list of files you opened; (1) a table; (2) five numbered changes with the fields above; (3) a reordered list with reasons; (4) a ranked list. Label every claim SURE or GUESS. Say "could not verify" or "no URL known" instead of guessing.

## 9. GAP CHECK
GAP CHECK before you answer: list what is MISSING from my situation or this prompt that would change your answer (facts, numbers, files, constraints, risks, alternatives, and the questions an expert reviewer would ask me first), ranked by how much each would change your verdict. For each item say how I can check it (command, file, URL or person). Name the assumption in my prompt most likely to be wrong. If nothing is missing, say 'nothing missing' and list what you checked. Do not fill gaps with guesses.
