// Adiba drafts the offers that need the owner, in any live sector: she never invents a price, the
// owner fills and approves, Layla sends without taking the chat over, and only the right customer's
// clear yes to the one open offer is recorded, with the message as evidence. Fake clock, no provider.
import test from 'node:test';
import { assertHasibRows } from './helpers/hasib-contract.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { studio, customer, value, refused, DAY } from './fixtures/ascend/media.mjs';

const offers = s => s.h.m.table('adibaOffers');
/** A catalog service priced "on request", as the owner approved it. */
async function onRequest(s, nameEn = 'Drone footage') {
  await s.h.m.db.insert('blueCatalogEntries', { ownerKey: String(s.t.accountId), entryKey: randomUUID(), kind: 'service', nameEn, nameAr: 'تصوير جوي', category: 'Video',
    prices: [{ type: 'quote', label: 'Price on request (quote)' }], status: 'approved', state: 'published', sortOrder: 1, createdAt: s.h.m.now(), updatedAt: s.h.m.now() });
}
const ask = (s, from, text) => s.h.inbound(s.t, { from, text, profileName: 'Salma' });
const lastOut = (s, conversationId) => s.h.m.table('blueMessages').filter(m => m.conversationId === conversationId && m.direction === 'out').at(-1);

test('a price question about an item with no fixed price becomes an offer the owner prices; nothing unpriced goes out', async () => {
  const s = await studio();
  await onRequest(s);
  await ask(s, '96895550001', 'How much is drone footage for a villa?');
  const [o] = offers(s);
  assert.equal(o.status, 'needs_price');
  assert.deepEqual(o.reasons, ['price_quote']);
  assert.equal(o.lines[0].priceSource, 'unpriced');
  assert.equal(o.lines[0].unitPriceMinor, undefined, 'Adiba never fills a price herself');
  assert.equal(o.text, '', 'no wording while a line is unpriced');
  refused(await s.manager('adiba_offer_approve', { offerId: o._id, version: o.version }), 'offer_unpriced');
  refused(await s.producer('adiba_offer_price', { offerId: o._id, version: o.version, adiba: { lines: [{ key: 'l1', unitPriceMinor: 1 }] } }), 'manager_required');
  await ask(s, '96895550001', 'how much again for drone footage?');
  assert.equal(offers(s).length, 1, 'one open offer per item per chat');
  assertHasibRows(s.h.m);
});

test('the owner prices and approves; Layla sends it in the chat without taking it over; a clear YES is accepted with evidence', async () => {
  const s = await studio();
  await onRequest(s);
  await ask(s, '96895550002', 'What is the price of drone footage?');
  let o = offers(s)[0];
  const priced = value(await s.manager('adiba_offer_price', { offerId: o._id, version: o.version, adiba: { lines: [{ key: 'l1', unitPriceMinor: 180000 }], depositMinor: 36000 } }));
  assert.deepEqual([priced.status, priced.totalMinor, priced.depositMinor, priced.reasons], ['awaiting_approval', 180000, 36000, []]);
  assert.match(priced.text, /^Offer OFR-\d{3}/);
  assert.match(priced.text, /Drone footage: 180\.000 OMR/);
  assert.match(priced.text, /To accept, reply: YES OFR-\d{3}/);
  const sent = value(await s.manager('adiba_offer_approve', { offerId: o._id, version: priced.version }));
  assert.equal(sent.status, 'sent');
  const message = s.h.m.table('blueMessages').find(m => String(m.key).startsWith(`offer:${o._id}`));
  assert.equal(message.text, priced.text, 'exactly what the owner approved');
  assert.equal(s.h.m.table('blueConversations').find(c => c._id === o.conversationId).takeover, false, 'Layla stays on the chat');
  await ask(s, '96895550002', 'YES');
  o = offers(s)[0];
  assert.equal(o.status, 'accepted');
  assert.equal(o.acceptance.evidence, 'chat_reply');
  assert.ok(o.acceptance.messageId, 'the customer’s message is the evidence');
  assert.match(lastOut(s, o.conversationId).text, /Recorded: you accepted OFR-\d{3}\. Total 180\.000 OMR; deposit due 36\.000 OMR\./, 'Layla confirms word for word');
  const act = s.h.m.table('ascendActivity').find(a => a.action === 'offer_accepted');
  assert.equal(act.actorRole, 'automation');
  assert.match(act.details, /^agent:layla\|OFR-\d{3}\|chat_reply$/);
  assertHasibRows(s.h.m);
});

