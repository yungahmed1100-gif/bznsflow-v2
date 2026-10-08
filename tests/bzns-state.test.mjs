import test from 'node:test';
import assert from 'node:assert/strict';
import { executeReview } from '../convex/reviewState.js';
import { publishedSections } from '../convex/knowledgeSourceState.js';
import { convexMemory } from './helpers/convex-memory.mjs';

const doc = (hours = 'Sunday to Thursday 8:30 to 17:30') => `---
name: Qurum Coast Properties
sector: real-estate
---
## About us
Family agency in Muscat.
## What we offer
- Rentals and sales
## Hours
${hours}
## Location
Al Qurum, Muscat
## Team contact
WhatsApp +968 9100 2000
## FAQ
Q: Are viewings free?
A: Yes.
`;
const hash = c => c.repeat(64);
async function session(m, c = 'a') {
  const sessionHash = hash(c);
  assert.equal((await executeReview(m.ctx, { operation: 'create', sessionHash }, m.now())).ok, true);
  return sessionHash;
}
const rowFor = async (m, sessionHash) => (await m.db.query('blueReviewSessions').collect()).find(r => r.sessionHash === sessionHash);

test('draft saves are versioned and never touch the live profile', async () => {
  const m = convexMemory(); const s = await session(m);
  const saved = await executeReview(m.ctx, { operation: 'bzns_save', sessionHash: s, markdown: '## draft', version: 0 }, m.now());
  assert.equal(saved.ok, true);
  let row = await rowFor(m, s);
  assert.equal(row.bznsDraft.version, 1); assert.equal(row.profile, undefined);
  assert.equal((await executeReview(m.ctx, { operation: 'bzns_save', sessionHash: s, markdown: '## stale', version: 0 }, m.now())).reason, 'bzns_conflict');
  assert.equal((await executeReview(m.ctx, { operation: 'bzns_save', sessionHash: s, markdown: 'x'.repeat(10001), version: 1 }, m.now())).reason, 'bzns_too_long');
  row = await rowFor(m, s); assert.equal(row.bznsDraft.markdown, '## draft');
});

test('publish validates on the server, derives the profile and advances the journey', async () => {
  const m = convexMemory(); const s = await session(m);
  assert.equal((await executeReview(m.ctx, { operation: 'bzns_publish', sessionHash: s, markdown: doc().replace('Al Qurum', '[address]'), version: 0 }, m.now())).reason, 'bzns_invalid');
  assert.equal((await executeReview(m.ctx, { operation: 'bzns_publish', sessionHash: s, markdown: doc('Open 9 to 5, viewing fee 10 OMR'), version: 0 }, m.now())).reason, 'bzns_invalid');
  const published = await executeReview(m.ctx, { operation: 'bzns_publish', sessionHash: s, markdown: doc(), version: 0 }, m.now());
  assert.equal(published.ok, true);
  const row = await rowFor(m, s);
  assert.equal(row.profile.businessName, 'Qurum Coast Properties');
  assert.equal(row.profile.sector, 'Real estate');
  assert.match(row.profile.hours, /Sunday/);
  assert.equal(row.profile.handoffMode, 'inbox'); assert.equal(row.profile.reviewed, true);
  assert.deepEqual(row.profile.faqs, [{ question: 'Are viewings free?', answer: 'Yes.' }]);
  assert.equal(row.profileVersion, 1); assert.equal(row.journeyStep, 4);
  assert.equal(row.bznsPublished.revision, 1); assert.equal(row.bznsDraft.markdown, doc());
  // A signed-out draft has no tenant yet, so nothing is indexed for retrieval.
  assert.equal((await m.db.query('blueKnowledgeChunks').collect()).length, 0);
});

test('an account publish replaces only its own retrieval sections', async () => {
  const m = convexMemory(); const s = await session(m), other = await session(m, 'b');
  const mine = await m.db.insert('accounts', { email: 'owner@example.test' }), theirs = await m.db.insert('accounts', { email: 'other@example.test' });
  await m.db.patch((await rowFor(m, s))._id, { accountId: mine });
  await m.db.patch((await rowFor(m, other))._id, { accountId: theirs });
  assert.equal((await executeReview(m.ctx, { operation: 'bzns_publish', sessionHash: other, markdown: doc(), version: 0 }, m.now())).ok, true);
  assert.equal((await executeReview(m.ctx, { operation: 'bzns_publish', sessionHash: s, markdown: doc(), version: 0 }, m.now())).ok, true);
  assert.equal((await executeReview(m.ctx, { operation: 'bzns_publish', sessionHash: s, markdown: doc('Daily 9 to 9'), version: 1 }, m.now())).ok, true);
  const rows = await m.db.query('blueKnowledgeChunks').collect();
  const own = rows.filter(r => r.tenantId === String(mine)), foreign = rows.filter(r => r.tenantId === String(theirs));
  assert.equal(own.length, 6); assert.ok(own.every(r => r.revision === 2 && r.source === 'bzns'));
  assert.ok(own.some(r => r.text.includes('Daily 9 to 9')) && !own.some(r => r.text.includes('Sunday')));
  assert.equal(foreign.length, 6, 'another account is untouched');
  const row = await rowFor(m, s);
  assert.equal(row.profileVersion, 2); assert.equal(row.bznsPublished.revision, 2);
});

test('publish is refused while a connection attempt is in flight', async () => {
  const m = convexMemory(); const s = await session(m);
  await m.db.patch((await rowFor(m, s))._id, { operation: 'subscribe' });
  assert.equal((await executeReview(m.ctx, { operation: 'bzns_publish', sessionHash: s, markdown: doc(), version: 0 }, m.now())).reason, 'operation_conflict');
});

test('Layla reads the published sections by revision, however much other knowledge the account has', async () => {
  const m = convexMemory(); const s = await session(m);
  const mine = await m.db.insert('accounts', { email: 'owner@example.test' });
  await m.db.patch((await rowFor(m, s))._id, { accountId: mine });
  for (let i = 0; i < 120; i++) await m.db.insert('blueKnowledgeChunks', { tenantId: String(mine), revision: 7, locale: 'en', text: `website page ${i}`, source: 'website', approved: true, contentHash: `h${i}`, updatedAt: 0 });
  assert.equal((await executeReview(m.ctx, { operation: 'bzns_publish', sessionHash: s, markdown: doc(), version: 0 }, m.now())).ok, true);
  const row = await rowFor(m, s);
  const sections = await publishedSections(m.ctx, mine, row.bznsPublished.revision);
  assert.equal(sections.length, 6);
  assert.ok(sections.every(x => x.heading && x.body && !x.body.startsWith('#')), 'heading line stripped from the body');
  assert.deepEqual(await publishedSections(m.ctx, mine, undefined), [], 'nothing published, nothing quoted');
});
