// Small record helpers the sector workspaces share: idempotent creation by request id, and a row
// copy for `replace` that leaves out system fields and the optional fields an edit may clear.
import { ok, REQUEST_ID, byRequest } from '../shared.js';
import { publicRow } from './rows.js';

/** { error } for a bad request id, { replay } with the earlier result for a repeated one, else { replay: null }. */
export async function replayOr(ctx, table, tenant, a) {
  if (!REQUEST_ID.test(a.requestId || '')) return { error: 'invalid_request' };
  const row = await byRequest(ctx, table, tenant.accountId, a.requestId);
  return { replay: row ? ok(publicRow(row)) : null };
}

/** The stored row without system fields and without the optional fields an edit may clear (Convex stores no undefined). */
export const strip = (row, clearable = []) => Object.fromEntries(Object.entries(row).filter(([k]) => !['_id', '_creationTime', '_seq', 'table', ...clearable].includes(k)));

/**
 * A request id (the UUID shape every write checks) derived from a seed, for writes an agent makes:
 * the same seed gives the same id, so a repeated run replays instead of acting twice.
 * @param {string} seed
 */
export function stableRequestId(seed) {
  const hex = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b].map(start => {
    let h = start >>> 0;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
    return h.toString(16).padStart(8, '0');
  }).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
