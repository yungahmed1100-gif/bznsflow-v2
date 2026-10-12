// What an approved or accepted offer changes in its sector's records. A conversation offer changes
// nothing but itself; a media quote is issued and presented on approval and accepted on the
// customer's recorded yes; a media extra-scope change order is approved on that yes. Each step goes
// through the sector's own operation and guards, so an offer can never move a record the sector refuses.
import { owned } from '../blueTenant.js';
import { executeMedia } from './mediaState.js';

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
});

export const SUBJECT_TYPES = Object.freeze(Object.keys(SUBJECTS));
