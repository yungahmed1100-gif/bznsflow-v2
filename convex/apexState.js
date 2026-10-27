// Apex requests (Ahmed, 2026-10-27). A company sends the agent functions it needs from /apex; only the
// BznsFlow admin reads requests and moves them through new → contacted → scoped → closed. Rules: config/apex.js.
import { APEX_PER_EMAIL_PER_DAY, APEX_STATUSES, normalizeApexRequest } from '../config/apex.js';

const ok = value => ({ ok: true, value }), fail = reason => ({ ok: false, reason });
const ADMIN = 'ahmed@bznsflowai.com';
const DAY = 86400000;
const clip = (value, n) => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n) : '');

async function admin(ctx, sessionHash, now) {
  if (!/^[a-f0-9]{64}$/.test(sessionHash || '')) return 'sign_in_required';
  const session = await ctx.db.query('sessions').withIndex('by_token_hash', q => q.eq('tokenHash', sessionHash)).unique();
  if (!session || session.expiresAt <= now) return 'sign_in_required';
  const account = await ctx.db.get(session.accountId);
  return String(account?.email || '').toLowerCase().trim() === ADMIN ? null : 'admin_required';
}

const row = r => ({ id: r._id, company: r.company, name: r.name, email: r.email, phone: r.phone || '', branches: r.branches || '', staff: r.staff || '',
  system: r.system || '', systemNote: r.systemNote || '', functions: r.functions, need: r.need, lang: r.lang, status: r.status, adminNote: r.adminNote || '', createdAt: r.createdAt });

/** Public: send one request. */
export async function executeApex(ctx, a, now = Date.now()) {
  if (a.operation !== 'request') return fail('invalid_operation');
  const checked = normalizeApexRequest(a.request || {});
  if (!checked.ok) return fail(checked.reason);
  const { request } = checked;
  const recent = await ctx.db.query('apexRequests').withIndex('by_email', q => q.eq('email', request.email).gte('createdAt', now - DAY)).take(APEX_PER_EMAIL_PER_DAY + 1);
  if (recent.length >= APEX_PER_EMAIL_PER_DAY) return fail('too_many_requests');
  const id = await ctx.db.insert('apexRequests', { ...request, status: 'new', createdAt: now, updatedAt: now });
  return ok({ request: row(await ctx.db.get(id)) });
}

/** Admin: the newest requests, and moving one along with a note. */
export async function executeApexAdmin(ctx, a, now = Date.now()) {
  const refused = await admin(ctx, a.sessionHash, now);
  if (refused) return fail(refused);
  if (a.operation === 'list') {
    const rows = await ctx.db.query('apexRequests').withIndex('by_created').order('desc').take(200);
    return ok({ requests: rows.map(row), open: rows.filter(r => r.status === 'new').length });
  }
  if (a.operation === 'update') {
    const id = typeof a.requestId === 'string' ? ctx.db.normalizeId('apexRequests', a.requestId) : null;
    const request = id ? await ctx.db.get(id) : null;
    if (!request) return fail('request_not_found');
    if (a.status !== undefined && !APEX_STATUSES.includes(a.status)) return fail('invalid_status');
    const patch = { ...(a.status ? { status: a.status } : {}), ...(a.adminNote !== undefined ? { adminNote: clip(a.adminNote, 1000) || undefined } : {}) };
    await ctx.db.patch(request._id, { ...patch, updatedAt: now });
    return ok({ request: row(await ctx.db.get(request._id)) });
  }
  return fail('invalid_operation');
}
