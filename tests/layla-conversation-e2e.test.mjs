// Conversation end to end: a business published from a real bzns.md, real WhatsApp
// envelopes through ingestBlueEnvelope → liveAnswer → Convex ingest → worker → a fake
// Meta sender. Asserts exactly what each customer would receive, in every style.
import test from 'node:test';
import assert from 'node:assert/strict';
import { business } from './helpers/layla-conversation.mjs';
import { phrase } from '../config/layla-tones.js';

const lines = { en: { hi: 'Hi', name: 'Sara', hours: 'What are your opening hours?', discount: 'any discount?' }, ar: { hi: 'السلام عليكم', name: 'سارة', hours: 'متى ساعات الدوام؟', discount: 'في خصم؟' } };

for (const tone of ['sharp', 'sweet', 'informative']) for (const lang of ['en', 'ar']) {
  test(`${tone}/${lang}: welcome names the business and Layla, captures the name, answers facts verbatim, hands off negotiation`, async () => {
    const b = await business({ tone });
    const from = `96891${lang === 'ar' ? 2 : 1}${String(['sharp', 'sweet', 'informative'].indexOf(tone)).padStart(5, '0')}`;
    const [welcome] = await b.say(from, lines[lang].hi);
    assert.ok(welcome.includes('Qurum Coast Properties'), welcome);
    assert.match(welcome, lang === 'ar' ? /ليلى/ : /Layla/);
    assert.ok(welcome.startsWith(phrase(tone, 'welcome', lang, { business: 'Qurum Coast Properties', customer: '' })), `starts with the ${tone} welcome: ${welcome}`);
    assert.match(welcome, lang === 'ar' ? /اسمك/ : /your name/, 'asks for the name in the first message');
    assert.equal((welcome.match(lang === 'ar' ? /أهلاً|مرحبا/g : /\bHello\b|\bHi\b/g) || []).length <= 1, true, 'never greets twice');
    const [afterName] = await b.say(from, lines[lang].name);
    assert.equal(b.contact(from).customerName, lines[lang].name, 'name captured within two Layla messages');
    void afterName;
    const [hours] = await b.say(from, lines[lang].hours);
    assert.ok(hours.includes('Sunday to Thursday 8:30 to 17:30'), `owner fact unchanged: ${hours}`);
    assert.ok(!/your name|اسمك/.test(hours), 'never asks for the name again once known');
    const [nego] = await b.say(from, lines[lang].discount);
    assert.equal(nego, phrase(tone, 'negotiation', lang));
    assert.equal(b.conversation(from).handoffReason, 'negotiation');
    assert.deepEqual(await b.say(from, lines[lang].hours), [], 'nothing automated after a handoff');
  });
}

test('a WhatsApp profile name is used straight away; Layla asks only for the interest', async () => {
  const b = await business();
  const [first] = await b.say('96893000001', 'Hello', { name: 'Mariam Al Balushi' });
  assert.match(first, /^Hello, Mariam, I’m Layla from Qurum Coast Properties\./);
  assert.ok(!/your name/.test(first), first);
  assert.match(first, /could you share .+\?$/, 'still asks for the interest');
});

test('abuse, media, long text, opt-out and legal advice each get the right single response and reason', async () => {
  const b = await business({ tone: 'sharp' });
  // First messages open with the welcome, except abuse, which gets the calm notice alone.
  const hello = phrase('sharp', 'welcome', 'en', { business: 'Qurum Coast Properties', customer: '' });
  assert.deepEqual(await b.say('96894000001', 'you are useless, idiot'), [phrase('sharp', 'abuse', 'en', { business: 'Qurum Coast Properties' })]);
  assert.equal(b.conversation('96894000001').handoffReason, 'abuse');
  assert.deepEqual(await b.say('96894000002', { type: 'image', image: { id: 'media1' } }), [`${hello} ${phrase('sharp', 'media', 'en')}`]);
  assert.equal(b.conversation('96894000002').handoffReason, 'unsupported_media');
  assert.deepEqual(await b.say('96894000003', { type: 'text', text: { body: 'I need help with '.repeat(80) } }), [`${hello} ${phrase('sharp', 'tooLong', 'en')}`]);
  assert.equal(b.conversation('96894000003').handoffReason, 'too_long');
  assert.deepEqual(await b.say('96894000004', 'STOP'), []);
  assert.equal(b.contact('96894000004').optout, true);
  const legal = await business({ sector: 'legal', sectorLabel: 'Legal services', name: 'Muscat Law Partners' });
  assert.deepEqual(await legal.say('96894000005', 'Should I sue my landlord?'), [`${phrase('informative', 'welcome', 'en', { business: 'Muscat Law Partners', customer: '' })} ${phrase('informative', 'adviceBoundary', 'en')}`]);
  assert.equal(legal.conversation('96894000005').handoffReason, 'advice_boundary');
});

test('a looping sender gets one notice and goes to the team', async () => {
  const b = await business();
  const from = '96895000001';
  const replies = [];
  for (let i = 0; i < 4; i++) replies.push(...await b.say(from, 'hello?'));
  assert.equal(replies.at(-1), phrase('informative', 'replyLimit', 'en'));
  assert.equal(b.conversation(from).handoffReason, 'reply_limit');
  assert.deepEqual(await b.say(from, 'hello?'), [], 'silent after the notice');
});

test('clinic safety reply is sent once a day per chat, never repeated to a patient', async () => {
  const b = await business({ sector: 'dental', sectorLabel: 'Dental clinics', name: 'Bright Smile Dental' });
  const first = await b.say('96896000001', 'I have pain in my tooth');
  assert.match(first[0], /9999/);
  b.conversation('96896000001') && await b.h.m.db.patch(b.conversation('96896000001')._id, { takeover: false });
  assert.deepEqual(await b.say('96896000001', 'the pain is worse now'), [], 'no second safety message the same day');
});

test('a normal back-and-forth is never capped; only an eleventh automated reply in an hour hands off', async () => {
  const b = await business();
  const from = '96897000001';
  const questions = ['What services do you offer?', 'Where are you located?', 'What are your opening hours?', 'Are viewings free?', 'Do you offer property sales?',
    'Where is your office?', 'When are you open?', 'Do you do rentals?', 'What is your address?', 'What do you offer?', 'Do you sell villas?'];
  const replies = [];
  // Two minutes apart: a realistic chat inside one hour, clear of the per-minute sending limit.
  for (const q of questions) { b.h.m.advance(120000); replies.push((await b.say(from, q))[0]); }
  assert.ok(replies.slice(0, 10).every(r => r && r !== phrase('informative', 'replyLimit', 'en')), JSON.stringify(replies));
  assert.notEqual(b.conversation(from).handoffReason, 'needs_review', 'every one of the ten was answered');
  assert.equal(replies[10], phrase('informative', 'replyLimit', 'en'));
  assert.equal(b.conversation(from).handoffReason, 'reply_limit');
});
