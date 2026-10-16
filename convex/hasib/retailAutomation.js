// The store packs' automatic run (Hasib on a schedule):
// 1. bring tasks and rule drafts up to date, then send the rule messages whose rule is set to Auto
//    (ready for collection, back in stock, repair ready: recorded facts only);
// 2. phone stores: a repair quote waiting for the customer becomes an Adiba offer for the owner to
//    approve. Labour is the technician's figure, so Hasib never sends a repair quote himself.
// Each send passes the shared fences; anything held keeps its reason. Bounded per run.
import { conversationOf } from './workspace/conversation.js';
import { sendAutoRuleDrafts } from './workspace/autoRun.js';
import { automationActor } from './workspace/automation.js';
import { workspaceForManager } from './workspaceState.js';
import { draftOffer, cancelStaleOffer, OPEN_STATUSES } from './adiba.js';
import { refreshStore } from './retailBoard.js';
import { REPAIR_SUBJECT, quoteWaiting, offerRequestId, partPrices, repairOfferLines } from './repairOffer.js';

export const MAX_OFFERS_PER_RUN = 5;
const ARABIC = /[؀-ۿ]/;

async function langOf(ctx, conversationId) {
  const last = await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversationId).eq('direction', 'in')).order('desc').first();
  return last?.text && ARABIC.test(last.text) ? 'ar' : 'en';
}

async function offerRepairs(ctx, tenant, repairs, now) {
  let drafted = 0;
  for (const r of repairs) {
    if (drafted >= MAX_OFFERS_PER_RUN) break;
    const open = (await ctx.db.query('adibaOffers').withIndex('by_subject', q => q.eq('subjectType', REPAIR_SUBJECT).eq('subjectId', String(r._id))).take(20))
      .filter(o => o.accountId === tenant.accountId && OPEN_STATUSES.includes(o.status));
    const waiting = quoteWaiting(r) && r.contactId, requestId = waiting ? offerRequestId(r, await partPrices(ctx, tenant.accountId, r)) : null;
    for (const o of open) {
      if (o.requestId === requestId) continue;
      // The quote changed or was approved in the shop: a sent offer is withdrawn so a yes can never approve a price the customer was not sent.
      if (o.status === 'sent') await ctx.db.patch(o._id, { status: 'cancelled', version: o.version + 1, updatedAt: now });
      else await cancelStaleOffer(ctx, o, now);
    }
    if (!waiting || open.some(o => o.requestId === requestId)) continue;
    const { conversation, optedOut } = await conversationOf(ctx, tenant.accountId, r.contactId);
    if (!conversation || optedOut) continue;
    await draftOffer(ctx, tenant, { requestId, packId: 'retail-tech', kind: 'quote', subjectType: REPAIR_SUBJECT, subjectId: r._id, contactId: r.contactId,
      conversationId: conversation._id, lang: await langOf(ctx, conversation._id), lines: await repairOfferLines(ctx, tenant.accountId, r), validDays: 7 }, now);
    drafted++;
  }
  return drafted;
}

/** @returns {Promise<{ sent: number, skipped: number, quoted: number }>} */
export async function runRetailAutomation(ctx, tenant, now) {
  const packId = tenant.pack.id;
  const { store, settings } = await refreshStore(ctx, tenant.accountId, packId, now);
  const actor = automationActor(await workspaceForManager(ctx, tenant.accountId, now), tenant.accountId, 'hasib');
  const { sent, skipped } = await sendAutoRuleDrafts(ctx, tenant, { drafts: store.drafts, rules: settings.rules, keyPrefix: 'retail-draft', actor,
    links: draft => ({ retailDraftId: draft._id }) }, now);
  const quoted = packId === 'retail-tech' ? await offerRepairs(ctx, tenant, store.repairs, now) : 0;
  return { sent, skipped, quoted };
}
