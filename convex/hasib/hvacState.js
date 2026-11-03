// Air-conditioning service businesses (ascend/hvac.md). Staff record facts: a request, a triage, a
// visit window, an arrival, findings and checks, an estimate and the customer's yes, tested and
// completed, a unit's next service date and a maintenance contract. Hasib does the rest when the
// workspace is read and on his schedule: tasks open and close themselves, rule drafts are written and
// sent or held, contract visits become jobs, and Insights recalculates. Charges and payments stay on
// hasibOrders. A technician sees only their own jobs and visits, and never a price.
import { owned } from '../blueTenant.js';
import { ok, fail, bounded } from './shared.js';
import { formatLocal } from '../../src/lib/timezone.js';
import { publicRow } from './workspace/rows.js';
import { approveDraft, draftRefusal } from './workspace/drafts.js';
import { conversationOf } from './workspace/conversation.js';
import { ensureAutomation } from './workspace/schedule.js';
import { isAutomation, automationRefusal } from './workspace/automation.js';
import { refreshShop, loadShop, describeJobs, dueTaskKeys, technicians, hvacAttention } from './hvacBoard.js';
import { hvacFollowupQueue, resolveHvacTask, snoozeHvacTask, hvacContext } from './hvacFollowups.js';
import { hvacInsights, hvacMetricRecords } from './hvacInsights.js';
import { contractBook } from './hvacMetrics.js';
import { jobSave, jobStatus, visitSave, visitStatus, estimateSave, estimateStatus, approvalRecord, checklistSave, costSave, paymentRecord } from './hvacJobs.js';
import { unitSave, unitService, contractSave, contractStatus, contractRenew } from './hvacAssets.js';
import { DAY, OPEN_JOB, contractVisitDates, balanceOf, paymentStatus, isTechnician, assignedTo, estimateExpired } from './hvacDomain.js';

const MANAGER_ONLY = new Set(['hvac_insights', 'hvac_metric_records', 'hvac_draft_approve', 'hvac_contract_save', 'hvac_contract_status', 'hvac_contract_renew', 'hvac_cost_save',
  'hvac_payment_record', 'hvac_estimate_status']);
// A technician works their own visits: arrival, findings and checks, parts, tested, a unit's next service date.
const TECHNICIAN_OPS = new Set(['hvac_overview', 'hvac_schedule', 'hvac_jobs', 'hvac_job', 'hvac_units', 'hvac_followups', 'hvac_context', 'hvac_job_status', 'hvac_visit_status',
  'hvac_checklist_save', 'hvac_unit_service', 'hvac_task_resolve', 'hvac_task_snooze']);
// What Layla, Hasib or Adiba may do by themselves: read, take in a request, issue an estimate the owner (or the
// catalog) priced, record the customer's yes to it, and activate a renewal the customer accepted. Never
// payments, cancellations, visits, checks, costs or a job's stages.
export const HVAC_AUTOMATION_ALLOWED = new Set(['hvac_overview', 'hvac_jobs', 'hvac_job', 'hvac_followups', 'hvac_context', 'hvac_job_save', 'hvac_estimate_save', 'hvac_estimate_status',
  'hvac_approval_record', 'hvac_contract_save', 'hvac_contract_status']);
export const JOB_FILTERS = ['today', 'unassigned', 'partsNeeded', 'serviceDue', 'followupDue'];
const time = value => Number.isSafeInteger(value) && value > 0 ? value : null;

/** A contract's status as the owner reads it: an active one past its end and grace has expired. */
const contractShown = (c, s, now) => c.status === 'active' && c.endsAt + s.renewalGraceDays * DAY <= now ? 'expired' : c.status;

async function overview(ctx, tenant, actor, now) {
  const { shop, settings, timezone } = await refreshShop(ctx, tenant.accountId, now);
  await ensureAutomation(ctx, tenant.accountId, 'hvac', true, now);
  const queue = await hvacFollowupQueue(ctx, tenant, actor, {}, now, shop), team = await technicians(ctx, tenant.accountId, now);
  const today = formatLocal(now, timezone).slice(0, 10), mine = v => !isTechnician(actor) || String(v.technicianAccountId) === String(actor.actorAccountId);
  const todays = shop.visits.filter(v => mine(v) && v.status !== 'cancelled' && formatLocal(v.startsAt, timezone).slice(0, 10) === today);
  const items = await ctx.db.query('hasibItems').withIndex('by_account_archived_updated', q => q.eq('accountId', tenant.accountId).eq('archived', false)).take(500);
  return ok({ workspaceRole: actor.role, operationalRole: actor.operationalRole || (actor.role === 'manager' ? 'manager' : 'service_advisor'), settings, timezone, today: { date: today, visits: todays.length,
    arrived: todays.filter(v => v.status === 'arrived').length, openJobs: shop.jobs.filter(j => OPEN_JOB.has(j.status) && assignedTo(actor, j)).length },
    attention: hvacAttention(shop, actor, now), followups: { counts: queue.value.counts, actionable: queue.value.actionable },
    ...(isTechnician(actor) ? {} : { contracts: contractBook(shop, settings, now) }),
    setup: { technicians: team.length, services: items.filter(i => i.kind === 'service').length, units: shop.units.filter(u => !u.retiredAt).length } });
}

