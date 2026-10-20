import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { executeRasil, executeRasilWorker, maintainRasil } from '../convex/rasilState.js';
import { blueHarness, seedTenant } from './helpers/blue-tenant.mjs';
import { RASIL_MONTHLY_CAP, WARMUP_DAILY } from '../config/rasil.js';

const consent = { source: 'Customers who signed up in store', date: '2026-10-01', purpose: 'Offers and news by email', attested: true };
const DAY = 86400000;

async function rasilTenant({ plan = 'ascend', name = 'r', verified = true, sender = true } = {}) {
  const h = blueHarness();
  const t = await seedTenant(h.m, { name, plan });
  const owner = (operation, args = {}) => executeRasil(h.m.ctx, { operation, sessionHash: t.sessionHash, ...args }, h.m.now());
  const worker = (operation, args = {}) => executeRasilWorker(h.m.ctx, { workerFunction: 'dispatch', operation, ...args }, h.m.now());
  const maintain = () => maintainRasil(h.m.ctx, { workerFunction: 'dispatch' }, h.m.now());
  if (plan === 'ascend') {
    await owner('domain_save', { domain: `${name}-studio.om`, resendDomainId: `dom-${name}`, records: [], status: verified ? 'verified' : 'pending', formKey: `${name}`.padEnd(24, 'k') });
    if (sender) await owner('sender_save', { fromName: 'Blue Studio', fromLocal: 'news', replyTo: 'owner@example.om' });
  }
  const subscribe = (n, prefix = 's') => owner('subscribers_import', { consent, rows: Array.from({ length: n }, (_, i) => ({ email: `${prefix}${i}@example.om`, name: `Name ${i}` })) });
  const create = (args = {}) => owner('campaign_create', { requestId: randomUUID(), confirm: true, subject: 'Autumn offer', body: 'Hello {{name}}', lang: 'en', scheduledAt: h.m.now(), timezone: 'Asia/Muscat', ...args });
  /** Run the scheduled job chain once, answering each claim with `answer`. */
  const sendAll = async (answer = () => ({ status: 'submitted', providerId: randomUUID() }), limit = 5000) => {
    let sent = 0;
    for (let i = 0; i < limit; i++) {
      const next = h.m.scheduled.shift();
      if (!next) break;
      const claim = await worker('claim', { jobId: next.rasilJobId, intent: randomUUID() });
      if (!claim.value) continue;
      const r = answer(claim.value);
      await worker('result', { jobId: claim.value.jobId, intent: claim.value.intent, ...r });
      sent++;
    }
    return sent;
  };
  return { h, t, owner, worker, maintain, subscribe, create, sendAll };
}

test('Rasil is Ascend’s and the manager’s', async () => {
  const catalyst = await rasilTenant({ plan: 'catalyst', name: 'c' });
  assert.equal((await catalyst.owner('state')).reason, 'plan_required');
  const { h, t, owner } = await rasilTenant();
  assert.equal((await owner('state')).ok, true);
  const workspaceId = await h.m.db.insert('ascendWorkspaces', { managerAccountId: t.accountId, employeeLimit: 5, createdAt: h.m.now(), updatedAt: h.m.now() });
  const staff = await h.m.db.insert('accounts', { email: 'staff@example.com', role: 'customer', createdAt: h.m.now() });
  await h.m.db.insert('ascendWorkspaceMembers', { workspaceId, accountId: staff, email: 'staff@example.com', status: 'active', invitedAt: h.m.now() });
  assert.equal((await owner('state', { actorAccountId: staff })).reason, 'manager_required');
});

