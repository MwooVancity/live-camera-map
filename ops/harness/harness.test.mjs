// Proves each harness gate can FAIL (and that the good fixture passes). Run: node --test ops/harness/harness.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
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
const page = (body, head = '') => `<!doctype html><html lang="en"><head><title>t</title>${head}</head><body>${body}</body></html>`;
const a = (h, t = 'x') => `<a href="${h}">${t}</a>`;
function site(mut = {}) {
  const d = mkdtempSync(join(tmpdir(), 'pg-'));
  const w = (route, html) => { const dir = join(d, route); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'index.html'), html); };
  const cities = ['la', 'sf', 'sd', 'sac'];
  w('', page(a('/cameras/') + a('/map/') + a('/guides/dead-links/')));
  w('map', page('<p>Map intro here.</p>' + a('/cameras/')));
  w('cameras', page(a('/cameras/ca/')));
  w('cameras/ca', page(cities.map((c) => a(`/cameras/ca/${c}/`)).join('')));
  const cityBody = (c) => cities.filter((o) => o !== c).map((o) => a(`/cameras/ca/${o}/`)).join('') + a('/cameras/ca/') + a('/guides/dead-links/') + a('/map/') +
    `<section data-block="cameras" data-basis="registry" data-source="caltrans" data-asof="2026-11-22"><p>${c} has its own roads number ${c.length} and unique wording for ${c} drivers today.</p><p>Highway ${c} runs past exit ${c.length * 7} with distinct camera spacing in ${c}.</p></section>`;
  for (const c of cities) w(`cameras/ca/${c}`, mut.city ? mut.city(c, cityBody(c)) : page(cityBody(c)));
  w('guides/dead-links', page(a('/cameras/ca/la/') + '<p>What to do if a link is dead.</p>'));
  if (mut.extra) mut.extra(w);
  return d;
}
const md = ['/', '/map/', '/cameras/', '/cameras/ca/', '/cameras/ca/la/', '/cameras/ca/sf/', '/cameras/ca/sd/', '/cameras/ca/sac/', '/guides/dead-links/'].map((r) => `- \`${r}\` Beats Argos by: own data per page`).join('\n');

