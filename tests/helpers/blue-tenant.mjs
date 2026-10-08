import { randomUUID } from 'node:crypto';
import { executeMessaging } from '../../convex/blueMessagingState.js';
import { executeDashboard } from '../../convex/blueDashboardState.js';
import { executeAudience } from '../../convex/blueAudienceState.js';
import { executeCampaigns, executeCampaignWorker, maintainCampaigns } from '../../convex/blueCampaignState.js';
import { convexMemory, SECRET, APP } from './convex-memory.mjs';
import { runReplyTurn } from '../../convex/laylaRespond.js';
import { REPLY_DEBOUNCE_MS } from '../../convex/laylaTurn.js';

export const profileFor = (sector = 'Real estate') => ({ businessName: 'Blue Studio', sector, services: 'Villas and apartments', prices: 'From 500 OMR', hours: '9–5', location: 'Muscat', humanContact: 'team@example.com', reviewed: true });

/** Seed one verified, connected, approved and activated tenant. */
export async function seedTenant(m, { name = 'a', sector = 'Real estate', phone = '5678', waba = '1234', sender = '96890000000', plan = 'catalyst' } = {}) {
  const accountId = await m.db.insert('accounts', { email: `${name}@example.com`, role: 'customer', createdAt: m.now() });
  await m.db.insert('blueAccessGrants', {email: `${name}@example.com`, plan, status: 'active', grantedAt:m.now(), grantedBy:'ahmed@bznsflowai.com'});
  const sessionHash = name.charCodeAt(0).toString(16).padStart(2, '0').repeat(32);
  const integration = { id: randomUUID(), app: APP, waba, phone, sender, path: 'new_number', credential: { v: 1, iv: 'x', data: 'x', tag: 'x' } };
  const rowId = await m.db.insert('blueReviewSessions', { accountId, sessionHash, expiresAt: 1e15, status: 'connected', profile: profileFor(sector), profileVersion: 1,
    checkedAt: m.now(), connectionChecks: { routing: true, registered: true, path: true }, integration, phone, waba, createdAt: m.now(), updatedAt: m.now(), attempts: 0 });
  await m.db.patch(accountId, { draftHash: sessionHash });
  return { accountId, sessionHash, integration, rowId };
}

export function blueHarness() {
  const m = convexMemory();
  const withSecret = args => ({ hashSecret: SECRET, workerFunction: 'dispatch', ...args });
  const messaging = (operation, args = {}) => executeMessaging(m.ctx, withSecret({ operation, ...args }), m.now());
  const dashboard = (operation, args = {}) => executeDashboard(m.ctx, withSecret({ operation, ...args }), m.now());
  const audience = (operation, args = {}) => executeAudience(m.ctx, withSecret({ operation, ...args }), m.now());
  const campaigns = (operation, args = {}) => executeCampaigns(m.ctx, withSecret({ operation, ...args }), m.now());
  const worker = (operation, args = {}) => executeCampaignWorker(m.ctx, withSecret({ operation, ...args }), m.now());
  const maintain = () => maintainCampaigns(m.ctx, withSecret({}), m.now());
  const enable = async () => {
    await m.db.insert('blueMessagingSettings', { key: 'global', enabled: true, rolloutMode:'live',smokeVerifiedAt:1,smokeEvidence:'synthetic-test' });
    await m.db.insert('blueMessagingSettings', { key: 'broadcast', enabled: true });
  };
  /**
   * Layla's pending AI turns, run as the debounced reply action does. `reply` is what the stand-in
   * model writes (null or '' means no reply); the real checks and commit still decide what is sent.
   */
  const turns = async (reply = 'Thanks', { advance = true } = {}) => {
    if (advance) m.advance(REPLY_DEBOUNCE_MS);
    const generate = async () => ({ text: JSON.stringify(reply ? { reply, intent: 'answer' } : { reply: '', no_reply: true, intent: 'ack' }), usage: { input: 1, output: 1 }, ms: 1, model: 'test-model' });
    const results = [];
    for (const c of m.table('blueConversations').filter(c => c.pendingReply)) results.push(await runReplyTurn({ exec: messaging, conversationId: c._id, key: c.pendingReply.key, generate }));
    return results;
  };
  const inbound = async (tenant, { id = randomUUID(), from = '96891111111', text = 'Hello', reply = 'Thanks', intent = 'services', profileName, handoff = false, turn = true } = {}) => {
    const result = await messaging('ingest', { integrationId: tenant.integration.id, events: [{ kind: 'message', id, from, at: m.now(), text, reply, intent, handoff, ...(profileName ? { profileName } : {}) }] });
    if (turn && result.ok) await turns(reply, { advance: false });
    return result;
  };
  return { m, messaging, dashboard, audience, campaigns, worker, maintain, enable, inbound, turns };
}
