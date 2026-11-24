// Proves each harness gate can FAIL (and that the good fixture passes). Run: node --test ops/harness/harness.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decide } from './hook-pretool.mjs';
import { gate } from './page-gate.mjs';

// ---- hook: gev/ immutability ----
test('hook blocks Edit and Write under gev/', () => {
  assert.ok(decide('Edit', { file_path: 'C:\\Users\\x\\live-camera-map\\gev\\src\\a.js' }));
  assert.ok(decide('Write', { file_path: 'gev/README.md' }));
});
test('hook allows Edit outside gev/ and names that merely contain gev', () => {
  assert.strictEqual(decide('Edit', { file_path: 'C:\\Users\\x\\live-camera-map\\ops\\a.js' }), null);
  assert.strictEqual(decide('Write', { file_path: 'docs/gevaluation.md' }), null);
});
test('hook blocks Bash writes in gev/, allows reads', () => {
  assert.ok(decide('Bash', { command: 'rm -rf gev/node_modules' }));
  assert.ok(decide('Bash', { command: 'cd gev && npm install' }));
  assert.ok(decide('Bash', { command: 'git -C gev checkout main' }));
  assert.strictEqual(decide('Bash', { command: 'git -C gev status --porcelain' }), null);
  assert.strictEqual(decide('Bash', { command: 'cat gev/SECURITY.md' }), null);
  assert.strictEqual(decide('Bash', { command: 'node tests/immutability/check.mjs' }), null);
});

// ---- page gate ----
const SEARCH = '<div id="site-search" role="search"><form><input type="search"></form><noscript><a href="/cameras/">c</a> <a href="/roads/">r</a>.</noscript></div>';
const pageNoSearch = (body, head = '') => `<!doctype html><html lang="en"><head><title>t</title>${head}</head><body>${body}</body></html>`;
const page = (body, head = '') => pageNoSearch(SEARCH + body, head); // every fixture page carries the search box, like the real layout
const a = (h, t = 'x') => `<a href="${h}">${t}</a>`;
function site(mut = {}) {
  const d = mkdtempSync(join(tmpdir(), 'pg-'));
  const w = (route, html) => { const dir = join(d, route); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'index.html'), html); };
  const cities = ['la', 'sf', 'sd', 'sac'];
  w('', page(a('/cameras/') + a('/map/') + a('/guides/dead-links/')));
  w('map', page('<p>Map intro here.</p>' + a('/cameras/')));
  w('cameras', page(a('/cameras/us/')));
  w('cameras/us', page(a('/cameras/') + a('/cameras/us/ca/')));
  w('cameras/us/ca', page(a('/cameras/us/') + cities.map((c) => a(`/cameras/us/ca/${c}/`)).join('')));
  const cityBody = (c) => '<p>Do not use this page while driving.</p>' + cities.filter((o) => o !== c).map((o) => a(`/cameras/us/ca/${o}/`)).join('') + a('/cameras/us/ca/') + a('/guides/dead-links/') + a('/map/') +
    `<section data-block="cameras" data-basis="registry" data-source="caltrans" data-asof="2026-11-22"><p>${c} has its own roads number ${c.length} and unique wording for ${c} drivers today.</p><p>Highway ${c} runs past exit ${c.length * 7} with distinct camera spacing in ${c}.</p></section>`;
  for (const c of cities) w(`cameras/us/ca/${c}`, mut.city ? mut.city(c, cityBody(c)) : page(cityBody(c)));
  w('guides/dead-links', page(a('/cameras/us/ca/la/') + '<p>What to do if a link is dead.</p>'));
  if (mut.extra) mut.extra(w);
  return d;
}
const md = ['/', '/map/', '/cameras/', '/cameras/us/', '/cameras/us/ca/', '/cameras/us/ca/la/', '/cameras/us/ca/sf/', '/cameras/us/ca/sd/', '/cameras/us/ca/sac/', '/guides/dead-links/'].map((r) => `- \`${r}\` Beats Argos by: own data per page`).join('\n');

