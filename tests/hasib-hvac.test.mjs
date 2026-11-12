// Air conditioning: the HVAC six-tab workspace's records. Jobs move only by recorded facts, an
// estimate version needs its own yes, a technician cannot be in two places, a technician sees only
// their own jobs and no prices, and nothing crosses tenants.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shop,
  customer,
  unit,
  job,
  jobRow,
  visitRow,
  estimateRow,
  move,
  book,
  visitMove,
  estimate,
  issue,
  approve,
  checklist,
  completeJob,
  value,
  refused,
  randomUUID,
  HOUR,
  DAY,
} from './fixtures/ascend/hvac.mjs';
import { contractVisitDates, moveRefusal, scopeApproved } from '../convex/hasib/hvacDomain.js';
import { mergeHvacSettings, hvacSettings, outsideAreas } from '../convex/hasib/hvacSettings.js';

test('a staff job goes request → estimate → yes → visit → repair → tested → completed, and is charged its approved price', async () => {
  const c = await shop();
  const sara = await customer(c, 'Sara');
  const u = value(await unit(c, c.desk, sara.id));
  const j = value(
    await job(c, c.desk, sara.id, { jobType: 'gas_refill', unitIds: [u.id], reportedSymptom: 'not_cooling' }),
  );
  assert.deepEqual(
    [j.status, j.urgent, j.number],
    ['triaged', true, 1],
    'staff jobs start triaged; "not cooling" is urgent, not a diagnosis',
  );
  refused(await move(c, c.desk, j.id, 'repairing'), 'invalid_transition');
  const e1 = value(await estimate(c, c.desk, j.id, c.gas));
  assert.deepEqual([e1.estimateNumber, e1.status, e1.totalMinor], [1, 'draft', 15000]);
  refused(await issue(c, c.desk, e1.id), 'manager_required');
  value(await issue(c, c.manager, e1.id));
  assert.equal(jobRow(c, j.id).status, 'estimate_pending');
  // A second version supersedes the first: the yes to v1 can no longer be recorded.
  const e2 = value(
    await c.manager('hvac_estimate_save', {
      requestId: randomUUID(),
      jobId: j.id,
      hvac: {
        lines: [
          { kind: 'service', name: 'Gas refill R410A', variantId: c.gas.variantId, qty: 2, unitPriceMinor: 15000 },
        ],
      },
    }),
  );
  value(await issue(c, c.manager, e2.id));
  refused(await approve(c, c.desk, j.id, e1.id), 'estimate_changed');
  refused(
    await c.desk('hvac_approval_record', {
      jobId: j.id,
      version: jobRow(c, j.id).version,
      estimateId: e2.id,
      approvedBy: 'Sara',
      evidenceSource: 'telepathy',
    }),
    'approval_evidence_required',
  );
  value(await approve(c, c.desk, j.id, e2.id, 'whatsapp'));
  assert.deepEqual(
    [jobRow(c, j.id).status, jobRow(c, j.id).approvedEstimateNumber, estimateRow(c, e1.id).status],
    ['approved', 2, 'superseded'],
  );
  refused(await move(c, c.desk, j.id, 'repairing'), 'visit_not_started');
  const v = value(await book(c, c.desk, j.id, 3 * HOUR));
  assert.equal(jobRow(c, j.id).status, 'scheduled');
  refused(await visitMove(c, c.tech, v.id, 'arrived'), 'visit_not_started');
  c.h.m.advance(3 * HOUR);
  value(await visitMove(c, c.tech, v.id, 'arrived'));
  assert.equal(jobRow(c, j.id).status, 'on_site');
  value(await move(c, c.tech, j.id, 'repairing'));
  refused(await move(c, c.tech, j.id, 'tested'), 'checklist_required');
  value(await checklist(c, c.tech, j.id, ['pass', 'fail']));
  value(await move(c, c.tech, j.id, 'tested'));
  refused(await move(c, c.tech, j.id, 'completed'), 'check_failed');
  value(await checklist(c, c.tech, j.id, ['pass', 'pass']));
  value(await move(c, c.tech, j.id, 'completed'));
  const done = jobRow(c, j.id),
    order = c.h.m.table('hasibOrders').find(o => o._id === done.orderId);
  assert.deepEqual(
    [done.status, order.totalMinor, visitRow(c, v.id).status],
    ['completed', 30000, 'done'],
    'the approved v2 is charged, and the visit closes',
  );
  refused(await move(c, c.manager, j.id, 'repairing'), 'invalid_transition');
});

