// An AC service business's shared reads: every job, visit, estimate, unit and contract loaded once,
// the job card the schedule, list, record and Chats read, the tasks the records call for, and the
// refresh that keeps tasks and rule drafts current. Nothing here sends a message.
import { owned } from '../blueTenant.js';
import { settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { displayName } from '../blueContacts.js';
import { reconcileTasks } from './workspace/tasks.js';
import { conversationOf } from './workspace/conversation.js';
import { reconcileRuleDrafts } from './workspace/drafts.js';
import { workspaceForManager } from './workspaceState.js';
import { formatLocal } from '../../src/lib/timezone.js';
import { hvacSettings } from './hvacSettings.js';
import { hvacRuleWanted, hvacDraftText, HVAC_RULE_TASK_KINDS } from './hvacRules.js';
import {
  DAY,
  ACTIVE_VISIT,
  OPEN_JOB,
  balanceOf,
  paymentStatus,
  latestSent,
  latestOf,
  estimateExpired,
  contractVisitDates,
  arrivalUnrecorded,
  scopeApproved,
} from './hvacDomain.js';

export const SCAN = 2000;
const ARABIC = /[؀-ۿ]/;
// Tasks the records open by themselves; each closes itself once its cause is gone.
export const HVAC_AUTO_TASKS = new Set([
  'triage_request',
  'schedule_job',
  'arrival_unrecorded',
  ...HVAC_RULE_TASK_KINDS,
]);
// Money and decision tasks: only a manager sees and acts on them.
export const MANAGER_TASKS = new Set(['template_required', 'rule_balance_due', 'rule_amc_renewal']);
// Fire once per occasion: someone who closes one is not asked again for the same firing.
const ONCE_TASKS = new Set([...HVAC_RULE_TASK_KINDS]);

const groupBy = (rows, key) => {
  const m = new Map();
  for (const r of rows) {
    const k = String(r[key]);
    m.set(k, [...(m.get(k) || []), r]);
  }
  return m;
};

/** Every record of the business, read once, with the lookups the rules, cards and Insights share. */
export async function loadShop(ctx, accountId, now) {
  const read = (table, index = 'by_account_created') =>
    ctx.db
      .query(table)
      .withIndex(index, q => q.eq('accountId', accountId))
      .order('desc')
      .take(SCAN);
  const [jobs, units, contracts, estimates, drafts] = await Promise.all([
    read('hvacJobs'),
    read('hvacUnits'),
    read('hvacContracts'),
    read('hvacEstimates'),
    read('hvacDrafts'),
  ]);
  const visits = await ctx.db
    .query('hvacVisits')
    .withIndex('by_account_start', q => q.eq('accountId', accountId))
    .order('desc')
    .take(SCAN);
  const base = await settingsFor(ctx, accountId),
    settings = hvacSettings(base);
  const orders = new Map();
  for (const id of [...jobs.map(j => j.orderId), ...contracts.map(c => c.orderId)])
    if (id && !orders.has(String(id))) orders.set(String(id), await owned(ctx, id, accountId, 'hasibOrders'));
  const jobById = new Map(jobs.map(j => [String(j._id), j])),
    contractById = new Map(contracts.map(c => [String(c._id), c])),
    unitById = new Map(units.map(u => [String(u._id), u]));
  const visitsOfJob = groupBy(visits, 'jobId'),
    estimatesOfJob = groupBy(estimates, 'jobId');
  // The customer's last message, for the contacts an estimate waits on (a reply stops the follow-up).
  const lastInbound = new Map();
  for (const contactId of new Set(jobs.filter(j => j.status === 'estimate_pending').map(j => String(j.contactId)))) {
    const { conversation } = await conversationOf(ctx, accountId, contactId);
    lastInbound.set(contactId, conversation?.lastInbound || 0);
  }
  return {
    jobs,
    units,
    contracts,
    estimates,
    drafts,
    visits,
    orders,
    settings,
    base,
    jobById,
    contractById,
    unitById,
    visitsOfJob,
    orderOf: id => (id ? orders.get(String(id)) || null : null),
    estimatesOf: id => estimatesOfJob.get(String(id)) || [],
    visitsOf: id => visitsOfJob.get(String(id)) || [],
    activeVisitOf: id =>
      (visitsOfJob.get(String(id)) || [])
        .filter(v => ACTIVE_VISIT.has(v.status))
        .sort((x, y) => x.startsAt - y.startsAt)[0] || null,
    jobsOfContact: id => jobs.filter(j => String(j.contactId) === String(id)),
    repliedSince: (contactId, t) => (lastInbound.get(String(contactId)) || 0) > t,
    // A unit counts as serviced once any job for it was opened after the technician set its date.
    servicedSince: u =>
      jobs.some(
        j =>
          j.status !== 'cancelled' &&
          j.unitIds.some(id => String(id) === String(u._id)) &&
          j.createdAt >= (u.nextServiceSetAt || 0),
      ),
    contractVisitDue: job => {
      const c = job.contractId ? contractById.get(String(job.contractId)) : null;
      return c && job.contractVisitIndex !== undefined ? (contractVisitDates(c)[job.contractVisitIndex] ?? null) : null;
    },
    complete: jobs.length < SCAN && visits.length < SCAN,
  };
}

/** The technicians the schedule shows: the manager and every active team member. */
export async function technicians(ctx, accountId, now) {
  const workspace = await workspaceForManager(ctx, accountId, now),
    manager = await ctx.db.get(accountId);
  const members = (
    await ctx.db
      .query('ascendWorkspaceMembers')
      .withIndex('by_workspace', q => q.eq('workspaceId', workspace._id))
      .take(20)
  ).filter(m => m.status === 'active' && m.accountId);
  const label = email => String(email || '').split('@')[0];
  return [
    { accountId: String(accountId), name: label(manager?.email) || 'Manager', role: 'manager' },
    ...members.map(m => ({
      accountId: String(m.accountId),
      name: label(m.email),
      role: m.operationalRole || 'service_advisor',
    })),
  ];
}

/** The next step a job is waiting for, from its current facts. */
export function nextAction(job, shop, now, manager) {
  const visit = shop.activeVisitOf(job._id),
    estimates = shop.estimatesOf(job._id);
  switch (job.status) {
    case 'requested':
      return 'triage';
    case 'triaged':
      return 'estimate_or_schedule';
    case 'estimate_pending':
      return latestOf(estimates)?.status === 'draft' ? 'issue_estimate' : 'await_customer';
    case 'approved':
      return visit?.status === 'arrived' ? 'start_work' : visit ? 'visit_booked' : 'schedule';
    case 'scheduled':
      return visit && arrivalUnrecorded(visit, now) ? 'record_arrival' : 'visit_booked';
    case 'on_site':
      return scopeApproved(job, estimates) ? 'start_work' : 'record_findings';
    case 'repairing':
      return 'test';
    case 'waiting_parts':
      return visit ? 'visit_booked' : 'parts';
    case 'on_hold':
      return 'resume';
    case 'tested':
      return 'complete';
    case 'completed':
      return manager && balanceOf(shop.orderOf(job.orderId)) > 0 ? 'collect_balance' : null;
    default:
      return null;
  }
}

/** One card per job, the shape the schedule, list, record and drill-downs share. */
export async function describeJobs(
  ctx,
  accountId,
  actor,
  shop,
  jobs,
  now,
  { tz, dueTasks = new Set(), names = new Map(), team = [] } = {},
) {
  const manager = actor.role === 'manager',
    out = [],
    today = tz ? formatLocal(now, tz).slice(0, 10) : null;
  const nameOf = async id => {
    if (!names.has(String(id))) {
      const c = await owned(ctx, id, accountId, 'blueContacts');
      names.set(String(id), c?.state === 'active' ? displayName(c).name : null);
    }
    return names.get(String(id));
  };
  for (const job of jobs) {
    const visit = shop.activeVisitOf(job._id),
      sent = latestSent(shop.estimatesOf(job._id)),
      order = shop.orderOf(job.orderId);
    const units = job.unitIds.map(id => shop.unitById.get(String(id))).filter(Boolean);
    const tech = team.find(t => t.accountId === String(visit?.technicianAccountId || job.technicianAccountId));
    out.push({
      id: job._id,
      number: job.number,
      contactId: String(job.contactId),
      contactName: await nameOf(job.contactId),
      status: job.status,
      jobType: job.jobType,
      source: job.source,
      urgent: job.urgent,
      reportedSymptom: job.reportedSymptom || null,
      area: job.area || null,
      outOfArea: !!job.outOfArea,
      version: job.version,
      units: units.map(u => ({ id: u._id, label: u.label, unitType: u.unitType })),
      contractId: job.contractId || null,
      contractVisitIndex: job.contractVisitIndex ?? null,
      repeatOfId: job.repeatOfId || null,
      technicianAccountId: visit?.technicianAccountId || job.technicianAccountId || null,
      technicianName: tech?.name || null,
      visit: visit
        ? {
            id: visit._id,
            startsAt: visit.startsAt,
            endsAt: visit.endsAt,
            status: visit.status,
            version: visit.version,
            unrecorded: arrivalUnrecorded(visit, now),
          }
        : null,
      partsLabel: job.partsLabel || null,
      partsExpectedAt: job.partsExpectedAt || null,
      requestedAt: job.requestedAt,
      completedAt: job.completedAt || null,
      estimate: sent
        ? {
            number: sent.estimateNumber,
            status: estimateExpired(sent, now) ? 'expired' : sent.status,
            ...(manager ? { totalMinor: sent.totalMinor } : {}),
          }
        : null,
      nextAction: nextAction(job, shop, now, manager),
      flags: {
        today: !!visit && !!tz && formatLocal(visit.startsAt, tz).slice(0, 10) === today,
        unassigned: OPEN_JOB.has(job.status) && !visit && ['triaged', 'approved'].includes(job.status),
        partsNeeded: job.status === 'waiting_parts',
        serviceDue: job.source === 'contract' && job.status === 'approved',
        followupDue: dueTasks.has(String(job._id)) || dueTasks.has(String(job.contactId)),
      },
      ...(manager
        ? {
            money: {
              orderId: job.orderId || null,
              totalMinor: order?.totalMinor || 0,
              paidMinor: order?.paidMinor || 0,
              balanceMinor: balanceOf(order),
              paymentStatus: paymentStatus(order),
            },
          }
        : {}),
    });
  }
  return out;
}

/** The tasks the records call for right now. */
function currentTasks(shop, now) {
  const wanted = [],
    add = (kind, entityType, id, reason, dueAt, assignedAccountId) =>
      wanted.push({
        kind,
        entityType,
        entityId: String(id),
        reason,
        dueAt,
        ...(assignedAccountId ? { assignedAccountId } : {}),
      });
  for (const job of shop.jobs) {
    if (job.status === 'requested')
      add(
        'triage_request',
        'job',
        job._id,
        job.source === 'layla' ? 'Request from Layla: check the details and triage it' : 'New request: triage it',
        job.requestedAt,
      );
    // Approved with no visit booked (a contract visit included): someone has to give it a time.
    if (job.status === 'approved' && !shop.activeVisitOf(job._id))
      add(
        'schedule_job',
        'job',
        job._id,
        job.source === 'contract' ? 'Contract visit due: book a time' : 'Estimate approved: book the visit',
        job.updatedAt,
      );
  }
  for (const v of shop.visits)
    if (arrivalUnrecorded(v, now) && now - v.endsAt <= 7 * DAY && shop.jobById.has(String(v.jobId)))
      add(
        'arrival_unrecorded',
        'visit',
        v._id,
        'Visit window has passed: record whether the technician arrived',
        v.endsAt,
        v.technicianAccountId,
      );
  return wanted;
}

/** Writes one draft in the recipient's language from recorded facts; never for an opted-out contact. */
export async function insertDraft(ctx, accountId, item, { timezone, currency }, now) {
  const contact = await ctx.db.get(item.contactId),
    { conversation, optedOut } = await conversationOf(ctx, accountId, item.contactId);
  if (optedOut || contact?.state !== 'active') return null;
  const last = conversation
    ? await ctx.db
        .query('blueMessages')
        .withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversation._id).eq('direction', 'in'))
        .order('desc')
        .first()
    : null;
  const shown = displayName(contact).name;
  const text = hvacDraftText(item, {
    name: shown && !/^\+?\d/.test(shown) ? shown : '',
    timezone,
    currency,
    arabic: last?.text ? ARABIC.test(last.text) : true,
  });
  return ctx.db.insert('hvacDrafts', {
    accountId,
    requestId: `rule:${item.key}`,
    contactId: item.contactId,
    ...(item.job ? { jobId: item.job._id } : {}),
    ...(item.contract ? { contractId: item.contract._id } : {}),
    ...(item.unit ? { unitId: item.unit._id } : {}),
    ...(conversation ? { conversationId: conversation._id } : {}),
    kind: item.rule.id,
    text,
    ruleId: item.rule.id,
    ruleKey: item.key,
    status: 'draft',
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
}

/** Brings tasks and rule drafts up to date with the records. Runs when the workspace is read and on Hasib's schedule. */
export async function refreshShop(ctx, accountId, now) {
  const shop = await loadShop(ctx, accountId, now),
    timezone = await businessTimezone(ctx, accountId);
  const wanted = currentTasks(shop, now),
    rules = hvacRuleWanted(shop, now, shop.base);
  for (const item of rules)
    if (item.rule.mode === 'task')
      wanted.push({
        kind: item.kind,
        entityType: item.entityType,
        entityId: item.entityId,
        reason: item.reason,
        dueAt: item.dueAt,
        ...(item.visit?.technicianAccountId ? { assignedAccountId: item.visit.technicianAccountId } : {}),
      });
  await reconcileTasks(ctx, {
    table: 'hvacTasks',
    accountId,
    wanted,
    autoKinds: HVAC_AUTO_TASKS,
    ruleKinds: ONCE_TASKS,
    now,
  });
  await reconcileRuleDrafts(ctx, {
    rules,
    drafts: shop.drafts,
    insert: item => insertDraft(ctx, accountId, item, { timezone, currency: shop.base.currency }, now),
    now,
  });
  const drafts = await ctx.db
    .query('hvacDrafts')
    .withIndex('by_account_created', q => q.eq('accountId', accountId))
    .order('desc')
    .take(SCAN);
  return { shop: { ...shop, drafts }, settings: shop.settings, timezone };
}

/** Open tasks due now, by the job or customer they belong to (the "Follow-up due" filter). */
export async function dueTaskKeys(ctx, accountId, actor, now) {
  const open = await ctx.db
    .query('hvacTasks')
    .withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open'))
    .take(500);
  return new Set(
    open
      .filter(
        t =>
          (t.snoozedUntil || t.dueAt || t.createdAt) <= now && (actor.role === 'manager' || !MANAGER_TASKS.has(t.kind)),
      )
      .map(t => t.entityId),
  );
}

/** Counts for the Needs attention strip. A technician sees only their own visits and jobs. */
export function hvacAttention(shop, actor, now) {
  const manager = actor.role === 'manager',
    mine = j =>
      actor.operationalRole !== 'technician' || String(j.technicianAccountId) === String(actor.actorAccountId);
  const jobs = shop.jobs.filter(mine),
    open = jobs.filter(j => OPEN_JOB.has(j.status));
  const renewalsDue = shop.contracts.filter(
    c =>
      c.status === 'active' &&
      !c.renewedToId &&
      c.endsAt - now <= shop.settings.renewalHorizonDays * DAY &&
      c.endsAt + shop.settings.renewalGraceDays * DAY > now,
  ).length;
  return {
    requests: open.filter(j => j.status === 'requested').length,
    unscheduled: open.filter(j => j.status === 'approved' && !shop.activeVisitOf(j._id)).length,
    pastWindow: shop.visits.filter(v => arrivalUnrecorded(v, now) && jobs.some(j => String(j._id) === String(v.jobId)))
      .length,
    partsWaiting: open.filter(j => j.status === 'waiting_parts').length,
    estimatesOut: open.filter(j => j.status === 'estimate_pending').length,
    outOfArea: open.filter(j => j.outOfArea && j.status === 'requested').length,
    approvals: manager ? shop.drafts.filter(d => d.status === 'draft').length : 0,
    renewalsDue: manager ? renewalsDue : 0,
    balancesOverdue: manager
      ? [
          ...jobs.filter(
            j => j.status === 'completed' && j.completedAt + 7 * DAY <= now && balanceOf(shop.orderOf(j.orderId)) > 0,
          ),
          ...shop.contracts.filter(
            c =>
              c.status === 'active' &&
              c.acceptedAt &&
              c.acceptedAt + 7 * DAY <= now &&
              balanceOf(shop.orderOf(c.orderId)) > 0,
          ),
        ].length
      : 0,
  };
}
