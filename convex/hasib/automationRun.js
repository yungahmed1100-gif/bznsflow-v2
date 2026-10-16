// Hasib's own schedule: every five minutes, the accounts whose sector runs automation get one
// bounded run each (refresh the records, then send what the rules allow by themselves). A dashboard
// read never sends anything; only this run does. Kill switch: HASIB_AUTOMATION=off.
import { packFor } from './shared.js';
import { planFor, HASIB_PLANS } from './plans.js';
import { hasibEnabled } from './gate.js';
import { isLivePack } from '../../config/hasib-packs.js';
import { runMediaAutomation } from './mediaAutomation.js';
import { runAutomotiveAutomation } from './automotiveAutomation.js';
import { runConstructionAutomation } from './constructionAutomation.js';
import { runRetailAutomation } from './retailAutomation.js';

export const RUN_EVERY_MS = 5 * 60000;
export const SWEEP_LIMIT = 20;
const RUNNERS = { media: runMediaAutomation, automotive: runAutomotiveAutomation, construction: runConstructionAutomation, retail: runRetailAutomation, 'retail-tech': runRetailAutomation };
export { ensureAutomation } from './workspace/schedule.js';

/** The cron: claims up to SWEEP_LIMIT due accounts (oldest first) and schedules one run for each. */
export async function automationSweep(ctx, runFunction, now) {
  if (process.env.HASIB_AUTOMATION === 'off') return { scheduled: 0, off: true };
  const due = await ctx.db.query('hasibAutomation').withIndex('by_enabled_next', q => q.eq('enabled', true).lte('nextRunAt', now)).take(SWEEP_LIMIT);
  for (const row of due) {
    await ctx.db.patch(row._id, { nextRunAt: now + RUN_EVERY_MS });
    await ctx.scheduler.runAfter(0, runFunction, { accountId: row.accountId });
  }
  return { scheduled: due.length };
}

/** One account's run. Refuses quietly (recording why) when the account can no longer run automation. */
export async function automationRun(ctx, { accountId, workerFunction, secret }, now) {
  const schedule = await ctx.db.query('hasibAutomation').withIndex('by_account', q => q.eq('accountId', accountId)).unique();
  const done = async result => { if (schedule) await ctx.db.patch(schedule._id, { lastRunAt: now, lastResult: String(result).slice(0, 80) }); return result; };
  if (process.env.HASIB_AUTOMATION === 'off') return done('off');
  if (!(await hasibEnabled(ctx))) return done('hasib_unavailable');
  if (!HASIB_PLANS.includes(await planFor(ctx, accountId))) return done('plan_required');
  const account = await ctx.db.get(accountId);
  const row = account?.draftHash ? await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', account.draftHash)).unique() : null;
  if (!row) return done('no_workspace');
  const tenant = { accountId, row, secret, workerFunction };
  tenant.pack = await packFor(ctx, tenant);
  if (!isLivePack(tenant.pack.id) && ctx.hasibPreview !== true) return done('pack_not_live');
  const runner = RUNNERS[tenant.pack.id];
  if (!runner) { if (schedule) await ctx.db.patch(schedule._id, { enabled: false, updatedAt: now }); return done('no_runner'); }
  const result = await runner(ctx, tenant, now);
  return done(`sent:${result.sent} skipped:${result.skipped}${result.quoted !== undefined ? ` quoted:${result.quoted}` : ''}`);
}
