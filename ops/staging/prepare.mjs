// Turns a built site/dist into a STAGING copy for GitHub Pages under /<repo>/:
// 1) every root-relative href/src/action gets the base prefix, 2) every page gets noindex,nofollow, 3) robots.txt disallows all,
// 4) sitemap.xml is removed (staging must not offer URLs to crawlers).
// Usage: node ops/staging/prepare.mjs <distDir> <basePath e.g. /live-camera-map>
import { readdirSync, readFileSync, writeFileSync, rmSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function prepare(dist, base) {
  if (!/^\/[\w.-]+$/.test(base)) throw new Error(`bad base path: ${base}`);
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  let pages = 0;
  for (const f of walk(dist).filter((x) => x.endsWith('.html'))) {
    let h = readFileSync(f, 'utf8');
    h = h.replace(/\b(href|src|action)=(["'])\/(?!\/)/g, `$1=$2${base}/`);
    h = h.replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, '');
    h = h.replace(/<head([^>]*)>/i, `<head$1><meta name="robots" content="noindex,nofollow">`);
    writeFileSync(f, h);
    pages++;
  }
  writeFileSync(join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  if (existsSync(join(dist, 'sitemap.xml'))) rmSync(join(dist, 'sitemap.xml'));
  return pages;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [dist, base] = process.argv.slice(2);
  if (!dist || !base) { console.error('usage: prepare.mjs <dist> <basePath>'); process.exit(2); }
  console.log(`staging prepared: ${prepare(dist, base)} pages`);
}
