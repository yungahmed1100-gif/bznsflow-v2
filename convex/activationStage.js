// How far a granted owner has got, from recorded timestamps only, furthest stage first.
// Shown on Ahmed's access list so a stalled owner is visible without asking them.

export const STAGES = Object.freeze(['granted', 'signed_up', 'published', 'live', 'first_reply', 'qualified']);

/**
 * The furthest stage reached and when.
 * @param {{ account?: { _creationTime?: number } | null, row?: { metrics?: object, bznsPublished?: { publishedAt?: number } } | null, grantedAt?: number }} p
 * @returns {{ stage: string, at: number | null }}
 */
export function activationStage({ account, row, grantedAt = null }) {
  const m = row?.metrics || {};
  const reached = [
    ['qualified', m.firstQualifiedAt],
    ['first_reply', m.firstReplySentAt],
    ['live', m.firstActivatedAt],
    ['published', m.firstPublishedAt || row?.bznsPublished?.publishedAt],
    ['signed_up', account ? account._creationTime || null : null],
  ].find(([, at]) => at);
  if (reached) return { stage: reached[0], at: reached[1] };
  return { stage: 'granted', at: grantedAt };
}
