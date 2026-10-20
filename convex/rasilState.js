// Rasil: Ascend email campaigns to consenting subscribers, from the owner's own domain.
// Same shape as WhatsApp broadcasts (blueCampaignState.js): a frozen recipient list, one send at a time,
// a worker that never sends twice. Counts live on the campaign because a list can reach 2,000.
import { resolveTenant, owned, encodeCursor, decodeCursor, afterCursor } from './blueTenant.js';
import { planFor } from './hasib/plans.js';
import { capabilitiesFor, effectivePlan } from './hasib/capabilities.js';
import { actorWorkspace } from './hasib/workspaceState.js';
import { validateConsent } from './blueAudienceState.js';
import { RASIL_MONTHLY_CAP, RASIL_PER_MINUTE, MAX_ATTEMPTS, RETRY_BACKOFF_MS, IMPORT_MAX, NAME_MAX, dailyLimit, monthKey, dayKey, nextDayStart,
  normalizeEmail, validEmail, normalizeDomain, validDomain, validLocalPart, validSenderName, campaignContent } from '../config/rasil.js';

const DAY = 86400000;
const RETENTION_MS = 90 * DAY;
const STALE_ATTEMPT_MS = 120000;
const MAX_SCHEDULE_AHEAD_MS = 30 * DAY;
const OPEN = ['pending', 'queued', 'attempting'];
const PROBLEMS = ['failed', 'bounced', 'complained', 'blocked', 'ambiguous'];
const SUBSCRIBER_STATUSES = ['pending', 'subscribed', 'unsubscribed', 'suppressed'];
// Delivery receipts move a recipient forward only.
const RANK = { attempting: 0, ambiguous: 1, submitted: 1, delivered: 2, bounced: 3, complained: 3 };
const ok = value => ({ ok: true, value }), fail = reason => ({ ok: false, reason });
const uuid = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
const clip = (value, n) => (typeof value === 'string' ? value.trim().slice(0, n) : '');

async function counter(ctx, key) {
  return (await ctx.db.query('emailUsage').withIndex('by_key', q => q.eq('key', key)).unique())?.count || 0;
}
async function bump(ctx, key, by, expiresAt) {
  const row = await ctx.db.query('emailUsage').withIndex('by_key', q => q.eq('key', key)).unique();
  if (row) await ctx.db.patch(row._id, { count: row.count + by }); else await ctx.db.insert('emailUsage', { key, count: by, expiresAt });
}
const monthUsageKey = (accountId, now) => `m:${accountId}:${monthKey(now)}`;
const dayUsageKey = (accountId, now) => `d:${accountId}:${dayKey(now)}`;

const domainFor = (ctx, accountId) => ctx.db.query('emailDomains').withIndex('by_account', q => q.eq('accountId', accountId)).unique();
const senderReady = d => d?.status === 'verified' && !!d.fromLocal && !!d.fromName;
function publicDomain(d, now) {
  if (!d) return null;
  return { domain: d.domain, status: d.status, records: d.records, fromName: d.fromName || '', fromLocal: d.fromLocal || '', replyTo: d.replyTo || '', formKey: d.formKey,
    verifiedAt: d.verifiedAt || null, dailyLimit: dailyLimit(d.warmupStartedAt, now), ready: senderReady(d) };
}
const businessOf = row => ({ name: clip(row?.profile?.businessName, 120) || 'our business', address: clip(row?.profile?.location, 200) });

