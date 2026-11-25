// B10: the build that is uploaded must be hidden from search unless LAUNCH is exactly "live" (case-sensitive).
// Usage: node ops/harness/deploy-noindex.mjs <dir> <LAUNCH value>
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function noindexProblems(dir, launch) {
  if (launch === 'live') return [];
  const p = [];
  const robots = existsSync(join(dir, 'robots.txt')) ? readFileSync(join(dir, 'robots.txt'), 'utf8') : '';
  if (!/^\s*Disallow:\s*\/\s*$/m.test(robots)) p.push('robots.txt has no "Disallow: /"');
  let pages = 0;
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const f = join(d, e);
      if (statSync(f).isDirectory()) walk(f);
      else if (e.endsWith('.html')) {
        pages++;
        if (!/<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(readFileSync(f, 'utf8'))) p.push(`${f} has no noindex meta tag`);
      }
    }
  };
  walk(dir);
  if (!pages) p.push('no html pages found: the check would pass an empty build');
  return p;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const probs = noindexProblems(process.argv[2], process.argv[3]);
  if (probs.length) { console.error(`DEPLOY BUILD IS INDEXABLE while LAUNCH=${JSON.stringify(process.argv[3])}:\n${probs.slice(0, 20).join('\n')}`); process.exit(1); }
  console.log(`deploy build check OK (LAUNCH=${JSON.stringify(process.argv[3])})`);
}
