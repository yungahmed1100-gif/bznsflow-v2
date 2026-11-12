// AC jobs, visits and estimates (ascend/hvac.md). Staff record facts: a request and its triage, a
// visit window, the technician's arrival, findings and checklist, tested and completed. An estimate
// is a numbered version; the customer's yes approves exactly the version they were sent, and a new
// version needs a new yes. Completing a job charges its approved estimate on hasibOrders.
import { owned } from '../blueTenant.js';
import { ok, fail, bounded, REQUEST_ID, settingsFor, nextNumber } from './shared.js';
import { createOrder, recordPayment, PAYMENT_METHODS } from './ordersState.js';
import { audit, workspaceContainsAccount } from './workspaceState.js';
import { publicRow } from './workspace/rows.js';
import { replayOr, strip } from './workspace/records.js';
import { findOverlaps } from './workspace/overlap.js';
import { openTaskOnce } from './workspace/tasks.js';
import { hvacSettings, outsideAreas } from './hvacSettings.js';
import {
  DAY,
  HOUR,
  MIN,
  VISIT_MAX_MS,
  JOB_TYPES,
  SYMPTOMS,
  SOURCES,
  OPEN_JOB,
  PAUSES,
  CANCEL_REASONS,
  ACTIVE_VISIT,
  VISIT_OUTCOMES,
  CHECK_RESULTS,
  LINE_KINDS,
  COST_KINDS,
  EVIDENCE,
  SCHEDULABLE,
  moveRefusal,
  arrivalRefusal,
  stateOnArrival,
  latestSent,
  latestOf,
  estimateExpired,
  linesTotal,
  integer,
  isTechnician,
  assignedTo,
  balanceOf,
} from './hvacDomain.js';

const MAX_HISTORY = 100,
  MAX_UNITS = 20,
  MAX_LINES = 30;
const historyWith = (row, entry) => [...(row.history || []), entry].slice(-MAX_HISTORY);
const by = actor => String(actor.agent ? `${actor.agent}:${actor.actorAccountId}` : actor.actorAccountId);
const versionError = (row, a, name) =>
  !row ? fail(`${name}_not_found`) : row.version !== a.version ? fail(`${name}_conflict`) : null;
const estimatesOf = (ctx, jobId) =>
  ctx.db
    .query('hvacEstimates')
    .withIndex('by_job', q => q.eq('jobId', jobId))
    .take(100);
const visitsOf = (ctx, jobId) =>
  ctx.db
    .query('hvacVisits')
    .withIndex('by_job', q => q.eq('jobId', jobId))
    .take(100);

/** The customer's own units, all of them; a foreign or retired unit refuses the list. */
async function unitsOf(ctx, accountId, contactId, ids = []) {
  if (!Array.isArray(ids) || ids.length > MAX_UNITS) return null;
  const out = [];
  for (const id of new Set(ids)) {
    const unit = await owned(ctx, id, accountId, 'hvacUnits');
    if (!unit || unit.retiredAt || String(unit.contactId) !== String(contactId)) return null;
    out.push(unit._id);
  }
  return out;
}