test('on site, billable repair waits for the customer’s yes; an inspection can be tested straight away', async () => {
  const c = await shop();
  const k = await customer(c, 'Karim');
  const j = value(await job(c, c.desk, k.id, { jobType: 'repair' }));
  const v = value(await book(c, c.desk, j.id, 0));
  value(await visitMove(c, c.tech, v.id, 'arrived'));
  assert.equal(jobRow(c, j.id).status, 'on_site');
  refused(await move(c, c.tech, j.id, 'repairing'), 'estimate_not_approved');
  value(await checklist(c, c.tech, j.id));
  refused(await move(c, c.tech, j.id, 'tested'), 'estimate_not_approved');
  const e = value(await estimate(c, c.manager, j.id, c.gas));
  value(await issue(c, c.manager, e.id));
  value(await approve(c, c.desk, j.id, e.id));
  value(await move(c, c.tech, j.id, 'repairing'));
  const i = value(await job(c, c.desk, (await customer(c, 'Ines')).id, { jobType: 'inspection' }));
  const iv = value(await book(c, c.desk, i.id, 3 * HOUR, c.managerId));
  c.h.m.advance(3 * HOUR);
  value(await visitMove(c, c.manager, iv.id, 'arrived'));
  value(await checklist(c, c.manager, i.id));
  value(await move(c, c.manager, i.id, 'tested'));
});

test('a failed check after testing sends the job back to repair', async () => {
  const c = await shop();
  const ali = await customer(c, 'Ali');
  const j = value(await job(c, c.desk, ali.id, { jobType: 'repair' }));
  const e = value(await estimate(c, c.manager, j.id, c.inspection));
  value(await issue(c, c.manager, e.id));
  value(await approve(c, c.desk, j.id, e.id));
  const v = value(await book(c, c.desk, j.id, 0));
  value(await visitMove(c, c.tech, v.id, 'arrived'));
  value(await move(c, c.tech, j.id, 'repairing'));
  value(await checklist(c, c.tech, j.id));
  value(await move(c, c.tech, j.id, 'tested'));
  value(await checklist(c, c.tech, j.id, ['pass', 'fail']));
  assert.equal(jobRow(c, j.id).status, 'repairing');
});

test('a technician cannot be booked into two overlapping windows; a missed first visit puts the job back', async () => {
  const c = await shop();
  const a = await customer(c, 'Huda'),
    b = await customer(c, 'Majid');
  const j1 = value(await job(c, c.desk, a.id)),
    j2 = value(await job(c, c.desk, b.id));
  const v1 = value(await book(c, c.desk, j1.id, HOUR));
  refused(await book(c, c.desk, j2.id, 2 * HOUR), 'technician_busy');
  refused(await book(c, c.desk, j1.id, 5 * HOUR), 'visit_exists');
  value(await book(c, c.desk, j2.id, 3 * HOUR));
  // Moving the first visit onto the second's window is refused too.
  refused(
    await c.desk('hvac_visit_save', {
      visitId: v1.id,
      version: visitRow(c, v1.id).version,
      hvac: { startsAt: c.h.m.now() + 3 * HOUR, endsAt: c.h.m.now() + 4 * HOUR },
    }),
    'technician_busy',
  );
  refused(await visitMove(c, c.desk, v1.id, 'missed'), 'visit_not_finished');
  c.h.m.advance(4 * HOUR);
  value(await visitMove(c, c.desk, v1.id, 'missed'));
  assert.equal(jobRow(c, j1.id).status, 'triaged');
  // Another business's technician is not this business's.
  const other = await shop({ h: c.h, name: 'b', waba: '4321', phone: '8765', sender: '96890000001' });
  refused(
    await c.desk('hvac_visit_save', {
      requestId: randomUUID(),
      jobId: j1.id,
      hvac: { technicianAccountId: other.techId, startsAt: c.h.m.now() + HOUR, endsAt: c.h.m.now() + 2 * HOUR },
    }),
    'technician_not_found',
  );
});

