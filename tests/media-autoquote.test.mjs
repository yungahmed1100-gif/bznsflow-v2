// Media quotes, fact-based: Hasib quotes a complete brief by himself only when every line has a fixed
// catalog price and the total is within the studio's limit; anything else is Adiba's draft for the
// owner. A customer's YES accepts the current quote and opens its order; a hand quote cancels the draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { studio, customer, brief, value, refused, accepted, hold, resource, record, move, prepare, submitCut, decide } from './fixtures/ascend/media.mjs';
import { automationRun } from '../convex/hasib/automationRun.js';
import { assertHasibRows } from './helpers/hasib-contract.mjs';

const run = s => automationRun(s.h.m.ctx, { accountId: s.t.accountId, workerFunction: null, secret: 'x' }, s.h.m.now());
const offers = s => s.h.m.table('adibaOffers');
async function service(s, nameEn, price) {
  const entryKey = randomUUID();
  await s.h.m.db.insert('blueCatalogEntries', { ownerKey: String(s.t.accountId), entryKey, kind: 'service', nameEn, category: 'Video', prices: [price],
    status: 'approved', state: 'published', sortOrder: 1, createdAt: s.h.m.now(), updatedAt: s.h.m.now() });
  return entryKey;
}
/** A customer's complete brief naming catalog services (as Layla records them). */
async function completeBrief(s, keys, name = 'Salma') {
  const c = await customer(s, name);
  const conversation = s.h.m.table('blueConversations').find(x => String(x.contactId) === String(c.id));
  const p = value(await brief(s.manager, c.id, { conversationId: conversation._id }, s.h.m.now()));
  await s.h.m.db.patch(p.id, { catalogEntryKeys: keys });
  return { p, conversation, phone: s.h.m.table('blueContacts').find(x => x._id === c.id)?.waId };
}
const setLimit = (s, minor) => s.manager('settings_update', { mediaSettings: { autoQuoteLimitMinor: minor } });

test('within the limit and fully fixed: Hasib quotes by himself, and the customer’s YES accepts it and opens the order', async () => {
  const s = await studio();
  const reel = await service(s, 'Promo reel 60s', { type: 'fixed', amount: 450, currency: 'OMR', label: '450 OMR' });
  value(await setLimit(s, 500000));
  const { p, conversation } = await completeBrief(s, [reel]);
  assert.match(await run(s), /quoted:1/);
  const production = s.h.m.table('mediaProductions').find(x => x._id === p.id);
  assert.deepEqual([production.status, production.quoteMinor, production.depositMinor], ['awaiting_acceptance', 450000, 90000], 'the quote is the catalog price, the deposit the studio’s percent');
  const [o] = offers(s);
  assert.deepEqual([o.status, o.reasons, o.lines[0].priceSource], ['sent', [], 'catalog_fixed']);
  assert.match(o.text, /Promo reel 60s: 450\.000 OMR/);
  assert.match(o.text, /Shoot dates are confirmed at booking\./);
  const act = s.h.m.table('ascendActivity').find(a => a.action === 'offer_approved');
  assert.match(act.details, /^agent:hasib\|OFR-\d{3}$/, 'Hasib, not a person, approved it');
  await s.h.inbound(s.t, { from: s.h.m.table('blueContacts').find(c => c._id === conversation.contactId).waId || conversation.number, text: 'YES' });
  const accepted = s.h.m.table('mediaProductions').find(x => x._id === p.id);
  assert.equal(accepted.acceptedQuoteVersion, accepted.quoteVersion, 'the current quote version is accepted');
  assert.ok(accepted.orderId, 'its order is opened');
  assert.equal(offers(s)[0].status, 'accepted');
  assertHasibRows(s.h.m);
});

