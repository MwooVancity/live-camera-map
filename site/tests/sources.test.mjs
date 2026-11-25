// /sources/ page: every registry source with cameras maps to a licence row; the built page matches the data files. Run `npm run build` first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DIST, SITE_URL } from './helpers.mjs';

const root = resolve(process.cwd(), '..');
const J = (f) => JSON.parse(readFileSync(resolve(root, f), 'utf8'));
const sources = J('data/camera-registry/sources.json');
const cams = J('data/camera-registry/cameras.json');
const rows = new Map(J('data/source-permissions.json').sources.map((r) => [r.id, r]));
const map = J('data/source-cards.json').map;
const withCams = sources.filter((s) => cams.some((c) => c.sourceId === s.id));

test('every registry source with cameras maps to an existing licence row', () => {
  for (const s of withCams) { assert.ok(map[s.id], `no mapping for ${s.id}`); assert.ok(rows.has(map[s.id]), `row ${map[s.id]} missing for ${s.id}`); }
  for (const id of Object.keys(map)) assert.ok(sources.some((s) => s.id === id), `mapping for unknown source ${id}`);
});

test('/sources/ renders one card per source with the data-file numbers, no pictures, no Argos name, in the sitemap', () => {
  const html = readFileSync(join(DIST, 'sources', 'index.html'), 'utf8');
  assert.equal((html.match(/data-source-id="/g) || []).length, withCams.length);
  for (const s of withCams) {
    const i = html.indexOf(`data-source-id="${s.id}"`); assert.ok(i > 0, s.id);
    const card = html.slice(i, html.indexOf('</section>', i));
    const n = cams.filter((c) => c.sourceId === s.id).length;
    assert.ok(new RegExp(`Cameras listed</dt><dd>${n}</dd>`).test(card), `${s.id} count ${n}`);
    const row = rows.get(map[s.id]);
    const enc = (t) => t.replace(/&/g, '&#38;').replace(/</g, '&#60;').replace(/"/g, '&#34;');
    const quote = row.metadataPermission.quote.replace(/https?:\/\/\S+/g, '[link]');
    if (quote) assert.ok(card.replace(/&#(38|x27|39);/g, (m) => (m === '&#38;' ? '&' : "'")).includes(quote.replace(/'/g, "'")) || card.includes(enc(quote)) || card.includes(quote.replace(/&/g, '&amp;')), `${s.id} quote`);
    assert.ok(card.includes(`, terms read ${row.reviewedAt}`), `${s.id} date`);
    assert.ok(card.includes(`Our record of it: ${row.metadataPermission.status}`), `${s.id} status`);
  }
  assert.ok(!/<img|<picture|<video|<iframe/i.test(html.slice(html.indexOf('data-block="sources"'), html.indexOf('</main>'))), 'picture tag');
  assert.ok(!/argos/i.test(html), 'Argos named');
  assert.ok(readFileSync(join(DIST, 'sitemap.xml'), 'utf8').includes(`${SITE_URL}/sources/`));
  assert.ok(html.includes('href="/sources/"'), 'footer link');
  assert.ok(readFileSync(join(DIST, 'status', 'index.html'), 'utf8').includes('href="/sources/"'), 'status link');
});
