// Page gate over the BUILT site. Usage: node ops/harness/page-gate.mjs [distDir] [PAGES.md]
// Checks: link-out only, silo structure (levels: world hub /cameras/, country /cameras/<c>/, region /cameras/<c>/<r>/, city /cameras/<c>/<r>/<city>/; reachability, depth, parent/related/guide/map links, hubs link every child and their parent),
// reader-first rules on city and road pages (driving notice, conditions above cameras, honest health wording, status words defined, road jump links), block proof (data-block needs data-source + data-asof), road pages (hub, related roads, cities, guide, map, nearest cameras per event), near-duplicate city and road pages, "Beats Argos by:" per indexable page.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAMERA_HOSTS = ['cwwp2.dot.ca.gov', 'wzmedia.dot.ca.gov', 'drivebc.ca', 'weathercam.digitraffic.fi', 'quebec511.info']; // drivebc.ca covers www.drivebc.ca picture addresses; the last two are the Finland and Quebec link-out hosts

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}
const toRoute = (dist, file) => {
  let r = file.slice(dist.length).replace(/\\/g, '/').replace(/index\.html$/, '');
  return r.startsWith('/') ? r : '/' + r;
};
const normalize = (href, from) => {
  if (!href || /^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) return null;
  let h = href.split('#')[0].split('?')[0];
  if (!h) return null;
  if (!h.startsWith('/')) { const base = from.endsWith('/') ? from : from.replace(/[^/]*$/, ''); h = base + h; }
  const parts = [];
  for (const s of h.split('/')) { if (s === '..') parts.pop(); else if (s && s !== '.') parts.push(s); }
  return '/' + parts.join('/') + (parts.length ? '/' : '');
};
const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