/** A new job (staff: triaged straight away; Layla: a request to triage; a contract: approved by the contract), or an edit of an open one. */
export async function jobSave(ctx, tenant, actor, a, now) {
  const h = a.hvac || {},
    accountId = tenant.accountId,
    s = hvacSettings(await settingsFor(ctx, accountId));
  if (a.jobId) {
    const job = await owned(ctx, a.jobId, accountId, 'hvacJobs'),
      error = versionError(job, a, 'job');
    if (error) return error;
    if (!OPEN_JOB.has(job.status)) return fail('job_locked');
    const unitIds = h.unitIds !== undefined ? await unitsOf(ctx, accountId, job.contactId, h.unitIds) : job.unitIds;
    const area = h.area !== undefined ? bounded(h.area, 60) || '' : job.area || '';
    if (
      !unitIds ||
      (h.jobType !== undefined && !JOB_TYPES.includes(h.jobType)) ||
      (h.reportedSymptom !== undefined && h.reportedSymptom !== '' && !SYMPTOMS.includes(h.reportedSymptom))
    )
      return fail('invalid_job');
    if (h.technicianAccountId && !(await workspaceContainsAccount(ctx, actor.workspace, h.technicianAccountId)))
      return fail('technician_not_found');
    const rest = strip(job, ['area', 'reportedSymptom', 'technicianAccountId', 'outOfArea']);
    const symptom = h.reportedSymptom !== undefined ? h.reportedSymptom : job.reportedSymptom,
      tech = h.technicianAccountId !== undefined ? h.technicianAccountId : job.technicianAccountId;
    await ctx.db.replace(job._id, {
      ...rest,
      unitIds,
      ...(area ? { area, ...(outsideAreas(s, area) ? { outOfArea: true } : {}) } : {}),
      ...(symptom ? { reportedSymptom: symptom } : {}),
      ...(tech ? { technicianAccountId: tech } : {}),
      jobType: h.jobType ?? job.jobType,
      urgent: typeof h.urgent === 'boolean' ? h.urgent : job.urgent,
      history: historyWith(job, { kind: 'edited', at: now, by: by(actor) }),
      version: job.version + 1,
      updatedAt: now,
    });
    await audit(ctx, tenant, actor, 'job_updated', 'job', job._id, now);
    return ok(publicRow(await ctx.db.get(job._id)));
  }
  const r = await replayOr(ctx, 'hvacJobs', tenant, a);
  if (r.error) return fail(r.error);
  if (r.replay) return r.replay;
  const contact = await owned(ctx, a.contactId, accountId, 'blueContacts');
  if (!contact || contact.state !== 'active') return fail('contact_not_found');
  const source = h.source || 'staff',
    jobType = h.jobType || (source === 'contract' ? 'amc_visit' : 'repair');
  if (
    !SOURCES.includes(source) ||
    !JOB_TYPES.includes(jobType) ||
    (h.reportedSymptom && !SYMPTOMS.includes(h.reportedSymptom))
  )
    return fail('invalid_job');
  const unitIds = await unitsOf(ctx, accountId, contact._id, h.unitIds || []);
  if (!unitIds) return fail('invalid_job');
  let repeatOf = null;
  if (h.repeatOfId) {
    repeatOf = await owned(ctx, h.repeatOfId, accountId, 'hvacJobs');
    if (!repeatOf || repeatOf.status !== 'completed' || String(repeatOf.contactId) !== String(contact._id))
      return fail('invalid_repeat');
  }
  let contract = null;
  if (source === 'contract') {
    contract = await owned(ctx, h.contractId, accountId, 'hvacContracts');
    if (
      !contract ||
      contract.status !== 'active' ||
      String(contract.contactId) !== String(contact._id) ||
      !integer(h.contractVisitIndex, 0, 11)
    )
      return fail('invalid_job');
    const dup = await ctx.db
      .query('hvacJobs')
      .withIndex('by_contract_index', q =>
        q.eq('contractId', contract._id).eq('contractVisitIndex', h.contractVisitIndex),
      )
      .first();
    if (dup) return ok(publicRow(dup));
  }
  if (h.technicianAccountId && !(await workspaceContainsAccount(ctx, actor.workspace, h.technicianAccountId)))
    return fail('technician_not_found');
  const area = bounded(h.area || '', 60) || '';
  const status = source === 'contract' ? 'approved' : source === 'layla' ? 'requested' : 'triaged';
  const number = await nextNumber(ctx, accountId, 'hvac_job');
  const id = await ctx.db.insert('hvacJobs', {
    accountId,
    requestId: a.requestId,
    number,
    contactId: contact._id,
    ...(a.conversationId ? { conversationId: a.conversationId } : {}),
    unitIds: contract ? contract.unitIds : unitIds,
    jobType,
    source,
    ...(area ? { area } : {}),
    ...(outsideAreas(s, area) ? { outOfArea: true } : {}),
    urgent: h.urgent === true || h.reportedSymptom === 'not_cooling',
    ...(h.reportedSymptom ? { reportedSymptom: h.reportedSymptom } : {}),
    status,
    requestedAt: now,
    ...(h.technicianAccountId ? { technicianAccountId: h.technicianAccountId } : {}),
    ...(repeatOf ? { repeatOfId: repeatOf._id } : {}),
    ...(contract ? { contractId: contract._id, contractVisitIndex: h.contractVisitIndex } : {}),
    checklist: [],
    costs: [],
    history: [{ kind: status, at: now, by: by(actor), detail: source }],
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  // A return to fix the same fault is a quality question, not a sale: someone reviews it (never naming blame).
  if (repeatOf)
    await openTaskOnce(
      ctx,
      'hvacTasks',
      {
        accountId,
        kind: 'repeat_fault',
        entityType: 'job',
        entityId: id,
        reason: `Customer is back after job #${repeatOf.number}: review the first visit`,
      },
      now,
    );
  await audit(ctx, tenant, actor, 'job_created', 'job', id, now, source);
  return ok(publicRow(await ctx.db.get(id)));
}

/** Charges a completed job's approved estimate as its order (once). A contract visit has no charge of its own. */
async function chargeJob(ctx, tenant, job, estimates, now) {
  if (job.orderId) return { ok: true };
  const approved = latestSent(estimates);
  if (
    !approved ||
    approved.status !== 'approved' ||
    approved.estimateNumber !== job.approvedEstimateNumber ||
    !approved.totalMinor
  )
    return { ok: true };
  const order = await createOrder(
    ctx,
    tenant,
    {
      requestId: `hvac-job:${job._id}`,
      channel: 'walk_in',
      contactId: job.contactId,
      kind: 'hvac_job',
      source: 'hvac',
      confirm: true,
      fulfilment: { type: 'in_store' },
      lines: approved.lines.map(l =>
        l.variantId
          ? { variantId: l.variantId, qty: l.qty, unitPriceMinor: l.unitPriceMinor }
          : { name: l.name, qty: l.qty, unitPriceMinor: l.unitPriceMinor },
      ),
    },
    now,
    { internal: true },
  );
  return order.ok ? { ok: true, orderId: order.value.id } : order;
}

/** A recorded move: triaged, on hold, waiting for parts, repairing, tested, completed, cancelled or resume. */
export async function jobStatus(ctx, tenant, actor, a, now) {
  const job = await owned(ctx, a.jobId, tenant.accountId, 'hvacJobs'),
    error = versionError(job, a, 'job');
  if (error) return error;
  if (!assignedTo(actor, job)) return fail('job_not_found');
  const to = a.status,
    estimates = await estimatesOf(ctx, job._id),
    visits = await visitsOf(ctx, job._id);
  const refusal = moveRefusal(job, to, { estimates, onSite: visits.some(v => v.status === 'arrived') });
  if (refusal) return fail(refusal);
  if (isTechnician(actor) && ['triaged', 'cancelled'].includes(to)) return fail('manager_required');
  const h = a.hvac || {},
    patch = {};
  if (to === 'cancelled') {
    if (!CANCEL_REASONS.includes(a.reason)) return fail('cancellation_reason_required');
    Object.assign(patch, { status: 'cancelled', cancelledAt: now, cancelReason: a.reason });
    for (const v of visits)
      if (ACTIVE_VISIT.has(v.status))
        await ctx.db.patch(v._id, {
          status: 'cancelled',
          cancelReason: 'job_cancelled',
          version: v.version + 1,
          updatedAt: now,
        });
  } else if (to === 'resume')
    Object.assign(patch, {
      status: job.holdFrom,
      holdFrom: undefined,
      partsLabel: undefined,
      partsExpectedAt: undefined,
    });
  else if (PAUSES.has(to)) {
    const label = to === 'waiting_parts' ? bounded(h.partsLabel || '', 80) : '';
    if (to === 'waiting_parts' && !label) return fail('parts_label_required');
    if (
      h.partsExpectedAt !== undefined &&
      !(integer(h.partsExpectedAt) && h.partsExpectedAt > now - DAY && h.partsExpectedAt < now + 180 * DAY)
    )
      return fail('invalid_job');
    Object.assign(patch, {
      status: to,
      holdFrom: job.status,
      ...(label ? { partsLabel: label } : {}),
      ...(h.partsExpectedAt ? { partsExpectedAt: h.partsExpectedAt } : {}),
    });
  } else if (to === 'completed') {
    const charged = await chargeJob(ctx, tenant, job, estimates, now);
    if (!charged.ok) return charged;
    for (const v of visits)
      if (v.status === 'arrived')
        await ctx.db.patch(v._id, {
          status: 'done',
          doneAt: now,
          outcome: 'fixed',
          version: v.version + 1,
          updatedAt: now,
        });
    Object.assign(patch, {
      status: 'completed',
      completedAt: now,
      ...(charged.orderId ? { orderId: charged.orderId } : {}),
    });
  } else Object.assign(patch, { status: to, ...(to === 'tested' ? { testedAt: now } : {}) });
  await ctx.db.patch(job._id, {
    ...patch,
    history: historyWith(job, {
      kind: to === 'resume' ? `resumed:${job.holdFrom}` : to,
      at: now,
      by: by(actor),
      ...(a.reason ? { detail: String(a.reason).slice(0, 80) } : {}),
    }),
    version: job.version + 1,
    updatedAt: now,
  });
  await audit(ctx, tenant, actor, `job_${to}`, 'job', job._id, now, a.reason);
  return ok(publicRow(await ctx.db.get(job._id)));
}

/** Books (or moves) a technician's visit window. The technician must be free; a racing booking retries. */
export async function visitSave(ctx, tenant, actor, a, now) {
  const h = a.hvac || {},
    accountId = tenant.accountId;
  const visit = a.visitId ? await owned(ctx, a.visitId, accountId, 'hvacVisits') : null;
  if (a.visitId) {
    const error = versionError(visit, a, 'visit');
    if (error) return error;
    if (visit.status !== 'scheduled') return fail('visit_locked');
  } else {
    const r = await replayOr(ctx, 'hvacVisits', tenant, a);
    if (r.error) return fail(r.error);
    if (r.replay) return r.replay;
  }
  const job = await owned(ctx, visit?.jobId || a.jobId, accountId, 'hvacJobs');
  if (!job || !OPEN_JOB.has(job.status)) return fail('job_not_found');
  if (!visit && (await visitsOf(ctx, job._id)).some(v => ACTIVE_VISIT.has(v.status))) return fail('visit_exists');
  if (!visit && !SCHEDULABLE.has(job.status)) return fail('job_not_schedulable');
  const technicianAccountId = h.technicianAccountId || visit?.technicianAccountId || job.technicianAccountId;
  const startsAt = h.startsAt ?? visit?.startsAt,
    endsAt = h.endsAt ?? visit?.endsAt;
  if (!technicianAccountId || !(await workspaceContainsAccount(ctx, actor.workspace, technicianAccountId)))
    return fail('technician_not_found');
  if (
    !integer(startsAt) ||
    !integer(endsAt) ||
    endsAt - startsAt < 15 * MIN ||
    endsAt - startsAt > VISIT_MAX_MS ||
    startsAt < now - 12 * HOUR ||
    startsAt > now + 365 * DAY
  )
    return fail('invalid_visit');
  const busy = await findOverlaps(ctx, {
    table: 'hvacVisits',
    index: 'by_account_technician_start',
    eq: [
      ['accountId', accountId],
      ['technicianAccountId', technicianAccountId],
    ],
    startsAt,
    endsAt,
    maxSpanMs: VISIT_MAX_MS,
    statuses: ACTIVE_VISIT,
    excludeId: visit?._id,
  });
  if (busy.length) return fail('technician_busy');
  let id;
  if (visit) {
    await ctx.db.patch(visit._id, {
      technicianAccountId,
      startsAt,
      endsAt,
      version: visit.version + 1,
      updatedAt: now,
    });
    id = visit._id;
  } else {
    id = await ctx.db.insert('hvacVisits', {
      accountId,
      requestId: a.requestId,
      jobId: job._id,
      technicianAccountId,
      startsAt,
      endsAt,
      status: 'scheduled',
      jobStatusBefore: job.status,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
  const moves = !visit && ['triaged', 'approved'].includes(job.status);
  await ctx.db.patch(job._id, {
    technicianAccountId,
    ...(moves ? { status: 'scheduled' } : {}),
    ...(job.scheduledAt ? {} : { scheduledAt: now }),
    history: historyWith(job, {
      kind: visit ? 'visit_moved' : 'visit_booked',
      at: now,
      by: by(actor),
      detail: String(startsAt),
    }),
    version: job.version + 1,
    updatedAt: now,
  });
  await audit(ctx, tenant, actor, visit ? 'visit_rescheduled' : 'visit_booked', 'visit', id, now);
  return ok(publicRow(await ctx.db.get(id)));
}

/** Arrived, done, missed or cancelled: a recorded fact with its time. A missed or cancelled first visit puts the job back where it was. */
export async function visitStatus(ctx, tenant, actor, a, now) {
  const visit = await owned(ctx, a.visitId, tenant.accountId, 'hvacVisits'),
    error = versionError(visit, a, 'visit');
  if (error) return error;
  const job = await ctx.db.get(visit.jobId);
  if (isTechnician(actor) && String(visit.technicianAccountId) !== String(actor.actorAccountId))
    return fail('visit_not_found');
  const to = a.status,
    patch = { status: to };
  let jobPatch = null;
  if (to === 'arrived') {
    const refusal = arrivalRefusal(visit, now);
    if (refusal) return fail(refusal);
    patch.arrivedAt = now;
    jobPatch = {
      status: stateOnArrival(job, await estimatesOf(ctx, job._id)),
      holdFrom: undefined,
      ...(job.firstArrivedAt ? {} : { firstArrivedAt: now }),
    };
  } else if (to === 'done') {
    if (visit.status !== 'arrived' || !VISIT_OUTCOMES.includes(a.hvac?.outcome)) return fail('invalid_transition');
    Object.assign(patch, { doneAt: now, outcome: a.hvac.outcome });
  } else if (to === 'missed' || to === 'cancelled') {
    if (visit.status !== 'scheduled' || (to === 'missed' && visit.endsAt > now))
      return fail(to === 'missed' && visit.status === 'scheduled' ? 'visit_not_finished' : 'invalid_transition');
    if (to === 'cancelled') patch.cancelReason = bounded(a.reason || 'rescheduled', 60) || 'rescheduled';
    if (job.status === 'scheduled') jobPatch = { status: visit.jobStatusBefore };
  } else return fail('invalid_transition');
  await ctx.db.patch(visit._id, { ...patch, version: visit.version + 1, updatedAt: now });
  if (jobPatch)
    await ctx.db.patch(job._id, {
      ...jobPatch,
      history: historyWith(job, { kind: `visit_${to}`, at: now, by: by(actor) }),
      version: job.version + 1,
      updatedAt: now,
    });
  await audit(ctx, tenant, actor, `visit_${to}`, 'visit', visit._id, now);
  return ok(publicRow(await ctx.db.get(visit._id)));
}

/** A new estimate version (draft). Earlier drafts give way to it; an issued one stays until this one is sent. */
export async function estimateSave(ctx, tenant, actor, a, now) {
  if (isTechnician(actor)) return fail('manager_required');
  const r = await replayOr(ctx, 'hvacEstimates', tenant, a);
  if (r.error) return fail(r.error);
  if (r.replay) return r.replay;
  const job = await owned(ctx, a.jobId, tenant.accountId, 'hvacJobs');
  if (!job || !['triaged', 'on_site', 'estimate_pending', 'approved'].includes(job.status))
    return fail(job ? 'job_locked' : 'job_not_found');
  const raw = a.hvac?.lines;
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_LINES) return fail('invalid_estimate');
  const lines = [];
  for (const l of raw) {
    const name = bounded(l?.name || '', 120);
    if (!LINE_KINDS.includes(l?.kind) || !name || !integer(l.qty, 1, 1000) || !integer(l.unitPriceMinor, 0, 1000000000))
      return fail('invalid_estimate');
    if (l.variantId && !(await owned(ctx, l.variantId, tenant.accountId, 'hasibVariants')))
      return fail('variant_not_found');
    lines.push({
      kind: l.kind,
      name,
      ...(l.variantId ? { variantId: l.variantId } : {}),
      qty: l.qty,
      unitPriceMinor: l.unitPriceMinor,
    });
  }
  const estimates = await estimatesOf(ctx, job._id);
  for (const e of estimates)
    if (e.status === 'draft')
      await ctx.db.patch(e._id, { status: 'superseded', version: e.version + 1, updatedAt: now });
  const estimateNumber = (latestOf(estimates)?.estimateNumber || 0) + 1;
  const id = await ctx.db.insert('hvacEstimates', {
    accountId: tenant.accountId,
    requestId: a.requestId,
    jobId: job._id,
    estimateNumber,
    status: 'draft',
    lines,
    totalMinor: linesTotal(lines),
    recordedBy: actor.actorAccountId,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  await audit(ctx, tenant, actor, 'estimate_saved', 'estimate', id, now, String(estimateNumber));
  return ok(publicRow(await ctx.db.get(id)));
}

/** Issue a draft to the customer (valid for the business's estimate window), or record that they declined it. */
export async function estimateStatus(ctx, tenant, actor, a, now) {
  const e = await owned(ctx, a.estimateId, tenant.accountId, 'hvacEstimates'),
    error = versionError(e, a, 'estimate');
  if (error) return error;
  const job = await ctx.db.get(e.jobId),
    estimates = await estimatesOf(ctx, job._id);
  if (a.status === 'issued') {
    if (e.status !== 'draft' || latestOf(estimates)?._id !== e._id) return fail('invalid_estimate_transition');
    if (!['triaged', 'on_site', 'estimate_pending', 'approved'].includes(job.status)) return fail('job_locked');
    const s = hvacSettings(await settingsFor(ctx, tenant.accountId));
    for (const old of estimates)
      if (old.status === 'issued')
        await ctx.db.patch(old._id, { status: 'superseded', version: old.version + 1, updatedAt: now });
    await ctx.db.patch(e._id, {
      status: 'issued',
      issuedAt: now,
      validUntil: now + s.estimateWindowDays * DAY,
      version: e.version + 1,
      updatedAt: now,
    });
    if (job.status !== 'estimate_pending')
      await ctx.db.patch(job._id, {
        status: 'estimate_pending',
        history: historyWith(job, {
          kind: 'estimate_issued',
          at: now,
          by: by(actor),
          detail: String(e.estimateNumber),
        }),
        version: job.version + 1,
        updatedAt: now,
      });
  } else if (a.status === 'rejected') {
    if (e.status !== 'issued') return fail('invalid_estimate_transition');
    await ctx.db.patch(e._id, { status: 'rejected', version: e.version + 1, updatedAt: now });
  } else return fail('invalid_estimate_transition');
  await audit(ctx, tenant, actor, `estimate_${a.status}`, 'estimate', e._id, now, String(e.estimateNumber));
  return ok(publicRow(await ctx.db.get(e._id)));
}

/** The customer's yes to the latest estimate they were sent, with where it came from. A later version needs its own yes. */
export async function approvalRecord(ctx, tenant, actor, a, now) {
  const job = await owned(ctx, a.jobId, tenant.accountId, 'hvacJobs'),
    error = versionError(job, a, 'job');
  if (error) return error;
  const e = await owned(ctx, a.estimateId, tenant.accountId, 'hvacEstimates'),
    estimates = await estimatesOf(ctx, job._id);
  if (!e || String(e.jobId) !== String(job._id) || job.status !== 'estimate_pending') return fail('estimate_not_found');
  if (e.status !== 'issued' || latestSent(estimates)?._id !== e._id) return fail('estimate_changed');
  if (estimateExpired(e, now)) return fail('estimate_expired');
  const approvedBy = bounded(a.approvedBy || '', 100);
  if (!approvedBy || !EVIDENCE.includes(a.evidenceSource)) return fail('approval_evidence_required');
  await ctx.db.patch(e._id, {
    status: 'approved',
    approvedAt: now,
    approvedBy,
    evidenceSource: a.evidenceSource,
    recordedBy: actor.actorAccountId,
    version: e.version + 1,
    updatedAt: now,
  });
  await ctx.db.patch(job._id, {
    status: 'approved',
    approvedEstimateNumber: e.estimateNumber,
    history: historyWith(job, {
      kind: 'estimate_approved',
      at: now,
      by: by(actor),
      detail: `${e.estimateNumber}:${a.evidenceSource}`,
    }),
    version: job.version + 1,
    updatedAt: now,
  });
  await audit(ctx, tenant, actor, 'estimate_approved', 'job', job._id, now, `${e.estimateNumber}:${a.evidenceSource}`);
  return ok(publicRow(await ctx.db.get(job._id)));
}

/** The technician's checklist (pass, fail or not applicable per line) and findings, in their own words. */
export async function checklistSave(ctx, tenant, actor, a, now) {
  const job = await owned(ctx, a.jobId, tenant.accountId, 'hvacJobs'),
    error = versionError(job, a, 'job');
  if (error) return error;
  if (!assignedTo(actor, job)) return fail('job_not_found');
  if (!['on_site', 'repairing', 'waiting_parts', 'on_hold', 'tested'].includes(job.status)) return fail('job_locked');
  const list = a.hvac?.checklist,
    findings = a.hvac?.findings !== undefined ? bounded(a.hvac.findings, 500) : job.findings;
  if (!Array.isArray(list) || list.length > 20 || (a.hvac?.findings !== undefined && findings === null))
    return fail('invalid_checklist');
  const checklist = [];
  for (const c of list) {
    const text = bounded(c?.text || '', 120);
    if (!text || !CHECK_RESULTS.includes(c.result)) return fail('invalid_checklist');
    checklist.push({ text, result: c.result });
  }
  // A failed check after testing sends the job back to repair; it cannot be completed as it is.
  const back = job.status === 'tested' && checklist.some(c => c.result === 'fail');
  const rest = strip(job, ['findings', ...(back ? ['testedAt'] : [])]);
  await ctx.db.replace(job._id, {
    ...rest,
    checklist,
    ...(findings ? { findings } : {}),
    ...(back ? { status: 'repairing' } : {}),
    history: historyWith(job, { kind: back ? 'check_failed' : 'checklist_saved', at: now, by: by(actor) }),
    version: job.version + 1,
    updatedAt: now,
  });
  await audit(ctx, tenant, actor, 'checklist_saved', 'job', job._id, now);
  return ok(publicRow(await ctx.db.get(job._id)));
}

/** A job's costs (parts, gas, labour, subcontract), recorded by the manager; job contribution counts only jobs marked complete. */
export async function costSave(ctx, tenant, actor, a, now) {
  const job = await owned(ctx, a.jobId, tenant.accountId, 'hvacJobs'),
    error = versionError(job, a, 'job');
  if (error) return error;
  const list = a.hvac?.costs;
  if (
    !Array.isArray(list) ||
    list.length > 20 ||
    (a.hvac.costsComplete !== undefined && typeof a.hvac.costsComplete !== 'boolean')
  )
    return fail('invalid_cost');
  const costs = [];
  for (const c of list) {
    const label = bounded(c?.label || '', 80);
    if (!COST_KINDS.includes(c?.kind) || !label || !integer(c.amountMinor, 0, 1000000000)) return fail('invalid_cost');
    costs.push({ kind: c.kind, label, amountMinor: c.amountMinor });
  }
  await ctx.db.patch(job._id, {
    costs,
    costsComplete: a.hvac.costsComplete ?? job.costsComplete ?? false,
    version: job.version + 1,
    updatedAt: now,
  });
  await audit(ctx, tenant, actor, 'costs_saved', 'job', job._id, now);
  return ok(publicRow(await ctx.db.get(job._id)));
}

/** A payment on a job's or contract's order (the shared payment path, so a replay changes nothing). */
export async function paymentRecord(ctx, tenant, actor, a, now) {
  const row = a.jobId
    ? await owned(ctx, a.jobId, tenant.accountId, 'hvacJobs')
    : a.contractId
      ? await owned(ctx, a.contractId, tenant.accountId, 'hvacContracts')
      : null;
  if (!row?.orderId) return fail(a.contractId ? 'contract_not_found' : 'job_not_found');
  if (!PAYMENT_METHODS.includes(a.method) || !REQUEST_ID.test(a.requestId || '')) return fail('invalid_payment');
  const order = await ctx.db.get(row.orderId);
  if (integer(a.amountMinor, 1) && a.amountMinor > balanceOf(order)) return fail('payment_exceeds_balance');
  const paid = await recordPayment(
    ctx,
    tenant.accountId,
    {
      requestId: a.requestId,
      orderId: row.orderId,
      amountMinor: a.amountMinor,
      method: a.method,
      reference: bounded(a.reference, 80) || (a.jobId ? `job #${row.number}` : row.reference),
    },
    now,
  );
  if (!paid.ok) return paid;
  await audit(
    ctx,
    tenant,
    actor,
    a.amountMinor < 0 ? 'payment_refunded' : 'payment_recorded',
    a.jobId ? 'job' : 'contract',
    row._id,
    now,
    String(a.amountMinor),
  );
  return ok(publicRow(await ctx.db.get(row._id)));
}
