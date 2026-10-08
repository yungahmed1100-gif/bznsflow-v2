import test from 'node:test';
import assert from 'node:assert/strict';
import { runawayChat, CONVERSATION_REPLY_CAP } from '../convex/laylaReply.js';
import { extractBareName, extractQualification, isQuestion, planQuestions } from '../config/layla-qualification.js';
import { langOf } from '../config/layla-tones.js';


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

test('the runaway guard trips on a loop or the hourly cap, never on a normal chat', () => {
  assert.equal(runawayChat({ recentInbound: ['hello?', 'Hello?', 'hello'], automatedLastHour: 2 }, 'hello'), true);
  assert.equal(runawayChat({ recentInbound: ['hi', 'what are your hours', 'thanks'], automatedLastHour: 3 }, 'thanks'), false);
  assert.equal(runawayChat({ recentInbound: [], automatedLastHour: CONVERSATION_REPLY_CAP }, 'new question'), true);
  assert.equal(runawayChat({ recentInbound: ['👍', '👍', '👍'], automatedLastHour: 0 }, '👍'), false, 'emoji carry no text to loop on');
});
