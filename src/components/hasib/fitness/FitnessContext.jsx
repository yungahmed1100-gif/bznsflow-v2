import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePolling } from '../../../hooks/usePolling';
import { hasib } from '../../../lib/dashboard/api';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { dashboardSearch } from '../../../lib/dashboard/navigation';
import { Money } from '../Badges';
import { useHasib } from '../HasibContext';
import { label, STATE_TONE, BUCKET_TONE } from './labels.js';

/**
 * The member's membership beside a chat or a customer record: state, plan and end date, next class,
 * balance (managers) and open follow-ups, each opening the same record in Memberships.
 */
export function FitnessContext({ s, conversationId, contactId }) {
  const hb = useHasib();
  const [params, setParams] = useSearchParams();
  const enabled = hb?.overview?.pack?.id === 'fitness' && !hb.overview.readOnly && !!(conversationId || contactId);
  const state = usePolling(() => hasib('fitness_context', conversationId ? { conversationId } : { contactId }), [conversationId, contactId], { interval: 30000, enabled });
  if (!enabled || !state.data?.items?.length) return null;
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), { h } = hb;
  const from = conversationId ? { from: 'chat', chat: conversationId } : { from: 'customers' };
  return <section className="hb-deal-context" aria-label={tr('Membership', 'العضوية')}>
    {state.data.items.map(m => <article key={m.id} className="hb-deal-context-card" data-tone={STATE_TONE[m.state]}>
      <div className="hb-status-line"><b><bdi>{m.membership?.planName || tr('Trial / enquiry', 'تجربة / استفسار')}</bdi></b><span className="ld-chip" data-tone={STATE_TONE[m.state]}>{label('state', m.state, ar)}</span></div>
      <p className="ld-help">
        {m.membership ? <>{tr('ends', 'ينتهي')} {formatDate(m.membership.endsAt, s.lang, hb.timezone)}</> : m.trial ? label('trial', m.trial.status, ar) : tr('no trial booked yet', 'لم تُحجز تجربة بعد')}
        {m.nextClass ? <> · {tr('next class', 'الحصة القادمة')} <bdi>{m.nextClass.title}</bdi> {formatDateTime(m.nextClass.startsAt, s.lang, hb.timezone)}</> : null}
        {m.money?.balanceMinor ? <> · {tr('owes', 'متبقٍ')} <Money h={h} minor={m.money.balanceMinor} /></> : null}
        {m.flags?.attendanceGap ? <> · <b>{label('quick', 'attendanceGap', ar)}</b></> : null}
      </p>
      {m.followups.length > 0 && <ul className="hb-deal-context-followups">{m.followups.map(f => <li key={`${f.source}:${f.id}`} data-bucket={f.bucket}>
        {f.source === 'draft' ? label('draftKind', f.kind, ar) : label('task', f.kind, ar)} · <span data-tone={BUCKET_TONE[f.bucket]}>{label('bucket', f.bucket, ar)}</span></li>)}</ul>}
      <div className="ld-actions">
        <button type="button" className="ld-button" onClick={() => setParams(dashboardSearch(params, 'work', { view: 'members', member: m.contactId, ...from }))}>{tr('Open membership', 'فتح العضوية')}</button>
        {m.openFollowups > 0 && <button type="button" className="ld-button ld-quiet" onClick={() => setParams(dashboardSearch(params, 'work', { view: 'followups', member: m.contactId, ...from }))}>
          {tr(`Follow-ups (${m.openFollowups})`, `المتابعات (${m.openFollowups})`)}</button>}
      </div>
    </article>)}
  </section>;
}
