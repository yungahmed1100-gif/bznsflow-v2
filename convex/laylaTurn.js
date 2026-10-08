// What Layla's AI turn reads about one conversation, gathered in one bounded pass.
// Ingest records a pending reply on the conversation; the reply action reads this context,
// asks the model, and hands the checked reply back to the commit operation.
//
// The live reply and BznsBrain's Test Layla build their context here, through the same two steps:
// `loadTurnSources` reads what the business has approved (or, for a draft test, what it is
// editing), and `composeTurnContext` turns it into the model's view. Only the conversation differs.
import { teamContactOf, langOf } from '../config/layla-tones.js';
import { profileSections } from '../config/layla-ai.js';
import { NAME_FIELD, qualificationPack } from '../config/layla-qualification.js';
import { effectiveBehaviour } from '../config/layla-behaviour.js';
import { parseBzns } from '../src/lib/bzns-doc.js';
import { approvedKnowledge, publishedSections } from './knowledgeSourceState.js';
import { HASIB_PLANS, planFor } from './hasib/plans.js';

// Debounce: a customer's quick run of messages gets one answer.
export const REPLY_DEBOUNCE_MS = 2500;
const DAY = 86400000;
// AI intents that Today's reception counts read from the inbound message's topic.
export const TOPIC_FOR_INTENT = Object.freeze({ prices: 'prices', services: 'services', hours: 'hours', location: 'location', booking: 'disabled', human: 'human' });

/** Catalog rows belong to the account, or to the setup itself until it is saved to an account. */
export const catalogOwnerKey = row => (row?.accountId ? String(row.accountId) : `review_${row?._id}`);

/**
 * Catalyst accounts (and setups not yet saved to an account) run BznsBrain: behaviour settings, the
 * reception flow and source labels. Ascend keeps its own prompt and qualification exactly as before.
 * @returns {Promise<'brain'|'legacy'>}
 */
export async function turnMode(ctx, row) {
  if (!row?.accountId) return 'brain';
  return HASIB_PLANS.includes(await planFor(ctx, row.accountId)) ? 'legacy' : 'brain';
}

const catalogShape = ({ entryKey, nameEn, nameAr, category, availability, prices, benefitEn, benefitAr, descriptionEn, descriptionAr }) =>
  ({ entryKey, nameEn, nameAr, category, availability, prices, benefitEn, benefitAr, descriptionEn, descriptionAr });
/**
 * The catalog with everything Layla may say about it. Published: approved entries as approved.
 * Draft (Test Layla only): approved entries with their staged edits, plus unpublished drafts.
 */
export async function catalogForTurn(ctx, ownerKey, limit = 200, variant = 'published') {
  const approved = await ctx.db.query('blueCatalogEntries').withIndex('by_owner_status_order', q => q.eq('ownerKey', String(ownerKey)).eq('status', 'approved')).take(limit);
  if (variant !== 'draft') return approved.map(catalogShape);
  const drafts = await ctx.db.query('blueCatalogEntries').withIndex('by_owner_status_order', q => q.eq('ownerKey', String(ownerKey)).eq('status', 'draft')).take(limit);
  return [...approved.map(row => (row.pending ? { ...row, ...row.pending } : row)), ...drafts].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, limit).map(catalogShape);
}

/** The chat so far, oldest first: only messages whose text is still retained. */
export async function transcript(ctx, conversationId, now, limit = 30) {
  const rows = await ctx.db.query('blueMessages').withIndex('by_conversation_at', q => q.eq('conversationId', conversationId).gte('at', now - 7 * DAY)).order('desc').take(limit);
  return rows.reverse().filter(m => typeof m.text === 'string' && m.text.trim() && m.status !== 'blocked')
    .map(m => ({ role: m.direction === 'in' ? 'customer' : m.direction === 'human' || m.manual ? 'team' : 'layla', text: m.text }));
}

const sectionsOf = markdown => parseBzns(markdown || '').sections.filter(s => String(s.body || '').trim() && !/\[[^\]\n]{2,80}\]/.test(s.body)).map(({ key, heading, body }) => ({ key, heading, body }));
/**
 * What the business has approved for Layla to say, or (variant 'draft') what the owner is editing.
 * Draft testing reads the bzns.md draft and the catalog's drafts and staged edits; published reads
 * exactly what a customer's reply reads.
 */
export async function loadTurnSources(ctx, row, { variant = 'published', sectorId, mode } = {}) {
  const resolvedMode = mode || await turnMode(ctx, row);
  const [catalog, knowledge, published] = await Promise.all([
    catalogForTurn(ctx, catalogOwnerKey(row), 200, variant),
    row.accountId ? approvedKnowledge(ctx, row.accountId) : [],
    variant === 'draft' ? [] : publishedSections(ctx, row.accountId, row.bznsPublished?.revision),
  ]);
  // Published: the stored sections of the published revision; a setup not yet saved to an account has none stored, so its published text is read directly.
  const sections = variant === 'draft' ? sectionsOf(row.bznsDraft?.markdown ?? row.bznsPublished?.markdown)
    : published.length ? published : row.accountId ? [] : sectionsOf(row.bznsPublished?.markdown);
  return { mode: resolvedMode, variant, catalog, knowledge, sections,
    behaviour: resolvedMode === 'brain' ? effectiveBehaviour(row, sectorId) : null };
}

/**
 * The model's view of one turn, from the business's sources and one conversation. Pure.
 * @returns {import('../config/layla-ai.js').TurnContext}
 */
export function composeTurnContext({ row, sectorId, sources, history, contact, pending }) {
  const pack = qualificationPack(sectorId);
  const brain = sources.mode === 'brain';
  const askField = pending.askKey === NAME_FIELD.key ? NAME_FIELD : pack.fields.find(f => f.key === pending.askKey);
  // Accounts set up before bzns.md: their reviewed profile is the document (prices stay catalog-only).
  const document = sources.sections.length ? sources.sections : profileSections(row.profile);
  const latest = history.filter(h => h.role === 'customer').at(-1)?.text || '';
  return {
    business: { name: row.profile?.businessName || '', sector: row.profile?.sector || '', sectorId },
    tone: brain ? sources.behaviour.tone : row.profile?.tone, channel: row.integration?.channel === 'instagram' ? 'instagram' : 'whatsapp',
    teamContact: teamContactOf(row.profile), sections: document, catalog: sources.catalog,
    knowledge: sources.knowledge.map(k => ({ title: k.title, text: k.text })),
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
    ...(brain ? { mode: 'brain', handoffNote: sources.behaviour.handoffNote, reception: !!pending.reception, override: pending.override || null } : {}),
  };
}

/**
 * The model's view of this live turn. Facts and order lines were decided by ingest, deterministically.
 * @returns {Promise<import('../config/layla-ai.js').TurnContext>}
 */
export async function turnContext(ctx, { row, person, contact, pending, sectorId, now }) {
  const [sources, history] = await Promise.all([loadTurnSources(ctx, row, { sectorId }), transcript(ctx, person._id, now)]);
  return composeTurnContext({ row, sectorId, sources, history, contact, pending });
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
