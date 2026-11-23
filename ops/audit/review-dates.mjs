// A generated licence row keeps its own reviewedAt unless the row itself changed. Regenerating the inventory used to stamp every row with
// today's date, which made rows nobody re-read look freshly reviewed (and let the 180-day expiry in tests/licensing/gate.mjs slide forever).
// Compared without reviewedAt and enabled (enabled is derived); the row's own key order does not matter.
const sig = (r) => JSON.stringify(Object.entries(r).filter(([k]) => k !== 'reviewedAt' && k !== 'enabled').sort(([a], [b]) => a.localeCompare(b)));

// rows: freshly generated; prev: the rows of the file being replaced (or null). Returns new rows; only a changed or new row has the new date.
export function keepReviewDates(rows, prev) {
  const old = new Map((Array.isArray(prev) ? prev : []).filter((p) => p && p.id).map((p) => [p.id, p]));
  return rows.map((r) => { const p = old.get(r.id); return p && p.reviewedAt && sig(p) === sig(r) ? { ...r, reviewedAt: p.reviewedAt } : r; });
}
