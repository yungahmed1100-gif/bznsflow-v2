import { internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { v, type Value } from 'convex/values';
import { executeRasil, executeRasilWorker, maintainRasil } from './rasilState.js';

type Result = Promise<{ ok: boolean; value?: Value; reason?: string }>;
const record = v.object({ type: v.string(), name: v.string(), value: v.string(), priority: v.optional(v.number()), status: v.string() });

// Owner operations, from the signed-in dashboard through the bearer-authenticated /rasil route.
export const execute = internalMutation({
  args: {
    operation: v.union(...['state', 'domain_context', 'domain_save', 'domain_status', 'sender_save', 'subscribers', 'subscribers_import', 'subscriber_unsubscribe',
      'draft_context', 'campaign_preview', 'campaign_create', 'campaigns', 'campaign_detail', 'campaign_cancel'].map(s => v.literal(s))),
    sessionHash: v.string(), actorAccountId: v.optional(v.string()),
    domain: v.optional(v.string()), resendDomainId: v.optional(v.string()), records: v.optional(v.array(record)), status: v.optional(v.string()), formKey: v.optional(v.string()),
    fromName: v.optional(v.string()), fromLocal: v.optional(v.string()), replyTo: v.optional(v.string()),
    cursor: v.optional(v.string()), subscriberId: v.optional(v.string()), origin: v.optional(v.string()),
    rows: v.optional(v.array(v.object({ email: v.string(), name: v.optional(v.string()) }))),
    consent: v.optional(v.object({ source: v.string(), date: v.string(), purpose: v.string(), attested: v.boolean() })),
    requestId: v.optional(v.string()), confirm: v.optional(v.boolean()), name: v.optional(v.string()), subject: v.optional(v.string()), body: v.optional(v.string()),
    lang: v.optional(v.string()), scheduledAt: v.optional(v.number()), timezone: v.optional(v.string()), campaignId: v.optional(v.string()),
  },
  handler: (ctx, args): Result => executeRasil(ctx, args),
});

// The send worker, Resend's events and the public subscribe/unsubscribe links, all via the Vercel API.
export const worker = internalMutation({
  args: {
    operation: v.union(...['claim', 'result', 'event', 'unsubscribe', 'subscribe_request', 'subscribe_confirm'].map(s => v.literal(s))),
    jobId: v.optional(v.id('emailCampaignRecipients')), intent: v.optional(v.string()), status: v.optional(v.string()), providerId: v.optional(v.string()),
    reason: v.optional(v.string()), campaignBlock: v.optional(v.string()), type: v.optional(v.string()), bounceType: v.optional(v.string()),
    subscriberId: v.optional(v.id('emailSubscribers')), formKey: v.optional(v.string()), email: v.optional(v.string()), name: v.optional(v.string()), lang: v.optional(v.string()),
  },
  handler: (ctx, args): Result => executeRasilWorker(ctx, { ...args, workerFunction: internal.blueMessaging.dispatch }),
});

export const maintain = internalMutation({ args: {}, handler: async (ctx): Promise<void> => { await maintainRasil(ctx, { workerFunction: internal.blueMessaging.dispatch }); } });
