// Media's automatic run (Hasib on a schedule):
// 1. bring tasks and rule drafts up to date, then send the rule messages whose rule is set to Auto;
// 2. a complete brief with no quote gets one: Hasib sends it himself only when every line has a
//    fixed catalog price and the total is within the studio's limit; otherwise Adiba drafts it for the owner;
// 3. proposed extra scope becomes an Adiba offer the owner approves; the customer's yes decides it.
// Each send passes the shared fences; anything that may not go out waits, with its reason. Bounded per run.
import { refreshStudio } from './mediaBoard.js';
import { briefGaps } from './mediaDomain.js';
import { sendAutoRuleDrafts, MAX_SENDS_PER_RUN } from './workspace/autoRun.js';
import { automationActor } from './workspace/automation.js';
import { workspaceForManager } from './workspaceState.js';
import { draftOffer, approveAutomatically, cancelStaleOffer, OPEN_STATUSES } from './adiba.js';

export { MAX_SENDS_PER_RUN };
export const MAX_QUOTES_PER_RUN = 5;
const ARABIC = /[؀-ۿ]/;

const sendRuleMessages = (ctx, tenant, studio, settings, actor, now) => sendAutoRuleDrafts(ctx, tenant, { drafts: studio.drafts, rules: settings.rules, keyPrefix: 'media-draft', actor,
  links: draft => ({ mediaProductionId: draft.productionId, mediaDraftId: draft._id }) }, now);

async function langOf(ctx, conversationId) {
  const last = conversationId ? await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversationId).eq('direction', 'in')).order('desc').first() : null;
  return last?.text && ARABIC.test(last.text) ? 'ar' : 'en';
}

async function openOffers(ctx, subjectType, subjectId) {
  return (await ctx.db.query('adibaOffers').withIndex('by_subject', q => q.eq('subjectType', subjectType).eq('subjectId', String(subjectId))).take(20)).filter(o => OPEN_STATUSES.includes(o.status));
}

/** Complete briefs get a quote: by Hasib when nothing needs the owner, else as Adiba's draft. */
async function quoteBriefs(ctx, tenant, studio, settings, actor, now) {
  const catalog = new Map((await ctx.db.query('blueCatalogEntries').withIndex('by_owner_status_order', q => q.eq('ownerKey', String(tenant.accountId)).eq('status', 'approved')).take(200)).map(r => [r.entryKey, r]));
  let quoted = 0;
  for (const p of studio.productions) {
    if (quoted >= MAX_QUOTES_PER_RUN) break;
    const open = await openOffers(ctx, 'media_production', p._id);
    // Staff moved the brief on by hand: an unsent draft for it is no longer the quote.
    if (p.status !== 'brief_incomplete' || p.quoteMinor) { for (const o of open) if (o.status !== 'sent') await cancelStaleOffer(ctx, o, now); continue; }
    if (briefGaps(p).length || open.length) continue;
    const named = (p.catalogEntryKeys || []).map(k => catalog.get(k)).filter(Boolean);
    const lines = named.length ? named.map((r, i) => ({ key: `l${i + 1}`, name: r.nameEn || r.nameAr, qty: 1, catalogPrices: r.prices, catalogEntryKey: r.entryKey }))
      : [{ key: 'l1', name: p.title, qty: 1, custom: true }];
    const offer = await draftOffer(ctx, tenant, { requestId: `media-quote:${p._id}`, packId: 'media', kind: 'quote', subjectType: 'media_production', subjectId: p._id,
      contactId: p.contactId, conversationId: p.conversationId, lang: await langOf(ctx, p.conversationId), lines, limitMinor: settings.autoQuoteLimitMinor || 0,
      depositPercent: settings.depositPercent, validDays: settings.quoteWindowDays }, now);
    if (!offer.reasons.length && offer.status === 'awaiting_approval' && (await approveAutomatically(ctx, tenant, actor, offer, now)).ok) quoted++;
  }
  return quoted;
}

/** Proposed extra scope becomes an offer; one decided by hand cancels its unsent offer. */
async function offerExtraScope(ctx, tenant, studio, now) {
  const productions = new Map(studio.productions.map(p => [String(p._id), p]));
  for (const c of studio.changeOrders) {
    const open = await openOffers(ctx, 'media_change_order', c._id);
    if (c.status !== 'proposed') { for (const o of open) if (o.status !== 'sent') await cancelStaleOffer(ctx, o, now); continue; }
    const p = productions.get(String(c.productionId));
    if (open.length || !p) continue;
    await draftOffer(ctx, tenant, { requestId: `media-change:${c._id}`, packId: 'media', kind: 'change_order', subjectType: 'media_change_order', subjectId: c._id,
      contactId: p.contactId, conversationId: p.conversationId, lang: await langOf(ctx, p.conversationId), flags: { extraScope: true },
      lines: [{ key: 'l1', name: `${p.ref}: ${c.description}`.slice(0, 120), qty: 1, ...(Number.isInteger(c.priceMinor) && c.priceMinor > 0 ? { settingsMinor: c.priceMinor } : {}) }] }, now);
  }
}

/** @returns {Promise<{ sent: number, skipped: number, quoted: number }>} */
export async function runMediaAutomation(ctx, tenant, now) {
  const { studio, settings } = await refreshStudio(ctx, tenant.accountId, now);
  const actor = automationActor(await workspaceForManager(ctx, tenant.accountId, now), tenant.accountId, 'hasib');
  const { sent, skipped } = await sendRuleMessages(ctx, tenant, studio, settings, actor, now);
  const quoted = await quoteBriefs(ctx, tenant, studio, settings, actor, now);
  await offerExtraScope(ctx, tenant, studio, now);
  return { sent, skipped, quoted };
}