test('good fixture passes the page gate', () => assert.deepStrictEqual(gate(site(), md), []));
test('orphan page fails', () => assert.ok(gate(site({ extra: (w) => w('lonely', page('<p>hi</p>')) }), md).some((e) => /orphan/.test(e))));
test('camera image fails link-out rule', () => assert.ok(gate(site({ city: (c, b) => page(b + '<img src="https://cwwp2.dot.ca.gov/x.jpg">') }), md).some((e) => /link-out/.test(e))));
test('block without source or as-of fails', () => assert.ok(gate(site({ city: (c, b) => page(b + '<section data-block="weather"><p>w</p></section>') }), md).filter((e) => /no data-(source|asof)/.test(e)).length >= 2));
const live = (asof) => `<section data-block="road-conditions" data-source="Caltrans" data-asof="${asof}"><p>Closure on the main road today.</p></section>`;
const withLive = (b, asof) => b.replace('<section data-block="cameras"', live(asof) + '<section data-block="cameras"'); // conditions go above the camera list
const iso = (hAgo) => new Date(Date.now() - hAgo * 3600000).toISOString();
test('live block with data older than 24 h at build fails the page gate', () => assert.ok(gate(site({ city: (c, b) => page(withLive(b, iso(30))) }), md).some((e) => /older than 24 h/.test(e))));
test('live block with fresh data passes the page gate', () => assert.deepStrictEqual(gate(site({ city: (c, b) => page(withLive(b, iso(1))) }), md), []));
test('old registry-based block is not a stale failure', () => assert.deepStrictEqual(gate(site(), md, new Date('2027-06-01')), []));
test('city without related links fails', () => assert.ok(gate(site({ city: (c, b) => page(b.replace(/<a href="\/cameras\/us\/ca\/(la|sf|sd|sac)\/">x<\/a>/g, '')) }), md).some((e) => /related-city/.test(e))));
test('swapped-city-name pages fail the duplicate check', () => {
  const same = '<p>This page lists every camera along the main highways in the city today.</p><p>Each camera links to the official source and shows when it was last checked.</p>';
  const errs = gate(site({ city: (c, b) => page(b.replace(/<section[\s\S]*<\/section>/, `<section data-block="cameras" data-source="s" data-asof="d">${same}</section>`)) }), md);
  assert.ok(errs.some((e) => /near-duplicate/.test(e)));
});
test('missing Beats Argos line fails', () => assert.ok(gate(site(), md.split('\n').slice(0, 4).join('\n')).some((e) => /Beats Argos/.test(e))));
test('hub missing a child link fails', () => {
  const d = site();
  writeFileSync(join(d, 'cameras', 'us', 'ca', 'index.html'), page(a('/cameras/us/ca/la/') + a('/cameras/us/ca/sf/') + a('/cameras/us/ca/sd/')));
  assert.ok(gate(d, md).some((e) => /does not link child/.test(e)));
});

