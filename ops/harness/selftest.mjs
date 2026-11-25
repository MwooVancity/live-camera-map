// Lists ENFORCED vs PENDING rules. Exit 1 if an ENFORCED rule names a file that does not exist.
import { existsSync } from 'node:fs';
import { RULES } from './rules.mjs';

import { unreferencedTests } from './test-coverage.mjs';

let bad = 0;
for (const f of unreferencedTests(process.cwd())) { bad++; console.log(`UNGATED   ${f}: named in no workflow, hook or site/package.json`); }
for (const r of RULES) {
  if (!r.enforcedBy) { console.log(`PENDING   ${r.id}: ${r.text}`); continue; }
  const missing = r.enforcedBy.filter((f) => !existsSync(f));
  if (missing.length) { bad++; console.log(`BROKEN    ${r.id}: missing ${missing.join(', ')}`); }
  else console.log(`ENFORCED  ${r.id}`);
}
const e = RULES.filter((r) => r.enforcedBy).length;
console.log(`\n${e} enforced, ${RULES.length - e} pending, ${bad} broken`);
process.exit(bad ? 1 : 0);
