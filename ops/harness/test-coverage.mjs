// B4: every *.test.mjs file must be named in a workflow, a git hook or site/package.json, else it runs in no gate.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e.startsWith('.')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.test.mjs')) out.push(p);
  }
  return out;
}

export function unreferencedTests(root) {
  const text = [];
  for (const d of ['.github/workflows', '.githooks']) {
    const p = join(root, d);
    if (existsSync(p)) for (const f of readdirSync(p)) text.push(readFileSync(join(p, f), 'utf8'));
  }
  const sp = join(root, 'site/package.json');
  if (existsSync(sp)) text.push(readFileSync(sp, 'utf8'));
  const all = text.join('\n');
  return ['tests', 'ops', 'site/tests'].flatMap((d) => walk(join(root, d)))
    .map((f) => relative(root, f).replace(/\\/g, '/'))
    // site/package.json names site tests relative to site/ (tests/x.test.mjs)
    .filter((f) => !all.includes(f) && !(f.startsWith('site/') && all.includes(f.slice(5))));
}
