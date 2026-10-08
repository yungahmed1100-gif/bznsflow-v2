// Layla's AI reply pipeline end to end, with a scripted model in place of Qwen:
// webhook → Convex ingest (deterministic) → debounced AI turn → checks → commit under fences → worker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { business, fixtureBusiness, scriptedModel, lastCustomer } from './helpers/layla-conversation.mjs';

const CONTACT = 'WhatsApp +968 9100 2000 (Sara)';
const system = messages => messages[0].content;

test('the model sees the whole published setup and its reply reaches the customer, with cost recorded', async () => {
  const model = scriptedModel(() => 'Viewings are always free.');
  const b = await business({ model });
  const [reply] = await b.say('96891110001', 'Are viewings free?');
  assert.equal(reply, 'Viewings are always free.');
  const prompt = system(model.calls[0]);
  for (const part of ['Qurum Coast Properties', 'Villa and apartment rentals', 'Are viewings free?', CONTACT, 'Informative & nice', 'introducing yourself as Layla'])
    assert.ok(prompt.includes(part), part);
  const out = b.h.m.table('blueMessages').find(m => m.direction === 'out');
  assert.deepEqual([out.ai.model, out.ai.tokensIn, out.ai.tokensOut, out.ai.fallback], ['qwen-plus', 100, 20, undefined]);
  assert.equal(b.conversation('96891110001').pendingReply, undefined, 'the pending turn is cleared');
});

test('a quick run of messages gets one answer that saw all of them', async () => {
  const model = scriptedModel(() => 'Yes to both: rentals and sales.');
  const b = await business({ model });
  for (const text of ['hi', 'do you rent villas?', 'and sell them?']) { b.h.m.advance(500); await b.ingest(b.envelope('96891110002', text)); }
  await b.turns(); await b.flush();
  assert.equal(model.calls.length, 1, 'one model call for the burst');
  assert.deepEqual(model.calls[0].filter(m => m.role === 'user').map(m => m.content), ['hi', 'do you rent villas?', 'and sell them?']);
  assert.deepEqual(b.sent.filter(s => s.to === '96891110002').map(s => s.text), ['Yes to both: rentals and sales.']);
});

test('a reply written while the chat or the business changed is dropped', async () => {
  const b = await business({ model: scriptedModel(() => 'Stale answer.') });
  await b.ingest(b.envelope('96891110003', 'hello'));
  const chat = b.conversation('96891110003');
  await b.h.messaging('takeover', { sessionHash: b.tenant.sessionHash, conversationId: chat._id });
  const [result] = await b.turns(); await b.flush();
  assert.equal(result.skipped, 'conversation_changed');
  assert.equal(b.sent.length, 0);
  const c = await business({ model: scriptedModel(() => 'Old document answer.') });
  await c.ingest(c.envelope('96891110004', 'hello'));
  await c.republish((await import('./helpers/layla-conversation.mjs')).bzns({ tone: 'sharp' }));
  const [skipped] = await c.turns();
  assert.equal(skipped.skipped, 'profile_changed', 'a republished bzns.md fences the old turn');
});

test('STOP never reaches the model and nothing is sent', async () => {
  const model = scriptedModel();
  const b = await business({ model });
  assert.deepEqual(await b.say('96891110005', 'STOP'), []);
  assert.equal(model.calls.length, 0);
  assert.equal(b.contact('96891110005').optout, true);
  assert.deepEqual(await b.say('96891110005', 'hello again'), [], 'opt-out is final');
  assert.equal(model.calls.length, 0);
});