export const MAX_BLOCK_AGE_H = 24;
// Max clicks from /: world hub (1) -> country (2) -> region (3) -> city (4). It was 3 before the country level existed; 4 is the length of the
// longest hub chain, so a page that needs a 5th click (a level skipped by no link at all) still fails.
export const MAX_DEPTH = 4;
export function gate(dist, pagesMd = '', now = new Date()) {
  const errors = [];
  const files = walk(dist);
  const pages = new Map(); // route -> {html, links:Set, noindex}
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    const route = toRoute(dist, f);
    const links = new Set(); // links inside <noscript> (the search fallback) are not site navigation, so they are not counted
    for (const m of html.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ').matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)) { const n = normalize(m[1], route); if (n) links.add(n); }
    pages.set(route, { html, links, noindex: /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html) });
  }
  if (!pages.has('/')) errors.push('no / page built');

  // 1) link-out only
  for (const [route, p] of pages) {
    for (const m of p.html.matchAll(/<(img|video|source|iframe|embed|object)\s[^>]*?(?:src|srcset|data)=["']([^"']+)["']/gi)) {
      const url = m[2];
      if (CAMERA_HOSTS.some((h) => url.includes(h)) || (m[1].toLowerCase() === 'img' && /cctv|\/camera\//i.test(url))) errors.push(`${route}: camera media on page (${m[1]} ${url.slice(0, 60)}) breaks link-out only`);
      if (m[1].toLowerCase() === 'video') errors.push(`${route}: <video> tag breaks link-out only`);
    }
  }

  // 2) silo: reachability and depth from /
  const depth = new Map([['/', 0]]);
  const queue = ['/'];
  while (queue.length) {
    const r = queue.shift();
    for (const l of pages.get(r)?.links || []) if (pages.has(l) && !depth.has(l)) { depth.set(l, depth.get(r) + 1); queue.push(l); }
  }
  for (const route of pages.keys()) {
    if (route === '/404/' || route === '/404.html') continue;
    if (!depth.has(route)) errors.push(`${route}: orphan, not reachable from /`);
    else if (depth.get(route) > MAX_DEPTH) errors.push(`${route}: ${depth.get(route)} clicks from /, max ${MAX_DEPTH}`);
  }
  const under = (r, pre) => r.startsWith(pre) && r !== pre;
  const segs = (r) => r.split('/').filter(Boolean);
  const cities = [...pages.keys()].filter((r) => under(r, '/cameras/') && segs(r).length === 4);
  const regions = [...pages.keys()].filter((r) => under(r, '/cameras/') && segs(r).length === 3);
  const countries = [...pages.keys()].filter((r) => under(r, '/cameras/') && segs(r).length === 2);
  const guides = [...pages.keys()].filter((r) => under(r, '/guides/'));
  const roads = [...pages.keys()].filter((r) => under(r, '/roads/') && segs(r).length === 2);
  for (const c of cities) {
    const p = pages.get(c);
    const parent = '/' + segs(c).slice(0, 3).join('/') + '/';
    const related = [...p.links].filter((l) => l !== c && cities.includes(l));
    if (!p.links.has(parent)) errors.push(`${c}: no link to parent ${parent}`);
    if (related.length < 3) errors.push(`${c}: ${related.length} related-city links, need 3 or more`);
    if (!guides.some((g) => p.links.has(g))) errors.push(`${c}: no link to any guide`);
    if (![...p.links].some((l) => l.startsWith('/map/'))) errors.push(`${c}: no link to /map/`);
  }
  // road pages (plan review item 2): hub, 3+ related roads, 2+ cities, a guide, the map; the roads hub links every road
  for (const r of roads) {
    const p = pages.get(r);
    if (!p.links.has('/roads/')) errors.push(`${r}: no link to the roads hub /roads/`);
    const rel = [...p.links].filter((l) => l !== r && roads.includes(l));
    if (rel.length < 3) errors.push(`${r}: ${rel.length} related-road links, need 3 or more`);
    const cs = [...p.links].filter((l) => cities.includes(l));
    if (cs.length < 2) errors.push(`${r}: ${cs.length} city-page links, need 2 or more`);
    if (!guides.some((g) => p.links.has(g))) errors.push(`${r}: no link to any guide`);
    if (![...p.links].some((l) => l.startsWith('/map/'))) errors.push(`${r}: no link to /map/`);
    // every closure, chain control and sign lists at least one nearest-camera link
    for (const m of p.html.matchAll(/<li\b[^>]*\bdata-event\b[^>]*>([\s\S]*?)<\/li>/gi)) {
      if (!/<a\b[^>]*\bdata-nearest\b[^>]*href=["'][^"']+["']|<a\b[^>]*href=["'][^"']+["'][^>]*\bdata-nearest\b/i.test(m[1])) errors.push(`${r}: an event (${textOf(m[1]).slice(0, 50)}) lists no nearest camera`);
    }
  }
  if (roads.length && !pages.has('/roads/')) errors.push('road pages exist but /roads/ hub was not built');
  // every region hub links its country, every country hub links the world hub (the up-links), then each hub links every child
  for (const r of regions) { const up = '/' + segs(r).slice(0, 2).join('/') + '/'; if (!pages.has(up)) errors.push(`${r}: country hub ${up} was not built`); else if (!pages.get(r).links.has(up)) errors.push(`${r}: no link to its country ${up}`); }
  for (const c of countries) if (!pages.get(c).links.has('/cameras/')) errors.push(`${c}: no link to the world hub /cameras/`);
  const hubs = [['/cameras/', countries], ...countries.map((c) => [c, regions.filter((r) => r.startsWith(c))]), ...regions.map((r) => [r, cities.filter((c) => c.startsWith(r))]), ['/roads/', roads]];
  for (const [hub, kids] of hubs) {
    if (!pages.has(hub)) continue;
    for (const k of kids) if (!pages.get(hub).links.has(k)) errors.push(`${hub}: does not link child ${k}`);
  }
  for (const g of guides) {
    if (!cities.some((c) => pages.get(g).links.has(c))) errors.push(`${g}: guide links to no city page`);
  }

  // 3) block proof
  for (const [route, p] of pages) {
    for (const m of p.html.matchAll(/<(\w+)\s([^>]*data-block=["'][^"']+["'][^>]*)>/gi)) {
      const a = m[2];
      if (!/data-source=["'][^"']+["']/.test(a)) errors.push(`${route}: block ${a.match(/data-block=["']([^"']+)/)[1]} has no data-source`);
      if (!/data-asof=["'][^"']+["']/.test(a)) errors.push(`${route}: block ${a.match(/data-block=["']([^"']+)/)[1]} has no data-asof`);
    }
    // stale block: a data-asof older than 24 h at build is a failure unless the block is registry-based (data-basis="registry")
    for (const m of p.html.matchAll(/<(\w+)\s([^>]*data-block=["'][^"']+["'][^>]*)>/gi)) {
      const a = m[2];
      if (/data-basis=["']registry["']/.test(a)) continue;
      const t = Date.parse((a.match(/data-asof=["']([^"']+)["']/) || [])[1]);
      if (!Number.isNaN(t) && (new Date(now).getTime() - t) / 3600000 > MAX_BLOCK_AGE_H) errors.push(`${route}: block ${a.match(/data-block=["']([^"']+)/)[1]} data is older than ${MAX_BLOCK_AGE_H} h at build`);
    }
    if (cities.includes(route) && !p.noindex && !/data-block=/.test(p.html)) errors.push(`${route}: indexable city page has no data blocks`);
  }

  // 3b) reader-first rules on city and road pages: a driving notice; conditions (closures, chain controls, signs, weather) above the camera list;
  // no "never run" text beside real health markers; the four status words defined before the first marker and no freshness claim; road jump links resolve
  const CONDITION_BLOCKS = ['road-conditions', 'message-signs', 'bc-events', 'road-weather', 'forecast', 'weather-alerts'];
  const blockAt = (html, id) => html.search(new RegExp(`data-block=["']${id}["']`));
  for (const route of [...cities, ...roads]) {
    const html = pages.get(route).html;
    if (!/do not use this page while driving/i.test(html)) errors.push(`${route}: no "Do not use this page while driving" notice`);
    const cam = blockAt(html, 'cameras');
    for (const id of CONDITION_BLOCKS) { const at = blockAt(html, id); if (at >= 0 && cam >= 0 && at > cam) errors.push(`${route}: ${id} block is below the camera list (conditions come first)`); }
    const hasMarkers = /data-status=/.test(html);
    const healthAsof = (html.match(/data-block=["']health["'][^>]*data-asof=["']([^"']+)["']/) || [])[1];
    if ((hasMarkers || (healthAsof && healthAsof !== 'not-checked')) && /never run|not run yet|not checked yet/i.test(textOf(html))) errors.push(`${route}: says the link check never ran, but the page has health markers`);
    if (hasMarkers) {
      const camText = textOf((html.match(/<section[^>]*data-block=["']cameras["'][\s\S]*?<\/section>/) || [''])[0]);
      for (const w of ['Reachable', 'Stale', 'Unavailable', 'Unknown']) if (!camText.includes(`${w} means`)) errors.push(`${route}: status word "${w}" is not defined in the camera list`);
      if (/\b(fresh|up to date)\b/i.test(camText)) errors.push(`${route}: camera list claims a picture is fresh (only a Last-Modified time can say so)`);
    }
  }
  for (const r of roads) {
    const html = pages.get(r).html;
    const jumps = [...html.matchAll(/href=["']#(dir-[^"']+)["']/g)].map((m) => m[1]);
    if (!jumps.length) errors.push(`${r}: no jump links to the direction lists`);
    for (const j of jumps) if (!new RegExp(`id=["']${j}["']`).test(html)) errors.push(`${r}: jump link #${j} has no target`);
  }

  // 4) near-duplicate pages (shared sentences), compared within one kind: city pages together, road pages together, country hubs together
  for (const group of [cities, roads, countries]) {
    const sents = new Map(group.map((c) => [c, new Set(textOf(pages.get(c).html.replace(/<footer[\s\S]*<\/footer>/i, ' ')) /* the footer is the same on every page by design: only the body counts */.split(/(?<=[.!?])\s+/).map((s) => s.toLowerCase().replace(/[0-9]+/g, '#')).filter((s) => s.split(' ').length >= 5))]));
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = sents.get(group[i]), b = sents.get(group[j]);
      if (!a.size || !b.size) continue;
      let shared = 0; for (const s of a) if (b.has(s)) shared++;
      const share = shared / Math.min(a.size, b.size);
      if (share > 0.6) errors.push(`${group[i]} and ${group[j]} share ${(share * 100).toFixed(0)}% of sentences (near-duplicate)`);
    }
  }

  // 6) search box on EVERY page (rule 'search-box'): a role=search region, a search input, and a <noscript> fallback linking /cameras/ and /roads/
  for (const [route, p] of pages) {
    const ns = (p.html.match(/<noscript[\s\S]*?<\/noscript>/gi) || []).join(' ');
    if (!/role=["']search["']/.test(p.html) || !/<input\b[^>]*type=["']search["']/i.test(p.html)) errors.push(`${route}: no search box (role="search" with an input type="search")`);
    else if (!/href=["']\/cameras\/["']/.test(ns) || !/href=["']\/roads\/["']/.test(ns)) errors.push(`${route}: search box has no <noscript> fallback linking /cameras/ and /roads/`);
  }

  // 5) "Beats Argos by:" per indexable page
  for (const [route, p] of pages) {
    if (p.noindex || route === '/404/' || route === '/404.html') continue;
    const line = pagesMd.split('\n').find((l) => l.includes('`' + route + '`') || l.includes('(' + route + ')') || new RegExp(`(^|\\s)${route.replace(/[/.]/g, '\\$&')}(\\s|$)`).test(l));
    if (!line || !/Beats Argos by:\s*\S+/.test(line)) errors.push(`${route}: PAGES.md has no "Beats Argos by:" line for this page`);
  }
  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dist = resolve(process.argv[2] || 'site/dist');
  const md = resolve(process.argv[3] || 'site/PAGES.md');
  if (!existsSync(dist)) { console.error(`PAGE GATE: ${dist} not built`); process.exit(2); }
  const errors = gate(dist, existsSync(md) ? readFileSync(md, 'utf8') : '');
  if (errors.length) { console.error(`PAGE GATE FAIL (${errors.length})\n` + errors.join('\n')); process.exit(1); }
  console.log('PAGE GATE OK');
}
