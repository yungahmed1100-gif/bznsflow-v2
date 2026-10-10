// Real Estate's shared reads: who may see a deal, readable rows, Today, tasks and insights.
import { owned } from '../blueTenant.js';
import { ok, fail, clampLimit, settingsFor } from './shared.js';
import { audit } from './workspaceState.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { displayName } from '../blueContacts.js';
import { ruleWanted, ruleDraftText, RULE_TASK_KINDS } from './realEstateRules.js';

export const DAY = 86400000;
export const OPEN_STAGES = ['new', 'contacted', 'qualified', 'viewing', 'offer'];
const LIVE_VIEWING = new Set(['requested', 'confirmed']);
const LIVE_OFFER = new Set(['approved', 'presented', 'countered']);
const FIRST_RESPONSE_MS = 5 * 60000, SECOND_ATTEMPT_MS = 2 * 3600000, OFFER_ANSWER_MS = 2 * 3600000, SCAN = 500;
// Tasks Today opens from the records themselves; each closes itself once the cause is gone.
const AUTO_TASKS = new Set(['first_response_overdue', 'second_attempt_overdue', 'stale_listing', 'viewing_outcome_missing', 'offer_unanswered', ...RULE_TASK_KINDS]);
const ARABIC = /[\u0600-\u06FF]/;

export const publicRow = row => { const { _id, _seq, table, accountId, requestId, ...rest } = row; return { id: _id, ...rest }; };

/** Agents work their own deals and unassigned ones; managers see the whole agency. */
export const canSeeDeal = (actor, row) => actor.role !== 'employee' || !row.assignedAccountId || String(row.assignedAccountId) === String(actor.actorAccountId);

export async function visibleOpportunity(ctx, tenant, actor, id) {
  const row = id ? await owned(ctx, id, tenant.accountId, 'realEstateOpportunities') : null;
  return row && canSeeDeal(actor, row) ? row : null;
}

/** Adds the customer's name and the property's label so every card is readable. */
export async function readable(ctx, accountId, rows) {
  const contacts = new Map(), properties = new Map(), opportunities = new Map();
  const get = async (cache, table, id) => {
    if (!id) return null;
    if (!cache.has(String(id))) cache.set(String(id), await owned(ctx, id, accountId, table));
    return cache.get(String(id));
  };
  const out = [];
  for (const row of rows) {
    const opportunity = row.contactId ? row : await get(opportunities, 'realEstateOpportunities', row.opportunityId);
    const contact = await get(contacts, 'blueContacts', opportunity?.contactId);
    const property = await get(properties, 'hasibProperties', row.propertyId);
    out.push({ ...publicRow(row), contactName: contact?.state === 'active' ? displayName(contact).name : null,
      ...(opportunity?.conversationId ? { conversationId: opportunity.conversationId } : {}),
      ...(property ? { propertyLabel: property.label, location: property.location, askingPriceMinor: property.askingPriceMinor, availability: property.availability } : {}) });
  }
  return out;
}

/** A page of an agency list, limited to deals the actor may see, with readable rows. */
export async function dealList(ctx, tenant, actor, table, a, index = 'by_account_created') {
  const page = await ctx.db.query(table).withIndex(index, q => q.eq('accountId', tenant.accountId)).order('desc').paginate({ numItems: clampLimit(a.limit, 200), cursor: a.cursor || null });
  const rows = [];
  for (const row of page.page) {
    const deal = table === 'realEstateOpportunities' ? row : await owned(ctx, row.opportunityId, tenant.accountId, 'realEstateOpportunities');
    if (deal && canSeeDeal(actor, deal)) rows.push(row);
  }
  return ok({ items: await readable(ctx, tenant.accountId, rows), cursor: page.isDone ? null : page.continueCursor });
}

const take = (ctx, table, accountId, index = 'by_account_created') => ctx.db.query(table).withIndex(index, q => q.eq('accountId', accountId)).order('desc').take(SCAN);

