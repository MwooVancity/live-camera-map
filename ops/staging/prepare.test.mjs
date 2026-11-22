import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepare } from './prepare.mjs';

function dist() {
  const d = mkdtempSync(join(tmpdir(), 'stg-'));
  mkdirSync(join(d, 'cameras'));
  writeFileSync(join(d, 'index.html'), '<!doctype html><html><head><meta name="robots" content="index"><title>t</title></head><body><a href="/cameras/">c</a><a href="https://x.example/a">e</a><a href="//cdn.example/x">p</a><a href="#top">h</a><img src="/i.png"></body></html>');
  writeFileSync(join(d, 'cameras', 'index.html'), '<html><head></head><body><a href="/">home</a></body></html>');
  writeFileSync(join(d, 'sitemap.xml'), '<urlset/>');
  writeFileSync(join(d, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  return d;
}

test('prefixes root links only, leaves external and protocol-relative and anchors', () => {
  const d = dist(); prepare(d, '/live-camera-map');
  const h = readFileSync(join(d, 'index.html'), 'utf8');
  assert.match(h, /href="\/live-camera-map\/cameras\/"/);
  assert.match(h, /src="\/live-camera-map\/i.png"/);
  assert.match(h, /href="https:\/\/x\.example\/a"/);
  assert.match(h, /href="\/\/cdn\.example\/x"/);
  assert.match(h, /href="#top"/);
});
test('every page is noindex (an existing index robots meta is replaced, not left)', () => {
  const d = dist(); prepare(d, '/live-camera-map');
  for (const f of ['index.html', 'cameras/index.html']) {
    const h = readFileSync(join(d, f), 'utf8');
    assert.match(h, /name="robots" content="noindex,nofollow"/);
    assert.doesNotMatch(h, /content="index"/);
  }
});
test('robots.txt disallows all and sitemap is removed', () => {
  const d = dist(); prepare(d, '/live-camera-map');
  assert.match(readFileSync(join(d, 'robots.txt'), 'utf8'), /Disallow: \//);
  assert.strictEqual(existsSync(join(d, 'sitemap.xml')), false);
});
test('bad base path is refused', () => assert.throws(() => prepare(dist(), 'live-camera-map')));
