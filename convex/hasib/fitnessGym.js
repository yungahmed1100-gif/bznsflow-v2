// Fitness's shared reads: every record of the gym loaded once, the member card the lists, records
// and Chats read, the tasks the records call for, and the refresh that keeps tasks and rule drafts
// current. Nothing here sends a message.
import { owned } from '../blueTenant.js';
import { ok, settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { displayName } from '../blueContacts.js';
import { reconcileTasks } from './workspace/tasks.js';
import { reconcileRuleDrafts } from './workspace/drafts.js';
import { conversationOf } from './workspace/conversation.js';

export { conversationOf };
import { fitnessSettings } from './fitnessSettings.js';
import { fitnessRuleWanted, fitnessDraftText, FITNESS_RULE_TASK_KINDS } from './fitnessRules.js';
import { DAY, effectiveEnd, memberState, inAttendanceGap, monthlyMinor } from './fitnessDomain.js';

const SCAN = 2000, ARABIC = /[؀-ۿ]/;
// Tasks the records open by themselves; each closes itself once its cause is gone.
export const FITNESS_AUTO_TASKS = new Set(['trial_request', 'trial_convert', 'payment_due', 'attendance_unrecorded', 'in_grace', ...FITNESS_RULE_TASK_KINDS]);
const RECORD_WEEK = 7 * DAY;
// Fire once per occasion: someone who closes one is not asked again for the same trial or rule firing.
const ONCE_TASKS = new Set([...FITNESS_RULE_TASK_KINDS, 'trial_convert']);

const scan = (ctx, table, accountId, index = 'by_account_created') => ctx.db.query(table).withIndex(index, q => q.eq('accountId', accountId)).order('desc').take(SCAN);
const groupBy = (rows, key) => { const m = new Map(); for (const r of rows) { const k = String(r[key]); m.set(k, [...(m.get(k) || []), r]); } return m; };

/** Every Fitness record of the account, read once and indexed for the cards, tasks and metrics. */
export async function loadGym(ctx, accountId, now) {
  const [plans, memberships, classes, seats, drafts] = [
    await ctx.db.query('fitnessPlans').withIndex('by_account', q => q.eq('accountId', accountId)).take(SCAN), await scan(ctx, 'hasibMemberships', accountId),
    await scan(ctx, 'fitnessClasses', accountId, 'by_account_start'), await scan(ctx, 'fitnessSeats', accountId), await scan(ctx, 'fitnessDrafts', accountId)];
  const planById = new Map(plans.map(p => [String(p._id), p])), classById = new Map(classes.map(c => [String(c._id), c]));
  const successorOf = new Map();
  for (const m of memberships) if (m.renewalOfId && m.status !== 'cancelled') successorOf.set(String(m.renewalOfId), m);
  const orders = new Map();
  for (const m of memberships) if (m.orderId && !orders.has(String(m.orderId))) orders.set(String(m.orderId), await owned(ctx, m.orderId, accountId, 'hasibOrders'));
  const graceOf = m => planById.get(String(m.planId))?.graceDays ?? 7;
  const stateOf = (m, at = now) => memberState(m, { renewed: successorOf.has(String(m._id)), graceDays: graceOf(m) }, at);
  return { plans, planById, memberships, membershipsOf: groupBy(memberships, 'contactId'), successorOf, classes, classById, seats, seatsOf: groupBy(seats, 'classId'),
    seatsByContact: groupBy(seats, 'contactId'), drafts, orders, stateOf, graceOf, complete: [memberships, classes, seats].every(rows => rows.length < SCAN) };
}

// The membership a member is "on": the live one first, then one awaiting payment or about to start, then the latest.
const RANK = { active: 0, frozen: 0, pending: 1, upcoming: 2, grace: 3, renewed: 4, expired: 5, cancelled: 6 };
export function currentMembership(gym, contactId) {
  const rows = gym.membershipsOf.get(String(contactId)) || [];
  return [...rows].sort((x, y) => RANK[gym.stateOf(x)] - RANK[gym.stateOf(y)] || y.startsAt - x.startsAt)[0] || null;
}

/** Confirmed seats still to come for a membership: they hold its credits. */
export const heldSeats = (gym, membershipId, now) => gym.seats.filter(s => String(s.membershipId) === String(membershipId) && s.status === 'confirmed'
  && (gym.classById.get(String(s.classId))?.startsAt ?? 0) > now).length;

/** The member's latest trial seat, with its class. */
export function latestTrial(gym, contactId) {
  const seat = (gym.seatsByContact.get(String(contactId)) || []).filter(s => s.trial).sort((x, y) => y.createdAt - x.createdAt)[0];
  return seat ? { seat, klass: gym.classById.get(String(seat.classId)) || null } : null;
}

/** One row per member: the member action list (ascend/fitness.md "Memberships: daily execution"). */
export async function describeMembers(ctx, accountId, actor, gym, contactIds, now, s) {
  const out = [];
  for (const contactId of contactIds) {
    const contact = await owned(ctx, contactId, accountId, 'blueContacts');
    if (!contact) continue;
    const m = currentMembership(gym, contactId), state = m ? gym.stateOf(m) : 'prospect', trial = latestTrial(gym, contactId);
    const end = m ? effectiveEnd(m) : null, plan = m?.planId ? gym.planById.get(String(m.planId)) : null;
    const renewed = !!m && gym.successorOf.has(String(m._id));
    const expiring = !!m && !renewed && (['active', 'frozen'].includes(state) ? end - now <= s.renewalNoticeDays * DAY : state === 'grace');
    const gap = !!m && inAttendanceGap(m, state, s, now);
    // Everyone without a membership yet (a trial request, booked or attended trial) is a trial follow-up.
    const trialFollowUp = !m;
    const order = m?.orderId ? gym.orders.get(String(m.orderId)) : null;
    out.push({ id: String(contactId), contactId: String(contactId), contactName: contact.state === 'active' ? displayName(contact).name : null, state,
      membership: m ? { id: m._id, name: m.name, planId: m.planId || null, planName: plan?.name || m.name, kind: m.kind, status: m.status, startsAt: m.startsAt, endsAt: end,
        remainingCredits: m.kind === 'lessons' ? m.remainingCredits : null, version: m.version, frozen: state === 'frozen', freezes: m.freezes || [] } : null,
      lastAttendanceAt: m?.lastAttendanceAt || null, renewalState: !m ? null : renewed ? 'renewed' : state === 'pending' ? 'awaiting_payment' : state === 'grace' ? 'grace' : expiring ? 'due' : state === 'expired' ? 'lapsed' : 'not_due',
      ownerId: m?.assignedAccountId || null,
      trial: trial ? { seatId: trial.seat._id, status: trial.seat.status, classStartsAt: trial.klass?.startsAt || null, title: trial.klass?.title || null } : null,
      flags: { trialFollowUp, attendanceGap: gap, expiring, frozen: state === 'frozen' },
      ...(actor.role === 'manager' && m ? { money: { priceMinor: m.priceMinor || 0, monthlyMinor: monthlyMinor(m), paidMinor: order?.paidMinor || 0, totalMinor: order?.totalMinor || 0,
        balanceMinor: order ? Math.max(0, order.totalMinor - order.paidMinor) : 0 } } : {}) });
  }
  return out;
}

/** Everyone the Members list shows: members, trial customers and open trial requests. */
export async function memberContactIds(ctx, accountId, gym) {
  const ids = new Set([...gym.membershipsOf.keys(), ...gym.seatsByContact.keys()]);
  const open = await ctx.db.query('fitnessTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(500);
  for (const t of open) if (t.kind === 'trial_request') ids.add(t.entityId);
  return [...ids];
}

/** The tasks the records call for right now. */
function currentTasks(gym, openRequests, now, s) {
  const wanted = [], add = (kind, entityType, id, reason, dueAt, assignedAccountId) => wanted.push({ kind, entityType, entityId: String(id), reason, dueAt, assignedAccountId });
  // A trial request stays open until the customer has a trial seat or a membership.
  for (const t of openRequests) if (!gym.seatsByContact.has(t.entityId) && !gym.membershipsOf.has(t.entityId)) add('trial_request', 'contact', t.entityId, t.reason, t.dueAt);
  for (const seat of gym.seats) {
    if (!seat.trial || seat.status !== 'attended' || !seat.attendedAt || now >= seat.attendedAt + s.conversionWindowDays * DAY) continue;
    const joined = (gym.membershipsOf.get(String(seat.contactId)) || []).some(m => m.status !== 'cancelled' && m.createdAt >= seat.attendedAt);
    if (!joined) add('trial_convert', 'seat', seat._id, 'Trial attended: offer a membership', seat.attendedAt);
  }
  for (const m of gym.memberships) {
    const state = gym.stateOf(m);
    if (state === 'pending') add('payment_due', 'membership', m._id, 'Membership waiting for payment before it starts', m.createdAt, m.assignedAccountId);
    if (state === 'grace') add('in_grace', 'membership', m._id, 'Membership ended with no renewal recorded', effectiveEnd(m), m.assignedAccountId);
  }
  for (const c of gym.classes) {
    if (c.status === 'cancelled' || c.endsAt > now || now - c.endsAt > RECORD_WEEK) continue;
    if ((gym.seatsOf.get(String(c._id)) || []).some(seat => seat.status === 'confirmed')) add('attendance_unrecorded', 'class', c._id, 'Class finished: record who attended', c.endsAt, c.coachId);
  }
  return wanted;
}

/** Writes one draft in the customer's language from recorded facts; never for an opted-out customer. */
export async function insertDraft(ctx, accountId, item, timezone, now) {
  const contact = await ctx.db.get(item.contactId), { conversation, optedOut } = await conversationOf(ctx, accountId, item.contactId);
  if (optedOut || contact?.state !== 'active') return null;
  const last = conversation ? await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversation._id).eq('direction', 'in')).order('desc').first() : null;
  const name = displayName(contact).name, plan = item.membership?.planId ? await ctx.db.get(item.membership.planId) : null;
  const text = fitnessDraftText(item, { name: name && !/^\+?\d/.test(name) ? name : '', timezone, arabic: last?.text ? ARABIC.test(last.text) : true, planName: plan?.name || item.membership?.name });
  return ctx.db.insert('fitnessDrafts', { accountId, requestId: `${item.rule ? 'rule' : 'auto'}:${item.key}`, contactId: item.contactId, ...(item.membership ? { membershipId: item.membership._id } : {}),
    ...(item.seat ? { seatId: item.seat._id } : {}), ...(conversation ? { conversationId: conversation._id } : {}), kind: item.rule?.id || item.kind, text,
    ...(item.rule ? { ruleId: item.rule.id, ruleKey: item.key } : {}), status: 'draft', version: 1, createdAt: now, updatedAt: now });
}

