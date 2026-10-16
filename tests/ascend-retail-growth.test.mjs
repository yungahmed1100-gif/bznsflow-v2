// Retail and Phones & electronics on the six-tab kit (ascend/retail.md, ascend/retail-tech.md): rules
// that send recorded facts by themselves, the Follow-ups queue, Adiba's repair quotes and the
// customer's yes, Layla's repair intake, and the fences that keep decisions with people.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { store, customer, product, order, orderStatus, repair, repairStatus, followups, sentRule, value, refused, MIN, HOUR } from './fixtures/ascend/store.mjs';
import { assertHasibRows } from './helpers/hasib-contract.mjs';

const offers = s => s.h.m.table('adibaOffers');

test('both store packs start on the agreed defaults: facts send themselves, a quote reminder waits, exceptions are tasks', async () => {
  const retail = await store();
  assert.deepEqual(value(await retail.manager('overview')).settings.retail.rules.map(r => [r.id, r.enabled, r.mode]),
    [['ready_for_collection', true, 'auto'], ['back_in_stock', true, 'auto'], ['order_unconfirmed', true, 'task']]);
  refused(await retail.manager('settings_update', { retailSettings: { rules: [{ id: 'ready_for_collection', enabled: true, mode: 'send_now', offsetMinutes: 30 }] } }), 'invalid_settings');
  const tech = await store({ packId: 'retail-tech', name: 't' });
  assert.deepEqual(value(await tech.manager('overview')).settings.retailTech.rules.map(r => [r.id, r.enabled, r.mode]),
    [['repair_ready', true, 'auto'], ['back_in_stock', true, 'auto'], ['repair_quote_reminder', true, 'draft'], ['overdue_repair', true, 'task']]);
  assert.equal(tech.h.m.table('hasibAutomation').find(a => a.accountId === tech.t.accountId)?.enabled, true, 'choosing the pack puts the store on Hasib’s schedule');
  assertHasibRows(retail.h.m);
  assertHasibRows(tech.h.m);
});

test('"ready for collection" reaches the customer by itself, once, with the order number and the balance', async () => {
  const s = await store();
  const { contact } = await customer(s);
  const { variantId } = await product(s);
  const o = await orderStatus(s, await order(s, contact.id, variantId), 'ready');
  s.h.m.advance(10 * MIN);
  await s.run();
  assert.equal(sentRule(s).length, 0, 'not before the rule’s 30 minutes');
  s.h.m.advance(21 * MIN);
  assert.match(await s.run(), /sent:1/);
  const [message] = sentRule(s);
  assert.match(message.text, new RegExp(`#${o.number} is ready for collection\\. The balance due is 25\\.000 OMR\\.`));
  assert.equal(message.manual, false, 'sent as Layla; the chat is not taken over');
  await s.run();
  assert.equal(sentRule(s).length, 1, 'one message per event');
  assert.match(s.h.m.table('ascendActivity').find(a => a.action === 'draft_auto_sent').details, /^agent:hasib\|rule:ready_for_collection$/);
  assertHasibRows(s.h.m);
});

test('"back in stock" tells the customer who asked, once, and never outside the 24-hour window', async () => {
  const s = await store();
  const a = await customer(s, { name: 'Amal' }), b = await customer(s, { name: 'Badr' });
  const { variantId } = await product(s, { stock: 0 });
  for (const c of [a, b]) value(await s.manager('product_request_create', { requestId: randomUUID(), workflow: { contactId: c.contact.id, variantId, qty: 1 } }));
  s.h.m.advance(25 * HOUR);
  await s.h.inbound(s.t, { from: a.from, text: 'Any news?', profileName: 'Amal' });
  value(await s.manager('stock_move', { requestId: randomUUID(), variantId, delta: 2, reason: 'stock_in' }));
  s.h.m.advance(6 * MIN);
  await s.run();
  const sent = sentRule(s);
  assert.equal(sent.length, 1, 'Amal wrote today; Badr’s window has closed');
  assert.match(sent[0].text, /Black abaya \(56\) you asked about is back in stock/);
  const held = s.h.m.table('retailDrafts').find(d => d.status === 'draft' && d.ruleId === 'back_in_stock');
  assert.equal(held.autoSkip, 'window_closed', 'the held draft says why');
  value(await s.manager('stock_move', { requestId: randomUUID(), variantId, delta: 1, reason: 'stock_in' }));
  await s.run();
  assert.equal(sentRule(s).length, 1, 'more stock is not a second message');
  assertHasibRows(s.h.m);
});

test('Follow-ups: an order Layla could not confirm is a decision, and staff never approve drafts or see order amounts', async () => {
  const s = await store();
  const { contact } = await customer(s);
  const { variantId } = await product(s);
  const o = await order(s, contact.id, variantId, { confirm: false });
  // Layla's own path (laylaOrders.js) marks what she could not confirm; the rule reads only these fields.
  await s.h.m.db.patch(o.id, { source: 'layla', flags: ['needs_review'] });
  s.h.m.advance(121 * MIN);
  const queue = await followups(s, 'decision');
  assert.ok(queue.items.some(r => r.kind === 'rule_order_unconfirmed' && r.ref === `#${o.number}`), 'past two hours: the team is asked to check it');
  const overview = value(await s.manager('store_overview'));
  assert.equal(overview.attention.unconfirmed, 1);
  assert.ok(overview.followups.actionable >= 1);
  const staffCard = value(await s.employee('store_context', { contactId: contact.id })).items[0];
  assert.equal(staffCard.ref, `#${o.number}`);
  assert.equal(staffCard.totalMinor, undefined, 'amounts are the manager’s');
  assert.equal(value(await s.manager('store_context', { contactId: contact.id })).items[0].totalMinor, 25000);
  refused(await s.employee('store_draft_approve', { draftId: s.h.m.table('retailTasks')[0]._id, version: 1 }), 'manager_required');
  assertHasibRows(s.h.m);
});