// ---- road pages (plan review item 2) ----
const ROADS = ['i-5', 'i-10', 'sr-1', 'us-101'];
const WORD = { 'i-5': 'alpha', 'i-10': 'bravo', 'sr-1': 'charlie', 'us-101': 'delta' };
const roadMd = [md, '- `/roads/` Beats Argos by: one hub that links every road', ...ROADS.map((r) => `- \`/roads/${r}/\` Beats Argos by: cameras in driving order with nearest cameras per event`)].join('\n');
const event = (cam = true) => `<li data-event="closure">Closure on the ramp today.${cam ? ' Nearest cameras: ' + a('https://cwwp2.dot.ca.gov/x', 'cam').replace('<a ', '<a data-nearest ') : ''}</li>`;
// opts: mut(road, body) -> body; hub(links) -> html; drop home link to the hub
function roadSite(opts = {}) {
  return site({ extra: (w) => {
    w('', page(a('/cameras/') + a('/map/') + a('/guides/dead-links/') + (opts.homeLink === false ? '' : a('/roads/'))));
    w('roads', page(opts.hub ? opts.hub(ROADS) : ROADS.map((r) => a(`/roads/${r}/`)).join('')));
    for (const r of ROADS) {
      let body = '<p>Do not use this page while driving.</p>' + '<a href="#dir-north">north</a>' + ROADS.filter((o) => o !== r).map((o) => a(`/roads/${o}/`)).join('') + a('/roads/') + a('/cameras/us/ca/la/') + a('/cameras/us/ca/sf/') + a('/guides/dead-links/') + a('/map/') +
        `<section data-block="cameras" data-basis="registry" data-source="caltrans" data-asof="2026-11-22"><p>Road ${WORD[r]} runs past its own exit with camera spacing unique to ${WORD[r]}.</p><p>The ${WORD[r]} corridor has distinct wording for ${WORD[r]} drivers today.</p><h3 id="dir-north">North</h3><ul>${event()}</ul></section>`;
      if (opts.mut) body = opts.mut(r, body);
      w(`roads/${r}`, page(body));
    }
  } });
}
const strip = (re) => (r, b) => b.replace(re, '');
test('good road fixture passes the page gate', () => assert.deepStrictEqual(gate(roadSite(), roadMd), []));
test('road page without the hub link fails', () => assert.ok(gate(roadSite({ mut: strip(/<a href="\/roads\/">x<\/a>/) }), roadMd).some((e) => /no link to the roads hub/.test(e))));
test('road page with fewer than 3 related roads fails', () => assert.ok(gate(roadSite({ mut: (r, b) => b.replace(/<a href="\/roads\/(?!")[a-z0-9-]+\/">x<\/a>/g, '') }), roadMd).some((e) => /related-road links/.test(e))));
test('road page with fewer than 2 city links fails', () => assert.ok(gate(roadSite({ mut: (r, b) => b.replace(/<a href="\/cameras\/us\/ca\/sf\/">x<\/a>/, '') }), roadMd).some((e) => /city-page links/.test(e))));
test('road page without a guide link fails', () => assert.ok(gate(roadSite({ mut: strip(/<a href="\/guides\/dead-links\/">x<\/a>/) }), roadMd).some((e) => /no link to any guide/.test(e))));
test('road page without a map link fails', () => assert.ok(gate(roadSite({ mut: (r, b) => b.replace('<a href="/map/">x</a>', '') }), roadMd).some((e) => /no link to \/map\//.test(e))));
test('roads hub missing a road fails', () => assert.ok(gate(roadSite({ hub: (rs) => rs.slice(1).map((r) => a(`/roads/${r}/`)).join('') }), roadMd).some((e) => /\/roads\/: does not link child \/roads\/i-5\//.test(e))));
test('road pages not linked from / are orphans (reachable within 3 clicks is enforced)', () => assert.ok(gate(roadSite({ homeLink: false }), roadMd).some((e) => /orphan/.test(e))));
test('closure or sign with no nearest camera link fails', () => assert.ok(gate(roadSite({ mut: (r, b) => b.replace(event(), event(false)) }), roadMd).some((e) => /lists no nearest camera/.test(e))));
test('road pages that share their sentences fail the duplicate check', () => {
  const same = '<p>This road has cameras in driving order for every direction it runs.</p><p>Each closure lists the cameras that are nearest to it on the map.</p>';
  assert.ok(gate(roadSite({ mut: (r, b) => b.replace(/<p>[\s\S]*<\/p>/, same) }), roadMd).some((e) => /near-duplicate/.test(e) && /roads/.test(e)));
});
test('road page without a Beats Argos line fails', () => assert.ok(gate(roadSite(), roadMd.split('\n').filter((l) => !l.includes('/roads/sr-1/')).join('\n')).some((e) => /\/roads\/sr-1\/: PAGES.md/.test(e))));

// ---- British Columbia (second region): link-out for drivebc.ca pictures, and the silo rule for a region with few cities ----
test('a DriveBC camera picture in an image tag fails the link-out rule (failing fixture); a plain link to it is fine', () => {
  const bad = gate(site({ city: (c, b) => page(b + '<img src="https://www.drivebc.ca/images/520.jpg">') }), md);
  assert.ok(bad.some((e) => /link-out/.test(e) && /drivebc/.test(e)), bad.join('\n'));
  assert.deepStrictEqual(gate(site({ city: (c, b) => page(b + a('https://www.drivebc.ca/images/520.jpg', 'Britannia')) }), md), []);
});
// ---- Finland and Quebec link-out hosts (2026-11-23) ----
test('a Finland or Quebec camera picture or video in a page tag fails the link-out rule (failing fixtures); plain links are fine', () => {
  for (const [tag, host] of [['<img src="https://weathercam.digitraffic.fi/C0150301.jpg">', /digitraffic/], ['<video src="https://www.quebec511.info/Carte/Fenetres/FenetreVideo.html?id=3998"></video>', /quebec511/], ['<iframe src="https://www.quebec511.info/Carte/Fenetres/FenetreVideo.html?id=1"></iframe>', /quebec511/]]) {
    const bad = gate(site({ city: (c, b) => page(b + tag) }), md);
    assert.ok(bad.some((e) => /link-out/.test(e) && host.test(e)), `${tag}: ${bad.join(' | ')}`);
  }
  assert.deepStrictEqual(gate(site({ city: (c, b) => page(b + a('https://weathercam.digitraffic.fi/C0150301.jpg', 'Inkoo') + a('https://www.quebec511.info/Carte/Fenetres/FenetreVideo.html?id=3998', 'Aut. 540')) }), md), []);
});
// a second region "bc" with only 3 city pages: each links its 2 region siblings plus 1 nearest city of region "ca" (3 related, as the gate needs)
const bcCities = ['campbell-river', 'dawson-creek', 'elkford'];
const bcMd = [md, '- `/cameras/cn/` Beats Argos by: one country hub with its regions and sources', '- `/cameras/cn/bc/` Beats Argos by: one region hub', ...bcCities.map((c) => `- \`/cameras/cn/bc/${c}/\` Beats Argos by: every camera as a named official link with a checked status`)].join('\n');
function bcSite(fill = true) {
  return site({ extra: (w) => {
    w('cameras', page(a('/cameras/us/') + a('/cameras/cn/')));
    w('cameras/cn', page(a('/cameras/') + a('/cameras/cn/bc/')));
    w('cameras/cn/bc', page(a('/cameras/cn/') + bcCities.map((c) => a(`/cameras/cn/bc/${c}/`)).join('')));
    for (const c of bcCities) {
      w(`cameras/cn/bc/${c}`, page('<p>Do not use this page while driving.</p>' + bcCities.filter((o) => o !== c).map((o) => a(`/cameras/cn/bc/${o}/`)).join('') + (fill ? a('/cameras/us/ca/la/') : '') + a('/cameras/cn/bc/') + a('/guides/dead-links/') + a('/map/') +
        `<section data-block="cameras" data-basis="registry" data-source="drivebc" data-asof="2026-11-23"><p>${c} has unique cameras named for ${c} with their own roads in the BC list today.</p><p>Highway number ${c.length} faces its own direction near ${c} only.</p></section>`));
    }
  } });
}
test('a region with only 3 city pages passes when each links its 2 siblings and 1 city of the nearest other region', () => assert.deepStrictEqual(gate(bcSite(true), bcMd), []));
test('failing fixture: the same small region with no cross-region link has only 2 related cities and fails', () => assert.ok(gate(bcSite(false), bcMd).some((e) => /\/cameras\/cn\/bc\/.*2 related-city links, need 3/.test(e))));
test('a BC hub that does not link a city fails like any hub', () => {
  const d = bcSite(true);
  writeFileSync(join(d, 'cameras', 'cn', 'bc', 'index.html'), page(a('/cameras/cn/') + a('/cameras/cn/bc/campbell-river/') + a('/cameras/cn/bc/dawson-creek/')));
  assert.ok(gate(d, bcMd).some((e) => /\/cameras\/cn\/bc\/: does not link child \/cameras\/cn\/bc\/elkford\//.test(e)));
});

// ---- country level (world hub -> country -> region -> city) ----
test('good fixture with two countries passes (world hub links both, each country links its region)', () => assert.deepStrictEqual(gate(bcSite(true), bcMd), []));
test('failing fixture: the world hub does not link a country', () => {
  const d = bcSite(true);
  writeFileSync(join(d, 'cameras', 'index.html'), page(a('/cameras/us/')));
  const e = gate(d, bcMd);
  assert.ok(e.some((x) => /\/cameras\/: does not link child \/cameras\/cn\//.test(x)), e.join('\n'));
});
test('failing fixture: a country hub does not link one of its regions', () => {
  const d = bcSite(true);
  writeFileSync(join(d, 'cameras', 'us', 'index.html'), page(a('/cameras/')));
  assert.ok(gate(d, bcMd).some((x) => /\/cameras\/us\/: does not link child \/cameras\/us\/ca\//.test(x)));
});
test('failing fixture: a region hub does not link its country', () => {
  const d = bcSite(true);
  writeFileSync(join(d, 'cameras', 'cn', 'bc', 'index.html'), page(bcCities.map((c) => a(`/cameras/cn/bc/${c}/`)).join('')));
  assert.ok(gate(d, bcMd).some((x) => /\/cameras\/cn\/bc\/: no link to its country \/cameras\/cn\//.test(x)));
});
test('failing fixture: a country hub does not link the world hub', () => {
  const d = bcSite(true);
  writeFileSync(join(d, 'cameras', 'cn', 'index.html'), page(a('/cameras/cn/bc/')));
  assert.ok(gate(d, bcMd).some((x) => /\/cameras\/cn\/: no link to the world hub/.test(x)));
});
test('failing fixture: a region whose country hub was never built fails', () => {
  const d = site();
  mkdirSync(join(d, 'cameras', 'zz', 'r'), { recursive: true });
  writeFileSync(join(d, 'cameras', 'zz', 'r', 'index.html'), page(a('/cameras/')));
  assert.ok(gate(d, md).some((x) => /\/cameras\/zz\/r\/: country hub \/cameras\/zz\/ was not built/.test(x)));
});
test('depth limit is 4 clicks: the good fixture passes, a page 4 clicks away is allowed, a page 5 clicks away fails', () => {
  // home links only /cameras/ and the guide; the city pages are then reached through the hub chain (4 clicks) or the guide (2)
  const chain = (extra) => site({ extra: (w) => {
    w('', page(a('/cameras/') + a('/map/') + a('/guides/dead-links/') + (extra ? a('/deep/a/') : '')));
    if (extra) extra(w);
  } });
  assert.deepStrictEqual(gate(chain(), md), [], 'the legal chain must pass');
  const deep = chain((w) => { w('deep/a', page(a('/deep/b/'))); w('deep/b', page(a('/deep/c/'))); w('deep/c', page(a('/deep/d/'))); w('deep/d', page(a('/deep/e/'))); w('deep/e', page('<p>five clicks</p>')); });
  const e = gate(deep, md + '\n- `/deep/a/` Beats Argos by: x');
  assert.ok(e.some((x) => /\/deep\/e\/: 5 clicks from \/, max 4/.test(x)), e.join('\n'));
  assert.ok(!e.some((x) => /\/deep\/d\/: \d clicks/.test(x)), 'a page 4 clicks away is allowed');
});
test('country hubs that share their sentences fail the near-duplicate check', () => {
  const same = '<p>This country lists every region with its official camera source and import date.</p><p>Each region links to its own cities with the number of cameras each has.</p>';
  const d = bcSite(true);
  writeFileSync(join(d, 'cameras', 'us', 'index.html'), page(a('/cameras/') + a('/cameras/us/ca/') + same));
  writeFileSync(join(d, 'cameras', 'cn', 'index.html'), page(a('/cameras/') + a('/cameras/cn/bc/') + same));
  assert.ok(gate(d, bcMd).some((x) => /near-duplicate/.test(x) && /cameras\/(us|cn)\//.test(x)));
});
test('a shared footer alone is not a near-duplicate (only body sentences count)', () => {
  const foot = '<footer><p>This footer is the same on every page of the whole site by design.</p><p>Credits and licence links are listed here for every country we cover.</p><p>No ads, no tracking, no third-party scripts or fonts on any page.</p></footer>';
  const d = bcSite(true);
  writeFileSync(join(d, 'cameras', 'us', 'index.html'), page(a('/cameras/') + a('/cameras/us/ca/') + '<p>California has its own list of official traffic camera sources.</p>' + foot));
  writeFileSync(join(d, 'cameras', 'cn', 'index.html'), page(a('/cameras/') + a('/cameras/cn/bc/') + '<p>British Columbia lists cameras from the provincial DriveBC feed.</p>' + foot));
  assert.ok(!gate(d, bcMd).some((x) => /near-duplicate/.test(x)));
});
test('failing fixture: an indexable country hub without a Beats Argos line fails', () => assert.ok(gate(bcSite(true), bcMd.split('\n').filter((l) => !l.includes('`/cameras/cn/`')).join('\n')).some((x) => /\/cameras\/cn\/: PAGES.md/.test(x))));

// ---- reader-first rules on city and road pages ----
test('failing fixture: a city page without the driving notice fails', () => assert.ok(gate(site({ city: (c, b) => page(b.replace('Do not use this page while driving.', 'Hello.')) }), md).some((e) => /no "Do not use this page while driving" notice/.test(e))));
test('failing fixture: a road page without the driving notice fails', () => assert.ok(gate(roadSite({ mut: (r, b) => b.replace('Do not use this page while driving.', 'Hello.') }), roadMd).some((e) => /\/roads\/.*no "Do not use/.test(e))));
test('failing fixture: closures below the camera list fail (conditions first)', () => assert.ok(gate(site({ city: (c, b) => page(b + live(iso(1))) }), md).some((e) => /road-conditions block is below the camera list/.test(e))));
const mark = (st) => `<span data-status="${st}">Status: ${st}.</span>`;
const WORDS = 'Reachable means a. Stale means b. Unavailable means c. Unknown means d.';
const health = (asof) => `<section data-block="health" data-source="checker" data-asof="${asof}"><p>Last check done.</p></section>`;
const withCams = (b, inner) => b.replace('</section>', `${inner}</section>`);
test('good fixture with health markers and the four status words passes', () => assert.deepStrictEqual(gate(site({ city: (c, b) => page(withCams(b, `<p>${WORDS}</p>${mark('reachable')}`) + health(iso(1))) }), md), []));
test('failing fixture: markers present but the page says the link check never ran', () => assert.ok(gate(site({ city: (c, b) => page(withCams(b, `<p>${WORDS}</p>${mark('reachable')}<p>Link check by us: never run yet.</p>`)) }), md).some((e) => /never ran, but the page has health markers/.test(e))));
test('failing fixture: a real health block beside "Not checked yet" text fails', () => assert.ok(gate(site({ city: (c, b) => page(b + health(iso(1)) + '<p>Not checked yet.</p>') }), md).some((e) => /never ran/.test(e))));
test('"Not checked yet" is fine when the health block says not-checked and there are no markers', () => assert.deepStrictEqual(gate(site({ city: (c, b) => page(b + health('not-checked') + '<p>Not checked yet.</p>') }), md), []));
test('failing fixture: markers without the status words fail', () => assert.ok(gate(site({ city: (c, b) => page(withCams(b, mark('stale'))) }), md).some((e) => /status word "Reachable" is not defined/.test(e))));
test('failing fixture: a camera list that claims a picture is fresh fails', () => assert.ok(gate(site({ city: (c, b) => page(withCams(b, `<p>${WORDS} Every picture is fresh.</p>${mark('reachable')}`)) }), md).some((e) => /claims a picture is fresh/.test(e))));
test('failing fixture: a road page with a jump link to a missing direction list fails; one with no jump links fails', () => {
  assert.ok(gate(roadSite({ mut: (r, b) => b.replace('<h3 id="dir-north">', '<h3>') }), roadMd).some((e) => /jump link #dir-north has no target/.test(e)));
  assert.ok(gate(roadSite({ mut: (r, b) => b.replace('<a href="#dir-north">north</a>', '') }), roadMd).some((e) => /no jump links/.test(e)));
});

// ---- search box on every page (rule 'search-box') ----
test('good fixture: every page has the search box, so the gate has no search error', () => assert.ok(!gate(site(), md).some((e) => /search box/.test(e))));
test('failing fixture: a page with no search box fails', () => {
  const errs = gate(site({ extra: (w) => w('map', pageNoSearch('<p>Map intro here.</p>' + a('/cameras/'))) }), md);
  assert.ok(errs.some((e) => /^\/map\/: no search box/.test(e)), errs.join('\n'));
});
test('failing fixture: a search input without role="search" fails', () => {
  const errs = gate(site({ city: (c, b) => pageNoSearch('<div><form><input type="search"></form><noscript><a href="/cameras/">c</a><a href="/roads/">r</a></noscript></div>' + b) }), md);
  assert.ok(errs.some((e) => /no search box/.test(e)));
});
test('failing fixture: a search box with no <noscript> fallback to /cameras/ and /roads/ fails', () => {
  const errs = gate(site({ city: (c, b) => pageNoSearch('<div role="search"><form><input type="search"></form></div>' + b) }), md);
  assert.ok(errs.some((e) => /no <noscript> fallback/.test(e)));
  const half = gate(site({ city: (c, b) => pageNoSearch('<div role="search"><input type="search"><noscript><a href="/cameras/">c</a></noscript></div>' + b) }), md);
  assert.ok(half.some((e) => /no <noscript> fallback/.test(e)));
});

// ---- prompt hook: Line 0 and the ask-ChatGPT rule are printed on every request (owner 2026-11-24) ----
import { execFileSync } from 'node:child_process';
test('prompt hook prints Line 0 and the ask-ChatGPT-every-chance rule', () => {
  const out = execFileSync(process.execPath, [new URL('./hook-prompt.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')], { encoding: 'utf8' });
  assert.match(out, /LINE 0/);
  assert.match(out, /ASK CHATGPT EVERY CHANCE/);
  assert.match(out, /never bypass/);
  assert.match(out, /GAP CHECK/);
  assert.match(out, /Do not fill gaps with guesses/);
});

// Gap check (owner 2026-11-24): every ChatGPT row in plan.md section 9 dated 2026-11-25 or later lists what was MISSING from our prompt.
test('plan.md section 9: ChatGPT rows from 2026-11-25 carry a MISSING: line', () => {
  const plan = readFileSync(new URL('../../plan.md', import.meta.url), 'utf8');
  const bad = [];
  for (const line of plan.split(/\r?\n/)) {
    const m = /^\| (\d{4}-\d{2}-\d{2}) \|/.exec(line);
    if (!m || m[1] < '2026-11-25' || !/ChatGPT/.test(line)) continue;
    if (!line.includes('MISSING:')) bad.push(line.slice(0, 80));
  }
  assert.deepEqual(bad, [], 'ChatGPT rows without a MISSING: line');
});
