// Greater <city> coverage (one function, one radius), clean camera labels (32 real Caltrans names), and the built pages that use them.
// Run from site/: node --test tests/area.test.mjs (the built-page tests read dist/, so run `npm run build` first).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { greaterArea, GREATER_KM } from '../src/lib/area.mjs';
import { cleanLabel } from '../src/lib/labels.mjs';
import { distKm } from '../src/lib/live.mjs';
import { readPages } from './helpers.mjs';
import { curatedPlaces } from '../src/lib/pages.mjs';

const cameras = JSON.parse(readFileSync('../data/camera-registry/cameras.json', 'utf8'));
const ca = cameras.filter((c) => c.regionSlug === 'california');

// ---- labels: 32 real names (taken from data/camera-registry/cameras.json): name, town, expected label ----
const REAL = [
  ["SR-20 : At SR-1 - Looking East (C020)", "Fort Bragg", "At SR-1 - Looking East, Fort Bragg"],
  ["SR-1: Boice Ln (North)", "Fort Bragg", "Boice Ln (North), Fort Bragg"],
  ["Hwy 50 at Hwy 89", "South Lake Tahoe", "Hwy 50 at Hwy 89, South Lake Tahoe"],
  ["Hwy 5 at Airport", "Sacramento", "Hwy 5 at Airport, Sacramento"],
  ["TVH15 -- I-80 : San Pablo Dam Road", "El Sobrante", "San Pablo Dam Road, El Sobrante"],
  ["TVH02 -- I-80 : Powell Street Offramp", "Emeryville", "Powell Street Offramp, Emeryville"],
  ["TVC38 -- I-280 : SR-87", "San Jose", "SR-87, San Jose"],
  ["TVF55 -- I-680 : JSO Landess Av", "San Jose", "JSO Landess Av, San Jose"],
  ["TV326 -- I-280 : Just south of Cesar Chavez", "San Francisco", "Just south of Cesar Chavez, San Francisco"],
  ["TV220 -- SR-4 : EOF HILLCREST", "Antioch", "Eof Hillcrest, Antioch"],
  ["TVC86 -- SR-85 : AT GREAT OAKS BL", "San Jose", "At Great Oaks Bl, San Jose"],
  ["TV394 -- SR-1 : AT NOF 280 ITC", "Daly City", "At Nof 280 Itc, Daly City"],
  ["US-101 : Old 101 Turnout", "San Luis Obispo", "Old 101 Turnout, San Luis Obispo"],
  ["KER-99-AT AIRPORT DR", "Bakersfield", "At Airport Dr, Bakersfield"],
  ["I-710 : (264) Willow St", "Long Beach", "Willow St, Long Beach"],
  ["I-210 : (460) Mountain Ave", "Duarte", "Mountain Ave, Duarte"],
  ["I-10 : (80) Overland Ave On-Ramp", "Culver City", "Overland Ave On-Ramp, Culver City"],
  ["I-110 : (803) Rosecrans Ave", "Gardena", "Rosecrans Ave, Gardena"],
  ["I-5 : (63) Conn To NB Rte 14", "Burbank", "Conn To NB Rte 14, Burbank"],
  ["I-215 : (67) North Of Washington", "Colton", "North Of Washington, Colton"],
  ["I-15 : (219) 0.6mi South Of Kenwood", "San Bernardino", "0.6mi South Of Kenwood, San Bernardino"],
  ["I-15 : (323) North of Olive", "Wildomar", "North of Olive, Wildomar"],
  ["I-15 : (395) S/O 15-210 IC", "Fontana", "South Of 15-210 Ic, Fontana"],
  ["I -10 : (564) Cherry Valley UC", "Calimesa", "Cherry Valley UC, Calimesa"],
  ["139 - NB SR 99 Main Street", "Ripon", "139 - NB SR 99 Main Street, Ripon"],
  ["(C037) NB 15 : SR-163 South End HOV", "San Diego", "SR-163 South End HOV, San Diego"],
  ["(C301) EB 76 at Horse Creek Ranch Rd", "Fallbrook", "EB 76 at Horse Creek Ranch Rd, Fallbrook"],
  ["(C526) I-125: SB JNO Blossom Ln - T", "Lemon Grove", "SB JNO Blossom Ln - T, Lemon Grove"],
  ["I-5 : (233) Valle Road On (San Juan Creek)", "San Juan Capistrano", "Valle Road On (San Juan Creek), San Juan Capistrano"],
  ["SR-73 : (343) North of Newport Coast Drive", "Newport Coast", "North of Newport Coast Drive, Newport Coast"],
  ["I-405 : (27) Culver", "Irvine", "Culver, Irvine"],
  ["I-405 : (231) South of Irvine Center Drive", "Irvine", "South of Irvine Center Drive, Irvine"],
];
test('cleanLabel: 32 real Caltrans names give the expected clean label, and every name is a real registry name', () => {
  assert.equal(REAL.length, 32);
  for (const [name, city, want] of REAL) {
    assert.equal(cleanLabel({ name, city, sourceId: 'caltrans' }), want, name);
    assert.ok(cameras.some((c) => c.name === name && c.city === city), `"${name}" is a real registry name`);
  }
});
test('cleanLabel: T-prefixed codes without V (T259E, T252W) are dropped too', () => {
  assert.equal(cleanLabel({ name: 'T252W -- SR-123 : Ashby Avenue - Looking West', city: 'Berkeley', sourceId: 'caltrans' }), 'Ashby Avenue - Looking West, Berkeley');
  assert.ok(cameras.some((c) => c.name === 'T252W -- SR-123 : Ashby Avenue - Looking West'));
  for (const c of cameras.filter((x) => x.sourceId === 'caltrans')) assert.ok(!/^T[A-Z0-9]{2,6}\s*--/.test(cleanLabel(c)), c.name);
});
test('cleanLabel: other sources keep their own name; an empty name stays empty', () => {
  assert.equal(cleanLabel({ name: 'Britannia - S', city: 'Britannia', sourceId: 'drivebc' }), 'Britannia - S');
  assert.equal(cleanLabel({ name: '', city: null, sourceId: 'caltrans' }), '');
});

