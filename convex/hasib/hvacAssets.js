// Units and maintenance contracts (AMC, عقد صيانة سنوي). A unit is a customer's AC with its
// technician-set next service date. A contract covers some of the customer's units for a term with a
// number of visits a year; it is drafted, then activated on the customer's recorded yes (which charges
// it), and renewed as a new draft that follows on from it. Its visit dates are worked out on read, and
// each due visit becomes one job Hasib opens, which the team books.
import { owned } from '../blueTenant.js';
import { ok, fail, bounded, nextNumber, settingsFor } from './shared.js';
import { createOrder } from './ordersState.js';
import { audit } from './workspaceState.js';
import { publicRow } from './workspace/rows.js';
import { replayOr, strip, stableRequestId } from './workspace/records.js';
import { DAY, YEAR, UNIT_TYPES, EVIDENCE, integer, contractVisitDates } from './hvacDomain.js';
import { jobSave } from './hvacJobs.js';
import { hvacSettings } from './hvacSettings.js';

const MAX_CONTRACT_UNITS = 50,
  MAX_HISTORY = 50;
const by = actor => String(actor.agent ? `${actor.agent}:${actor.actorAccountId}` : actor.actorAccountId);
const historyWith = (row, entry) => [...(row.history || []), entry].slice(-MAX_HISTORY);
const versionError = (row, a, name) =>
  !row ? fail(`${name}_not_found`) : row.version !== a.version ? fail(`${name}_conflict`) : null;
export const CONTRACT_CANCEL_REASONS = [
  'customer_request',
  'non_payment',
  'units_removed',
  'duplicate',
  'other_operational',
];