test('model failures get the honest fallback with the team contact, and the reason is recorded', async () => {
  const b = await business({ model: async () => { const e = new Error('slow'); e.reason = 'ai_timeout'; throw e; } });
  const [reply] = await b.say('96891110006', 'Do you have parking?');
  assert.equal(reply, `Hello, I’m Layla from Qurum Coast Properties. I don’t have confirmed information about that. Please contact our team directly: ${CONTACT}`);
  assert.equal(b.h.m.table('blueMessages').find(m => m.direction === 'out').ai.fallback, 'ai_timeout');
  const c = await business({ model: scriptedModel(() => 'A villa is 99 OMR a night.') });
  const [guarded] = await c.say('96891110007', 'how much is a villa?');
  assert.match(guarded, /Please contact our team directly/, 'an invented price never goes out');
  assert.doesNotMatch(guarded, /99 OMR/);
  assert.equal(c.h.m.table('blueMessages').find(m => m.direction === 'out').ai.fallback, 'untraced_price');
});

test('what needs a person gets the team contact and Layla stays on the chat', async () => {
  const model = scriptedModel(q => (/person/.test(q) ? { reply: 'Of course.', intent: 'human', needs_team: true } : 'We rent villas.'));
  const b = await business({ model });
  const [first] = await b.say('96891110008', 'I want to talk to a person');
  assert.equal(first, `Of course. Please contact our team directly: ${CONTACT}`);
  assert.equal(b.conversation('96891110008').takeover, false);
  assert.deepEqual(await b.say('96891110008', 'do you rent villas?'), ['We rent villas.']);
});

test('the flood guard stays deterministic: after ten automated replies an hour, one notice and Layla stops', async () => {
  const model = scriptedModel(q => `Noted: ${q}`);
  const b = await business({ model });
  for (let i = 0; i < 10; i++) await b.say('96891110009', `question ${i}`);
  const notice = await b.say('96891110009', 'question 10');
  assert.equal(notice.length, 1);
  assert.equal(b.conversation('96891110009').takeover, true);
  const calls = model.calls.length;
  assert.deepEqual(await b.say('96891110009', 'question 11'), []);
  assert.equal(model.calls.length, calls, 'a stopped chat never calls the model');
});

test('lead details: proposals are validated, owner values win, and only the one asked question is counted', async () => {
  const model = scriptedModel((q, messages) => {
    const ask = /"asked_field": "([a-z_]+)"/.exec(system(messages))?.[1] || null;
    return { reply: 'Thanks! Which area do you prefer?', fields: { need: 'rent', area: 'Atlantis' }, asked_field: ask };
  });
  const b = await business({ model });
  await b.say('96891110010', 'I am looking for a place');
  let c = b.contact('96891110010');
  assert.equal((c.fields || []).find(f => f.key === 'need'), undefined, 'nothing the customer did not say is kept');
  assert.equal((c.fields || []).find(f => f.key === 'area'), undefined);
  await b.say('96891110010', 'I want to rent');
  c = b.contact('96891110010');
  assert.equal(c.fields.find(f => f.key === 'need')?.value, 'rent', 'a listed option the customer named is kept');
  assert.equal(c.fields.find(f => f.key === 'area'), undefined, 'a place they never mentioned is refused');
  assert.ok((c.asked || []).length <= 1, 'at most one question per reply');
  await b.h.m.db.patch(c._id, { fields: [{ key: 'need', value: 'buy', source: 'owner', confidence: 1, at: 1 }] });
  await b.say('96891110010', 'still looking');
  assert.equal(b.contact('96891110010').fields.find(f => f.key === 'need').value, 'buy', 'never overwrites the owner');
});