/** The tasks the records call for right now, as [kind, entityType, entityId, reason, dueAt?]. */
function currentTasks({ opportunities, properties, viewings, offers }, now, freshnessMs) {
  const wanted = [];
  for (const o of opportunities) {
    if (o.stage === 'new' && o.source !== 'manual' && !o.providerSubmittedAt && now - o.firstInboundAt > FIRST_RESPONSE_MS)
      wanted.push(['first_response_overdue', 'opportunity', o._id, 'First reply has not been sent within five minutes', o.firstInboundAt + FIRST_RESPONSE_MS]);
    if (OPEN_STAGES.includes(o.stage) && o.lastAttemptAt && !o.providerSubmittedAt && now - o.lastAttemptAt > SECOND_ATTEMPT_MS)
      wanted.push(['second_attempt_overdue', 'opportunity', o._id, 'A second reply attempt is overdue', o.lastAttemptAt + SECOND_ATTEMPT_MS]);
  }
  for (const p of properties) if (p.availability === 'available' && (!p.verificationAt || p.verificationAt < now - freshnessMs))
    wanted.push(['stale_listing', 'property', p._id, 'This available listing needs fresh verification']);
  for (const v of viewings) if (v.scheduledAt < now && LIVE_VIEWING.has(v.status))
    wanted.push(['viewing_outcome_missing', 'viewing', v._id, 'The viewing time passed without an outcome']);
  for (const o of offers) if (LIVE_OFFER.has(o.status) && now - o.updatedAt > OFFER_ANSWER_MS)
    wanted.push(['offer_unanswered', 'offer', o._id, 'This offer needs an answer or a next step']);
  return wanted;
}

/** The customer's latest message on a deal's conversation, cached for one sync. */
function inboundReader(ctx) {
  const cache = new Map();
  return async o => {
    if (!o.conversationId) return 0;
    if (!cache.has(String(o.conversationId))) cache.set(String(o.conversationId), (await ctx.db.get(o.conversationId))?.lastInbound || 0);
    return cache.get(String(o.conversationId));
  };
}

/** A rule draft in the customer's language (from their latest message), built from the deal's approved records. */
async function insertRuleDraft(ctx, accountId, item, timezone, now) {
  const o = item.opportunity, contact = await ctx.db.get(o.contactId), property = item.viewing ? await ctx.db.get(item.viewing.propertyId) : null;
  const last = o.conversationId ? await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', o.conversationId).eq('direction', 'in')).order('desc').first() : null;
  const name = contact?.state === 'active' ? displayName(contact).name : '';
  const text = ruleDraftText(item, { name: name && !/^\+?\d/.test(name) ? name : '', propertyLabel: property?.label, location: property?.location, timezone, arabic: last?.text ? ARABIC.test(last.text) : true });
  await ctx.db.insert('realEstateDrafts', { accountId, requestId: `rule:${item.key}`, opportunityId: o._id, ...(o.conversationId ? { conversationId: o.conversationId } : {}),
    kind: item.rule.id === 'viewing_confirmation' ? 'viewing_confirmation' : 'follow_up', text, ruleId: item.rule.id, ruleKey: item.key, status: 'draft', version: 1, createdAt: now, updatedAt: now });
}

