// The workshop's automatic run (Hasib on a schedule):
// 1. bring tasks and rule drafts up to date, then send the rule messages whose rule is set to Auto;
// 2. an estimate waiting for the customer becomes an Adiba offer in their chat. Hasib sends it himself
//    only when every line is priced from the service list or a part's fixed price and the total is
//    within the workshop's limit; a price an advisor typed always goes to the owner first.
// Each send passes the shared fences; anything held keeps its reason. Bounded per run.
import { owned } from '../blueTenant.js';
import { conversationOf } from './workspace/conversation.js';
import { sendAutoRuleDrafts } from './workspace/autoRun.js';
import { automationActor } from './workspace/automation.js';
import { workspaceForManager } from './workspaceState.js';
import { draftOffer, approveAutomatically, cancelStaleOffer, OPEN_STATUSES } from './adiba.js';
import { refreshWorkshop } from './automotiveBoard.js';
import { latestEstimates } from './automotiveRules.js';

export const MAX_OFFERS_PER_RUN = 5;
const ARABIC = /[؀-ۿ]/;
// Hasib may send an offer himself only when every price is a fact the workshop recorded.
const FACT_SOURCES = new Set(['catalog_fixed', 'settings']);

async function openOffers(ctx, workOrderId) {
  return (await ctx.db.query('adibaOffers').withIndex('by_subject', q => q.eq('subjectType', 'automotive_estimate').eq('subjectId', String(workOrderId))).take(20)).filter(o => OPEN_STATUSES.includes(o.status));
}

/** An estimate's lines as Adiba prices them: the service list, a part's fixed price, else the advisor's figure. */
async function offerLines(ctx, accountId, w, e) {
  const service = w.serviceId ? await owned(ctx, w.serviceId, accountId, 'automotiveServices') : null;
  const lines = [];
  for (const [i, l] of e.lines.entries()) {
    const variant = l.variantId ? await owned(ctx, l.variantId, accountId, 'hasibVariants') : null;
    const base = { key: `l${i + 1}`, name: l.name, qty: l.qty };
    if (l.kind === 'labor' && service && service.priceMinor === l.unitPriceMinor) lines.push({ ...base, settingsMinor: l.unitPriceMinor });
    else if (variant && variant.priceMinor === l.unitPriceMinor) lines.push({ ...base, catalogPrices: [{ type: 'fixed', amount: l.unitPriceMinor / 1000 }] });
    else lines.push({ ...base, ownerMinor: l.unitPriceMinor });
  }
  return lines;
}

async function langOf(ctx, conversationId) {
  const last = await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversationId).eq('direction', 'in')).order('desc').first();
  return last?.text && ARABIC.test(last.text) ? 'ar' : 'en';
}

async function offerEstimates(ctx, tenant, shop, settings, actor, now) {
  const latest = latestEstimates(shop.estimates);
  let sent = 0;
  for (const w of shop.workOrders) {
    if (sent >= MAX_OFFERS_PER_RUN) break;
    const e = latest.get(String(w._id)), open = await openOffers(ctx, w._id);
    const waiting = ['intake', 'inspection', 'awaiting_approval'].includes(w.status) && e && ['draft', 'issued'].includes(e.status);
    // The estimate moved on (approved in person, revised or the job closed): an unsent offer for it is no longer the price.
    const current = o => o.requestId === `auto-estimate:${e?._id}`;
    for (const o of open) {
      if (waiting && current(o)) continue;
      // A sent offer for an older estimate is withdrawn, so the customer's yes can never approve a price they were not sent.
      if (o.status === 'sent') await ctx.db.patch(o._id, { status: 'cancelled', version: o.version + 1, updatedAt: now });
      else await cancelStaleOffer(ctx, o, now);
    }
    if (!waiting || open.some(current)) continue;
    const { conversation, optedOut } = await conversationOf(ctx, tenant.accountId, w.contactId);
    if (!conversation || optedOut) continue;
    const offer = await draftOffer(ctx, tenant, { requestId: `auto-estimate:${e._id}`, packId: 'automotive', kind: 'quote', subjectType: 'automotive_estimate', subjectId: w._id,
      contactId: w.contactId, conversationId: conversation._id, lang: await langOf(ctx, conversation._id), lines: await offerLines(ctx, tenant.accountId, w, e),
      limitMinor: settings.autoQuoteLimitMinor || 0, validDays: 7 }, now);
    if (!offer.reasons.length && offer.lines.every(l => FACT_SOURCES.has(l.priceSource)) && (await approveAutomatically(ctx, tenant, actor, offer, now)).ok) sent++;
  }
  return sent;
}

/** @returns {Promise<{ sent: number, skipped: number, quoted: number }>} */
export async function runAutomotiveAutomation(ctx, tenant, now) {
  const { shop, settings } = await refreshWorkshop(ctx, tenant.accountId, now);
  const actor = automationActor(await workspaceForManager(ctx, tenant.accountId, now), tenant.accountId, 'hasib');
  const { sent, skipped } = await sendAutoRuleDrafts(ctx, tenant, { drafts: shop.drafts, rules: settings.rules, keyPrefix: 'automotive-draft', actor,
    links: draft => ({ automotiveDraftId: draft._id }) }, now);
  const quoted = await offerEstimates(ctx, tenant, shop, settings, actor, now);
  return { sent, skipped, quoted };
}
