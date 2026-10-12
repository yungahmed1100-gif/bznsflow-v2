// What each conversation achieved, as facts the owner can count: when it became qualified (every
// required detail captured) and when Layla gave the team contact, with what was and wasn't known.
// Records only: nothing here pauses Layla, opens a queue or changes the chat's hand-over state.
import { requiredKeys } from '../config/layla-qualification.js';

/**
 * The details a sector requires, split into captured and missing for one contact.
 * @param {string} sectorId @param {{key:string, value?:string}[]} fields
 */
export function detailsOf(sectorId, fields = []) {
  const required = requiredKeys(sectorId), have = new Set(fields.filter(f => f.value).map(f => f.key));
  return { required, captured: required.filter(k => have.has(k)), missing: required.filter(k => !have.has(k)) };
}

/**
 * The conversation's next outcome record, or null when nothing changed.
 * `qualifiedAt` is set once, the first time every required detail is known; `referral` records the
 * latest time Layla gave the team contact and why.
 * @param {{ previous?: object, sectorId: string, fields: object[], needsTeam: boolean, intent?: string, now: number }} p
 */
export function nextOutcome({ previous, sectorId, fields, needsTeam, intent, now }) {
  const details = detailsOf(sectorId, fields);
  const qualifiedNow = details.required.length > 0 && details.missing.length === 0;
  const qualifiedAt = previous?.qualifiedAt || (qualifiedNow ? now : undefined);
  const referral = needsTeam ? { at: now, reason: String(intent || 'unknown').slice(0, 40) } : previous?.referral;
  if (qualifiedAt === previous?.qualifiedAt && referral === previous?.referral && String(details.captured) === String(previous?.captured || '')) return null;
  return { ...(qualifiedAt ? { qualifiedAt } : {}), ...(referral ? { referral } : {}), ...details, updatedAt: now };
}

/** First-time activation stamps on the setup row: written once, never moved. */
export function firstStamps(metrics = {}, outcome, now) {
  const next = { ...metrics };
  if (outcome?.qualifiedAt && !next.firstQualifiedAt) next.firstQualifiedAt = outcome.qualifiedAt;
  if (outcome?.referral?.at === now && !next.firstTeamReferralAt) next.firstTeamReferralAt = now;
  return next;
}

/**
 * Records the outcome after Layla's turn is committed.
 * @param {any} ctx @param {{ person: any, contact: any, row: any, sectorId: string, needsTeam: boolean, intent?: string, now: number }} p
 */
export async function recordOutcome(ctx, { person, contact, row, sectorId, needsTeam, intent, now }) {
  if (!contact) return;
  const fresh = await ctx.db.get(contact._id);
  const outcome = nextOutcome({ previous: person.outcome, sectorId, fields: fresh?.fields || [], needsTeam, intent, now });
  if (!outcome) return;
  await ctx.db.patch(person._id, { outcome });
  const metrics = firstStamps(row.metrics, outcome, now);
  if (metrics.firstQualifiedAt !== row.metrics?.firstQualifiedAt || metrics.firstTeamReferralAt !== row.metrics?.firstTeamReferralAt) await ctx.db.patch(row._id, { metrics });
}
