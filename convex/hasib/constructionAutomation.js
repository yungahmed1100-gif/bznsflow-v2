// The contractor's automatic run (Hasib on a schedule):
// 1. bring tasks and rule drafts up to date, then send the rule messages whose rule is set to Auto;
// 2. a draft variation that adds to the contract becomes Adiba's offer for the owner to approve.
//    A variation changes the contract, so Hasib never sends one by himself; the client's yes is
//    recorded and the signed copy stays a task for the owner.
import { conversationOf } from './workspace/conversation.js';
import { sendAutoRuleDrafts } from './workspace/autoRun.js';
import { automationActor } from './workspace/automation.js';
import { workspaceForManager } from './workspaceState.js';
import { draftOffer, cancelStaleOffer, OPEN_STATUSES } from './adiba.js';
import { refreshSite } from './constructionBoard.js';

const ARABIC = /[؀-ۿ]/;
const offerKey = v => `variation-offer:${v._id}:${v.version}`;

async function langOf(ctx, conversationId) {
  const last = await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversationId).eq('direction', 'in')).order('desc').first();
  return last?.text && ARABIC.test(last.text) ? 'ar' : 'en';
}

async function offerVariations(ctx, tenant, site, now) {
  const projectOf = new Map(site.projects.map(p => [String(p._id), p]));
  for (const v of site.variations) {
    const open = (await ctx.db.query('adibaOffers').withIndex('by_subject', q => q.eq('subjectType', 'construction_variation').eq('subjectId', String(v._id))).take(20)).filter(o => OPEN_STATUSES.includes(o.status));
    // Submitted by hand, withdrawn or edited since: an unsent offer for it is no longer the price.
    for (const o of open) if (o.status !== 'sent' && (v.status !== 'draft' || o.requestId !== offerKey(v))) await cancelStaleOffer(ctx, o, now);
    const p = projectOf.get(String(v.projectId));
    if (v.status !== 'draft' || !(v.contractDeltaMinor > 0) || !p?.contactId || open.some(o => o.requestId === offerKey(v))) continue;
    const { conversation, optedOut } = await conversationOf(ctx, tenant.accountId, p.contactId);
    if (!conversation || optedOut) continue;
    await draftOffer(ctx, tenant, { requestId: offerKey(v), packId: 'construction', kind: 'change_order', subjectType: 'construction_variation', subjectId: v._id, contactId: p.contactId,
      conversationId: conversation._id, lang: await langOf(ctx, conversation._id), flags: { extraScope: true }, validDays: 14,
      lines: [{ key: 'l1', name: `${v.reference}: ${v.title}`.slice(0, 120), qty: 1, ownerMinor: v.contractDeltaMinor }] }, now);
  }
}

/** @returns {Promise<{ sent: number, skipped: number }>} */
export async function runConstructionAutomation(ctx, tenant, now) {
  const { site, settings } = await refreshSite(ctx, tenant.accountId, now);
  const actor = automationActor(await workspaceForManager(ctx, tenant.accountId, now), tenant.accountId, 'hasib');
  const { sent, skipped } = await sendAutoRuleDrafts(ctx, tenant, { drafts: site.drafts, rules: settings.rules, keyPrefix: 'construction-draft', actor,
    links: draft => ({ constructionDraftId: draft._id }) }, now);
  await offerVariations(ctx, tenant, site, now);
  return { sent, skipped };
}
