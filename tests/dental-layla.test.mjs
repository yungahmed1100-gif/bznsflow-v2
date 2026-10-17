// Dental clinics and Layla. Catalyst is the same for every business (Ahmed, 2026-10-17): a dental
// sign-up on Catalyst gets the general flow (no dental reception, no healthcare prompt rules, normal text
// retention), and still never confirms a booking itself. Ascend's dental flow stays as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { business, dentalDoc, scriptedModel } from './helpers/layla-conversation.mjs';

const askOf = messages => /"asked_field": "([a-z_]+)"/.exec(messages[0].content)?.[1] || null;
/** A model that answers the question, asks what the backend planned, and reports what it heard. */
const reception = (extra = () => ({})) => scriptedModel((q, messages) => {
  const ask = askOf(messages);
  return { reply: `Thanks for your message.${ask ? ' Could you tell me one more detail' + '?' : ''}`, intent: 'answer', asked_field: ask, ...extra(q, messages, ask) };
});
const CLEANING = randomUUID();
const clinic = async (model, options = {}) => {
  const b = await business({ model, markdown: dentalDoc('informative'), sectorLabel: 'Dental clinics', ...options });
  await b.h.m.db.insert('blueCatalogEntries', { ownerKey: String(b.tenant.accountId), entryKey: CLEANING, kind: 'service', status: 'approved', nameEn: 'Cleaning', nameAr: 'تنظيف', category: 'Hygiene', benefitEn: '', benefitAr: '', descriptionEn: 'Scaling and polishing', descriptionAr: '',
    availability: '', prices: [{ type: 'from', currency: 'OMR', unit: '', label: 'From 15 OMR', amount: 15 }], source: 'manual', confidence: 1, laylaUseEn: '', laylaUseAr: '', revision: 1, sortOrder: 0, createdAt: 1, updatedAt: 1 });
  return b;
};
const lastPrompt = model => model.calls.at(-1)[0].content;

test('a dental sign-up on Catalyst gets the general flow: no reception, no healthcare rules, normal text retention', async () => {
  const model = reception();
  const b = await clinic(model);
  await b.say('96891000001', 'Hello', { name: 'Sara WhatsApp' });
  const contact = b.h.m.table('blueContacts')[0];
  assert.equal(contact.sectorId, 'other');
  assert.doesNotMatch(lastPrompt(model), /healthcare business|Dental clinics/);
  const inbound = b.h.m.table('blueMessages').find(m => m.direction === 'in');
  assert.ok(inbound.textExpiresAt - inbound.at > 86400000, 'chat text is kept like any other business');
});

test('dental: a direct price question is answered from the catalog while a question is pending', async () => {
  const model = scriptedModel((q, messages) => (/how much/i.test(q) ? { reply: 'Cleaning is From 15 OMR.', intent: 'prices', sources: ['C1'], reason: 'Price from the catalog.' } : { reply: 'Welcome. May I have your name?', intent: 'greeting', asked_field: askOf(messages) }));
  const b = await clinic(model);
  await b.say('96891000003', 'Hello');
  const [reply] = await b.say('96891000003', 'How much is cleaning?');
  assert.match(reply, /From 15 OMR/);
  assert.match(lastPrompt(model), /\[C1\] - Cleaning/, 'the catalog entry is offered as a labelled source');
});

test('dental: a reply that implies a confirmed booking never reaches the patient', async () => {
  const model = scriptedModel(() => ({ reply: "Great, you're booked for Thursday at 5. See you on Thursday!", intent: 'booking' }));
  const b = await clinic(model);
  const [reply] = await b.say('96891000010', 'Book me Thursday 5pm');
  assert.doesNotMatch(reply, /booked|see you on/i);
  assert.match(reply, /9100 2000/, 'the honest fallback gives the team contact');
});

test('Ascend dental keeps its own flow: the WhatsApp name counts and the prompt has no BznsBrain rules', async () => {
  const model = reception();
  const b = await clinic(model, { ascend: 'dental' });
  await b.say('96891000011', 'Hello', { name: 'Sara WhatsApp' });
  const prompt = lastPrompt(model);
  assert.notEqual(askOf(model.calls.at(-1)), 'customer_name');
  assert.doesNotMatch(prompt, /\[S1\]|"sources"|"declined"|about their health: do not discuss it/);
});
