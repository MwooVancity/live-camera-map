// Static route inventory of the pinned gev/ (read-only). Writes data/route-inventory.json.
// Classes: sensitive (credentials/keys/AI/admin: must be blocked or private), restricted (licence-disabled source), public-candidate (everything else, to be probed).
// Static grep only: Session 3A/3B must confirm each route at runtime through the proxy.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const gev = resolve(root, 'gev');
const SKIP = new Set(['node_modules', 'dist', '.git', 'dev', 'docs']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(m?js)$/.test(name) && !/\.test\.m?js$/.test(name)) yield p;
  }
}

const SENSITIVE = /key|setup|settings|openai|realtime|gemini|mcp|admin|token|credential|secret|session|auth|\.env|shell|exec/i;
const RESTRICTED = /opensky|ghostmaps|inaturalist|fl511|nyc|transtar|telegeography|news/i;
const ROUTE = /['"`](\/(?:api|@vite|@fs|@id|share|mcp)[a-zA-Z0-9_\/:{}.\-]*)/g;

const found = new Map();
for (const top of ['server', 'scripts', 'src']) {
  for (const file of walk(resolve(gev, top))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(ROUTE)) {
      const route = m[1].replace(/\/$/, '') || '/';
      if (!found.has(route)) found.set(route, new Set());
      found.get(route).add(relative(gev, file).replaceAll('\\', '/'));
    }
  }
}

const routes = [...found.entries()]
  .map(([route, files]) => {
    const f = [...files];
    const sensitive = SENSITIVE.test(route) || f.some((x) => /key-setup|keySetup/.test(x));
    const restricted = RESTRICTED.test(route) || f.every((x) => RESTRICTED.test(x));
    return { route, class: sensitive ? 'sensitive' : restricted ? 'restricted' : 'public-candidate', files: f.slice(0, 5), fileCount: f.length };
  })
  .sort((a, b) => a.route.localeCompare(b.route));

writeFileSync(resolve(root, 'data/route-inventory.json'), JSON.stringify({ generatedFrom: 'gev/{server,scripts,src} static grep', routes }, null, 2) + '\n');
const n = (c) => routes.filter((r) => r.class === c).length;
console.log(`routes=${routes.length} sensitive=${n('sensitive')} restricted=${n('restricted')} public-candidate=${n('public-candidate')}`);