test('waiting for parts pauses the job with a reason and resumes where it was; a return visit continues the repair', async () => {
  const c = await shop();
  const k = await customer(c, 'Khalid');
  const j = value(await job(c, c.desk, k.id, { jobType: 'repair' }));
  const e = value(await estimate(c, c.manager, j.id, c.gas));
  value(await issue(c, c.manager, e.id));
  value(await approve(c, c.desk, j.id, e.id));
  const v = value(await book(c, c.desk, j.id, 0));
  value(await visitMove(c, c.tech, v.id, 'arrived'));
  value(await move(c, c.tech, j.id, 'repairing'));
  refused(await move(c, c.tech, j.id, 'waiting_parts'), 'parts_label_required');
  value(
    await move(c, c.tech, j.id, 'waiting_parts', {
      hvac: { partsLabel: 'Fan motor', partsExpectedAt: c.h.m.now() + 2 * DAY },
    }),
  );
  value(await visitMove(c, c.tech, v.id, 'done', { hvac: { outcome: 'needs_parts' } }));
  const back = value(await book(c, c.desk, j.id, 3 * DAY));
  c.h.m.advance(3 * DAY);
  value(await visitMove(c, c.tech, back.id, 'arrived'));
  assert.deepEqual([jobRow(c, j.id).status, jobRow(c, j.id).holdFrom], ['repairing', undefined]);
});

test('a technician sees only their jobs and no prices; staff cannot do the manager’s money work', async () => {
  const c = await shop();
  const a = await customer(c, 'Noor'),
    b = await customer(c, 'Salim');
  const mine = value(await job(c, c.desk, a.id, { jobType: 'gas_refill' })),
    theirs = value(await job(c, c.desk, b.id));
  const e = value(await estimate(c, c.manager, mine.id, c.gas));
  value(await issue(c, c.manager, e.id));
  value(await approve(c, c.desk, mine.id, e.id));
  value(await book(c, c.desk, mine.id, HOUR));
  value(await book(c, c.desk, theirs.id, 4 * HOUR, c.managerId));
  const list = value(await c.tech('hvac_jobs')).items;
  assert.deepEqual(
    list.map(x => x.id),
    [mine.id],
    'only the job assigned to them',
  );
  assert.equal(list[0].money, undefined);
  const record = value(await c.tech('hvac_job', { jobId: mine.id }));
  assert.deepEqual(
    [record.estimates, record.money, record.conversationId],
    [[], null, null],
    'no estimate lines, money or chat link',
  );
  refused(await c.tech('hvac_job', { jobId: theirs.id }), 'job_not_found');
  refused(await c.tech('hvac_job_save', { requestId: randomUUID(), contactId: a.id }), 'manager_required');
  refused(
    await c.tech('hvac_estimate_save', { requestId: randomUUID(), jobId: mine.id, hvac: { lines: [] } }),
    'manager_required',
  );
  for (const op of [
    'hvac_insights',
    'hvac_contract_save',
    'hvac_cost_save',
    'hvac_draft_approve',
    'hvac_payment_record',
  ])
    refused(await c.desk(op, {}), 'manager_required');
  const schedule = value(await c.tech('hvac_schedule', { fromAt: c.h.m.now(), toAt: c.h.m.now() + DAY }));
  assert.deepEqual([schedule.visits.length, schedule.technicians.length, schedule.unscheduled.length], [1, 1, 0]);
});

