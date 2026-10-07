import test from 'node:test';
import assert from 'node:assert/strict';
import { composeReply, continuationReply, runawayChat, CONVERSATION_REPLY_CAP } from '../convex/laylaReply.js';
import { answerFromDocument, matchFaq, matchSection, plainSection } from '../api/_lib/layla/document-answer.js';
import { classify } from '../api/_lib/layla/domain.js';
import { extractBareName, extractQualification, isQuestion, planQuestions } from '../config/layla-qualification.js';
import { langOf, phrase, stripEmoji } from '../config/layla-tones.js';

const sections = [
  { key: 'other', heading: 'Delivery and pickup', body: 'We deliver across Muscat within 2 days.' },
  { key: 'other', heading: 'Returns and exchanges', body: '- Exchanges within 7 days\n- Keep the **receipt**' },
  { key: 'handoff', heading: 'When Layla should hand over to the team', body: 'Negotiations and complaints.' },
  { key: 'hours', heading: 'Hours', body: 'Daily 9 to 6' },
];

test('document answers quote the owner verbatim and never the hand-over instructions', () => {
  assert.equal(matchSection('do you deliver to Seeb?', sections).heading, 'Delivery and pickup');
  assert.equal(matchSection('تقدرون توصلون للسيب؟', sections).heading, 'Delivery and pickup');
  assert.equal(answerFromDocument('can I return it?', { sections }).text, '• Exchanges within 7 days\n• Keep the receipt');
  assert.equal(matchSection('when do you hand over to the team?', sections), null);
  assert.equal(matchSection('what are your hours?', sections), null, 'profile facts answer hours, not a quoted section');
  assert.equal(matchSection('is it available in black?', sections), null);
  assert.equal(plainSection('[Google Maps](https://maps.app.goo.gl/x)'), 'Google Maps: https://maps.app.goo.gl/x');
});

test('a reworded FAQ matches only when it clearly means the same question', () => {
  const faqs = [{ question: 'Are viewings free?', answer: 'Yes.' }, { question: 'Do you manage properties for owners who live abroad?', answer: 'We do.' }];
  assert.equal(matchFaq('is viewing free', faqs)?.answer, 'Yes.');
  assert.equal(matchFaq('Do you manage properties for owners abroad?', faqs)?.answer, 'We do.');
  assert.equal(matchFaq('are you free on Friday?', faqs), null);
  assert.equal(matchFaq('do you manage', faqs), null);
});

test('small talk is never a question for the team', () => {
  for (const [text, intent] of [['thanks', 'thanks'], ['ok thanks', 'thanks'], ['شكرا جزيلا', 'thanks'], ['ok', 'ack'], ['👍', 'ack'], ['تمام', 'ack'], ['bye', 'ack'], ['??', 'greeting'], ['hello again', 'greeting'], ['السلام عليكم ورحمة الله وبركاته', 'greeting']]) assert.equal(classify(text), intent, text);
  for (const text of ['no', 'ok, what about villas?', '', 'it is ok?']) assert.ok(!['ack', 'thanks'].includes(classify(text)), text);
});

test('names, questions and stated interests are told apart', () => {
  for (const text of ['Sara', 'سارة الهنائي', 'Ahmed Al Balushi']) assert.ok(extractBareName(text), text);
  for (const text of ['bye', 'كم سعرها؟', 'ok thanks', 'what', 'Hello there']) assert.equal(extractBareName(text), null, text);
  for (const text of ['helo do u hav villas', 'كم السعر', 'any villas?']) assert.equal(isQuestion(text), true, text);
  for (const text of ["Hi I'm Ahmed, looking for a villa", 'looking for a 2 bedroom apartment in Qurum']) assert.equal(isQuestion(text), false, text);
  assert.equal(langOf('مرحبا'), 'ar');
  assert.equal(langOf('hello'), 'en');
});

