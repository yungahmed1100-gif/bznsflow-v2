// The six-tab sectors and what each one adds to the shared plumbing: its operations, where its
// settings arrive and are stored, and the field that links a sent message back to its draft.
// Kept free of sector code so the messaging and campaign workers can read it cheaply.
import { REAL_ESTATE_OPERATIONS, MEDIA_OPERATIONS, FITNESS_OPERATIONS, DENTAL_OPERATIONS } from '../../../config/hasib-workflow-operations.js';

export const SIX_TAB_SECTORS = Object.freeze([
  { packId: 'real-estate', operations: REAL_ESTATE_OPERATIONS, settingsArg: 'realEstate', settingsKey: 'realEstate', draftField: 'realEstateDraftId' },
  { packId: 'media', operations: MEDIA_OPERATIONS, settingsArg: 'mediaSettings', settingsKey: 'media', draftField: 'mediaDraftId' },
  { packId: 'fitness', operations: FITNESS_OPERATIONS, settingsArg: 'fitnessSettings', settingsKey: 'fitness', draftField: 'fitnessDraftId' },
  { packId: 'dental', operations: DENTAL_OPERATIONS, settingsArg: 'dentalSettings', settingsKey: 'dental', draftField: 'dentalDraftId' },
]);
export const SECTOR_DRAFT_FIELDS = Object.freeze(SIX_TAB_SECTORS.map(s => s.draftField));

/** A delivery receipt (delivered or read) moves the draft its message came from. */
export async function markDraftDelivered(ctx, target, status, now) {
  if (!['delivered', 'read'].includes(status)) return;
  for (const field of SECTOR_DRAFT_FIELDS) if (target[field]) await ctx.db.patch(target[field], { status, deliveredAt: now, updatedAt: now });
}
