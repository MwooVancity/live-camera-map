# Scan policy (session 3B recon)
Scans: npm audit (prod, lockfile), Trivy image (HIGH,CRITICAL), Trivy secret scan of gev/, CycloneDX SBOM. Workflow: session3b-scan.
Release blockers:
- Any secret found in the gev tree or image (the job exits 1 on it).
- Any CRITICAL with a fix available in a runtime dependency reachable from the browser or the server.
Accepted for beta (recorded, reviewed each release, not blocking):
- HIGH with or without a fix, CRITICAL with no fix yet, and anything in dev-only, build-only or OS base-image packages not reachable at runtime.
- Counts are recon only: the job never fails on them. Reachability is judged by hand against the route inventory.
Every run records the image ID next to its results.
