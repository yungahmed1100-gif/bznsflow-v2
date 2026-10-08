// Catalyst dental reception flow (BznsBrain mode) through the real webhook path, with a scripted model:
// name → service → grounded answer → appointment preferences → reception. One detail per turn,
// volunteered details captured, known ones skipped, a declined name respected, corrections accepted,
// direct questions answered, person requests and health questions never met with a question, and
// no reply that implies a confirmed booking. Ascend's dental flow stays as it was.
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

test('dental: the name is asked first, even when WhatsApp shows one, then the service', async () => {
  const model = reception();
  const b = await clinic(model);
  await b.say('96891000001', 'Hello', { name: 'Sara WhatsApp' });
  assert.equal(askOf(model.calls.at(-1)), 'customer_name', 'a WhatsApp display name is not a confirmed name');
  await b.say('96891000001', 'Sara');
  assert.equal(b.contact('96891000001').customerName, 'Sara');
  assert.equal(askOf(model.calls.at(-1)), 'service', 'one detail per turn, in order');
  assert.match(lastPrompt(model), /\[S1\]/, 'BznsBrain labels its sources');
});

test('dental: everything volunteered is captured, known details are skipped, and the catalog service is linked', async () => {
  const model = reception();
  const b = await clinic(model);
  await b.say('96891000002', 'Hi, my name is Aisha and I want a cleaning');
  const c = b.contact('96891000002');
  assert.equal(c.customerName, 'Aisha');
  const service = c.fields.find(f => f.key === 'service');
  assert.equal(service.value, 'Cleaning');
  assert.equal(service.ref, CLEANING, 'the service links to the approved catalog entry');
  assert.equal(askOf(model.calls.at(-1)), null, 'nothing left to ask before the customer wants to come in');
});

test('dental: a direct price question is answered from the catalog while a question is pending', async () => {
  const model = scriptedModel((q, messages) => (/how much/i.test(q) ? { reply: 'Cleaning is From 15 OMR.', intent: 'prices', sources: ['C1'], reason: 'Price from the catalog.' } : { reply: 'Welcome. May I have your name?', intent: 'greeting', asked_field: askOf(messages) }));
  const b = await clinic(model);
  await b.say('96891000003', 'Hello');
  const [reply] = await b.say('96891000003', 'How much is cleaning?');
  assert.match(reply, /From 15 OMR/);
  assert.match(lastPrompt(model), /\[C1\] - Cleaning/, 'the catalog entry is offered as a labelled source');
});

test('dental: appointment interest leads to preferences, then a reception request with the team contact and Layla still on', async () => {
  const model = reception((q, messages, ask) => (/thursday/i.test(q) ? { fields: { preferred_time: 'Thursday 5pm' } } : {}));
  const b = await clinic(model);
  await b.say('96891000004', 'My name is Huda, I would like a cleaning appointment');
  assert.ok(b.contact('96891000004').appointmentInterestAt, 'the wish to come in is remembered');
  assert.equal(askOf(model.calls.at(-1)), 'preferred_time');
  const [reply] = await b.say('96891000004', 'Thursday 5pm please');
  const c = b.contact('96891000004');
  assert.equal(c.appointment?.status, 'requested');
  assert.equal(c.appointment.service, 'Cleaning');
  assert.equal(c.appointment.serviceRef, CLEANING);
  assert.equal(c.appointment.preferences, 'Thursday 5pm');
  assert.match(lastPrompt(model), /reception will contact them/i);
  assert.ok(reply, 'Layla replied');
  assert.equal(b.conversation('96891000004').takeover, false, 'no takeover: Layla stays on the chat');
  assert.equal(b.conversation('96891000004').handoffState, undefined, 'no attention queue');
  const listed = await b.h.dashboard('contacts', { sessionHash: b.tenant.sessionHash, status: 'appointment' });
  assert.deepEqual(listed.value.items.map(i => [i.appointment?.service, i.appointment?.preferences]), [['Cleaning', 'Thursday 5pm']], 'Customers filters appointment requests for reception');
});

test('dental: a request for a person or a health question is never met with a question', async () => {
  const model = reception();
  const b = await clinic(model);
  await b.say('96891000005', 'I want to talk to a person');
  assert.equal(askOf(model.calls.at(-1)), null);
  assert.match(lastPrompt(model), /Do not ask the customer for personal details/);
  await b.say('96891000006', 'my tooth hurts and the gum is bleeding');
  assert.equal(askOf(model.calls.at(-1)), null);
  assert.match(lastPrompt(model), /about their health: do not discuss it/);
  await b.say('96891000007', 'ابي اكلم موظف');
  assert.equal(askOf(model.calls.at(-1)), null, 'Arabic person request');
});

test('dental: a declined name is respected and Layla moves on', async () => {
  const model = reception();
  const b = await clinic(model);
  await b.say('96891000008', 'Hello');
  assert.equal(askOf(model.calls.at(-1)), 'customer_name');
  await b.say('96891000008', 'I prefer not to say');
  assert.equal(b.contact('96891000008').nameDeclined, true);
  assert.equal(askOf(model.calls.at(-1)), 'service', 'the next detail, not the name again');
  await b.say('96891000008', 'ok');
  assert.notEqual(askOf(model.calls.at(-1)), 'customer_name');
});

test('dental: corrections replace earlier details', async () => {
  const model = reception();
  const b = await clinic(model);
  await b.say('96891000009', 'My name is Aisha, I want whitening');
  assert.equal(b.contact('96891000009').fields.find(f => f.key === 'service').value, 'whitening');
  await b.say('96891000009', 'Sorry, actually a cleaning, and my name is Aysha');
  const c = b.contact('96891000009');
  assert.equal(c.fields.find(f => f.key === 'service').value, 'Cleaning');
  assert.equal(c.customerName, 'Aysha');
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
