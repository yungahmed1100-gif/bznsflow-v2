import test from 'node:test';
import assert from 'node:assert/strict';
import { TONE_IDS, PHRASE_KEYS, phrase, toneOf, DEFAULT_TONE, customerSlot } from '../config/layla-tones.js';

const EMOJI = /\p{Extended_Pictographic}/gu;
const MONEY = /\d\s*(OMR|RO|ر\.?\s?ع|ريال|\$)|(OMR|RO|\$)\s*\d/i;
const vars = { business: 'Qurum Coast', customer: ', Sara', list: 'your name', contact: 'team@example.test', number: 7, items: '1 × Abaya', total: '25.000 OMR', name: 'Abaya', price: '25.000 OMR', options: '52 and 54' };

test('every style has every phrase in both languages, filled and short', () => {
  for (const tone of TONE_IDS) for (const lang of ['en', 'ar']) for (const key of PHRASE_KEYS) {
    const text = phrase(tone, key, lang, vars);
    assert.ok(text.trim().length > 3, `${tone}/${lang}/${key} empty`);
    assert.ok(!/\{\w+\}/.test(text), `${tone}/${lang}/${key} has an unfilled slot`);
    assert.ok(text.length <= 300, `${tone}/${lang}/${key} too long`);
  }
});

test('the three styles read differently for customer-facing lines', () => {
  for (const key of ['welcome', 'askMore', 'contactSuffix']) for (const lang of ['en', 'ar']) {
    assert.equal(new Set(TONE_IDS.map(t => phrase(t, key, lang, vars))).size, 3, `${key}/${lang}`);
  }
});

test('Informative & nice is the default and keeps the pre-style wording', () => {
  assert.equal(DEFAULT_TONE, 'informative');
  assert.equal(toneOf(undefined), 'informative');
  assert.equal(toneOf('bogus'), 'informative');
  assert.equal(phrase(undefined, 'askMore', 'en', { list: 'your area' }), 'To help you further, could you share your area?');
  assert.equal(phrase('informative', 'askMore', 'ar', { list: 'منطقتك' }), 'حتى نساعدك بشكل أفضل، ممكن تخبرنا منطقتك؟');
  assert.equal(phrase('informative', 'outOfStock', 'en', { name: 'Black abaya' }), 'Black abaya is out of stock right now — we’ll let you know when it’s back.');
  assert.equal(phrase('informative', 'orderReceived', 'en', { number: 3 }), 'Order #3 received — the team will confirm availability and the total shortly.');
  assert.equal(phrase('informative', 'unknown', 'en'), 'I don’t have confirmed information about that.');
});

test('emoji appear only in Helpful & sweet, at most one per phrase', () => {
  for (const tone of TONE_IDS) for (const lang of ['en', 'ar']) for (const key of PHRASE_KEYS) {
    const count = (phrase(tone, key, lang, vars).match(EMOJI) || []).length;
    if (tone === 'sweet') assert.ok(count <= 1, `${lang}/${key} has ${count} emoji`);
    else assert.equal(count, 0, `${tone}/${lang}/${key} must not use emoji`);
  }
});

test('phrases never carry prices of their own', () => {
  for (const tone of TONE_IDS) for (const lang of ['en', 'ar']) for (const key of PHRASE_KEYS) {
    assert.ok(!MONEY.test(phrase(tone, key, lang, {})), `${tone}/${lang}/${key}`);
  }
});

test('the welcome names the business and Layla, with the customer when known', () => {
  for (const tone of TONE_IDS) {
    assert.match(phrase(tone, 'welcome', 'en', { business: 'Qurum Coast', customer: customerSlot('Sara', 'en') }), /Layla[\s\S]*Qurum Coast|Qurum Coast[\s\S]*Layla/);
    assert.match(phrase(tone, 'welcome', 'en', { business: 'Qurum Coast', customer: customerSlot('Sara', 'en') }), /Sara/);
    assert.match(phrase(tone, 'welcome', 'ar', { business: 'ساحل القرم', customer: customerSlot('سارة', 'ar') }), /ليلى[\s\S]*ساحل القرم/);
    assert.ok(!phrase(tone, 'welcome', 'en', { business: 'X', customer: customerSlot('', 'en') }).includes(',,'));
  }
});
