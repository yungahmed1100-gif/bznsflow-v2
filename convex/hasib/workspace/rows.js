// Shared record helpers for the six-tab sector workspaces (Real Estate, Media, ...).

/** A row as the dashboard reads it: its id, without the tenant and replay keys. */
export const publicRow = row => { const { _id, _seq, table, accountId, requestId, ...rest } = row; return { id: _id, ...rest }; };
