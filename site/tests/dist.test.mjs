// Tests over the built site. Run `npm run build` first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DIST, SITE_URL, CAMERA_HOSTS, readPages, titleOf, isNoindex, sitemapViolations } from './helpers.mjs';
import { countsBy } from '../../ops/importers/lib/registry.mjs';
import { curatedPlaces, regionInfo } from '../src/lib/pages.mjs';

const pages = readPages();
const cameras = JSON.parse(readFileSync('../data/camera-registry/cameras.json', 'utf8'));
const cityRoutes = [...pages.keys()].filter((r) => r.split('/').filter(Boolean).length === 4 && r.startsWith('/cameras/'));

test('page count is 16-120 (California 20 + roads hub + 10 roads + guides; British Columbia hub + 5 cities; Finland hub + region + 8 cities; Quebec 13 region hubs)', () => {
  const n = [...pages.keys()].filter((r) => r !== '/404/').length;
  assert.ok(n >= 16 && n <= 120, `built ${n} pages`);
});

test('every page: one h1, unique title, canonical, breadcrumb JSON-LD', () => {
  const titles = new Map();
  for (const [route, html] of pages) {
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${route}: h1 count`);
    const t = titleOf(html);
    assert.ok(t && t.length > 5, `${route}: title`);
    assert.ok(!titles.has(t), `${route}: duplicate title with ${titles.get(t)}`);
    titles.set(t, route);
    assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}${route}">`), `${route}: canonical`);
    assert.ok(html.includes('"@type":"BreadcrumbList"'), `${route}: breadcrumb`);
  }
});

test('descriptions are unique', () => {
  const seen = new Map();
  for (const [route, html] of pages) {
    const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    assert.ok(d, `${route}: description`);
    assert.ok(!seen.has(d), `${route}: same description as ${seen.get(d)}`);
    seen.set(d, route);
  }
});

test('no camera image or media on any page (link-out only)', () => {
  for (const [route, html] of pages) {
    assert.ok(!/<img\b/i.test(html), `${route}: has an <img>`);
    assert.ok(!/<(video|source|embed|object)\b/i.test(html), `${route}: has a media tag`);
    for (const m of html.matchAll(/<(?:img|iframe|script|link)\b[^>]*?(?:src|href)="([^"]+)"/gi)) {
      if (/<a\b/i.test(m[0])) continue;
      assert.ok(!CAMERA_HOSTS.some((h) => m[1].includes(h)), `${route}: loads ${m[1]}`);
    }
  }
});

test('no third-party scripts or fonts', () => {
  for (const [route, html] of pages) {
    for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)) assert.ok(m[1].startsWith('/'), `${route}: external script ${m[1]}`);
    assert.ok(!/fonts\.(googleapis|gstatic)/.test(html), `${route}: external fonts`);
  }
});

