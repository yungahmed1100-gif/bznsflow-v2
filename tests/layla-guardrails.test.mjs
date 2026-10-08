// The deterministic boundaries that stay outside the model: STOP, clinic content detection
// (used by Ascend clinics), and the final length cut.
import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReply } from '../api/_lib/layla/reply-guard.js';
import { clinicIngressDecision } from '../config/clinic-safety.js';
import { isOptOut, STOP_BUTTON } from '../config/layla-optout.js';

test('STOP is a whole-message decision in both languages, never a word inside a question', () => {
  for (const text of ['STOP', 'stop', 'Please stop', 'unsubscribe', 'opt out', 'توقف', 'إيقاف', 'لا تراسلني', 'stop!']) assert.equal(isOptOut(text), true, text);
  for (const text of ['stop by tomorrow?', 'does the bus stop near you?', 'I want to stop renting', 'hello']) assert.equal(isOptOut(text), false, text);
  assert.ok(STOP_BUTTON.test('Stop promotions') && STOP_BUTTON.test('إيقاف العروض'));
});

test('clinic content detection: withholds pain, not Spain or paint', () => {
  const dental = { sector: 'Dental clinics' };
  assert.equal(clinicIngressDecision('Do you have patients from Spain?', dental).withheld, false);
  assert.equal(clinicIngressDecision('Is the paint smell gone after renovation?', dental).withheld, false);
  assert.equal(clinicIngressDecision('I have pain in my tooth', dental).withheld, true);
  assert.equal(clinicIngressDecision('painful gums', dental).withheld, true);
});

test('replies are cut at a sentence or word boundary, never mid-price, and cleaned', () => {
  const long = Array.from({ length: 80 }, (_, i) => `Villa ${i} costs 25.000 OMR per month.`).join(' ');
  const out = safeReply(long, 1000);
  assert.ok(out.length <= 1000);
  assert.match(out, /month\.…?$|month\.$/, 'ends on a full sentence');
  assert.ok(!/\d\.\d{0,2}…?$/.test(out), 'never ends inside a number');
  assert.equal(safeReply('one\u0007two\n\n\n\nthree', 1000), 'onetwo\n\nthree');
  assert.equal(safeReply('short', 1000), 'short');
  const words = 'word '.repeat(400);
  assert.match(safeReply(words, 50), /^(word ){0,9}word…$/);
});
