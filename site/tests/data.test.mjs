// The CSV downloads in dist/data/ and the /data/ page (plan item 36 P2-13).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DIST, readPages } from './helpers.mjs';
import { COLUMNS, toCsv } from '../../ops/exports/camera-exports.mjs';
import { eligibility } from '../../ops/importers/lib/eligibility.mjs';

function parse(text) { // minimal RFC 4180 reader
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  return rows;
}
const dir = join(DIST, 'data');
const files = readdirSync(dir).filter((f) => f.endsWith('.csv'));
const cams = new Map(JSON.parse(readFileSync(resolve(process.cwd(), '../data/camera-registry/cameras.json'), 'utf8')).map((c) => [c.id, c]));
const all = parse(readFileSync(join(dir, 'cameras-all.csv'), 'utf8'));

test('csv files exist, header equals COLUMNS, every row has licence and attribution', () => {
  assert.ok(files.includes('cameras-all.csv') && files.length >= 2);
  for (const f of files) {
    const t = parse(readFileSync(join(dir, f), 'utf8'));
    assert.deepEqual(t[0], COLUMNS, f);
    for (const r of t.slice(1)) { assert.equal(r.length, COLUMNS.length, `${f}: ${r[0]} column count`); assert.ok(r[COLUMNS.indexOf('licence')] && r[COLUMNS.indexOf('attribution')], `${f}: ${r[0]} has no licence or attribution`); }
  }
});
test('no non-eligible camera, no picture columns, per-country files add up to the all file', () => {
  assert.ok(!COLUMNS.some((c) => /image|picture|thumb|stream|photo/i.test(c)));
  for (const r of all.slice(1)) { const c = cams.get(r[0]); assert.ok(c, `${r[0]} not in the registry`); assert.ok(eligibility(c).directory_eligible, `${r[0]} is not eligible`); }
  const sum = files.filter((f) => f !== 'cameras-all.csv').reduce((n, f) => n + parse(readFileSync(join(dir, f), 'utf8')).length - 1, 0);
  assert.equal(sum, all.length - 1);
});
test('/data/ page prints the row count of the files and omits the competitor', () => {
  const html = readPages().get('/data/'); assert.ok(html, 'no /data/ page');
  assert.ok(html.includes(`data-count="${all.length - 1}"`), 'page count differs from the all file');
  assert.ok(html.includes(`${all.length - 1} cameras in`));
  for (const f of files) assert.ok(html.includes(`href="/data/${f}"`), `page does not link ${f}`);
  assert.ok(!/argos/i.test(html));
});
test('formula injection guard holds on a hostile row', () => {
  const hostile = Object.fromEntries(COLUMNS.map((c) => [c, '=HYPERLINK("http://x","y")']));
  hostile.name = '@SUM(1)'; hostile.road = '-2+3'; hostile.direction = '+cmd'; hostile.lat = 1; hostile.lon = 2;
  const t = parse(toCsv([hostile]));
  assert.equal(t.length, 2);
  for (const [i, v] of t[1].entries()) if (!['lat', 'lon'].includes(COLUMNS[i])) assert.match(v, /^'/, COLUMNS[i]);
});
