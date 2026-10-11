// Fitness & wellness (ascend/fitness.md). Staff record facts: a plan, a class, a booking, a
// check-in, a payment, a freeze or a cancellation. Hasib does the rest in the same mutation:
// payment activates the membership, a check-in consumes one credit once, a freed seat goes to the
// next eligible person on the waitlist, and a freeze moves the end date and releases its classes.
// Orders stay the one record of money; nothing here sends a message.
import { owned } from '../blueTenant.js';
import { ok, fail, bounded, REQUEST_ID, byRequest } from './shared.js';
import { isMinor } from './money.js';
import { createOrder, recordPayment, PAYMENT_METHODS } from './ordersState.js';
import { audit, workspaceContainsAccount } from './workspaceState.js';
import { businessTimezone } from './expensesState.js';
import { publicRow } from './workspace/rows.js';
import { approveDraft, draftRefusal } from './workspace/drafts.js';
import { replayOr, strip } from './workspace/records.js';
import { displayName } from '../blueContacts.js';
import { loadGym, refreshGym, describeMembers, memberContactIds, fitnessOverview, currentMembership, insertDraft, conversationOf } from './fitnessGym.js';
import { fitnessFollowupQueue, resolveFitnessTask, snoozeFitnessTask, fitnessContext } from './fitnessFollowups.js';
import { fitnessInsights, fitnessMetricRecords } from './fitnessInsights.js';
import { DAY, HOUR, PLAN_KINDS, BILLING_MONTHS, ATTENDANCE_SOURCES, CLASS_MAX_MS, effectiveEnd, currentFreeze, entitlementRefusal } from './fitnessDomain.js';

const MANAGER_ONLY = new Set(['fitness_plan_save', 'fitness_class_save', 'fitness_membership_save', 'fitness_payment_record', 'fitness_freeze', 'fitness_cancel', 'fitness_renew',
  'fitness_draft_approve', 'fitness_insights', 'fitness_metric_records']);
const LIVE_SEATS = new Set(['confirmed', 'waitlisted', 'attended', 'no_show']);
const SOURCE_EVENT = /^[A-Za-z0-9._:-]{1,80}$/;
const time = v => Number.isSafeInteger(v) && v > 0 ? v : null;
const plain = (row, actor) => { const { priceMinor, ...rest } = publicRow(row); return actor.role === 'manager' ? { ...rest, priceMinor } : rest; };

/** Plans: what a membership or class pack is, its term, freeze allowance and grace. */
async function planSave(ctx, tenant, actor, a, now) {
  const f = a.fitness || {}, accountId = tenant.accountId;
  let row = null;
  if (a.planId) {
    row = await owned(ctx, a.planId, accountId, 'fitnessPlans');
    if (!row) return fail('plan_not_found');
    if (row.version !== a.version) return fail('plan_conflict');
  } else {
    const r = await replayOr(ctx, 'fitnessPlans', tenant, a);
    if (r.error) return fail(r.error);
    if (r.replay) return r.replay;
  }
  const pick = (k, d) => f[k] !== undefined ? f[k] : row?.[k] ?? d;
  const name = bounded(pick('name'), 80), kind = pick('kind', 'membership'), termDays = pick('termDays', 30), billingMonths = pick('billingMonths', 1), priceMinor = pick('priceMinor', 0);
  const credits = kind === 'class_pack' ? pick('credits') : undefined, freezeMaxDays = pick('freezeMaxDays', 0), graceDays = pick('graceDays', 7), active = pick('active', true);
  if (!name || !PLAN_KINDS.includes(kind) || !Number.isSafeInteger(termDays) || termDays < 1 || termDays > 730 || !BILLING_MONTHS.includes(billingMonths) || !isMinor(priceMinor)
    || (kind === 'class_pack' && (!Number.isSafeInteger(credits) || credits < 1 || credits > 500)) || !Number.isSafeInteger(freezeMaxDays) || freezeMaxDays < 0 || freezeMaxDays > 180
    || !Number.isSafeInteger(graceDays) || graceDays < 0 || graceDays > 60 || typeof active !== 'boolean') return fail('invalid_plan');
  const data = { name, kind, termDays, billingMonths, priceMinor, ...(credits ? { credits } : {}), freezeMaxDays, graceDays, active, version: (row?.version || 0) + 1, updatedAt: now };
  let id;
  if (row) { await ctx.db.replace(row._id, { ...strip(row, ['credits']), ...data }); id = row._id; }
  else id = await ctx.db.insert('fitnessPlans', { accountId, requestId: a.requestId, ...data, createdAt: now });
  await audit(ctx, tenant, actor, row ? 'plan_updated' : 'plan_created', 'plan', id, now);
  return ok(plain(await ctx.db.get(id), actor));
}

