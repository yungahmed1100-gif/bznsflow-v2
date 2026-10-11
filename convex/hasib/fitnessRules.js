// Fitness's three follow-up rules (ascend/fitness.md, "Follow-ups within Memberships"): trial
// preparation, attendance gap and renewal. A rule writes a draft (or opens a task); the draft goes
// out only through fitness_draft_approve and its window, template and opt-out checks.
import { fitnessSettings } from './fitnessSettings.js';
import { DAY, MIN, effectiveEnd, lastPresence, inAttendanceGap } from './fitnessDomain.js';
import { greeting, localWhen as when, localDay as day } from './workspace/text.js';

// Switching a rule on never digs up last month's records.
const STALE_MS = 30 * DAY;
export const FITNESS_RULE_KINDS = Object.freeze({ trial_reminder: 'rule_trial_reminder', attendance_gap: 'rule_attendance_gap', renewal: 'rule_renewal' });
export const FITNESS_RULE_TASK_KINDS = new Set(Object.values(FITNESS_RULE_KINDS));
const REASONS = {
  trial_reminder: 'A trial class is coming up: remind the customer',
  attendance_gap: 'An active member has not visited for a while: invite them back',
  renewal: 'A membership ends soon with no renewal recorded',
};

/**
 * What each enabled rule calls for right now.
 * @param {object} gym the loaded records (see loadGym)
 * @returns {Array<{ rule, kind, entityType, entityId, dueAt, reason, contactId, membership?, seat?, klass?, key }>}
 */
export function fitnessRuleWanted(gym, now, settings) {
  const s = fitnessSettings(settings), rules = Object.fromEntries(s.rules.filter(r => r.enabled).map(r => [r.id, r]));
  const out = [];
  const push = (rule, entityType, entity, dueAt, extra) => out.push({ rule, kind: FITNESS_RULE_KINDS[rule.id], entityType, entityId: String(entity._id), dueAt, reason: REASONS[rule.id],
    key: `${FITNESS_RULE_KINDS[rule.id]}:${entity._id}:${dueAt}`, ...extra });
  const trial = rules.trial_reminder;
  if (trial) for (const seat of gym.seats) {
    const klass = gym.classById.get(String(seat.classId));
    if (!seat.trial || seat.status !== 'confirmed' || !klass || klass.status === 'cancelled' || klass.startsAt <= now) continue;
    const at = klass.startsAt - trial.offsetMinutes * MIN;
    if (now >= at) push(trial, 'seat', seat, at, { contactId: seat.contactId, seat, klass });
  }
  const gap = rules.attendance_gap, renewal = rules.renewal;
  for (const m of gym.memberships) {
    const state = gym.stateOf(m);
    if (gap && inAttendanceGap(m, state, s, now)) {
      const at = lastPresence(m) + s.gapDays * DAY + gap.offsetMinutes * MIN;
      if (now >= at && now - at <= STALE_MS) push(gap, 'membership', m, at, { contactId: m.contactId, membership: m });
    }
    if (renewal && ['active', 'frozen'].includes(state) && !gym.successorOf.has(String(m._id))) {
      const end = effectiveEnd(m), at = end - renewal.offsetMinutes * MIN;
      if (now >= at && now < end) push(renewal, 'membership', m, at, { contactId: m.contactId, membership: m, endsAt: end });
    }
  }
  return out;
}


/** A draft from recorded facts only: class title and time, plan name and end date. No health claims. */
export function fitnessDraftText(item, { name, timezone, arabic, planName }) {
  const hello = greeting(name, arabic);
  if (item.kind === 'waitlist_promoted') {
    return arabic ? `${hello} توفر لك مكان في حصة ${item.klass.title} يوم ${when(item.klass.startsAt, timezone)}. حجزناه لك؛ أخبرنا إن لم تتمكن من الحضور.`
      : `${hello} a place opened in ${item.klass.title} on ${when(item.klass.startsAt, timezone)}. We have booked it for you; let us know if you can't make it.`;
  }
  if (item.rule.id === 'trial_reminder') {
    return arabic ? `${hello} نذكّرك بحصتك التجريبية ${item.klass.title} يوم ${when(item.klass.startsAt, timezone)}. نراك قريباً.`
      : `${hello} a reminder of your trial class, ${item.klass.title}, on ${when(item.klass.startsAt, timezone)}. See you soon.`;
  }
  if (item.rule.id === 'attendance_gap') {
    return arabic ? `${hello} اشتقنا لك! جدول الحصص لهذا الأسبوع متاح، وسنسعد بحجز الوقت المناسب لك.`
      : `${hello} we've missed you! This week's class schedule is open, and we'd be glad to book a time that suits you.`;
  }
  return arabic ? `${hello} ينتهي اشتراكك${planName ? ` (${planName})` : ''} في ${day(item.endsAt, timezone)}. يسعدنا تجديده لك متى ما رغبت.`
    : `${hello} your membership${planName ? ` (${planName})` : ''} ends on ${day(item.endsAt, timezone)}. We'd be happy to renew it whenever you're ready.`;
}
