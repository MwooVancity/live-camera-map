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