/** Classes: one dated session with its capacity. Cancelling releases every seat; raising capacity fills from the waitlist. */
async function classSave(ctx, tenant, actor, a, now) {
  const f = a.fitness || {}, accountId = tenant.accountId;
  let row = null;
  if (a.classId) {
    row = await owned(ctx, a.classId, accountId, 'fitnessClasses');
    if (!row) return fail('class_not_found');
    if (row.version !== a.version) return fail('class_conflict');
    if (row.status === 'cancelled') return fail('class_cancelled');
  } else {
    const r = await replayOr(ctx, 'fitnessClasses', tenant, a);
    if (r.error) return fail(r.error);
    if (r.replay) return r.replay;
  }
  const seats = row ? await ctx.db.query('fitnessSeats').withIndex('by_class', q => q.eq('classId', row._id)).take(500) : [];
  if (row && f.cancel === true) {
    const reason = bounded(a.reason, 200);
    if (!reason) return fail('cancel_reason_required');
    if (row.startsAt <= now) return fail('class_started');
    for (const s of seats) if (['confirmed', 'waitlisted'].includes(s.status)) await ctx.db.patch(s._id, { status: 'cancelled', cancelledAt: now, version: s.version + 1, updatedAt: now });
    await ctx.db.patch(row._id, { status: 'cancelled', cancelReason: reason, version: row.version + 1, updatedAt: now });
    await audit(ctx, tenant, actor, 'class_cancelled', 'class', row._id, now, reason);
    return ok(publicRow(await ctx.db.get(row._id)));
  }
  const pick = (k, d) => f[k] !== undefined ? f[k] : row?.[k] ?? d;
  const title = bounded(pick('title'), 80), classType = bounded(pick('classType', 'class'), 40) || 'class', startsAt = time(pick('startsAt')), endsAt = time(pick('endsAt')), capacity = pick('capacity', 12);
  const coachName = bounded(pick('coachName', ''), 80), coachId = f.coachId !== undefined ? (f.coachId || undefined) : row?.coachId;
  if (!title || !startsAt || !endsAt || endsAt <= startsAt || endsAt - startsAt > CLASS_MAX_MS || !Number.isSafeInteger(capacity) || capacity < 1 || capacity > 200) return fail('invalid_class');
  if (row && (startsAt !== row.startsAt || endsAt !== row.endsAt) && seats.some(s => LIVE_SEATS.has(s.status))) return fail('class_has_bookings');
  if (capacity < seats.filter(s => ['confirmed', 'attended'].includes(s.status)).length) return fail('capacity_below_bookings');
  if (coachId && !await workspaceContainsAccount(ctx, actor.workspace, coachId)) return fail('invalid_assignment');
  const data = { title, classType, startsAt, endsAt, capacity, ...(coachName ? { coachName } : {}), ...(coachId ? { coachId } : {}), status: 'scheduled', version: (row?.version || 0) + 1, updatedAt: now };
  let id;
  if (row) { await ctx.db.replace(row._id, { ...strip(row, ['coachName', 'coachId']), ...data }); id = row._id; }
  else id = await ctx.db.insert('fitnessClasses', { accountId, requestId: a.requestId, ...data, createdAt: now });
  if (row && capacity > row.capacity) await promoteWaitlist(ctx, tenant, await ctx.db.get(id), now);
  await audit(ctx, tenant, actor, row ? 'class_updated' : 'class_created', 'class', id, now);
  return ok(publicRow(await ctx.db.get(id)));
}

/** Seats a membership already holds in classes still to come (they reserve its credits). */
async function heldFor(ctx, membership, now, excludeSeatId) {
  const seats = await ctx.db.query('fitnessSeats').withIndex('by_contact', q => q.eq('contactId', membership.contactId)).take(500);
  let n = 0;
  for (const s of seats) {
    if (String(s.membershipId) !== String(membership._id) || s.status !== 'confirmed' || String(s._id) === String(excludeSeatId)) continue;
    if ((await ctx.db.get(s.classId))?.startsAt > now) n++;
  }
  return n;
}

/** The contact's membership that covers a class at `t`, or the reason none does. */
async function coveringMembership(ctx, accountId, contactId, t, now) {
  const rows = (await ctx.db.query('hasibMemberships').withIndex('by_contact', q => q.eq('contactId', contactId)).take(50)).filter(m => m.accountId === accountId);
  let refusal = rows.length ? 'membership_inactive' : 'membership_required';
  for (const m of rows.sort((x, y) => x.startsAt - y.startsAt)) {
    const why = entitlementRefusal(m, t, await heldFor(ctx, m, now));
    if (!why) return { membership: m };
    if (why !== 'membership_inactive') refusal = why;
  }
  return { refusal };
}

