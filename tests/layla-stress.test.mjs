// Load and abuse through the real webhook → Convex → worker path: hundreds of interleaved
// customers, webhook replays, repeated worker deliveries, a republish mid-burst and a bot
// ping-pong. Convex serialises mutations, so each delivery is applied one at a time here too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureBusiness, realEstateDoc } from './helpers/layla-conversation.mjs';
import { phrase } from '../config/layla-tones.js';
import { RATE_LIMITS } from '../convex/blueMessagingState.js';

const MINUTE = 60000;
const LINES = ['Hi', 'Sara', 'looking for a villa to rent in Al Mouj', 'are viewings free?', 'what documents do I need to rent?', 'thanks', 'any discount?', 'السلام عليكم', 'ابي شقة للايجار في القرم', 'متى تفتحون؟'];
const outbound = b => b.h.m.table('blueMessages').filter(m => m.direction === 'out');
const percentile = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];

/** The minute recovery cron: queued jobs older than a minute are dispatched again. */
async function drain(b, minutes) {
  for (let i = 0; i < minutes && b.queued().length; i++) { b.h.m.advance(MINUTE + 1000); await b.flush(); }
}

test('300 customers × 4 messages: one reply per message at most, paced, never sent twice, caps hold, queue drains', async () => {
  const b = await fixtureBusiness('realestate', 'informative');
  const senders = Array.from({ length: 300 }, (_, i) => `9689${String(1000000 + i)}`);
  const timings = [];
  for (let turn = 0; turn < 4; turn++) for (const [i, from] of senders.entries()) {
    b.h.m.advance(150);
    const started = performance.now();
    await b.ingest(b.envelope(from, LINES[(i + turn) % LINES.length]));
    timings.push(performance.now() - started);
    await b.turns();
    await b.flush();
  }
  await drain(b, 90);
  const inbound = b.h.m.table('blueMessages').filter(m => m.direction === 'in');
  assert.equal(inbound.length, 1200, 'every message stored once');
  const jobs = outbound(b).filter(m => !m.manual);
  assert.ok(jobs.length >= 900, `Layla answered the burst: ${jobs.length} reply jobs`);
  const perMessage = new Map();
  for (const job of jobs) perMessage.set(job.key, (perMessage.get(job.key) || 0) + 1);
  assert.ok([...perMessage.values()].every(n => n === 1), 'one reply job per inbound message');
  // The fake Meta records each send; a job id is never sent twice.
  const providerIds = jobs.map(j => j.providerId).filter(Boolean);
  assert.equal(new Set(providerIds).size, providerIds.length, 'no job delivered twice');
  assert.ok(b.sent.length <= RATE_LIMITS.perDay, `daily cap per number holds: ${b.sent.length}`);
  const perMinute = new Map();
  for (const j of jobs.filter(j => j.attemptAt)) perMinute.set(Math.floor(j.attemptAt / MINUTE), (perMinute.get(Math.floor(j.attemptAt / MINUTE)) || 0) + 1);
  assert.ok(Math.max(...perMinute.values()) <= RATE_LIMITS.perMinute, `never more than ${RATE_LIMITS.perMinute} sends a minute`);
  // Anything Layla could not send is visible to the team, never silently lost.
  for (const job of jobs.filter(j => j.status === 'blocked' && j.reason === 'rate_limit')) {
    assert.equal(b.h.m.table('blueConversations').find(c => c._id === job.conversationId).handoffState, 'open');
  }
  assert.equal(b.queued().length, 0, 'the queue drains');
  const p95 = percentile(timings, 0.95);
  assert.ok(p95 < 60, `p95 ingest ${p95.toFixed(1)}ms`);
});

test('the same webhook delivered three times produces one stored message and one reply', async () => {
  const b = await fixtureBusiness('retail', 'sweet');
  const body = b.envelope('96891230001', 'Hi, do you have the black abaya?');
  for (let i = 0; i < 3; i++) await b.ingest(body);
  await b.turns(); await b.flush();
  await b.ingest(body);
  await b.turns(); await b.flush();
  assert.equal(b.h.m.table('blueMessages').filter(m => m.direction === 'in').length, 1);
  assert.equal(b.sent.filter(s => !s.image).length, 1);
});

test('a job handed to the worker twice reaches Meta once', async () => {
  const b = await fixtureBusiness('realestate', 'sharp');
  await b.ingest(b.envelope('96891230002', 'Hi'));
  await b.turns();
  const [job] = b.queued();
  await b.runJob(job._id);
  await b.runJob(job._id);
  assert.equal(b.sent.length, 1);
});

test('republishing mid-burst fences replies written under the old document; new ones use the new style', async () => {
  const b = await fixtureBusiness('realestate', 'informative');
  for (const from of ['96891230010', '96891230011', '96891230012']) await b.ingest(b.envelope(from, 'Hi'));
  await b.turns();
  assert.equal(b.queued().length, 3);
  await b.republish(realEstateDoc('sharp'));
  await b.flush();
  assert.equal(b.sent.length, 0, 'replies composed for the old document never go out');
  assert.ok(outbound(b).every(j => j.status === 'blocked' && j.reason === 'conversation_or_profile_changed'));
  b.h.m.advance(MINUTE);
  const [reply] = await b.say('96891230013', 'Hi');
  assert.ok(reply, 'a new chat is answered under the new document');
  assert.match(b.model.calls.at(-1)[0].content, /Professional & sharp/, 'in the new style');
});

test('a bot ping-pong gets one notice and then silence, whatever it keeps sending', async () => {
  const b = await fixtureBusiness('realestate', 'informative');
  const from = '96891230020';
  const replies = [];
  for (let i = 0; i < 50; i++) replies.push(...await b.say(from, i % 2 ? 'Hello? Anyone there?' : 'hello? anyone there'));
  assert.equal(replies.filter(r => r === phrase('informative', 'replyLimit', 'en')).length, 1);
  assert.ok(replies.length <= 3, `only a couple of replies before the notice: ${replies.length}`);
  assert.equal(b.conversation(from).handoffReason, 'reply_limit');
});

test('a slow flood from one chat is capped at ten automated replies an hour', async () => {
  const b = await fixtureBusiness('realestate', 'informative');
  const from = '96891230030';
  const replies = [];
  for (let i = 0; i < 30; i++) { b.h.m.advance(90000); replies.push(...await b.say(from, `question number ${i}: do you have villas?`)); }
  assert.ok(replies.length <= 11, `${replies.length} replies`);
  assert.equal(replies.at(-1), phrase('informative', 'replyLimit', 'en'));
});
