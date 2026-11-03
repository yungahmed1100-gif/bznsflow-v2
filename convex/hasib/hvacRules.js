// An AC service business's eight follow-up rules (ascend/hvac.md, "Follow-ups within Jobs"). A rule
// writes a draft (sent by Hasib when the rule is Auto, else approved by a manager) or opens a task.
// Wording uses recorded facts only: a visit window, a job number, a date, a balance, a contract
// reference. Never a fault, a diagnosis or a price the business did not record.
import { hvacSettings } from './hvacSettings.js';
import { DAY, MIN, balanceOf, latestSent, estimateExpired } from './hvacDomain.js';
import { greeting, localWhen as when, localDay as day } from './workspace/text.js';

// Switching a rule on never digs up last month's records; a completion notice is news only for a couple of days.
const STALE_MS = 30 * DAY, NEWS_MS = 2 * DAY;
// The second step of a follow-up: a week after the estimate, a week before the contract ends.
export const ESTIMATE_LAST_STEP_MS = 7 * DAY, RENEWAL_LAST_STEP_MS = 7 * DAY;
export const HVAC_RULE_KINDS = Object.freeze({ visit_reminder: 'rule_visit_reminder', job_complete: 'rule_job_complete', estimate_followup: 'rule_estimate_followup',
  service_due: 'rule_service_due', amc_renewal: 'rule_amc_renewal', balance_due: 'rule_balance_due', parts_delay: 'rule_parts_delay', visit_unrecorded: 'rule_visit_unrecorded' });
export const HVAC_RULE_TASK_KINDS = new Set(Object.values(HVAC_RULE_KINDS));
const REASONS = {
  visit_reminder: 'A visit is coming up: remind the customer of the window',
  job_complete: 'A job was completed: tell the customer',
  estimate_followup: 'An estimate is with the customer and has no answer yet',
  service_due: 'A unit’s service date set by the technician is approaching',
  amc_renewal: 'A maintenance contract ends soon and is not renewed',
  balance_due: 'A completed job or contract still has a balance',
  parts_delay: 'Parts are late: update the customer and the plan',
  visit_unrecorded: 'A visit window has passed with no arrival recorded',
};

/** The latest of a rule's steps that is due now: an earlier unsent draft gives way to the closer one. */
const latestStep = (now, first, last) => now >= last && last > first ? last : now >= first ? first : null;

/**
 * What each enabled rule calls for right now.
 * @param {object} shop the loaded records (see loadShop)
 * @returns {Array<{ rule, kind, entityType, entityId, dueAt, reason, contactId, key, job?, visit?, unit?, contract?, balanceMinor? }>}
 */
export function hvacRuleWanted(shop, now, settings) {
  const s = hvacSettings(settings), rules = Object.fromEntries(s.rules.filter(r => r.enabled).map(r => [r.id, r]));
  const out = [];
  const push = (rule, entityType, entity, contactId, dueAt, extra = {}) => out.push({ rule, kind: HVAC_RULE_KINDS[rule.id], entityType, entityId: String(entity._id), dueAt, reason: REASONS[rule.id],
    key: `${HVAC_RULE_KINDS[rule.id]}:${entity._id}:${dueAt}`, contactId, ...extra });
  const jobOf = id => shop.jobById.get(String(id));
  const { visit_reminder: reminder, visit_unrecorded: unrecorded } = rules;
  for (const v of shop.visits) {
    const job = jobOf(v.jobId);
    if (!job) continue;
    if (reminder && v.status === 'scheduled' && v.startsAt > now) {
      const at = v.startsAt - reminder.offsetMinutes * MIN;
      if (now >= at) push(reminder, 'visit', v, job.contactId, at, { job, visit: v });
    }
    if (unrecorded && v.status === 'scheduled') {
      const at = v.endsAt + unrecorded.offsetMinutes * MIN;
      if (now >= at && now - at <= 7 * DAY) push(unrecorded, 'visit', v, job.contactId, at, { job, visit: v });
    }
  }
  const { job_complete: complete, estimate_followup: followup, balance_due: balance, parts_delay: parts } = rules;
  for (const job of shop.jobs) {
    if (complete && job.status === 'completed' && job.completedAt) {
      const at = job.completedAt + complete.offsetMinutes * MIN;
      if (now >= at && now - at <= NEWS_MS) push(complete, 'job', job, job.contactId, at, { job, balanceMinor: balanceOf(shop.orderOf(job.orderId)) });
    }
    const sent = latestSent(shop.estimatesOf(job._id));
    if (followup && job.status === 'estimate_pending' && sent?.status === 'issued' && !estimateExpired(sent, now) && !shop.repliedSince(job.contactId, sent.issuedAt)) {
      const at = latestStep(now, sent.issuedAt + followup.offsetMinutes * MIN, sent.issuedAt + ESTIMATE_LAST_STEP_MS);
      if (at !== null) push(followup, 'job', job, job.contactId, at, { job, estimate: sent });
    }
    const owed = balanceOf(shop.orderOf(job.orderId));
    if (balance && job.status === 'completed' && owed > 0) {
      const at = job.completedAt + balance.offsetMinutes * MIN;
      if (now >= at && now - at <= STALE_MS) push(balance, 'job', job, job.contactId, at, { job, balanceMinor: owed });
    }
    if (parts && job.status === 'waiting_parts') {
      const since = job.partsExpectedAt || [...job.history].reverse().find(h => h.kind === 'waiting_parts')?.at || job.updatedAt;
      const at = since + parts.offsetMinutes * MIN;
      if (now >= at) push(parts, 'job', job, job.contactId, at, { job });
    }
  }
  const { service_due: service, amc_renewal: renewal } = rules;
  if (service) {
    for (const u of shop.units) {
      if (u.retiredAt || !u.nextServiceAt || shop.servicedSince(u) || now > u.nextServiceAt + STALE_MS) continue;
      const at = u.nextServiceAt - service.offsetMinutes * MIN;
      if (now >= at) push(service, 'unit', u, u.contactId, at, { unit: u, serviceAt: u.nextServiceAt });
    }
    // A contract visit Hasib opened that nobody has booked yet: ask the customer for a time.
    for (const job of shop.jobs) {
      if (job.source !== 'contract' || job.status !== 'approved' || shop.activeVisitOf(job._id)) continue;
      const dueAt = shop.contractVisitDue(job);
      const at = dueAt === null ? null : dueAt - service.offsetMinutes * MIN;
      if (at !== null && now >= at && now <= dueAt + STALE_MS) push(service, 'job', job, job.contactId, at, { job, serviceAt: dueAt });
    }
  }
  if (balance) for (const c of shop.contracts) {
    const owed = balanceOf(shop.orderOf(c.orderId));
    if (c.status !== 'active' || !owed || !c.acceptedAt) continue;
    const at = c.acceptedAt + balance.offsetMinutes * MIN;
    if (now >= at && now - at <= STALE_MS) push(balance, 'contract', c, c.contactId, at, { contract: c, balanceMinor: owed });
  }
  if (renewal) for (const c of shop.contracts) {
    if (c.status !== 'active' || c.renewedToId || now > c.endsAt + shop.settings.renewalGraceDays * DAY) continue;
    const at = latestStep(now, c.endsAt - renewal.offsetMinutes * MIN, c.endsAt - RENEWAL_LAST_STEP_MS);
    if (at !== null) push(renewal, 'contract', c, c.contactId, at, { contract: c });
  }
  return out;
}

