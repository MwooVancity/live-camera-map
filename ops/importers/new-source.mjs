// Scaffold for a new camera source (plan item 28 stage 4).
// Usage: node ops/importers/new-source.mjs <short-id> --licence=<evidence.json> --name=... --region-slug=... --country-slug=...   (generate: checks the licence evidence first, then scaffolds and writes ops/importers/patches/<id>.patch.json)
//        node ops/importers/new-source.mjs <short-id> --apply [--stage=import]   (merger tree only: applies the patch to the shared files; docs/decisions/worktrees.md)
// scaffold() below is the old copy-only step, still used by generate().
//   <short-id> lowercase letters and digits only, e.g. "wsdot" or "oregon"
// Copies the template source's importer, helper library and offline test to ops/importers/<id>.mjs, ops/importers/lib/<id>.mjs and
// tests/registry/<id>.test.mjs with the template's short name swapped for <id> (and its upper-case form for the new upper-case prefix),
// adds the run-all.json entry, and prints the shared-file edits that are still done by hand. It writes nothing that already exists.
// What it CANNOT do: read the licence, find the feed, or write the normalizer. Every copied file starts with a TODO(new-source) banner
// and the copied tests fail until the fixture, phrases and bounds are real (a scaffold that passes would hide an unfinished source).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { buildPatch, applyPatch } from './lib/source-patch.mjs';
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

// Licence-first generator (plan item 40 step 2): checks the evidence record BEFORE writing anything, then scaffolds the three files and run-all entry and writes the
// shared-file patch to ops/importers/patches/<id>.patch.json. It never edits a shared file (that is --apply, in the merger's tree) and never enables a source.
const SLUG = /^[a-z0-9][a-z0-9-]{1,63}$/;
export function generate(id, { evidence, sourceId = `${id}-cameras`, name, regionSlug, countrySlug, worldCountry = countrySlug, template = 'nsw', root = ROOT, today = new Date().toISOString().slice(0, 10), log = console.log } = {}) {
  if (!/^[a-z][a-z0-9]{1,15}$/.test(id)) throw new Error('short id: 2 to 16 lowercase letters or digits, starting with a letter');
  for (const [k, v] of Object.entries({ sourceId, regionSlug, countrySlug, worldCountry })) if (!SLUG.test(v || '')) throw new Error(`${k}: lowercase letters, digits and dashes only`);
  if (!name || !/^[^'\\\r\n`$]{3,120}$/.test(name)) throw new Error('name: 3 to 120 characters, no quotes, backslashes or $');
  const patch = buildPatch({ id, sourceId, name, regionSlug, countrySlug, worldCountry, evidence, today }); // throws REJECT before anything is written
  const written = scaffold(id, { template, root, log });
  const dir = join(root, 'ops/importers/patches'); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.patch.json`), JSON.stringify(patch, null, 2) + '\n');
  log(`patch ${patch.verdict}: ${patch.summary}`);
  for (const r of patch.reasons) log(`  - ${r}`);
  return { written: [...written, `ops/importers/patches/${id}.patch.json`], patch };
}
export function apply(id, { root = ROOT, stage = 'now', log = console.log } = {}) {
  const file = join(root, 'ops/importers/patches', `${id}.patch.json`);
  if (!existsSync(file)) throw new Error(`${file} not found: generate it first`);
  return applyPatch(JSON.parse(readFileSync(file, 'utf8')), { root, stage, log });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [id, ...rest] = process.argv.slice(2);
  const flag = (n) => rest.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const usage = 'usage: node ops/importers/new-source.mjs <short-id> --licence=<evidence.json> --name="Agency camera list" --region-slug=<slug> --country-slug=<slug> [--source-id=<id>] [--world-country=<row>] [--template=nsw]\n       node ops/importers/new-source.mjs <short-id> --apply [--stage=now|import]   (merger tree only)\n       evidence record: node ops/audit/licence-evidence.mjs --init <source-id>';
  if (!id) { console.error(usage); process.exit(2); }
  try {
    if (rest.includes('--apply')) apply(id, { stage: flag('stage') || 'now' });
    else {
      const lic = flag('licence');
      if (!lic) throw new Error('REJECT: --licence=<evidence record> is required: a source without quoted licence evidence is never scaffolded.\n' + usage);
      generate(id, { evidence: JSON.parse(readFileSync(lic, 'utf8')), sourceId: flag('source-id') || undefined, name: flag('name'), regionSlug: flag('region-slug'), countrySlug: flag('country-slug'), worldCountry: flag('world-country') || undefined, template: flag('template') || 'nsw' });
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}