test('all internal links resolve to a built page', () => {
  for (const [route, html] of pages) {
    for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"/gi)) {
      const h = m[1];
      if (/^(https?:|mailto:|#)/.test(h)) continue;
      const target = h.split('#')[0].split('?')[0];
      assert.ok(pages.has(target), `${route}: broken link ${h}`);
    }
  }
});

test('city pages: title, intro, data-count and list all equal countsBy of the page\'s own region', () => {
  assert.equal(cityRoutes.length, curatedPlaces(cameras).length, '10 California + 5 British Columbia + 8 Finland; Quebec has no city pages');
  for (const route of cityRoutes) {
    const html = pages.get(route);
    const region = route.split('/')[3];
    const byCity = countsBy(cameras.filter((c) => c.regionSlug === region), 'city'); // counted inside the region
    const agency = regionInfo(region).agency;
    const city = html.match(/<h1>([^<]*) traffic cameras<\/h1>/)[1];
    const n = byCity[city];
    assert.ok(n >= 3, `${route}: curated city needs 3 or more cameras`);
    assert.ok(titleOf(html).includes(`${city} traffic cameras: ${n} official links`), `${route}: title count`);
    assert.ok(html.includes(`<p>${n} ${agency} cameras are listed near`), `${route}: intro count`);
    assert.ok(html.includes(`data-count="${n}"`), `${route}: data-count`);
    assert.ok(html.includes(`All ${n} cameras`), `${route}: list heading`);
    const block = html.match(/<section data-block="cameras"[\s\S]*?<\/section>/)[0];
    assert.equal((block.match(/<li>/g) || []).length, n, `${route}: list length`);
    assert.ok(!isNoindex(html), `${route}: should be indexable`);
  }
});

test('road counts on a city page add up to the camera count', () => {
  for (const route of cityRoutes) {
    const html = pages.get(route);
    const n = Number(html.match(/data-count="(\d+)"/)[1]);
    const cov = html.match(/<section data-block="coverage"[\s\S]*?<\/section>/)[0];
    const sum = [...cov.matchAll(/: (\d+) cameras?[ (]/g)].reduce((s, m) => s + Number(m[1]), 0);
    const none = Number((cov.match(/>(\d+) cameras? ha(?:s|ve) no road/) || [0, 0])[1]);
    assert.equal(sum + none, n, `${route}: road counts`);
  }
});

test('health is honest when health.json is missing', () => {
  if (existsSync('../data/health/health.json')) return;
  for (const route of cityRoutes) assert.ok(pages.get(route).includes('Not checked yet'), `${route}: health text`);
});

test('no hub for a region with fewer than 3 cameras (Ontario, Alberta)', () => {
  const byRegion = countsBy(cameras, 'region');
  for (const slug of ['ontario', 'alberta']) {
    if ((byRegion[slug] || 0) < 3) assert.ok(!pages.has(`/cameras/${slug}/`), `${slug} hub built empty`);
  }
});

test('sitemap: only indexable pages, none noindex, real lastmod', () => {
  assert.deepEqual(sitemapViolations(), []);
  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  for (const m of xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) assert.match(m[1], /^\d{4}-\d{2}-\d{2}$/);
  const registryDate = cameras.map((c) => c.lastSeen).sort().at(-1).slice(0, 10);
  assert.ok(xml.includes(`<loc>${SITE_URL}/cameras/</loc><lastmod>${registryDate}</lastmod>`));
  assert.ok(readFileSync(join(DIST, 'robots.txt'), 'utf8').includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
});

test('failing fixture: the sitemap check catches a noindex page that is listed', () => {
  const d = mkdtempSync(join(tmpdir(), 'fx-'));
  mkdirSync(join(d, 'tiny'));
  writeFileSync(join(d, 'index.html'), '<title>a</title><h1>a</h1>');
  writeFileSync(join(d, 'tiny', 'index.html'), '<meta name="robots" content="noindex,follow"><title>b</title>');
  writeFileSync(join(d, 'sitemap.xml'), `<urlset><url><loc>${SITE_URL}/</loc></url><url><loc>${SITE_URL}/tiny/</loc></url></urlset>`);
  const v = sitemapViolations(d);
  assert.equal(v.length, 1);
  assert.match(v[0], /noindex page \/tiny\/ is in the sitemap/);
});

test('map page: works without JS, fallback when no engine, iframe src ends ?embed=1', () => {
  const map = pages.get('/map/');
  assert.ok(!/<iframe/.test(map) && map.includes('The map engine is not deployed yet'));
  // JS only enhances (search box, /map/?lat= position): every script is data (ld+json, application/json) or a first-party module, and the lists below work without it.
  assert.ok(!/<script\b(?![^>]*(ld\+json|application\/json|type="module"))/.test(map), 'map page needs no JS (only data and first-party module scripts allowed)');
  assert.ok(!/<script\b[^>]*\bsrc="(?!\/)/.test(map), 'no third-party script');
  assert.ok(/<noscript>/.test(map) && /<ul class="cols">/.test(map), 'the plain link lists and the search fallback are in the HTML');
  const out = mkdtempSync(join(tmpdir(), 'embed-'));
  execFileSync(process.execPath, ['node_modules/astro/astro.js', 'build', '--outDir', out], { env: { ...process.env, PUBLIC_GEV_EMBED_URL: 'https://gev.example/app?x=1#h' }, stdio: 'pipe' });
  const built = readFileSync(join(out, 'map', 'index.html'), 'utf8');
  const src = built.match(/<iframe[^>]*\bsrc="([^"]+)"/)[1];
  assert.equal(src, 'https://gev.example/app?embed=1');
  assert.match(built, /<iframe[^>]*sandbox="allow-scripts allow-same-origin"/);
});

test('map page links to every region hub and city page', () => {
  const map = pages.get('/map/');
  for (const r of pages.keys()) {
    if (r === '/map/' || r === '/' || r === '/404/' || r === '/cameras/') continue;
    if (r.startsWith('/cameras/')) assert.ok(map.includes(`href="${r}"`), `/map/ does not link ${r}`);
  }
});

// ---- British Columbia (second source) ----
const bcRoutes = cityRoutes.filter((r) => r.startsWith('/cameras/canada/british-columbia/'));
const dateOf = (region) => cameras.filter((c) => c.regionSlug === region).map((c) => c.lastSeen).sort().at(-1).slice(0, 10);

test('BC: a region hub and 3 to 5 curated city pages, all indexable; each count equals the BC rows', () => {
  assert.ok(pages.has('/cameras/canada/british-columbia/'));
  assert.ok(bcRoutes.length >= 3 && bcRoutes.length <= 5, `${bcRoutes.length} BC city pages`);
  const total = cameras.filter((c) => c.regionSlug === 'british-columbia').length;
  const hub = pages.get('/cameras/canada/british-columbia/');
  assert.ok(titleOf(hub).includes(`${total} official links`));
  assert.ok(hub.includes(`${total} cameras on `));
  assert.ok(!isNoindex(hub));
  for (const r of bcRoutes) assert.ok(hub.includes(`href="${r}"`), `hub does not link ${r}`);
  assert.ok(pages.get('/cameras/').includes('href="/cameras/canada/british-columbia/"'));
});

test('BC: every page carries its own region registry date (a newer BC import never relabels California pages)', () => {
  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  assert.ok(xml.includes(`<loc>${SITE_URL}/cameras/canada/british-columbia/</loc><lastmod>${dateOf('british-columbia')}</lastmod>`));
  assert.ok(xml.includes(`<loc>${SITE_URL}/cameras/united-states/california/</loc><lastmod>${dateOf('california')}</lastmod>`));
  for (const r of bcRoutes) assert.ok(pages.get(r).includes(`Registry date ${dateOf('british-columbia')}`), r);
  assert.ok(pages.get('/cameras/united-states/california/los-angeles/').includes(`Registry date ${dateOf('california')}`));
});

test('BC city pages: no Caltrans or NWS block, no forecast; only the DriveBC events block may appear', () => {
  for (const r of bcRoutes) {
    const html = pages.get(r);
    for (const id of ['road-conditions', 'message-signs', 'road-weather', 'forecast', 'weather-alerts']) assert.ok(!html.includes(`data-block="${id}"`), `${r}: ${id}`);
    assert.ok(!/Caltrans cameras|Caltrans CWWP|National Weather Service/.test(html.replace(/<footer[\s\S]*<\/footer>/, '')), `${r}: California wording in the page body`);
    const ev = html.match(/<section data-block="bc-events"[^>]*>/);
    if (ev) { assert.match(ev[0], /data-source="DriveBC Open511/); assert.match(ev[0], /data-asof="\d{4}-\d{2}-\d{2}T/); }
  }
});

test('BC city pages: "facing" is the camera view (never northbound/southbound), the place is explained, links go to drivebc.ca', () => {
  for (const r of bcRoutes) {
    const html = pages.get(r);
    assert.ok(/Facing (North|South|East|West)/.test(html), r);
    assert.ok(!/northbound|southbound|eastbound|westbound/i.test(html.replace(/<section data-block="bc-events"[\s\S]*?<\/section>/, '').replace(/<[^>]+>/g, ' ').replace(/Highway[^.]*\b(?:north|south|east|west)bound[^.]*\./gi, '')), `${r}: traffic-direction wording outside DriveBC's own captions`);
    assert.ok(html.includes('not a municipal boundary'), `${r}: place explained`);
    const links = [...html.matchAll(/<section data-block="cameras"[\s\S]*?<\/section>/g)][0][0].match(/href="([^"]+)"/g);
    for (const l of links) assert.match(l, /href="https:\/\/www\.drivebc\.ca\/images\/\d+\.jpg"/);
  }
});

test('BC: no road page and no roads link for BC (road pages are California-only); the BC guide links a BC city', () => {
  for (const r of pages.keys()) if (r.startsWith('/roads/') && r !== '/roads/') assert.match(r, /^\/roads\/(i|sr|us)-\d+[a-z]?\/$/, `${r} is not an I-, SR- or US- road`);
  for (const r of bcRoutes) assert.ok(!/href="\/roads\/[^"]+"/.test(pages.get(r)), `${r} links a road page`);
  const g = pages.get('/guides/how-drivebc-cameras-work/');
  assert.ok(g && bcRoutes.some((r) => g.includes(`href="${r}"`)));
  assert.ok(!g.includes('Road pages'), 'BC guide must not list California road pages');
});

test('a place name used in two regions is counted and paged per region (failing fixture for the merge bug)', async () => {
  const { curatedPlaces, pageList } = await import('../src/lib/pages.mjs');
  const mk = (region, city, n) => Array.from({ length: n }, (_, i) => ({ id: `${region}-${city}-${i}`, city, regionSlug: region, regionName: region, road: 'x', direction: '', lat: 1, lon: 1, feedType: 'still' }));
  const cams2 = [...mk('california', 'Richmond', 4), ...mk('british-columbia', 'Richmond', 3)];
  assert.deepEqual(curatedPlaces(cams2), [{ region: 'california', city: 'Richmond', n: 4 }, { region: 'british-columbia', city: 'Richmond', n: 3 }]);
  const pl = pageList(cams2, curatedPlaces(cams2), '2026-11-22', [], { 'british-columbia': '2026-11-23' }).filter((p) => p.kind === 'city');
  assert.deepEqual(pl.map((p) => [p.route, p.count, p.lastmod]), [['/cameras/united-states/california/richmond/', 4, '2026-11-22'], ['/cameras/canada/british-columbia/richmond/', 3, '2026-11-23']]);
  assert.equal(pageList(cams2, ['Richmond'], '2026-11-22').filter((p) => p.kind === 'city').length, 0, 'a bare ambiguous name gets no page rather than a merged one');
});

// ---- country level: /cameras/ -> /cameras/<country>/ -> /cameras/<country>/<region>/ -> city ----
const lvl = (n) => [...pages.keys()].filter((r) => r.startsWith('/cameras/') && r.split('/').filter(Boolean).length === n);
test('levels built: 1 world hub, one country hub per country, one region hub per region, city pages; counts match the registry', async () => {
  const { countsBy: cb, REGION_COUNTRY } = await import('../../ops/importers/lib/registry.mjs');
  const byCountry = cb(cameras, 'country');
  assert.ok(pages.has('/cameras/'));
  assert.equal(lvl(2).length, Object.keys(byCountry).length);
  const hubRegions = Object.entries(cb(cameras, 'region')).filter(([, k]) => k >= 3).map(([r]) => r); // a region with fewer than 3 cameras gets no hub (Abitibi-Temiscamingue has 1)
  assert.equal(lvl(3).length, hubRegions.length);
  for (const [country, n] of Object.entries(byCountry)) {
    const html = pages.get(`/cameras/${country}/`);
    assert.ok(html, country);
    assert.ok(titleOf(html).includes(`${n} official links`), `${country}: title count`);
    assert.ok(!isNoindex(html));
    for (const [region, c] of Object.entries(REGION_COUNTRY)) {
      if (c.countrySlug !== country || !hubRegions.includes(region)) continue;
      assert.ok(html.includes(`href="/cameras/${country}/${region}/"`), `${country} does not link ${region}`);
      assert.ok(html.includes(`${cb(cameras.filter((x) => x.regionSlug === region), 'region')[region]} cameras on `), `${country}: ${region} count in text`);
    }
  }
  const world = pages.get('/cameras/');
  for (const c of Object.keys(byCountry)) assert.ok(world.includes(`href="/cameras/${c}/"`), `world hub does not link ${c}`);
});
test('breadcrumb JSON-LD has one more level: Home, All cameras, country, region, city', () => {
  const ld = (route) => JSON.parse(pages.get(route).match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1]).itemListElement.map((i) => i.item.replace(SITE_URL, ''));
  assert.deepEqual(ld('/cameras/united-states/california/los-angeles/'), ['/', '/cameras/', '/cameras/united-states/', '/cameras/united-states/california/', '/cameras/united-states/california/los-angeles/']);
  assert.deepEqual(ld('/cameras/canada/british-columbia/'), ['/', '/cameras/', '/cameras/canada/', '/cameras/canada/british-columbia/']);
  assert.deepEqual(ld('/cameras/canada/'), ['/', '/cameras/', '/cameras/canada/']);
});
test('old two-level addresses are gone and nothing links them (no redirects needed: staging is noindex)', () => {
  for (const old of ['/cameras/california/', '/cameras/british-columbia/', '/cameras/california/los-angeles/']) assert.ok(!pages.has(old), `${old} still built`);
  for (const [route, html] of pages) for (const m of html.matchAll(/href="(\/cameras\/(?:california|british-columbia)\/[^"]*)"/g)) assert.fail(`${route} links old address ${m[1]}`);
});
test('country hubs: in the sitemap, canonical, and each region hub says which country it is in and links it', () => {
  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  for (const c of lvl(2)) { assert.ok(xml.includes(`<loc>${SITE_URL}${c}</loc>`), `${c} not in sitemap`); assert.ok(pages.get(c).includes(`<link rel="canonical" href="${SITE_URL}${c}">`)); }
  assert.ok(pages.get('/cameras/united-states/california/').includes('href="/cameras/united-states/"'));
  assert.ok(pages.get('/cameras/canada/british-columbia/').includes('href="/cameras/canada/"'));
  assert.ok(pages.get('/cameras/canada/british-columbia/mission/').includes('Canada.'), 'city page names its country');
});
test('road pages stay at /roads/<slug>/ and say California, United States in their title', () => {
  for (const r of pages.keys()) if (/^\/roads\/(i|sr|us)-\d+[a-z]?\/$/.test(r)) assert.ok(titleOf(pages.get(r)).includes('California, United States'), r);
  assert.ok(titleOf(pages.get('/roads/')).includes('California, United States'));
});
test('country hubs hold their own data, not swapped names: the sources and counts of the other country are absent', () => {
  const us = pages.get('/cameras/united-states/').replace(/<footer[\s\S]*<\/footer>/, '');
  const ca = pages.get('/cameras/canada/').replace(/<footer[\s\S]*<\/footer>/, '');
  assert.ok(/Caltrans/.test(us) && !/DriveBC/.test(us));
  assert.ok(/DriveBC/.test(ca) && !/Caltrans/.test(ca));
});

// ---- world sources: Finland (Fintraffic) and Quebec (MTMD), added 2026-11-23 ----
const body = (route) => pages.get(route).replace(/<footer[\s\S]*<\/footer>/, ''); // the footer names every source on every page
const finlandRoutes = [...pages.keys()].filter((r) => r.startsWith('/cameras/finland/'));
const quebecRoutes = [...pages.keys()].filter((r) => /^\/cameras\/canada\/(?!british-columbia\/|toronto\/|calgary\/)[a-z-]+\/$/.test(r));
test('Finland pages: world hub, country, region, 8 city pages; they name Fintraffic and never another source', () => {
  assert.equal(finlandRoutes.length, 1 + 1 + 8, 'country + region + 8 cities');
  for (const r of finlandRoutes) {
    const html = body(r);
    assert.ok(/Fintraffic/.test(html), r);
    assert.ok(!/DriveBC|Caltrans|HighwayCams|Open511|Quebec|Québec|MTMD|quebec511/.test(html), `${r} names another source`);
  }
  const fi = pages.get('/cameras/finland/finland/');
  assert.ok(fi.includes('Credit: Fintraffic / digitraffic.fi, license CC 4.0 BY.'), 'credit line from sources.json');
  assert.ok(/does not say whether the pictures themselves are covered/.test(fi), 'country caveat printed');
  assert.ok(fi.includes(`${countsBy(cameras.filter((c) => c.regionSlug === 'finland'), 'region').finland} cameras on `));
});
test('Finland city pages: every link goes to weathercam.digitraffic.fi as a link only; place is explained; no "camera facing" wording; counts equal the registry', () => {
  for (const r of finlandRoutes.filter((x) => x.split('/').filter(Boolean).length === 4)) {
    const html = pages.get(r);
    const links = [...html.matchAll(/<li><a href="(https?:[^"]+)" rel="noopener" title="[^"]*">/g)].map((m) => m[1]);
    assert.ok(links.length >= 3, r);
    for (const l of links) assert.match(l, /^https:\/\/weathercam\.digitraffic\.fi\/C\d{7}\.jpg$/, r);
    assert.ok(/second part of these stations/.test(html) && /no direction/.test(html), `${r}: place and direction explained`);
    assert.ok(!/camera facing/.test(html), r);
    assert.ok(!/<img /.test(body(r).replace(/<header[\s\S]*?<\/header>/, '')), `${r}: no image tag`);
  }
});
test('Quebec: 13 region hubs (Abitibi-Temiscamingue has 1 camera: no page), no city pages, every camera of the region listed once with a quebec511.info link', () => {
  assert.equal(quebecRoutes.length, 13);
  assert.ok(!pages.has('/cameras/canada/abitibi-temiscamingue/'));
  assert.ok(![...pages.keys()].some((r) => /^\/cameras\/canada\/(?!british-columbia\/|toronto\/|calgary\/)[a-z-]+\/[a-z0-9-]+\/$/.test(r)), 'no Quebec city page: the feed has no place field');
  for (const r of quebecRoutes) {
    const slug = r.split('/')[3];
    const mine = cameras.filter((c) => c.regionSlug === slug);
    const html = pages.get(r);
    assert.ok(mine.length >= 3, r);
    assert.ok(html.includes(`data-count="${mine.length}"`) && html.includes(`All ${mine.length} cameras`), `${r}: count`);
    const block = html.match(/<section data-block="cameras"[\s\S]*?<\/section>/)[0];
    assert.equal((block.match(/<li>/g) || []).length, mine.length, `${r}: list length`);
    for (const m of block.matchAll(/<li><a href="([^"]+)"/g)) assert.match(m[1], /^https:\/\/www\.quebec511\.info\/Carte\/Fenetres\/FenetreVideo\.html\?id=\d+$/);
    assert.ok(/bot-check page/.test(html) && /unknown by design/.test(html), `${r}: link check caveat`);
    assert.ok(/Credit: Contains data from the Ministere des Transports/.test(html), `${r}: credit line`);
    assert.ok(!/Fintraffic|DriveBC|Caltrans|HighwayCams/.test(body(r)), `${r} names another source`);
    assert.ok(!isNoindex(html), r);
  }
});
test('Toronto: one region hub, no city pages, every camera listed once as a link to the City picture address (a link only), credit and caveats printed, link-out only', () => {
  const r = '/cameras/canada/toronto/';
  const mine = cameras.filter((c) => c.regionSlug === 'toronto');
  assert.ok(mine.length >= 100, 'the registry holds the Toronto list');
  const html = pages.get(r);
  assert.ok(html, 'page built');
  assert.ok(html.includes(`data-count="${mine.length}"`) && html.includes(`All ${mine.length} cameras`), 'count');
  const block = html.match(/<section data-block="cameras"[\s\S]*?<\/section>/)[0];
  assert.equal((block.match(/<li>/g) || []).length, mine.length, 'list length');
  for (const m of block.matchAll(/<li><a href="([^"]+)"/g)) assert.match(m[1], /^https:\/\/opendata\.toronto\.ca\/transportation\/tmc\/rescucameraimages\/CameraImages\/loc\d+\.jpg$/);
  assert.ok(!/<(img|video|iframe|source)\b/i.test(block), 'no media tag in the list');
  assert.ok(/Credit: Contains information licensed under the Open Government Licence/.test(html), 'credit line');
  assert.ok(/does not say whether the picture files themselves are covered/.test(html), 'image caveat');
  assert.ok(/Views listed by the City/.test(html), 'compass views');
  assert.ok(![...pages.keys()].some((x) => x.startsWith(r) && x !== r), 'no Toronto city page: the feed has no place field');
  assert.ok(!isNoindex(html), 'indexable');
  assert.equal(new Set(mine.map((c) => c.name)).size, mine.length, 'no two labels alike');
  const canada = pages.get('/cameras/canada/');
  assert.ok(canada.includes('/cameras/canada/toronto/'), 'the country hub links to it');
});
test('Calgary: one region hub, no city pages, every camera listed once as a link to the City picture address, the exact required credit and the pictures-are-the-City\'s caveat printed, link-out only', () => {
  const r = '/cameras/canada/calgary/';
  const mine = cameras.filter((c) => c.regionSlug === 'calgary');
  assert.ok(mine.length >= 100, 'the registry holds the Calgary list');
  const html = pages.get(r);
  assert.ok(html, 'page built');
  assert.ok(html.includes(`data-count="${mine.length}"`) && html.includes(`All ${mine.length} cameras`), 'count');
  const block = html.match(/<section data-block="cameras"[\s\S]*?<\/section>/)[0];
  assert.equal((block.match(/<li>/g) || []).length, mine.length, 'list length');
  for (const m of block.matchAll(/<li><a href="([^"]+)"/g)) assert.match(m[1], /^https:\/\/trafficcam\.calgary\.ca\/loc\d+\.jpg$/);
  assert.ok(!/<(img|video|iframe|source)\b/i.test(block), 'no media tag in the list');
  assert.ok(html.includes('Credit: Contains information licensed under the Open Government Licence – City of Calgary.'), 'the exact credit, one full stop');
  assert.ok(!html.includes('Calgary..'), 'no doubled full stop');
  assert.ok(/pictures belong to the City of Calgary/.test(html), 'the pictures are the City\'s');
  assert.ok(/does not say whether the picture files themselves are covered/.test(html), 'image caveat');
  assert.ok(![...pages.keys()].some((x) => x.startsWith(r) && x !== r), 'no Calgary city page: the feed has no place field');
  assert.ok(!isNoindex(html), 'indexable');
  assert.equal(new Set(mine.map((c) => c.name)).size, mine.length, 'no two labels alike');
  assert.ok(pages.get('/cameras/canada/').includes('/cameras/canada/calgary/'), 'the country hub links to it');
});
test('country hub of Canada: BC and Quebec regions with their own text, and the one-camera Quebec region is counted in the total but said to have no page', () => {
  const html = pages.get('/cameras/canada/');
  const total = cameras.filter((c) => countryOfRegion(c.regionSlug) === 'canada').length;
  assert.ok(html.includes(`${total} Canada traffic cameras in `), 'country total');
  const noHub = cameras.filter((c) => c.regionSlug === 'abitibi-temiscamingue').length;
  assert.equal(noHub, 1);
  assert.ok(html.includes('1 more camera is in regions with fewer than 3 cameras, which get no region page.'));
  assert.ok(/No camera here has a named place, so there are no city pages\./.test(html));
  assert.ok(/imported \d{4}-\d\d-\d\d\. Licence on record for MTMD Québec: Attribution \(CC-BY 4\.0\)\./.test(html.replace(/&#39;/g, "'")) || /Licence on record for MTMD/.test(html));
});
test('footer credit lines come from sources.json (one place): Finland and Quebec attribution appear on every page', () => {
  const srcs = JSON.parse(readFileSync('../data/camera-registry/sources.json', 'utf8'));
  const credits = ['digitraffic', 'quebec-mtmd'].map((id) => srcs.find((s) => s.id === id).attribution);
  for (const [route, html] of pages) { if (route === '/404/') continue; const f = html.match(/<footer[^>]*>[\s\S]*<\/footer>/)[0].replace(/&#39;/g, "'"); for (const c of credits) assert.ok(f.includes(c), `${route} footer lacks "${c}"`); }
});
test('footer credits link to the licence terms and say what we changed (CC BY: link to licence, note changes)', () => {
  const srcs = JSON.parse(readFileSync('../data/camera-registry/sources.json', 'utf8'));
  for (const [route, html] of pages) {
    if (route === '/404/') continue;
    const f = html.match(/<footer[^>]*>[\s\S]*<\/footer>/)[0];
    for (const id of ['digitraffic', 'quebec-mtmd']) assert.ok(f.includes(`href="${srcs.find((s) => s.id === id).licenseUrl}"`), `${route} footer has no licence link for ${id}`);
    assert.ok(/Changes by us:/.test(f), `${route} footer does not say what we changed`);
  }
});
const countryOfRegion = (slug) => ({ california: 'united-states', finland: 'finland' }[slug] || (slug ? 'canada' : null));

// ---- launch switch (owner 2026-11-23): PUBLIC_NOINDEX=1 hides EVERY page, robots disallows all, sitemap is empty ----
test('launch switch: PUBLIC_NOINDEX=1 build hides every page and offers no URL to search engines', () => {
  const out = mkdtempSync(join(tmpdir(), 'noindex-'));
  execFileSync(process.execPath, ['node_modules/astro/astro.js', 'build', '--outDir', out], { env: { ...process.env, PUBLIC_NOINDEX: '1' }, stdio: 'pipe' });
  const pages = readPages(out);
  assert.ok(pages.size > 20, 'built pages: ' + pages.size);
  for (const [route, html] of pages) assert.match(html, /<meta name="robots" content="noindex,nofollow"/, route + ' is not noindex,nofollow');
  assert.match(readFileSync(join(out, 'robots.txt'), 'utf8'), /Disallow: \//);
  assert.doesNotMatch(readFileSync(join(out, 'robots.txt'), 'utf8'), /Sitemap:/);
  assert.doesNotMatch(readFileSync(join(out, 'sitemap.xml'), 'utf8'), /<loc>/);
});
test('default build (launch switch off) is indexable and has a real sitemap', () => {
  assert.match(readFileSync(join(DIST, 'robots.txt'), 'utf8'), /Allow: \//);
  assert.match(readFileSync(join(DIST, 'sitemap.xml'), 'utf8'), /<loc>/);
});

test('city filters: a city with more than 8 cameras has the filter form and one row per camera; the full list stays in the HTML', () => {
  let withForm = 0;
  for (const r of cityRoutes) {
    const html = pages.get(r).html ?? pages.get(r);
    const m = html.match(/data-block="cameras"[^>]*data-count="(\d+)"/);
    if (!m) continue;
    const n = Number(m[1]);
    const block = html.slice(html.indexOf('data-block="cameras"'), html.indexOf('<h2>Nearby places'));
    const rows = (block.match(/<li>/g) || []).length;
    assert.equal(rows, n, `${r}: ${rows} rows for ${n} cameras (the filter only hides rows, it never removes them)`);
    assert.equal(html.includes('<form class="filters"'), n > 8, `${r}: filter form present only above 8 cameras`);
    if (n > 8) withForm++;
  }
  assert.ok(withForm > 0, 'no city page has the filter form');
});

test('status page: in the sitemap, linked from home, no health table without a fresh health file, headline never counts unchecked cameras as working', () => {
  const html = pages.get('/status/');
  assert.ok(html, 'no /status/ page');
  assert.ok(pages.get('/').includes('href="/status/"'), 'home does not link /status/');
  assert.ok(readFileSync(join(DIST, 'sitemap.xml'), 'utf8').includes(`${SITE_URL}/status/`), 'not in the sitemap');
  if (/data-asof="not-checked"/.test(html)) assert.ok(!html.slice(html.indexOf('data-block="network-health"'), html.indexOf('data-block="status-sources"')).includes('<table>'), 'a health table with no health file');
  else assert.match(html, /checked cameras reachable|No camera checked/);
  assert.ok(html.includes('With a road name'), 'coverage table missing');
});

test('saved page: noindex, not in the sitemap, linked from home, no camera data baked in, city pages carry the save script', () => {
  const html = pages.get('/saved/');
  assert.ok(html, 'no /saved/ page');
  assert.ok(isNoindex(html), '/saved/ must be noindex');
  assert.ok(!readFileSync(join(DIST, 'sitemap.xml'), 'utf8').includes('/saved/'), '/saved/ is in the sitemap');
  assert.ok(pages.get('/').includes('href="/saved/"'), 'home does not link /saved/');
  assert.ok(!/https:\/\/cwwp2/.test(html), 'camera URLs baked into the saved page');
});

test('road pages carry the save-road script and the saved page explains saving roads', () => {
  const roads = [...pages.keys()].filter((r) => /^\/roads\/[^/]+\/$/.test(r));
  assert.ok(roads.length > 0);
  for (const r of roads) assert.ok(/<script[^>]*type="module"/.test(pages.get(r)), `${r}: no script (the save-road button is added by it)`);
  assert.ok(pages.get('/saved/').includes('Save this road'));
});
