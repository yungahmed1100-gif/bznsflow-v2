import React from 'react';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { useWorkContext, ContextFollowups, ContextFollowupsButton } from '../workspace/contextCard.jsx';
import { label, STATE_TONE, BUCKET_TONE } from './labels.js';

/**
 * The member's membership beside a chat or a customer record: state, plan and end date, next class,
 * balance (managers) and open follow-ups, each opening the same record in Memberships.
 */
export function FitnessContext({ s, conversationId, contactId }) {
  const ctx = useWorkContext({ packId: 'fitness', operation: 'fitness_context', conversationId, contactId });
  if (!ctx) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { hb, go } = ctx, { h } = hb;
  return <section className="hb-deal-context" aria-label={tr('Membership', 'العضوية')}>
    {ctx.items.map(m => <article key={m.id} className="hb-deal-context-card" data-tone={STATE_TONE[m.state]}>
      <div className="hb-status-line"><b><bdi>{m.membership?.planName || tr('Trial / enquiry', 'تجربة / استفسار')}</bdi></b><span className="ld-chip" data-tone={STATE_TONE[m.state]}>{label('state', m.state, ar)}</span></div>
      <p className="ld-help">
        {m.membership ? <>{tr('ends', 'ينتهي')} {formatDate(m.membership.endsAt, s.lang, hb.timezone)}</> : m.trial ? label('trial', m.trial.status, ar) : tr('no trial booked yet', 'لم تُحجز تجربة بعد')}
        {m.nextClass ? <> · {tr('next class', 'الحصة القادمة')} <bdi>{m.nextClass.title}</bdi> {formatDateTime(m.nextClass.startsAt, s.lang, hb.timezone)}</> : null}
        {m.money?.balanceMinor ? <> · {tr('owes', 'متبقٍ')} <Money h={h} minor={m.money.balanceMinor} /></> : null}
        {m.flags?.attendanceGap ? <> · <b>{label('quick', 'attendanceGap', ar)}</b></> : null}
      </p>
      <ContextFollowups followups={m.followups} kindLabel={f => f.source === 'draft' ? label('draftKind', f.kind, ar) : label('task', f.kind, ar)} bucketLabel={b => label('bucket', b, ar)} tones={BUCKET_TONE} />
      <div className="ld-actions">
        <button type="button" className="ld-button" onClick={() => go({ view: 'members', member: m.contactId })}>{tr('Open membership', 'فتح العضوية')}</button>
        <ContextFollowupsButton ar={ar} count={m.openFollowups} onOpen={() => go({ view: 'followups', member: m.contactId })} />
      </div>
    </article>)}
  </section>;
}
