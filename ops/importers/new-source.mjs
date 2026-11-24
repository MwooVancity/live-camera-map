// Scaffold for a new camera source (plan item 28 stage 4).
// Usage: node ops/importers/new-source.mjs <short-id> [--template=nsw]
//   <short-id> lowercase letters and digits only, e.g. "wsdot" or "oregon"
// Copies the template source's importer, helper library and offline test to ops/importers/<id>.mjs, ops/importers/lib/<id>.mjs and
// tests/registry/<id>.test.mjs with the template's short name swapped for <id> (and its upper-case form for the new upper-case prefix),
// adds the run-all.json entry, and prints the shared-file edits that are still done by hand. It writes nothing that already exists.
// What it CANNOT do: read the licence, find the feed, or write the normalizer. Every copied file starts with a TODO(new-source) banner
// and the copied tests fail until the fixture, phrases and bounds are real (a scaffold that passes would hide an unfinished source).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CHECKLIST = (id) => [
  `1. data/source-permissions.manual.json: licence row (quote the licence sentence, URL, date, attribution); status only as the quoted text allows; never set image permissions to allowed.`,
  `2. ops/importers/lib/${id}.mjs: FEED_URL, TERMS_URL, LICENCE_PHRASES (copy real sentences), ATTRIBUTION, IMAGE_RE, BOUNDS, region and country objects, normalizer; ops/importers/${id}.mjs: perms id, source name, docsUrl.`,
  `3. tests/registry/fixtures/: replace the copied fixtures with a small real sample of the list and the licence page; fix tests/registry/${id}.test.mjs until it passes.`,
  `4. ops/importers/lib/registry.mjs: add the region to REGION_COUNTRY (and the import at the top).`,
  `5. site/src/lib/pages.mjs: region config (agency, texts, caveats); site/src/layouts/Base.astro: footer credit; site/PAGES.md: page row with a "Beats Argos by:" line.`,
  `6. ops/health/check.mjs: perSource pace entry (or { skip: 'host-blocks-automated-checks' } when the picture host blocks automated checks).`,
  `7. tests/registry/registry.test.mjs and ops/harness/rules.mjs: the lists that name every source.`,
  `8. data/world-coverage.json: flip the country row; run the importer once, then: node --test tests/registry/*.test.mjs tests/licensing/*.test.mjs ops/harness/*.test.mjs, then in site/: npm run build && npm test, then node ops/harness/page-gate.mjs site/dist site/PAGES.md.`,
];

export function scaffold(id, { template = 'nsw', root = ROOT, log = console.log } = {}) {
  if (!/^[a-z][a-z0-9]{1,15}$/.test(id)) throw new Error('short id: 2 to 16 lowercase letters or digits, starting with a letter');
  if (!/^[a-z][a-z0-9]{1,15}$/.test(template)) throw new Error('bad template name');
  const pairs = [
    [`ops/importers/${template}.mjs`, `ops/importers/${id}.mjs`],
    [`ops/importers/lib/${template}.mjs`, `ops/importers/lib/${id}.mjs`],
    [`tests/registry/${template}.test.mjs`, `tests/registry/${id}.test.mjs`],
  ];
  for (const [, to] of pairs) if (existsSync(join(root, to))) throw new Error(`${to} already exists: nothing written`);
  const swap = (t) => t.replace(new RegExp(template.toUpperCase(), 'g'), id.toUpperCase()).replace(new RegExp(template, 'g'), id);
  const banner = `// TODO(new-source): scaffolded from the ${template} template by ops/importers/new-source.mjs. Finish every item of the checklist it printed, then delete this line.\n`;
  const written = [];
  for (const [from, to] of pairs) { writeFileSync(join(root, to), banner + swap(readFileSync(join(root, from), 'utf8'))); written.push(to); }
  const planFile = join(root, 'ops/importers/run-all.json');
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  if (!plan.importers.some((e) => e.id === id)) { plan.importers.push({ id, script: `${id}.mjs`, timeoutSec: 90 }); writeFileSync(planFile, JSON.stringify(plan, null, 2) + '\n'); written.push('ops/importers/run-all.json (entry added)'); }
  for (const w of written) log(`wrote ${w}`);
  for (const l of CHECKLIST(id)) log(l);
  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const id = process.argv[2];
  const template = process.argv.find((a) => a.startsWith('--template='))?.slice(11) || 'nsw';
  if (!id) { console.error('usage: node ops/importers/new-source.mjs <short-id> [--template=nsw]'); process.exit(2); }
  try { scaffold(id, { template }); } catch (e) { console.error(e.message); process.exit(1); }
}
