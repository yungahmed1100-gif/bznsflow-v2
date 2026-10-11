// Metric arithmetic shared by every sector's Insights (ascend/measurement-contract.md):
// a rate with no eligible records is null ("no eligible records"), never 0%.

export const rate = (n, d) => d ? Math.round(n * 1000 / d) / 10 : null;

/** Linear-interpolated quantile; null for an empty list. */
export function quantile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((x, y) => x - y), i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** How many population rows carry each note (e.g. timely_cancel, no_due_date). */
export const noteCounts = rows => rows.reduce((acc, r) => r.note ? { ...acc, [r.note]: (acc[r.note] || 0) + 1 } : acc, {});

/**
 * A metric's value from its population rows ({ counts, inNumerator, amountMinor?, durationMs?, note? }).
 * rate: hits ÷ counted. count: hits. money: sum of hits' amounts. duration: median/p90 of counted durations.
 */
export function summarizeRows(kind, rows) {
  const counted = rows.filter(r => r.counts), hits = counted.filter(r => r.inNumerator), notes = noteCounts(rows);
  if (kind === 'rate') return { value: rate(hits.length, counted.length), numerator: hits.length, denominator: counted.length, notes };
  if (kind === 'money') return { value: hits.reduce((sum, r) => sum + (r.amountMinor || 0), 0), numerator: hits.length, denominator: counted.length, notes };
  if (kind === 'duration') {
    const done = counted.map(r => r.durationMs), open = rows.filter(r => !r.counts).map(r => r.durationMs).filter(v => v != null);
    return { value: quantile(done, 0.5), p90: quantile(done, 0.9), numerator: done.length, denominator: rows.length, notes, openMedianMs: quantile(open, 0.5), openOldestMs: open.length ? Math.max(...open) : null };
  }
  return { value: hits.length, numerator: hits.length, denominator: counted.length, notes, oldestMs: hits.some(r => r.durationMs != null) ? Math.max(...hits.map(r => r.durationMs ?? 0)) : null };
}

/** Weekly windows ending at `end`, oldest first. */
export function weeks(end, count = 8, week = 7 * 86400000) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) out.push({ from: end - (i + 1) * week, to: end - i * week });
  return out;
}

/** Counts per label, largest first. */
export const tally = values => Object.entries(values.reduce((out, v) => ({ ...out, [v || 'unknown']: (out[v || 'unknown'] || 0) + 1 }), {}))
  .map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