test('the sending domain: one owner each, verified before anything is sent, then a three-week warm-up', async () => {
  const one = await rasilTenant({ verified: false, sender: false });
  let state = (await one.owner('state')).value;
  assert.deepEqual([state.domain.status, state.domain.ready, state.domain.dailyLimit], ['pending', false, 0]);
  assert.equal((await one.owner('campaign_preview', { subject: 'Hi', body: 'Hello' })).value.reason, 'domain_not_verified');
  assert.equal((await one.owner('sender_save', { fromName: 'X <y@z>', fromLocal: 'news' })).reason, 'invalid_sender');
  await one.owner('domain_status', { status: 'verified', records: [] });
  assert.equal((await one.owner('campaign_preview', { subject: 'Hi', body: 'Hello' })).value.reason, 'sender_required');
  await one.owner('sender_save', { fromName: 'Blue Studio', fromLocal: 'news' });
  state = (await one.owner('state')).value;
  assert.deepEqual([state.domain.ready, state.domain.dailyLimit], [true, WARMUP_DAILY[0]]);
  const other = await seedTenant(one.h.m, { name: 'z', plan: 'ascend', phone: '7777', waba: '6666', sender: '96890000009' });
  const taken = await executeRasil(one.h.m.ctx, { operation: 'domain_save', sessionHash: other.sessionHash, domain: 'r-studio.om', resendDomainId: 'dom-z', records: [], formKey: 'z'.repeat(24) }, one.h.m.now());
  assert.equal(taken.reason, 'domain_in_use');
  assert.equal((await one.owner('domain_save', { domain: 'bznsflowai.com', resendDomainId: 'dom-x', formKey: 'x'.repeat(24) })).reason, 'invalid_domain');
});

test('subscribers: imports need a consent record and never bring back someone who left', async () => {
  const { owner, subscribe } = await rasilTenant();
  assert.equal((await owner('subscribers_import', { consent: { ...consent, attested: false }, rows: [{ email: 'a@example.om' }] })).reason, 'consent_required');
  assert.deepEqual((await owner('subscribers_import', { consent, rows: [{ email: 'A@Example.om', name: 'Aisha' }, { email: 'a@example.om' }, { email: 'nope' }] })).value, { added: 1, updated: 0, kept: 0, invalid: 1 });
  const [aisha] = (await owner('subscribers')).value.items;
  assert.deepEqual([aisha.email, aisha.name, aisha.status, aisha.consentDate], ['a@example.om', 'Aisha', 'subscribed', '2026-10-01']);
  await owner('subscriber_unsubscribe', { subscriberId: aisha.id });
  assert.equal((await owner('subscribers_import', { consent, rows: [{ email: 'a@example.om' }] })).value.kept, 1);
  assert.equal((await owner('subscribers', { status: 'unsubscribed' })).value.items.length, 1);
  await subscribe(3);
  assert.deepEqual((await owner('state')).value.subscribers, { pending: 0, subscribed: 3, unsubscribed: 1, suppressed: 0 });
});

test('a campaign sends to every subscriber once, counts what happened and finishes', async () => {
  const { h, owner, maintain, subscribe, create, sendAll, worker } = await rasilTenant();
  assert.equal((await create()).reason, 'no_eligible_recipients');
  await subscribe(3);
  assert.equal((await create({ confirm: false })).reason, 'confirmation_required');
  const requestId = randomUUID();
  const { campaign } = (await create({ requestId, name: 'Autumn' })).value;
  assert.equal((await create({ requestId })).value.campaign.id, campaign.id, 'a double click creates one campaign');
  assert.deepEqual([campaign.status, campaign.recipientCount, campaign.counts.pending, campaign.sender.fromLocal], ['scheduled', 3, 3, 'news']);
  await maintain();
  const first = h.m.scheduled[0];
  const claim = await worker('claim', { jobId: first.rasilJobId, intent: randomUUID() });
  assert.deepEqual([claim.value.to, claim.value.subject, claim.value.sender.domain, claim.value.business.name], ['s0@example.om', 'Autumn offer', 'r-studio.om', 'Blue Studio']);
  assert.equal((await worker('claim', { jobId: h.m.scheduled[0].rasilJobId, intent: randomUUID() })).value, null, 'one send at a time per campaign');
  await worker('result', { jobId: claim.value.jobId, intent: claim.value.intent, status: 'submitted', providerId: 'p0' });
  h.m.scheduled.length = 0;
  h.m.scheduled.push({ rasilJobId: h.m.table('emailCampaignRecipients').find(r => r.status === 'queued')._id });
  await sendAll();
  const done = (await owner('campaign_detail', { campaignId: campaign.id })).value.campaign;
  assert.deepEqual([done.status, done.counts.submitted, done.counts.queued, done.counts.pending], ['completed', 3, 0, 0]);
  assert.equal((await owner('state')).value.usage.month, 3);
});