/** Opens tasks the records call for and closes automatic ones whose cause is gone; rule drafts follow the same life. */
async function syncTasks(ctx, accountId, records, now, settings, timezone) {
  const wanted = currentTasks(records, now, ((settings.listingFreshnessDays ?? 30) * DAY));
  const rules = await ruleWanted(records, now, settings, inboundReader(ctx));
  for (const item of rules) if (item.rule.mode === 'task') wanted.push([item.kind, item.entityType, item.entityId, item.reason, item.dueAt, item.opportunity.assignedAccountId]);
  // A rule task is keyed by when it fired, so a rescheduled viewing replaces its reminder.
  const key = (kind, entityId, dueAt) => RULE_TASK_KINDS.has(kind) ? `${kind}:${entityId}:${dueAt}` : `${kind}:${entityId}`;
  const wantedKeys = new Set(wanted.map(([kind, , entityId, , dueAt]) => key(kind, entityId, dueAt)));
  const open = await ctx.db.query('realEstateTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(SCAN);
  const openKeys = new Set(open.map(t => key(t.kind, t.entityId, t.dueAt)));
  for (const t of open) if (AUTO_TASKS.has(t.kind) && !wantedKeys.has(key(t.kind, t.entityId, t.dueAt))) await ctx.db.patch(t._id, { status: 'resolved', resolvedAt: now, resolution: 'cleared', updatedAt: now });
  for (const [kind, entityType, entityId, reason, dueAt, assignedAccountId] of wanted) if (!openKeys.has(key(kind, entityId, dueAt))) {
    // A rule fires once: a task someone resolved is not reopened for the same firing.
    if (RULE_TASK_KINDS.has(kind) && (await ctx.db.query('realEstateTasks').withIndex('by_entity', q => q.eq('entityType', entityType).eq('entityId', String(entityId))).take(50)).some(t => t.kind === kind && t.dueAt === dueAt)) continue;
    await ctx.db.insert('realEstateTasks', { accountId, kind, entityType, entityId: String(entityId), status: 'open', reason, ...(dueAt ? { dueAt } : {}), ...(assignedAccountId ? { assignedAccountId } : {}), createdAt: now, updatedAt: now });
  }
  // Draft-mode rules: one draft per firing; an unsent one is cancelled once its cause is gone.
  const draftKeys = new Set(rules.filter(i => i.rule.mode === 'draft').map(i => i.key));
  const existing = new Map(records.drafts.filter(d => d.ruleKey).map(d => [d.ruleKey, d]));
  for (const d of existing.values()) if (d.status === 'draft' && !draftKeys.has(d.ruleKey)) await ctx.db.patch(d._id, { status: 'cancelled', version: d.version + 1, updatedAt: now });
  for (const item of rules) if (item.rule.mode === 'draft' && !existing.has(item.key)) await insertRuleDraft(ctx, accountId, item, timezone, now);
}

/** A task belongs to the agent when its deal (directly or through a viewing or offer) does. */
async function taskVisible(ctx, tenant, actor, task) {
  if (actor.role !== 'employee') return true;
  const table = { opportunity: 'realEstateOpportunities', viewing: 'realEstateViewings', offer: 'realEstateOffers', draft: 'realEstateDrafts' }[task.entityType];
  if (!table) return true; // listings are the whole agency's
  const row = await owned(ctx, task.entityId, tenant.accountId, table);
  const deal = row && (table === 'realEstateOpportunities' ? row : await owned(ctx, row.opportunityId, tenant.accountId, 'realEstateOpportunities'));
  return !!deal && canSeeDeal(actor, deal);
}

/** Reads the agency's records and brings its tasks and rule drafts up to date. */
export async function refreshTasks(ctx, accountId, now) {
  const all = { opportunities: await take(ctx, 'realEstateOpportunities', accountId), properties: await take(ctx, 'hasibProperties', accountId),
    viewings: await take(ctx, 'realEstateViewings', accountId, 'by_account_date'), offers: await take(ctx, 'realEstateOffers', accountId), drafts: await take(ctx, 'realEstateDrafts', accountId) };
  const settings = await settingsFor(ctx, accountId), timezone = await businessTimezone(ctx, accountId);
  await syncTasks(ctx, accountId, all, now, settings, timezone);
  return { all: { ...all, drafts: await take(ctx, 'realEstateDrafts', accountId) }, settings, timezone };
}

export async function overview(ctx, tenant, actor, now) {
  const accountId = tenant.accountId;
  const { all, settings, timezone } = await refreshTasks(ctx, accountId, now);
  const freshnessMs = (settings.listingFreshnessDays ?? 30) * DAY;
  const deals = all.opportunities.filter(o => canSeeDeal(actor, o)), dealIds = new Set(deals.map(o => String(o._id)));
  const viewings = all.viewings.filter(v => dealIds.has(String(v.opportunityId))), offers = all.offers.filter(o => dealIds.has(String(o.opportunityId)));
  const drafts = all.drafts.filter(d => dealIds.has(String(d.opportunityId)));
  const openTasks = await ctx.db.query('realEstateTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(SCAN);
  const tasks = [];
  for (const t of openTasks) if (await taskVisible(ctx, tenant, actor, t)) tasks.push(publicRow(t));
  const today = periodRange('today', now, timezone);
  const fresh = p => p.availability === 'available' && p.verificationAt && p.verificationAt >= now - freshnessMs;
  const listings = Object.fromEntries(['available', 'reserved', 'unavailable'].map(s => [s, all.properties.filter(p => p.availability === s).length]));
  const freshCount = all.properties.filter(fresh).length;
  const offerSummary = { draft: offers.filter(o => o.status === 'draft').length, approvalPending: offers.filter(o => o.status === 'draft').length,
    active: offers.filter(o => LIVE_OFFER.has(o.status)).length, accepted: offers.filter(o => o.status === 'accepted').length };
  const draftsWaiting = drafts.filter(d => d.status === 'draft').length;
  return ok({ workspaceRole: actor.role,
    counts: { opportunities: deals.filter(o => OPEN_STAGES.includes(o.stage)).length, unassigned: deals.filter(o => !o.assignedAccountId && OPEN_STAGES.includes(o.stage)).length,
      slaBreaches: tasks.filter(t => t.kind === 'first_response_overdue').length, staleListings: listings.available - freshCount,
      todayViewings: viewings.filter(v => v.scheduledAt >= today.from && v.scheduledAt < today.to && v.status !== 'cancelled').length, tasks: tasks.length },
    pipeline: Object.fromEntries([...OPEN_STAGES, 'won', 'lost'].map(stage => [stage, deals.filter(o => o.stage === stage).length])),
    listings: { ...listings, verifiedFresh: freshCount, stale: listings.available - freshCount },
    viewings: { today: viewings.filter(v => v.scheduledAt >= today.from && v.scheduledAt < today.to && v.status !== 'cancelled').length,
      upcoming: viewings.filter(v => v.scheduledAt >= now && LIVE_VIEWING.has(v.status)).length, outcomeMissing: viewings.filter(v => v.scheduledAt < now && LIVE_VIEWING.has(v.status)).length },
    offers: offerSummary, approvals: { offers: offerSummary.approvalPending, drafts: draftsWaiting, total: offerSummary.approvalPending + draftsWaiting }, tasks });
}

export async function resolveTask(ctx, tenant, actor, a, now) {
  const task = await owned(ctx, a.taskId, tenant.accountId, 'realEstateTasks');
  if (!task || !(await taskVisible(ctx, tenant, actor, task))) return fail('task_not_found');
  if (task.status !== 'open') return ok(publicRow(task));
  await ctx.db.patch(task._id, { status: 'resolved', resolvedAt: now, resolvedBy: String(actor.actorAccountId), resolution: String(a.reason || 'done').slice(0, 200), updatedAt: now });
  await audit(ctx, tenant, actor, 'task_resolved', 'task', task._id, now, task.kind);
  return ok(publicRow(await ctx.db.get(task._id)));
}

const rate = (numerator, denominator) => denominator ? Math.round(numerator * 1000 / denominator) / 10 : 0;
const tally = values => Object.entries(values.reduce((out, v) => ({ ...out, [v || 'unknown']: (out[v || 'unknown'] || 0) + 1 }), {}))
  .map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

export async function insights(ctx, tenant) {
  const accountId = tenant.accountId, scan = table => ctx.db.query(table).withIndex(table === 'realEstateViewings' ? 'by_account_date' : 'by_account_created', q => q.eq('accountId', accountId)).take(2000);
  const [opportunities, viewings, offers, commissions, properties] = [await scan('realEstateOpportunities'), await scan('realEstateViewings'), await scan('realEstateOffers'), await scan('realEstateCommissions'), await scan('hasibProperties')];
  const qualifiedStages = new Set(['qualified', 'viewing', 'offer', 'won']);
  const viewed = new Set(viewings.filter(v => v.status === 'completed').map(v => String(v.opportunityId))), offered = new Set(offers.map(o => String(o.opportunityId)));
  const won = opportunities.filter(o => o.stage === 'won');
  const responses = opportunities.filter(o => Number.isSafeInteger(o.providerSubmittedAt) && Number.isSafeInteger(o.firstInboundAt) && o.providerSubmittedAt >= o.firstInboundAt).map(o => o.providerSubmittedAt - o.firstInboundAt);
  const sources = new Map();
  for (const o of opportunities) { const g = sources.get(o.source) || { source: o.source, opportunities: 0, won: 0 }; g.opportunities++; if (o.stage === 'won') g.won++; sources.set(o.source, g); }
  const sold = properties.filter(p => p.availability === 'unavailable' && p.updatedAt >= p.createdAt);
  const total = status => commissions.filter(c => c.status === status).reduce((sum, c) => sum + c.amountMinor, 0);
  return ok({
    commissions: { dueMinor: total('due'), paidMinor: total('paid'), records: commissions.length },
    averageFirstResponseMinutes: responses.length ? Math.round(responses.reduce((s, v) => s + v, 0) / responses.length / 6000) / 10 : null,
    qualificationRate: rate(opportunities.filter(o => qualifiedStages.has(o.stage)).length, opportunities.length),
    viewingToOfferRate: rate([...viewed].filter(id => offered.has(id)).length, viewed.size),
    offerToCloseRate: rate(won.filter(o => offered.has(String(o._id))).length, offered.size),
    sourceConversion: [...sources.values()].map(g => ({ ...g, rate: rate(g.won, g.opportunities) })).sort((a, b) => b.opportunities - a.opportunities || a.source.localeCompare(b.source)),
    lostReasons: tally(opportunities.filter(o => o.stage === 'lost').map(o => o.lostReason)),
    averageDaysOnMarket: sold.length ? Math.round(sold.reduce((s, p) => s + (p.updatedAt - p.createdAt), 0) / sold.length / DAY * 10) / 10 : null,
  });
}