const money = (minor, currency) => `${(minor / 1000).toFixed(3)} ${currency || 'OMR'}`;

/** A draft from recorded facts only. */
export function hvacDraftText(item, { name, timezone, arabic, currency }) {
  const hello = greeting(name, arabic), job = item.job, ref = job ? `#${job.number}` : '';
  switch (item.rule.id) {
    case 'visit_reminder': return arabic
      ? `${hello} نذكّرك بموعد زيارة الفني لطلب ${ref}: من ${when(item.visit.startsAt, timezone)} إلى ${when(item.visit.endsAt, timezone).slice(11)}. إن احتجت وقتاً آخر فقط رد على هذه الرسالة.`
      : `${hello} a reminder that our technician is booked for job ${ref} between ${when(item.visit.startsAt, timezone)} and ${when(item.visit.endsAt, timezone).slice(11)}. If you need another time, just reply here.`;
    case 'job_complete': return arabic
      ? `${hello} تم إنجاز طلب ${ref}.${item.balanceMinor ? ` المبلغ المتبقي ${money(item.balanceMinor, currency)}.` : ''} شكراً لثقتك، وإن لاحظت أي شيء رد علينا هنا.`
      : `${hello} job ${ref} is complete.${item.balanceMinor ? ` The balance is ${money(item.balanceMinor, currency)}.` : ''} Thank you, and if anything comes up just reply here.`;
    case 'estimate_followup': return arabic
      ? `${hello} أرسلنا لك تسعيرة طلب ${ref} بقيمة ${money(item.estimate.totalMinor, currency)}. هل تود أن نرتب موعد التنفيذ؟ رد بنعم أو أخبرنا بأي سؤال.`
      : `${hello} we sent you the estimate for job ${ref} (${money(item.estimate.totalMinor, currency)}). Would you like us to book the work? Reply yes, or ask us anything.`;
    case 'service_due': return arabic
      ? `${hello} موعد صيانة المكيف حسب ما سجّله الفني في حدود ${day(item.serviceAt, timezone)}. رد هنا ونرتب لك الوقت المناسب.`
      : `${hello} your AC service is due around ${day(item.serviceAt, timezone)}, as recorded by our technician. Reply here and we'll find a time that suits you.`;
    case 'amc_renewal': return arabic
      ? `${hello} عقد الصيانة ${item.contract.reference} ينتهي يوم ${day(item.contract.endsAt, timezone)}. هل تود تجديده للسنة القادمة؟ رد هنا ونرسل لك التفاصيل.`
      : `${hello} maintenance contract ${item.contract.reference} ends on ${day(item.contract.endsAt, timezone)}. Would you like to renew it for next year? Reply here and we'll send the details.`;
    case 'balance_due': return arabic
      ? `${hello} يوجد مبلغ مستحق قدره ${money(item.balanceMinor, currency)} عن ${item.contract ? `عقد الصيانة ${item.contract.reference}` : `طلب ${ref}`}. رد هنا إن كان لديك أي استفسار.`
      : `${hello} there is an outstanding balance of ${money(item.balanceMinor, currency)} for ${item.contract ? `maintenance contract ${item.contract.reference}` : `job ${ref}`}. Reply here if you have any questions.`;
    default: return '';
  }
}
