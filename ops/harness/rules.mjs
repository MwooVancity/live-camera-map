// Every rule of this project. A rule with enforcedBy = a file that really blocks the violation is ENFORCED.
// A rule with enforcedBy = null is a NOTE (PENDING): it blocks nothing. `node ops/harness/selftest.mjs` lists both
// and fails if an ENFORCED rule's file is missing. Add a rule here in the same change that adds its gate.
export const RULES = [
  { id: 'gev-immutable', text: 'Nothing under gev/ is edited, created, deleted or moved.', enforcedBy: ['ops/harness/hook-pretool.mjs', 'tests/immutability/check.mjs', '.github/workflows/immutability.yml'] },
  { id: 'no-secrets', text: 'No secret in git, HTML or logs.', enforcedBy: ['ops/audit/scan-summary.mjs'] },
  { id: 'licence-gate', text: 'A source is enabled only if allowed_per_doc, attributed, reviewed under 180 days ago, and not mustNotShip.', enforcedBy: ['tests/licensing/gate.mjs', 'tests/licensing/licensing.test.mjs'] },
  { id: 'restricted-unreachable', text: 'No restricted or unknown source is reachable by a visitor through the proxy.', enforcedBy: ['tests/exclusion/exclusion.test.mjs', 'tests/exclusion/proxy-proof.mjs'] },
  { id: 'proxy-allowlist', text: 'The proxy allows only listed routes and methods; credential setup is never reachable.', enforcedBy: ['tests/security/methods.mjs', 'tests/security/probe.mjs'] },
  { id: 'deploy-lint', text: 'GEV port is never published, trusted peers none, no secret in compose.', enforcedBy: ['tests/deploy/compose-lint.test.mjs'] },
  { id: 'preflight', text: 'Workflow YAML valid, action tags exist, no add_header inside an nginx if.', enforcedBy: ['ops/lint/preflight.mjs', 'ops/lint/preflight.test.mjs'] },
  { id: 'link-out-only', text: 'No camera image, thumbnail or stream appears on any page.', enforcedBy: ['ops/harness/page-gate.mjs'] },
  { id: 'silo', text: 'Every page is reachable from / within 3 clicks; city pages link to parent hub, 3+ related cities, a guide and the map; hubs link to every child; no orphan.', enforcedBy: ['ops/harness/page-gate.mjs'] },
  { id: 'block-proof', text: 'Every data block on a page names its source and as-of time.', enforcedBy: ['ops/harness/page-gate.mjs'] },
  { id: 'one-number-one-source', text: 'Every count on a page equals the registry count.', enforcedBy: null },
  { id: 'beats-argos', text: 'Every page and block states "Beats Argos by: ..." in its PAGES.md entry.', enforcedBy: ['ops/harness/page-gate.mjs'] },
  { id: 'prompt-line0', text: 'Line 0 is printed every request.', enforcedBy: ['ops/harness/hook-prompt.mjs'] },
  { id: 'commit-gate', text: 'A commit runs preflight, harness selftest and the unit tests.', enforcedBy: ['.githooks/pre-commit'] },
  { id: 'no-near-duplicate', text: 'No two landing pages share more than 60% of their sentences.', enforcedBy: ['ops/harness/page-gate.mjs'] },
  { id: 'revenue-slots', text: 'Ad slots only after each source permits images/data beside ads (plan section 10).', enforcedBy: null },
  { id: 'health-honest', text: 'A block with no or stale data hides; never shows old data as current.', enforcedBy: null },
];
