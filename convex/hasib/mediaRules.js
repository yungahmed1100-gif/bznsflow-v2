// Media's three follow-up rules (ascend/media.md, "Follow-ups within Productions"). A rule only
// opens an internal task or a draft that waits for the manager's approval; sending stays with
// media_draft_approve and its window, template and opt-out checks.
import { mediaSettings } from './mediaSettings.js';
import { DAY, MIN, prepMissing, latestCut } from './mediaDomain.js';
import { formatLocal } from '../../src/lib/timezone.js';

// Switching a rule on never digs up last month's records.
const STALE_MS = 30 * DAY;
export const MEDIA_RULE_KINDS = Object.freeze({
  prep_request: 'rule_prep_request', cut_approval: 'rule_cut_approval', delivery_balance: 'rule_delivery_balance', rights_expiry: 'rule_rights_expiry',
});
export const MEDIA_RULE_TASK_KINDS = new Set(Object.values(MEDIA_RULE_KINDS));
const REASONS = {
  prep_request: 'Client inputs are still missing before the shoot: ask for them in one message',
  cut_approval: 'The current cut needs the client’s decision before it is due',
  delivery_balance: 'Accepted work still has a handoff or balance outstanding',
  rights_expiry: 'Usage rights end soon: check renewal with the client',
};

/**
 * What each enabled rule calls for right now.
 * @param {{ productions: object[], cuts: object[], orders: Map<string, object> }} records
 * @returns {Array<{ rule: object, kind: string, entityType: string, entityId: string, dueAt: number, reason: string, production: object, cut?: object, gaps?: string[], balanceMinor?: number, key: string }>}
 */
export function mediaRuleWanted({ productions, cuts, orders }, now, settings) {
  const rules = Object.fromEntries(mediaSettings(settings).rules.filter(r => r.enabled).map(r => [r.id, r]));
  const cutsOf = new Map();
  for (const c of cuts) cutsOf.set(String(c.productionId), [...(cutsOf.get(String(c.productionId)) || []), c]);
  const out = [];
  const push = (rule, kind, entityType, entity, production, dueAt, extra = {}) => out.push({
    rule, kind, entityType, entityId: String(entity._id), dueAt, reason: REASONS[kind === MEDIA_RULE_KINDS.rights_expiry ? 'rights_expiry' : rule.id], production, ...extra,
    key: `${kind}:${entity._id}:${dueAt}`,
  });

  const prep = rules.prep_request;
  if (prep) for (const p of productions) {
    if (!['booked', 'preproduction'].includes(p.status) || !p.shootStartsAt || p.shootStartsAt <= now) continue; // never after the shoot starts
    const gaps = prepMissing(p, { clientInput: true }).map(i => i.key), at = p.shootStartsAt - prep.offsetMinutes * MIN;
    if (!gaps.length || now < at) continue;
    push(prep, MEDIA_RULE_KINDS.prep_request, 'production', p, p, at, { gaps });
  }
  const approval = rules.cut_approval;
  if (approval) for (const p of productions) {
    if (p.status !== 'review') continue;
    const cut = latestCut(cutsOf.get(String(p._id)) || []);
    if (!cut || cut.status !== 'in_review') continue; // only ever the current version
    const at = cut.decisionDueAt - approval.offsetMinutes * MIN;
    if (now < at || now - at > STALE_MS) continue;
    push(approval, MEDIA_RULE_KINDS.cut_approval, 'cut', cut, p, at, { cut });
  }
  const closing = rules.delivery_balance;
  if (closing) for (const p of productions) {
    const order = p.orderId ? orders.get(String(p.orderId)) : null, balanceMinor = order ? Math.max(0, order.totalMinor - order.paidMinor) : 0;
    const since = p.status === 'accepted' && !p.handoff ? p.finalAcceptedAt : p.status === 'delivered' && balanceMinor > 0 ? p.deliveredAt : null;
    if (since) {
      const at = since + closing.offsetMinutes * MIN;
      if (now >= at && now - at <= STALE_MS) push(closing, MEDIA_RULE_KINDS.delivery_balance, 'production', p, p, at, { balanceMinor, handoffMissing: !p.handoff });
    }
    // Rights expiry is an internal reminder only: it never asserts licensing to the customer.
    const ends = p.usageRights?.termEndsAt;
    if (ends && ['delivered', 'closed'].includes(p.status)) {
      const at = ends - closing.offsetMinutes * MIN;
      if (now >= at && now < ends) push({ ...closing, mode: 'task' }, MEDIA_RULE_KINDS.rights_expiry, 'production', p, p, at);
    }
  }
  return out;
}

const PREP_WORDS = {
  en: { client_assets: 'your logo, brand files and any footage you want used', talent_releases: 'signed release forms for everyone appearing' },
  ar: { client_assets: 'الشعار وملفات الهوية وأي مقاطع ترغب باستخدامها', talent_releases: 'نماذج الموافقة الموقعة لكل من سيظهر' },
};
const when = (ms, tz) => formatLocal(ms, tz).replace('T', ' ');
const omr = (minor, arabic) => `${(minor / 1000).toFixed(3)} ${arabic ? 'ر.ع.' : 'OMR'}`;

/** A rule's draft from recorded facts only: reference, cut label, dates and the order balance. */
export function mediaDraftText(item, { name, timezone, arabic }) {
  const hello = arabic ? `مرحباً${name ? ` ${name}` : ''}،` : `Hello${name ? ` ${name}` : ''},`;
  const p = item.production, ref = `${p.ref} · ${p.title}`;
  if (item.rule.id === 'prep_request') {
    const words = item.gaps.map(g => PREP_WORDS[arabic ? 'ar' : 'en'][g]).filter(Boolean).join(arabic ? ' و' : ' and ');
    return arabic ? `${hello} استعداداً لتصوير ${ref} في ${when(p.shootStartsAt, timezone)}، نحتاج منك ${words}. يمكنك إرسالها هنا.`
      : `${hello} ahead of the ${ref} shoot on ${when(p.shootStartsAt, timezone)}, we still need ${words}. You can send them here.`;
  }
  if (item.rule.id === 'cut_approval') {
    return arabic ? `${hello} النسخة ${item.cut.label} من ${ref} بانتظار قرارك قبل ${when(item.cut.decisionDueAt, timezone)}. أرسل ملاحظاتك مجمعة أو موافقتك هنا.`
      : `${hello} cut ${item.cut.label} of ${ref} is waiting for your decision by ${when(item.cut.decisionDueAt, timezone)}. Please send your consolidated feedback or approval here.`;
  }
  if (item.handoffMissing) return arabic ? `${hello} تم اعتماد ${ref}. سنرسل لك روابط التسليم النهائية قريباً.` : `${hello} ${ref} is approved. We will send the final delivery links shortly.`;
  return arabic ? `${hello} شكراً لك. الرصيد المتبقي على ${ref} هو ${omr(item.balanceMinor, true)}.` : `${hello} thank you. The remaining balance on ${ref} is ${omr(item.balanceMinor, false)}.`;
}