test('a new domain sends 50 on its first day and continues the rest tomorrow', async () => {
  const { h, owner, maintain, subscribe, create, sendAll } = await rasilTenant();
  await subscribe(60);
  const { campaign } = (await create()).value;
  await maintain();
  assert.equal(await sendAll(), WARMUP_DAILY[0]);
  let c = (await owner('campaign_detail', { campaignId: campaign.id })).value.campaign;
  assert.deepEqual([c.status, c.reason, c.counts.submitted, c.counts.queued], ['processing', 'daily_limit', 50, 10]);
  h.m.advance(DAY);
  await maintain();
  assert.equal(await sendAll(), 10);
  c = (await owner('campaign_detail', { campaignId: campaign.id })).value.campaign;
  assert.deepEqual([c.status, c.reason, c.counts.submitted], ['completed', null, 60]);
});

test('the monthly allowance: a campaign larger than what is left is refused, and two campaigns cannot overspend', async () => {
  const { h, owner, subscribe, create } = await rasilTenant();
  await subscribe(10);
  await h.m.db.insert('emailUsage', { key: `m:${(await h.m.table('accounts'))[0]._id}:${new Date(h.m.now()).toISOString().slice(0, 7)}`, count: RASIL_MONTHLY_CAP - 15, expiresAt: h.m.now() + 40 * DAY });
  assert.equal((await create()).ok, true);
  assert.equal((await create()).reason, 'monthly_cap', '10 are reserved; 5 remain for 10 subscribers');
  assert.equal((await owner('campaign_preview', { subject: 'x', body: 'y' })).value.remaining, 5);
});

test('rate limits are retried with the same email; account problems stop the campaign', async () => {
  const { h, owner, maintain, subscribe, create, worker } = await rasilTenant();
  await subscribe(3);
  const { campaign } = (await create()).value;
  await maintain();
  const jobId = h.m.scheduled[0].rasilJobId;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const claim = await worker('claim', { jobId, intent: randomUUID() });
    assert.ok(claim.value, `attempt ${attempt}`);
    await worker('result', { jobId, intent: claim.value.intent, status: 'retry', reason: 'provider_unavailable' });
    h.m.advance(20 * 60000);
  }
  assert.equal((await h.m.db.get(jobId)).status, 'failed', 'three tries, then failed');
  const next = h.m.table('emailCampaignRecipients').find(r => r.status === 'queued');
  const claim = await worker('claim', { jobId: next._id, intent: randomUUID() });
  await worker('result', { jobId: next._id, intent: claim.value.intent, status: 'failed', campaignBlock: 'domain_not_verified' });
  const c = (await owner('campaign_detail', { campaignId: campaign.id })).value;
  assert.deepEqual([c.campaign.status, c.campaign.reason, c.campaign.counts.blocked, c.campaign.counts.failed], ['blocked', 'domain_not_verified', 1, 2]);
  assert.equal(c.problems.length, 3);
});

test('bounces and complaints end an address for good; opens count once; unsubscribing stops a queued send', async () => {
  const { h, owner, maintain, subscribe, create, worker, sendAll } = await rasilTenant();
  await subscribe(4);
  const { campaign } = (await create()).value;
  await maintain();
  await sendAll((job) => ({ status: 'submitted', providerId: `p-${job.to}` }));
  await worker('event', { type: 'email.delivered', providerId: 'p-s0@example.om' });
  await worker('event', { type: 'email.opened', providerId: 'p-s0@example.om' });
  await worker('event', { type: 'email.opened', providerId: 'p-s0@example.om' });
  await worker('event', { type: 'email.bounced', providerId: 'p-s1@example.om', bounceType: 'Transient' });
  await worker('event', { type: 'email.bounced', providerId: 'p-s2@example.om', bounceType: 'Permanent' });
  await worker('event', { type: 'email.complained', providerId: 'p-s3@example.om' });
  await worker('event', { type: 'email.delivered', providerId: 'p-s2@example.om' });
  const c = (await owner('campaign_detail', { campaignId: campaign.id })).value.campaign;
  assert.deepEqual([c.counts.delivered, c.counts.opened, c.counts.bounced, c.counts.complained, c.counts.submitted], [1, 1, 1, 1, 1]);
  assert.deepEqual((await owner('state')).value.subscribers, { pending: 0, subscribed: 2, unsubscribed: 0, suppressed: 2 });
  assert.equal((await owner('subscribers_import', { consent, rows: [{ email: 's2@example.om' }] })).value.kept, 1, 'a bounced address is not re-imported');

  const next = (await create()).value.campaign;
  assert.equal(next.recipientCount, 2);
  await maintain();
  const queued = h.m.table('emailCampaignRecipients').filter(r => r.campaignId === next.id && r.status === 'queued');
  const s0 = h.m.table('emailSubscribers').find(s => s.email === queued[1].email);
  assert.equal((await worker('unsubscribe', { subscriberId: s0._id })).value.business, 'Blue Studio');
  assert.equal((await h.m.db.get(queued[1]._id)).status, 'blocked');
  // Suppression is read again at the moment of sending, even if the queued row was missed.
  await h.m.db.patch(h.m.table('emailSubscribers').find(s => s.email === queued[0].email)._id, { status: 'unsubscribed' });
  assert.equal((await worker('claim', { jobId: queued[0]._id, intent: randomUUID() })).value, null);
  assert.deepEqual([(await h.m.db.get(queued[0]._id)).status, (await h.m.db.get(queued[0]._id)).reason], ['blocked', 'unsubscribed']);
});

