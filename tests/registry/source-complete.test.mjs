// Plan item 28 stage 3: a source that reaches cameras.json must have every piece the pipeline needs, or this fails with the missing piece's name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONFIG } from '../../ops/health/check.mjs';
import { countryOf } from '../../ops/importers/lib/registry.mjs';
import { loadPlan } from '../../ops/importers/run-all.mjs';

const j = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const cams = j('data/camera-registry/cameras.json');
const sources = j('data/camera-registry/sources.json');
const list = (x) => (Array.isArray(x) ? x : x.sources || x.cameras);
const ids = [...new Set(list(cams).map((c) => c.sourceId))];
// Sources that run on the default health pace on purpose (large, polite default is fine): name each with its reason.
const DEFAULT_PACE = { caltrans: 'Caltrans publishes no limit and its default 100 ms pace was reviewed with the 3,263-camera import' };

test('every source with cameras has a sources.json row, a country for each of its regions, and a health pace (own entry or a named default)', () => {
  const srcRows = new Set(list(sources).map((s) => s.id));
  for (const id of ids) {
    assert.ok(srcRows.has(id), `${id}: no row in sources.json`);
    assert.ok(CONFIG.perSource[id] || DEFAULT_PACE[id], `${id}: no health pace in ops/health/check.mjs CONFIG.perSource (add one, or name a reason in DEFAULT_PACE)`);
  }
  for (const r of new Set(list(cams).map((c) => c.regionSlug))) assert.ok(countryOf(r), `region ${r}: no country in REGION_COUNTRY`);
});

test('a DEFAULT_PACE source really has no own entry (the list stays honest)', () => {
  for (const id of Object.keys(DEFAULT_PACE)) assert.ok(!CONFIG.perSource[id], `${id} now has its own entry: delete it from DEFAULT_PACE`);
});