/** Moves the earliest eligible waitlisted seats into free places, and writes each person a notice draft. */
async function promoteWaitlist(ctx, tenant, klass, now) {
  if (klass.status === 'cancelled' || klass.startsAt <= now) return;
  const seats = await ctx.db.query('fitnessSeats').withIndex('by_class', q => q.eq('classId', klass._id)).take(500);
  let free = klass.capacity - seats.filter(s => ['confirmed', 'attended'].includes(s.status)).length;
  const timezone = await businessTimezone(ctx, tenant.accountId);
  for (const seat of seats.filter(s => s.status === 'waitlisted').sort((x, y) => x.createdAt - y.createdAt || String(x._id).localeCompare(String(y._id)))) {
    if (free <= 0) break;
    let membershipId = seat.membershipId;
    if (!seat.trial) {
      // The person must still be entitled at class time (paid, not frozen, a credit left); otherwise the next one is offered the place.
      const cover = await coveringMembership(ctx, tenant.accountId, seat.contactId, klass.startsAt, now);
      if (!cover.membership) continue;
      membershipId = cover.membership._id;
    }
    await ctx.db.patch(seat._id, { status: 'confirmed', promotedAt: now, ...(membershipId ? { membershipId } : {}), version: seat.version + 1, updatedAt: now });
    await insertDraft(ctx, tenant.accountId, { kind: 'waitlist_promoted', key: `waitlist:${seat._id}`, contactId: seat.contactId, seat, klass }, timezone, now);
    free--;
  }
}

/** Books a member (or a first-time trial) into a class. A full class puts them on its waitlist instead. */
async function seatBook(ctx, tenant, actor, a, now) {
  const r = await replayOr(ctx, 'fitnessSeats', tenant, a);
  if (r.error) return fail(r.error);
  if (r.replay) return r.replay;
  const f = a.fitness || {}, accountId = tenant.accountId;
  const klass = await owned(ctx, a.classId, accountId, 'fitnessClasses');
  if (!klass) return fail('class_not_found');
  if (klass.status === 'cancelled') return fail('class_cancelled');
  if (klass.startsAt <= now) return fail('class_started');
  const contact = await owned(ctx, a.contactId, accountId, 'blueContacts');
  if (!contact || contact.state !== 'active') return fail('contact_not_found');
  // Read inside the mutation: two bookings racing for the last place make Convex retry one of them.
  const seats = await ctx.db.query('fitnessSeats').withIndex('by_class', q => q.eq('classId', klass._id)).take(500);
  if (seats.some(s => String(s.contactId) === String(contact._id) && ['confirmed', 'waitlisted', 'attended'].includes(s.status))) return fail('already_booked');
  const trial = f.trial === true;
  let membershipId;
  if (trial) {
    const memberships = await ctx.db.query('hasibMemberships').withIndex('by_contact', q => q.eq('contactId', contact._id)).take(5);
    const previous = await ctx.db.query('fitnessSeats').withIndex('by_contact', q => q.eq('contactId', contact._id)).take(200);
    if (memberships.some(m => m.accountId === accountId) || previous.some(s => s.trial && s.status !== 'cancelled')) return fail('trial_used');
  } else {
    const cover = await coveringMembership(ctx, accountId, contact._id, klass.startsAt, now);
    if (!cover.membership) return fail(cover.refusal);
    membershipId = cover.membership._id;
  }
  const full = seats.filter(s => ['confirmed', 'attended'].includes(s.status)).length >= klass.capacity;
  const id = await ctx.db.insert('fitnessSeats', { accountId, requestId: a.requestId, classId: klass._id, contactId: contact._id, ...(membershipId ? { membershipId } : {}), trial,
    ...(bounded(f.source, 40) ? { source: bounded(f.source, 40) } : {}), status: full ? 'waitlisted' : 'confirmed', version: 1, createdAt: now, updatedAt: now });
  await audit(ctx, tenant, actor, full ? 'seat_waitlisted' : 'seat_booked', 'seat', id, now);
  return ok(publicRow(await ctx.db.get(id)));
}

/** Cancels a booking before the class (the place goes to the waitlist) or marks a no-show after it. */
async function seatStatus(ctx, tenant, actor, a, now) {
  const seat = await owned(ctx, a.seatId, tenant.accountId, 'fitnessSeats');
  if (!seat) return fail('seat_not_found');
  if (seat.version !== a.version) return fail('seat_conflict');
  const klass = await ctx.db.get(seat.classId);
  if (a.status === 'cancelled') {
    if (!['confirmed', 'waitlisted'].includes(seat.status)) return fail('invalid_seat_transition');
    if (klass.startsAt <= now) return fail('class_started');
    await ctx.db.patch(seat._id, { status: 'cancelled', cancelledAt: now, version: seat.version + 1, updatedAt: now });
    if (seat.status === 'confirmed') await promoteWaitlist(ctx, tenant, klass, now);
  } else if (a.status === 'no_show') {
    // A no-show is a recorded fact after the class; a missing check-in alone stays unknown.
    if (seat.status !== 'confirmed') return fail('invalid_seat_transition');
    if (klass.endsAt > now) return fail('class_not_finished');
    await ctx.db.patch(seat._id, { status: 'no_show', version: seat.version + 1, updatedAt: now });
  } else return fail('invalid_seat_transition');
  await audit(ctx, tenant, actor, `seat_${a.status}`, 'seat', seat._id, now);
  return ok(publicRow(await ctx.db.get(seat._id)));
}