/** Brings tasks and rule drafts up to date with the records. Runs whenever the workspace is read. */
export async function refreshGym(ctx, accountId, now) {
  const gym = await loadGym(ctx, accountId, now), base = await settingsFor(ctx, accountId), s = fitnessSettings(base), timezone = await businessTimezone(ctx, accountId);
  const open = await ctx.db.query('fitnessTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(500);
  const wanted = currentTasks(gym, open.filter(t => t.kind === 'trial_request'), now, s);
  const rules = fitnessRuleWanted(gym, now, base);
  for (const item of rules) if (item.rule.mode === 'task') wanted.push({ kind: item.kind, entityType: item.entityType, entityId: item.entityId, reason: item.reason, dueAt: item.dueAt,
    assignedAccountId: item.membership?.assignedAccountId });
  await reconcileTasks(ctx, { table: 'fitnessTasks', accountId, wanted, autoKinds: FITNESS_AUTO_TASKS, ruleKinds: ONCE_TASKS, now });
  await reconcileRuleDrafts(ctx, { rules, drafts: gym.drafts, insert: item => insertDraft(ctx, accountId, item, timezone, now), now });
  return { gym: { ...gym, drafts: await scan(ctx, 'fitnessDrafts', accountId) }, settings: s, timezone };
}

/** Counts for the Needs attention strip. */
export async function fitnessOverview(ctx, tenant, actor, now) {
  const { gym, settings } = await refreshGym(ctx, tenant.accountId, now);
  const rows = await describeMembers(ctx, tenant.accountId, actor, gym, await memberContactIds(ctx, tenant.accountId, gym), now, settings);
  const count = flag => rows.filter(r => r.flags[flag]).length;
  const today = gym.classes.filter(c => c.status !== 'cancelled' && c.startsAt >= now - 12 * 3600000 && c.startsAt < now + DAY);
  return ok({ workspaceRole: actor.role, settings,
    members: { total: rows.filter(r => r.membership).length, active: rows.filter(r => ['active', 'frozen'].includes(r.state)).length, prospects: rows.filter(r => !r.membership).length },
    attention: { trialFollowUp: count('trialFollowUp'), attendanceGap: count('attendanceGap'), expiring: count('expiring'), frozen: count('frozen'),
      paymentsDue: actor.role === 'manager' ? rows.filter(r => r.state === 'pending').length : 0,
      attendanceUnrecorded: gym.classes.filter(c => c.status !== 'cancelled' && c.endsAt <= now && now - c.endsAt <= RECORD_WEEK && (gym.seatsOf.get(String(c._id)) || []).some(x => x.status === 'confirmed')).length,
      approvals: actor.role === 'manager' ? gym.drafts.filter(d => d.status === 'draft').length : 0 },
    classesToday: today.length, plans: gym.plans.filter(p => p.active).length });
}
