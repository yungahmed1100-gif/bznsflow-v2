// A dental clinic's four follow-up rules (ascend/dental.md, "Follow-ups within Visits"): visit
// confirmation, missed-visit recovery, a clinician-set recall and an overdue balance. A rule
// writes a draft (or opens a task); the draft goes out only through dental_draft_approve and its
// window, template and opt-out checks. Wording is neutral: no treatment, symptom or clinical word.
import { dentalSettings } from './dentalSettings.js';
import { DAY, MIN, balanceOf, balanceOverdue } from './dentalDomain.js';
import { formatLocal } from '../../src/lib/timezone.js';

// Switching a rule on never digs up last month's records.
const STALE_MS = 30 * DAY;
// The recall's second reminder, a few days before the clinician's date.
export const RECALL_LAST_STEP_MS = 3 * DAY;
export const DENTAL_RULE_KINDS = Object.freeze({ visit_confirmation: 'rule_visit_confirmation', missed_recovery: 'rule_missed_recovery', recall: 'rule_recall', balance_due: 'rule_balance_due' });
export const DENTAL_RULE_TASK_KINDS = new Set(Object.values(DENTAL_RULE_KINDS));
const REASONS = {
  visit_confirmation: 'An appointment is coming up and is not confirmed yet',
  missed_recovery: 'A visit was missed: offer another time',
  recall: 'A recall date set by the clinician is approaching',
  balance_due: 'A visit balance is past its due date',
};

/** Who a visit's messages go to: the guardian for a minor, otherwise the patient. */
export const recipientOf = v => v.forMinor && v.guardianContactId ? v.guardianContactId : v.contactId;

/**
 * What each enabled rule calls for right now.
 * @param {object} clinic the loaded records (see loadClinic)
 * @returns {Array<{ rule, kind, entityType, entityId, dueAt, reason, contactId, visit, key, balanceMinor? }>}
 */
export function dentalRuleWanted(clinic, now, settings) {
  const s = dentalSettings(settings), rules = Object.fromEntries(s.rules.filter(r => r.enabled).map(r => [r.id, r]));
  const out = [];
  const push = (rule, v, dueAt, extra = {}) => out.push({ rule, kind: DENTAL_RULE_KINDS[rule.id], entityType: 'visit', entityId: String(v._id), dueAt, reason: REASONS[rule.id],
    key: `${DENTAL_RULE_KINDS[rule.id]}:${v._id}:${dueAt}`, contactId: recipientOf(v), visit: v, ...extra });
  for (const v of clinic.visits) {
    const confirm = rules.visit_confirmation;
    if (confirm && v.status === 'booked' && v.startsAt > now) {
      const at = v.startsAt - confirm.offsetMinutes * MIN;
      if (now >= at) push(confirm, v, at);
    }
    const missed = rules.missed_recovery;
    if (missed && v.status === 'missed' && v.missedAt && !clinic.rebooked(v) && !clinic.held.has(String(v._id))) {
      const at = v.missedAt + missed.offsetMinutes * MIN;
      if (now >= at && now - at <= STALE_MS) push(missed, v, at);
    }
    const recall = rules.recall;
    if (recall && v.status === 'completed' && v.recallDueAt && !clinic.bookedSinceRecall(v) && now < v.recallDueAt + STALE_MS) {
      const first = v.recallDueAt - recall.offsetMinutes * MIN, last = v.recallDueAt - RECALL_LAST_STEP_MS;
      // Only the latest due step is wanted: the earlier unsent draft gives way to the closer reminder.
      const at = now >= last && last > first ? last : now >= first ? first : null;
      if (at !== null) push(recall, v, at, { recallDueAt: v.recallDueAt });
    }
    const balance = rules.balance_due, order = v.orderId ? clinic.orders.get(String(v.orderId)) : null;
    if (balance && balanceOverdue(v, order, now)) {
      const at = v.chargeDueAt + balance.offsetMinutes * MIN;
      if (now >= at && now - at <= STALE_MS) push(balance, v, at, { balanceMinor: balanceOf(order) });
    }
  }
  return out;
}

const when = (ms, tz) => formatLocal(ms, tz).replace('T', ' ');
const day = (ms, tz) => formatLocal(ms, tz).slice(0, 10);
const money = (minor, currency) => `${(minor / 1000).toFixed(3)} ${currency || 'OMR'}`;

/** A draft from recorded facts only: the appointment time, a date, a balance. Never a treatment or symptom. */
export function dentalDraftText(item, { name, timezone, arabic, currency }) {
  const hello = arabic ? `مرحباً${name ? ` ${name}` : ''}،` : `Hello${name ? ` ${name}` : ''},`;
  const v = item.visit;
  if (item.rule.id === 'visit_confirmation') {
    return arabic ? `${hello} نذكّرك بالموعد المحجوز يوم ${when(v.startsAt, timezone)}. يرجى الرد للتأكيد، أو أخبرنا إن احتجت وقتاً آخر.`
      : `${hello} a reminder of the appointment booked for ${when(v.startsAt, timezone)}. Please reply to confirm, or let us know if you need another time.`;
  }
  if (item.rule.id === 'missed_recovery') {
    return arabic ? `${hello} افتقدناك في موعد ${day(v.startsAt, timezone)}. يسعدنا ترتيب وقت آخر يناسبك؛ فقط رد على هذه الرسالة.`
      : `${hello} we missed you at the appointment on ${day(v.startsAt, timezone)}. We'd be glad to find another time that suits you; just reply here.`;
  }
  if (item.rule.id === 'recall') {
    return arabic ? `${hello} موعد زيارتك القادمة حسب ما سجّله الطبيب في حدود ${day(item.recallDueAt, timezone)}. رد هنا ونرتب لك الوقت المناسب.`
      : `${hello} your next visit is due around ${day(item.recallDueAt, timezone)}, as recorded by the clinic. Reply here and we'll find a time that suits you.`;
  }
  return arabic ? `${hello} يوجد رصيد مستحق قدره ${money(item.balanceMinor, currency)} عن زيارة ${day(v.startsAt, timezone)}. رد هنا إن كان لديك أي استفسار.`
    : `${hello} there is an outstanding balance of ${money(item.balanceMinor, currency)} from the visit on ${day(v.startsAt, timezone)}. Reply here if you have any questions.`;
}
