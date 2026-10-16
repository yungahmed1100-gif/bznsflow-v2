// Adiba in the chat (every live sector on Ascend). Two things, both deterministic:
// 1. A customer's "YES OFR-014" (or a plain yes when exactly one offer is open in this chat) is
//    recorded as acceptance, with the message as evidence; Layla adds the confirmation word for word.
// 2. A price question about an item with no fixed price drafts an offer for the owner to price;
//    Layla says the team will confirm it. Nothing here sends a price the owner has not approved.
import { sectorTurnPack } from './workspace/turn.js';
import { workspaceForManager } from './workspaceState.js';
import { automationActor } from './workspace/automation.js';
import { acceptOffer, draftOffer } from './adiba.js';
import { acceptedAck, offerFact } from './adibaText.js';
import { fixedPriceMinor } from '../../config/adiba-pricing.js';
import { namedItems } from '../../config/layla-prices.js';

const YES = /^\s*(yes|yes please|yep|ok|okay|accept|accepted|i accept|agreed|agree|deal|confirm|confirmed|نعم|ايوه|أيوه|موافق|أوافق|اوافق|تمام|اوكي|أوكي|مقبول)\s*[.!؟?]*\s*$/i;
const CODE = /(?:yes|accept|موافق|اوافق|أوافق|اقبل|أقبل)\s+(OFR-\d{3,})/i;
// Arabic question words stand alone (كم inside لكم or معكم is not a price question).
const PRICE_QUESTION = /\b(price|prices|cost|costs|how much|quote|rate|rates|fee|fees)\b|(?:^|\s)(?:كم|بكم)(?:\s|$|؟)|سعر|أسعار|اسعار|تكلفة|تكلف|عرض سعر/i;
const ARABIC = /[؀-ۿ]/;

/**
 * @param {{ stockMatched?: boolean }} args stockMatched: commerceTurn answered from a stock item this turn
 * @returns {Promise<null | { ack?: string, facts?: string[] }>}
 */
export async function adibaTurn(ctx, { row, person, contact, text, messageKey, catalog = [], stockMatched = false, now, secret }) {
  if (!contact || !text) return null;
  const pack = await sectorTurnPack(ctx, { row, secret });
  if (!pack) return null;
  const tenant = { accountId: row.accountId, row, secret, pack };
  const ar = ARABIC.test(text);
  const open = (await ctx.db.query('adibaOffers').withIndex('by_conversation_status', q => q.eq('conversationId', person._id).eq('status', 'sent')).take(10))
    .filter(o => o.accountId === row.accountId && o.validUntil > now);

  const code = text.match(CODE)?.[1]?.toUpperCase();
  const target = code ? open.find(o => o.ref === code) : open.length === 1 && YES.test(text) ? open[0] : null;
  if (target) {
    const actor = automationActor(await workspaceForManager(ctx, row.accountId, now), row.accountId, 'layla');
    const by = contact.customerName || contact.profileName || contact.ownerName || 'Customer';
    const inbound = messageKey ? await ctx.db.query('blueMessages').withIndex('by_key', q => q.eq('key', messageKey)).unique() : null;
    const done = await acceptOffer(ctx, tenant, actor, target, { by, evidence: 'chat_reply', ...(inbound ? { messageId: inbound._id } : {}) }, now);
    return done.ok ? { ack: acceptedAck(target, ar) } : { facts: [`Offer ${target.ref} could not be recorded automatically; the team will confirm it with the customer.`] };
  }
  const facts = open.map(offerFact);
  if (open.length > 1 && YES.test(text)) facts.push(`Several offers are open (${open.map(o => o.ref).join(', ')}): ask which one they accept, by its reference.`);

  // A price the catalog does not fix: Adiba drafts the offer, the owner prices it. When Layla already
  // answered from a stock line this turn (a store's own price), there is nothing for the owner to price.
  if (PRICE_QUESTION.test(text) && !stockMatched) {
    for (const item of namedItems(catalog, text).slice(0, 3)) {
      if (fixedPriceMinor(item.prices) !== null) continue;
      const name = (ar ? item.nameAr : item.nameEn) || item.nameEn || item.nameAr;
      await draftOffer(ctx, tenant, { requestId: `conv:${person._id}:${item.entryKey}`, packId: pack.id, kind: 'quote', subjectType: 'conversation',
        subjectId: `${person._id}:${item.entryKey}`, contactId: contact._id, conversationId: person._id, lang: ar ? 'ar' : 'en',
        lines: [{ key: 'l1', name, catalogPrices: item.prices, catalogEntryKey: item.entryKey }] }, now);
      facts.push(`${name}: the exact price depends on the details; the team will confirm it and send an offer in this chat.`);
    }
  }
  return facts.length ? { facts } : null;
}
