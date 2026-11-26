# Improved version of the owner's "fix it all" prompt (paste into a new session)

Original (2026-11-26, verbatim): "Fix it all.  And just use gev for maps etc load it in terminal and take screenshot of laptop and rea etc etc improve this prompt"

---

Goal: worldtrafficcameras.com loads, its map is God's Eye View (GEV), and it beats argosatlas.com on useful information. I am hands off. Follow CLAUDE.md and plan.md. Keep noindex until I say "go live".

Do these in order. A step is done only with the proof listed.

1. Domain: apex and www both load over https. Proof: status code, robots.txt and robots meta tag read from the live addresses.
2. Local GEV: start it in the Terminal panel, turn on the camera layer, screenshot it. Do not edit anything in gev/. Proof: screenshot, and `git -C gev status --porcelain` is empty.
3. Public map: compare /map/ with local GEV, layer by layer. Differences allowed only where plan.md closes a route. If a host is needed, give me ONE recommendation with today's price from the provider's own page, then deploy after I buy it. Proof: screenshots of both, side by side.
4. REA: run it on our own built GEV (gev/dist). List camera sources and server routes it finds, check each against our code, and add any camera source we lack to the licence queue. REA output is a lead, not proof. Raw output stays in research-private/.
5. Argos: use only what their robots.txt and terms allow, plus screenshots I take and hand you. No crawling with Claude, no sign-in, no copying their code, text, images or layout.
6. Gaps: for each thing Argos shows and we lack, name our own licensed source or the next action. Build the one with the most visitor value first.
7. Finish: tests pass, deploy run is green, live pages read back, commit and push.

Ask me only for: payment, passwords, CAPTCHAs, accepting terms, "go live". Ask for all of them in one message at the end.
Never ask me about anything you would mark "recommended": do it and report it.

Report: edge cases first, then what is proven, in plain words, under 150 words.