/** The dispatch board: every visit in the range with its job, the technicians as columns, and the jobs still waiting for a time. */
async function schedule(ctx, tenant, actor, a, now) {
  const fromAt = time(a.fromAt), toAt = time(a.toAt);
  if (!fromAt || !toAt || toAt <= fromAt || toAt - fromAt > 14 * DAY) return fail('invalid_range');
  const { shop, timezone } = await refreshShop(ctx, tenant.accountId, now), team = await technicians(ctx, tenant.accountId, now);
  const tech = isTechnician(actor), mine = v => !tech || String(v.technicianAccountId) === String(actor.actorAccountId);
  const visits = shop.visits.filter(v => v.startsAt >= fromAt && v.startsAt < toAt && v.status !== 'cancelled' && mine(v)).sort((x, y) => x.startsAt - y.startsAt);
  const dueTasks = await dueTaskKeys(ctx, tenant.accountId, actor, now), names = new Map();
  const jobs = [...new Set(visits.map(v => String(v.jobId)))].map(id => shop.jobById.get(id)).filter(Boolean);
  const cards = await describeJobs(ctx, tenant.accountId, actor, shop, jobs, now, { tz: timezone, dueTasks, names, team });
  const waiting = tech ? [] : shop.jobs.filter(j => ['triaged', 'approved', 'waiting_parts'].includes(j.status) && !shop.activeVisitOf(j._id)).sort((x, y) => Number(y.urgent) - Number(x.urgent) || x.requestedAt - y.requestedAt);
  return ok({ fromAt, toAt, technicians: tech ? team.filter(t => t.accountId === String(actor.actorAccountId)) : team,
    visits: visits.map(v => ({ id: v._id, jobId: v.jobId, technicianAccountId: String(v.technicianAccountId), startsAt: v.startsAt, endsAt: v.endsAt, status: v.status, version: v.version,
      arrivedAt: v.arrivedAt || null, outcome: v.outcome || null, job: cards.find(c => String(c.id) === String(v.jobId)) })),
    unscheduled: await describeJobs(ctx, tenant.accountId, actor, shop, waiting.slice(0, 100), now, { tz: timezone, dueTasks, names, team }) });
}