test('units keep the technician’s next service date; contracts are drafted, activated on a recorded yes, charged and renewed', async () => {
  const c = await shop();
  const r = await customer(c, 'Rashid');
  const u1 = value(
    await unit(c, c.desk, r.id, { label: 'Majlis ducted', unitType: 'ducted', capacityBtu: 36000, area: 'Al Khuwair' }),
  );
  const u2 = value(await unit(c, c.desk, r.id, { label: 'Bedroom split' }));
  refused(
    await c.tech('hvac_unit_service', { unitId: u1.id, version: 1, hvac: { nextServiceAt: c.h.m.now() - DAY } }),
    'invalid_service_date',
  );
  const serviced = value(
    await c.tech('hvac_unit_service', { unitId: u1.id, version: 1, hvac: { nextServiceAt: c.h.m.now() + 90 * DAY } }),
  );
  assert.ok(serviced.nextServiceSetBy && serviced.nextServiceSetAt, 'who set it and when');
  refused(
    await c.manager('hvac_contract_save', {
      requestId: randomUUID(),
      contactId: r.id,
      hvac: { unitIds: [u1.id], visitsPerYear: 13, priceMinor: 60000 },
    }),
    'invalid_contract',
  );
  const draft = value(
    await c.manager('hvac_contract_save', {
      requestId: randomUUID(),
      contactId: r.id,
      hvac: { unitIds: [u1.id, u2.id], visitsPerYear: 4, priceMinor: 60000 },
    }),
  );
  assert.deepEqual([draft.reference, draft.status, draft.endsAt - draft.startsAt], ['AMC-0001', 'draft', 365 * DAY]);
  refused(
    await c.manager('hvac_contract_status', { contractId: draft.id, version: draft.version, status: 'active' }),
    'approval_evidence_required',
  );
  const active = value(
    await c.manager('hvac_contract_status', {
      contractId: draft.id,
      version: draft.version,
      status: 'active',
      evidenceSource: 'signed',
    }),
  );
  const order = c.h.m.table('hasibOrders').find(o => o._id === active.orderId);
  assert.deepEqual(
    [active.status, order.totalMinor, c.h.m.table('hvacUnits').filter(u => u.contractId === draft.id).length],
    ['active', 60000, 2],
  );
  const visits = c.h.m.table('hvacJobs').filter(j => j.contractId === draft.id);
  assert.deepEqual(
    visits.map(j => [j.contractVisitIndex, j.status, j.jobType, j.unitIds.length]),
    [[0, 'approved', 'amc_visit', 2]],
    'the first visit is due now: one job, approved by the contract',
  );
  assert.deepEqual(
    contractVisitDates(active).map(d => Math.round((d - active.startsAt) / DAY)),
    [0, 91, 183, 274],
  );
  // A contract visit needs no estimate: it can go straight from site to tested.
  const v = value(await book(c, c.desk, visits[0]._id, 0));
  value(await visitMove(c, c.tech, v.id, 'arrived'));
  value(await checklist(c, c.tech, visits[0]._id));
  value(await move(c, c.tech, visits[0]._id, 'tested'));
  value(await move(c, c.tech, visits[0]._id, 'completed'));
  assert.equal(jobRow(c, visits[0]._id).orderId, undefined, 'a contract visit is paid by its contract');
  const renewal = value(await c.manager('hvac_contract_renew', { contractId: draft.id }));
  assert.deepEqual([renewal.status, renewal.startsAt, renewal.renewedFromId], ['draft', active.endsAt, draft.id]);
  assert.equal(
    value(await c.manager('hvac_contract_renew', { contractId: draft.id })).id,
    renewal.id,
    'renewing twice gives the same draft',
  );
  value(
    await c.manager('hvac_contract_status', {
      contractId: renewal.id,
      version: renewal.version,
      status: 'active',
      evidenceSource: 'whatsapp',
    }),
  );
  assert.deepEqual(
    [
      c.h.m.table('hvacContracts').find(x => x._id === draft.id).status,
      c.h.m.table('hvacContracts').find(x => x._id === draft.id).renewedToId,
    ],
    ['renewed', renewal.id],
  );
  const book1 = value(await c.manager('hvac_contracts')).book;
  assert.equal(book1.active, 1, 'the renewed contract hands over to its renewal');
  refused(
    await c.manager('hvac_contract_status', {
      contractId: draft.id,
      version: c.h.m.table('hvacContracts').find(x => x._id === draft.id).version,
      status: 'cancelled',
    }),
    'invalid_contract_transition',
  );
});

