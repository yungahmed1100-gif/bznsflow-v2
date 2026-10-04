import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

const clean = (value: unknown, length: number) => typeof value === 'string' && value.trim() ? value.trim().slice(0, length) : undefined;

export const execute = internalMutation({
  args: {
    operation: v.union(v.literal('capture_website_lead'), v.literal('check_rate'), v.literal('start_turn'), v.literal('finish_turn')),
    email: v.optional(v.string()), name: v.optional(v.string()), phone: v.optional(v.string()), country: v.optional(v.string()), industry: v.optional(v.string()),
    lang: v.optional(v.union(v.literal('ar'), v.literal('en'))), sourceKey: v.optional(v.string()), sourceUrl: v.optional(v.string()), sourceCta: v.optional(v.string()), verified: v.optional(v.boolean()),
    ipBucket: v.optional(v.string()), globalBucket: v.optional(v.string()),
    sessionKey: v.optional(v.string()), message: v.optional(v.string()), historyLen: v.optional(v.number()), conversationId: v.optional(v.id('greenChatConversations')), reply: v.optional(v.string()), handoff: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.operation === 'capture_website_lead') {
      const email = clean(args.email, 254)?.toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: 'invalid_email' };
      const existing = await ctx.db.query('greenWebsiteLeads').withIndex('by_email', q => q.eq('email', email)).unique();
      const data = {
        email,
        ...(clean(args.name, 100) ? { name: clean(args.name, 100) } : {}),
        ...(clean(args.phone, 40) ? { phone: clean(args.phone, 40) } : {}),
        ...(clean(args.country, 80) ? { country: clean(args.country, 80) } : {}),
        ...(clean(args.industry, 80) ? { industry: clean(args.industry, 80) } : {}),
        ...(args.lang ? { lang: args.lang } : {}),
        sourceKey: clean(args.sourceKey, 60) || 'website_form',
        ...(clean(args.sourceUrl, 500) ? { sourceUrl: clean(args.sourceUrl, 500) } : {}),
        ...(clean(args.sourceCta, 100) ? { sourceCta: clean(args.sourceCta, 100) } : {}),
        verified: args.verified === true,
        updatedAt: now,
      };
      if (existing) await ctx.db.patch(existing._id, data);
      else await ctx.db.insert('greenWebsiteLeads', { ...data, createdAt: now });
      return { ok: true, value: { email, updated: !!existing } };
    }
    if (args.operation === 'check_rate') {
      const keys = [args.ipBucket, args.globalBucket];
      if (keys.some(key => !key || key.length > 180)) return { ok: false, reason: 'invalid_bucket' };
      const counts: number[] = [];
      for (const key of keys as string[]) {
        const row = await ctx.db.query('greenRateLimits').withIndex('by_key', q => q.eq('key', key)).unique();
        if (!row || row.expiresAt <= now) {
          if (row) await ctx.db.patch(row._id, { count: 1, expiresAt: now + 86400000 });
          else await ctx.db.insert('greenRateLimits', { key, count: 1, expiresAt: now + 86400000 });
          counts.push(1);
        } else {
          await ctx.db.patch(row._id, { count: row.count + 1 });
          counts.push(row.count + 1);
        }
      }
      const stale = await ctx.db.query('greenRateLimits').withIndex('by_expiry', q => q.lte('expiresAt', now)).take(10);
      for (const row of stale) await ctx.db.delete(row._id);
      return { ok: true, value: { ip_hits: counts[0], global_hits: counts[1] } };
    }
    if (args.operation === 'start_turn') {
      const sessionKey = clean(args.sessionKey, 100), message = clean(args.message, 800);
      if (!sessionKey || !message || !args.lang) return { ok: false, reason: 'invalid_turn' };
      let conversation = await ctx.db.query('greenChatConversations').withIndex('by_session_key', q => q.eq('sessionKey', sessionKey)).unique();
      if (!conversation) {
        const id = await ctx.db.insert('greenChatConversations', { sessionKey, lang: args.lang, handoff: false, lastAt: now, createdAt: now });
        conversation = await ctx.db.get(id);
      }
      const historyLimit = Math.max(0, Math.min(40, Math.floor(args.historyLen || 20)));
      const recent = await ctx.db.query('greenChatMessages').withIndex('by_conversation_seq', q => q.eq('conversationId', conversation!._id)).order('desc').take(historyLimit);
      const nextSeq = (recent[0]?.seq || 0) + 1;
      const history = recent.reverse().map(({ seq, role, content }) => ({ seq, role, content }));
      await ctx.db.insert('greenChatMessages', { conversationId: conversation!._id, seq: nextSeq, role: 'user', content: message, createdAt: now });
      await ctx.db.patch(conversation!._id, { lang: args.lang, lastAt: now });
      return { ok: true, value: { conversation_id: conversation!._id, history } };
    }
    if (!args.conversationId || typeof args.reply !== 'string' || args.reply.length > 1200) return { ok: false, reason: 'invalid_turn' };
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return { ok: false, reason: 'conversation_not_found' };
    const recent = await ctx.db.query('greenChatMessages').withIndex('by_conversation_seq', q => q.eq('conversationId', conversation._id)).order('desc').take(1);
    await ctx.db.insert('greenChatMessages', { conversationId: conversation._id, seq: (recent[0]?.seq || 0) + 1, role: 'assistant', content: args.reply, createdAt: now });
    await ctx.db.patch(conversation._id, { handoff: !!args.handoff, lastAt: now });
    return { ok: true, value: null };
  },
});