// ---- greater area: one function ----
const cam = (id, city, lat, lon, region = 'california', road = 'I-5') => ({ id, city, lat, lon, regionSlug: region, road });
test('greaterArea: exact is the cities own cameras; within = exact + towns + no-town; within never below exact; one radius constant', () => {
  assert.equal(GREATER_KM, 30);
  for (const city of ['Los Angeles', 'Irvine', 'San Diego']) {
    const g = greaterArea(ca, city);
    assert.equal(g.exact, ca.filter((c) => c.city === city).length);
    assert.equal(g.within, g.exact + g.towns.reduce((s, t) => s + t.n, 0) + g.noTown, `${city}: parts add up`);
    assert.ok(g.within >= g.exact);
    assert.equal(g.km, GREATER_KM);
    for (const x of g.unnamed) assert.ok(distKm(g.centre.lat, g.centre.lon, x.camera.lat, x.camera.lon) <= GREATER_KM + 1e-9);
    assert.ok(!g.towns.some((t) => t.town === city), 'the city is not its own nearby town');
  }
  const la = greaterArea(ca, 'Los Angeles');
  assert.ok(la.within > 5 * la.exact, `Los Angeles: ${la.exact} by name, ${la.within} within ${GREATER_KM} km`);
});
test('greaterArea: the centre is the mean of the exact cameras; a camera inside the radius counts, one far past it does not', () => {
  const base = [cam('a', 'A', 34, -118), cam('b', 'A', 34.002, -118)];
  assert.ok(Math.abs(greaterArea(base, 'A').centre.lat - 34.001) < 1e-9);
  const inside = cam('c', 'B', 34.001 + 0.2, -118), outside = cam('d', 'B', 34.001 + 0.4, -118);
  assert.ok(distKm(34.001, -118, inside.lat, inside.lon) < GREATER_KM && distKm(34.001, -118, outside.lat, outside.lon) > GREATER_KM);
  const g = greaterArea([...base, inside, outside], 'A');
  assert.equal(g.within, 3);
  assert.deepEqual(g.towns.map((t) => [t.town, t.n]), [['B', 1]]);
});
test('greaterArea: a place name in two regions never merges (the caller passes ONE region)', () => {
  const both = [cam('a', 'Richmond', 37.9, -122.3), cam('b', 'Richmond', 37.9, -122.31), cam('c', 'Richmond', 37.9, -122.32), cam('d', 'Richmond', 37.91, -122.3, 'british-columbia')];
  assert.equal(greaterArea(both.filter((c) => c.regionSlug === 'california'), 'Richmond').within, 3);
  assert.equal(greaterArea(both.filter((c) => c.regionSlug === 'british-columbia'), 'Richmond').within, 1);
});
test('greaterArea: unknown city gives null; a camera with no town is counted in noTown, not dropped', () => {
  assert.equal(greaterArea(ca, 'Nowhereville'), null);
  const g = greaterArea([cam('a', 'A', 34, -118), cam('b', null, 34.01, -118)], 'A');
  assert.equal(g.noTown, 1);
  assert.equal(g.within, 2);
});