test('a repeat job links to the first, opens a quality review and never names blame', async () => {
  const c = await shop();
  const m = await customer(c, 'Maryam');
  const u = value(await unit(c, c.desk, m.id));
  const first = await completeJob(c, m.id, { unitIds: [u.id] });
  refused(await job(c, c.desk, m.id, { repeatOfId: value(await job(c, c.desk, m.id)).id }), 'invalid_repeat');
  const again = value(await job(c, c.desk, m.id, { repeatOfId: first.job._id, unitIds: [u.id] }));
  const task = c.h.m.table('hvacTasks').find(t => t.kind === 'repeat_fault' && t.entityId === again.id);
  assert.match(task.reason, /review the first visit/);
  assert.doesNotMatch(task.reason, /tech|fault of|blame/i);
});

test('jobs are idempotent, tenant-scoped and cancelled only with a reason', async () => {
  const c = await shop();
  const f = await customer(c, 'Fatma');
  const requestId = randomUUID();
  const one = value(await c.desk('hvac_job_save', { requestId, contactId: f.id }));
  assert.equal(value(await c.desk('hvac_job_save', { requestId, contactId: f.id })).id, one.id);
  refused(await move(c, c.desk, one.id, 'cancelled'), 'cancellation_reason_required');
  value(await move(c, c.desk, one.id, 'cancelled', { reason: 'customer_request' }));
  const other = await shop({ h: c.h, name: 'b', waba: '4321', phone: '8765', sender: '96890000001' });
  refused(await other.manager('hvac_job', { jobId: one.id }), 'job_not_found');
  refused(await other.manager('hvac_job_save', { requestId: randomUUID(), contactId: f.id }), 'contact_not_found');
  assert.deepEqual(value(await other.manager('hvac_jobs')).items, []);
});

test('domain rules and settings', () => {
  const job = { status: 'approved', jobType: 'repair', checklist: [], approvedEstimateNumber: 1 };
  assert.equal(
    moveRefusal(job, 'repairing', { estimates: [{ estimateNumber: 1, status: 'approved' }], onSite: false }),
    'visit_not_started',
  );
  assert.equal(
    moveRefusal(job, 'repairing', { estimates: [{ estimateNumber: 1, status: 'approved' }], onSite: true }),
    null,
  );
  assert.equal(
    scopeApproved(job, [
      { estimateNumber: 1, status: 'approved' },
      { estimateNumber: 2, status: 'issued' },
    ]),
    false,
    'a newer sent version needs its own yes',
  );
  assert.equal(scopeApproved({ jobType: 'amc_visit', contractId: 'c' }, []), true);
  assert.deepEqual(
    mergeHvacSettings(undefined, { serviceAreas: ['Seeb', ' Bausher '], arrivalGraceMinutes: 45 }).serviceAreas,
    ['Seeb', 'Bausher'],
  );
  assert.equal(mergeHvacSettings(undefined, { arrivalGraceMinutes: 999 }), null);
  assert.equal(mergeHvacSettings(undefined, { serviceAreas: Array(31).fill('x') }), null);
  const s = hvacSettings({ hvac: { serviceAreas: ['Seeb'] } });
  assert.deepEqual(
    [outsideAreas(s, 'seeb'), outsideAreas(s, 'Sur'), outsideAreas(hvacSettings({}), 'Sur')],
    [false, true, false],
  );
  assert.deepEqual(
    s.rules.map(r => [r.id, r.mode]),
    [
      ['visit_reminder', 'auto'],
      ['job_complete', 'auto'],
      ['estimate_followup', 'draft'],
      ['service_due', 'draft'],
      ['amc_renewal', 'draft'],
      ['balance_due', 'draft'],
      ['parts_delay', 'task'],
      ['visit_unrecorded', 'task'],
    ],
  );
});
