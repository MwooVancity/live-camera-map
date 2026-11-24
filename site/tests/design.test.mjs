// Design gate (plan item 24): the site's look stays tied to the measured GEV tokens, and stays readable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const base = readFileSync(resolve(root, 'site/src/layouts/Base.astro'), 'utf8');
const tokens = JSON.parse(readFileSync(resolve(root, 'data/gev-design-tokens.json'), 'utf8'));
const v = (name) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(base)?.[1]?.toLowerCase();

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('site colours equal the colours measured in the running GEV', () => {
  assert.equal(v('bg'), tokens.background, 'page background');
  assert.equal(v('fg'), tokens.text, 'body text');
  assert.equal(v('link'), tokens.accent, 'link colour');
  assert.equal(v('cta'), tokens.accent, 'call-to-action colour');
});

test('site fonts are the GEV families, self-hosted (no third-party font request)', () => {
  assert.match(base, new RegExp(`--font-body:\\s*${tokens.bodyFont}`));
  assert.match(base, new RegExp(`--font-mono:\\s*'${tokens.monoFont}'`));
  for (const f of ['inter-latin-400-normal', 'inter-latin-600-normal', 'jetbrains-mono-latin-400-normal', 'jetbrains-mono-latin-700-normal']) {
    assert.ok(existsSync(resolve(root, `site/public/fonts/${f}.woff2`)), `missing font file ${f}`);
  }
  assert.doesNotMatch(base, /fonts\.googleapis\.com|fonts\.gstatic\.com/, 'a third-party font host');
});

test('WCAG AA contrast (4.5:1) for every text pair the theme uses', () => {
  const bg = v('bg'), panel = v('panel');
  const pairs = [['fg on bg', v('fg'), bg], ['fg on panel', v('fg'), panel], ['link on bg', v('link'), bg], ['link on panel', v('link'), panel], ['muted on bg', v('mut'), bg], ['muted on panel', v('mut'), panel], ['button text on cta', v('ctatext'), v('cta')]];
  for (const [name, a, b] of pairs) assert.ok(contrast(a, b) >= 4.5, `${name} is ${contrast(a, b).toFixed(2)}:1`);
});
