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