/** Jobs by quick filter or status, newest first; a technician sees only theirs. */
async function jobs(ctx, tenant, actor, a, now) {
  const { shop, timezone } = await refreshShop(ctx, tenant.accountId, now), team = await technicians(ctx, tenant.accountId, now);
  const filter = JOB_FILTERS.includes(a.filter) ? a.filter : null, search = bounded(a.search || '', 40)?.toLowerCase() || '';
  let rows = shop.jobs.filter(j => assignedTo(actor, j) && (!a.contactId || String(j.contactId) === String(a.contactId)) && (!a.status ? j.status !== 'cancelled' : a.status === 'open' ? OPEN_JOB.has(j.status) : j.status === a.status));
  if (/^#?\d+$/.test(search)) rows = rows.filter(j => String(j.number) === search.replace('#', ''));
  const cards = await describeJobs(ctx, tenant.accountId, actor, shop, rows.slice(0, 800), now, { tz: timezone, team, dueTasks: await dueTaskKeys(ctx, tenant.accountId, actor, now) });
  const named = search && !/^#?\d+$/.test(search) ? cards.filter(c => (c.contactName || '').toLowerCase().includes(search) || c.units.some(u => u.label.toLowerCase().includes(search))) : cards;
  const chosen = filter ? named.filter(c => c.flags[filter]) : named;
  return ok({ items: chosen.sort((x, y) => Number(y.urgent && OPEN_JOB.has(y.status)) - Number(x.urgent && OPEN_JOB.has(x.status)) || y.requestedAt - x.requestedAt).slice(0, 500), complete: shop.complete });
}

/** One job's record: the job, its units with their history, estimate versions, visits, checks, money (managers), drafts and activity. */
async function job(ctx, tenant, actor, a, now) {
  const { shop, timezone } = await refreshShop(ctx, tenant.accountId, now);
  const j = shop.jobById.get(String(a.jobId)) || await owned(ctx, a.jobId, tenant.accountId, 'hvacJobs');
  if (!j || !assignedTo(actor, j)) return fail('job_not_found');
  const team = await technicians(ctx, tenant.accountId, now), manager = actor.role === 'manager', tech = isTechnician(actor);
  const [card] = await describeJobs(ctx, tenant.accountId, actor, shop, [j], now, { tz: timezone, team, dueTasks: await dueTaskKeys(ctx, tenant.accountId, actor, now) });
  const units = j.unitIds.map(id => shop.unitById.get(String(id))).filter(Boolean).map(u => ({ id: u._id, label: u.label, unitType: u.unitType, brand: u.brand || null, capacityBtu: u.capacityBtu || null,
    area: u.area || null, version: u.version, nextServiceAt: u.nextServiceAt || null, contractId: u.contractId || null,
    jobs: shop.jobs.filter(o => o._id !== j._id && o.unitIds.some(id => String(id) === String(u._id))).sort((x, y) => y.createdAt - x.createdAt).slice(0, 10)
      .map(o => ({ id: o._id, number: o.number, jobType: o.jobType, status: o.status, completedAt: o.completedAt || null })) }));
  const estimates = tech ? [] : shop.estimatesOf(j._id).sort((x, y) => y.estimateNumber - x.estimateNumber).map(e => ({ id: e._id, number: e.estimateNumber, status: estimateExpired(e, now) ? 'expired' : e.status,
    version: e.version, lines: e.lines, totalMinor: e.totalMinor, issuedAt: e.issuedAt || null, validUntil: e.validUntil || null, approvedAt: e.approvedAt || null, approvedBy: e.approvedBy || null, evidenceSource: e.evidenceSource || null }));
  const visits = shop.visitsOf(j._id).sort((x, y) => y.startsAt - x.startsAt).map(v => ({ id: v._id, startsAt: v.startsAt, endsAt: v.endsAt, status: v.status, version: v.version, technicianAccountId: String(v.technicianAccountId),
    technicianName: team.find(t => t.accountId === String(v.technicianAccountId))?.name || null, arrivedAt: v.arrivedAt || null, doneAt: v.doneAt || null, outcome: v.outcome || null }));
  let money = null;
  if (manager) {
    const order = shop.orderOf(j.orderId), payments = j.orderId ? (await ctx.db.query('hasibPayments').withIndex('by_order_at', q => q.eq('orderId', j.orderId)).take(50)).map(p => ({ id: p._id, amountMinor: p.amountMinor, method: p.method, at: p.at })) : [];
    money = { orderId: j.orderId || null, totalMinor: order?.totalMinor || 0, paidMinor: order?.paidMinor || 0, balanceMinor: balanceOf(order), paymentStatus: paymentStatus(order), payments, costs: j.costs, costsComplete: !!j.costsComplete };
  }
  const { conversation } = tech ? { conversation: null } : await conversationOf(ctx, tenant.accountId, j.contactId);
  const contract = j.contractId ? shop.contractById.get(String(j.contractId)) : null;
  return ok({ ...card, findings: j.findings || null, checklist: j.checklist, holdFrom: j.holdFrom || null, cancelReason: j.cancelReason || null, testedAt: j.testedAt || null,
    approvedEstimateNumber: j.approvedEstimateNumber ?? null, conversationId: conversation?._id || null, units, estimates, visits, money,
    contract: contract ? { id: contract._id, reference: contract.reference, visitsPerYear: contract.visitsPerYear, dueAt: shop.contractVisitDue(j) } : null,
    drafts: manager ? shop.drafts.filter(d => String(d.jobId) === String(j._id)).map(publicRow) : [],
    activity: [...(j.history || [])].sort((x, y) => y.at - x.at).map(h => ({ at: h.at, kind: h.kind, detail: h.detail || null })) });
}

/** Units with their customer, contract and next service date. */
async function units(ctx, tenant, actor, a, now) {
  const shop = await loadShop(ctx, tenant.accountId, now), names = new Map();
  const nameOf = async id => { if (!names.has(String(id))) { const c = await owned(ctx, id, tenant.accountId, 'blueContacts'); names.set(String(id), c?.state === 'active' ? c.ownerName || c.customerName || c.profileName || null : null); } return names.get(String(id)); };
  const rows = shop.units.filter(u => (!a.contactId || String(u.contactId) === String(a.contactId)) && (a.status === 'retired' ? u.retiredAt : !u.retiredAt)).slice(0, 500), items = [];
  for (const u of rows) {
    const contract = u.contractId ? shop.contractById.get(String(u.contractId)) : null, last = shop.jobs.filter(j => j.status === 'completed' && j.unitIds.some(id => String(id) === String(u._id))).sort((x, y) => y.completedAt - x.completedAt)[0];
    items.push({ ...publicRow(u), contactName: await nameOf(u.contactId), contractReference: contract?.status === 'active' ? contract.reference : null,
      serviceDue: !!u.nextServiceAt && u.nextServiceAt <= now && !shop.servicedSince(u), lastServiceAt: last?.completedAt || null, repeatFaults: shop.jobs.filter(j => j.repeatOfId && j.unitIds.some(id => String(id) === String(u._id))).length });
  }
  return ok({ items: items.sort((x, y) => Number(y.serviceDue) - Number(x.serviceDue) || (x.nextServiceAt || Infinity) - (y.nextServiceAt || Infinity)) });
}

/** A contract's visits: each due date with the job Hasib opened for it, if any. */
const contractVisits = (shop, c) => contractVisitDates(c).map((dueAt, index) => {
  const j = shop.jobs.find(x => String(x.contractId) === String(c._id) && x.contractVisitIndex === index);
  return { index, dueAt, jobId: j?._id || null, jobNumber: j?.number ?? null, jobStatus: j?.status || null, completedAt: j?.completedAt || null };
});

function contractCard(shop, c, s, now, name) {
  const order = shop.orderOf(c.orderId), visits = contractVisits(shop, c);
  return { id: c._id, reference: c.reference, contactId: String(c.contactId), contactName: name, status: contractShown(c, s, now), storedStatus: c.status, version: c.version,
    unitIds: c.unitIds, units: c.unitIds.map(id => shop.unitById.get(String(id))).filter(Boolean).map(u => ({ id: u._id, label: u.label, unitType: u.unitType })),
    visitsPerYear: c.visitsPerYear, startsAt: c.startsAt, endsAt: c.endsAt, priceMinor: c.priceMinor, paymentStatus: paymentStatus(order), balanceMinor: balanceOf(order),
    visitsDone: visits.filter(v => v.jobStatus === 'completed').length, nextVisit: visits.find(v => v.jobStatus !== 'completed' && v.jobStatus !== 'cancelled') || null,
    renewalDue: c.status === 'active' && !c.renewedToId && c.endsAt - now <= s.renewalHorizonDays * DAY,
    renewedFromId: c.renewedFromId || null, renewedToId: c.renewedToId || null,
    renewalDraftId: shop.contracts.find(r => String(r.renewedFromId) === String(c._id) && r.status === 'draft')?._id || null };
}

async function contracts(ctx, tenant, actor, a, now) {
  const shop = await loadShop(ctx, tenant.accountId, now), items = [];
  for (const c of shop.contracts.filter(x => (!a.contactId || String(x.contactId) === String(a.contactId)) && (!a.status || contractShown(x, shop.settings, now) === a.status)).slice(0, 500)) {
    const contact = await owned(ctx, c.contactId, tenant.accountId, 'blueContacts');
    items.push(contractCard(shop, c, shop.settings, now, contact?.state === 'active' ? contact.ownerName || contact.customerName || contact.profileName || null : null));
  }
  const order = { draft: 0, active: 1, expired: 2, renewed: 3, cancelled: 4 };
  return ok({ items: items.sort((x, y) => order[x.status] - order[y.status] || Number(y.renewalDue) - Number(x.renewalDue) || x.endsAt - y.endsAt), book: contractBook(shop, shop.settings, now) });
}

async function contract(ctx, tenant, actor, a, now) {
  const shop = await loadShop(ctx, tenant.accountId, now), c = shop.contractById.get(String(a.contractId)) || await owned(ctx, a.contractId, tenant.accountId, 'hvacContracts');
  if (!c) return fail('contract_not_found');
  const contact = await owned(ctx, c.contactId, tenant.accountId, 'blueContacts');
  const payments = c.orderId ? (await ctx.db.query('hasibPayments').withIndex('by_order_at', q => q.eq('orderId', c.orderId)).take(50)).map(p => ({ id: p._id, amountMinor: p.amountMinor, method: p.method, at: p.at })) : [];
  const { conversation } = await conversationOf(ctx, tenant.accountId, c.contactId);
  return ok({ ...contractCard(shop, c, shop.settings, now, contact?.state === 'active' ? contact.ownerName || contact.customerName || contact.profileName || null : null),
    visits: contractVisits(shop, c), payments, conversationId: conversation?._id || null, acceptedAt: c.acceptedAt || null, acceptanceEvidence: c.acceptanceEvidence || null,
    drafts: shop.drafts.filter(d => String(d.contractId) === String(c._id)).map(publicRow), activity: [...(c.history || [])].sort((x, y) => y.at - x.at) });
}

async function draftApprove(ctx, tenant, actor, a, now) {
  const row = await owned(ctx, a.draftId, tenant.accountId, 'hvacDrafts'), refusal = draftRefusal(row, a);
  if (refusal) return fail(refusal);
  const text = a.hvac?.text !== undefined ? bounded(a.hvac.text, 4000) : row.text;
  if (!text) return fail('invalid_draft');
  const saved = await approveDraft(ctx, tenant, actor, { row, edit: { text, ...(a.hvac?.templateId ? { templateId: bounded(a.hvac.templateId, 80) } : {}) },
    keyPrefix: 'hvac-draft', handoffReason: 'job_follow_up', taskTable: 'hvacTasks',
    links: async d => ({ messageLinks: { hvacDraftId: d._id }, recipientLinks: { hvacDraftId: d._id }, contactId: d.contactId }) }, now);
  return ok(publicRow(saved));
}

export async function executeHvac(ctx, tenant, actor, a, now) {
  if (!a.operation?.startsWith('hvac_')) return null;
  if (isAutomation(actor)) { const refusal = automationRefusal(actor, a.operation, HVAC_AUTOMATION_ALLOWED); if (refusal) return fail(refusal); }
  else {
    if (MANAGER_ONLY.has(a.operation) && actor.role !== 'manager') return fail('manager_required');
    if (isTechnician(actor) && !TECHNICIAN_OPS.has(a.operation)) return fail('manager_required');
  }
  switch (a.operation) {
    case 'hvac_overview': return overview(ctx, tenant, actor, now);
    case 'hvac_schedule': return schedule(ctx, tenant, actor, a, now);
    case 'hvac_jobs': return jobs(ctx, tenant, actor, a, now);
    case 'hvac_job': return job(ctx, tenant, actor, a, now);
    case 'hvac_units': return units(ctx, tenant, actor, a, now);
    case 'hvac_contracts': return contracts(ctx, tenant, actor, a, now);
    case 'hvac_contract': return contract(ctx, tenant, actor, a, now);
    case 'hvac_job_save': return jobSave(ctx, tenant, actor, a, now);
    case 'hvac_job_status': return jobStatus(ctx, tenant, actor, a, now);
    case 'hvac_visit_save': return visitSave(ctx, tenant, actor, a, now);
    case 'hvac_visit_status': return visitStatus(ctx, tenant, actor, a, now);
    case 'hvac_estimate_save': return estimateSave(ctx, tenant, actor, a, now);
    case 'hvac_estimate_status': return estimateStatus(ctx, tenant, actor, a, now);
    case 'hvac_approval_record': return approvalRecord(ctx, tenant, actor, a, now);
    case 'hvac_checklist_save': return checklistSave(ctx, tenant, actor, a, now);
    case 'hvac_cost_save': return costSave(ctx, tenant, actor, a, now);
    case 'hvac_payment_record': return paymentRecord(ctx, tenant, actor, a, now);
    case 'hvac_unit_save': return unitSave(ctx, tenant, actor, a, now);
    case 'hvac_unit_service': return unitService(ctx, tenant, actor, a, now);
    case 'hvac_contract_save': return contractSave(ctx, tenant, actor, a, now);
    case 'hvac_contract_status': return contractStatus(ctx, tenant, actor, a, now);
    case 'hvac_contract_renew': return contractRenew(ctx, tenant, actor, a, now);
    case 'hvac_followups': await refreshShop(ctx, tenant.accountId, now); return hvacFollowupQueue(ctx, tenant, actor, a, now);
    case 'hvac_task_resolve': return resolveHvacTask(ctx, tenant, actor, a, now);
    case 'hvac_task_snooze': return snoozeHvacTask(ctx, tenant, actor, a, now);
    case 'hvac_draft_approve': return draftApprove(ctx, tenant, actor, a, now);
    case 'hvac_context': await refreshShop(ctx, tenant.accountId, now); return hvacContext(ctx, tenant, actor, a, now);
    case 'hvac_insights': return hvacInsights(ctx, tenant, a, now);
    case 'hvac_metric_records': return hvacMetricRecords(ctx, tenant, actor, a, now);
    default: return null;
  }
}