test('stock lines are live facts in the prompt; order lines always go out word for word', async () => {
  const model = scriptedModel(() => 'Great choice!');
  const b = await business({ model, markdown: (await import('./helpers/layla-conversation.mjs')).retailDoc('informative'), sectorLabel: 'Retail', ascend: 'retail', seed: (await import('./helpers/layla-conversation.mjs')).seedBoutique });
  await b.say('96891110011', 'Hi, do you have the black abaya?');
  assert.match(system(model.calls[0]), /LIVE FACTS:\n- .*Black abaya.*25\.000 OMR/s);
  const [reply] = await b.say('96891110011', 'size 52 please, I want to order 1');
  assert.match(reply, /^Great choice!\n\nOrder #\d+ (is )?confirmed/, reply);
});

test('a photo or voice note is described to the model, which says what it cannot open', async () => {
  const model = scriptedModel(() => ({ reply: 'I can only read text here.', needs_team: true }));
  const b = await business({ model });
  const [reply] = await b.say('96891110012', { type: 'audio', audio: { id: 'media1' } });
  assert.equal(reply, `I can only read text here. Please contact our team directly: ${CONTACT}`);
  assert.match(system(model.calls[0]), /photo, voice note or file you cannot open/);
  assert.equal(lastCustomer(model.calls[0]), '[The customer sent a photo, voice note or file]');
});

test('Instagram goes through the same turn and keeps within 1000 bytes', async () => {
  const model = scriptedModel(() => 'نعم، '.repeat(400));
  const b = await fixtureBusiness('realestate', 'informative', 'instagram');
  const ig = await business({ model, channel: 'instagram' });
  const [reply] = await ig.say('96891110013', 'هل المعاينة مجانية؟');
  assert.ok(Buffer.byteLength(reply) <= 1000, `${Buffer.byteLength(reply)} bytes`);
  assert.match(system(model.calls[0]), /replying to a customer on Instagram/);
  void b;
});

test('publishing the catalog fences replies queued from the old prices', async () => {
  const b = await business({ model: scriptedModel(() => 'Valuations are free.') });
  await b.ingest(b.envelope('96891110014', 'is a valuation free?'));
  await b.turns();
  const job = b.queued()[0];
  assert.ok(job, 'a reply is queued');
  const { fenceRepliesForOwner } = await import('../convex/laylaTurn.js');
  assert.equal(await fenceRepliesForOwner(b.h.m.ctx, String(b.tenant.accountId), b.h.m.now()), true, 'catalog publish runs this (convex/blueCatalog.ts)');
  await b.flush();
  assert.equal(b.h.m.table('blueMessages').find(m => m._id === job._id).status, 'blocked', 'the stale reply never sends');
});

test('approved services and products reach the model with their price labels; drafts never do', async () => {
  const { randomUUID } = await import('node:crypto');
  const model = scriptedModel(() => 'Property management is 8% of annual rent.');
  const b = await business({ model });
  const entry = (name, status, label) => ({ ownerKey: String(b.tenant.accountId), entryKey: randomUUID(), kind: 'service', status, nameEn: name, nameAr: '', category: 'Services',
    benefitEn: 'We handle tenants and rent', benefitAr: '', descriptionEn: '', descriptionAr: '', availability: 'Muscat', prices: [{ type: 'fixed', currency: 'OMR', unit: '', label }],
    source: 'owner', confidence: 1, laylaUseEn: '', laylaUseAr: '', revision: 1, sortOrder: 0, createdAt: 1, updatedAt: 1 });
  await b.h.m.db.insert('blueCatalogEntries', entry('Property management', 'approved', '8% of annual rent'));
  await b.h.m.db.insert('blueCatalogEntries', entry('Secret draft', 'draft', '1 OMR'));
  const [reply] = await b.say('96891110015', 'how much is property management?');
  assert.equal(reply, 'Property management is 8% of annual rent.', 'a catalog price passes the price check');
  const prompt = system(model.calls[0]);
  assert.match(prompt, /- Property management \[Services\]: We handle tenants and rent \(availability: Muscat\) — price: 8% of annual rent/);
  assert.doesNotMatch(prompt, /Secret draft/);
});

test('cost guard: once the number has used its daily sends, no model call is made', async () => {
  const { RATE_LIMITS } = await import('../convex/blueMessagingState.js');
  const model = scriptedModel();
  const b = await business({ model });
  await b.h.m.db.insert('blueMessageRates', { key: `day:${b.integration.id}:${Math.floor(b.h.m.now() / 86400000)}`, count: RATE_LIMITS.perDay, expiresAt: b.h.m.now() + 86400000 });
  assert.deepEqual(await b.say('96891110016', 'hello'), []);
  assert.equal(model.calls.length, 0);
  assert.equal(b.h.m.table('blueMessages').filter(m => m.direction === 'in').length, 1, 'the message is still kept for the owner');
});