/** A customer's unit: what it is and where. The technician's service date has its own operation. */
export async function unitSave(ctx, tenant, actor, a, now) {
  const h = a.hvac || {},
    accountId = tenant.accountId;
  let unit = null;
  if (a.unitId) {
    unit = await owned(ctx, a.unitId, accountId, 'hvacUnits');
    const error = versionError(unit, a, 'unit');
    if (error) return error;
  } else {
    const r = await replayOr(ctx, 'hvacUnits', tenant, a);
    if (r.error) return fail(r.error);
    if (r.replay) return r.replay;
  }
  const contact = unit ? null : await owned(ctx, a.contactId, accountId, 'blueContacts');
  if (!unit && (!contact || contact.state !== 'active')) return fail('contact_not_found');
  const label = bounded(h.label ?? unit?.label ?? '', 60),
    unitType = h.unitType ?? unit?.unitType;
  const text = (key, n) => (h[key] !== undefined ? bounded(h[key], n) || '' : unit?.[key] || '');
  const fields = {
    brand: text('brand', 40),
    serial: text('serial', 40),
    area: text('area', 60),
    siteLabel: text('siteLabel', 60),
  };
  const btu = h.capacityBtu !== undefined ? h.capacityBtu : unit?.capacityBtu;
  if (
    !label ||
    !UNIT_TYPES.includes(unitType) ||
    (btu !== undefined && btu !== null && !integer(btu, 1000, 1000000)) ||
    (h.retired !== undefined && typeof h.retired !== 'boolean')
  )
    return fail('invalid_unit');
  const kept = Object.fromEntries(Object.entries(fields).filter(([, value]) => value));
  const retiredAt = h.retired === true ? unit?.retiredAt || now : h.retired === false ? undefined : unit?.retiredAt;
  const data = { label, unitType, ...kept, ...(btu ? { capacityBtu: btu } : {}), ...(retiredAt ? { retiredAt } : {}) };
  let id;
  if (unit) {
    await ctx.db.replace(unit._id, {
      ...strip(unit, ['brand', 'serial', 'area', 'siteLabel', 'capacityBtu', 'retiredAt']),
      ...data,
      version: unit.version + 1,
      updatedAt: now,
    });
    id = unit._id;
  } else
    id = await ctx.db.insert('hvacUnits', {
      accountId,
      requestId: a.requestId,
      contactId: contact._id,
      ...data,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  await audit(ctx, tenant, actor, unit ? 'unit_updated' : 'unit_created', 'unit', id, now, unitType);
  return ok(publicRow(await ctx.db.get(id)));
}

/** The next service date the technician recommends, recorded with who and when. Changing or clearing it withdraws the old reminder. */
export async function unitService(ctx, tenant, actor, a, now) {
  const unit = await owned(ctx, a.unitId, tenant.accountId, 'hvacUnits'),
    error = versionError(unit, a, 'unit');
  if (error) return error;
  const h = a.hvac || {},
    clear = h.clearService === true,
    at = clear ? null : h.nextServiceAt;
  if (!clear && !(integer(at) && at > now && at <= now + 3 * YEAR)) return fail('invalid_service_date');
  await ctx.db.replace(unit._id, {
    ...strip(unit, ['nextServiceAt']),
    ...(at ? { nextServiceAt: at } : {}),
    nextServiceSetBy: by(actor),
    nextServiceSetAt: now,
    version: unit.version + 1,
    updatedAt: now,
  });
  await audit(ctx, tenant, actor, clear ? 'service_cleared' : 'service_set', 'unit', unit._id, now);
  return ok(publicRow(await ctx.db.get(unit._id)));
}

/** A draft contract (or an edit of a draft): the customer's units, visits a year, term and price. */
export async function contractSave(ctx, tenant, actor, a, now) {
  const h = a.hvac || {},
    accountId = tenant.accountId;
  let row = null;
  if (a.contractId) {
    row = await owned(ctx, a.contractId, accountId, 'hvacContracts');
    const error = versionError(row, a, 'contract');
    if (error) return error;
    if (row.status !== 'draft') return fail('contract_locked');
  } else {
    const r = await replayOr(ctx, 'hvacContracts', tenant, a);
    if (r.error) return fail(r.error);
    if (r.replay) return r.replay;
  }
  const contactId = row?.contactId || a.contactId,
    contact = await owned(ctx, contactId, accountId, 'blueContacts');
  if (!contact || contact.state !== 'active') return fail('contact_not_found');
  const ids = h.unitIds ?? row?.unitIds ?? [];
  if (!Array.isArray(ids) || !ids.length || ids.length > MAX_CONTRACT_UNITS) return fail('invalid_contract');
  const unitIds = [];
  for (const id of new Set(ids)) {
    const unit = await owned(ctx, id, accountId, 'hvacUnits');
    if (!unit || unit.retiredAt || String(unit.contactId) !== String(contact._id)) return fail('invalid_contract');
    unitIds.push(unit._id);
  }
  const visitsPerYear = h.visitsPerYear ?? row?.visitsPerYear ?? 4,
    startsAt = h.startsAt ?? row?.startsAt ?? now,
    endsAt = h.endsAt ?? row?.endsAt ?? startsAt + YEAR,
    priceMinor = h.priceMinor ?? row?.priceMinor;
  if (
    !integer(visitsPerYear, 1, 12) ||
    !integer(startsAt) ||
    !integer(endsAt) ||
    endsAt - startsAt < 30 * DAY ||
    endsAt - startsAt > 3 * YEAR ||
    startsAt < now - YEAR ||
    !integer(priceMinor, 0, 1000000000)
  )
    return fail('invalid_contract');
  const data = {
    unitIds,
    visitsPerYear,
    startsAt,
    endsAt,
    priceMinor,
    version: (row?.version || 0) + 1,
    updatedAt: now,
  };
  let id;
  if (row) {
    await ctx.db.patch(row._id, { ...data, history: historyWith(row, { kind: 'edited', at: now, by: by(actor) }) });
    id = row._id;
  } else {
    const number = await nextNumber(ctx, accountId, 'hvac_contract');
    let renewedFromId;
    if (h.renewedFromId) {
      const from = await owned(ctx, h.renewedFromId, accountId, 'hvacContracts');
      if (
        !from ||
        String(from.contactId) !== String(contact._id) ||
        !['active', 'expired'].includes(from.status) ||
        from.renewedToId
      )
        return fail('invalid_renewal');
      renewedFromId = from._id;
    }
    id = await ctx.db.insert('hvacContracts', {
      accountId,
      requestId: a.requestId,
      number,
      reference: `AMC-${String(number).padStart(4, '0')}`,
      contactId: contact._id,
      ...data,
      status: 'draft',
      ...(renewedFromId ? { renewedFromId } : {}),
      history: [{ kind: renewedFromId ? 'renewal_drafted' : 'drafted', at: now, by: by(actor) }],
      createdAt: now,
    });
  }
  await audit(ctx, tenant, actor, row ? 'contract_updated' : 'contract_drafted', 'contract', id, now);
  return ok(publicRow(await ctx.db.get(id)));
}

/** Drafts next year's contract from one that is ending: same units and visits, the new term starting where the old one ends. */
export async function contractRenew(ctx, tenant, actor, a, now) {
  const from = await owned(ctx, a.contractId, tenant.accountId, 'hvacContracts');
  if (!from) return fail('contract_not_found');
  const existing = (
    await ctx.db
      .query('hvacContracts')
      .withIndex('by_contact', q => q.eq('contactId', from.contactId))
      .take(50)
  ).find(c => String(c.renewedFromId) === String(from._id) && c.status !== 'cancelled');
  if (existing) return ok(publicRow(existing));
  const span = from.endsAt - from.startsAt;
  return contractSave(
    ctx,
    tenant,
    actor,
    {
      requestId: a.requestId || stableRequestId(`renew:${from._id}`),
      contactId: from.contactId,
      hvac: {
        unitIds: from.unitIds,
        visitsPerYear: from.visitsPerYear,
        startsAt: Math.max(from.endsAt, now),
        endsAt: Math.max(from.endsAt, now) + span,
        priceMinor: a.hvac?.priceMinor ?? from.priceMinor,
        renewedFromId: from._id,
      },
    },
    now,
  );
}

/**
 * Activate on the customer's recorded yes (charges the contract, links its units, closes the one it renews),
 * or cancel with a reason. Activating also opens the contract visits that are due now.
 */
export async function contractStatus(ctx, tenant, actor, a, now) {
  const c = await owned(ctx, a.contractId, tenant.accountId, 'hvacContracts'),
    error = versionError(c, a, 'contract');
  if (error) return error;
  if (a.status === 'active') {
    if (c.status !== 'draft') return fail('invalid_contract_transition');
    if (!EVIDENCE.includes(a.evidenceSource)) return fail('approval_evidence_required');
    let orderId;
    if (c.priceMinor > 0) {
      const order = await createOrder(
        ctx,
        tenant,
        {
          requestId: `hvac-contract:${c._id}`,
          channel: 'walk_in',
          contactId: c.contactId,
          kind: 'hvac_contract',
          source: 'hvac',
          confirm: true,
          fulfilment: { type: 'in_store' },
          lines: [{ name: `AMC ${c.reference}`, qty: 1, unitPriceMinor: c.priceMinor }],
        },
        now,
        { internal: true },
      );
      if (!order.ok) return order;
      orderId = order.value.id;
    }
    await ctx.db.patch(c._id, {
      status: 'active',
      acceptedAt: now,
      acceptanceEvidence: a.evidenceSource,
      ...(orderId ? { orderId } : {}),
      history: historyWith(c, { kind: 'activated', at: now, by: by(actor), detail: a.evidenceSource }),
      version: c.version + 1,
      updatedAt: now,
    });
    for (const id of c.unitIds) {
      const unit = await ctx.db.get(id);
      if (unit) await ctx.db.patch(id, { contractId: c._id, version: unit.version + 1, updatedAt: now });
    }
    if (c.renewedFromId) {
      const from = await ctx.db.get(c.renewedFromId);
      if (from)
        await ctx.db.patch(from._id, {
          status: 'renewed',
          renewedToId: c._id,
          history: historyWith(from, { kind: 'renewed', at: now, by: by(actor), detail: c.reference }),
          version: from.version + 1,
          updatedAt: now,
        });
    }
    await audit(ctx, tenant, actor, 'contract_activated', 'contract', c._id, now, a.evidenceSource);
    await openContractVisits(ctx, tenant, actor, [await ctx.db.get(c._id)], now);
  } else if (a.status === 'cancelled') {
    if (!['draft', 'active'].includes(c.status)) return fail('invalid_contract_transition');
    if (!CONTRACT_CANCEL_REASONS.includes(a.reason)) return fail('cancellation_reason_required');
    await ctx.db.patch(c._id, {
      status: 'cancelled',
      cancelReason: a.reason,
      history: historyWith(c, { kind: 'cancelled', at: now, by: by(actor), detail: a.reason }),
      version: c.version + 1,
      updatedAt: now,
    });
    for (const id of c.unitIds) {
      const unit = await ctx.db.get(id);
      if (unit && String(unit.contractId) === String(c._id))
        await ctx.db.replace(id, { ...strip(unit, ['contractId']), version: unit.version + 1, updatedAt: now });
    }
    await audit(ctx, tenant, actor, 'contract_cancelled', 'contract', c._id, now, a.reason);
  } else return fail('invalid_contract_transition');
  return ok(publicRow(await ctx.db.get(c._id)));
}

/**
 * Opens one job for each contract visit that falls due within the lead time (never twice for the same
 * visit; the job's request id is derived from the contract and the visit). The team books the time.
 * @returns {Promise<number>} how many jobs were opened
 */
export async function openContractVisits(ctx, tenant, actor, contracts, now, leadDays = null) {
  let opened = 0;
  const lead = (leadDays ?? hvacSettings(await settingsFor(ctx, tenant.accountId)).amcVisitLeadDays) * DAY;
  for (const c of contracts) {
    if (c.status !== 'active' || !c.acceptedAt) continue;
    const dates = contractVisitDates(c);
    for (const [k, dueAt] of dates.entries()) {
      // Due within the lead time, and not a visit that fell due long before the customer signed.
      if (dueAt - lead > now || dueAt + 30 * DAY < c.acceptedAt) continue;
      const exists = await ctx.db
        .query('hvacJobs')
        .withIndex('by_contract_index', q => q.eq('contractId', c._id).eq('contractVisitIndex', k))
        .first();
      if (exists) continue;
      const made = await jobSave(
        ctx,
        tenant,
        actor,
        {
          requestId: stableRequestId(`amc:${c._id}:${k}`),
          contactId: c.contactId,
          hvac: { source: 'contract', jobType: 'amc_visit', contractId: c._id, contractVisitIndex: k },
        },
        now,
      );
      if (made.ok) opened++;
    }
  }
  return opened;
}
