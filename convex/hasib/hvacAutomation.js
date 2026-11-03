// The AC business's automatic run (Hasib on a schedule):
// 1. bring tasks and rule drafts up to date, then send the rule messages whose rule is set to Auto;
// 2. open the contract visits that fall due within the lead time, as jobs the team books;
// 3. an estimate waiting for the customer becomes an Adiba offer in their chat. Hasib sends it himself
//    only when every line is the catalog's fixed price and the total is within the business's limit;
//    a price someone typed always goes to the owner first;
// 4. a drafted renewal becomes an Adiba offer that always waits for the owner.
// Each send passes the shared fences; anything held keeps its reason. Bounded per run.
import { owned } from '../blueTenant.js';
import { conversationOf } from './workspace/conversation.js';
import { sendAutoRuleDrafts } from './workspace/autoRun.js';
import { automationActor } from './workspace/automation.js';
import { workspaceForManager } from './workspaceState.js';
import { draftOffer, approveAutomatically, cancelStaleOffer, OPEN_STATUSES } from './adiba.js';
import { refreshShop } from './hvacBoard.js';
import { openContractVisits } from './hvacAssets.js';
import { latestOf } from './hvacDomain.js';

export const MAX_OFFERS_PER_RUN = 5;
const ARABIC = /[؀-ۿ]/;
// Hasib may send an offer himself only when every price is a fact the business recorded.
const FACT_SOURCES = new Set(['catalog_fixed', 'settings']);
export const HVAC_ESTIMATE_SUBJECT = 'hvac_estimate', HVAC_CONTRACT_SUBJECT = 'hvac_contract';

async function openOffers(ctx, subjectType, subjectId) {
  return (await ctx.db.query('adibaOffers').withIndex('by_subject', q => q.eq('subjectType', subjectType).eq('subjectId', String(subjectId))).take(20)).filter(o => OPEN_STATUSES.includes(o.status));
}

async function langOf(ctx, conversationId) {
  const last = await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversationId).eq('direction', 'in')).order('desc').first();
  return last?.text && ARABIC.test(last.text) ? 'ar' : 'en';
}

/** An estimate's lines as Adiba prices them: a catalog item at its fixed price, else the figure someone typed. */
async function offerLines(ctx, accountId, e) {
  const lines = [];
  for (const [i, l] of e.lines.entries()) {
    const variant = l.variantId ? await owned(ctx, l.variantId, accountId, 'hasibVariants') : null;
    const base = { key: `l${i + 1}`, name: l.name, qty: l.qty };
    lines.push(variant && variant.priceMinor === l.unitPriceMinor ? { ...base, catalogPrices: [{ type: 'fixed', amount: l.unitPriceMinor / 1000 }] } : { ...base, ownerMinor: l.unitPriceMinor });
  }
  return lines;
}

/** Withdraws offers that no longer match the record, so a customer's yes can never approve a price they were not sent. */
async function withdrawStale(ctx, open, isCurrent, now) {
  for (const o of open) {
    if (isCurrent(o)) continue;
    if (o.status === 'sent') await ctx.db.patch(o._id, { status: 'cancelled', version: o.version + 1, updatedAt: now });
    else await cancelStaleOffer(ctx, o, now);
  }
}

async function offerEstimates(ctx, tenant, shop, settings, actor, now) {
  let sent = 0;
  for (const job of shop.jobs) {
    if (sent >= MAX_OFFERS_PER_RUN) break;
    const e = latestOf(shop.estimatesOf(job._id)), open = await openOffers(ctx, HVAC_ESTIMATE_SUBJECT, job._id);
    const waiting = ['triaged', 'on_site', 'estimate_pending', 'approved'].includes(job.status) && e && ['draft', 'issued'].includes(e.status);
    const current = o => waiting && o.requestId === `hvac-estimate:${e._id}`;
    await withdrawStale(ctx, open, current, now);
    if (!waiting || open.some(current)) continue;
    const { conversation, optedOut } = await conversationOf(ctx, tenant.accountId, job.contactId);
    if (!conversation || optedOut) continue;
    const offer = await draftOffer(ctx, tenant, { requestId: `hvac-estimate:${e._id}`, packId: 'hvac', kind: 'quote', subjectType: HVAC_ESTIMATE_SUBJECT, subjectId: job._id,
      contactId: job.contactId, conversationId: conversation._id, lang: await langOf(ctx, conversation._id), lines: await offerLines(ctx, tenant.accountId, e),
      limitMinor: settings.autoQuoteLimitMinor || 0, validDays: settings.estimateWindowDays }, now);
    if (!offer.reasons.length && offer.lines.every(l => FACT_SOURCES.has(l.priceSource)) && (await approveAutomatically(ctx, tenant, actor, offer, now)).ok) sent++;
  }
  return sent;
}

/** A drafted renewal goes to the owner as an Adiba offer; the owner's price, so it is never sent automatically. */
async function offerRenewals(ctx, tenant, shop, actor, now) {
  for (const c of shop.contracts) {
    // The owner may change the price on the offer; approving writes it to the draft, so the offer stays current.
    const open = await openOffers(ctx, HVAC_CONTRACT_SUBJECT, c._id), current = o => c.status === 'draft' && o.requestId === `hvac-contract:${c._id}`;
    await withdrawStale(ctx, open, current, now);
    if (c.status !== 'draft' || !c.renewedFromId || open.some(current)) continue;
    const { conversation, optedOut } = await conversationOf(ctx, tenant.accountId, c.contactId);
    if (!conversation || optedOut) continue;
    await draftOffer(ctx, tenant, { requestId: `hvac-contract:${c._id}`, packId: 'hvac', kind: 'quote', subjectType: HVAC_CONTRACT_SUBJECT, subjectId: c._id,
      contactId: c.contactId, conversationId: conversation._id, lang: await langOf(ctx, conversation._id),
      lines: [{ key: 'l1', name: `AMC ${c.reference} · ${c.visitsPerYear}×`, qty: 1, ownerMinor: c.priceMinor }], limitMinor: 0, validDays: 14 }, now);
  }
}

/** @returns {Promise<{ sent: number, skipped: number, quoted: number, opened: number }>} */
export async function runHvacAutomation(ctx, tenant, now) {
  const { shop, settings } = await refreshShop(ctx, tenant.accountId, now);
  const actor = automationActor(await workspaceForManager(ctx, tenant.accountId, now), tenant.accountId, 'hasib');
  const { sent, skipped } = await sendAutoRuleDrafts(ctx, tenant, { drafts: shop.drafts, rules: settings.rules, keyPrefix: 'hvac-draft', actor, links: draft => ({ hvacDraftId: draft._id }) }, now);
  const opened = await openContractVisits(ctx, tenant, actor, shop.contracts, now, settings.amcVisitLeadDays);
  const quoted = await offerEstimates(ctx, tenant, shop, settings, actor, now);
  await offerRenewals(ctx, tenant, shop, actor, now);
  return { sent, skipped, quoted, opened };
}
