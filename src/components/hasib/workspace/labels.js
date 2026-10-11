// The label helpers every sector's labels.js builds on, and the bucket colours the queues share.
// Each sector keeps its own words (a "patient" in Dental is a "customer" elsewhere).

/** `label(group, key, ar)` and `options(group, ar)` over a sector's { group: { key: [en, ar] } } table. */
export function labelsFrom(table) {
  const label = (group, key, ar) => { const pair = table[group]?.[key]; return pair ? pair[ar ? 1 : 0] : String(key ?? '').replace(/_/g, ' '); };
  const options = (group, ar) => Object.keys(table[group]).map(id => ({ id, label: label(group, id, ar) }));
  return { label, options };
}

// Colour keeps its meaning: coral overdue or blocked, orange due today, yellow a decision, blue later or waiting, green done.
export const BUCKET_TONE = Object.freeze({ today: 'orange', overdue: 'coral', scheduled: 'blue', waiting: 'blue', decision: 'yellow', blocked: 'coral', completed: 'green' });