/** Move a recipient to a new status, keeping the campaign's counts in step. */
async function move(ctx, job, status, patch, now) {
  if (job.status === status) { if (Object.keys(patch).length) await ctx.db.patch(job._id, { ...patch, updatedAt: now }); return; }
  await ctx.db.patch(job._id, { status, ...patch, updatedAt: now });
  const campaign = await ctx.db.get(job.campaignId);
  if (!campaign) return;
  const counts = { ...campaign.counts };
  counts[job.status] = Math.max(0, (counts[job.status] || 0) - 1);
  counts[status] = (counts[status] || 0) + 1;
  await ctx.db.patch(campaign._id, { counts, updatedAt: now });
}
async function tally(ctx, campaignId, field, now) {
  const campaign = await ctx.db.get(campaignId);
  if (campaign) await ctx.db.patch(campaignId, { counts: { ...campaign.counts, [field]: (campaign.counts[field] || 0) + 1 }, updatedAt: now });
}
async function blockCampaign(ctx, campaign, reason, now) {
  const counts = { ...campaign.counts };
  for (const status of ['pending', 'queued']) {
    const rows = await ctx.db.query('emailCampaignRecipients').withIndex('by_campaign_status', q => q.eq('campaignId', campaign._id).eq('status', status)).take(RASIL_MONTHLY_CAP);
    for (const r of rows) await ctx.db.patch(r._id, { status: 'blocked', reason, updatedAt: now });
    counts.blocked = (counts.blocked || 0) + rows.length;
    counts[status] = Math.max(0, (counts[status] || 0) - rows.length);
  }
  await ctx.db.patch(campaign._id, { status: 'blocked', reason, counts, updatedAt: now });
}
async function finishIfDone(ctx, campaignId, now) {
  const campaign = await ctx.db.get(campaignId);
  if (campaign?.status === 'processing' && OPEN.every(s => !(campaign.counts[s] > 0))) {
    await ctx.db.patch(campaign._id, { status: 'completed', reason: undefined, completedAt: now, updatedAt: now });
  }
}
async function schedule(ctx, a, args) { if (a.workerFunction) await ctx.scheduler.runAfter(0, a.workerFunction, args); }
async function nextQueued(ctx, a, campaignId, now) {
  const [next] = await ctx.db.query('emailCampaignRecipients').withIndex('by_campaign_status', q => q.eq('campaignId', campaignId).eq('status', 'queued')).take(1);
  if (next && next.nextAttemptAt <= now) await schedule(ctx, a, { rasilJobId: next._id });
}
/** Emails already promised to scheduled or sending campaigns, so two campaigns cannot overspend the month. */
async function reserved(ctx, accountId) {
  const rows = await ctx.db.query('emailCampaigns').withIndex('by_account_created', q => q.eq('accountId', accountId)).order('desc').take(100);
  return rows.filter(c => ['scheduled', 'processing'].includes(c.status)).reduce((total, c) => total + OPEN.reduce((n, s) => n + (c.counts[s] || 0), 0), 0);
}
async function entitled(ctx, accountId, now) {
  return !!capabilitiesFor(effectivePlan(await planFor(ctx, accountId, now))).email;
}

function publicCampaign(c) {
  return { id: c._id, name: c.name, subject: c.subject, body: c.body, lang: c.lang, status: c.status, reason: c.reason || null, sender: c.sender,
    scheduledAt: c.scheduledAt, timezone: c.timezone, recipientCount: c.recipientCount, counts: c.counts,
    createdAt: c.createdAt, startedAt: c.startedAt || null, completedAt: c.completedAt || null, cancelledAt: c.cancelledAt || null };
}
const publicSubscriber = s => ({ id: s._id, email: s.email, name: s.name || '', status: s.status, source: s.source, reason: s.suppressReason || null,
  consentDate: s.consent?.date || null, createdAt: s.createdAt });

async function ownerAccess(ctx, a, now) {
  const tenant = await resolveTenant(ctx, a.sessionHash, now);
  if (tenant.error) return { error: tenant.error };
  const rawPlan = await planFor(ctx, tenant.accountId, now);
  if (!rawPlan) return { error: 'access_required' };
  const actor = await actorWorkspace(ctx, tenant.accountId, a.actorAccountId, now);
  if (!actor) return { error: 'workspace_access_revoked' };
  if (!capabilitiesFor(effectivePlan(rawPlan), actor.role).email) return { error: actor.role === 'manager' ? 'plan_required' : 'manager_required' };
  return { accountId: tenant.accountId, row: tenant.row };
}

async function audience(ctx, accountId) {
  return ctx.db.query('emailSubscribers').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'subscribed')).take(RASIL_MONTHLY_CAP + 1);
}
function readiness(domain) {
  if (!domain) return 'domain_required';
  if (domain.status !== 'verified') return 'domain_not_verified';
  if (!senderReady(domain)) return 'sender_required';
  return null;
}

/** Owner operations, from the signed-in dashboard. Each runs after the access check, with the account and its domain. */
const OWNER_OPERATIONS = {
  state: ownerState,
  domain_context: async (ctx, a, { domain }) => (domain ? ok({ domain: domain.domain, resendDomainId: domain.resendDomainId }) : fail('domain_not_found')),
  domain_save: saveDomain,
  domain_status: domainStatus,
  sender_save: saveSender,
  subscribers: listSubscribers,
  subscribers_import: importSubscribers,
  subscriber_unsubscribe: ownerUnsubscribe,
  draft_context: draftContext,
  campaign_preview: previewOrCreate,
  campaign_create: previewOrCreate,
  campaigns: listCampaigns,
  campaign_detail: campaignDetail,
  campaign_cancel: cancelCampaign,
};