test('a repair quote becomes Adiba’s offer for the owner; the customer’s yes approves that quote, and a revised quote withdraws it', async () => {
  const s = await store({ packId: 'retail-tech' });
  const { contact, from } = await customer(s, { name: 'Salim', text: 'Hi' });
  let r = await repairStatus(s, await repair(s, contact.id), 'diagnosing');
  await s.run();
  const [o] = offers(s);
  assert.deepEqual([o.subjectType, o.status, o.reasons, o.lines[0].priceSource, o.totalMinor], ['repair', 'awaiting_approval', ['auto_quote_off'], 'owner', 45000], 'the technician’s figure goes to the owner');
  await s.run();
  assert.equal(offers(s).find(x => x._id === o._id).status, 'awaiting_approval', 'Hasib never sends a repair quote himself');
  value(await s.manager('adiba_offer_approve', { offerId: o._id, version: o.version }));
  assert.equal(offers(s)[0].status, 'sent');
  refused(await s.manager('repair_status', { repairId: r.id, to: 'repairing', version: value(await s.manager('repair', { repairId: r.id })).version }), 'approval_required');
  await s.h.inbound(s.t, { from, text: 'YES' });
  r = value(await s.manager('repair', { repairId: r.id }));
  assert.equal(r.approvalStatus, 'approved');
  assert.match(r.approvedBy, /OFR-\d{3}$/);
  assert.equal((await repairStatus(s, r, 'repairing')).status, 'repairing', 'the repair can start');
  assertHasibRows(s.h.m);

  const t = await store({ packId: 'retail-tech', name: 'u' });
  const c = await customer(t, { name: 'Huda', text: 'Hi' });
  let q = await repairStatus(t, await repair(t, c.contact.id), 'diagnosing');
  await t.run();
  value(await t.manager('adiba_offer_approve', { offerId: offers(t)[0]._id, version: offers(t)[0].version }));
  q = value(await t.manager('repair_update', { repairId: q.id, version: q.version, labourMinor: 60000 }));
  await t.h.inbound(t.t, { from: c.from, text: 'YES' });
  assert.equal(value(await t.manager('repair', { repairId: q.id })).approvalStatus, 'awaiting', 'the yes was to the old price');
  await t.run();
  assert.equal(offers(t)[0].status, 'cancelled');
  assert.equal(offers(t)[1].totalMinor, 60000, 'the revised quote is a new offer for the owner');
  assertHasibRows(t.h.m);
});

test('"repair ready" reaches the customer by itself with the device and what is left to pay', async () => {
  const s = await store({ packId: 'retail-tech' });
  const { contact } = await customer(s, { name: 'Salim' });
  let r = await repairStatus(s, await repair(s, contact.id), 'diagnosing');
  r = value(await s.manager('repair_approval', { repairId: r.id, version: r.version, approvedBy: 'Salim in store' }));
  r = await repairStatus(s, await repairStatus(s, r, 'repairing'), 'ready');
  s.h.m.advance(31 * MIN);
  assert.match(await s.run(), /sent:1/);
  assert.match(sentRule(s)[0].text, new RegExp(`your iPhone 15 128GB repair \\(#${r.number}\\) is ready for collection\\. The balance due is 45\\.000 OMR\\.`));
  assertHasibRows(s.h.m);
});

test('Layla takes in a repair question as one task, which closes once the device is booked in; a stock price is not an offer', async () => {
  const s = await store({ packId: 'retail-tech' });
  const { contact, from } = await customer(s, { name: 'Salim', text: 'Hi' });
  await s.h.inbound(s.t, { from, text: 'My screen is broken, can you fix it?' });
  await s.h.inbound(s.t, { from, text: 'The screen is cracked badly' });
  const open = () => s.h.m.table('retailTasks').filter(t => t.kind === 'repair_request' && t.status === 'open');
  assert.equal(open().length, 1, 'once, however many messages');
  assert.ok((await followups(s, 'decision')).items.some(r => r.kind === 'repair_request'));
  await repair(s, contact.id);
  await followups(s, 'decision');
  assert.equal(open().length, 0, 'booked in: the request is done');
  assert.equal(s.h.m.table('retailTasks').find(t => t.kind === 'repair_request').resolution, 'repair_received');

  const shop = await store({ name: 'v' });
  await product(shop, { nameEn: 'Black abaya', priceMinor: 25000 });
  // BznsBrain lists the same abaya with a "from" price; the stock line holds the store's real price.
  await shop.h.m.db.insert('blueCatalogEntries', { ownerKey: String(shop.t.accountId), entryKey: randomUUID(), kind: 'product', nameEn: 'Black abaya', nameAr: 'عباية سوداء', category: 'Abayas',
    prices: [{ type: 'from', amount: 20, label: 'From 20 OMR' }], status: 'approved', state: 'published', sortOrder: 1, createdAt: shop.h.m.now(), updatedAt: shop.h.m.now() });
  const buyer = await customer(shop, { name: 'Noor', text: 'Hi' });
  await shop.h.inbound(shop.t, { from: buyer.from, text: 'How much is the black abaya?', intent: 'catalog_item' });
  assert.equal(offers(shop).length, 0, 'Layla answered from the stock price; there is nothing for the owner to price');
  assertHasibRows(s.h.m);
});

test('the store Work belongs to the two store packs only', async () => {
  const s = await store();
  value(await s.manager('store_overview'));
  value(await s.manager('settings_update', { packId: 'dental' }));
  refused(await s.manager('store_followups', {}), 'module_unavailable');
});
