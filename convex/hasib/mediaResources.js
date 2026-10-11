// Crew and equipment, their holds on a production, the shoot calendar and the cost ledger.
// Two confirmed bookings can never share a resource interval; a tentative hold stays visibly
// tentative until it is confirmed, released or expires.
import { owned } from '../blueTenant.js';
import { ok, fail, bounded, REQUEST_ID, byRequest, settingsFor } from './shared.js';
import { isMinor } from './money.js';
import { audit } from './workspaceState.js';
import { publicRow } from './workspace/rows.js';
import { findOverlaps } from './workspace/overlap.js';
import { mediaSettings } from './mediaSettings.js';
import { visibleProduction } from './mediaBoard.js';
import { DAY, HOUR, ACTIVE, RESOURCE_CATEGORIES, COST_CATEGORIES, MAX_RESERVATION_MS } from './mediaDomain.js';

const CONFIRMED = new Set(['confirmed']), LIVE = new Set(['held', 'confirmed']);
const conflicts = (ctx, accountId, resourceId, startsAt, endsAt, statuses, excludeId) => findOverlaps(ctx, { table: 'mediaReservations', index: 'by_account_resource_start',
  eq: [['accountId', accountId], ['resourceId', resourceId]], startsAt, endsAt, maxSpanMs: MAX_RESERVATION_MS, statuses, excludeId });

export async function resourceSave(ctx, tenant, actor, a, now) {
  const m = a.media || {};
  let row = null;
  if (a.mediaResourceId) {
    row = await owned(ctx, a.mediaResourceId, tenant.accountId, 'mediaResources');
    if (!row) return fail('resource_not_found');
    if (row.version !== a.version) return fail('resource_conflict_version');
  } else {
    if (!REQUEST_ID.test(a.requestId || '')) return fail('invalid_request');
    const replay = await byRequest(ctx, 'mediaResources', tenant.accountId, a.requestId);
    if (replay) return ok(publicRow(replay));
  }
  const name = bounded(m.name ?? row?.name, 80), category = m.category ?? row?.category, active = m.active ?? row?.active ?? true;
  const rate = m.internalRateMinor ?? row?.internalRateMinor;
  if (!name || !RESOURCE_CATEGORIES.includes(category) || typeof active !== 'boolean' || (rate !== undefined && !isMinor(rate))) return fail('invalid_resource');
  const data = { name, category, active, ...(rate !== undefined ? { internalRateMinor: rate } : {}), version: (row?.version || 0) + 1, updatedAt: now };
  let id; if (row) { await ctx.db.patch(row._id, data); id = row._id; } else id = await ctx.db.insert('mediaResources', { ...data, accountId: tenant.accountId, requestId: a.requestId, createdAt: now });
  await audit(ctx, tenant, actor, row ? 'resource_updated' : 'resource_created', 'resource', id, now);
  return ok(publicRow(await ctx.db.get(id)));
}

/** A tentative hold. It may overlap another tentative hold (shown as a conflict) but never a confirmed booking. */
export async function reservationSave(ctx, tenant, actor, a, now) {
  if (!REQUEST_ID.test(a.requestId || '')) return fail('invalid_request');
  const replay = await byRequest(ctx, 'mediaReservations', tenant.accountId, a.requestId);
  if (replay) return ok(publicRow(replay));
  const m = a.media || {};
  const production = await visibleProduction(ctx, tenant, actor, a.productionId);
  if (!production) return fail('production_not_found');
  if (!ACTIVE.includes(production.status) || production.status === 'accepted') return fail('production_closed');
  const resource = await owned(ctx, a.mediaResourceId, tenant.accountId, 'mediaResources');
  if (!resource || !resource.active) return fail('resource_not_found');
  const { startsAt, endsAt } = m;
  if (!Number.isSafeInteger(startsAt) || !Number.isSafeInteger(endsAt) || endsAt <= startsAt || endsAt - startsAt > MAX_RESERVATION_MS || endsAt < now) return fail('invalid_reservation');
  if ((await conflicts(ctx, tenant.accountId, resource._id, startsAt, endsAt, CONFIRMED)).length) return fail('resource_conflict');
  const hours = mediaSettings(await settingsFor(ctx, tenant.accountId)).holdHours;
  const id = await ctx.db.insert('mediaReservations', { accountId: tenant.accountId, requestId: a.requestId, resourceId: resource._id, productionId: production._id, startsAt, endsAt,
    status: 'held', holdExpiresAt: Math.min(now + hours * HOUR, startsAt), version: 1, createdAt: now, updatedAt: now });
  await audit(ctx, tenant, actor, 'reservation_held', 'reservation', id, now, resource.name);
  return ok(publicRow(await ctx.db.get(id)));
}

