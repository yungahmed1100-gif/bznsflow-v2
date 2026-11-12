// Every answer to an owner action appears where the owner acted: the consent card,
// the approval, or the connection. A confirmation shown only at the top of a long
// page looked like a frozen button on 12 November 2026.

/** The card an action came from, as a stable key. */
export function originOf(body) {
  if (!body) return '';
  if (body.action === 'consent') return 'consent';
  if (body.runId) return `approval:${body.runId}`;
  if (body.connectionId) return `connection:${body.connectionId}`;
  return '';
}

/** Keys of the cards currently on the page. */
export function cardKeys({ consent, approvals = [], connections = [] }) {
  return new Set([
    ...(consent ? ['consent'] : []),
    ...approvals.map(a => `approval:${a.id}`),
    ...connections.map(c => `connection:${c.id}`),
  ]);
}

/** Where an answer goes: its own card when that card is still shown, else `fallback`. */
export function placeFor(origin, cards, fallback = '') {
  return origin && cards.has(origin) ? origin : fallback;
}
