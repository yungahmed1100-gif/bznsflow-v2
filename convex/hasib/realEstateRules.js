// Real Estate's three follow-up rules (ascend/real-estate.md, "Follow-ups within Deals").
// A rule only ever opens an internal task or a draft waiting for the manager's approval;
// sending stays with draft_approve and its window, template and opt-out checks.
import { realEstateSettings } from './realEstateSettings.js';
import { formatLocal } from '../../src/lib/timezone.js';

const MIN = 60000, DAY = 86400000;
// Switching a rule on never digs up last year's records.
const STALE_MS = 30 * DAY;
const OPEN = ['new', 'contacted', 'qualified', 'viewing', 'offer'];
export const RULE_KINDS = Object.freeze({
  missing_requirements: 'rule_missing_requirements',
  viewing_confirmation: 'rule_viewing_confirmation',
  post_viewing_decision: 'rule_post_viewing_decision',
});
export const RULE_TASK_KINDS = new Set(Object.values(RULE_KINDS));
const REASONS = {
  missing_requirements: 'Requirements are still missing: ask for them',
  viewing_confirmation: 'Confirm the viewing with the customer',
  post_viewing_decision: 'No decision since the viewing: ask how it went',
};

/** The qualification fields an opportunity still lacks, in the order a customer is asked. */
export function missingFields(o) {
  return [
    !(o.budgetMaxMinor > 0) && 'budget', !o.areas?.length && 'area', !o.propertyTypes?.length && 'property_type',
    o.timeline === 'unknown' && 'timing', o.financeReadiness === 'unknown' && 'finance', o.decisionMakerReadiness === 'unknown' && 'decision_maker',
  ].filter(Boolean);
}

/**
 * What each enabled rule calls for right now. `lastInbound(opportunity)` resolves the customer's
 * latest message time, read only for the deals a rule is considering.
 * @returns {Promise<Array<{ rule: object, kind: string, entityType: string, entityId: string, dueAt: number, reason: string, opportunity: object, viewing?: object, gaps?: string[], key: string }>>}
 */
export async function ruleWanted({ opportunities, viewings, offers }, now, settings, lastInbound) {
  const rules = Object.fromEntries(realEstateSettings(settings).rules.filter(r => r.enabled).map(r => [r.id, r]));
  const deals = new Map(opportunities.map(o => [String(o._id), o]));
  const offered = new Set(offers.filter(o => !['rejected', 'withdrawn'].includes(o.status)).map(o => String(o.opportunityId)));
  const out = [];
  const push = (rule, entityType, entity, opportunity, dueAt, extra = {}) => out.push({
    rule, kind: RULE_KINDS[rule.id], entityType, entityId: String(entity._id), dueAt, reason: REASONS[rule.id], opportunity, ...extra,
    key: `${rule.id}:${entity._id}:${dueAt}`,
  });

  const missing = rules.missing_requirements;
  if (missing) for (const o of opportunities) {
    if (!['new', 'contacted'].includes(o.stage)) continue;
    const gaps = missingFields(o), at = o.createdAt + missing.offsetMinutes * MIN;
    if (!gaps.length || now < at || now - at > STALE_MS) continue;
    if ((await lastInbound(o)) > at) continue; // the customer answered after the rule fired
    push(missing, 'opportunity', o, o, at, { gaps });
  }
  const confirm = rules.viewing_confirmation;
  if (confirm) for (const v of viewings) {
    if (!['requested', 'confirmed'].includes(v.status) || v.scheduledAt <= now) continue; // never after the start
    const at = v.scheduledAt - confirm.offsetMinutes * MIN, o = deals.get(String(v.opportunityId));
    if (now < at || !o || !OPEN.includes(o.stage)) continue;
    push(confirm, 'viewing', v, o, at, { viewing: v });
  }
  const decision = rules.post_viewing_decision;
  if (decision) {
    // The latest completed viewing of each deal, only.
    const latest = new Map();
    for (const v of viewings) if (v.status === 'completed') {
      const prev = latest.get(String(v.opportunityId));
      if (!prev || v.scheduledAt > prev.scheduledAt) latest.set(String(v.opportunityId), v);
    }
    for (const v of latest.values()) {
      const done = v.statusAt || v.scheduledAt, at = done + decision.offsetMinutes * MIN, o = deals.get(String(v.opportunityId));
      if (now < at || now - at > STALE_MS || !o || !OPEN.includes(o.stage) || offered.has(String(o._id))) continue;
      if ((await lastInbound(o)) > done) continue; // feedback arrived
      push(decision, 'viewing', v, o, at, { viewing: v });
    }
  }
  return out;
}

const GAP_WORDS = {
  en: { budget: 'your budget', area: 'the areas you prefer', property_type: 'the type of property', timing: 'when you plan to move', finance: 'how you plan to pay', decision_maker: 'who else decides' },
  ar: { budget: 'الميزانية', area: 'المناطق المفضلة', property_type: 'نوع العقار', timing: 'موعد الانتقال', finance: 'طريقة الدفع', decision_maker: 'من يشارك في القرار' },
};
const when = (ms, tz) => formatLocal(ms, tz).replace('T', ' ');

/** A rule's draft, from approved records only. It never states availability or a price. */
export function ruleDraftText(item, { name, propertyLabel, location, timezone, arabic }) {
  const hello = arabic ? `مرحباً${name ? ` ${name}` : ''}،` : `Hello${name ? ` ${name}` : ''},`;
  const place = [propertyLabel, location].filter(Boolean).join(arabic ? '، ' : ', ');
  if (item.rule.id === 'missing_requirements') {
    const words = item.gaps.slice(0, 3).map(g => GAP_WORDS[arabic ? 'ar' : 'en'][g]).join(arabic ? ' و' : ', ');
    return arabic ? `${hello} لنقترح عليك العقارات المناسبة، هل يمكنك إخبارنا عن ${words}؟` : `${hello} so we can suggest the right properties, could you share ${words}?`;
  }
  if (item.rule.id === 'viewing_confirmation') {
    const time = when(item.viewing.scheduledAt, timezone);
    return arabic ? `${hello} نذكّرك بموعد معاينة ${place} في ${time}. ردّ هنا إذا احتجت تغيير الموعد.`
      : `${hello} a reminder of your viewing of ${place} on ${time}. Reply here if you need to change the time.`;
  }
  return arabic ? `${hello} شكراً لمعاينة ${place}. ما رأيك؟ أخبرنا إن كنت ترغب بتقديم عرض أو رؤية خيارات أخرى.`
    : `${hello} thank you for viewing ${place}. How did you find it? Tell us if you would like to make an offer or see other options.`;
}