export async function executeRasil(ctx, a, now = Date.now()) {
  const access = await ownerAccess(ctx, a, now);
  if (access.error) return fail(access.error);
  const owner = { accountId: access.accountId, row: access.row, domain: await domainFor(ctx, access.accountId) };
  if (!Object.hasOwn(OWNER_OPERATIONS, a.operation)) return fail('invalid_action');
  return OWNER_OPERATIONS[a.operation](ctx, a, owner, now);
}

async function ownerState(ctx, a, { accountId, row, domain }, now) {
  const subscribers = {};
  for (const status of SUBSCRIBER_STATUSES) subscribers[status] = (await ctx.db.query('emailSubscribers').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', status)).take(5001)).length;
  return ok({ domain: publicDomain(domain, now), business: businessOf(row), subscribers,
    usage: { month: await counter(ctx, monthUsageKey(accountId, now)), cap: RASIL_MONTHLY_CAP, today: await counter(ctx, dayUsageKey(accountId, now)), reserved: await reserved(ctx, accountId) } });
}

async function saveDomain(ctx, a, { accountId, domain }, now) {
  const name = normalizeDomain(a.domain);
  if (!validDomain(name) || typeof a.resendDomainId !== 'string' || !a.resendDomainId || !/^[A-Za-z0-9_-]{16,40}$/.test(a.formKey || '')) return fail('invalid_domain');
  const taken = await ctx.db.query('emailDomains').withIndex('by_domain', q => q.eq('domain', name)).take(2);
  if (taken.some(d => d.accountId !== accountId)) return fail('domain_in_use');
  if ((await reserved(ctx, accountId)) > 0 && domain && domain.domain !== name) return fail('campaign_in_progress');
  const value = { accountId, domain: name, resendDomainId: a.resendDomainId, status: ['verified', 'failed'].includes(a.status) ? a.status : 'pending', records: Array.isArray(a.records) ? a.records.slice(0, 12) : [],
    formKey: domain?.formKey || a.formKey, checkedAt: now, createdAt: domain?.createdAt || now, updatedAt: now,
    ...(domain && domain.domain === name ? { fromName: domain.fromName, fromLocal: domain.fromLocal, replyTo: domain.replyTo, verifiedAt: domain.verifiedAt, warmupStartedAt: domain.warmupStartedAt } : {}) };
  if (value.status === 'verified' && !value.verifiedAt) Object.assign(value, { verifiedAt: now, warmupStartedAt: now });
  const clean = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
  if (domain) await ctx.db.replace(domain._id, clean); else await ctx.db.insert('emailDomains', clean);
  return ok({ domain: publicDomain(await domainFor(ctx, accountId), now) });
}

async function domainStatus(ctx, a, { domain }, now) {
  if (!domain) return fail('domain_not_found');
  const status = ['verified', 'failed'].includes(a.status) ? a.status : 'pending';
  const patch = { status, records: Array.isArray(a.records) ? a.records.slice(0, 12) : domain.records, checkedAt: now, updatedAt: now };
  if (status === 'verified' && !domain.verifiedAt) Object.assign(patch, { verifiedAt: now, warmupStartedAt: now });
  await ctx.db.patch(domain._id, patch);
  return ok({ domain: publicDomain(await ctx.db.get(domain._id), now) });
}

async function saveSender(ctx, a, { domain }, now) {
  if (!domain) return fail('domain_required');
  const replyTo = normalizeEmail(a.replyTo);
  if (!validSenderName(a.fromName) || !validLocalPart(a.fromLocal) || (replyTo && !validEmail(replyTo))) return fail('invalid_sender');
  await ctx.db.patch(domain._id, { fromName: a.fromName.trim(), fromLocal: a.fromLocal, replyTo: replyTo || undefined, updatedAt: now });
  return ok({ domain: publicDomain(await ctx.db.get(domain._id), now) });
}

async function listSubscribers(ctx, a, { accountId }) {
  const cursor = decodeCursor(a.cursor);
  const status = SUBSCRIBER_STATUSES.includes(a.status) ? a.status : null;
  const query = status
    ? ctx.db.query('emailSubscribers').withIndex('by_account_status', q => cursor ? q.eq('accountId', accountId).eq('status', status).lte('createdAt', cursor.at) : q.eq('accountId', accountId).eq('status', status))
    : ctx.db.query('emailSubscribers').withIndex('by_account_created', q => cursor ? q.eq('accountId', accountId).lte('createdAt', cursor.at) : q.eq('accountId', accountId));
  const rows = afterCursor(await query.order('desc').take(60), cursor, 'createdAt').slice(0, 50);
  return ok({ items: rows.map(publicSubscriber), cursor: rows.length === 50 ? encodeCursor(rows.at(-1).createdAt, rows.at(-1)._id) : null });
}

async function importSubscribers(ctx, a, { accountId }, now) {
  const consent = validateConsent(a.consent, now);
  if (!consent) return fail('consent_required');
  if (!Array.isArray(a.rows) || !a.rows.length || a.rows.length > IMPORT_MAX) return fail('invalid_import');
  const seen = new Set(), result = { added: 0, updated: 0, kept: 0, invalid: 0 };
  for (const r of a.rows) {
    const email = normalizeEmail(r?.email), name = clip(r?.name, NAME_MAX);
    if (!validEmail(email) || seen.has(email)) { result.invalid += !validEmail(email) ? 1 : 0; continue; }
    seen.add(email);
    const existing = await ctx.db.query('emailSubscribers').withIndex('by_account_email', q => q.eq('accountId', accountId).eq('email', email)).unique();
    // Someone who unsubscribed, bounced or complained is never put back by an import.
    if (existing && ['unsubscribed', 'suppressed'].includes(existing.status)) { result.kept++; continue; }
    const granted = { status: 'granted', ...consent, attestedAt: now };
    if (existing) {
      await ctx.db.patch(existing._id, { status: 'subscribed', consent: existing.status === 'subscribed' ? existing.consent : granted, ...(name && !existing.name ? { name } : {}), updatedAt: now });
      result.updated++;
    } else {
      await ctx.db.insert('emailSubscribers', { accountId, email, ...(name ? { name } : {}), status: 'subscribed', source: a.origin === 'manual' ? 'manual' : 'import', consent: granted, createdAt: now, updatedAt: now });
      result.added++;
    }
  }
  return ok(result);
}

async function ownerUnsubscribe(ctx, a, { accountId }, now) {
  const s = await owned(ctx, a.subscriberId, accountId, 'emailSubscribers');
  if (!s) return fail('subscriber_not_found');
  await unsubscribe(ctx, s, now);
  return ok({ subscriber: publicSubscriber(await ctx.db.get(s._id)) });
}

async function draftContext(ctx, a, { accountId, row }) {
  const entries = await ctx.db.query('blueCatalogEntries').withIndex('by_owner_status_order', q => q.eq('ownerKey', String(accountId)).eq('status', 'approved')).take(200);
  return ok({ business: businessOf(row), bzns: String(row?.bznsPublished?.markdown || '').slice(0, 12000),
    catalog: entries.map(({ entryKey, nameEn, nameAr, prices }) => ({ entryKey, nameEn, nameAr, prices })) });
}

async function previewOrCreate(ctx, a, { accountId, row, domain }, now) {
  const content = campaignContent(a);
  if (!content.ok) return fail(content.reason);
  const blocked = readiness(domain);
  const subscribers = await audience(ctx, accountId);
  const remaining = Math.max(0, RASIL_MONTHLY_CAP - await counter(ctx, monthUsageKey(accountId, now)) - await reserved(ctx, accountId));
  const preview = { eligible: Math.min(subscribers.length, RASIL_MONTHLY_CAP), remaining, cap: RASIL_MONTHLY_CAP, dailyLimit: dailyLimit(domain?.warmupStartedAt, now),
    ready: !blocked, reason: blocked, business: businessOf(row), sample: subscribers[0] ? { name: subscribers[0].name || '' } : null };
  if (a.operation === 'campaign_preview') return ok(preview);

  if (!uuid(a.requestId)) return fail('invalid_request');
  const prior = await ctx.db.query('emailCampaigns').withIndex('by_account_request', q => q.eq('accountId', accountId).eq('requestId', a.requestId)).unique();
  if (prior) return ok({ campaign: publicCampaign(prior) });
  if (a.confirm !== true) return fail('confirmation_required');
  if (blocked) return fail(blocked);
  if (!subscribers.length) return fail('no_eligible_recipients');
  if (subscribers.length > remaining) return fail('monthly_cap');
  const scheduledAt = Number(a.scheduledAt);
  if (!Number.isSafeInteger(scheduledAt) || scheduledAt < now - 60000 || scheduledAt > now + MAX_SCHEDULE_AHEAD_MS) return fail('invalid_schedule');
  if (typeof a.timezone !== 'string' || !a.timezone || a.timezone.length > 64) return fail('invalid_timezone');
  const at = Math.max(now, scheduledAt);
  const campaignId = await ctx.db.insert('emailCampaigns', { accountId, requestId: a.requestId, name: clip(a.name, 80) || content.subject.slice(0, 80), subject: content.subject, body: content.body,
    lang: a.lang === 'en' ? 'en' : 'ar', sender: { domain: domain.domain, fromName: domain.fromName, fromLocal: domain.fromLocal, ...(domain.replyTo ? { replyTo: domain.replyTo } : {}) },
    status: 'scheduled', scheduledAt: at, timezone: a.timezone, recipientCount: subscribers.length, counts: { pending: subscribers.length }, createdAt: now, updatedAt: now });
  for (const s of subscribers) {
    await ctx.db.insert('emailCampaignRecipients', { campaignId, accountId, subscriberId: s._id, email: s.email, ...(s.name ? { name: s.name } : {}),
      status: 'pending', attempts: 0, nextAttemptAt: at, updatedAt: now, expiresAt: at + RETENTION_MS });
  }
  return ok({ campaign: publicCampaign(await ctx.db.get(campaignId)) });
}

async function listCampaigns(ctx, a, { accountId }) {
  const cursor = decodeCursor(a.cursor);
  const rows = afterCursor(await ctx.db.query('emailCampaigns').withIndex('by_account_created', q => cursor ? q.eq('accountId', accountId).lte('createdAt', cursor.at) : q.eq('accountId', accountId))
    .order('desc').take(40), cursor, 'createdAt').slice(0, 20);
  return ok({ items: rows.map(publicCampaign), cursor: rows.length === 20 ? encodeCursor(rows.at(-1).createdAt, rows.at(-1)._id) : null });
}

async function campaignDetail(ctx, a, { accountId }) {
  const c = await owned(ctx, a.campaignId, accountId, 'emailCampaigns');
  if (!c) return fail('campaign_not_found');
  const problems = [];
  for (const status of PROBLEMS) {
    const rows = await ctx.db.query('emailCampaignRecipients').withIndex('by_campaign_status', q => q.eq('campaignId', c._id).eq('status', status)).take(50);
    problems.push(...rows.map(r => ({ email: r.email, name: r.name || '', status: r.status, reason: r.reason || null })));
  }
  return ok({ campaign: publicCampaign(c), problems: problems.slice(0, 100) });
}

async function cancelCampaign(ctx, a, { accountId }, now) {
  const c = await owned(ctx, a.campaignId, accountId, 'emailCampaigns');
  if (!c) return fail('campaign_not_found');
  if (c.status !== 'scheduled') return fail('campaign_not_cancellable');
  const rows = await ctx.db.query('emailCampaignRecipients').withIndex('by_campaign_status', q => q.eq('campaignId', c._id).eq('status', 'pending')).take(RASIL_MONTHLY_CAP);
  for (const r of rows) await ctx.db.patch(r._id, { status: 'cancelled', updatedAt: now });
  await ctx.db.patch(c._id, { status: 'cancelled', cancelledAt: now, counts: { ...c.counts, pending: 0, cancelled: rows.length }, updatedAt: now });
  return ok({ campaign: publicCampaign(await ctx.db.get(c._id)) });
}

/** Stop everything still waiting for this subscriber, and record that they said no. */
async function unsubscribe(ctx, s, now, status = 'unsubscribed', suppressReason) {
  if (s.status === 'suppressed' && status === 'unsubscribed') return;
  await ctx.db.patch(s._id, { status, ...(suppressReason ? { suppressReason } : {}), unsubscribedAt: s.unsubscribedAt || now,
    consent: { ...s.consent, status: s.consent?.status === 'granted' ? 'revoked' : s.consent?.status || 'unknown' }, updatedAt: now });
  const jobs = await ctx.db.query('emailCampaignRecipients').withIndex('by_subscriber', q => q.eq('subscriberId', s._id)).take(200);
  for (const job of jobs) if (['pending', 'queued'].includes(job.status)) await move(ctx, job, 'blocked', { reason: status === 'suppressed' ? suppressReason : 'unsubscribed' }, now);
}

/** Server-to-server operations: the send worker, Resend's events, and the public subscribe and unsubscribe links. */
const WORKER_OPERATIONS = { claim, result, event, unsubscribe: linkUnsubscribe, subscribe_request: subscribeRequest, subscribe_confirm: subscribeConfirm };

export async function executeRasilWorker(ctx, a, now = Date.now()) {
  if (!Object.hasOwn(WORKER_OPERATIONS, a.operation)) return fail('invalid_state');
  return WORKER_OPERATIONS[a.operation](ctx, a, now);
}

async function claim(ctx, a, now) {
  const job = await ctx.db.get(a.jobId);
  if (!job || job.status !== 'queued' || job.nextAttemptAt > now || !uuid(a.intent)) return ok(null);
  const campaign = await ctx.db.get(job.campaignId);
  if (!campaign || campaign.status !== 'processing') { await move(ctx, job, 'blocked', { reason: 'campaign_not_processing' }, now); return ok(null); }
  if ((await ctx.db.query('emailCampaignRecipients').withIndex('by_campaign_status', q => q.eq('campaignId', campaign._id).eq('status', 'attempting')).take(1)).length) return ok(null);
  const domain = await domainFor(ctx, campaign.accountId);
  if (!senderReady(domain) || domain.domain !== campaign.sender.domain) { await blockCampaign(ctx, campaign, 'domain_not_verified', now); return ok(null); }
  if (!await entitled(ctx, campaign.accountId, now)) { await blockCampaign(ctx, campaign, 'plan_required', now); return ok(null); }
  // Suppression is read again right before every send.
  const subscriber = await ctx.db.get(job.subscriberId);
  if (subscriber?.status !== 'subscribed') {
    await move(ctx, job, 'blocked', { reason: subscriber?.status === 'suppressed' ? subscriber.suppressReason || 'suppressed' : 'unsubscribed' }, now);
    await nextQueued(ctx, a, campaign._id, now);
    await finishIfDone(ctx, campaign._id, now);
    return ok(null);
  }
  if (await counter(ctx, monthUsageKey(campaign.accountId, now)) >= RASIL_MONTHLY_CAP) { await blockCampaign(ctx, campaign, 'monthly_cap', now); return ok(null); }
  // A new domain's day is full: the rest goes out from tomorrow, in the same order.
  if (await counter(ctx, dayUsageKey(campaign.accountId, now)) >= dailyLimit(domain.warmupStartedAt, now)) {
    await ctx.db.patch(job._id, { nextAttemptAt: nextDayStart(now), updatedAt: now });
    await ctx.db.patch(campaign._id, { reason: 'daily_limit', updatedAt: now });
    return ok(null);
  }
  const rateKey = `r:${campaign.accountId}:${Math.floor(now / 60000)}`;
  if (await counter(ctx, rateKey) >= RASIL_PER_MINUTE) {
    await ctx.db.patch(job._id, { nextAttemptAt: (Math.floor(now / 60000) + 1) * 60000, updatedAt: now });
    return ok(null);
  }
  await bump(ctx, rateKey, 1, now + 120000);
  await move(ctx, job, 'attempting', { intent: a.intent, attemptAt: now, attempts: job.attempts + 1 }, now);
  if (campaign.reason === 'daily_limit') await ctx.db.patch(campaign._id, { reason: undefined });
  const tenant = await accountRow(ctx, campaign.accountId);
  return ok({ jobId: job._id, intent: a.intent, to: job.email, name: job.name || '', subscriberId: job.subscriberId,
    subject: campaign.subject, body: campaign.body, lang: campaign.lang, sender: campaign.sender, business: businessOf(tenant) });
}

async function result(ctx, a, now) {
  const job = await ctx.db.get(a.jobId);
  if (!job || job.intent !== a.intent || !['submitted', 'retry', 'failed', 'ambiguous', 'blocked'].includes(a.status)) return fail('invalid_state');
  const campaign = await ctx.db.get(job.campaignId);
  if (job.status === 'attempting') {
    const reason = typeof a.reason === 'string' ? { reason: a.reason.slice(0, 60) } : {};
    if (a.status === 'retry' && job.attempts < MAX_ATTEMPTS) {
      await move(ctx, job, 'queued', { nextAttemptAt: now + RETRY_BACKOFF_MS[job.attempts - 1], intent: undefined, ...reason }, now);
    } else if (a.status === 'submitted') {
      await move(ctx, job, 'submitted', { providerId: String(a.providerId || '').slice(0, 80) }, now);
      await bump(ctx, monthUsageKey(job.accountId, now), 1, now + 40 * DAY);
      await bump(ctx, dayUsageKey(job.accountId, now), 1, now + 2 * DAY);
    } else {
      await move(ctx, job, a.status === 'retry' ? 'failed' : a.status, reason, now);
    }
  }
  if (campaign && typeof a.campaignBlock === 'string' && campaign.status === 'processing') await blockCampaign(ctx, await ctx.db.get(campaign._id), a.campaignBlock.slice(0, 60), now);
  else if (campaign) await nextQueued(ctx, a, campaign._id, now);
  if (campaign) await finishIfDone(ctx, campaign._id, now);
  return ok(null);
}

async function event(ctx, a, now) {
  const job = typeof a.providerId === 'string' && a.providerId
    ? await ctx.db.query('emailCampaignRecipients').withIndex('by_provider', q => q.eq('providerId', a.providerId)).unique() : null;
  if (!job) return ok(null);
  const subscriber = await ctx.db.get(job.subscriberId);
  if (a.type === 'email.opened' && !job.openedAt) { await ctx.db.patch(job._id, { openedAt: now }); await tally(ctx, job.campaignId, 'opened', now); return ok(null); }
  if (a.type === 'email.clicked' && !job.clickedAt) { await ctx.db.patch(job._id, { clickedAt: now }); await tally(ctx, job.campaignId, 'clicked', now); return ok(null); }
  const status = { 'email.delivered': 'delivered', 'email.bounced': 'bounced', 'email.complained': 'complained' }[a.type];
  if (!status || (RANK[status] ?? 0) <= (RANK[job.status] ?? 0)) return ok(null);
  // A temporary bounce is Resend still trying; only a permanent one or a complaint ends the address.
  if (status === 'bounced' && a.bounceType === 'Transient') return ok(null);
  await move(ctx, job, status, {}, now);
  if (subscriber && status !== 'delivered') await unsubscribe(ctx, subscriber, now, 'suppressed', status === 'bounced' ? 'bounce' : 'complaint');
  return ok(null);
}

async function linkUnsubscribe(ctx, a, now) {
  const s = await ctx.db.get(a.subscriberId);
  if (!s) return fail('subscriber_not_found');
  await unsubscribe(ctx, s, now);
  return ok({ business: businessOf(await accountRow(ctx, s.accountId)).name });
}

async function subscribeRequest(ctx, a, now) {
  const domain = typeof a.formKey === 'string' ? await ctx.db.query('emailDomains').withIndex('by_form_key', q => q.eq('formKey', a.formKey)).unique() : null;
  if (!domain || !senderReady(domain) || !await entitled(ctx, domain.accountId, now)) return fail('form_unavailable');
  const email = normalizeEmail(a.email), name = clip(a.name, NAME_MAX);
  if (!validEmail(email)) return fail('invalid_email');
  const rateKey = `s:${domain.formKey}:${Math.floor(now / 3600000)}`;
  if (await counter(ctx, rateKey) >= 60) return fail('too_many');
  await bump(ctx, rateKey, 1, now + 2 * 3600000);
  const business = businessOf(await accountRow(ctx, domain.accountId));
  const answer = (subscriber, send) => ok({ send, subscriberId: subscriber?._id || null, email, name: subscriber?.name || name, lang: a.lang === 'en' ? 'en' : 'ar', business,
    sender: { domain: domain.domain, fromName: domain.fromName, fromLocal: domain.fromLocal, ...(domain.replyTo ? { replyTo: domain.replyTo } : {}) } });
  const existing = await ctx.db.query('emailSubscribers').withIndex('by_account_email', q => q.eq('accountId', domain.accountId).eq('email', email)).unique();
  // The answer looks the same whether or not the address is known, so the form cannot be used to test addresses.
  if (existing?.status === 'subscribed' || existing?.status === 'suppressed') return answer(existing, false);
  const today = existing?.requestedAt && now - existing.requestedAt < DAY ? (existing.confirmRequests || 0) : 0;
  if (today >= 3) return answer(existing, false);
  const consent = { status: 'unknown', source: 'Website sign-up form', date: dayKey(now), purpose: 'Email news and offers' };
  if (existing) {
    await ctx.db.patch(existing._id, { status: 'pending', consent, ...(name && !existing.name ? { name } : {}), requestedAt: now, confirmRequests: today + 1, updatedAt: now });
    return answer(await ctx.db.get(existing._id), true);
  }
  const id = await ctx.db.insert('emailSubscribers', { accountId: domain.accountId, email, ...(name ? { name } : {}), status: 'pending', source: 'website', consent, requestedAt: now, confirmRequests: 1, createdAt: now, updatedAt: now });
  return answer(await ctx.db.get(id), true);
}

async function subscribeConfirm(ctx, a, now) {
  const s = await ctx.db.get(a.subscriberId);
  if (!s) return fail('subscriber_not_found');
  if (s.status === 'pending') {
    await ctx.db.patch(s._id, { status: 'subscribed', confirmedAt: now, consent: { ...s.consent, status: 'granted', date: dayKey(now), attestedAt: now }, updatedAt: now });
  }
  const after = await ctx.db.get(s._id);
  return ok({ status: after.status, business: businessOf(await accountRow(ctx, s.accountId)).name });
}

async function accountRow(ctx, accountId) {
  const account = await ctx.db.get(accountId);
  if (!account?.draftHash) return null;
  return ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', account.draftHash)).unique();
}

/** Minute cron: start due campaigns, redispatch due jobs, fence lost attempts, expire old recipient rows. */
export async function maintainRasil(ctx, a, now = Date.now()) {
  const due = await ctx.db.query('emailCampaigns').withIndex('by_status_scheduled', q => q.eq('status', 'scheduled').lte('scheduledAt', now)).take(10);
  for (const c of due) {
    const domain = await domainFor(ctx, c.accountId);
    if (!senderReady(domain) || domain.domain !== c.sender.domain) { await blockCampaign(ctx, c, 'domain_not_verified', now); continue; }
    if (!await entitled(ctx, c.accountId, now)) { await blockCampaign(ctx, c, 'plan_required', now); continue; }
    const rows = await ctx.db.query('emailCampaignRecipients').withIndex('by_campaign_status', q => q.eq('campaignId', c._id).eq('status', 'pending')).take(RASIL_MONTHLY_CAP);
    for (const r of rows) await ctx.db.patch(r._id, { status: 'queued', nextAttemptAt: now, updatedAt: now });
    await ctx.db.patch(c._id, { status: 'processing', startedAt: now, counts: { ...c.counts, pending: Math.max(0, (c.counts.pending || 0) - rows.length), queued: (c.counts.queued || 0) + rows.length }, updatedAt: now });
    await nextQueued(ctx, a, c._id, now);
    await finishIfDone(ctx, c._id, now);
  }
  const attempting = await ctx.db.query('emailCampaignRecipients').withIndex('by_status_next', q => q.eq('status', 'attempting')).take(100);
  for (const job of attempting) if ((job.attemptAt || 0) < now - STALE_ATTEMPT_MS) {
    // Outcome unknown. Not resent automatically, though the idempotency key would make it safe within a day.
    await move(ctx, job, 'ambiguous', { reason: 'worker_outcome_unknown' }, now);
    await finishIfDone(ctx, job.campaignId, now);
  }
  const queued = await ctx.db.query('emailCampaignRecipients').withIndex('by_status_next', q => q.eq('status', 'queued').lte('nextAttemptAt', now)).take(100);
  const started = new Set();
  for (const job of queued) if (!started.has(job.campaignId)) { started.add(job.campaignId); await schedule(ctx, a, { rasilJobId: job._id }); }
  const expired = await ctx.db.query('emailCampaignRecipients').withIndex('by_expiry', q => q.lt('expiresAt', now)).take(200);
  for (const r of expired) if (!OPEN.includes(r.status)) await ctx.db.delete(r._id);
  const usage = await ctx.db.query('emailUsage').withIndex('by_expiry', q => q.lt('expiresAt', now)).take(200);
  for (const u of usage) await ctx.db.delete(u._id);
}