test('acceptance is never guessed: another customer, two open offers, an expired offer or a vague reply record nothing', async () => {
  const s = await studio();
  await onRequest(s, 'Drone footage'); await onRequest(s, 'Studio hire');
  const send = async (from, text) => {
    await ask(s, from, text);
    const o = offers(s).filter(x => x.status === 'needs_price').at(-1);
    const p = value(await s.manager('adiba_offer_price', { offerId: o._id, version: o.version, adiba: { lines: [{ key: 'l1', unitPriceMinor: 50000 }] } }));
    return value(await s.manager('adiba_offer_approve', { offerId: o._id, version: p.version }));
  };
  const a = await send('96895550003', 'price of drone footage?');
  await ask(s, '96895550099', 'YES');
  assert.equal(offers(s).find(o => o._id === a.id).status, 'sent', 'another customer’s yes is not this offer’s');
  await send('96895550003', 'and the price of studio hire?');
  await ask(s, '96895550003', 'yes');
  assert.equal(offers(s).filter(o => o.status === 'accepted').length, 0, 'with two open offers a plain yes is ambiguous');
  await ask(s, '96895550003', 'maybe, let me think');
  assert.equal(offers(s).filter(o => o.status === 'accepted').length, 0);
  await ask(s, '96895550003', `YES ${a.ref}`);
  assert.equal(offers(s).find(o => o._id === a.id).status, 'accepted', 'the reference picks the offer');
  s.h.m.advance(15 * DAY);
  const other = offers(s).find(o => o.status === 'sent');
  await ask(s, '96895550003', `YES ${other.ref}`);
  assert.notEqual(offers(s).find(o => o._id === other._id).status, 'accepted', 'an expired offer cannot be accepted');
  value(await s.manager('adiba_offers'));
  assert.equal(offers(s).find(o => o._id === other._id).status, 'expired', 'and reads as expired');
  assertHasibRows(s.h.m);
});

test('withdraw, staff acceptance with evidence, and stale screens', async () => {
  const s = await studio();
  await onRequest(s);
  await ask(s, '96895550004', 'cost of drone footage?');
  const o = offers(s)[0];
  refused(await s.manager('adiba_offer_price', { offerId: o._id, version: o.version + 3, adiba: { lines: [{ key: 'l1', unitPriceMinor: 1000 }] } }), 'offer_conflict');
  const p = value(await s.manager('adiba_offer_price', { offerId: o._id, version: o.version, adiba: { lines: [{ key: 'l1', unitPriceMinor: 1000 }] } }));
  const sent = value(await s.manager('adiba_offer_approve', { offerId: o._id, version: p.version }));
  refused(await s.producer('adiba_offer_accept_record', { offerId: o._id, version: sent.version, adiba: { acceptedBy: 'Salma' } }), 'acceptance_evidence_required');
  const accepted = value(await s.producer('adiba_offer_accept_record', { offerId: o._id, version: sent.version, adiba: { acceptedBy: 'Salma', evidenceSource: 'phone_call' } }));
  assert.deepEqual([accepted.status, accepted.acceptance.evidence], ['accepted', 'phone_call']);
  refused(await s.manager('adiba_offer_withdraw', { offerId: o._id, version: accepted.version }), 'offer_locked');
  const list = value(await s.manager('adiba_offers', { status: 'accepted' }));
  assert.equal(list.items.length, 1);
  refused(await s.producer('adiba_offers'), 'manager_required');
  assertHasibRows(s.h.m);
});