/** Records a visit: a class check-in (consumes one class-pack credit) or an open-gym visit. A repeated scan returns the same visit. */
async function checkin(ctx, tenant, actor, a, now) {
  const f = a.fitness || {}, accountId = tenant.accountId, source = f.source || 'staff';
  if (!ATTENDANCE_SOURCES.includes(source)) return fail('invalid_attendance');
  const sourceEventId = f.sourceEventId !== undefined ? (SOURCE_EVENT.test(f.sourceEventId) ? f.sourceEventId : null) : undefined;
  if (sourceEventId === null) return fail('invalid_attendance');
  if (sourceEventId) {
    const seatEcho = await ctx.db.query('fitnessSeats').withIndex('by_account_source', q => q.eq('accountId', accountId).eq('sourceEventId', sourceEventId)).first();
    if (seatEcho) return ok({ ...publicRow(seatEcho), replay: true });
    const visitEcho = await ctx.db.query('hasibCredits').withIndex('by_account_source', q => q.eq('accountId', accountId).eq('sourceEventId', sourceEventId)).first();
    if (visitEcho) return ok({ ...publicRow(visitEcho), replay: true });
  }
  if (a.seatId) {
    const seat = await owned(ctx, a.seatId, accountId, 'fitnessSeats');
    if (!seat) return fail('seat_not_found');
    if (seat.status === 'attended') return ok({ ...publicRow(seat), replay: true });
    if (seat.status !== 'confirmed') return fail('invalid_seat_transition');
    const klass = await ctx.db.get(seat.classId);
    if (klass.status === 'cancelled') return fail('class_cancelled');
    if (now < klass.startsAt - HOUR) return fail('class_not_started');
    if (seat.membershipId) {
      const m = await owned(ctx, seat.membershipId, accountId, 'hasibMemberships');
      if (!m) return fail('membership_not_found');
      if (m.kind === 'lessons' && m.remainingCredits < 1) return fail('no_credits_remaining');
      const delta = m.kind === 'lessons' ? -1 : 0;
      await ctx.db.insert('hasibCredits', { accountId, membershipId: m._id, seatId: seat._id, kind: delta ? 'consume' : 'attendance', delta, attendedAt: klass.startsAt, createdAt: now, version: 1 });
      await ctx.db.patch(m._id, { remainingCredits: m.remainingCredits + delta, lastAttendanceAt: Math.max(m.lastAttendanceAt || 0, klass.startsAt), version: m.version + 1, updatedAt: now });
    }
    await ctx.db.patch(seat._id, { status: 'attended', attendedAt: now, attendanceSource: source, ...(sourceEventId ? { sourceEventId } : {}), version: seat.version + 1, updatedAt: now });
    await audit(ctx, tenant, actor, 'checked_in', 'seat', seat._id, now, source);
    return ok(publicRow(await ctx.db.get(seat._id)));
  }
  // Open gym: the member's current membership must cover today.
  const cover = await coveringMembership(ctx, accountId, a.contactId, now, now);
  if (!cover.membership) return fail(cover.refusal);
  const m = cover.membership;
  if (m.kind === 'lessons') return fail('class_pack_needs_class');
  const id = await ctx.db.insert('hasibCredits', { accountId, membershipId: m._id, kind: 'attendance', delta: 0, attendedAt: now, ...(sourceEventId ? { sourceEventId } : {}), createdAt: now, version: 1 });
  await ctx.db.patch(m._id, { lastAttendanceAt: now, version: m.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, 'checked_in', 'membership', m._id, now, source);
  return ok(publicRow(await ctx.db.get(id)));
}

/** Starts the membership once its order is fully paid: now, or at the end of the one it renews. */
async function activateIfPaid(ctx, membership, order, now) {
  if (membership.status !== 'pending' || !order || order.paidMinor < order.totalMinor) return false;
  const previous = membership.renewalOfId ? await ctx.db.get(membership.renewalOfId) : null;
  const term = membership.endsAt - membership.startsAt;
  const startsAt = Math.max(now, previous && previous.status !== 'cancelled' ? effectiveEnd(previous) : 0, membership.requestedStartAt || 0);
  await ctx.db.patch(membership._id, { status: 'active', activatedAt: now, startsAt, endsAt: startsAt + term, version: membership.version + 1, updatedAt: now });
  return true;
}

/** A pending membership from a plan, with its order. A free plan starts at once. */
async function newMembership(ctx, tenant, { requestId, contactId, plan, renewalOf, startsAt, assignedAccountId }, now) {
  const kind = plan.kind === 'class_pack' ? 'lessons' : 'membership', credits = kind === 'lessons' ? plan.credits : 0;
  const start = startsAt || now, id = await ctx.db.insert('hasibMemberships', { accountId: tenant.accountId, requestId, contactId, name: plan.name, kind, startsAt: start, endsAt: start + plan.termDays * DAY,
    status: 'pending', initialCredits: credits, remainingCredits: credits, planId: plan._id, priceMinor: plan.priceMinor, billingMonths: plan.billingMonths,
    ...(renewalOf ? { renewalOfId: renewalOf._id } : {}), ...(startsAt ? { requestedStartAt: startsAt } : {}), ...(assignedAccountId ? { assignedAccountId } : {}), freezes: [],
    version: 1, createdAt: now, updatedAt: now });
  if (plan.priceMinor > 0) {
    const order = await createOrder(ctx, tenant, { requestId: `fitness-membership:${id}`, channel: 'walk_in', contactId, kind: 'fitness_membership', source: 'fitness',
      fulfilment: { type: 'in_store' }, lines: [{ name: plan.name.slice(0, 120), qty: 1, unitPriceMinor: plan.priceMinor }] }, now, { internal: true });
    if (!order.ok) throw Object.assign(new Error(order.reason), { reason: order.reason });
    await ctx.db.patch(id, { orderId: order.value.id });
  } else await activateIfPaid(ctx, await ctx.db.get(id), { paidMinor: 0, totalMinor: 0 }, now);
  return id;
}

/** Add membership: the manual fallback for offline sign-ups. Normal joins come from a trial or a renewal. */
async function membershipSave(ctx, tenant, actor, a, now) {
  if (!REQUEST_ID.test(a.requestId || '')) return fail('invalid_request');
  const replay = await byRequest(ctx, 'hasibMemberships', tenant.accountId, a.requestId);
  if (replay) return ok(publicRow(replay));
  const f = a.fitness || {};
  const contact = await owned(ctx, a.contactId, tenant.accountId, 'blueContacts');
  if (!contact || contact.state !== 'active') return fail('contact_not_found');
  const plan = await owned(ctx, a.planId, tenant.accountId, 'fitnessPlans');
  if (!plan || !plan.active) return fail('plan_not_found');
  const gym = await loadGym(ctx, tenant.accountId, now), current = currentMembership(gym, contact._id);
  if (current && ['active', 'frozen', 'pending', 'upcoming'].includes(gym.stateOf(current))) return fail('membership_exists');
  const startsAt = f.startsAt !== undefined ? time(f.startsAt) : undefined;
  if (startsAt === null || (startsAt && (startsAt < now - DAY || startsAt > now + 365 * DAY))) return fail('invalid_membership');
  if (f.assignedAccountId && !await workspaceContainsAccount(ctx, actor.workspace, f.assignedAccountId)) return fail('invalid_assignment');
  try {
    const id = await newMembership(ctx, tenant, { requestId: a.requestId, contactId: contact._id, plan, startsAt, assignedAccountId: f.assignedAccountId }, now);
    await audit(ctx, tenant, actor, 'membership_created', 'membership', id, now, plan.name);
    return ok(publicRow(await ctx.db.get(id)));
  } catch (e) { return fail(e.reason || 'invalid_membership'); }
}

/** Records a payment on the membership's order; a fully paid pending membership starts by itself. */
async function payment(ctx, tenant, actor, a, now) {
  const m = await owned(ctx, a.membershipId, tenant.accountId, 'hasibMemberships');
  if (!m || !m.orderId) return fail('membership_not_found');
  if (!PAYMENT_METHODS.includes(a.method)) return fail('invalid_payment');
  const paid = await recordPayment(ctx, tenant.accountId, { requestId: a.requestId, orderId: m.orderId, amountMinor: a.amountMinor, method: a.method, reference: bounded(a.reference, 80) || 'membership' }, now);
  if (!paid.ok) return paid;
  // A replayed payment finds the membership already active and changes nothing.
  const activated = await activateIfPaid(ctx, await ctx.db.get(m._id), await ctx.db.get(m.orderId), now);
  if (activated) await audit(ctx, tenant, actor, 'membership_activated', 'membership', m._id, now);
  return ok(publicRow(await ctx.db.get(m._id)));
}

/** Freezes for whole days within the plan's allowance, or ends the current freeze early. Classes inside the freeze are released. */
async function freeze(ctx, tenant, actor, a, now) {
  const f = a.fitness || {}, m = await owned(ctx, a.membershipId, tenant.accountId, 'hasibMemberships');
  if (!m) return fail('membership_not_found');
  if (m.version !== a.version) return fail('membership_conflict');
  if (m.status !== 'active') return fail('membership_inactive');
  const freezes = m.freezes || [];
  if (f.end === true) {
    const current = currentFreeze(m, now);
    if (!current) return fail('not_frozen');
    await ctx.db.patch(m._id, { freezes: freezes.map(x => x === current ? { ...x, endsAt: now } : x), version: m.version + 1, updatedAt: now });
    await audit(ctx, tenant, actor, 'freeze_ended', 'membership', m._id, now);
    return ok(publicRow(await ctx.db.get(m._id)));
  }
  const plan = m.planId ? await ctx.db.get(m.planId) : null, days = f.days, startsAt = f.startsAt !== undefined ? time(f.startsAt) : now;
  const used = freezes.reduce((s, x) => s + Math.max(0, x.endsAt - x.startsAt), 0) / DAY;
  if (!Number.isSafeInteger(days) || days < 1 || !startsAt || startsAt < now - HOUR || startsAt >= effectiveEnd(m)) return fail('invalid_freeze');
  if (used + days > (plan?.freezeMaxDays ?? 0)) return fail('freeze_limit');
  const endsAt = startsAt + days * DAY;
  if (freezes.some(x => x.startsAt < endsAt && x.endsAt > startsAt)) return fail('invalid_freeze');
  const reason = bounded(a.reason, 200) || 'customer_request';
  await ctx.db.patch(m._id, { freezes: [...freezes, { startsAt, endsAt, reason, recordedBy: String(actor.actorAccountId), at: now }], version: m.version + 1, updatedAt: now });
  // Bookings inside the freeze are no longer covered: release them and fill their places.
  for (const seat of await ctx.db.query('fitnessSeats').withIndex('by_contact', q => q.eq('contactId', m.contactId)).take(500)) {
    if (String(seat.membershipId) !== String(m._id) || !['confirmed', 'waitlisted'].includes(seat.status)) continue;
    const klass = await ctx.db.get(seat.classId);
    if (klass.startsAt < startsAt || klass.startsAt >= endsAt || klass.startsAt <= now) continue;
    await ctx.db.patch(seat._id, { status: 'cancelled', cancelledAt: now, version: seat.version + 1, updatedAt: now });
    if (seat.status === 'confirmed') await promoteWaitlist(ctx, tenant, klass, now);
  }
  await audit(ctx, tenant, actor, 'membership_frozen', 'membership', m._id, now, String(days));
  return ok(publicRow(await ctx.db.get(m._id)));
}

/** Cancels a membership with a reason. History and payments stay; future classes are released. */
async function cancel(ctx, tenant, actor, a, now) {
  const m = await owned(ctx, a.membershipId, tenant.accountId, 'hasibMemberships');
  if (!m) return fail('membership_not_found');
  if (m.version !== a.version) return fail('membership_conflict');
  if (m.status === 'cancelled') return fail('membership_cancelled');
  const reason = bounded(a.reason, 200);
  if (!reason) return fail('cancel_reason_required');
  await ctx.db.patch(m._id, { status: 'cancelled', cancelledAt: now, cancelReason: reason, version: m.version + 1, updatedAt: now });
  for (const seat of await ctx.db.query('fitnessSeats').withIndex('by_contact', q => q.eq('contactId', m.contactId)).take(500)) {
    if (String(seat.membershipId) !== String(m._id) || !['confirmed', 'waitlisted'].includes(seat.status)) continue;
    const klass = await ctx.db.get(seat.classId);
    if (klass.startsAt <= now) continue;
    await ctx.db.patch(seat._id, { status: 'cancelled', cancelledAt: now, version: seat.version + 1, updatedAt: now });
    if (seat.status === 'confirmed') await promoteWaitlist(ctx, tenant, klass, now);
  }
  for (const d of await ctx.db.query('fitnessDrafts').withIndex('by_contact', q => q.eq('contactId', m.contactId)).take(100))
    if (d.status === 'draft' && String(d.membershipId) === String(m._id)) await ctx.db.patch(d._id, { status: 'cancelled', version: d.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, 'membership_cancelled', 'membership', m._id, now, reason);
  return ok(publicRow(await ctx.db.get(m._id)));
}

/** Renews into a linked successor that starts when this one ends, once paid. A renewal is never counted as a new member. */
async function renew(ctx, tenant, actor, a, now) {
  if (!REQUEST_ID.test(a.requestId || '')) return fail('invalid_request');
  const m = await owned(ctx, a.membershipId, tenant.accountId, 'hasibMemberships');
  if (!m) return fail('membership_not_found');
  const successor = (await ctx.db.query('hasibMemberships').withIndex('by_contact', q => q.eq('contactId', m.contactId)).take(50)).find(x => String(x.renewalOfId) === String(m._id) && x.status !== 'cancelled');
  if (successor) return successor.requestId === a.requestId ? ok(publicRow(successor)) : fail('already_renewed');
  if (m.version !== a.version) return fail('membership_conflict');
  if (m.status !== 'active') return fail('membership_inactive');
  // After the grace period a return is a new membership (a returning member), not a renewal.
  const current = m.planId ? await ctx.db.get(m.planId) : null;
  if (now >= effectiveEnd(m) + (current?.graceDays ?? 7) * DAY) return fail('membership_lapsed');
  const plan = await owned(ctx, a.planId || m.planId, tenant.accountId, 'fitnessPlans');
  if (!plan || !plan.active) return fail('plan_not_found');
  try {
    const id = await newMembership(ctx, tenant, { requestId: a.requestId, contactId: m.contactId, plan, renewalOf: m, startsAt: Math.max(now, effectiveEnd(m)), assignedAccountId: m.assignedAccountId }, now);
    await audit(ctx, tenant, actor, 'membership_renewed', 'membership', id, now, plan.name);
    return ok(publicRow(await ctx.db.get(id)));
  } catch (e) { return fail(e.reason || 'invalid_membership'); }
}

async function draftApprove(ctx, tenant, actor, a, now) {
  const row = await owned(ctx, a.draftId, tenant.accountId, 'fitnessDrafts'), refusal = draftRefusal(row, a);
  if (refusal) return fail(refusal);
  const text = a.fitness?.text !== undefined ? bounded(a.fitness.text, 4000) : row.text;
  if (!text) return fail('invalid_draft');
  const saved = await approveDraft(ctx, tenant, actor, { row, edit: { text, ...(a.fitness?.templateId ? { templateId: bounded(a.fitness.templateId, 80) } : {}) },
    keyPrefix: 'fitness-draft', handoffReason: 'membership_follow_up', taskTable: 'fitnessTasks',
    links: async d => ({ messageLinks: { fitnessDraftId: d._id }, recipientLinks: { fitnessDraftId: d._id }, contactId: d.contactId }) }, now);
  return ok(publicRow(saved));
}

/** The member list, with the four quick filters and an Insights drill-down population. */
async function members(ctx, tenant, actor, a, now) {
  const { gym, settings } = await refreshGym(ctx, tenant.accountId, now);
  let ids = await memberContactIds(ctx, tenant.accountId, gym);
  if (a.contactId) ids = ids.filter(id => id === String(a.contactId));
  const rows = await describeMembers(ctx, tenant.accountId, actor, gym, ids, now, settings);
  const filtered = a.filter && ['trialFollowUp', 'attendanceGap', 'expiring', 'frozen'].includes(a.filter) ? rows.filter(r => r.flags[a.filter]) : rows;
  const order = r => r.flags.attendanceGap || r.flags.expiring ? 0 : r.flags.trialFollowUp ? 1 : 2;
  return ok({ items: filtered.sort((x, y) => order(x) - order(y) || (x.membership?.endsAt ?? Infinity) - (y.membership?.endsAt ?? Infinity)).slice(0, 1000), complete: gym.complete && rows.length <= 1000 });
}

/** One member's record: memberships with payments and freezes, classes, visits, drafts and activity. */
async function member(ctx, tenant, actor, a, now) {
  const { gym, settings } = await refreshGym(ctx, tenant.accountId, now);
  const contact = await owned(ctx, a.contactId, tenant.accountId, 'blueContacts');
  if (!contact) return fail('member_not_found');
  const [card] = await describeMembers(ctx, tenant.accountId, actor, gym, [String(contact._id)], now, settings);
  const memberships = (gym.membershipsOf.get(String(contact._id)) || []).sort((x, y) => y.startsAt - x.startsAt);
  const visits = [];
  for (const m of memberships) visits.push(...await ctx.db.query('hasibCredits').withIndex('by_membership_created', q => q.eq('membershipId', m._id)).order('desc').take(100));
  const seats = (gym.seatsByContact.get(String(contact._id)) || []).map(s => ({ ...publicRow(s), klass: (k => k ? { title: k.title, classType: k.classType, startsAt: k.startsAt, endsAt: k.endsAt, status: k.status } : null)(gym.classById.get(String(s.classId))) }))
    .sort((x, y) => (y.klass?.startsAt || 0) - (x.klass?.startsAt || 0));
  const payments = [];
  if (actor.role === 'manager') for (const m of memberships) if (m.orderId) payments.push(...(await ctx.db.query('hasibPayments').withIndex('by_order_at', q => q.eq('orderId', m.orderId)).take(50)).map(p => ({ ...publicRow(p), membershipId: m._id })));
  const activity = [
    ...memberships.flatMap(m => [{ at: m.createdAt, kind: m.renewalOfId ? 'renewal_created' : 'membership_created', detail: m.name }, ...(m.activatedAt ? [{ at: m.activatedAt, kind: 'activated', detail: m.name }] : []),
      ...(m.freezes || []).map(x => ({ at: x.at, kind: 'frozen', detail: `${Math.round((x.endsAt - x.startsAt) / DAY)}` })), ...(m.cancelledAt ? [{ at: m.cancelledAt, kind: 'cancelled', detail: m.cancelReason }] : [])]),
    ...seats.flatMap(s => [{ at: s.createdAt, kind: s.trial ? 'trial_booked' : 'class_booked', detail: s.klass?.title }, ...(s.attendedAt ? [{ at: s.attendedAt, kind: 'attended', detail: s.klass?.title }] : []),
      ...(s.status === 'no_show' ? [{ at: s.updatedAt, kind: 'no_show', detail: s.klass?.title }] : [])]),
  ].sort((x, y) => y.at - x.at).slice(0, 100);
  const { conversation } = await conversationOf(ctx, tenant.accountId, contact._id);
  return ok({ ...card, conversationId: conversation?._id || null,
    memberships: memberships.map(m => { const { priceMinor, ...rest } = publicRow(m); const order = m.orderId ? gym.orders.get(String(m.orderId)) : null;
      const plan = gym.planById.get(String(m.planId)), frozenDays = (m.freezes || []).reduce((sum, f) => sum + Math.max(0, f.endsAt - f.startsAt), 0) / DAY;
      return { ...rest, state: gym.stateOf(m), effectiveEndsAt: effectiveEnd(m), planName: plan?.name || m.name, freezeDaysLeft: Math.max(0, Math.floor((plan?.freezeMaxDays ?? 0) - frozenDays)),
        ...(actor.role === 'manager' ? { priceMinor, paidMinor: order?.paidMinor || 0, totalMinor: order?.totalMinor || 0 } : {}) }; }),
    seats, visits: visits.filter(v => v.kind !== 'reversal').map(publicRow).sort((x, y) => y.attendedAt - x.attendedAt).slice(0, 100), payments,
    drafts: gym.drafts.filter(d => String(d.contactId) === String(contact._id)).map(publicRow), activity });
}

async function plans(ctx, tenant, actor) {
  const rows = await ctx.db.query('fitnessPlans').withIndex('by_account', q => q.eq('accountId', tenant.accountId)).take(500);
  return ok({ items: rows.sort((x, y) => Number(y.active) - Number(x.active) || x.name.localeCompare(y.name)).map(r => plain(r, actor)) });
}

/** Classes in a date range with their rosters and waitlists. */
async function classes(ctx, tenant, actor, a, now) {
  const fromAt = time(a.fromAt) || now - DAY, toAt = time(a.toAt) || now + 14 * DAY;
  if (toAt <= fromAt || toAt - fromAt > 62 * DAY) return fail('invalid_range');
  const rows = await ctx.db.query('fitnessClasses').withIndex('by_account_start', q => q.eq('accountId', tenant.accountId).gte('startsAt', fromAt).lt('startsAt', toAt)).take(500);
  const names = new Map(), items = [];
  for (const c of rows.sort((x, y) => x.startsAt - y.startsAt)) {
    const seats = await ctx.db.query('fitnessSeats').withIndex('by_class', q => q.eq('classId', c._id)).take(500);
    const roster = [];
    for (const s of seats.filter(x => x.status !== 'cancelled').sort((x, y) => x.createdAt - y.createdAt)) {
      if (!names.has(String(s.contactId))) { const p = await ctx.db.get(s.contactId); names.set(String(s.contactId), p?.state === 'active' ? displayName(p).name : null); }
      roster.push({ ...publicRow(s), contactName: names.get(String(s.contactId)) });
    }
    items.push({ ...publicRow(c), booked: roster.filter(s => ['confirmed', 'attended', 'no_show'].includes(s.status)).length, attended: roster.filter(s => s.status === 'attended').length,
      waitlisted: roster.filter(s => s.status === 'waitlisted').length, finished: c.endsAt <= now, roster });
  }
  return ok({ items, fromAt, toAt });
}

export async function executeFitness(ctx, tenant, actor, a, now) {
  if (!a.operation?.startsWith('fitness_')) return null;
  if (MANAGER_ONLY.has(a.operation) && actor.role !== 'manager') return fail('manager_required');
  switch (a.operation) {
    case 'fitness_overview': {
      const result = await fitnessOverview(ctx, tenant, actor, now);
      const queue = await fitnessFollowupQueue(ctx, tenant, actor, {}, now);
      return ok({ ...result.value, followups: { counts: queue.value.counts, actionable: queue.value.actionable } });
    }
    case 'fitness_members': return members(ctx, tenant, actor, a, now);
    case 'fitness_member': return member(ctx, tenant, actor, a, now);
    case 'fitness_plans': return plans(ctx, tenant, actor);
    case 'fitness_plan_save': return planSave(ctx, tenant, actor, a, now);
    case 'fitness_classes': return classes(ctx, tenant, actor, a, now);
    case 'fitness_class_save': return classSave(ctx, tenant, actor, a, now);
    case 'fitness_seat_book': return seatBook(ctx, tenant, actor, a, now);
    case 'fitness_seat_status': return seatStatus(ctx, tenant, actor, a, now);
    case 'fitness_checkin': return checkin(ctx, tenant, actor, a, now);
    case 'fitness_membership_save': return membershipSave(ctx, tenant, actor, a, now);
    case 'fitness_payment_record': return payment(ctx, tenant, actor, a, now);
    case 'fitness_freeze': return freeze(ctx, tenant, actor, a, now);
    case 'fitness_cancel': return cancel(ctx, tenant, actor, a, now);
    case 'fitness_renew': return renew(ctx, tenant, actor, a, now);
    case 'fitness_followups': await refreshGym(ctx, tenant.accountId, now); return fitnessFollowupQueue(ctx, tenant, actor, a, now);
    case 'fitness_task_resolve': return resolveFitnessTask(ctx, tenant, actor, a, now);
    case 'fitness_task_snooze': return snoozeFitnessTask(ctx, tenant, actor, a, now);
    case 'fitness_draft_approve': return draftApprove(ctx, tenant, actor, a, now);
    case 'fitness_context': await refreshGym(ctx, tenant.accountId, now); return fitnessContext(ctx, tenant, actor, a, now);
    case 'fitness_insights': return fitnessInsights(ctx, tenant, a, now);
    case 'fitness_metric_records': return fitnessMetricRecords(ctx, tenant, actor, a, now);
    default: return null;
  }
}

