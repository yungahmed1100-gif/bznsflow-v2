// What an approved or accepted offer changes in its sector's records. A conversation offer changes
// nothing but itself; a media quote is issued and presented on approval and accepted on the
// customer's recorded yes; a media extra-scope change order is approved on that yes. Each step goes
// through the sector's own operation and guards, so an offer can never move a record the sector refuses.
import { owned } from '../blueTenant.js';
import { executeMedia } from './mediaState.js';
import { executeAutomotive } from './automotiveState.js';
import { executeConstruction } from './constructionState.js';
import { openTaskOnce } from './workspace/tasks.js';
import { latestEstimates } from './automotiveRules.js';
import { stableRequestId } from './workspace/records.js';
import { repairSubject, REPAIR_SUBJECT } from './repairOffer.js';
import { executeHvac } from './hvacState.js';
import { latestOf } from './hvacDomain.js';

const none = async () => ({ ok: true });

export const SUBJECTS = Object.freeze({
  conversation: { approve: none, accept: none },

  media_production: {
    /** Approve = issue this total as the production's quote and present it to the customer. */
    async approve(ctx, tenant, actor, offer, now) {
      const p = await owned(ctx, offer.subjectId, tenant.accountId, 'mediaProductions');
      if (!p) return { ok: false, reason: 'production_not_found' };
      const quoted = await executeMedia(ctx, tenant, actor, { operation: 'media_quote', productionId: offer.subjectId, version: p.version,
        media: { quoteMinor: offer.totalMinor, ...(offer.depositMinor !== undefined ? { depositMinor: offer.depositMinor } : {}) } }, now);
      if (!quoted.ok) return quoted;
      const fresh = await ctx.db.get(p._id);
      return executeMedia(ctx, tenant, actor, { operation: 'media_production_status', productionId: offer.subjectId, version: fresh.version, status: 'awaiting_acceptance' }, now);
    },
    /** Accept = the customer's recorded yes to the current quote version. */
    async accept(ctx, tenant, actor, offer, { by, evidence }, now) {
      const p = await owned(ctx, offer.subjectId, tenant.accountId, 'mediaProductions');
      if (!p) return { ok: false, reason: 'production_not_found' };
      return executeMedia(ctx, tenant, actor, { operation: 'media_accept', productionId: offer.subjectId, version: p.version,
        media: { quoteVersion: p.quoteVersion, acceptedBy: by, evidenceSource: evidence } }, now);
    },
  },

  media_change_order: {
    approve: none,
    /** Accept = the customer approved the priced extra scope, recorded with its evidence. */
    async accept(ctx, tenant, actor, offer, { evidence }, now) {
      const change = await owned(ctx, offer.subjectId, tenant.accountId, 'mediaChangeOrders');
      if (!change) return { ok: false, reason: 'change_order_not_found' };
      return executeMedia(ctx, tenant, actor, { operation: 'media_change_order_decide', changeOrderId: offer.subjectId, version: change.version,
        media: { decision: 'approved', customerApproval: `${evidence}:${offer.ref}` } }, now);
    },
  },

  automotive_estimate: {
    /** Approve = present this estimate: a revised price saves a new estimate version, then it is issued. */
    async approve(ctx, tenant, actor, offer, now) {
      const current = await currentEstimate(ctx, tenant, offer);
      if (!current.ok) return current;
      let { estimate, work } = current;
      const priced = estimate.lines.map((l, i) => ({ ...l, unitPriceMinor: offer.lines.find(x => x.key === `l${i + 1}`)?.unitPriceMinor ?? l.unitPriceMinor }));
      if (priced.some((l, i) => l.unitPriceMinor !== estimate.lines[i].unitPriceMinor)) {
        const saved = await executeAutomotive(ctx, tenant, actor, { operation: 'automotive_estimate_save', requestId: stableRequestId(`offer-estimate:${offer._id}:${offer.version}`), workOrderId: work._id,
          workflow: { lines: priced.map(({ kind, name, variantId, qty, unitPriceMinor, standardMinutes }) => ({ kind, name, ...(variantId ? { variantId } : {}), qty, unitPriceMinor, ...(standardMinutes !== undefined ? { standardMinutes } : {}) })) } }, now);
        if (!saved.ok) return saved;
        estimate = await ctx.db.get(saved.value.id);
        await ctx.db.patch(offer._id, { requestId: `auto-estimate:${estimate._id}` });
      }
      if (estimate.status !== 'draft') return { ok: true };
      return executeAutomotive(ctx, tenant, actor, { operation: 'automotive_estimate_status', requestId: stableRequestId(`issue:${estimate._id}`), estimateId: estimate._id, version: estimate.version, status: 'issued' }, now);
    },
    /** Accept = the customer's recorded yes approves the estimate they were sent, and only that one. */
    async accept(ctx, tenant, actor, offer, { by, evidence }, now) {
      const current = await currentEstimate(ctx, tenant, await ctx.db.get(offer._id) || offer);
      if (!current.ok) return current;
      const { estimate, work } = current;
      if (estimate.status !== 'issued' || estimate.totalMinor !== offer.totalMinor) return { ok: false, reason: 'estimate_changed' };
      const conversation = offer.conversationId ? await owned(ctx, offer.conversationId, tenant.accountId, 'blueConversations') : null;
      // A chat yes is recorded as the channel it came on; a staff entry keeps the evidence they chose.
      const source = evidence === 'chat_reply' ? (conversation?.channel === 'instagram' ? 'instagram' : 'whatsapp') : evidence;
      return executeAutomotive(ctx, tenant, actor, { operation: 'automotive_approval_record', requestId: stableRequestId(`accept:${offer._id}`), workOrderId: work._id, version: work.version,
        estimateId: estimate._id, approvedBy: `${by} · ${offer.ref}`.slice(0, 100), evidenceSource: source }, now);
    },
  },

  // A phone store's repair quote: the owner approves; the customer's yes approves that quote (repairOffer.js).
  [REPAIR_SUBJECT]: repairSubject,

  construction_variation: {
    /** Approve = submit the variation to the client at the price Adiba sent; a changed price is refused. */
    async approve(ctx, tenant, actor, offer, now) {
      const v = await owned(ctx, offer.subjectId, tenant.accountId, 'constructionVariations');
      if (!v) return { ok: false, reason: 'variation_not_found' };
      if (v.contractDeltaMinor !== offer.totalMinor) return { ok: false, reason: 'variation_changed' };
      if (v.status === 'submitted') return { ok: true };
      return executeConstruction(ctx, tenant, actor, { operation: 'construction_variation_status', variationId: v._id, version: v.version, status: 'submitted' }, now);
    },
    /**
     * Accept = the client's recorded agreement. A variation changes the contract, so it is not approved
     * here: the owner gets a task to attach the signed variation and approve it (Ahmed, 2026-10-12).
     */
    async accept(ctx, tenant, actor, offer, { evidence }, now) {
      const v = await owned(ctx, offer.subjectId, tenant.accountId, 'constructionVariations');
      if (!v || v.status !== 'submitted' || v.contractDeltaMinor !== offer.totalMinor) return { ok: false, reason: 'variation_changed' };
      await ctx.db.patch(v._id, { customerApproval: `${evidence}:${offer.ref}`.slice(0, 80), customerApprovedAt: now, updatedAt: now });
      await openTaskOnce(ctx, 'constructionTasks', { accountId: tenant.accountId, kind: 'signed_variation_required', entityType: 'variation', entityId: v._id,
        reason: `The client agreed to ${v.reference} in chat (${offer.ref}): attach the signed variation, then approve it` }, now);
      return { ok: true };
    },
  },

  hvac_estimate: {
    /** Approve = present this estimate: a revised price saves a new estimate version, then it is issued. */
    async approve(ctx, tenant, actor, offer, now) {
      const current = await currentHvacEstimate(ctx, tenant, offer);
      if (!current.ok) return current;
      let { estimate, job } = current;
      const priced = estimate.lines.map((l, i) => ({ ...l, unitPriceMinor: offer.lines.find(x => x.key === `l${i + 1}`)?.unitPriceMinor ?? l.unitPriceMinor }));
      if (priced.some((l, i) => l.unitPriceMinor !== estimate.lines[i].unitPriceMinor)) {
        const saved = await executeHvac(ctx, tenant, actor, { operation: 'hvac_estimate_save', requestId: stableRequestId(`offer-estimate:${offer._id}:${offer.version}`), jobId: job._id,
          hvac: { lines: priced.map(({ kind, name, variantId, qty, unitPriceMinor }) => ({ kind, name, ...(variantId ? { variantId } : {}), qty, unitPriceMinor })) } }, now);
        if (!saved.ok) return saved;
        estimate = await ctx.db.get(saved.value.id);
        await ctx.db.patch(offer._id, { requestId: `hvac-estimate:${estimate._id}` });
      }
      if (estimate.status !== 'draft') return { ok: true };
      return executeHvac(ctx, tenant, actor, { operation: 'hvac_estimate_status', estimateId: estimate._id, version: estimate.version, status: 'issued' }, now);
    },
    /** Accept = the customer's recorded yes approves the estimate they were sent, and only that one. */
    async accept(ctx, tenant, actor, offer, { by, evidence }, now) {
      const current = await currentHvacEstimate(ctx, tenant, await ctx.db.get(offer._id) || offer);
      if (!current.ok) return current;
      const { estimate, job } = current;
      if (estimate.status !== 'issued' || estimate.totalMinor !== offer.totalMinor) return { ok: false, reason: 'estimate_changed' };
      return executeHvac(ctx, tenant, actor, { operation: 'hvac_approval_record', jobId: job._id, version: job.version, estimateId: estimate._id,
        approvedBy: `${by} · ${offer.ref}`.slice(0, 100), evidenceSource: await chatEvidence(ctx, tenant, offer, evidence) }, now);
    },
  },

  hvac_contract: {
    /** Approve = the renewal goes to the customer at the owner's price; a changed price is written to the draft first. */
    async approve(ctx, tenant, actor, offer, now) {
      const c = await owned(ctx, offer.subjectId, tenant.accountId, 'hvacContracts');
      if (!c || c.status !== 'draft') return { ok: false, reason: 'contract_changed' };
      if (c.priceMinor === offer.totalMinor) return { ok: true };
      return executeHvac(ctx, tenant, actor, { operation: 'hvac_contract_save', contractId: c._id, version: c.version, hvac: { priceMinor: offer.totalMinor } }, now);
    },
    /** Accept = the customer's recorded yes activates the contract at the price they were sent, which charges it. */
    async accept(ctx, tenant, actor, offer, { evidence }, now) {
      const c = await owned(ctx, offer.subjectId, tenant.accountId, 'hvacContracts');
      if (!c || c.status !== 'draft' || c.priceMinor !== offer.totalMinor) return { ok: false, reason: 'contract_changed' };
      return executeHvac(ctx, tenant, actor, { operation: 'hvac_contract_status', contractId: c._id, version: c.version, status: 'active', evidenceSource: await chatEvidence(ctx, tenant, offer, evidence) }, now);
    },
  },
});