test('the website form: double opt-in, the same answer for known addresses, and a limit on repeats', async () => {
  const { owner, worker } = await rasilTenant();
  const formKey = (await owner('state')).value.domain.formKey;
  assert.equal((await worker('subscribe_request', { formKey: 'unknown'.padEnd(24, 'x'), email: 'n@example.om' })).reason, 'form_unavailable');
  assert.equal((await worker('subscribe_request', { formKey, email: 'bad' })).reason, 'invalid_email');
  const first = (await worker('subscribe_request', { formKey, email: 'New@Example.om', name: 'Nasser', lang: 'ar' })).value;
  assert.deepEqual([first.send, first.email, first.lang, first.sender.fromLocal, first.business.name], [true, 'new@example.om', 'ar', 'news', 'Blue Studio']);
  assert.equal((await owner('state')).value.subscribers.pending, 1, 'not on the list until they confirm');
  assert.equal((await owner('campaign_preview', { subject: 'x', body: 'y' })).value.eligible, 0);
  await worker('subscribe_request', { formKey, email: 'new@example.om' });
  await worker('subscribe_request', { formKey, email: 'new@example.om' });
  assert.equal((await worker('subscribe_request', { formKey, email: 'new@example.om' })).value.send, false, 'three confirmation emails a day at most');
  assert.deepEqual((await worker('subscribe_confirm', { subscriberId: first.subscriberId })).value, { status: 'subscribed', business: 'Blue Studio' });
  const again = (await worker('subscribe_request', { formKey, email: 'new@example.om' })).value;
  assert.deepEqual(Object.keys(again).sort(), Object.keys(first).sort(), 'a known address gets the same shape of answer');
  assert.equal(again.send, false);
  assert.equal((await owner('subscribers', { status: 'subscribed' })).value.items[0].source, 'website');
});

test('tenants cannot see or touch another tenant’s campaigns or subscribers', async () => {
  const one = await rasilTenant();
  await one.subscribe(1);
  const { campaign } = (await one.create({ scheduledAt: one.h.m.now() + 3600000 })).value;
  const subscriber = (await one.owner('subscribers')).value.items[0];
  const other = await seedTenant(one.h.m, { name: 'z', plan: 'ascend', phone: '7777', waba: '6666', sender: '96890000009' });
  const as = (operation, args) => executeRasil(one.h.m.ctx, { operation, sessionHash: other.sessionHash, ...args }, one.h.m.now());
  assert.equal((await as('campaign_detail', { campaignId: campaign.id })).reason, 'campaign_not_found');
  assert.equal((await as('campaign_cancel', { campaignId: campaign.id })).reason, 'campaign_not_found');
  assert.equal((await as('subscriber_unsubscribe', { subscriberId: subscriber.id })).reason, 'subscriber_not_found');
  assert.deepEqual((await as('subscribers')).value.items, []);
  assert.equal((await one.owner('campaign_cancel', { campaignId: campaign.id })).value.campaign.status, 'cancelled');
});