test('good fixture passes the page gate', () => assert.deepStrictEqual(gate(site(), md), []));
test('orphan page fails', () => assert.ok(gate(site({ extra: (w) => w('lonely', page('<p>hi</p>')) }), md).some((e) => /orphan/.test(e))));
test('camera image fails link-out rule', () => assert.ok(gate(site({ city: (c, b) => page(b + '<img src="https://cwwp2.dot.ca.gov/x.jpg">') }), md).some((e) => /link-out/.test(e))));
test('block without source or as-of fails', () => assert.ok(gate(site({ city: (c, b) => page(b + '<section data-block="weather"><p>w</p></section>') }), md).filter((e) => /no data-(source|asof)/.test(e)).length >= 2));
const live = (asof) => `<section data-block="road-conditions" data-source="Caltrans" data-asof="${asof}"><p>Closure on the main road today.</p></section>`;
const iso = (hAgo) => new Date(Date.now() - hAgo * 3600000).toISOString();
test('live block with data older than 24 h at build fails the page gate', () => assert.ok(gate(site({ city: (c, b) => page(b + live(iso(30))) }), md).some((e) => /older than 24 h/.test(e))));
test('live block with fresh data passes the page gate', () => assert.deepStrictEqual(gate(site({ city: (c, b) => page(b + live(iso(1))) }), md), []));
test('old registry-based block is not a stale failure', () => assert.deepStrictEqual(gate(site(), md, new Date('2027-06-01')), []));
test('city without related links fails', () => assert.ok(gate(site({ city: (c, b) => page(b.replace(/<a href="\/cameras\/ca\/(la|sf|sd|sac)\/">x<\/a>/g, '')) }), md).some((e) => /related-city/.test(e))));
test('swapped-city-name pages fail the duplicate check', () => {
  const same = '<p>This page lists every camera along the main highways in the city today.</p><p>Each camera links to the official source and shows when it was last checked.</p>';
  const errs = gate(site({ city: (c, b) => page(b.replace(/<section[\s\S]*<\/section>/, `<section data-block="cameras" data-source="s" data-asof="d">${same}</section>`)) }), md);
  assert.ok(errs.some((e) => /near-duplicate/.test(e)));
});
test('missing Beats Argos line fails', () => assert.ok(gate(site(), md.split('\n').slice(0, 4).join('\n')).some((e) => /Beats Argos/.test(e))));
test('hub missing a child link fails', () => {
  const d = site();
  writeFileSync(join(d, 'cameras', 'ca', 'index.html'), page(a('/cameras/ca/la/') + a('/cameras/ca/sf/') + a('/cameras/ca/sd/')));
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
      let body = ROADS.filter((o) => o !== r).map((o) => a(`/roads/${o}/`)).join('') + a('/roads/') + a('/cameras/ca/la/') + a('/cameras/ca/sf/') + a('/guides/dead-links/') + a('/map/') +
        `<section data-block="cameras" data-basis="registry" data-source="caltrans" data-asof="2026-11-22"><p>Road ${WORD[r]} runs past its own exit with camera spacing unique to ${WORD[r]}.</p><p>The ${WORD[r]} corridor has distinct wording for ${WORD[r]} drivers today.</p><ul>${event()}</ul></section>`;
      if (opts.mut) body = opts.mut(r, body);
      w(`roads/${r}`, page(body));
    }
  } });
}
const strip = (re) => (r, b) => b.replace(re, '');
test('good road fixture passes the page gate', () => assert.deepStrictEqual(gate(roadSite(), roadMd), []));
test('road page without the hub link fails', () => assert.ok(gate(roadSite({ mut: strip(/<a href="\/roads\/">x<\/a>/) }), roadMd).some((e) => /no link to the roads hub/.test(e))));
test('road page with fewer than 3 related roads fails', () => assert.ok(gate(roadSite({ mut: (r, b) => b.replace(/<a href="\/roads\/(?!")[a-z0-9-]+\/">x<\/a>/g, '') }), roadMd).some((e) => /related-road links/.test(e))));
test('road page with fewer than 2 city links fails', () => assert.ok(gate(roadSite({ mut: (r, b) => b.replace(/<a href="\/cameras\/ca\/sf\/">x<\/a>/, '') }), roadMd).some((e) => /city-page links/.test(e))));
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
// a second region "bc" with only 3 city pages: each links its 2 region siblings plus 1 nearest city of region "ca" (3 related, as the gate needs)
const bcCities = ['campbell-river', 'dawson-creek', 'elkford'];
const bcMd = [md, '- `/cameras/bc/` Beats Argos by: one region hub', ...bcCities.map((c) => `- \`/cameras/bc/${c}/\` Beats Argos by: every camera as a named official link with a checked status`)].join('\n');
function bcSite(fill = true) {
  return site({ extra: (w) => {
    w('cameras', page(a('/cameras/ca/') + a('/cameras/bc/')));
    w('cameras/bc', page(bcCities.map((c) => a(`/cameras/bc/${c}/`)).join('')));
    for (const c of bcCities) {
      w(`cameras/bc/${c}`, page(bcCities.filter((o) => o !== c).map((o) => a(`/cameras/bc/${o}/`)).join('') + (fill ? a('/cameras/ca/la/') : '') + a('/cameras/bc/') + a('/guides/dead-links/') + a('/map/') +
        `<section data-block="cameras" data-basis="registry" data-source="drivebc" data-asof="2026-11-23"><p>${c} has unique cameras named for ${c} with their own roads in the BC list today.</p><p>Highway number ${c.length} faces its own direction near ${c} only.</p></section>`));
    }
  } });
}
test('a region with only 3 city pages passes when each links its 2 siblings and 1 city of the nearest other region', () => assert.deepStrictEqual(gate(bcSite(true), bcMd), []));
test('failing fixture: the same small region with no cross-region link has only 2 related cities and fails', () => assert.ok(gate(bcSite(false), bcMd).some((e) => /\/cameras\/bc\/.*2 related-city links, need 3/.test(e))));
test('a BC hub that does not link a city fails like any hub', () => {
  const d = bcSite(true);
  writeFileSync(join(d, 'cameras', 'bc', 'index.html'), page(a('/cameras/bc/campbell-river/') + a('/cameras/bc/dawson-creek/')));
  assert.ok(gate(d, bcMd).some((e) => /\/cameras\/bc\/: does not link child \/cameras\/bc\/elkford\//.test(e)));
});
