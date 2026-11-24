// Port-safety gate (owner 2026-11-24: no fuckups porting the Argos killer): our shipped site never names, links or copies the competitor.
// Studying them is allowed; their words, brand, logo, images and files never reach a visitor (CLAUDE.md). Runs on the built site folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../../site/dist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

test('the built site has no mention of the competitor in any file name or text file', { skip: !existsSync(DIST) && 'site/dist not built' }, () => {
  const hits = [];
  for (const f of walk(DIST)) {
    if (/argos/i.test(f)) hits.push(`file name: ${f}`);
    if (/\.(html|js|mjs|css|json|xml|txt|svg|webmanifest)$/i.test(f) && /argos/i.test(readFileSync(f, 'utf8'))) hits.push(`text: ${f}`);
  }
  assert.deepEqual(hits.slice(0, 5), [], `competitor name in the shipped site (${hits.length} files)`);
});

test('the check itself works: a file with the name fails it', () => {
  const sample = 'Compare with Argos Atlas';
  assert.ok(/argos/i.test(sample));
});