// ---- built pages (dist/) ----
const pages = readPages();
const section = (html, id) => (html.match(new RegExp(`<section data-block="${id}"[\\s\\S]*?</section>`)) || [''])[0];
const unesc = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const cityRoutes = [...pages.keys()].filter((r) => /^\/cameras\/[a-z-]+\/[a-z-]+\/[a-z0-9-]+\/$/.test(r));
test('every city page prints the radius count from greaterArea, the exact count and the definition of "near"; the two never contradict', () => {
  assert.equal(cityRoutes.length, curatedPlaces(cameras).length, 'one page per curated place: California 10, British Columbia 5, Finland 8, Quebec none (its feed has no place field)');
  let withBlock = 0;
  for (const route of cityRoutes) {
    const html = pages.get(route);
    const region = route.split('/')[3];
    const name = unesc(html.match(/<h1>([^<]*) traffic cameras<\/h1>/)[1]);
    const g = greaterArea(cameras.filter((c) => c.regionSlug === region), name);
    const sec = section(html, 'greater-area');
    if (g.within === g.exact) { assert.equal(sec, '', `${route}: no block when nothing else is near`); continue; }
    withBlock++;
    assert.ok(sec.includes(`data-within="${g.within}"`), `${route}: within count`);
    assert.ok(sec.includes(`${g.within} cameras within ${g.km} km`), `${route}: heading`);
    assert.ok(sec.includes(`${g.exact} are listed under`), `${route}: exact count`);
    assert.ok(sec.includes(`means within ${g.km} km of the centre of the ${g.exact}`), `${route}: definition printed`);
    assert.ok(html.includes(`All ${g.exact} cameras`), `${route}: exact count also in the camera list heading`);
    const rows = [...sec.matchAll(/: (\d+) cameras? \(/g)].reduce((s, x) => s + Number(x[1]), 0);
    assert.equal(rows + g.noTown + g.exact, g.within, `${route}: rows add up to the heading number`);
  }
  assert.ok(withBlock >= 10, `${withBlock} city pages have a greater-area block`);
});
test('Los Angeles: roads say "in Los Angeles" and "on the whole road" with the road page count', () => {
  const html = pages.get('/cameras/united-states/california/los-angeles/');
  const m = html.match(/href="\/roads\/i-405\/">I-405 traffic cameras<\/a>: (\d+) in Los Angeles, (\d+) on the whole road/);
  assert.ok(m, 'I-405 scope note');
  assert.equal(Number(m[2]), cameras.filter((c) => c.road === 'I-405').length);
  assert.equal(Number(m[1]), cameras.filter((c) => c.road === 'I-405' && c.city === 'Los Angeles').length);
  assert.ok(Number(m[2]) > Number(m[1]));
  assert.ok(pages.get('/roads/i-405/').includes(`${m[2]} Caltrans cameras are listed on I-405`));
});
test('one region per page: California greater-area blocks never name DriveBC and BC ones never name Caltrans', () => {
  for (const [route, html] of pages) {
    const sec = section(html, 'greater-area');
    if (route.startsWith('/cameras/united-states/california/') && sec) assert.ok(!/DriveBC/.test(sec), route);
    if (route.startsWith('/cameras/canada/british-columbia/') && sec) assert.ok(!/Caltrans/.test(sec), route);
  }
});
test('city and road pages: driving notice, conditions above the camera list, clean labels with the source name as title', () => {
  const roadRoutes = [...pages.keys()].filter((r) => /^\/roads\/[a-z0-9-]+\/$/.test(r));
  assert.equal(roadRoutes.length, 10);
  for (const route of [...cityRoutes, ...roadRoutes]) {
    const html = pages.get(route);
    assert.ok(html.includes('Do not use this page while driving.'), `${route}: notice`);
    const cams = html.indexOf('data-block="cameras"');
    for (const id of ['road-conditions', 'message-signs', 'bc-events', 'road-weather', 'forecast', 'weather-alerts']) {
      const at = html.indexOf(`data-block="${id}"`);
      if (at >= 0) assert.ok(at < cams, `${route}: ${id} above the cameras`);
    }
    const links = [...section(html, 'cameras').matchAll(/<a href="(https:[^"]+)" rel="noopener" title="([^"]+)">([^<]+)<\/a>/g)];
    assert.ok(links.length > 0, `${route}: camera links`);
    for (const m of links) {
      const c = cameras.find((x) => x.officialUrl === m[1]);
      assert.ok(c, `${route}: link is a registry camera`);
      assert.equal(unesc(m[3]), cleanLabel(c), `${route}: label`);
      assert.equal(unesc(m[2]), c.name, `${route}: the source name is the title`);
    }
  }
});
test('road page: jump links in the intro reach each direction list; the order wording says estimated', () => {
  const html = pages.get('/roads/i-405/');
  const jumps = [...html.matchAll(/href="#(dir-[a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(jumps.length >= 2);
  for (const j of jumps) assert.ok(html.includes(`<h3 id="${j}">`), j);
  assert.ok(html.includes('Driving order is estimated from camera positions along the road'));
});
test('the "never run yet" sentence is gone from the page code, and no page with health markers says the check did not run', () => {
  for (const f of ['src/pages/cameras/[country]/[region]/[city].astro', 'src/pages/roads/[road].astro']) assert.ok(!/never run yet/.test(readFileSync(f, 'utf8')), `${f}: hand-written sentence`);
  for (const [route, html] of pages) if (/data-status=/.test(html)) assert.ok(!/never run|not run yet|not checked yet/i.test(html.replace(/<[^>]+>/g, ' ')), route);
});
