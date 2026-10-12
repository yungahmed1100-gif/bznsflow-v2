// Outcomes the owner can count, recorded as facts: qualified, team referral, and how far setup got.
import test from 'node:test';
import assert from 'node:assert/strict';
import { detailsOf, nextOutcome, firstStamps } from '../convex/laylaOutcomes.js';
import { activationStage } from '../convex/activationStage.js';
import { requiredKeys } from '../config/layla-qualification.js';

const sector = 'real-estate', required = requiredKeys(sector);
const field = (key, value = 'x') => ({ key, value });

test('details split into captured and missing for the sector’s required keys', () => {
  assert.ok(required.length > 0);
  const d = detailsOf(sector, [field(required[0]), field('unrelated')]);
  assert.deepEqual(d, { required, captured: [required[0]], missing: required.slice(1) });
});

test('qualified is stamped once, the first time every required detail is known', () => {
  const partial = nextOutcome({ sectorId: sector, fields: [field(required[0])], needsTeam: false, now: 1 });
  assert.equal(partial.qualifiedAt, undefined);
  const full = nextOutcome({ previous: partial, sectorId: sector, fields: required.map(k => field(k)), needsTeam: false, now: 2 });
  assert.equal(full.qualifiedAt, 2);
  const later = nextOutcome({ previous: full, sectorId: sector, fields: required.map(k => field(k)), needsTeam: false, now: 3 });
  assert.equal(later, null, 'nothing new, nothing written');
});

test('a team referral records when and why, and keeps what was known', () => {
  const o = nextOutcome({ sectorId: sector, fields: [field(required[0])], needsTeam: true, intent: 'human', now: 5 });
  assert.deepEqual(o.referral, { at: 5, reason: 'human' });
  assert.deepEqual(o.captured, [required[0]]);
  const stamps = firstStamps({}, o, 5);
  assert.equal(stamps.firstTeamReferralAt, 5);
  assert.equal(firstStamps(stamps, { referral: { at: 9 } }, 9).firstTeamReferralAt, 5, 'the first referral is never moved');
});

test('the access list shows the furthest stage reached, from recorded times only', () => {
  assert.deepEqual(activationStage({ account: null, row: null, grantedAt: 1 }), { stage: 'granted', at: 1 });
  assert.equal(activationStage({ account: { _creationTime: 2 }, row: null }).stage, 'signed_up');
  assert.equal(activationStage({ account: { _creationTime: 2 }, row: { bznsPublished: { publishedAt: 3 } } }).stage, 'published');
  assert.deepEqual(activationStage({ account: {}, row: { metrics: { firstPublishedAt: 3, firstActivatedAt: 4, firstReplySentAt: 5 } } }), { stage: 'first_reply', at: 5 });
  assert.equal(activationStage({ account: {}, row: { metrics: { firstQualifiedAt: 9, firstActivatedAt: 4 } } }).stage, 'qualified');
});