/** Confirms or releases a hold. Confirming re-checks for a confirmed booking on the same interval. */
export async function reservationStatus(ctx, tenant, actor, a, now) {
  const row = await owned(ctx, a.reservationId, tenant.accountId, 'mediaReservations');
  if (!row || !await visibleProduction(ctx, tenant, actor, row.productionId)) return fail('reservation_not_found');
  if (row.version !== a.version) return fail('reservation_conflict');
  const to = a.status;
  if (to === 'released') {
    if (!LIVE.has(row.status)) return fail('invalid_reservation_transition');
  } else if (to === 'confirmed') {
    if (row.status !== 'held') return fail('invalid_reservation_transition');
    if (row.holdExpiresAt && row.holdExpiresAt <= now) {
      await ctx.db.patch(row._id, { status: 'expired', version: row.version + 1, updatedAt: now });
      return fail('hold_expired');
    }
    if ((await conflicts(ctx, tenant.accountId, row.resourceId, row.startsAt, row.endsAt, CONFIRMED, row._id)).length) return fail('resource_conflict');
  } else return fail('invalid_reservation_transition');
  await ctx.db.patch(row._id, { status: to, version: row.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, `reservation_${to}`, 'reservation', row._id, now);
  return ok(publicRow(await ctx.db.get(row._id)));
}

/** Holds and shoots between two times, with the resource and production named and conflicts flagged. */
export async function calendar(ctx, tenant, actor, a, now) {
  const from = Number.isSafeInteger(a.fromAt) ? a.fromAt : now - DAY, to = Number.isSafeInteger(a.toAt) ? a.toAt : now + 14 * DAY;
  if (to <= from || to - from > 62 * DAY) return fail('invalid_range');
  const rows = (await ctx.db.query('mediaReservations').withIndex('by_account_start', q => q.eq('accountId', tenant.accountId).gte('startsAt', from - MAX_RESERVATION_MS).lt('startsAt', to)).take(1000))
    .filter(r => r.endsAt > from && LIVE.has(r.status));
  const resources = new Map((await ctx.db.query('mediaResources').withIndex('by_account', q => q.eq('accountId', tenant.accountId)).take(500)).map(r => [String(r._id), r]));
  const productions = new Map(), items = [];
  for (const r of rows) {
    if (!productions.has(String(r.productionId))) productions.set(String(r.productionId), await visibleProduction(ctx, tenant, actor, r.productionId));
    const p = productions.get(String(r.productionId));
    if (!p) continue;
    const clash = rows.some(o => o !== r && String(o.resourceId) === String(r.resourceId) && o.startsAt < r.endsAt && o.endsAt > r.startsAt);
    items.push({ ...publicRow(r), resourceName: resources.get(String(r.resourceId))?.name || null, resourceCategory: resources.get(String(r.resourceId))?.category || null,
      productionRef: p.ref, productionTitle: p.title, productionStatus: p.status, conflict: clash });
  }
  const shoots = (await ctx.db.query('mediaProductions').withIndex('by_account_created', q => q.eq('accountId', tenant.accountId)).order('desc').take(2000))
    .filter(p => p.shootStartsAt && p.shootStartsAt < to && (p.shootEndsAt || p.shootStartsAt) > from && !['cancelled'].includes(p.status))
    .filter(p => actor.role !== 'employee' || !p.producerId || String(p.producerId) === String(actor.actorAccountId))
    .map(p => ({ id: p._id, ref: p.ref, title: p.title, status: p.status, startsAt: p.shootStartsAt, endsAt: p.shootEndsAt, location: p.location || null }));
  return ok({ from, to, holds: items.sort((x, y) => x.startsAt - y.startsAt), shoots: shoots.sort((x, y) => x.startsAt - y.startsAt) });
}

/** Resources with their upcoming confirmed and tentative holds. */
export async function resourceList(ctx, tenant, actor, now) {
  const resources = await ctx.db.query('mediaResources').withIndex('by_account', q => q.eq('accountId', tenant.accountId)).take(500);
  const upcoming = (await ctx.db.query('mediaReservations').withIndex('by_account_start', q => q.eq('accountId', tenant.accountId).gte('startsAt', now - MAX_RESERVATION_MS)).take(2000))
    .filter(r => r.endsAt > now && LIVE.has(r.status));
  return ok({ items: resources.sort((x, y) => Number(y.active) - Number(x.active) || x.name.localeCompare(y.name)).map(r => {
    const mine = upcoming.filter(h => String(h.resourceId) === String(r._id));
    const { internalRateMinor, ...row } = publicRow(r);
    return { ...row, ...(actor.role === 'manager' && internalRateMinor !== undefined ? { internalRateMinor } : {}), confirmed: mine.filter(h => h.status === 'confirmed').length, held: mine.filter(h => h.status === 'held').length,
      next: mine.sort((x, y) => x.startsAt - y.startsAt)[0] ? { startsAt: mine[0].startsAt, endsAt: mine[0].endsAt, status: mine[0].status } : null };
  }) });
}

/** One cost line. A linked expense must match its amount net of VAT and is never counted twice. */
export async function costSave(ctx, tenant, actor, a, now) {
  if (!REQUEST_ID.test(a.requestId || '')) return fail('invalid_request');
  const replay = await byRequest(ctx, 'mediaCosts', tenant.accountId, a.requestId);
  if (replay) return ok(publicRow(replay));
  const m = a.media || {};
  const production = await owned(ctx, a.productionId, tenant.accountId, 'mediaProductions');
  if (!production) return fail('production_not_found');
  const label = bounded(m.label, 120), kind = m.costKind || 'actual', incurredAt = m.incurredAt ?? now;
  if (!COST_CATEGORIES.includes(m.category) || !label || !isMinor(m.amountMinor) || m.amountMinor <= 0 || !['actual', 'committed'].includes(kind) || !Number.isSafeInteger(incurredAt)
    || (m.hours !== undefined && (!Number.isSafeInteger(m.hours) || m.hours < 0 || m.hours > 10000))) return fail('invalid_cost');
  let changeOrderId;
  if (m.changeOrderId) {
    const change = await owned(ctx, m.changeOrderId, tenant.accountId, 'mediaChangeOrders');
    if (!change || String(change.productionId) !== String(production._id)) return fail('change_order_not_found');
    changeOrderId = change._id;
  }
  let expenseId;
  if (m.expenseId) {
    const expense = await owned(ctx, m.expenseId, tenant.accountId, 'hasibExpenses');
    if (!expense || expense.voided || expense.amountMinor - (expense.vatMinor || 0) !== m.amountMinor) return fail('expense_mismatch');
    const linked = await ctx.db.query('mediaCosts').withIndex('by_expense', q => q.eq('expenseId', expense._id)).take(10);
    if (linked.some(c => !c.voidedAt)) return fail('expense_already_linked');
    expenseId = expense._id;
  }
  const id = await ctx.db.insert('mediaCosts', { accountId: tenant.accountId, requestId: a.requestId, productionId: production._id, category: m.category, label, amountMinor: m.amountMinor,
    ...(m.hours !== undefined ? { hours: m.hours } : {}), ...(expenseId ? { expenseId } : {}), ...(changeOrderId ? { changeOrderId } : {}), extraScope: m.extraScope === true,
    kind, incurredAt, recordedBy: String(actor.actorAccountId), version: 1, createdAt: now, updatedAt: now });
  await audit(ctx, tenant, actor, 'cost_recorded', 'production', production._id, now, `${m.category}:${m.amountMinor}`);
  return ok(publicRow(await ctx.db.get(id)));
}

/** A voided cost stays on the record and leaves every total. */
export async function costVoid(ctx, tenant, actor, a, now) {
  const row = await owned(ctx, a.costId, tenant.accountId, 'mediaCosts');
  if (!row) return fail('cost_not_found');
  if (!row.voidedAt) await ctx.db.patch(row._id, { voidedAt: now, version: row.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, 'cost_voided', 'production', row.productionId, now);
  return ok(publicRow(await ctx.db.get(row._id)));
}