/** A chat yes is recorded as the channel it came on; a staff entry keeps the evidence they chose. */
async function chatEvidence(ctx, tenant, offer, evidence) {
  if (evidence !== 'chat_reply') return evidence;
  const conversation = offer.conversationId ? await owned(ctx, offer.conversationId, tenant.accountId, 'blueConversations') : null;
  return conversation?.channel === 'instagram' ? 'instagram' : 'whatsapp';
}

/** The estimate an AC offer was made from, while it is still the job's latest version. */
async function currentHvacEstimate(ctx, tenant, offer) {
  const job = await owned(ctx, offer.subjectId, tenant.accountId, 'hvacJobs');
  const estimateId = String(offer.requestId || '').replace(/^hvac-estimate:/, '');
  const estimate = estimateId ? await owned(ctx, estimateId, tenant.accountId, 'hvacEstimates') : null;
  if (!job || !estimate || String(estimate.jobId) !== String(job._id)) return { ok: false, reason: 'estimate_not_found' };
  const latest = latestOf(await ctx.db.query('hvacEstimates').withIndex('by_job', q => q.eq('jobId', job._id)).take(100));
  if (String(latest?._id) !== String(estimate._id)) return { ok: false, reason: 'estimate_changed' };
  return { ok: true, estimate, job };
}

/** The estimate an automotive offer was made from, while it is still the work order's latest. */
async function currentEstimate(ctx, tenant, offer) {
  const work = await owned(ctx, offer.subjectId, tenant.accountId, 'automotiveWorkOrders');
  const estimateId = String(offer.requestId || '').replace(/^auto-estimate:/, '');
  const estimate = estimateId ? await owned(ctx, estimateId, tenant.accountId, 'automotiveEstimates') : null;
  if (!work || !estimate || String(estimate.workOrderId) !== String(work._id)) return { ok: false, reason: 'estimate_not_found' };
  const latest = latestEstimates(await ctx.db.query('automotiveEstimates').withIndex('by_work_order', q => q.eq('workOrderId', work._id)).take(100)).get(String(work._id));
  if (String(latest?._id) !== String(estimate._id)) return { ok: false, reason: 'estimate_changed' };
  return { ok: true, estimate, work };
}

export const SUBJECT_TYPES = Object.freeze(Object.keys(SUBJECTS));
