// What Layla's AI turn reads about one conversation, gathered in one bounded pass.
// Ingest records a pending reply on the conversation; the reply action reads this context,
// asks the model, and hands the checked reply back to the commit operation.
import { teamContactOf, langOf } from '../config/layla-tones.js';
import { profileSections } from '../config/layla-ai.js';
import { NAME_FIELD, qualificationPack } from '../config/layla-qualification.js';
import { approvedKnowledge, publishedSections } from './knowledgeSourceState.js';

// Debounce: a customer's quick run of messages gets one answer.
export const REPLY_DEBOUNCE_MS = 2500;
const DAY = 86400000;
// AI intents that Today's reception counts read from the inbound message's topic.
export const TOPIC_FOR_INTENT = Object.freeze({ prices: 'prices', services: 'services', hours: 'hours', location: 'location', booking: 'disabled', human: 'human' });

/** The approved catalog with everything Layla may say about it. */
export async function catalogForTurn(ctx, accountId, limit = 200) {
  const rows = await ctx.db.query('blueCatalogEntries').withIndex('by_owner_status_order', q => q.eq('ownerKey', String(accountId)).eq('status', 'approved')).take(limit);
  return rows.map(({ nameEn, nameAr, category, availability, prices, benefitEn, benefitAr, descriptionEn, descriptionAr }) =>
    ({ nameEn, nameAr, category, availability, prices, benefitEn, benefitAr, descriptionEn, descriptionAr }));
}

/** The chat so far, oldest first: only messages whose text is still retained. */
export async function transcript(ctx, conversationId, now, limit = 30) {
  const rows = await ctx.db.query('blueMessages').withIndex('by_conversation_at', q => q.eq('conversationId', conversationId).gte('at', now - 7 * DAY)).order('desc').take(limit);
  return rows.reverse().filter(m => typeof m.text === 'string' && m.text.trim() && m.status !== 'blocked')
    .map(m => ({ role: m.direction === 'in' ? 'customer' : m.direction === 'human' || m.manual ? 'team' : 'layla', text: m.text }));
}

/**
 * The model's view of this turn. Facts and order lines were decided by ingest, deterministically.
 * @returns {Promise<import('../config/layla-ai.js').TurnContext>}
 */
export async function turnContext(ctx, { row, person, contact, pending, sectorId, now }) {
  const pack = qualificationPack(sectorId);
  const [catalog, knowledge, sections, history] = await Promise.all([
    catalogForTurn(ctx, row.accountId), approvedKnowledge(ctx, row.accountId),
    publishedSections(ctx, row.accountId, row.bznsPublished?.revision), transcript(ctx, person._id, now),
  ]);
  const askField = pending.askKey === NAME_FIELD.key ? NAME_FIELD : pack.fields.find(f => f.key === pending.askKey);
  // Accounts set up before bzns.md: their reviewed profile is the document (prices stay catalog-only).
  const document = sections.length ? sections : profileSections(row.profile);
  const latest = history.filter(h => h.role === 'customer').at(-1)?.text || '';
  return {
    business: { name: row.profile?.businessName || '', sector: row.profile?.sector || '', sectorId },
    tone: row.profile?.tone, channel: row.integration?.channel === 'instagram' ? 'instagram' : 'whatsapp',
    teamContact: teamContactOf(row.profile), sections: document, catalog,
    knowledge: knowledge.map(k => ({ title: k.title, text: k.text })),
    facts: pending.facts || [], acks: pending.acks || [],
    customer: {
      name: contact?.customerName || contact?.ownerName || '',
      fields: (contact?.fields || []).filter(f => f.value).map(f => ({ label: pack.fields.find(x => x.key === f.key)?.en || f.key, value: f.value })),
    },
    ask: askField ? { key: askField.key, en: askField.ask.en, ar: askField.ask.ar } : null,
    firstReply: !!pending.firstReply, history, notes: pending.notes || {},
    fieldKeys: [NAME_FIELD.key, ...pack.fields.map(f => f.key)],
    fieldOptions: Object.fromEntries(pack.fields.filter(f => f.options?.length).map(f => [f.key, f.options.map(o => ({ id: o.id, words: o.match || [o.en, o.ar] }))])),
    lang: langOf(latest),
  };
}

/**
 * What Layla may quote changed (catalog approved, archived or published): bump the business's
 * profile version so replies written from the old catalog are fenced out at claim and send time.
 */
export async function fenceRepliesForOwner(ctx, ownerKey, now) {
  const accountId = ctx.db.normalizeId('accounts', ownerKey);
  const account = accountId ? await ctx.db.get(accountId) : null;
  const session = account?.draftHash ? await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', account.draftHash)).unique() : null;
  if (session) await ctx.db.patch(session._id, { profileVersion: (session.profileVersion || 1) + 1, updatedAt: now });
  return !!session;
}
