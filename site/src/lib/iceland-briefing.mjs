// Iceland road briefing data. Pure function, no network.
// Beats Argos by: one plain page of which Vegagerdin camera links answered in our last check, which pictures changed in the last 24 h and which failed, each with the check time; Argos shows a map with no check result or age.
// Gates: licence row enabled (tests/licensing/gate.mjs), health file complete and under 24 h old at build; else registry facts only, or nothing.
import { isEnabled } from '../../../tests/licensing/gate.mjs';
import { effectiveStatus } from '../../../ops/health/lib/age.mjs';

export const ICELAND_SOURCE_ID = 'iceland-vegagerdin';
export const ICELAND_ROW_ID = 'iceland-road-cameras';
export const HEALTH_MAX_AGE_H = 24;
const DAY = 86400000;

export function icelandBriefing({ cams, health, row, now = new Date() }) {
  if (!isEnabled(row, now)) return { state: 'licence not enabled' };
  const ice = cams.filter((c) => c.sourceId === ICELAND_SOURCE_ID);
  if (!ice.length) return { state: 'no cameras' };
  const base = { state: 'registry only', total: ice.length, stations: new Set(ice.map((c) => c.locationText)).size, asof: ice.map((c) => c.lastSeen).filter(Boolean).sort().at(-1) || null, attribution: String(row.attribution || '') };
  const t = health && Date.parse(health.generatedAt);
  const ageH = (now.getTime() - t) / 3600000;
  if (!health || health.runOk !== true || !health.cameras || !Number.isFinite(t) || ageH > HEALTH_MAX_AGE_H || ageH < -1) return base;
  const n = { reachable: 0, stale: 0, unavailable: 0, unknown: 0 };
  const changed = [], failed = [];
  for (const c of ice) {
    const rec = health.cameras[c.id];
    const s = effectiveStatus(rec, now.getTime(), t);
    n[s]++;
    const lc = Date.parse((rec && rec.lastChanged) || '');
    if (s !== 'unknown' && Number.isFinite(lc) && now.getTime() - lc <= DAY && lc <= now.getTime()) changed.push({ c, at: rec.lastChanged });
    if (s === 'unavailable') failed.push({ c, fails: rec.consecutiveFailures || 0 });
  }
  const byName = (a, b) => a.c.name.localeCompare(b.c.name) || a.c.id.localeCompare(b.c.id);
  return { ...base, state: 'checked', healthAsof: health.generatedAt, counts: n, checked: ice.length - n.unknown, changed: changed.sort(byName), failed: failed.sort(byName) };
}
