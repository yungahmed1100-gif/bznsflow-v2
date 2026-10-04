import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

const account = v.object({
  id: v.string(), email: v.string(), name: v.optional(v.string()), phone: v.optional(v.string()),
  country: v.optional(v.string()), industry: v.optional(v.string()), lang: v.optional(v.union(v.literal('ar'), v.literal('en'))),
  verifiedAt: v.optional(v.number()), createdAt: v.number(), lastLoginAt: v.optional(v.number()), crmSynced: v.boolean(),
});
const identity = v.object({ id: v.string(), provider: v.union(v.literal('google'), v.literal('linkedin')), subject: v.string(), email: v.string(), createdAt: v.number() });
const conversation = v.object({ id: v.string(), sessionKey: v.string(), lang: v.union(v.literal('ar'), v.literal('en')), handoff: v.boolean(), lastAt: v.number(), createdAt: v.number() });
const message = v.object({ id: v.string(), conversationId: v.string(), role: v.union(v.literal('user'), v.literal('assistant')), content: v.string(), createdAt: v.number(), seq: v.number() });

// Only callable through the service-authenticated /green-migrate HTTP action.
// Legacy sessions, OTP challenges, rate limits and synthetic Meta mock state are
// intentionally excluded. Stable source IDs make retries idempotent.
export const importReviewed = internalMutation({
  args: {
    accounts: v.array(account), identities: v.array(identity), conversations: v.array(conversation), messages: v.array(message),
    expected: v.object({ accounts: v.number(), identities: v.number(), conversations: v.number(), messages: v.number() }),
  },
  handler: async (ctx, args) => {
    for (const key of ['accounts', 'identities', 'conversations', 'messages'] as const) {
      if (args[key].length !== args.expected[key]) throw new Error(`migration_count_mismatch:${key}`);
    }
    const accountIds = new Map<string, any>();
    for (const row of args.accounts) {
      const email = row.email.trim().toLowerCase();
      if (!email || !row.id || !Number.isFinite(row.createdAt)) throw new Error('migration_invalid_account');
      const existing = await ctx.db.query('accounts').withIndex('by_legacy_source', q => q.eq('legacySourceId', row.id)).unique()
        ?? await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', email)).unique();
      const fields = {
        email, ...(row.name ? { name: row.name } : {}), ...(row.phone ? { phone: row.phone } : {}),
        ...(row.country ? { country: row.country } : {}), ...(row.industry ? { industry: row.industry } : {}),
        ...(row.lang ? { lang: row.lang } : {}), ...(row.verifiedAt ? { profileComplete: true } : {}),
        crmSynced: row.crmSynced, role: email === 'ahmed@bznsflowai.com' ? 'owner' as const : 'customer' as const,
      };
      const id = existing?._id ?? await ctx.db.insert('accounts', { ...fields, legacySourceId: row.id, createdAt: row.createdAt, migratedFromGreen: true });
      if (existing) await ctx.db.patch(id, { ...fields, legacySourceId: row.id, migratedFromGreen: true });
      accountIds.set(email, id);
    }
    for (const row of args.identities) {
      const owner = accountIds.get(row.email.trim().toLowerCase());
      if (!owner) throw new Error('migration_identity_account_missing');
      const existing = await ctx.db.query('blueOAuthIdentities').withIndex('by_legacy_source', q => q.eq('legacySourceId', row.id)).unique()
        ?? await ctx.db.query('blueOAuthIdentities').withIndex('by_provider_subject', q => q.eq('provider', row.provider).eq('subject', row.subject)).unique();
      if (existing) await ctx.db.patch(existing._id, { provider: row.provider, subject: row.subject, accountId: owner, legacySourceId: row.id });
      else await ctx.db.insert('blueOAuthIdentities', { provider: row.provider, subject: row.subject, accountId: owner, legacySourceId: row.id, createdAt: row.createdAt });
    }
    const conversationsByLegacyId = new Map<string, any>();
    for (const row of args.conversations) {
      if (!row.sessionKey || !row.id) throw new Error('migration_invalid_conversation');
      const existing = await ctx.db.query('greenChatConversations').withIndex('by_legacy_source', q => q.eq('legacySourceId', row.id)).unique()
        ?? await ctx.db.query('greenChatConversations').withIndex('by_session_key', q => q.eq('sessionKey', row.sessionKey)).unique();
      const values = { sessionKey: row.sessionKey, lang: row.lang, handoff: row.handoff, lastAt: row.lastAt, createdAt: row.createdAt, legacySourceId: row.id };
      const id = existing?._id ?? await ctx.db.insert('greenChatConversations', values);
      if (existing) await ctx.db.patch(id, values);
      conversationsByLegacyId.set(row.id, id);
    }
    for (const row of args.messages) {
      const conversationId = conversationsByLegacyId.get(row.conversationId);
      if (!conversationId) throw new Error('migration_message_conversation_missing');
      const existing = await ctx.db.query('greenChatMessages').withIndex('by_legacy_source', q => q.eq('legacySourceId', row.id)).unique();
      const values = { conversationId, seq: row.seq, role: row.role, content: row.content, createdAt: row.createdAt, legacySourceId: row.id };
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert('greenChatMessages', values);
    }
    return { ok: true, imported: args.expected, excluded: { sessions: 'all_expired', otpChallenges: 'not_migrated', rateLimits: 'ephemeral', syntheticMetaStates: 'not_migrated' } };
  },
});

export const verify = internalQuery({
  args: { expected: v.object({ accounts: v.number(), identities: v.number(), conversations: v.number(), messages: v.number() }) },
  handler: async (ctx, { expected }) => {
    const [accounts, identities, conversations, messages] = await Promise.all([
      ctx.db.query('accounts').collect(), ctx.db.query('blueOAuthIdentities').collect(),
      ctx.db.query('greenChatConversations').collect(), ctx.db.query('greenChatMessages').collect(),
    ]);
    const actual = {
      accounts: accounts.filter(row => row.migratedFromGreen).length,
      identities: identities.filter(row => row.legacySourceId).length,
      conversations: conversations.filter(row => row.legacySourceId).length,
      messages: messages.filter(row => row.legacySourceId).length,
    };
    const accountById = new Map(accounts.map(row => [row._id, row]));
    const conversationsById = new Map(conversations.map(row => [row._id, row]));
    const identitiesLinked = identities.filter(row => row.legacySourceId).every(row => accountById.has(row.accountId));
    const messagesLinked = messages.filter(row => row.legacySourceId).every(row => conversationsById.has(row.conversationId));
    const sequencesUnique = conversations.filter(row => row.legacySourceId).every(conversation => {
      const seqs = messages.filter(message => message.conversationId === conversation._id).map(message => message.seq);
      return new Set(seqs).size === seqs.length;
    });
    const ownerCorrect = accounts.filter(row => row.email === 'ahmed@bznsflowai.com' && row.role === 'owner').length === 1;
    const integrity = { identitiesLinked, messagesLinked, sequencesUnique, ownerCorrect };
    return { ok: Object.keys(expected).every(key => actual[key as keyof typeof actual] === expected[key as keyof typeof expected])
      && Object.values(integrity).every(Boolean), actual, integrity };
  },
});