test('the owner decides when the quote is not a fact: automatic quoting off, a "from" price, or nothing in the catalog', async () => {
  const s = await studio();
  const reel = await service(s, 'Promo reel 60s', { type: 'fixed', amount: 450, label: '450 OMR' });
  const drone = await service(s, 'Drone footage', { type: 'from', minimum: 120, label: 'From 120 OMR' });
  await completeBrief(s, [reel], 'A');
  await completeBrief(s, [reel, drone], 'B');
  await completeBrief(s, [], 'C');
  assert.match(await run(s), /quoted:0/);
  const byName = n => offers(s).find(o => s.h.m.table('mediaProductions').find(p => p._id === o.subjectId && s.h.m.table('blueContacts').find(c => c._id === p.contactId)?.profileName === n));
  assert.deepEqual([byName('A').status, byName('A').reasons], ['awaiting_approval', ['auto_quote_off']]);
  assert.deepEqual([byName('B').status, byName('B').reasons], ['needs_price', ['price_from']]);
  assert.deepEqual([byName('C').status, byName('C').reasons], ['needs_price', ['custom_deliverable']]);
  assert.equal(s.h.m.table('blueMessages').filter(m => String(m.key).startsWith('offer:')).length, 0, 'nothing reaches a customer without the owner');
  assertHasibRows(s.h.m);
});

test('a quote made by hand cancels Adiba’s unsent draft for that brief', async () => {
  const s = await studio();
  const { p } = await completeBrief(s, []);
  await run(s);
  assert.equal(offers(s)[0].status, 'needs_price');
  const fresh = s.h.m.table('mediaProductions').find(x => x._id === p.id);
  value(await s.manager('media_quote', { productionId: p.id, version: fresh.version, media: { quoteMinor: 300000 } }));
  await run(s);
  assert.equal(offers(s)[0].status, 'cancelled');
  assertHasibRows(s.h.m);
});

test('the limit is the studio’s to set, within range', async () => {
  const s = await studio();
  refused(await setLimit(s, -1), 'invalid_settings');
  assert.equal(value(await setLimit(s, 250000)).settings.media.autoQuoteLimitMinor, 250000);
  assertHasibRows(s.h.m); // the saved settings fit the production schema
  assertHasibRows(s.h.m);
});

test('a third revision round becomes an extra-scope offer priced from the studio’s setting; the customer’s YES approves it', async () => {
  const s = await studio(), m = s.manager;
  const { p: brief0, conversation } = await completeBrief(s, []);
  let a = await accepted(m, brief0);
  await hold(m, a, [await resource(m, 'Camera', 'camera')], a.shootStartsAt, a.shootEndsAt);
  a = await record(m, a); a = value(await move(m, a, 'booked')); a = value(await move(m, a, 'preproduction')); a = await prepare(m, a);
  a = value(await move(m, a, 'shooting')); a = value(await m('media_shoot_complete', { productionId: a.id, version: a.version, media: { mediaReceived: true } }));
  for (const label of ['v1', 'v2', 'v3']) {
    a = await record(m, a); value(await submitCut(m, a, label));
    const rec = await record(m, a); value(await decide(m, rec.cuts[0], 'changes_requested'));
  }
  const change = (await record(m, a)).changeOrders[0];
  assert.deepEqual([change.kind, change.status], ['extra_revision', 'proposed']);
  await run(s);
  const o = offers(s).find(x => x.subjectType === 'media_change_order');
  assert.deepEqual([o.status, o.reasons, o.lines[0].priceSource, o.totalMinor], ['awaiting_approval', ['extra_scope'], 'settings', 25000], 'priced from the studio’s extra-round price');
  const sent = value(await m('adiba_offer_approve', { offerId: o._id, version: o.version }));
  assert.equal(sent.status, 'sent');
  await s.h.inbound(s.t, { from: s.h.m.table('blueContacts').find(c => c._id === conversation.contactId).waId || conversation.number, text: 'yes' });
  const decided = s.h.m.table('mediaChangeOrders').find(c => c._id === change.id);
  assert.equal(decided.status, 'approved', 'the customer’s yes approved the extra scope');
  assert.match(decided.customerApproval || '', /^chat_reply:OFR-\d{3}$/);
  assertHasibRows(s.h.m);
});
