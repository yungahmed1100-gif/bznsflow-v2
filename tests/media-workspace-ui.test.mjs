// Media's pure browser helpers: board columns, quick filters, deliverable lines and the form →
// operation mapping (times read in the studio's timezone; a locked brief never resends its scope).
import test from 'node:test';
import assert from 'node:assert/strict';
import { MEDIA_COLUMNS, columnsOf, mediaQuickFilter, deliverablesLine, buildMediaSubmission } from '../src/lib/hasib/mediaWork.js';
import { hasibArgs } from '../api/_lib/hasib/validate.js';
import { createHasibStrings } from '../src/lib/hasib/strings.js';

const rows = [
  { id: 'a', status: 'brief_incomplete', producerId: 'me' }, { id: 'b', status: 'awaiting_acceptance' }, { id: 'c', status: 'preproduction', blocker: 'prep_missing' },
  { id: 'd', status: 'review', proposedChanges: 0 }, { id: 'e', status: 'editing', proposedChanges: 1 }, { id: 'f', status: 'delivered' },
];

test('board columns follow the lifecycle; delivered work leaves the board', () => {
  const cols = columnsOf(rows);
  assert.deepEqual(MEDIA_COLUMNS.map(([id]) => id), ['brief', 'quoted', 'booked', 'production', 'review', 'accepted']);
  assert.deepEqual(Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, v.map(r => r.id)])), { brief: ['a'], quoted: ['b'], booked: ['c'], production: ['e'], review: ['d'], accepted: [] });
});

test('quick filters: mine, brief incomplete, shoot at risk, cut awaiting approval, extra scope', () => {
  const ids = q => mediaQuickFilter(rows, q, { actorAccountId: 'me' }).map(r => r.id);
  assert.deepEqual([ids('mine'), ids('brief_incomplete'), ids('shoot_at_risk'), ids('cut_awaiting'), ids('extra_scope'), ids('all').length], [['a'], ['a'], ['c'], ['d'], ['e'], 6]);
  assert.equal(deliverablesLine([{ format: 'video', quantity: 2, durationSeconds: 90 }, { format: 'stills_set', quantity: 1 }]), '2 × video (90s), 1 × stills_set');
});

test('forms map to operations; times are Muscat wall time; a locked brief sends no scope; the API keeps the payload', () => {
  const brief = buildMediaSubmission('brief', { contactId: 'c1', title: 'Film', productionType: 'video', format: 'video', quantity: '2', shootStartsAt: '2026-11-01T09:00', shootEndsAt: '2026-11-01T13:00',
    location: 'Muscat', deliveryDueAt: '2026-11-10T17:00', revisionAllowance: '2', channels: ['social'], clearance: 'pending' }, { requestId: 'r', timezone: 'Asia/Muscat' });
  assert.equal(brief.operation, 'media_production_save');
  assert.equal(brief.body.media.shootStartsAt, Date.UTC(2026, 10, 1, 5, 0));
  assert.deepEqual(brief.body.media.deliverables, [{ format: 'video', quantity: 2, language: 'ar' }]);
  const locked = buildMediaSubmission('brief', { productionId: 'p', version: '3', locked: true, title: 'Film', productionType: 'video', location: 'Muscat' }, { requestId: 'r' });
  for (const key of ['deliverables', 'productionType', 'shootStartsAt', 'shootEndsAt', 'revisionAllowance']) assert.equal(key in locked.body.media, false, key);
  assert.deepEqual(buildMediaSubmission('quote', { productionId: 'p', version: '2', quote: '1200.5', deposit: '' }, {}).body, { productionId: 'p', version: 2, media: { quoteMinor: 1200500 } });
  const args = hasibArgs('media_production_save', { ...brief.body, requestId: '00000000-0000-4000-8000-000000000000' });
  assert.equal(args.media.location, 'Muscat');
  assert.throws(() => hasibArgs('media_cut_submit', { productionId: 'p', version: 1, media: {} }), /invalid_request/);
});

test('refusals read as sentences on the media pack, and keep each sector’s own wording', () => {
  const en = createHasibStrings('en', 'media'), ar = createHasibStrings('ar', 'media');
  assert.match(en.reason('brief_incomplete:deliverables,location'), /Complete the brief first/);
  assert.match(ar.reason('resource_conflict'), /محجوزة/);
  assert.match(createHasibStrings('en', 'real-estate').reason('invalid_assignment'), /deal or listing/);
});