test('fields come from what the customer means', () => {
  const values = (text, extra = {}) => Object.fromEntries(extractQualification({ text, sectorId: 'real-estate', intent: 'unknown', ...extra }).updates.map(u => [u.key, u.value]));
  assert.deepEqual(values('ابي فيلا للايجار في الموج', { asked: ['area'] }), { need: 'rent', property_type: 'villa', area: 'الموج' });
  assert.deepEqual(values('عندكم شقق للبيع؟'), { need: 'buy', property_type: 'apartment' });
  assert.deepEqual(values('WHERE IS YOUR OFFICE', { intent: 'location' }), {});
  assert.deepEqual(values('3 bedrooms'), { bedrooms: '3' });
});

test('the same question is not asked twice in a row, except when a booking makes it the moment', () => {
  const base = { sectorId: 'real-estate', fields: [], asked: ['need', 'property_type', 'area'], askCounts: [], lastAskedAt: 1000, now: 2000, lang: 'en', knownName: true };
  assert.equal(planQuestions({ ...base, intent: 'services' }).text, '');
  assert.equal(planQuestions({ ...base, intent: 'services', now: 1000 + 31 * 60000 }).keys.length, 3);
  const dental = { ...base, sectorId: 'dental', asked: ['preferred_time', 'location'] };
  assert.notEqual(planQuestions({ ...dental, intent: 'disabled', fields: [{ key: 'service', value: 'cleaning' }] }).text, '');
});

test('composed replies: one welcome, one emoji, facts untouched, questions recorded only when whole', () => {
  const welcome = composeReply({ firstReply: true, intent: 'greeting', reply: 'x', questions: phrase('sweet', 'askMore', 'en', { list: 'your name' }), tone: 'sweet', lang: 'en', business: 'Nour' });
  assert.equal(welcome.text, 'Hi! I’m Layla from Nour 😊\n\nSo I can help you better, could you tell me your name?');
  assert.equal(welcome.asked, true);
  const fact = composeReply({ firstReply: true, intent: 'faq', reply: 'Yes 🎉 we deliver', tone: 'sweet', lang: 'en', business: 'Nour', questions: 'Could you tell me? 🙏' });
  assert.equal(fact.text, 'Hi! I’m Layla from Nour. Yes 🎉 we deliver\n\nCould you tell me?', 'the owner’s emoji stays; Layla’s give way');
  const thanks = composeReply({ firstReply: false, intent: 'answer', reply: continuationReply({ tone: 'informative', lang: 'en', newName: 'Sara Ali' }), tone: 'informative', lang: 'en' });
  assert.equal(thanks.text, 'Thank you, Sara. How can I help you today?');
  const order = composeReply({ firstReply: false, intent: 'answer', reply: 'Thank you.', ack: 'Order #4 received.', tone: 'informative', lang: 'en' });
  assert.equal(order.text, 'Thank you.\n\nOrder #4 received.');
  const abuse = composeReply({ firstReply: true, intent: 'abuse', handoffReason: 'abuse', reply: 'Calm notice.', tone: 'informative', lang: 'en', business: 'Nour' });
  assert.equal(abuse.text, 'Calm notice.');
  assert.equal(stripEmoji('We’ll message you 😊'), 'We’ll message you.');
});

test('the runaway guard trips on a loop or the hourly cap, never on a normal chat', () => {
  assert.equal(runawayChat({ recentInbound: ['hello?', 'Hello?', 'hello'], automatedLastHour: 2 }, 'hello'), true);
  assert.equal(runawayChat({ recentInbound: ['hi', 'what are your hours', 'thanks'], automatedLastHour: 3 }, 'thanks'), false);
  assert.equal(runawayChat({ recentInbound: [], automatedLastHour: CONVERSATION_REPLY_CAP }, 'new question'), true);
  assert.equal(runawayChat({ recentInbound: ['👍', '👍', '👍'], automatedLastHour: 0 }, '👍'), false, 'emoji carry no text to loop on');
});
