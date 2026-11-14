// What Layla may not make up: times, days, waits, promises, and the customer's name or gender.
import test from 'node:test';
import assert from 'node:assert/strict';
import { untracedClaim, timesIn, daysIn, addressedNames } from '../config/layla-claims.js';

const SOURCES = [
  'Hours\nSunday to Thursday 8:30 to 17:30',
  'Delivery in Muscat within 2 days',
  'Sea view villa — price: 1,200 OMR per month',
  'customer: can I come Monday?',
].join('\n');
const check = (reply, about) => untracedClaim(reply, SOURCES, about);

test('a time is allowed only when the owner’s data states it', () => {
  assert.equal(check('We are open 8:30 to 17:30.'), '');
  assert.equal(check('We close at 5:30 pm.'), '', '17:30 and 5:30 pm are the same time');
  assert.equal(check('We are open until 9 pm.'), 'untraced_time');
  assert.equal(check('نفتح حتى الساعة ١٠'), 'untraced_time', 'Arabic digits and wording');
  assert.equal(check('دوامنا من 8:30 إلى 5:30 مساءً'), '');
  assert.equal(check('The villa is 1,200 OMR per month.'), '', 'a price is not a time');
  assert.deepEqual([...timesIn('8 am, 20:15 and 99:99')].sort(), ['8:00', '8:15']);
});

test('a day is allowed when the data names it or a range covers it', () => {
  assert.equal(check('Yes, we are open on Monday.'), '');
  assert.equal(check('We are open on Friday too.'), 'untraced_day');
  assert.equal(check('نفتح يوم الجمعة'), 'untraced_day');
  assert.equal(check('نفتح يوم الأربعاء'), '');
  assert.equal(untracedClaim('Open on Friday.', 'Open daily 9:00 to 21:00'), '', 'daily covers every day');
  assert.deepEqual([...daysIn('Saturday to Monday', { ranges: true })].sort(), [0, 1, 6], 'a range wraps the week');
  assert.equal(check('See you tomorrow.'), 'untraced_day');
  assert.equal(untracedClaim('نشوفكم بكرة', 'customer: ابي اجي بكرة'), '', 'the customer said it first');
});

test('a waiting time is allowed only as the data states it', () => {
  assert.equal(check('Delivery takes 2 days.'), '');
  assert.equal(check('It arrives within 3 hours.'), 'untraced_wait');
  assert.equal(check('يوصلك خلال ٣٠ دقيقة'), 'untraced_wait');
});

test('promises are refused in their affirmative form only', () => {
  assert.equal(check('I can’t agree discounts here.'), '');
  assert.equal(check('We can give you a discount.'), 'unbacked_promise');
  assert.equal(check('لك خصم خاص'), 'unbacked_promise');
  assert.equal(check('Free delivery for you.'), 'unbacked_promise');
  assert.equal(check('أبشر، طلبك جاهز'), 'unbacked_promise');
  assert.equal(
    untracedClaim('Free delivery in Muscat.', 'We offer free delivery in Muscat'),
    '',
    'the owner promised it',
  );
});

test('Layla uses the customer’s own name, and never guesses a gender', () => {
  assert.equal(check('Hello Noura, how can I help?', { customerName: 'Noura Al Balushi' }), '');
  assert.equal(check('Hello Sara, how can I help?', { customerName: 'Noura' }), 'wrong_name');
  assert.equal(check('Hello Ahmed!'), 'wrong_name', 'no known name: none may be used');
  assert.equal(check('حياكم الله يا نورة', { customerName: 'نورة' }), '');
  assert.equal(check('حياك الله يا أحمد', { customerName: 'نورة' }), 'wrong_name');
  assert.equal(check('Hello there, how can I help?'), '');
  assert.equal(check('يا هلا ومرحبا'), '');
  assert.equal(check('Yes sir, we have it.'), 'gendered_address');
  assert.equal(check('تفضل أستاذ'), 'gendered_address');
  assert.equal(check('حياكم الله، تفضلوا'), '', 'the respectful plural fits anyone');
  assert.deepEqual(addressedNames('Thank you, Noura! Hello again.'), ['noura']);
});

test('Arabic replies stay Gulf or formal, never another dialect', () => {
  assert.equal(check('عايز إيه بالظبط؟', { lang: 'ar' }), 'other_dialect');
  assert.equal(check('شو بدك؟', { lang: 'ar' }), 'other_dialect');
  assert.equal(check('حياكم الله، شو تحتاجون؟', { lang: 'ar' }), '', '"شو" is also Gulf');
  assert.equal(check('هلا والله، كيف أقدر أخدمكم؟', { lang: 'ar' }), '');
});
