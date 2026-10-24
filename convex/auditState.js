// The free business audit (Ahmed, 2026-10-24). Visitors see open times and book one; only the BznsFlow
// admin reads who booked and marks a call done or cancelled. Times and limits live in config/audit.js.
import { AUDIT_HORIZON_DAYS, auditSlots, normalizeAuditBooking, validAuditSlot } from '../config/audit.js';

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

const booked = async (ctx, from, to) => (await ctx.db.query('auditBookings').withIndex('by_start', q => q.gte('startAt', from).lte('startAt', to)).take(1000))
  .filter(b => b.status === 'booked');
const row = b => ({ id: b._id, startAt: b.startAt, name: b.name, email: b.email, phone: b.phone || '', business: b.business || '', industry: b.industry || '',
  note: b.note || '', lang: b.lang, status: b.status, adminNote: b.adminNote || '', createdAt: b.createdAt });

/** Public: open times (no names or emails) and booking. */
export async function executeAudit(ctx, a, now = Date.now()) {
  if (a.operation === 'slots') {
    const taken = await booked(ctx, now, now + (AUDIT_HORIZON_DAYS + 1) * DAY);
    return ok({ slots: auditSlots(now, taken.map(b => b.startAt)) });
  }
  if (a.operation === 'book') {
    const startAt = Number(a.startAt);
    if (!validAuditSlot(startAt, now)) return fail('invalid_slot');
    const checked = normalizeAuditBooking(a.booking || {});
    if (!checked.ok) return fail(checked.reason);
    const { booking } = checked;
    // Mutations are serializable: two visitors can't both read the slot as free.
    if ((await booked(ctx, startAt, startAt)).length) return fail('slot_taken');
    const upcoming = await ctx.db.query('auditBookings').withIndex('by_email', q => q.eq('email', booking.email).gte('startAt', now)).take(50);
    if (upcoming.some(b => b.status === 'booked')) return fail('already_booked');
    const id = await ctx.db.insert('auditBookings', { ...booking, startAt, status: 'booked', createdAt: now, updatedAt: now });
    return ok({ booking: row(await ctx.db.get(id)) });
  }
  return fail('invalid_operation');
}

/** Admin: the calendar between two times, and marking a booking done or cancelled. */
export async function executeAuditAdmin(ctx, a, now = Date.now()) {
  const refused = await admin(ctx, a.sessionHash, now);
  if (refused) return fail(refused);
  if (a.operation === 'list') {
    const from = Number(a.from), to = Number(a.to);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || to < from || to - from > 62 * DAY) return fail('invalid_range');
    const rows = await ctx.db.query('auditBookings').withIndex('by_start', q => q.gte('startAt', from).lte('startAt', to)).take(500);
    const upcoming = (await booked(ctx, now, now + (AUDIT_HORIZON_DAYS + 1) * DAY)).length;
    return ok({ bookings: rows.map(row), upcoming });
  }
  if (a.operation === 'update') {
    const id = typeof a.bookingId === 'string' ? ctx.db.normalizeId('auditBookings', a.bookingId) : null;
    const booking = id ? await ctx.db.get(id) : null;
    if (!booking) return fail('booking_not_found');
    if (a.status !== undefined && !['booked', 'done', 'cancelled'].includes(a.status)) return fail('invalid_status');
    // Re-opening a cancelled slot must not double-book it.
    if (a.status === 'booked' && booking.status !== 'booked' && (await booked(ctx, booking.startAt, booking.startAt)).length) return fail('slot_taken');
    const patch = { ...(a.status ? { status: a.status } : {}), ...(a.adminNote !== undefined ? { adminNote: clip(a.adminNote, 500) || undefined } : {}) };
    await ctx.db.patch(booking._id, { ...patch, updatedAt: now });
    return ok({ booking: row(await ctx.db.get(booking._id)) });
  }
  return fail('invalid_operation');
}
