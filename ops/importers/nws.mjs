// NWS forecast (next 48 h) and active alerts for each curated city. No key; the API needs a User-Agent header.
// Run: node ops/importers/nws.mjs      Writes data/conditions/nws-<city-slug>.json
// Calls per city: /points/{lat},{lon} -> forecast URL from that answer; /alerts/active?point={lat},{lon}.
// Beats Argos by: the city page shows the official NWS forecast and live alerts for the page's own cameras,
// each with its fetch time and NWS update time, and hides them when stale rather than showing old weather as current.
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { writeJsonAtomic, readJsonOrNull } from './lib/registry.mjs';
import { UA, SOURCE_IDS, MAX_AGE_MIN } from './lib/conditions.mjs';
import { curatedCities, slugify } from '../../site/src/lib/pages.mjs';
import { isEnabled } from '../../tests/licensing/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_DIR = join(ROOT, 'data', 'conditions');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson(url, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/geo+json' }, signal: AbortSignal.timeout(30000) });
      const body = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      try { return JSON.parse(body); } catch (e) { throw new Error(`invalid JSON: ${e.message}`); }
    } catch (e) { err = e; if (i < tries - 1) await sleep(2000 * (i + 1)); }
  }
  throw err;
}

// Mean of the city's cameras, 4 decimals (the NWS points endpoint rejects more).
export function centroid(cams, city) {
  const cs = cams.filter((c) => c.city === city);
  if (!cs.length) return null;
  const m = (k) => Number((cs.reduce((a, c) => a + c[k], 0) / cs.length).toFixed(4));
  return { lat: m('lat'), lon: m('lon'), cameras: cs.length };
}

// Pure: raw NWS answers -> the stored document. Throws on any wrong shape (caller then writes nothing).
export function buildDoc({ city, slug, c, points, forecast, alerts, now }) {
  const p = points && points.properties;
  if (!p || typeof p.forecast !== 'string' || !p.gridId) throw new Error('points: no forecast url or grid');
  const fp = forecast && forecast.properties;
  if (!fp || !Array.isArray(fp.periods) || !fp.periods.length || !fp.updateTime) throw new Error('forecast: no periods or updateTime');
  if (!alerts || !Array.isArray(alerts.features)) throw new Error('alerts: no features array');
  const t = new Date(now).getTime();
  if (t - Date.parse(fp.updateTime) > MAX_AGE_MIN['nws-forecast'] * 2 * 60000) throw new Error(`forecast itself is old (updateTime ${fp.updateTime})`);
  const periods = fp.periods.filter((x) => Date.parse(x.startTime) < t + 48 * 3600000 && Date.parse(x.endTime) > t).map((x) => ({
    name: x.name, startTime: x.startTime, endTime: x.endTime, isDaytime: x.isDaytime, temperature: x.temperature, temperatureUnit: x.temperatureUnit,
    precipChance: x.probabilityOfPrecipitation ? x.probabilityOfPrecipitation.value : null, windSpeed: x.windSpeed, windDirection: x.windDirection,
    shortForecast: x.shortForecast, detailedForecast: x.detailedForecast,
  }));
  if (!periods.length) throw new Error('forecast: no period inside the next 48 h');
  const items = alerts.features.map((f) => f.properties || {}).map((a) => ({
    id: a.id, event: a.event, severity: a.severity, urgency: a.urgency, certainty: a.certainty, status: a.status, headline: a.headline,
    description: a.description, instruction: a.instruction || null, effective: a.effective, expires: a.expires, ends: a.ends || null, areaDesc: a.areaDesc, senderName: a.senderName,
  }));
  const iso = new Date(now).toISOString();
  return {
    city, slug, lat: c.lat, lon: c.lon, cameras: c.cameras, generatedAt: iso,
    office: p.gridId, forecastOffice: p.forecastOffice, grid: { gridId: p.gridId, gridX: p.gridX, gridY: p.gridY }, timeZone: p.timeZone,
    source: { name: 'NOAA National Weather Service (api.weather.gov)', forecastUrl: p.forecast, alertsUrl: `https://api.weather.gov/alerts/active?point=${c.lat},${c.lon}` },
    forecast: { fetchedAt: iso, updateTime: fp.updateTime, periods },
    alerts: { fetchedAt: iso, updated: alerts.updated || null, items },
  };
}

// fetcher(url) -> parsed JSON or throws. Returns { slug: { written, reason } }.
export async function run({ fetcher = fetchJson, outDir = OUT_DIR, now = new Date(), cams, cities, perms, log = console.log, pauseMs = 500 } = {}) {
  cams ??= JSON.parse(readFileSync(join(ROOT, 'data', 'camera-registry', 'cameras.json'), 'utf8'));
  cities ??= curatedCities(cams);
  perms ??= JSON.parse(readFileSync(join(ROOT, 'data', 'source-permissions.json'), 'utf8')).sources;
  const out = {};
  const closed = ['nws-forecast', 'nws-alerts'].filter((k) => !isEnabled(perms.find((s) => s.id === SOURCE_IDS[k]), now));
  for (const city of cities) {
    const slug = slugify(city);
    if (closed.length) { out[slug] = { written: false, reason: `licence closed: ${closed.join(',')}` }; log(`${slug}: ${out[slug].reason}`); continue; }
    try {
      const c = centroid(cams, city);
      if (!c) throw new Error('no cameras for city');
      const points = await fetcher(`https://api.weather.gov/points/${c.lat},${c.lon}`);
      const forecast = await fetcher(points && points.properties && points.properties.forecast);
      const alerts = await fetcher(`https://api.weather.gov/alerts/active?point=${c.lat},${c.lon}`);
      const doc = buildDoc({ city, slug, c, points, forecast, alerts, now });
      writeJsonAtomic(join(outDir, `nws-${slug}.json`), doc); // only after every call succeeded
      out[slug] = { written: true, reason: null, periods: doc.forecast.periods.length, alerts: doc.alerts.items.length, office: doc.office };
    } catch (e) {
      const had = readJsonOrNull(join(outDir, `nws-${slug}.json`));
      out[slug] = { written: false, reason: String(e.message || e), keptOld: Boolean(had) };
    }
    log(`${slug}: ${JSON.stringify(out[slug])}`);
    if (pauseMs) await sleep(pauseMs);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await run();
  const bad = Object.values(r).filter((v) => !v.written).length;
  console.log(`${Object.keys(r).length - bad}/${Object.keys(r).length} cities written`);
  process.exit(bad ? 1 : 0);
}
